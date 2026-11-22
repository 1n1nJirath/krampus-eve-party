import { getActiveTeamIds, getSuggestedSafeRange, TEAM_ORDER } from '../data/initialData';
import {
  EightDoorsSubRound,
  GameStage,
  KrampusGameState,
  QuestionPreset,
  RoundConfig,
  Team,
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
