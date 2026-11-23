import {
  ChoiceOption,
  ClientRole,
  CoinTransaction,
  KrampusGameState,
  LastManPart1Question,
  LastManPart2Question,
  LastManShopItemId,
  PendingPlayerAction,
  PlayerActionEvent,
  RoundConfig,
  TeamId,
  ToyFactoryDataset,
} from '../types/game';
import {
  createRoundFromPreset,
  DEFAULT_LAST_MAN_PART1_QUESTIONS,
  DEFAULT_LAST_MAN_PART2_QUESTIONS,
  DEFAULT_PRESETS,
  DEFAULT_TOY_FACTORY_DATASETS,
  INITIAL_GAME_STATE,
  INITIAL_TEAMS,
  TEAM_ORDER,
} from '../data/initialData';
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

// ==========================================
// Realtime Egress Optimization: Dehydrate / Rehydrate
// ==========================================

export const SYNC_BACKOFF_DELAYS_MS = [3000, 6000, 12000] as const;
export const HOST_REQUEST_STATE_THROTTLE_MS = 2000;
export const HOST_ECONOMY_DEBOUNCE_MS = 180;
export const SYNC_MAX_TRANSACTIONS = 10;
export const SYNC_MAX_KILL_FEED = 10;
export const SYNC_MAX_PROCESSED_ACTION_IDS = 12;

export type CompactTransaction = Omit<CoinTransaction, 'prevBalances' | 'prevShields'>;

export interface CompactRoundConfig extends Omit<RoundConfig, 'title' | 'subtitle' | 'questionText' | 'choices'> {
  title?: string;
  subtitle?: string;
  questionText?: string;
  choices?: ChoiceOption[];
  /** When `choices` matches the preset's static choices, only opened door keys are sent. */
  openedDoorKeys?: string[];
}

export interface CompactSyncState
  extends Omit<
    KrampusGameState,
    | 'presets'
    | 'toyFactoryDatasets'
    | 'lastManPart1Questions'
    | 'lastManPart2Questions'
    | 'transactions'
    | 'round'
  > {
  round: CompactRoundConfig;
  transactions: CompactTransaction[];
  /** Only included if Host actually edited/added Toy Factory datasets vs initialData.ts */
  toyFactoryDatasetOverrides?: ToyFactoryDataset[];
  /** Only included if Host actually edited/added Game 4 Part 1 questions vs initialData.ts */
  lastManPart1QuestionOverrides?: LastManPart1Question[];
  /** Only included if Host actually edited/added Game 4 Part 2 questions vs initialData.ts */
  lastManPart2QuestionOverrides?: LastManPart2Question[];
}

const DEFAULT_PRESET_BY_ID = new Map(DEFAULT_PRESETS.map((p) => [p.id, p]));
const DEFAULT_TOY_DATASET_JSON_BY_ID = new Map(
  DEFAULT_TOY_FACTORY_DATASETS.map((d) => [d.id, JSON.stringify(d)])
);
const DEFAULT_LMS_P1_JSON_BY_ID = new Map(
  DEFAULT_LAST_MAN_PART1_QUESTIONS.map((q) => [q.id, JSON.stringify(q)])
);
const DEFAULT_LMS_P2_JSON_BY_ID = new Map(
  DEFAULT_LAST_MAN_PART2_QUESTIONS.map((q) => [q.id, JSON.stringify(q)])
);

