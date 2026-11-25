import { getActiveTeamIds, getSuggestedSafeRange, TEAM_ORDER } from '../data/initialData';
import {
  EightDoorsSubRound,
  GameStage,
  KrampusGameState,
  QuestionPreset,
  RoundConfig,
  Team,
  TeamId,
} from '../types/game';

export type AdminTabId = 'LOBBY' | 'GAME1' | 'GAME2' | 'GAME3' | 'GAME4' | 'FINALE';

export type LiveScreenPhase = 'BRIEFING' | 'STANDBY' | 'LIVE' | 'LOCKED' | 'REVEALED';

export function stageToAdminTab(stage: GameStage): AdminTabId {
  switch (stage) {
    case 'LOBBY':
    case 'WORLD_MAP':
      return 'LOBBY';
    case 'POLL_MINE':
      return 'GAME1';
    case 'TIMEJINX':
      return 'GAME2';
    case 'QUIXORT':
      return 'GAME3';
    case 'TRIVIA_MURDER':
      return 'GAME4';
    case 'FINALE':
      return 'FINALE';
  }
}

export function deriveLiveScreenPhase(round: RoundConfig): LiveScreenPhase {
  if (
    round.briefingOpen &&
    round.gameStage !== 'LOBBY' &&
    round.gameStage !== 'WORLD_MAP' &&
    round.gameStage !== 'FINALE'
  ) {
    return 'BRIEFING';
  }

  if (round.gameStage === 'TRIVIA_MURDER' && round.lastMan) {
    const phase = round.lastMan.phase;
    if (
      phase === 'KRAMPUS_TWIST' ||
      phase === 'PART2_CLUE' ||
      (phase === 'PART1_TRIVIA' && round.status === 'IDLE')
    ) {
      return 'STANDBY';
    }
    if (
      phase === 'PART1_TRIVIA_REVEAL' ||
      phase === 'PART1_MINIGAME_REVEAL' ||
      phase === 'PART1_GREED_TAX' ||
      phase === 'PART2_REVEAL' ||
      phase === 'CHAMPION'
    ) {
      return 'REVEALED';
    }
    if (round.status === 'LOCKED') {
      return 'LOCKED';
    }
    return 'LIVE';
  }

  if (round.gameStage === 'QUIXORT' && round.toyFactory) {
    if (round.status === 'IDLE') {
      return 'STANDBY';
    }
    if (round.toyFactory.phase === 'REVEAL_JUDGE') {
      return round.rewardsApplied ? 'REVEALED' : 'LOCKED';
    }
    if (round.toyFactory.phase === 'SHUFFLE_BUFFER_10S') {
      return 'LOCKED';
    }
    return 'LIVE';
  }

  switch (round.status) {
    case 'IDLE':
      return 'STANDBY';
    case 'ACTIVE':
      return 'LIVE';
    case 'LOCKED':
      return 'LOCKED';
    case 'REVEALED':
      return 'REVEALED';
  }
}

export function getNextGame1SubRound(current?: EightDoorsSubRound): EightDoorsSubRound | null {
  switch (current) {
    case 'SUB1_SURVIVAL':
      return 'SUB2_SNAKE_DRAFT';
    case 'SUB2_SNAKE_DRAFT':
    case 'SUB2_AUCTION':
    case 'SUB2_DOOR_AND_BET':
      return 'SUB3_POLARITY';
    case 'SUB3_POLARITY':
      return null;
    default:
      return 'SUB1_SURVIVAL';
  }
}

export function getNextChronoPreset(
  presets: QuestionPreset[],
  currentPresetId?: string
): QuestionPreset | null {
  const chronoPresets = presets.filter((p) => p.gameStage === 'TIMEJINX');
  if (chronoPresets.length === 0) return null;
  if (!currentPresetId) return chronoPresets[0];
  const idx = chronoPresets.findIndex((p) => p.id === currentPresetId);
  if (idx === -1) return chronoPresets[0];
  return idx + 1 < chronoPresets.length ? chronoPresets[idx + 1] : null;
}

export interface RevealEligibility {
  allowed: boolean;
  reason?: string;
  submittedCount: number;
  activeTeamCount: number;
}

