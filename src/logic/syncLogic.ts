import {
  ClientRole,
  KrampusGameState,
  LastManShopItemId,
  PendingPlayerAction,
  PlayerActionEvent,
  TeamId,
} from '../types/game';
import { applyChronoClaimToState, applyChronoTrapsToState } from './chronoLogic';
import {
  applyAdminSnakePickOverride,
  applyBailoutToState,
  applySnakePickToState,
} from './doorsLogic';
import {
  applyLmsBuyItem,
  applyLmsMinigameAction,
  applyLmsMiseryPull,
  applyLmsSoulSacrifice,
  applyLmsUseJetpack,
} from './lastManLogic';
import { applyToyDatasetSelection, applyToyFactoryShuffle } from './toyFactoryLogic';

const ROUND_SCOPED_ACTIONS = new Set<PlayerActionEvent['type']>([
  'SUBMIT_ANSWER',
  'PRESS_BUZZER',
  'SNAKE_PICK',
  'PLACE_CHRONO_TRAPS',
  'CLAIM_CHRONO_YEAR',
  'SELECT_TOY_DATASET',
  'TOY_SHUFFLE',
]);

/**
 * Resolves the authoritative client role from browser URL pathname and hash.
 * Only `/admin` (or `/host`) may mutate and broadcast full game state.
 */
