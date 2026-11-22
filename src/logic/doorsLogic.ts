import { getActiveTeamIds, getSuggestedSafeRange, TEAM_ORDER } from '../data/initialData';
import { GameState, KrampusGameState, Team, TeamId } from '../types/game';
import { cloneGameState } from './lobbyLogic';

export const BAILOUT_COST = 500;
export const BAILOUT_SHIELDS_RESTORED = 2;
export const FIRST_CORRECT_DOOR_REWARD = 300;
export const SECOND_CORRECT_DOOR_REWARD = 500; // Cumulative total = +800 (300 + 500)
export const WRONG_DOOR_SHIELD_PENALTY = 1;
export const SNAKE_DRAFT_TURN_SECONDS = 45;
export const SNAKE_DRAFT_TURN_MS = 45000;

export interface BailoutOptions {
  /**
   * Whether a team is allowed to go into negative coin balance (debt) to purchase a mandatory bailout.
   * Defaults to true per game rules (logs a warning when balance drops below 0).
   */
  allowDebt?: boolean;
}

/**
 * Pure Immutable Function: Applies the Nice Shield Bailout in Game 1 (Doors of Doom).
 * - Only valid when the target team currently has 0 shields.
 * - Deducts 500 coins and grants +2 shields.
 * - Rejects if team does not exist or if team.shields > 0.
 * - If allowDebt is false and team.coins < 500, rejects; otherwise allows debt and logs a warning.
 */
export function applyBailout(
  state: GameState,
  teamId: string,
  options: BailoutOptions = {}
): GameState {
  const { allowDebt = true } = options;

  if (!state || !state.teams[teamId]) {
    return state;
  }

  const team = state.teams[teamId];

  // Reject bailout if the team still has active shields
  if (team.shields > 0) {
    return state;
  }

  // If debt is explicitly disabled, reject when coins are insufficient
  if (!allowDebt && team.coins < BAILOUT_COST) {
    return state;
  }

  const nextCoins = team.coins - BAILOUT_COST;
  if (nextCoins < 0) {
    console.warn(
      `[DoorsLogic] Team "${team.name || teamId}" entered debt after mandatory shield bailout: ${nextCoins} ฿`
    );
  }

  const nextState = cloneGameState(state);
  nextState.teams[teamId] = {
    ...team,
    coins: nextCoins,
    shields: team.shields + BAILOUT_SHIELDS_RESTORED,
  };

  return nextState;
}

/**
 * Pure Immutable Function: Applies scoring for a Door Pick in Game 1 (Doors of Doom).
 * - If `isCorrect && !isSecondCorrect`: +300 coins.
 * - If `isCorrect && isSecondCorrect`: +500 coins (bringing 2-pick total to +800 coins).
 * - If `!isCorrect`: -1 shield (floored at 0).
 */
export function applyDoorPickScore(
  state: GameState,
  teamId: string,
  isCorrect: boolean,
  isSecondCorrect: boolean = false
): GameState {
  if (!state || !state.teams[teamId]) {
    return state;
  }

  const team = state.teams[teamId];
  const nextState = cloneGameState(state);

  if (isCorrect) {
    const reward = isSecondCorrect
      ? SECOND_CORRECT_DOOR_REWARD
      : FIRST_CORRECT_DOOR_REWARD;

    nextState.teams[teamId] = {
      ...team,
      coins: team.coins + reward,
    };
  } else {
    nextState.teams[teamId] = {
      ...team,
      shields: Math.max(0, team.shields - WRONG_DOOR_SHIELD_PENALTY),
    };
  }

  return nextState;
}

export function buildSnakeDraftOrder(
  teams: Record<TeamId, Team>,
  reverseStart: boolean = false
): TeamId[] {
  const registered = TEAM_ORDER.filter((tid) => teams[tid]?.isRegistered);
  const active = registered.length >= 2 ? registered : [...TEAM_ORDER];
  if (reverseStart) {
    const rev = [...active].reverse();
    return [...rev, ...active];
  }
  return [...active, ...[...active].reverse()];
}