export function canRevealCurrentRound(
  state: KrampusGameState,
  nowMs: number
): RevealEligibility {
  const activeTeamIds = getActiveTeamIds(state.teams);
  const activeTeamCount = activeTeamIds.length;
  const submittedCount = activeTeamIds.filter((tid) => Boolean(state.submissions[tid])).length;
  const r = state.round;

  if (r.status === 'REVEALED') {
    return {
      allowed: false,
      reason: 'เฉลยรอบนี้ไปแล้ว',
      submittedCount,
      activeTeamCount,
    };
  }

  if (r.status === 'IDLE') {
    return {
      allowed: false,
      reason: 'ยังอยู่ในโหมด Standby กรุณากดเริ่มคำถามก่อน',
      submittedCount,
      activeTeamCount,
    };
  }

  if (r.status === 'LOCKED') {
    return {
      allowed: true,
      submittedCount,
      activeTeamCount,
    };
  }

  const isTimerExpired =
    r.timerEndAt !== null && r.timerEndAt !== undefined
      ? nowMs >= r.timerEndAt
      : r.timerStartedAt !== null && nowMs - r.timerStartedAt >= r.durationSeconds * 1000;

  if (
    r.gameStage === 'POLL_MINE' &&
    (r.eightDoorsSubRound === 'SUB1_SURVIVAL' || r.eightDoorsSubRound === 'SUB2_SNAKE_DRAFT')
  ) {
    const suggested = getSuggestedSafeRange(r.choiceCount, r.eightDoorsSubRound);
    const safeMin = r.safeRankMin ?? suggested.min;
    const safeMax = r.safeRankMax ?? suggested.max;
    const activeDoors = r.choices.slice(0, r.choiceCount);
    const allSafeOpened = activeDoors
      .filter((c) => {
        const cr = c.rank ?? 99;
        return cr >= safeMin && cr <= safeMax;
      })
      .every((c) => c.isOpened);
    const allTurnsUsed =
      (r.snakeDraftOrder?.length ?? 0) > 0 &&
      (r.snakeDraftIndex ?? 0) >= (r.snakeDraftOrder?.length ?? 0);

    if (isTimerExpired || allSafeOpened || allTurnsUsed) {
      return { allowed: true, submittedCount, activeTeamCount };
    }
    const turnsDone = r.snakeDraftIndex ?? 0;
    const turnsTotal = r.snakeDraftOrder?.length ?? activeTeamCount * 2;
    return {
      allowed: false,
      reason: `รอ Snake Draft ครบคิว (${turnsDone}/${turnsTotal}) หรือกดหยุด/ล็อกคำตอบก่อน`,
      submittedCount,
      activeTeamCount,
    };
  }

  if (isTimerExpired || (activeTeamCount > 0 && submittedCount >= activeTeamCount)) {
    return { allowed: true, submittedCount, activeTeamCount };
  }

  return {
    allowed: false,
    reason: `รอทีมตอบครบ (${submittedCount}/${activeTeamCount}) หรือกดหยุด/ล็อกคำตอบก่อน`,
    submittedCount,
    activeTeamCount,
  };
}

/**
 * Pure transition when a main game (Game 1, Game 2, or Game 3) finishes:
 * - Marks the completed game stage in `clearedStages`
 * - Returns `round.gameStage` back to `'LOBBY'` (does NOT auto-launch the next game)
 * - Triggers the Cumulative Scoreboard Popup (`showLeaderboardOverlay: true`) on `/display`
 */
export function finishMainGameToLobby(
  prev: KrampusGameState,
  completedStage: GameStage
): KrampusGameState {
  return {
    ...prev,
    clearedStages: Array.from(new Set([...(prev.clearedStages || []), completedStage])),
    showLeaderboardOverlay: true,
    submissions: {},
    buzzerQueue: [],
    round: {
      ...prev.round,
      gameStage: 'LOBBY',
      status: 'IDLE',
      timerStartedAt: null,
      timerEndAt: null,
      timerRemainingMs: 0,
      briefingOpen: false,
    },
  };
}

/**
 * Pure Finale Ranking Calculator:
 * Ranks teams 1st, 2nd, 3rd, 4th for the Simplified Final Leaderboard at the end of Game 4.
 */
export function computeFinaleTeamsRanking(state: KrampusGameState): Team[] {
  const championId = state.round.lastMan?.winnerTeamId;
  const lmsStates = state.round.lastMan?.teamStates;

  return TEAM_ORDER.map((tid) => state.teams[tid]).sort((a, b) => {
    if (a.id === championId) return -1;
    if (b.id === championId) return 1;

    if (lmsStates && lmsStates[a.id] && lmsStates[b.id]) {
      const tsA = lmsStates[a.id];
      const tsB = lmsStates[b.id];
      if (tsA.isGhost !== tsB.isGhost) {
        return tsA.isGhost ? 1 : -1;
      }
      if (tsB.step !== tsA.step) {
        return tsB.step - tsA.step;
      }
      if (tsB.hearts !== tsA.hearts) {
        return tsB.hearts - tsA.hearts;
      }
    }

    if (b.coins !== a.coins) return b.coins - a.coins;
    return b.shields - a.shields;
  });
}

