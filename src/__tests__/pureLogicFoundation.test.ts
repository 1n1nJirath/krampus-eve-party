import { describe, expect, it, vi } from 'vitest';
import {
  createInitialGameState,
  INITIAL_COINS,
  INITIAL_HEARTS,
  INITIAL_SHIELDS,
  registerTeam,
  startGame,
} from '../logic/lobbyLogic';
import { applyBailout, applyDoorPickScore } from '../logic/doorsLogic';
import { allocateTraps, applyChronoScore } from '../logic/chronoLogic';
import { markActionProcessed } from '../context/GameContext';
import { INITIAL_GAME_STATE } from '../data/initialData';
import { GameState } from '../types/game';

function deepFreeze<T extends object>(obj: T): T {
  Object.freeze(obj);
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

describe('QA Suite 1: System Setup & Initial State (Lobby)', () => {
  it('1.1 initializes 4 default teams with 1,000 coins, 3 shields, 4 hearts, and isRegistered = false', () => {
    const state = createInitialGameState();
    expect(state.currentPhase).toBe('LOBBY');
    expect(Object.keys(state.teams)).toEqual(['team1', 'team2', 'team3', 'team4']);

    for (const team of Object.values(state.teams)) {
      expect(team.coins).toBe(INITIAL_COINS);
      expect(team.shields).toBe(INITIAL_SHIELDS);
      expect(team.hearts).toBe(INITIAL_HEARTS);
      expect(team.isRegistered).toBe(false);
    }
  });

  it('1.2 registers a team immutably and trims whitespace', () => {
    const initial = deepFreeze(createInitialGameState());
    const next = registerTeam(initial, 'team1', '  พญาแกะพิทักษ์ภัย  ');

    expect(next).not.toBe(initial);
    expect(next.teams.team1.isRegistered).toBe(true);
    expect(next.teams.team1.name).toBe('พญาแกะพิทักษ์ภัย');
    expect(initial.teams.team1.isRegistered).toBe(false);
  });

  it('1.3 enforces idempotency when registering an already registered team (double-click protection)', () => {
    const s1 = registerTeam(deepFreeze(createInitialGameState()), 'team1', 'Santa Squad');
    deepFreeze(s1);
    const s2 = registerTeam(s1, 'team1', 'Overwritten Name');

    expect(s2).toBe(s1);
    expect(s2.teams.team1.name).toBe('Santa Squad');
  });

  it('1.4 rejects invalid registration (empty name/id or non-LOBBY phase)', () => {
    const lobbyState = deepFreeze(createInitialGameState());
    expect(registerTeam(lobbyState, 'team1', '   ')).toBe(lobbyState);
    expect(registerTeam(lobbyState, '   ', 'Valid Name')).toBe(lobbyState);

    const activeState: GameState = deepFreeze({
      ...createInitialGameState(),
      currentPhase: 'GAME1_DOORS',
    });
    expect(registerTeam(activeState, 'team3', 'Late Team')).toBe(activeState);
  });

  it('1.5 blocks startGame unless at least 2 teams are registered, then transitions to GAME1_DOORS', () => {
    const s0 = deepFreeze(createInitialGameState());
    expect(startGame(s0)).toBe(s0);

    const s1 = deepFreeze(registerTeam(s0, 'team1', 'Team One'));
    expect(startGame(s1)).toBe(s1);

    const s2 = deepFreeze(registerTeam(s1, 'team2', 'Team Two'));
    const started = startGame(s2);
    expect(started.currentPhase).toBe('GAME1_DOORS');
  });
});

describe('QA Suite 2: Game 1 — The Doors of Doom', () => {
  const makeGame1State = (): GameState =>
    deepFreeze({
      currentPhase: 'GAME1_DOORS',
      teams: {
        team1: { id: 'team1', name: 'Alpha', coins: 1000, shields: 3, hearts: 4, isRegistered: true },
        team2: { id: 'team2', name: 'Beta', coins: 300, shields: 1, hearts: 4, isRegistered: true },
        team3: { id: 'team3', name: 'Gamma', coins: 200, shields: 0, hearts: 4, isRegistered: true },
      },
    });

  it('2.1 awards +300 coins on 1st correct door and +500 coins on 2nd correct door (total +800)', () => {
    const s0 = makeGame1State();
    const s1 = deepFreeze(applyDoorPickScore(s0, 'team1', true, false));
    expect(s1.teams.team1.coins).toBe(1300);

    const s2 = applyDoorPickScore(s1, 'team1', true, true);
    expect(s2.teams.team1.coins).toBe(1800);
  });

  it('2.2 deducts -1 shield on wrong door pick and floors shields at 0 (never negative)', () => {
    const s0 = makeGame1State();
    const s1 = deepFreeze(applyDoorPickScore(s0, 'team2', false));
    expect(s1.teams.team2.shields).toBe(0);

    // Picking wrong again at 0 shields stays floored at 0
    const s2 = applyDoorPickScore(s1, 'team2', false);
    expect(s2.teams.team2.shields).toBe(0);
  });

  it('2.3 rejects bailout when shields > 0 or team does not exist', () => {
    const s0 = makeGame1State();
    expect(applyBailout(s0, 'team1')).toBe(s0);
    expect(applyBailout(s0, 'unknown_team')).toBe(s0);
  });

  it('2.4 applies mandatory bailout (-500 coins, +2 shields) when shields === 0 and allows negative coin debt with warning', () => {
    const s0 = makeGame1State();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const s1 = applyBailout(s0, 'team3');
    expect(s1.teams.team3.coins).toBe(-300); // 200 - 500 = -300 debt
    expect(s1.teams.team3.shields).toBe(2);
    expect(warnSpy).toHaveBeenCalledOnce();

    warnSpy.mockRestore();
  });
});

describe('QA Suite 3: Game 2 — The Chrono Crush', () => {
  const makeGame2State = (): GameState =>
    deepFreeze({
      currentPhase: 'GAME2_CHRONO',
      teams: {
        team1: { id: 'team1', name: 'Rich', coins: 1800, shields: 3, hearts: 4, isRegistered: true },
        team2: { id: 'team2', name: 'MidHigh', coins: 1300, shields: 3, hearts: 4, isRegistered: true },
        team3: { id: 'team3', name: 'MidLow', coins: 1000, shields: 2, hearts: 4, isRegistered: true },
        team4: { id: 'team4', name: 'Poor', coins: 400, shields: 2, hearts: 4, isRegistered: true },
      },
    });

  it('3.1 allocates trap quotas (3, 2, 1, 0) strictly by wealth rank', () => {
    const s0 = makeGame2State();
    const s1 = allocateTraps(s0);

    expect(s1.trapQuotas).toEqual({
      team1: 3,
      team2: 2,
      team3: 1,
      team4: 0,
    });
    expect(s1.teams.team1.trapQuota).toBe(3);
    expect(s1.teams.team2.trapQuota).toBe(2);
    expect(s1.teams.team3.trapQuota).toBe(1);
    expect(s1.teams.team4.trapQuota).toBe(0);
  });

  it('3.2 awards +600 coins on exact year match and +1,200 coins (2x) when bypassing traps', () => {
    const s0 = makeGame2State();
    const normalExact = applyChronoScore(s0, 'team3', 2004, 2004, false);
    expect(normalExact.teams.team3.coins).toBe(1600);

    const trapBreakerExact = applyChronoScore(s0, 'team4', 2004, 2004, true);
    expect(trapBreakerExact.teams.team4.coins).toBe(1600); // 400 + 1200
  });

  it('3.3 deducts -100 coins per year difference on missed guess and rejects invalid inputs', () => {
    const s0 = makeGame2State();
    const missedBy5 = applyChronoScore(s0, 'team1', 1999, 2004, true);
    expect(missedBy5.teams.team1.coins).toBe(1300); // 1800 - (5 * 100)

    // Rejects NaN or non-existent team
    expect(applyChronoScore(s0, 'team1', Number.NaN, 2004)).toBe(s0);
    expect(applyChronoScore(s0, 'ghost_team', 2004, 2004)).toBe(s0);
  });
});

describe('QA Suite 4: Action Idempotency & Anti-Double-Click Guard', () => {
  it('4.1 markActionProcessed accepts a new actionId once and rejects duplicate/echoed actionIds', () => {
    const fullState = structuredClone(INITIAL_GAME_STATE);
    const actionId = 'team1:SUBMIT_ANSWER:1700000000000:abc1';

    expect(markActionProcessed(fullState, actionId)).toBe(true);
    expect(markActionProcessed(fullState, actionId)).toBe(false);
    expect(fullState.processedActionIds).toContain(actionId);
  });
});