export function applyBailoutToState(next: KrampusGameState, tid: TeamId, now: number): boolean {
  const team = next.teams?.[tid];
  if (!team || team.shields > 0) return false;
  const prevBalances = {
    team1: next.teams.team1.coins,
    team2: next.teams.team2.coins,
    team3: next.teams.team3.coins,
    team4: next.teams.team4.coins,
  };
  const prevShields = {
    team1: next.teams.team1.shields,
    team2: next.teams.team2.shields,
    team3: next.teams.team3.shields,
    team4: next.teams.team4.shields,
  };
  team.coins -= 500;
  team.shields = 2;
  team.candles = 2;
  next.transactions.unshift({
    id: `tx-${now}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    teamId: tid,
    delta: -500,
    reason: `${team.name} ไถ่เกราะเด็กดี +2 🛡️ (Naughty List Bailout)`,
    prevBalances,
    prevShields,
  });
  return true;
}

export function applySnakePickToState(
  next: KrampusGameState,
  tid: TeamId,
  doorKey: string,
  now: number
): boolean {
  const r = next.round;
  const isSnakeSub =
    r.eightDoorsSubRound === 'SUB1_SURVIVAL' || r.eightDoorsSubRound === 'SUB2_SNAKE_DRAFT';
  if (r.gameStage !== 'POLL_MINE' || !isSnakeSub || r.status !== 'ACTIVE') {
    return false;
  }
  const reverseStart = r.eightDoorsSubRound === 'SUB2_SNAKE_DRAFT';
  const order =
    r.snakeDraftOrder && r.snakeDraftOrder.length > 0
      ? r.snakeDraftOrder
      : buildSnakeDraftOrder(next.teams, reverseStart);
  const idx = r.snakeDraftIndex ?? 0;
  if (idx >= order.length || order[idx] !== tid) return false;

  const doorIdx = r.choices.slice(0, r.choiceCount).findIndex((c) => c.key === doorKey);
  if (doorIdx === -1 || r.choices[doorIdx].isOpened) return false;

  const door = r.choices[doorIdx];
  const rank = door.rank ?? doorIdx + 1;
  const suggested = getSuggestedSafeRange(r.choiceCount, r.eightDoorsSubRound);
  const safeMin = r.safeRankMin ?? suggested.min;
  const safeMax = r.safeRankMax ?? suggested.max;
  const isSafe = rank >= safeMin && rank <= safeMax;

  r.choices[doorIdx] = { ...door, isOpened: true };
  r.lastOpenedDoorKey = doorKey;

  const picks = [...(r.snakeDraftPicks || [])];
  picks.push({ teamId: tid, doorKey, rank, isSafe });
  r.snakeDraftPicks = picks;
  r.snakeDraftOrder = order;

  const team = next.teams[tid];
  const prevBalances = {
    team1: next.teams.team1.coins,
    team2: next.teams.team2.coins,
    team3: next.teams.team3.coins,
    team4: next.teams.team4.coins,
  };
  const prevShields = {
    team1: next.teams.team1.shields,
    team2: next.teams.team2.shields,
    team3: next.teams.team3.shields,
    team4: next.teams.team4.shields,
  };

  let deltaCoins = 0;
  let reason = '';
  if (isSafe) {
    deltaCoins = 300;
    team.coins += deltaCoins;
    reason = `${team.name} เปิดประตู ${doorKey} (#${rank}) โซนปลอดภัย +300 ฿`;
  } else {
    team.shields = Math.max(0, team.shields - 1);
    team.candles = team.shields;
    reason = `${team.name} เปิดประตู ${doorKey} (#${rank}) พลาด! เสียเกราะ -1 🛡️`;
  }

  next.transactions.unshift({
    id: `tx-${now}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now,
    teamId: tid,
    delta: deltaCoins,
    reason,
    prevBalances,
    prevShields,
  });

  const nextIdx = idx + 1;
  r.snakeDraftIndex = nextIdx;
  const activeDoors = r.choices.slice(0, r.choiceCount);
  const allSafeOpened = activeDoors
    .filter((c) => {
      const cr = c.rank ?? 99;
      return cr >= safeMin && cr <= safeMax;
    })
    .every((c) => c.isOpened);
  const allTurnsUsed = nextIdx >= order.length;

  if (allSafeOpened || allTurnsUsed) {
    r.status = 'REVEALED';
    r.rewardsApplied = true;
    r.timerStartedAt = null;
    r.timerEndAt = null;
    r.timerRemainingMs = 0;

    if (allTurnsUsed && !allSafeOpened) {
      const activeTeams = getActiveTeamIds(next.teams);
      for (const activeTid of activeTeams) {
        const hasFoundAny = picks.some((p) => p.teamId === activeTid && p.isSafe);
        if (!hasFoundAny) {
          next.teams[activeTid].coins -= 200;
        }
      }
      next.transactions.unshift({
        id: `tx-miss-${now}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: now,
        teamId: 'ALL',
        delta: -200,
        reason: 'เปิดครบ 8 บานไม่เจอคำตอบ: หัก -200 ฿ ทีมที่เปิดไม่เจอเลย!',
        prevBalances,
        prevShields,
      });
    }
  } else {
    // Reset selection timer to 45 seconds for the next turn/pick
    r.durationSeconds = SNAKE_DRAFT_TURN_SECONDS;
    r.timerStartedAt = now;
    r.timerEndAt = now + SNAKE_DRAFT_TURN_MS;
    r.timerRemainingMs = SNAKE_DRAFT_TURN_MS;
  }
  return true;
}

/**
 * Host/Admin Override for Game 1 Snake Draft:
 * - If it's currently `tid`'s turn (or `tid` has an upcoming turn), executes the pick immediately (auto-starting if IDLE).
 * - If `tid` has already used their turns, edits/replaces `tid`'s most recent door pick with `doorKey` and recalculates coins/shields.
 */