function choicesMatchPresetStatic(
  currentChoices: ChoiceOption[] | undefined,
  presetChoices: ChoiceOption[] | undefined
): boolean {
  if (!currentChoices || !presetChoices) return false;
  if (currentChoices.length !== presetChoices.length) return false;
  for (let i = 0; i < currentChoices.length; i++) {
    const a = currentChoices[i];
    const b = presetChoices[i];
    if (
      a.key !== b.key ||
      a.label !== b.label ||
      a.rank !== b.rank ||
      a.votes !== b.votes ||
      Boolean(a.isCorrect) !== Boolean(b.isCorrect) ||
      Boolean(a.isTrap) !== Boolean(b.isTrap)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Strips all static/preset data already present in `src/data/initialData.ts`
 * and caps unbounded arrays (`transactions`, `killFeed`, `processedActionIds`)
 * before broadcasting `STATE_SYNC` over Supabase Realtime.
 *
 * Reduces payload size from ~35-50 KB down to ~1.5-2.5 KB (90%+ egress reduction).
 */
export function stripStaticDataForSync(state: KrampusGameState): CompactSyncState {
  // 1. Diff custom-edited datasets/question banks against defaults (omit if unchanged)
  const toyFactoryDatasetOverrides = (state.toyFactoryDatasets || []).filter(
    (d) => DEFAULT_TOY_DATASET_JSON_BY_ID.get(d.id) !== JSON.stringify(d)
  );
  const lastManPart1QuestionOverrides = (state.lastManPart1Questions || []).filter(
    (q) => DEFAULT_LMS_P1_JSON_BY_ID.get(q.id) !== JSON.stringify(q)
  );
  const lastManPart2QuestionOverrides = (state.lastManPart2Questions || []).filter(
    (q) => DEFAULT_LMS_P2_JSON_BY_ID.get(q.id) !== JSON.stringify(q)
  );

  // 2. Compact round: strip static preset strings & choices if unchanged from DEFAULT_PRESETS
  const preset = state.round.presetId ? DEFAULT_PRESET_BY_ID.get(state.round.presetId) : undefined;
  const compactRound: CompactRoundConfig = {
    ...state.round,
    ...(state.round.lastMan
      ? {
          lastMan: {
            ...state.round.lastMan,
            killFeed: (state.round.lastMan.killFeed || []).slice(0, SYNC_MAX_KILL_FEED),
          },
        }
      : {}),
  };

  if (preset) {
    if (compactRound.title === preset.title) delete compactRound.title;
    if (compactRound.subtitle === preset.subtitle) delete compactRound.subtitle;
    if (compactRound.questionText === preset.questionText) delete compactRound.questionText;
    if (compactRound.quixortRule === preset.quixortRule) delete compactRound.quixortRule;
    if (
      compactRound.quixortItems &&
      preset.quixortItems &&
      JSON.stringify(compactRound.quixortItems) === JSON.stringify(preset.quixortItems)
    ) {
      delete compactRound.quixortItems;
    }
    if (choicesMatchPresetStatic(state.round.choices, preset.choices)) {
      const openedDoorKeys = state.round.choices.filter((c) => c.isOpened).map((c) => c.key);
      delete compactRound.choices;
      if (openedDoorKeys.length > 0) {
        compactRound.openedDoorKeys = openedDoorKeys;
      }
    }
  }

  // 3. Cap transactions (latest 10) and drop Host-only undo snapshots (prevBalances/prevShields)
  const compactTransactions: CompactTransaction[] = (state.transactions || [])
    .slice(0, SYNC_MAX_TRANSACTIONS)
    .map(({ id, timestamp, teamId, delta, reason }) => ({
      id,
      timestamp,
      teamId,
      delta,
      reason,
    }));

  // 4. Cap processedActionIds (latest 12) for /play pending-action confirmation
  const compactProcessedActionIds = (state.processedActionIds || []).slice(
    0,
    SYNC_MAX_PROCESSED_ACTION_IDS
  );

  const compact: CompactSyncState = {
    version: state.version,
    stateVersion: state.stateVersion,
    updatedAt: state.updatedAt,
    serverTimestamp: state.serverTimestamp,
    roomCode: state.roomCode,
    ...(state.roomLocked ? { roomLocked: state.roomLocked } : {}),
    ...(state.clearedStages && state.clearedStages.length > 0
      ? { clearedStages: state.clearedStages }
      : {}),
    soundEnabled: state.soundEnabled,
    showLeaderboardOverlay: state.showLeaderboardOverlay,
    ...(state.showQrOverlay ? { showQrOverlay: state.showQrOverlay } : {}),
    krampusAlertMessage: state.krampusAlertMessage,
    teams: state.teams,
    round: compactRound,
    submissions: state.submissions,
    buzzerQueue: state.buzzerQueue,
    transactions: compactTransactions,
    ...(compactProcessedActionIds.length > 0
      ? { processedActionIds: compactProcessedActionIds }
      : {}),
    ...(toyFactoryDatasetOverrides.length > 0 ? { toyFactoryDatasetOverrides } : {}),
    ...(lastManPart1QuestionOverrides.length > 0 ? { lastManPart1QuestionOverrides } : {}),
    ...(lastManPart2QuestionOverrides.length > 0 ? { lastManPart2QuestionOverrides } : {}),
  };

  return compact;
}

function mergeById<T extends { id: string }>(defaults: T[], overrides?: T[]): T[] {
  if (!overrides || overrides.length === 0) {
    return defaults;
  }
  const overrideMap = new Map(overrides.map((item) => [item.id, item]));
  const merged = defaults.map((item) => overrideMap.get(item.id) || item);
  for (const ov of overrides) {
    if (!defaults.some((d) => d.id === ov.id)) {
      merged.push(ov);
    }
  }
  return merged;
}

/**
 * Rehydrates a compact `STATE_SYNC` payload (or a legacy full state) by merging
 * local static presets/datasets/questions from `src/data/initialData.ts` with
 * any custom Host overrides and dynamic state.
 */
export function rehydrateStateFromLocal(
  incoming: CompactSyncState | KrampusGameState
): KrampusGameState {
  const raw = incoming as Partial<CompactSyncState & KrampusGameState>;

  // 1. Rehydrate teams
  const nextTeams = { ...INITIAL_TEAMS };
  for (const tid of TEAM_ORDER) {
    const t = raw.teams?.[tid];
    if (t) {
      const shields =
        typeof t.shields === 'number'
          ? t.shields
          : typeof t.candles === 'number'
          ? t.candles
          : 3;
      nextTeams[tid] = {
        ...INITIAL_TEAMS[tid],
        ...t,
        shields,
        candles: shields,
      };
    }
  }

  // 2. Rehydrate round from preset defaults if presetId is present
  const rawRound = (raw.round || {}) as Partial<CompactRoundConfig & RoundConfig>;
  const matchedPreset = rawRound.presetId ? DEFAULT_PRESET_BY_ID.get(rawRound.presetId) : undefined;
  const baseRound = createRoundFromPreset(matchedPreset || DEFAULT_PRESETS[0]);

  const openedSet = new Set(rawRound.openedDoorKeys || []);
  const rehydratedChoices: ChoiceOption[] = Array.isArray(rawRound.choices)
    ? rawRound.choices
    : matchedPreset?.choices
    ? matchedPreset.choices.map((c) => ({
        ...c,
        isOpened: openedSet.has(c.key) || Boolean(c.isOpened),
      }))
    : baseRound.choices;

  const { openedDoorKeys: _omitOpenedKeys, ...restRound } = rawRound;
  void _omitOpenedKeys;

  const mergedDuration = restRound.durationSeconds ?? baseRound.durationSeconds;
  const derivedTimerEndAt =
    typeof restRound.timerEndAt === 'number'
      ? restRound.timerEndAt
      : restRound.status === 'ACTIVE' && typeof restRound.timerStartedAt === 'number'
      ? restRound.timerStartedAt + mergedDuration * 1000
      : null;

  // 3. Rehydrate datasets & question banks (support both compact overrides & legacy full arrays)
  const toyFactoryDatasets = raw.toyFactoryDatasetOverrides
    ? mergeById(DEFAULT_TOY_FACTORY_DATASETS, raw.toyFactoryDatasetOverrides)
    : raw.toyFactoryDatasets && raw.toyFactoryDatasets.length > 0
    ? raw.toyFactoryDatasets
    : DEFAULT_TOY_FACTORY_DATASETS;

  const lastManPart1Questions = raw.lastManPart1QuestionOverrides
    ? mergeById(DEFAULT_LAST_MAN_PART1_QUESTIONS, raw.lastManPart1QuestionOverrides)
    : raw.lastManPart1Questions && raw.lastManPart1Questions.length > 0
    ? raw.lastManPart1Questions
    : DEFAULT_LAST_MAN_PART1_QUESTIONS;

  const lastManPart2Questions = raw.lastManPart2QuestionOverrides
    ? mergeById(DEFAULT_LAST_MAN_PART2_QUESTIONS, raw.lastManPart2QuestionOverrides)
    : raw.lastManPart2Questions && raw.lastManPart2Questions.length > 0
    ? raw.lastManPart2Questions
    : DEFAULT_LAST_MAN_PART2_QUESTIONS;

  // 4. Rehydrate transactions (fill empty prevBalances for type safety on non-host clients)
  const emptyBalances: Record<TeamId, number> = {
    team1: 0,
    team2: 0,
    team3: 0,
    team4: 0,
  };
  const transactions: CoinTransaction[] = (raw.transactions || []).map((tx) => ({
    ...tx,
    prevBalances: (tx as CoinTransaction).prevBalances || emptyBalances,
  }));

  const stateVersion =
    typeof raw.stateVersion === 'number'
      ? raw.stateVersion
      : typeof raw.version === 'number'
      ? raw.version
      : 1;
  const updatedAt =
    typeof raw.updatedAt === 'number'
      ? raw.updatedAt
      : typeof raw.serverTimestamp === 'number'
      ? raw.serverTimestamp
      : Date.now();

  return {
    ...INITIAL_GAME_STATE,
    version: stateVersion,
    stateVersion,
    updatedAt,
    serverTimestamp: updatedAt,
    roomCode: raw.roomCode || INITIAL_GAME_STATE.roomCode,
    roomLocked: Boolean(raw.roomLocked),
    clearedStages: raw.clearedStages || [],
    soundEnabled: raw.soundEnabled ?? INITIAL_GAME_STATE.soundEnabled,
    showLeaderboardOverlay: Boolean(raw.showLeaderboardOverlay),
    showQrOverlay: Boolean(raw.showQrOverlay),
    krampusAlertMessage: raw.krampusAlertMessage ?? null,
    teams: nextTeams,
    submissions: raw.submissions || {},
    buzzerQueue: raw.buzzerQueue || [],
    transactions,
    presets: DEFAULT_PRESETS,
    toyFactoryDatasets,
    lastManPart1Questions,
    lastManPart2Questions,
    processedActionIds: raw.processedActionIds || [],
    round: {
      ...baseRound,
      ...restRound,
      title: restRound.title ?? baseRound.title,
      subtitle: restRound.subtitle ?? baseRound.subtitle,
      questionText: restRound.questionText ?? baseRound.questionText,
      choices: rehydratedChoices,
      timerEndAt: derivedTimerEndAt,
      eightDoorsSubRound: restRound.eightDoorsSubRound || 'SUB1_SURVIVAL',
      auctionIteration: restRound.auctionIteration || 1,
    },
  };
}
