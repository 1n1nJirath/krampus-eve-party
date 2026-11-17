import { describe, expect, it } from 'vitest';
import {
  buildToyFactoryPairings,
  DEFAULT_TOY_FACTORY_DATASETS,
  INITIAL_GAME_STATE,
} from '../data/initialData';
import {
  applyToyDatasetSelection,
  applyToyFactoryFinalize,
  applyToyFactoryShuffle,
} from '../logic/toyFactoryLogic';
import { KrampusGameState } from '../types/game';

function makeToyFactoryState(): KrampusGameState {
  const state = structuredClone(INITIAL_GAME_STATE);
  state.teams.team2.roster = ['บอล', 'มายด์', 'เต้', 'พลอย', 'ต้น', 'แนน'];
  state.round.gameStage = 'QUIXORT';
  state.round.status = 'ACTIVE';
  state.round.durationSeconds = 120;
  state.round.timerStartedAt = 1000;
  state.round.toyFactory = {
    roundIndex: 1,
    pairings: [
      { sortingTeamId: 'team1', holdingTeamId: 'team2' },
      ...buildToyFactoryPairings(['team1', 'team2', 'team3', 'team4']).slice(1),
    ],
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
  return state;
}

describe('Suite 4: Game 3 — THE TOY FACTORY CHAOS', () => {
  it('applyToyDatasetSelection allows only sortingTeamId, blocks reused datasets, and creates 1 mystery assignment', () => {
    const state = makeToyFactoryState();
    const dsId = DEFAULT_TOY_FACTORY_DATASETS[0].id;

    // Non-sorting team rejected
    expect(applyToyDatasetSelection(state, 'team2', dsId, 2000)).toBe(false);

    // Already used dataset rejected
    state.round.toyFactory!.usedDatasetIds.push('tf-2');
    expect(applyToyDatasetSelection(state, 'team1', 'tf-2', 2000)).toBe(false);

    // Valid selection
    expect(applyToyDatasetSelection(state, 'team1', dsId, 2000)).toBe(true);
    const tf = state.round.toyFactory!;
    expect(tf.phase).toBe('PREP_10S');
    expect(tf.assignments).toHaveLength(6);
    expect(tf.assignments.filter((a) => a.isMystery)).toHaveLength(1);
  });

  it('applyToyFactoryShuffle enforces spectator-only, >15s remaining, 1/round & 1/game quota, and marks changedOnShuffle', () => {
    const state = makeToyFactoryState();
    applyToyDatasetSelection(state, 'team1', 'tf-1', 2000);
    state.round.toyFactory!.phase = 'ACTION';
    state.round.timerStartedAt = 1000;
    state.round.durationSeconds = 120;

    // Sorting or Holding team cannot shuffle
    expect(applyToyFactoryShuffle(state, 'team1', 10000)).toBe(false);
    expect(applyToyFactoryShuffle(state, 'team2', 10000)).toBe(false);

    // Locked in last 15s (elapsed = 106s -> remaining = 14s)
    expect(applyToyFactoryShuffle(state, 'team3', 107000)).toBe(false);

    // Valid shuffle by spectator team3 when > 15s left
    const beforeMap = new Map(
      state.round.toyFactory!.assignments.map((a) => [a.memberName, a.itemId])
    );
    expect(applyToyFactoryShuffle(state, 'team3', 20000)).toBe(true);
    const tf = state.round.toyFactory!;
    expect(tf.phase).toBe('SHUFFLE_BUFFER_10S');
    expect(tf.shuffleUsedThisRound).toBe(true);
    expect(tf.shuffleUsedByTeams).toContain('team3');
    for (const a of tf.assignments) {
      expect(a.changedOnShuffle).toBe(beforeMap.get(a.memberName) !== a.itemId);
    }

    // Another spectator team4 cannot shuffle in same round
    tf.phase = 'ACTION';
    state.round.status = 'ACTIVE';
    state.round.timerStartedAt = 35000;
    expect(applyToyFactoryShuffle(state, 'team4', 36000)).toBe(false);

    // Next round: team3 cannot shuffle again (1/game quota)
    tf.shuffleUsedThisRound = false;
    expect(applyToyFactoryShuffle(state, 'team3', 36000)).toBe(false);
  });

  it('applyToyFactoryFinalize rewards 0 mistakes (+800 / +300) and penalizes >=1 mistake (-100/err + Curse)', () => {
    const perfect = makeToyFactoryState();
    perfect.round.toyFactory!.revealSlots = [
      { index: 0, itemId: '1', holderName: 'A', label: 'L1', realValue: '1', isMystery: false, revealed: true, verdict: 'CORRECT' },
      { index: 1, itemId: '2', holderName: 'B', label: 'L2', realValue: '2', isMystery: false, revealed: true, verdict: 'CORRECT' },
    ];
    applyToyFactoryFinalize(perfect);
    expect(perfect.teams.team1.coins).toBe(1800);
    expect(perfect.teams.team2.coins).toBe(1300);
    expect(perfect.teams.team2.toyFactoryCurse).toBeFalsy();

    const flawed = makeToyFactoryState();
    flawed.round.toyFactory!.revealSlots = [
      { index: 0, itemId: '1', holderName: 'A', label: 'L1', realValue: '1', isMystery: false, revealed: true, verdict: 'WRONG' },
      { index: 1, itemId: '2', holderName: 'B', label: 'L2', realValue: '2', isMystery: false, revealed: true, verdict: 'WRONG' },
    ];
    applyToyFactoryFinalize(flawed);
    expect(flawed.teams.team1.coins).toBe(800);
    expect(flawed.teams.team2.coins).toBe(1000);
    expect(flawed.teams.team2.toyFactoryCurse).toBe(true);
  });
});