export function resolveClientRole(pathname: string, hash: string = ''): ClientRole {
  const cleanHash = hash.replace(/^#/, '').split('?')[0].toLowerCase();
  const cleanPath = (pathname || '').toLowerCase();
  const activePath = cleanHash || cleanPath;

  if (activePath.startsWith('/admin') || activePath.startsWith('/host')) {
    return 'HOST';
  }
  if (activePath.startsWith('/display') || activePath.startsWith('/projector')) {
    return 'DISPLAY';
  }
  if (activePath.startsWith('/play') || activePath.startsWith('/controller')) {
    return 'PLAYER';
  }
  return 'HOME';
}

/**
 * Strict monotonic version gate for incoming `STATE_SYNC` packets.
 * Rejects any packet whose `stateVersion` is less than or equal to the current state.
 */
export function shouldAcceptIncomingState(
  current: KrampusGameState,
  incoming: KrampusGameState
): boolean {
  if (!incoming || !incoming.teams || !incoming.round) {
    return false;
  }
  const currentVersion = current.stateVersion ?? current.version ?? 0;
  const incomingVersion = incoming.stateVersion ?? incoming.version ?? 0;
  if (incomingVersion <= currentVersion) {
    return false;
  }
  return true;
}

/**
 * Stamps a new authoritative state version strictly incremented from `prev`.
 * Guarantees monotonicity even across full resets.
 */
export function stampNextState(
  prev: KrampusGameState,
  next: KrampusGameState,
  nowMs: number
): KrampusGameState {
  const nextVersion = Math.max(prev.stateVersion || 0, prev.version || 0) + 1;
  return {
    ...next,
    version: nextVersion,
    stateVersion: nextVersion,
    updatedAt: nowMs,
    serverTimestamp: nowMs,
  };
}

/**
 * Initializes non-host clients (`/play`, `/display`) at version 0 so they
 * wait for Host's authoritative `STATE_SYNC` (`stateVersion >= 1`) rather
 * than hydrating stale data from `localStorage`.
 */
export function createUnhydratedClientState(base: KrampusGameState): KrampusGameState {
  const cloned = structuredClone(base);
  return {
    ...cloned,
    version: 0,
    stateVersion: 0,
    updatedAt: 0,
    serverTimestamp: 0,
  };
}

/**
 * Computes remaining countdown seconds locally from `timerEndAt` without broadcasting every second.
 */
export function computeSecondsLeft(
  timerEndAt: number | null | undefined,
  nowMs: number
): number {
  if (typeof timerEndAt !== 'number') {
    return 0;
  }
  return Math.max(0, Math.ceil((timerEndAt - nowMs) / 1000));
}

/**
 * Pure Host-side reducer that applies an incoming `PLAYER_ACTION` event.
 * Enforces idempotency via `processedActionIds` so retries never double-execute.
 */
export function applyPlayerAction(
  prev: KrampusGameState,
  event: PlayerActionEvent,
  hostNow: number
): {
  status: 'APPLIED' | 'DUPLICATE' | 'REJECTED';
  nextState: KrampusGameState;
  reason?: string;
} {
  if (!event || !event.teamId || !event.type) {
    return { status: 'REJECTED', nextState: prev, reason: 'INVALID_EVENT' };
  }

  if (event.actionId && (prev.processedActionIds || []).includes(event.actionId)) {
    return { status: 'DUPLICATE', nextState: prev };
  }

  const next = structuredClone(prev);
  next.submissions = next.submissions || {};
  next.buzzerQueue = next.buzzerQueue || [];

  const { type, teamId } = event;
  const payload = event.payload || {};

  if (
    ROUND_SCOPED_ACTIONS.has(type) &&
    event.roundId &&
    event.roundId !== next.round.id &&
    !(type === 'SUBMIT_ANSWER' && Boolean(payload.force))
  ) {
    return { status: 'REJECTED', nextState: prev, reason: 'STALE_ROUND_ID' };
  }

  let ok = false;
  let rejectReason = 'ACTION_REJECTED';

  switch (type) {
    case 'SUBMIT_ANSWER': {
      const force = Boolean(payload.force);
      if (!force && next.round.status !== 'ACTIVE') {
        rejectReason = 'ROUND_NOT_ACTIVE';
        break;
      }
      if (payload.value === undefined) {
        rejectReason = 'MISSING_VALUE';
        break;
      }
      const elapsedMs = next.round.timerStartedAt
        ? Math.max(0, hostNow - next.round.timerStartedAt)
        : 0;
      next.submissions[teamId] = {
        teamId,
        value: payload.value as string | number,
        secondaryValue:
          typeof payload.secondaryValue === 'string' ? payload.secondaryValue : undefined,
        submittedAt: hostNow,
        elapsedMs,
        locked: true,
      };
      ok = true;
      break;
    }

    case 'CLEAR_TEAM_SUBMISSION': {
      delete next.submissions[teamId];
      next.buzzerQueue = (next.buzzerQueue || [])
        .filter((b) => b.teamId !== teamId)
        .map((b, idx) => ({ ...b, rank: idx + 1 }));
      if (next.round.chronoFastFingerClaims) {
        const claims = { ...next.round.chronoFastFingerClaims };
        for (const [y, owner] of Object.entries(claims)) {
          if (owner === teamId) delete claims[y];
        }
        next.round.chronoFastFingerClaims = claims;
      }
      if (next.round.chronoTrapsPlaced && next.round.chronoTrapsPlaced[teamId]) {
        const traps = { ...next.round.chronoTrapsPlaced };
        delete traps[teamId];
        next.round.chronoTrapsPlaced = traps;
      }
      ok = true;
      break;
    }

    case 'REGISTER_TEAM': {
      const currentTeam = next.teams?.[teamId];
      if (!currentTeam) {
        rejectReason = 'TEAM_NOT_FOUND';
        break;
      }
      const incomingName = typeof payload.name === 'string' ? payload.name.trim() : '';
      const incomingIcon = typeof payload.icon === 'string' ? payload.icon : '';
      next.teams[teamId] = {
        ...currentTeam,
        name: incomingName || currentTeam.name,
        icon: incomingIcon || currentTeam.icon,
        motto: payload.motto !== undefined ? String(payload.motto) : currentTeam.motto,
        roster: Array.isArray(payload.roster)
          ? (payload.roster as string[])
          : currentTeam.roster,
        isRegistered: true,
      };
      ok = true;
      break;
    }

    case 'PRESS_BUZZER': {
      const force = Boolean(payload.force);
      if (!force && next.round.status !== 'ACTIVE') {
        rejectReason = 'ROUND_NOT_ACTIVE';
        break;
      }
      if (next.buzzerQueue.some((b) => b.teamId === teamId)) {
        rejectReason = 'ALREADY_BUZZED';
        break;
      }
      const firstTime = next.buzzerQueue.length > 0 ? next.buzzerQueue[0].pressedAt : hostNow;
      const elapsedFromStartMs = next.round.timerStartedAt
        ? Math.max(0, hostNow - next.round.timerStartedAt)
        : 0;
      next.buzzerQueue.push({
        teamId,
        pressedAt: hostNow,
        deltaMs: Math.max(0, hostNow - firstTime),
        elapsedFromStartMs,
        rank: next.buzzerQueue.length + 1,
      });
      ok = true;
      break;
    }

    case 'BAILOUT_SHIELD': {
      ok = applyBailoutToState(next, teamId, hostNow);
      break;
    }

    case 'SNAKE_PICK': {
      const doorKey = String(payload.doorKey || '');
      ok = payload.force
        ? applyAdminSnakePickOverride(next, teamId, doorKey, hostNow)
        : applySnakePickToState(next, teamId, doorKey, hostNow);
      break;
    }

    case 'PLACE_CHRONO_TRAPS': {
      ok = applyChronoTrapsToState(
        next,
        teamId,
        (payload.allocations as Partial<Record<TeamId, number>>) || {},
        hostNow,
        Boolean(payload.force)
      );
      break;
    }

    case 'CLAIM_CHRONO_YEAR': {
      ok = applyChronoClaimToState(
        next,
        teamId,
        Number(payload.year),
        hostNow,
        Boolean(payload.force)
      );
      break;
    }

    case 'SELECT_TOY_DATASET': {
      ok = applyToyDatasetSelection(
        next,
        teamId,
        String(payload.datasetId || ''),
        hostNow,
        Boolean(payload.force)
      );
      break;
    }

    case 'TOY_SHUFFLE': {
      ok = applyToyFactoryShuffle(next, teamId, hostNow, Boolean(payload.force));
      break;
    }

    case 'LMS_SOUL_SACRIFICE': {
      ok = applyLmsSoulSacrifice(next, teamId, hostNow);
      break;
    }

    case 'LMS_MISERY_PULL': {
      ok = applyLmsMiseryPull(next, teamId, payload.targetTeamId as TeamId, hostNow);
      break;
    }

    case 'LMS_BUY_ITEM': {
      ok = applyLmsBuyItem(
        next,
        teamId,
        payload.itemId as LastManShopItemId,
        payload.targetTeamId as TeamId | undefined,
        hostNow
      );
      break;
    }

    case 'LMS_MINIGAME_ACTION': {
      ok = applyLmsMinigameAction(
        next,
        teamId,
        payload as Parameters<typeof applyLmsMinigameAction>[2]
      );
      break;
    }

    case 'LMS_USE_JETPACK': {
      ok = applyLmsUseJetpack(next, teamId, hostNow);
      break;
    }
  }

  if (!ok) {
    return { status: 'REJECTED', nextState: prev, reason: rejectReason };
  }

  if (event.actionId) {
    next.processedActionIds = [event.actionId, ...(next.processedActionIds || [])].slice(
      0,
      100
    );
  }

  return { status: 'APPLIED', nextState: next };
}

/**
 * Checks whether an in-flight `/play` pending action has been confirmed by an incoming Host `STATE_SYNC`.
 */
export function isPendingActionConfirmed(
  pending: PendingPlayerAction,
  state: KrampusGameState
): boolean {
  if (pending.actionId && state.processedActionIds?.includes(pending.actionId)) {
    return true;
  }

  if (pending.roundId && pending.roundId === state.round.id) {
    if (
      pending.type === 'SUBMIT_ANSWER' ||
      pending.type === 'PLACE_CHRONO_TRAPS' ||
      pending.type === 'CLAIM_CHRONO_YEAR'
    ) {
      return Boolean(state.submissions[pending.teamId]);
    }
    if (pending.type === 'PRESS_BUZZER') {
      return state.buzzerQueue.some((b) => b.teamId === pending.teamId);
    }
  }

  return false;
}

/**
 * Determines whether an in-flight round-scoped action is now stale (round switched or locked)
 * and should be cancelled instead of retried.
 */
export function shouldCancelPendingAction(
  pending: PendingPlayerAction,
  state: KrampusGameState
): boolean {
  if (!ROUND_SCOPED_ACTIONS.has(pending.type)) {
    return false;
  }

  if (pending.roundId && state.round.id !== pending.roundId) {
    return true;
  }

  if (pending.type === 'SUBMIT_ANSWER' && pending.payload?.force === true) {
    return false;
  }

  if (state.round.status !== 'ACTIVE') {
    return true;
  }

  return false;
}
