import { describe, expect, it } from 'vitest';
import {
  buildToyFactoryPairings,
  createInitialLastManState,
  getActiveTeamIds,
  INITIAL_TEAMS,
  TEAM_ORDER,
} from '../data/initialData';

describe('Suite 1: Core & Helpers (initialData)', () => {
  it('getActiveTeamIds returns only registered teams when >= 2 teams are registered', () => {
    const teams = structuredClone(INITIAL_TEAMS);
    teams.team1.isRegistered = true;
    teams.team3.isRegistered = true;
    expect(getActiveTeamIds(teams)).toEqual(['team1', 'team3']);
  });

  it('getActiveTeamIds falls back to all 4 teams when < 2 teams are registered', () => {
    const teams = structuredClone(INITIAL_TEAMS);
    teams.team1.isRegistered = true;
    expect(getActiveTeamIds(teams)).toEqual([...TEAM_ORDER]);
  });

  it('buildToyFactoryPairings pairs every active team without self-pairing', () => {
    const pairings = buildToyFactoryPairings(['team1', 'team2', 'team3', 'team4']);
    expect(pairings).toHaveLength(4);
    const sorters = new Set(pairings.map((p) => p.sortingTeamId));
    const holders = new Set(pairings.map((p) => p.holdingTeamId));
    expect(sorters.size).toBe(4);
    expect(holders.size).toBe(4);
    for (const p of pairings) {
      expect(p.sortingTeamId).not.toBe(p.holdingTeamId);
    }
  });

  it('createInitialLastManState gives 4 hearts normally and 3 hearts if cursed from Game 3', () => {
    const teams = structuredClone(INITIAL_TEAMS);
    teams.team2.toyFactoryCurse = true;
    teams.team4.toyFactoryCurse = true;

    const lms = createInitialLastManState(teams);
    expect(lms.phase).toBe('KRAMPUS_TWIST');
    expect(lms.teamStates.team1.hearts).toBe(4);
    expect(lms.teamStates.team2.hearts).toBe(3);
    expect(lms.teamStates.team3.hearts).toBe(4);
    expect(lms.teamStates.team4.hearts).toBe(3);
  });
});
