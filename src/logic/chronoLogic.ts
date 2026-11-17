import { TEAM_ORDER } from '../data/initialData';
import { KrampusGameState, TeamId } from '../types/game';

export function applyChronoTrapsToState(
  next: KrampusGameState,
  fromTid: TeamId,
  allocations: Partial<Record<TeamId, number>>,
  now: number
): boolean {
  const r = next.round;
  if (
    r.gameStage !== 'TIMEJINX' ||
    r.chronoSubRound !== 'CHRONO_SUB2_TRAP' ||
    r.chronoPhase !== 'TRAP_PLACEMENT' ||
    r.status !== 'ACTIVE'
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
  if (sum > quota) return false;

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
  now: number
): boolean {
  const r = next.round;
  if (
    r.gameStage !== 'TIMEJINX' ||
    r.chronoSubRound !== 'CHRONO_SUB3_FAST_FINGER' ||
    r.status !== 'ACTIVE'
  ) {
    return false;
  }
  if (next.submissions[tid]) return false;
  const minY = r.yearMin ?? 2012;
  const maxY = r.yearMax ?? 2021;
  if (year < minY || year > maxY) return false;

  const claims = { ...(r.chronoFastFingerClaims || {}) };
  const key = String(year);
  if (claims[key]) return false;

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
