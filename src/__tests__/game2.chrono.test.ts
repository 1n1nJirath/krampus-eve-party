import { describe, expect, it } from 'vitest';
import {
  computeChronoRankings,
  getChronoSliderStep,
  INITIAL_GAME_STATE,
  scoreChronoTeam,
} from '../data/initialData';
import { applyChronoClaimToState, applyChronoTrapsToState } from '../logic/chronoLogic';
import {
  computeFinaleSharedRanking,
  computeSharedTeamsRanking,
} from '../logic/adminFlowLogic';
import { KrampusGameState } from '../types/game';

function makeChronoState(): KrampusGameState {
  const state = structuredClone(INITIAL_GAME_STATE);
  state.round.gameStage = 'TIMEJINX';
  state.round.status = 'ACTIVE';
  state.round.targetYear = 2005;
  state.round.yearMin = 2012;
  state.round.yearMax = 2021;
  state.round.yearPenaltyPerDiff = 100;
  state.round.yearFastestBonus = 0;
  state.round.chronoQuotas = { team1: 3, team2: 2, team3: 1, team4: 0 };
  state.round.timerStartedAt = 1000;
  return state;
}

describe('Suite 3: Game 2 — THE CHRONO CRUSH (Updated Rules)', () => {
  it('computeChronoRankings gives richer teams higher trap quotas (3 / 2 / 1 / 0) and getChronoSliderStep handles 1/2/3+ traps', () => {
    const state = makeChronoState();
    state.teams.team3.coins = 2000;
    state.teams.team1.coins = 1500;
    state.teams.team4.coins = 1200;
    state.teams.team2.coins = 500;

    const { ordered, quotas } = computeChronoRankings(state.teams);
    expect(ordered).toEqual(['team3', 'team1', 'team4', 'team2']);
    expect(quotas).toEqual({ team3: 3, team1: 2, team4: 1, team2: 0 });

    expect(getChronoSliderStep(0)).toBe(1);
    expect(getChronoSliderStep(1)).toBe(2);  // 1 trap = Even/Odd parity
    expect(getChronoSliderStep(2)).toBe(5);  // 2 traps = 5-yr step
    expect(getChronoSliderStep(3)).toBe(10); // 3 traps = 10-yr step
  });

  it('applyChronoTrapsToState rejects exceeding quota and ignores self-traps', () => {
    const state = makeChronoState();
    state.round.chronoSubRound = 'CHRONO_SUB2_TRAP';
    state.round.chronoPhase = 'TRAP_PLACEMENT';

    expect(applyChronoTrapsToState(state, 'team1', { team2: 2, team3: 2 }, 2000)).toBe(false);

    expect(
      applyChronoTrapsToState(state, 'team1', { team1: 2, team2: 2, team3: 1 }, 2000)
    ).toBe(true);
    expect(state.round.chronoTrapsPlaced?.team1).toEqual({ team2: 2, team3: 1 });
  });

  it('applyChronoClaimToState enforces first-come-first-served year lock', () => {
    const state = makeChronoState();
    state.round.chronoSubRound = 'CHRONO_SUB3_FAST_FINGER';

    expect(applyChronoClaimToState(state, 'team1', 2015, 2000)).toBe(true);
    expect(state.round.chronoFastFingerClaims?.['2015']).toBe('team1');
    expect(applyChronoClaimToState(state, 'team2', 2015, 2100)).toBe(false);
    expect(applyChronoClaimToState(state, 'team2', 2025, 2200)).toBe(false);
  });

  it('scoreChronoTeam applies +600 / +-1 (+300) / +-2 (0) / -100 per yr (max 1000) and x2 when trapped', () => {
    const state = makeChronoState();
    state.round.chronoSubRound = 'CHRONO_SUB1_CLASSIC';
    state.round.targetYear = 2005;

    expect(scoreChronoTeam(state.round, 'team1', 2005, 10).delta).toBe(600);
    expect(scoreChronoTeam(state.round, 'team1', 2004, 10).delta).toBe(300);
    expect(scoreChronoTeam(state.round, 'team1', 2007, 10).delta).toBe(0);
    expect(scoreChronoTeam(state.round, 'team1', 2000, 10).delta).toBe(-500);
    expect(scoreChronoTeam(state.round, 'team1', 1980, 25).delta).toBe(-1000);

    // Sub 2 Trap Breaker x2
    state.round.chronoSubRound = 'CHRONO_SUB2_TRAP';
    state.round.chronoTrapsPlaced = { team2: { team1: 1 } };
    expect(scoreChronoTeam(state.round, 'team1', 2005, 5).delta).toBe(1200);
    expect(scoreChronoTeam(state.round, 'team1', 2006, 5).delta).toBe(600);
  });

  it('computeSharedTeamsRanking & computeChronoRankings handle 2-way tie for 1st, 3-way tie for 2nd, and 4-way tie using Standard Competition Ranking', () => {
    // Case A: 4-way tie at 1,000 coins -> all 4 teams share #1 ร่วม (Nice List) and 0 teams get Naughty List
    const fourWayState = makeChronoState();
    const fourWay = computeSharedTeamsRanking(fourWayState.teams);
    expect(fourWay.map((e) => e.rank)).toEqual([1, 1, 1, 1]);
    expect(fourWay.map((e) => e.rankLabel)).toEqual(['#1 ร่วม', '#1 ร่วม', '#1 ร่วม', '#1 ร่วม']);
    expect(fourWay.every((e) => e.isNiceLeader && !e.isNaughty)).toBe(true);

    // Case B: 3-way tie for 2nd (1300, 1000, 1000, 1000) -> ranks #1, #2, #2, #2 (no team gets #4 / Naughty List!)
    const threeWayState = makeChronoState();
    threeWayState.teams.team1.coins = 1300;
    threeWayState.teams.team2.coins = 1000;
    threeWayState.teams.team3.coins = 1000;
    threeWayState.teams.team4.coins = 1000;
    const threeWay = computeSharedTeamsRanking(threeWayState.teams);
    expect(threeWay.map((e) => e.rank)).toEqual([1, 2, 2, 2]);
    expect(threeWay.map((e) => e.rankLabel)).toEqual(['#1', '#2 ร่วม', '#2 ร่วม', '#2 ร่วม']);
    expect(threeWay.every((e) => !e.isNaughty)).toBe(true);

    const { quotas } = computeChronoRankings(threeWayState.teams);
    expect(quotas).toEqual({ team1: 3, team2: 2, team3: 2, team4: 2 });

    // Case C: 2-way tie for 1st (1500, 1500, 1000, 800) -> ranks #1, #1, #3, #4
    const twoWayState = makeChronoState();
    twoWayState.teams.team1.coins = 1500;
    twoWayState.teams.team2.coins = 1500;
    twoWayState.teams.team3.coins = 1000;
    twoWayState.teams.team4.coins = 800;
    const twoWay = computeSharedTeamsRanking(twoWayState.teams);
    expect(twoWay.map((e) => e.rank)).toEqual([1, 1, 3, 4]);
    expect(twoWay.map((e) => e.rankLabel)).toEqual(['#1 ร่วม', '#1 ร่วม', '#3', '#4']);
    expect(twoWay[0].isNiceLeader).toBe(true);
    expect(twoWay[1].isNiceLeader).toBe(true);
    expect(twoWay[2].isNaughty).toBe(false);
    expect(twoWay[3].isNaughty).toBe(true);

    const finaleTwoWay = computeFinaleSharedRanking(twoWayState);
    expect(finaleTwoWay.map((e) => e.ordinalLabel)).toEqual(['1ST ร่วม', '1ST ร่วม', '3RD', '4TH']);
  });
});