export interface RankedTeamEntry {
  team: Team;
  /** Standard competition rank (1, 2, 3, or 4 — e.g. 1, 2, 2, 2 or 1, 1, 3, 4) */
  rank: number;
  /** True when 2 or more teams share this exact rank */
  isTied: boolean;
  /** Compact badge label, e.g. "#1" or "#1 ร่วม" */
  rankLabel: string;
  /** Ordinal badge label for Finale, e.g. "1ST" or "1ST ร่วม" */
  ordinalLabel: string;
  /** True when rank === 1 and team has positive coins & shields */
  isNiceLeader: boolean;
  /** True only when strictly sole 4th place (rank === 4) or coins <= 0 or shields <= 0 */
  isNaughty: boolean;
}

const ORDINAL_BY_RANK: Record<number, string> = {
  1: '1ST',
  2: '2ND',
  3: '3RD',
  4: '4TH',
};

/**
 * Pure Standard Competition Ranking ("1224" shared ranking) by Holy Coins.
 * - Teams with identical `coins` share the exact same `rank` number.
 * - Examples:
 *   - 1300, 1000, 1000, 1000 -> ranks #1, #2, #2, #2 (no team gets #4 / Naughty List)
 *   - 1500, 1500, 1000, 800  -> ranks #1, #1, #3, #4 (both #1 teams get Nice List)
 *   - 1000, 1000, 1000, 1000 -> ranks #1, #1, #1, #1 (all 4 teams share #1 ร่วม)
 */
export function computeSharedTeamsRanking(
  teams: Record<TeamId, Team>
): RankedTeamEntry[] {
  const sorted = TEAM_ORDER.map((id) => teams[id]).sort((a, b) => {
    if (b.coins !== a.coins) return b.coins - a.coins;
    if (b.shields !== a.shields) return b.shields - a.shields;
    return a.number - b.number;
  });

  const rawRanks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      rawRanks.push(1);
    } else if (sorted[i].coins === sorted[i - 1].coins) {
      rawRanks.push(rawRanks[i - 1]);
    } else {
      rawRanks.push(i + 1);
    }
  }

  const rankCounts = new Map<number, number>();
  for (const r of rawRanks) {
    rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  }

  return sorted.map((team, idx) => {
    const rank = rawRanks[idx];
    const isTied = (rankCounts.get(rank) || 0) > 1;
    const baseOrdinal = ORDINAL_BY_RANK[rank] || `#${rank}`;
    const isNaughty = rank === 4 || team.coins <= 0 || team.shields <= 0;
    const isNiceLeader = rank === 1 && !isNaughty;

    return {
      team,
      rank,
      isTied,
      rankLabel: isTied ? `#${rank} ร่วม` : `#${rank}`,
      ordinalLabel: isTied ? `${baseOrdinal} ร่วม` : baseOrdinal,
      isNiceLeader,
      isNaughty,
    };
  });
}

/**
 * Pure Finale Standard Competition Ranking ("1224" shared ranking) for the end of Game 4.
 * Preserves shared ranks when non-champion teams tie on Game 4 progress & coins.
 */
export function computeFinaleSharedRanking(
  state: KrampusGameState
): RankedTeamEntry[] {
  const sorted = computeFinaleTeamsRanking(state);
  const championId = state.round.lastMan?.winnerTeamId;
  const lmsStates = state.round.lastMan?.teamStates;

  const isSameFinaleScore = (a: Team, b: Team): boolean => {
    if (a.id === championId || b.id === championId) {
      return a.id === b.id;
    }
    if (lmsStates && lmsStates[a.id] && lmsStates[b.id]) {
      const tsA = lmsStates[a.id];
      const tsB = lmsStates[b.id];
      return (
        tsA.isGhost === tsB.isGhost &&
        tsA.step === tsB.step &&
        tsA.hearts === tsB.hearts &&
        a.coins === b.coins
      );
    }
    return a.coins === b.coins;
  };

  const rawRanks: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      rawRanks.push(1);
    } else if (isSameFinaleScore(sorted[i], sorted[i - 1])) {
      rawRanks.push(rawRanks[i - 1]);
    } else {
      rawRanks.push(i + 1);
    }
  }

  const rankCounts = new Map<number, number>();
  for (const r of rawRanks) {
    rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  }

  return sorted.map((team, idx) => {
    const rank = rawRanks[idx];
    const isTied = (rankCounts.get(rank) || 0) > 1;
    const baseOrdinal = ORDINAL_BY_RANK[rank] || `#${rank}`;
    const isNaughty = rank === 4 || team.coins <= 0 || team.shields <= 0;
    const isNiceLeader = rank === 1 && !isNaughty;

    return {
      team,
      rank,
      isTied,
      rankLabel: isTied ? `#${rank} ร่วม` : `#${rank}`,
      ordinalLabel: isTied ? `${baseOrdinal} ร่วม` : baseOrdinal,
      isNiceLeader,
      isNaughty,
    };
  });
}
