import { describe, expect, it } from 'vitest';
import {
  createInitialLastManState,
  DEFAULT_LAST_MAN_PART1_QUESTIONS,
  DEFAULT_LAST_MAN_PART2_QUESTIONS,
  INITIAL_GAME_STATE,
} from '../data/initialData';
import {
  applyLmsBuyItem,
  applyLmsGreedTax,
  applyLmsPart1TriviaReveal,
  applyLmsPart2Reveal,
  applyLmsSoulSacrifice,
  applyLmsStartPart2Escape,
  applyLmsUseJetpack,
  resolveGhostPossessions,
} from '../logic/lastManLogic';
import { KrampusGameState } from '../types/game';

function makeLastManState(): KrampusGameState {
  const state = structuredClone(INITIAL_GAME_STATE);
  state.lastManPart1Questions = structuredClone(DEFAULT_LAST_MAN_PART1_QUESTIONS);
  state.lastManPart2Questions = structuredClone(DEFAULT_LAST_MAN_PART2_QUESTIONS);
  state.round.gameStage = 'TRIVIA_MURDER';
  state.round.status = 'ACTIVE';
  state.round.lastMan = createInitialLastManState(state.teams);
  return state;
}

describe('Suite 5: Game 4 — THE LAST MAN STANDING', () => {
  it('Part 1: Soul Sacrifice trades -1 heart for +500 coins and rejects if hearts <= 1 or Ghost', () => {
    const state = makeLastManState();
    state.round.lastMan!.phase = 'PART1_BLACK_MARKET';

    expect(applyLmsSoulSacrifice(state, 'team1', 1000)).toBe(true);
    expect(state.round.lastMan!.teamStates.team1.hearts).toBe(3);
    expect(state.teams.team1.coins).toBe(1500);

    // Reject at 1 heart
    state.round.lastMan!.teamStates.team1.hearts = 1;
    expect(applyLmsSoulSacrifice(state, 'team1', 1001)).toBe(false);

    // Reject if ghost
    state.round.lastMan!.teamStates.team2.isGhost = true;
    state.round.lastMan!.teamStates.team2.hearts = 0;
    expect(applyLmsSoulSacrifice(state, 'team2', 1002)).toBe(false);
  });

  it('Part 1: Trivia gives 2x (+500) for Sole Survivor and triggers PART1_MISERY_PULL when 1 team is wrong', () => {
    // Sole Survivor
    const s1 = makeLastManState();
    s1.round.lastMan!.phase = 'PART1_TRIVIA';
    const correctKey = s1.lastManPart1Questions![0].correctKey;
    const wrongKey = correctKey === 'A' ? 'B' : 'A';
    s1.submissions = {
      team1: { teamId: 'team1', value: correctKey, submittedAt: 1000, elapsedMs: 100, locked: true },
      team2: { teamId: 'team2', value: wrongKey, submittedAt: 1000, elapsedMs: 100, locked: true },
      team3: { teamId: 'team3', value: wrongKey, submittedAt: 1000, elapsedMs: 100, locked: true },
      team4: { teamId: 'team4', value: wrongKey, submittedAt: 1000, elapsedMs: 100, locked: true },
    };
    applyLmsPart1TriviaReveal(s1, 2000);
    expect(s1.teams.team1.coins).toBe(1500); // +500 Sole Survivor
    expect(s1.round.lastMan!.phase).toBe('PART1_TRIVIA_REVEAL');

    // Misery Loves Company (1 team wrong)
    const s2 = makeLastManState();
    s2.round.lastMan!.phase = 'PART1_TRIVIA';
    s2.submissions = {
      team1: { teamId: 'team1', value: correctKey, submittedAt: 1000, elapsedMs: 100, locked: true },
      team2: { teamId: 'team2', value: correctKey, submittedAt: 1000, elapsedMs: 100, locked: true },
      team3: { teamId: 'team3', value: correctKey, submittedAt: 1000, elapsedMs: 100, locked: true },
      team4: { teamId: 'team4', value: wrongKey, submittedAt: 1000, elapsedMs: 100, locked: true },
    };
    applyLmsPart1TriviaReveal(s2, 2000);
    expect(s2.round.lastMan!.phase).toBe('PART1_MISERY_PULL');
    expect(s2.round.lastMan!.miseryPullTeamId).toBe('team4');
  });

  it('Part 1 Black Market: atomic stock lock, Mirror Shield reflection vs Hell Chains, Ghost freeze, and Greed Tax', () => {
    const state = makeLastManState();
    state.round.lastMan!.phase = 'PART1_BLACK_MARKET';

    // Concurrency: stock = 1 for MIRROR_SHIELD -> team1 succeeds, team2 rejected with no deduction
    expect(applyLmsBuyItem(state, 'team1', 'MIRROR_SHIELD', undefined, 1000)).toBe(true);
    expect(state.teams.team1.coins).toBe(850);
    expect(applyLmsBuyItem(state, 'team2', 'MIRROR_SHIELD', undefined, 1001)).toBe(false);
    expect(state.teams.team2.coins).toBe(1000);

    // Mirror Shield reflects SNIPER_SHOT back to team2
    expect(applyLmsBuyItem(state, 'team2', 'SNIPER_SHOT', 'team1', 1002)).toBe(true);
    expect(state.round.lastMan!.teamStates.team1.hearts).toBe(4);
    expect(state.round.lastMan!.teamStates.team1.mirrorShield).toBe(false);
    expect(state.round.lastMan!.teamStates.team2.hearts).toBe(3);

    // Mirror Shield CANNOT block HELL_CHAINS
    expect(applyLmsBuyItem(state, 'team3', 'MIRROR_SHIELD', undefined, 1003)).toBe(false); // stock 0
    state.round.lastMan!.teamStates.team3.mirrorShield = true;
    expect(applyLmsBuyItem(state, 'team2', 'HELL_CHAINS', undefined, 1004)).toBe(true);
    expect(state.round.lastMan!.teamStates.team3.inKillingFloor).toBe(true);

    // Ghost cannot buy anything
    state.round.lastMan!.teamStates.team4.isGhost = true;
    state.round.lastMan!.teamStates.team4.hearts = 0;
    expect(applyLmsBuyItem(state, 'team4', 'CURSE_BOX', 'team3', 1005)).toBe(false);

    // Greed Tax (> 1,000 loses 50%, <= 1,000 unaffected)
    state.teams.team1.coins = 1400;
    state.teams.team2.coins = 1000;
    applyLmsGreedTax(state, 2000);
    expect(state.teams.team1.coins).toBe(700);
    expect(state.teams.team2.coins).toBe(1000);
  });

  it('Part 2: All-Ghost Safeguard & Head-Start (400 = +1 step, max 3, coins reset to 0)', () => {
    // All ghosts -> revive all at step 0
    const allDead = makeLastManState();
    (['team1', 'team2', 'team3', 'team4'] as const).forEach((tid) => {
      allDead.round.lastMan!.teamStates[tid].isGhost = true;
      allDead.round.lastMan!.teamStates[tid].hearts = 0;
    });
    applyLmsStartPart2Escape(allDead, 1000);
    (['team1', 'team2', 'team3', 'team4'] as const).forEach((tid) => {
      expect(allDead.round.lastMan!.teamStates[tid].isGhost).toBe(false);
      expect(allDead.round.lastMan!.teamStates[tid].step).toBe(0);
    });

    // Head-start conversion
    const rich = makeLastManState();
    rich.teams.team1.coins = 2500; // capped at +3
    rich.teams.team2.coins = 850;  // +2
    rich.teams.team3.coins = 399;  // +0
    rich.round.lastMan!.teamStates.team4.isGhost = true;
    rich.round.lastMan!.teamStates.team4.hearts = 0;
    applyLmsStartPart2Escape(rich, 1000);
    expect(rich.round.lastMan!.teamStates.team1.step).toBe(3);
    expect(rich.round.lastMan!.teamStates.team2.step).toBe(2);
    expect(rich.round.lastMan!.teamStates.team3.step).toBe(0);
    expect(rich.round.lastMan!.teamStates.team4.step).toBe(0);
    expect(rich.teams.team1.coins).toBe(0);
  });

  it('Part 2: Speed ranking, Ghost Possession, Krampus Pursuit (+1.5), Jetpack, and Champion at step >= 25', () => {
    const state = makeLastManState();
    applyLmsStartPart2Escape(state, 1000);
    const lms = state.round.lastMan!;
    lms.phase = 'PART2_QUESTION';
    lms.teamStates.team1.step = 5;
    lms.teamStates.team2.step = 5;
    lms.teamStates.team3.step = 5;
    lms.teamStates.team4.step = 1; // will be caught by Krampus or left behind

    const correct = state.lastManPart2Questions![0].correctKey;
    const wrong = correct === 'A' ? 'B' : 'A';
    state.submissions = {
      team1: { teamId: 'team1', value: correct, submittedAt: 1100, elapsedMs: 100, locked: true },
      team2: { teamId: 'team2', value: correct, submittedAt: 1200, elapsedMs: 200, locked: true },
      team3: { teamId: 'team3', value: wrong, submittedAt: 1300, elapsedMs: 300, locked: true },
      // team4 did not answer -> -1 (1 - 1 = 0)
    };

    applyLmsPart2Reveal(state, 2000);
    expect(lms.teamStates.team1.step).toBe(8); // +3
    expect(lms.teamStates.team2.step).toBe(7); // +2
    expect(lms.teamStates.team3.step).toBe(5); // +0
    // Krampus moved 0 -> 1.5, caught team4 at step 0 -> turns Ghost and kicked to 2.5!
    expect(lms.krampusStep).toBe(1.5);
    expect(lms.teamStates.team4.isGhost).toBe(true);
    expect(lms.teamStates.team4.step).toBe(2.5);

    // Ghost possession: ghost team4 advances to step 5 -> swaps with living team3 (step 5)
    lms.teamStates.team4.step = 5;
    resolveGhostPossessions(state, 3000);
    expect(lms.teamStates.team4.isGhost).toBe(false);
    expect(lms.teamStates.team3.isGhost).toBe(true);

    // Jetpack pushes living team to >= 25 -> immediate CHAMPION!
    lms.teamStates.team1.step = 23;
    lms.teamStates.team1.jetpacks = 1;
    expect(applyLmsUseJetpack(state, 'team1', 4000)).toBe(true);
    expect(lms.teamStates.team1.step).toBe(25);
    expect(lms.phase).toBe('CHAMPION');
    expect(lms.winnerTeamId).toBe('team1');
  });
});
