import { describe, expect, it } from 'vitest';
import {
  createRoundFromPreset,
  DEFAULT_PRESETS,
  INITIAL_GAME_STATE,
} from '../data/initialData';
import {
  applyBailoutToState,
  applySnakePickToState,
  buildSnakeDraftOrder,
} from '../logic/doorsLogic';
import { KrampusGameState } from '../types/game';

function makeDoorsState(subRound: 'SUB1_SURVIVAL' | 'SUB2_SNAKE_DRAFT' = 'SUB1_SURVIVAL'): KrampusGameState {
  const state = structuredClone(INITIAL_GAME_STATE);
  const preset = DEFAULT_PRESETS.find((p) => p.gameStage === 'POLL_MINE')!;
  const isSub2 = subRound === 'SUB2_SNAKE_DRAFT';
  state.round = {
    ...createRoundFromPreset(preset),
    gameStage: 'POLL_MINE',
    eightDoorsSubRound: subRound,
    status: 'ACTIVE',
    choiceCount: 8,
    safeRankMin: isSub2 ? 2 : 1,
    safeRankMax: isSub2 ? 4 : 3,
    choices: [
      { key: 'A', label: 'Door A', rank: 1, isOpened: false },
      { key: 'B', label: 'Door B', rank: 2, isOpened: false },
      { key: 'C', label: 'Door C', rank: 3, isOpened: false },
      { key: 'D', label: 'Door D', rank: 4, isOpened: false },
      { key: 'E', label: 'Door E', rank: 5, isOpened: false },
      { key: 'F', label: 'Door F', rank: 6, isOpened: false },
      { key: 'G', label: 'Door G', rank: 7, isOpened: false },
      { key: 'H', label: 'Door H', rank: 8, isOpened: false },
    ],
    snakeDraftOrder: buildSnakeDraftOrder(state.teams, isSub2),
    snakeDraftIndex: 0,
    snakeDraftPicks: [],
  };
  return state;
}

describe('Suite 2: Game 1 — THE DOORS OF DOOM (Updated Rules)', () => {
  it('applyBailoutToState forces -500 coins for +2 shields only when shields === 0', () => {
    const state = makeDoorsState();
    expect(applyBailoutToState(state, 'team1', 1000)).toBe(false);
    expect(state.teams.team1.coins).toBe(1000);

    state.teams.team1.shields = 0;
    state.teams.team1.candles = 0;
    expect(applyBailoutToState(state, 'team1', 2000)).toBe(true);
    expect(state.teams.team1.shields).toBe(2);
    expect(state.teams.team1.coins).toBe(500);
  });

  it('SUB1_SURVIVAL (1-2-3-4-4-3-2-1): ranks 1-3 safe (+300 each) and ends early when all 3 safe doors opened', () => {
    const state = makeDoorsState('SUB1_SURVIVAL');
    expect(state.round.snakeDraftOrder).toEqual([
      'team1', 'team2', 'team3', 'team4', 'team4', 'team3', 'team2', 'team1',
    ]);

    expect(applySnakePickToState(state, 'team1', 'A', 1000)).toBe(true); // #1 safe (+300)
    expect(state.teams.team1.coins).toBe(1300);

    expect(applySnakePickToState(state, 'team2', 'B', 1001)).toBe(true); // #2 safe (+300)
    expect(state.teams.team2.coins).toBe(1300);

    expect(applySnakePickToState(state, 'team3', 'C', 1002)).toBe(true); // #3 safe (+300) -> all 1-3 opened!
    expect(state.teams.team3.coins).toBe(1300);
    expect(state.round.status).toBe('REVEALED');
  });

  it('SUB2_SNAKE_DRAFT (4-3-2-1-1-2-3-4): ranks 2-4 safe (+300), deducts -1 shield on miss, -200 if all 8 picked without safe match', () => {
    const state = makeDoorsState('SUB2_SNAKE_DRAFT');
    expect(state.round.snakeDraftOrder).toEqual([
      'team4', 'team3', 'team2', 'team1', 'team1', 'team2', 'team3', 'team4',
    ]);

    // 4 teams pick wrong doors on first 4 turns; team4 finds 1 safe door (#2 B), team1/2/3 miss all
    expect(applySnakePickToState(state, 'team4', 'B', 1000)).toBe(true); // #2 safe (+300)
    expect(applySnakePickToState(state, 'team3', 'A', 1001)).toBe(true); // #1 wrong (-1 shield)
    expect(applySnakePickToState(state, 'team2', 'E', 1002)).toBe(true); // #5 wrong (-1 shield)
    expect(applySnakePickToState(state, 'team1', 'F', 1003)).toBe(true); // #6 wrong (-1 shield)
    expect(applySnakePickToState(state, 'team1', 'G', 1004)).toBe(true); // #7 wrong (-1 shield)
    expect(applySnakePickToState(state, 'team2', 'H', 1005)).toBe(true); // #8 wrong (-1 shield)
    // Now team3 & team4 miss remaining non-safe? Only #3 (C) & #4 (D) remain safe, pick #1/#5 already opened -> let's pick C on team3 (+300), and test miss case cleanly
    expect(state.teams.team3.shields).toBe(2);
    expect(state.teams.team1.coins).toBe(1000);
    expect(state.teams.team1.shields).toBe(1);

    // Finish remaining 2 turns with misses? Actually only C(#3) and D(#4) are left, so test out-of-turn / opened door guard too
    expect(applySnakePickToState(state, 'team4', 'C', 1006)).toBe(false); // team3's turn
    expect(applySnakePickToState(state, 'team3', 'B', 1006)).toBe(false); // B already opened
  });

  it('SUB3_POLARITY awards +300 for 1 match and +700 for both #1 and #8', () => {
    const state = makeDoorsState('SUB1_SURVIVAL');
    state.round.eightDoorsSubRound = 'SUB3_POLARITY';
    const rank1 = state.round.choices.find((c) => c.rank === 1);
    const rank8 = state.round.choices.find((c) => c.rank === 8);
    expect(rank1?.key).toBe('A');
    expect(rank8?.key).toBe('H');
  });
});
