import { describe, expect, it } from 'vitest';
import { createRoundFromPreset, DEFAULT_PRESETS, INITIAL_GAME_STATE } from '../data/initialData';
import { buildSnakeDraftOrder } from '../logic/doorsLogic';
import {
  applyPlayerAction,
  computeSecondsLeft,
  createUnhydratedClientState,
  isPendingActionConfirmed,
  resolveClientRole,
  shouldAcceptIncomingState,
  shouldCancelPendingAction,
  stampNextState,
} from '../logic/syncLogic';
import { KrampusGameState, PendingPlayerAction, PlayerActionEvent } from '../types/game';

function makeActiveState(): KrampusGameState {
  const state = structuredClone(INITIAL_GAME_STATE);
  state.stateVersion = 5;
  state.version = 5;
  state.round.id = 'round-live-1';
  state.round.status = 'ACTIVE';
  state.round.timerStartedAt = 100_000;
  state.round.durationSeconds = 30;
  state.round.timerEndAt = 130_000;
  return state;
}

describe('Suite 8: Host-Authoritative Realtime Sync & Monotonic Versioning', () => {
  it('resolveClientRole distinguishes HOST, DISPLAY, PLAYER, and HOME across pathname and hash routes', () => {
    expect(resolveClientRole('/admin')).toBe('HOST');
    expect(resolveClientRole('/host')).toBe('HOST');
    expect(resolveClientRole('/display')).toBe('DISPLAY');
    expect(resolveClientRole('/projector')).toBe('DISPLAY');
    expect(resolveClientRole('/play')).toBe('PLAYER');
    expect(resolveClientRole('/controller')).toBe('PLAYER');
    expect(resolveClientRole('/')).toBe('HOME');
    expect(resolveClientRole('/', '#/admin')).toBe('HOST');
    expect(resolveClientRole('/', '#/play?team=1')).toBe('PLAYER');
    expect(resolveClientRole('/', '#/display')).toBe('DISPLAY');
  });

  it('shouldAcceptIncomingState strictly enforces monotonic stateVersion and rejects stale/equal packets', () => {
    const client = createUnhydratedClientState(INITIAL_GAME_STATE);
    expect(client.stateVersion).toBe(0);

    const v1 = stampNextState({ ...INITIAL_GAME_STATE, stateVersion: 0, version: 0 }, INITIAL_GAME_STATE, 1000);
    expect(v1.stateVersion).toBe(1);
    expect(shouldAcceptIncomingState(client, v1)).toBe(true);

    const currentAt5 = makeActiveState();
    const stale3 = { ...structuredClone(currentAt5), stateVersion: 3, version: 3 };
    const equal5 = { ...structuredClone(currentAt5), stateVersion: 5, version: 5 };
    const newer6 = { ...structuredClone(currentAt5), stateVersion: 6, version: 6 };

    expect(shouldAcceptIncomingState(currentAt5, stale3)).toBe(false);
    expect(shouldAcceptIncomingState(currentAt5, equal5)).toBe(false);
    expect(shouldAcceptIncomingState(currentAt5, newer6)).toBe(true);
  });

  it('stampNextState increments stateVersion strictly even across full state resets', () => {
    const currentAt42 = makeActiveState();
    currentAt42.stateVersion = 42;
    currentAt42.version = 42;

    const resetTarget = structuredClone(INITIAL_GAME_STATE); // version 1 / stateVersion 1
    const stamped = stampNextState(currentAt42, resetTarget, 999_000);

    expect(stamped.stateVersion).toBe(43);
    expect(stamped.version).toBe(43);
    expect(stamped.updatedAt).toBe(999_000);
    expect(shouldAcceptIncomingState(currentAt42, stamped)).toBe(true);
  });

  it('computeSecondsLeft computes local countdown from timerEndAt cleanly without broadcasts', () => {
    const endAt = 100_000;
    expect(computeSecondsLeft(endAt, 90_000)).toBe(10);
    expect(computeSecondsLeft(endAt, 99_200)).toBe(1);
    expect(computeSecondsLeft(endAt, 100_000)).toBe(0);
    expect(computeSecondsLeft(endAt, 105_000)).toBe(0);
    expect(computeSecondsLeft(null, 90_000)).toBe(0);
    expect(computeSecondsLeft(undefined, 90_000)).toBe(0);
  });

  it('applyPlayerAction handles SUBMIT_ANSWER status/roundId guards and force override', () => {
    const state = makeActiveState();
    const event: PlayerActionEvent = {
      type: 'SUBMIT_ANSWER',
      teamId: 'team1',
      payload: { value: 'B' },
      clientTimestamp: 102_000,
      actionId: 'team1-SUBMIT_ANSWER-1',
      roundId: 'round-live-1',
    };

    const applied = applyPlayerAction(state, event, 102_500);
    expect(applied.status).toBe('APPLIED');
    expect(applied.nextState.submissions.team1?.value).toBe('B');
    expect(applied.nextState.submissions.team1?.elapsedMs).toBe(2_500);
    expect(applied.nextState.processedActionIds).toContain('team1-SUBMIT_ANSWER-1');

    // Original input state remains unmutated
    expect(state.submissions.team1).toBeUndefined();

    // Rejects stale roundId
    const staleRoundRes = applyPlayerAction(
      state,
      { ...event, actionId: 'team1-stale', roundId: 'old-round-0' },
      103_000
    );
    expect(staleRoundRes.status).toBe('REJECTED');
    expect(staleRoundRes.reason).toBe('STALE_ROUND_ID');

    // Rejects IDLE/LOCKED unless force=true
    const lockedState = makeActiveState();
    lockedState.round.status = 'LOCKED';
    expect(
      applyPlayerAction(lockedState, { ...event, actionId: 'team1-locked' }, 104_000).status
    ).toBe('REJECTED');

    const forced = applyPlayerAction(
      lockedState,
      { ...event, actionId: 'team1-forced', payload: { value: 'C', force: true } },
      104_000
    );
    expect(forced.status).toBe('APPLIED');
    expect(forced.nextState.submissions.team1?.value).toBe('C');
  });

  it('applyPlayerAction enforces strict idempotency on retries for BAILOUT_SHIELD and SNAKE_PICK', () => {
    const state = makeActiveState();
    state.teams.team1.shields = 0;
    state.teams.team1.candles = 0;
    state.teams.team1.coins = 1000;

    const bailoutEvent: PlayerActionEvent = {
      type: 'BAILOUT_SHIELD',
      teamId: 'team1',
      payload: {},
      clientTimestamp: 101_000,
      actionId: 'team1-BAILOUT_SHIELD-retry-1',
    };

    const first = applyPlayerAction(state, bailoutEvent, 101_000);
    expect(first.status).toBe('APPLIED');
    expect(first.nextState.teams.team1.coins).toBe(500);
    expect(first.nextState.teams.team1.shields).toBe(2);

    // Retried with the same actionId -> DUPLICATE, no second -500 coins deduction
    const retry = applyPlayerAction(first.nextState, bailoutEvent, 103_000);
    expect(retry.status).toBe('DUPLICATE');
    expect(retry.nextState.teams.team1.coins).toBe(500);
    expect(retry.nextState.teams.team1.shields).toBe(2);

    // SNAKE_PICK idempotency check
    const snakeState = makeActiveState();
    const preset = DEFAULT_PRESETS.find((p) => p.gameStage === 'POLL_MINE')!;
    snakeState.round = {
      ...createRoundFromPreset(preset),
      id: 'round-snake-1',
      status: 'ACTIVE',
      gameStage: 'POLL_MINE',
      eightDoorsSubRound: 'SUB1_SURVIVAL',
      choiceCount: 8,
      safeRankMin: 1,
      safeRankMax: 3,
      choices: [
        { key: 'A', label: 'A', rank: 1, isOpened: false },
        { key: 'B', label: 'B', rank: 2, isOpened: false },
        { key: 'C', label: 'C', rank: 3, isOpened: false },
        { key: 'D', label: 'D', rank: 4, isOpened: false },
        { key: 'E', label: 'E', rank: 5, isOpened: false },
        { key: 'F', label: 'F', rank: 6, isOpened: false },
        { key: 'G', label: 'G', rank: 7, isOpened: false },
        { key: 'H', label: 'H', rank: 8, isOpened: false },
      ],
      snakeDraftOrder: buildSnakeDraftOrder(snakeState.teams, false),
      snakeDraftIndex: 0,
      snakeDraftPicks: [],
    };
    const snakeEvent: PlayerActionEvent = {
      type: 'SNAKE_PICK',
      teamId: 'team1',
      payload: { doorKey: 'A' },
      clientTimestamp: 102_000,
      actionId: 'team1-SNAKE_PICK-1',
      roundId: 'round-snake-1',
    };
    const snake1 = applyPlayerAction(snakeState, snakeEvent, 102_000);
    expect(snake1.status).toBe('APPLIED');
    expect(snake1.nextState.teams.team1.coins).toBe(1300);

    const snakeRetry = applyPlayerAction(snake1.nextState, snakeEvent, 104_000);
    expect(snakeRetry.status).toBe('DUPLICATE');
    expect(snakeRetry.nextState.teams.team1.coins).toBe(1300);
  });

  it('sequential Host reduction of 4 simultaneous team submissions preserves all 4 answers without overwrites', () => {
    let hostState = makeActiveState();
    const events: PlayerActionEvent[] = [
      {
        type: 'SUBMIT_ANSWER',
        teamId: 'team1',
        payload: { value: 'A' },
        clientTimestamp: 101_000,
        actionId: 't1-sub',
        roundId: 'round-live-1',
      },
      {
        type: 'SUBMIT_ANSWER',
        teamId: 'team2',
        payload: { value: 'B' },
        clientTimestamp: 101_050,
        actionId: 't2-sub',
        roundId: 'round-live-1',
      },
      {
        type: 'SUBMIT_ANSWER',
        teamId: 'team3',
        payload: { value: 'C' },
        clientTimestamp: 101_100,
        actionId: 't3-sub',
        roundId: 'round-live-1',
      },
      {
        type: 'SUBMIT_ANSWER',
        teamId: 'team4',
        payload: { value: 'D' },
        clientTimestamp: 101_150,
        actionId: 't4-sub',
        roundId: 'round-live-1',
      },
    ];

    for (const ev of events) {
      const res = applyPlayerAction(hostState, ev, ev.clientTimestamp);
      expect(res.status).toBe('APPLIED');
      hostState = stampNextState(hostState, res.nextState, ev.clientTimestamp);
    }

    expect(hostState.stateVersion).toBe(9);
    expect(hostState.submissions.team1?.value).toBe('A');
    expect(hostState.submissions.team2?.value).toBe('B');
    expect(hostState.submissions.team3?.value).toBe('C');
    expect(hostState.submissions.team4?.value).toBe('D');
  });

  it('applyPlayerAction handles REGISTER_TEAM, PRESS_BUZZER, PLACE_CHRONO_TRAPS, and CLAIM_CHRONO_YEAR', () => {
    const base = makeActiveState();

    // REGISTER_TEAM
    const reg = applyPlayerAction(
      base,
      {
        type: 'REGISTER_TEAM',
        teamId: 'team2',
        payload: { name: 'ทีมป่วนคืนคริสต์มาส', icon: '🦌', motto: 'ลุย!', roster: ['เอ', 'บี'] },
        clientTimestamp: 100_500,
        actionId: 't2-reg',
      },
      100_500
    );
    expect(reg.status).toBe('APPLIED');
    expect(reg.nextState.teams.team2.name).toBe('ทีมป่วนคืนคริสต์มาส');
    expect(reg.nextState.teams.team2.isRegistered).toBe(true);

    // PRESS_BUZZER
    const buzz1 = applyPlayerAction(
      reg.nextState,
      {
        type: 'PRESS_BUZZER',
        teamId: 'team3',
        payload: {},
        clientTimestamp: 101_000,
        actionId: 't3-buzz',
        roundId: 'round-live-1',
      },
      101_000
    );
    expect(buzz1.status).toBe('APPLIED');
    expect(buzz1.nextState.buzzerQueue[0].teamId).toBe('team3');
    expect(buzz1.nextState.buzzerQueue[0].rank).toBe(1);

    // PLACE_CHRONO_TRAPS
    const trapState = makeActiveState();
    trapState.round.gameStage = 'TIMEJINX';
    trapState.round.chronoSubRound = 'CHRONO_SUB2_TRAP';
    trapState.round.chronoPhase = 'TRAP_PLACEMENT';
    trapState.round.chronoQuotas = { team1: 2, team2: 1, team3: 1, team4: 0 };
    const trapRes = applyPlayerAction(
      trapState,
      {
        type: 'PLACE_CHRONO_TRAPS',
        teamId: 'team1',
        payload: { allocations: { team2: 1, team3: 1 } },
        clientTimestamp: 102_000,
        actionId: 't1-trap',
        roundId: 'round-live-1',
      },
      102_000
    );
    expect(trapRes.status).toBe('APPLIED');
    expect(trapRes.nextState.round.chronoTrapsPlaced?.team1).toEqual({ team2: 1, team3: 1 });
    expect(trapRes.nextState.submissions.team1?.value).toBe(2);

    // CLAIM_CHRONO_YEAR
    const claimState = makeActiveState();
    claimState.round.gameStage = 'TIMEJINX';
    claimState.round.chronoSubRound = 'CHRONO_SUB3_FAST_FINGER';
    claimState.round.yearMin = 2012;
    claimState.round.yearMax = 2021;
    const claimRes = applyPlayerAction(
      claimState,
      {
        type: 'CLAIM_CHRONO_YEAR',
        teamId: 'team4',
        payload: { year: 2018 },
        clientTimestamp: 103_000,
        actionId: 't4-claim',
        roundId: 'round-live-1',
      },
      103_000
    );
    expect(claimRes.status).toBe('APPLIED');
    expect(claimRes.nextState.round.chronoFastFingerClaims?.['2018']).toBe('team4');
    expect(claimRes.nextState.submissions.team4?.value).toBe(2018);
  });

  it('isPendingActionConfirmed and shouldCancelPendingAction acknowledge and expire in-flight retries safely', () => {
    const state = makeActiveState();
    const pending: PendingPlayerAction = {
      type: 'SUBMIT_ANSWER',
      teamId: 'team1',
      payload: { value: 'A' },
      clientTimestamp: 101_000,
      actionId: 't1-act-123',
      roundId: 'round-live-1',
      attempts: 1,
      createdAt: 101_000,
      lastSentAt: 101_000,
    };

    expect(isPendingActionConfirmed(pending, state)).toBe(false);
    expect(shouldCancelPendingAction(pending, state)).toBe(false);

    // Confirmed via processedActionIds
    const ackedById = {
      ...structuredClone(state),
      processedActionIds: ['t1-act-123'],
    };
    expect(isPendingActionConfirmed(pending, ackedById)).toBe(true);

    // Confirmed via submissions matching same roundId
    const ackedBySub = structuredClone(state);
    ackedBySub.submissions.team1 = {
      teamId: 'team1',
      value: 'A',
      submittedAt: 101_200,
      elapsedMs: 1_200,
      locked: true,
    };
    expect(isPendingActionConfirmed(pending, ackedBySub)).toBe(true);

    // Cancelled when round locks or moves to a new roundId
    const locked = structuredClone(state);
    locked.round.status = 'LOCKED';
    expect(shouldCancelPendingAction(pending, locked)).toBe(true);

    const nextRound = structuredClone(state);
    nextRound.round.id = 'round-live-2';
    expect(shouldCancelPendingAction(pending, nextRound)).toBe(true);
  });
});
