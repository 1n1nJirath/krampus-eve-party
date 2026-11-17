import { getActiveTeamIds, getSuggestedSafeRange, TEAM_ORDER } from '../data/initialData';
import { KrampusGameState, Team, TeamId } from '../types/game';

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
  }
  return true;
}