export function applyAdminSnakePickOverride(
  next: KrampusGameState,
  tid: TeamId,
  doorKey: string,
  now: number
): boolean {
  const r = next.round;
  const isSnakeSub =
    r.eightDoorsSubRound === 'SUB1_SURVIVAL' || r.eightDoorsSubRound === 'SUB2_SNAKE_DRAFT';
  if (r.gameStage !== 'POLL_MINE' || !isSnakeSub) return false;

  const doorIdx = r.choices.slice(0, r.choiceCount).findIndex((c) => c.key === doorKey);
  if (doorIdx === -1 || r.choices[doorIdx].isOpened) return false;

  const reverseStart = r.eightDoorsSubRound === 'SUB2_SNAKE_DRAFT';
  const order =
    r.snakeDraftOrder && r.snakeDraftOrder.length > 0
      ? [...r.snakeDraftOrder]
      : buildSnakeDraftOrder(next.teams, reverseStart);
  r.snakeDraftOrder = order;
  const idx = r.snakeDraftIndex ?? 0;

  if (r.status === 'IDLE') {
    r.status = 'ACTIVE';
    r.briefingOpen = false;
    r.timerStartedAt = now;
    r.timerEndAt = now + (r.durationSeconds || 45) * 1000;
  }

  // Case 1: Team still has an available turn in the queue -> swap to current turn & pick
  if (r.status === 'ACTIVE' && idx < order.length) {
    if (order[idx] === tid) {
      return applySnakePickToState(next, tid, doorKey, now);
    }
    const futureIdx = order.findIndex((t, i) => i > idx && t === tid);
    if (futureIdx !== -1) {
      const temp = order[idx];
      order[idx] = order[futureIdx];
      order[futureIdx] = temp;
      r.snakeDraftOrder = order;
      return applySnakePickToState(next, tid, doorKey, now);
    }
  }

  // Case 2: Team already used their turns -> edit/replace their last picked door
  const picks = [...(r.snakeDraftPicks || [])];
  let lastPickIdx = -1;
  for (let i = picks.length - 1; i >= 0; i--) {
    if (picks[i].teamId === tid) {
      lastPickIdx = i;
      break;
    }
  }
  if (lastPickIdx === -1) return false;

  const oldPick = picks[lastPickIdx];
  const oldDoorIdx = r.choices.findIndex((c) => c.key === oldPick.doorKey);
  if (oldDoorIdx !== -1) {
    r.choices[oldDoorIdx] = { ...r.choices[oldDoorIdx], isOpened: false };
  }

  const team = next.teams[tid];
  if (oldPick.isSafe) {
    team.coins -= 300;
  } else {
    team.shields = Math.min(5, team.shields + 1);
    team.candles = team.shields;
  }

  const newDoor = r.choices[doorIdx];
  const newRank = newDoor.rank ?? doorIdx + 1;
  const suggested = getSuggestedSafeRange(r.choiceCount, r.eightDoorsSubRound);
  const safeMin = r.safeRankMin ?? suggested.min;
  const safeMax = r.safeRankMax ?? suggested.max;
  const newIsSafe = newRank >= safeMin && newRank <= safeMax;

  r.choices[doorIdx] = { ...newDoor, isOpened: true };
  r.lastOpenedDoorKey = doorKey;
  picks[lastPickIdx] = { teamId: tid, doorKey, rank: newRank, isSafe: newIsSafe };
  r.snakeDraftPicks = picks;

  if (newIsSafe) {
    team.coins += 300;
  } else {
    team.shields = Math.max(0, team.shields - 1);
    team.candles = team.shields;
  }

  return true;
}

export function undoLastTeamSnakePick(next: KrampusGameState, tid: TeamId): boolean {
  const r = next.round;
  const picks = [...(r.snakeDraftPicks || [])];
  let lastPickIdx = -1;
  for (let i = picks.length - 1; i >= 0; i--) {
    if (picks[i].teamId === tid) {
      lastPickIdx = i;
      break;
    }
  }
  if (lastPickIdx === -1) return false;

  const removed = picks[lastPickIdx];
  picks.splice(lastPickIdx, 1);
  r.snakeDraftPicks = picks;

  const doorIdx = r.choices.findIndex((c) => c.key === removed.doorKey);
  if (doorIdx !== -1) {
    r.choices[doorIdx] = { ...r.choices[doorIdx], isOpened: false };
  }

  const team = next.teams[tid];
  if (removed.isSafe) {
    team.coins -= 300;
  } else {
    team.shields = Math.min(5, team.shields + 1);
    team.candles = team.shields;
  }

  const reverseStart = r.eightDoorsSubRound === 'SUB2_SNAKE_DRAFT';
  const order =
    r.snakeDraftOrder && r.snakeDraftOrder.length > 0
      ? [...r.snakeDraftOrder]
      : buildSnakeDraftOrder(next.teams, reverseStart);
  const curIdx = Math.max(0, (r.snakeDraftIndex ?? picks.length + 1) - 1);
  order.splice(curIdx, 0, tid);
  // Remove one duplicate of tid from earlier if length exceeded
  const dupIdx = order.findIndex((t, i) => i < curIdx && t === tid);
  if (dupIdx !== -1 && order.length > 8) {
    order.splice(dupIdx, 1);
  }
  r.snakeDraftOrder = order;
  r.snakeDraftIndex = picks.length;
  r.status = 'ACTIVE';
  r.rewardsApplied = false;
  return true;
}
