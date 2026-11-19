import { describe, expect, it } from 'vitest';
import {
  buildToyFactoryPairings,
  createInitialLastManState,
  DEFAULT_PRESETS,
  INITIAL_GAME_STATE,
} from '../data/initialData';
import {
  canRevealCurrentRound,
  deriveLiveScreenPhase,
  getNextChronoPreset,
  getNextGame1SubRound,
  stageToAdminTab,
} from '../logic/adminFlowLogic';
import { applyToyDatasetSelection } from '../logic/toyFactoryLogic';

describe('Suite 7: Admin Flow & Strict Standby Gatekeeping', () => {
  it('stageToAdminTab maps all 7 GameStage values to the 6 broadcast deck tabs', () => {
    expect(stageToAdminTab('LOBBY')).toBe('LOBBY');
    expect(stageToAdminTab('WORLD_MAP')).toBe('LOBBY');
    expect(stageToAdminTab('POLL_MINE')).toBe('GAME1');
    expect(stageToAdminTab('TIMEJINX')).toBe('GAME2');
    expect(stageToAdminTab('QUIXORT')).toBe('GAME3');
    expect(stageToAdminTab('TRIVIA_MURDER')).toBe('GAME4');
    expect(stageToAdminTab('FINALE')).toBe('FINALE');
  });

  it('deriveLiveScreenPhase resolves BRIEFING, STANDBY, LIVE, LOCKED, and REVEALED across all games', () => {
    const baseRound = structuredClone(INITIAL_GAME_STATE.round);
    baseRound.gameStage = 'POLL_MINE';
    baseRound.status = 'IDLE';
    baseRound.briefingOpen = true;
    expect(deriveLiveScreenPhase(baseRound)).toBe('BRIEFING');

    baseRound.briefingOpen = false;
    expect(deriveLiveScreenPhase(baseRound)).toBe('STANDBY');

    baseRound.status = 'ACTIVE';
    expect(deriveLiveScreenPhase(baseRound)).toBe('LIVE');

    baseRound.status = 'LOCKED';
    expect(deriveLiveScreenPhase(baseRound)).toBe('LOCKED');

    baseRound.status = 'REVEALED';
    expect(deriveLiveScreenPhase(baseRound)).toBe('REVEALED');

    // Game 3 Toy Factory states
    const g3Round = structuredClone(INITIAL_GAME_STATE.round);
    g3Round.gameStage = 'QUIXORT';
    g3Round.briefingOpen = false;
    g3Round.status = 'IDLE';
    g3Round.toyFactory = {
      roundIndex: 1,
      pairings: buildToyFactoryPairings(['team1', 'team2', 'team3', 'team4']),
      usedDatasetIds: [],
      selectedDatasetId: null,
      phase: 'TOPIC_SELECT',
      prepEndsAt: null,
      bufferEndsAt: null,
      assignments: [],
      shuffleUsedByTeams: [],
      shuffleUsedThisRound: false,
      revealSlots: [],
    };
    expect(deriveLiveScreenPhase(g3Round)).toBe('STANDBY');

    g3Round.status = 'ACTIVE';
    expect(deriveLiveScreenPhase(g3Round)).toBe('LIVE');

    g3Round.toyFactory.phase = 'SHUFFLE_BUFFER_10S';
    expect(deriveLiveScreenPhase(g3Round)).toBe('LOCKED');

    g3Round.toyFactory.phase = 'REVEAL_JUDGE';
    g3Round.rewardsApplied = false;
    expect(deriveLiveScreenPhase(g3Round)).toBe('LOCKED');
    g3Round.rewardsApplied = true;
    expect(deriveLiveScreenPhase(g3Round)).toBe('REVEALED');

    // Game 4 Last Man Standing states
    const g4Round = structuredClone(INITIAL_GAME_STATE.round);
    g4Round.gameStage = 'TRIVIA_MURDER';
    g4Round.briefingOpen = false;
    g4Round.lastMan = createInitialLastManState(INITIAL_GAME_STATE.teams);
    g4Round.lastMan.phase = 'KRAMPUS_TWIST';
    expect(deriveLiveScreenPhase(g4Round)).toBe('STANDBY');

    g4Round.lastMan.phase = 'PART1_TRIVIA';
    g4Round.status = 'IDLE';
    expect(deriveLiveScreenPhase(g4Round)).toBe('STANDBY');

    g4Round.status = 'ACTIVE';
    expect(deriveLiveScreenPhase(g4Round)).toBe('LIVE');

    g4Round.lastMan.phase = 'PART2_CLUE';
    expect(deriveLiveScreenPhase(g4Round)).toBe('STANDBY');

    g4Round.lastMan.phase = 'PART2_QUESTION';
    g4Round.status = 'ACTIVE';
    expect(deriveLiveScreenPhase(g4Round)).toBe('LIVE');

    g4Round.lastMan.phase = 'CHAMPION';
    expect(deriveLiveScreenPhase(g4Round)).toBe('REVEALED');
  });

  it('getNextGame1SubRound and getNextChronoPreset step cleanly through rounds and return null at end', () => {
    expect(getNextGame1SubRound('SUB1_SURVIVAL')).toBe('SUB2_SNAKE_DRAFT');
    expect(getNextGame1SubRound('SUB2_SNAKE_DRAFT')).toBe('SUB3_POLARITY');
    expect(getNextGame1SubRound('SUB3_POLARITY')).toBeNull();

    expect(getNextChronoPreset(DEFAULT_PRESETS, 'tj-1')?.id).toBe('tj-2');
    expect(getNextChronoPreset(DEFAULT_PRESETS, 'tj-3')?.id).toBe('tj-4');
    expect(getNextChronoPreset(DEFAULT_PRESETS, 'tj-8')?.id).toBe('tj-9');
    expect(getNextChronoPreset(DEFAULT_PRESETS, 'tj-9')).toBeNull();
  });

  it('canRevealCurrentRound enforces Standby, all-submitted/timer-expired, and Lock rules', () => {
    const state = structuredClone(INITIAL_GAME_STATE);
    state.round.gameStage = 'TIMEJINX';
    state.round.durationSeconds = 30;
    state.round.status = 'IDLE';
    expect(canRevealCurrentRound(state, 5000).allowed).toBe(false);

    // Active with timer running and only 1 submission -> blocked
    state.round.status = 'ACTIVE';
    state.round.timerStartedAt = 1000;
    state.submissions.team1 = {
      teamId: 'team1',
      value: 2020,
      submittedAt: 2000,
      elapsedMs: 1000,
      locked: true,
    };
    const earlyCheck = canRevealCurrentRound(state, 5000);
    expect(earlyCheck.allowed).toBe(false);
    expect(earlyCheck.submittedCount).toBe(1);
    expect(earlyCheck.activeTeamCount).toBe(4);

    // Timer expired -> allowed
    expect(canRevealCurrentRound(state, 31000).allowed).toBe(true);

    // Locked by Host -> allowed immediately
    state.round.status = 'LOCKED';
    expect(canRevealCurrentRound(state, 5000).allowed).toBe(true);

    // All 4 active teams submitted -> allowed even with time remaining
    state.round.status = 'ACTIVE';
    for (const tid of ['team2', 'team3', 'team4'] as const) {
      state.submissions[tid] = {
        teamId: tid,
        value: 2021,
        submittedAt: 3000,
        elapsedMs: 2000,
        locked: true,
      };
    }
    expect(canRevealCurrentRound(state, 5000).allowed).toBe(true);
  });

  it('applyToyDatasetSelection enforces Standby gatekeeping (rejects IDLE, accepts ACTIVE)', () => {
    const state = structuredClone(INITIAL_GAME_STATE);
    state.round.gameStage = 'QUIXORT';
    state.round.status = 'IDLE';
    state.round.toyFactory = {
      roundIndex: 1,
      pairings: [{ sortingTeamId: 'team1', holdingTeamId: 'team2' }],
      usedDatasetIds: [],
      selectedDatasetId: null,
      phase: 'TOPIC_SELECT',
      prepEndsAt: null,
      bufferEndsAt: null,
      assignments: [],
      shuffleUsedByTeams: [],
      shuffleUsedThisRound: false,
      revealSlots: [],
    };

    // Blocked in STANDBY (IDLE)
    expect(applyToyDatasetSelection(state, 'team1', 'tf-1', 2000)).toBe(false);
    expect(state.round.toyFactory.phase).toBe('TOPIC_SELECT');

    // Allowed once Host unlocks round (ACTIVE)
    state.round.status = 'ACTIVE';
    expect(applyToyDatasetSelection(state, 'team1', 'tf-1', 2000)).toBe(true);
    expect(state.round.toyFactory.phase).toBe('PREP_10S');
  });
});
