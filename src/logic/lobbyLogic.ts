import { GameState, TeamState } from '../types/game';

export const INITIAL_COINS = 1000;
export const INITIAL_SHIELDS = 3;
export const INITIAL_HEARTS = 4;
export const MIN_REGISTERED_TEAMS = 2;

/**
 * Deeply clones a GameState object to guarantee 100% immutability across all pure transitions.
 */
export function cloneGameState(state: GameState): GameState {
  const clonedTeams: Record<string, TeamState> = {};
  for (const [id, team] of Object.entries(state.teams)) {
    clonedTeams[id] = { ...team };
  }

  return {
    ...state,
    teams: clonedTeams,
    ...(state.trapQuotas ? { trapQuotas: { ...state.trapQuotas } } : {}),
  };
}

/**
 * Creates a clean initial GameState in the LOBBY phase with default slots.
 */
export function createInitialGameState(
  teamIds: string[] = ['team1', 'team2', 'team3', 'team4']
): GameState {
  const teams: Record<string, TeamState> = {};

  for (const id of teamIds) {
    teams[id] = {
      id,
      name: '',
      coins: INITIAL_COINS,
      shields: INITIAL_SHIELDS,
      hearts: INITIAL_HEARTS,
      isRegistered: false,
      trapQuota: 0,
    };
  }

  return {
    currentPhase: 'LOBBY',
    teams,
  };
}

/**
 * Registers a team in the LOBBY phase.
 * - Pure & Immutable: Returns a new GameState without mutating `state`.
 * - Idempotent: If the team is already registered, returns the original `state` reference.
 * - Validation: Rejects empty teamId/teamName or registrations outside LOBBY.
 */
export function registerTeam(
  state: GameState,
  teamId: string,
  teamName: string
): GameState {
  if (!state || state.currentPhase !== 'LOBBY') {
    return state;
  }

  const cleanId = teamId.trim();
  const cleanName = teamName.trim();
  if (!cleanId || !cleanName) {
    return state;
  }

  const existingTeam = state.teams[cleanId];

  // Idempotency check: ignore duplicate registration requests for an already registered team
  if (existingTeam?.isRegistered) {
    return state;
  }

  const nextState = cloneGameState(state);
  nextState.teams[cleanId] = existingTeam
    ? {
        ...existingTeam,
        name: cleanName,
        isRegistered: true,
      }
    : {
        id: cleanId,
        name: cleanName,
        coins: INITIAL_COINS,
        shields: INITIAL_SHIELDS,
        hearts: INITIAL_HEARTS,
        isRegistered: true,
        trapQuota: 0,
      };

  return nextState;
}

/**
 * Transitions the game from LOBBY to GAME1_DOORS.
 * - Validates currentPhase === 'LOBBY'.
 * - Validates that at least 2 teams are registered.
 * - Returns unmodified `state` if validation fails.
 */
export function startGame(state: GameState): GameState {
  if (!state || state.currentPhase !== 'LOBBY') {
    return state;
  }

  const registeredCount = Object.values(state.teams).filter(
    (team) => team.isRegistered
  ).length;

  if (registeredCount < MIN_REGISTERED_TEAMS) {
    return state;
  }

  const nextState = cloneGameState(state);
  nextState.currentPhase = 'GAME1_DOORS';
  return nextState;
}
