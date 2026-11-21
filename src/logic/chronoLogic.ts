import { TEAM_ORDER } from '../data/initialData';
import { GameState, KrampusGameState, TeamId } from '../types/game';
import { cloneGameState } from './lobbyLogic';

export const CHRONO_EXACT_MATCH_REWARD = 600;
export const CHRONO_TRAP_BREAKER_MULTIPLIER = 2; // +1,200 coins on exact match with trap bypassed
export const CHRONO_PENALTY_PER_YEAR_DIFF = 100;
export const TRAP_QUOTAS_BY_RANK = [3, 2, 1, 0] as const;

/**
 * Pure Immutable Function: Allocates time-trap quotas for Game 2 (The Chrono Crush)
 * based on current wealth ranking.
 * - Rank 1 (richest): 3 traps
 * - Rank 2: 2 traps
 * - Rank 3: 1 trap
 * - Rank 4 (and any subsequent ranks): 0 traps
 */
export function allocateTraps(state: GameState): GameState {
  if (!state || !state.teams) {
    return state;
  }

  const teamList = Object.values(state.teams);
  if (teamList.length === 0) {
    return state;
  }

  const sortedByWealth = [...teamList].sort((a, b) => {
    if (b.coins !== a.coins) {
      return b.coins - a.coins;
    }
    return a.id.localeCompare(b.id);
  });

  const nextState = cloneGameState(state);
  const trapQuotas: Record<string, number> = {};

  sortedByWealth.forEach((team, index) => {
    const quota = TRAP_QUOTAS_BY_RANK[index] ?? 0;
    trapQuotas[team.id] = quota;
    nextState.teams[team.id] = {
      ...nextState.teams[team.id],
      trapQuota: quota,
    };
  });

  nextState.trapQuotas = trapQuotas;
  return nextState;
}

/**
 * Pure Immutable Function: Applies scoring for Game 2 (The Chrono Crush).
 * - `diff = Math.abs(targetYear - guessedYear)`
 * - Exact match (`diff === 0`):
 *   - Base reward: +600 coins
 *   - With `hasTrapBypassed === true` (Trap Breaker x2 Bonus): +1,200 coins
 * - Missed year (`diff > 0`):
 *   - Penalty: `-100 * diff` coins
 */
export function applyChronoScore(
  state: GameState,
  teamId: string,
  guessedYear: number,
  targetYear: number,
  hasTrapBypassed: boolean = false
): GameState {
  if (!state || !state.teams[teamId]) {
    return state;
  }

  if (!Number.isFinite(guessedYear) || !Number.isFinite(targetYear)) {
    return state;
  }

  const team = state.teams[teamId];
  const diff = Math.abs(Math.trunc(targetYear) - Math.trunc(guessedYear));

  let coinDelta = 0;
  if (diff === 0) {
    coinDelta = hasTrapBypassed
      ? CHRONO_EXACT_MATCH_REWARD * CHRONO_TRAP_BREAKER_MULTIPLIER
      : CHRONO_EXACT_MATCH_REWARD;
  } else {
    coinDelta = -(diff * CHRONO_PENALTY_PER_YEAR_DIFF);
  }

  const nextState = cloneGameState(state);
  nextState.teams[teamId] = {
    ...team,
    coins: team.coins + coinDelta,
  };

  return nextState;
}

export function applyChronoTrapsToState(
  next: KrampusGameState,
  fromTid: TeamId,
  allocations: Partial<Record<TeamId, number>>,
  now: number,
  force: boolean = false
): boolean {
  const r = next.round;
  if (
    r.gameStage !== 'TIMEJINX' ||
    r.chronoSubRound !== 'CHRONO_SUB2_TRAP' ||
    r.chronoPhase !== 'TRAP_PLACEMENT' ||
    (!force && r.status !== 'ACTIVE')
  ) {
    return false;
  }
  const quota = r.chronoQuotas?.[fromTid] ?? 1;
  const cleaned: Partial<Record<TeamId, number>> = {};
  let sum = 0;
  for (const targetTid of TEAM_ORDER) {
    if (targetTid === fromTid) continue;
    const count = Math.max(0, Math.floor(Number(allocations[targetTid] ?? 0)));
    if (count > 0) {
      cleaned[targetTid] = count;
      sum += count;
    }
  }
  if (!force && sum > quota) return false;

  r.chronoTrapsPlaced = {
    ...(r.chronoTrapsPlaced || {}),
    [fromTid]: cleaned,
  };

  const elapsedMs = r.timerStartedAt ? Math.max(0, now - r.timerStartedAt) : 0;
  next.submissions[fromTid] = {
    teamId: fromTid,
    value: sum,
    submittedAt: now,
    elapsedMs,
    locked: true,
  };
  return true;
}

export function applyChronoClaimToState(
  next: KrampusGameState,
  tid: TeamId,
  year: number,
  now: number,
  force: boolean = false
): boolean {
  const r = next.round;
  if (
    r.gameStage !== 'TIMEJINX' ||
    r.chronoSubRound !== 'CHRONO_SUB3_FAST_FINGER' ||
    (!force && r.status !== 'ACTIVE')
  ) {
    return false;
  }
  if (!force && next.submissions[tid]) return false;
  const minY = r.yearMin ?? 2012;
  const maxY = r.yearMax ?? 2021;
  if (!force && (year < minY || year > maxY)) return false;

  const claims = { ...(r.chronoFastFingerClaims || {}) };
  const key = String(year);

  if (force) {
    // Remove previous claim by this team
    for (const [claimedYear, ownerTid] of Object.entries(claims)) {
      if (ownerTid === tid) {
        delete claims[claimedYear];
      }
    }
    // If another team held this year, clear their submission so claims stay 1-to-1
    const prevHolder = claims[key];
    if (prevHolder && prevHolder !== tid) {
      delete next.submissions[prevHolder];
    }
  } else if (claims[key]) {
    return false;
  }

  claims[key] = tid;
  r.chronoFastFingerClaims = claims;

  const elapsedMs = r.timerStartedAt ? Math.max(0, now - r.timerStartedAt) : 0;
  next.submissions[tid] = {
    teamId: tid,
    value: year,
    submittedAt: now,
    elapsedMs,
    locked: true,
  };
  return true;
}
