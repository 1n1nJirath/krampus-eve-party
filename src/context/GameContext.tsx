import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import {
  ChoiceOption,
  ChronoSubRound,
  ClientRole,
  CoinTransaction,
  EightDoorsSubRound,
  GameStage,
  InputMode,
  KrampusGameState,
  LastManPart1Question,
  LastManPart2Question,
  LastManShopItemId,
  ModeDSubType,
  PendingPlayerAction,
  PlayerActionEvent,
  PlayerActionType,
  QuestionPreset,
  RoundConfig,
  Team,
  TeamId,
  ToyFactoryDataset,
} from '../types/game';
import {
  buildToyFactoryPairings,
  computeChronoRankings,
  createDefaultLastManRoundStock,
  createInitialLastManState,
  createRoundFromPreset,
  DEFAULT_LAST_MAN_PART1_QUESTIONS,
  DEFAULT_LAST_MAN_PART2_QUESTIONS,
  DEFAULT_PRESETS,
  DEFAULT_TOY_FACTORY_DATASETS,
  DOOR_LABELS,
  getActiveTeamIds,
  getSuggestedSafeRange,
  INITIAL_GAME_STATE,
  INITIAL_TEAMS,
  scoreChronoTeam,
  TEAM_ORDER,
} from '../data/initialData';
import { soundFX } from '../utils/sound';
import { buildSnakeDraftOrder } from '../logic/doorsLogic';
import {
  applyLmsMiseryPull,
  pushLmsFeed,
  resolveGhostPossessions,
} from '../logic/lastManLogic';
import {
  applyPlayerAction,
  createUnhydratedClientState,
  isPendingActionConfirmed,
  resolveClientRole,
  shouldAcceptIncomingState,
  shouldCancelPendingAction,
  stampNextState,
} from '../logic/syncLogic';
import { triggerHaptic } from '../utils/haptics';

const STORAGE_KEY = 'krampus_eve_state_v2';
const SUPABASE_CONFIG_KEY = 'krampus_supabase_config_v2';
const DEFAULT_SUPABASE_URL = 'https://evljkqbafnicjnwgezzr.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_H5-jncML0hgIl45te9k2dQ_2LbgCmQy';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
}

function normalizeGameState(raw: KrampusGameState): KrampusGameState {
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
  const baseRound = createRoundFromPreset(DEFAULT_PRESETS[0]);
  const rawRound = (raw.round || {}) as Partial<RoundConfig>;
  const mergedDuration = rawRound.durationSeconds ?? baseRound.durationSeconds;
  const derivedTimerEndAt =
    typeof rawRound.timerEndAt === 'number'
      ? rawRound.timerEndAt
      : rawRound.status === 'ACTIVE' && typeof rawRound.timerStartedAt === 'number'
      ? rawRound.timerStartedAt + mergedDuration * 1000
      : null;

  return {
    ...INITIAL_GAME_STATE,
    ...raw,
    version: stateVersion,
    stateVersion,
    updatedAt,
    serverTimestamp: updatedAt,
    teams: nextTeams,
    presets: DEFAULT_PRESETS,
    toyFactoryDatasets:
      raw.toyFactoryDatasets && raw.toyFactoryDatasets.length > 0
        ? raw.toyFactoryDatasets
        : DEFAULT_TOY_FACTORY_DATASETS,
    round: {
      ...baseRound,
      ...rawRound,
      timerEndAt: derivedTimerEndAt,
      eightDoorsSubRound: rawRound.eightDoorsSubRound || 'SUB1_SURVIVAL',
      auctionIteration: rawRound.auctionIteration || 1,
    },
  };
}

/**
 * Records an `actionId` in `state.processedActionIds` to prevent duplicate execution
 * when both `STATE_SYNC` and `TEAM_ACTION` arrive across tabs/channels.
 * Returns `false` if this exact `actionId` was already applied.
 */
export function markActionProcessed(state: KrampusGameState, actionId?: string): boolean {
  if (!actionId) return true;
  const list = state.processedActionIds || [];
  if (list.includes(actionId)) return false;
  state.processedActionIds = [actionId, ...list].slice(0, 60);
  return true;
}

/**
 * Pure helper to compute coin & shield rewards/penalties for a finished round.
 * Used both when Host clicks "Reveal!" (1-click auto-score) and "คำนวณเหรียญอัตโนมัติ".
 * Guards against double-application via `prev.round.rewardsApplied`.
 */
export function computeRoundScoring(
  prev: KrampusGameState,
  quixortOutcome?: 'PASS' | 'FAIL'
): { nextState: KrampusGameState; summary: string[] } {
  const summary: string[] = [];
  if (prev.round.rewardsApplied) {
    return { nextState: prev, summary };
  }

  const prevBalances: Record<TeamId, number> = {
    team1: prev.teams.team1.coins,
    team2: prev.teams.team2.coins,
    team3: prev.teams.team3.coins,
    team4: prev.teams.team4.coins,
  };
  const prevShields: Record<TeamId, number> = {
    team1: prev.teams.team1.shields,
    team2: prev.teams.team2.shields,
    team3: prev.teams.team3.shields,
    team4: prev.teams.team4.shields,
  };
  const nextTeams = structuredClone(prev.teams);
  const r = prev.round;
  const subs = prev.submissions;
  let nextChoices = [...r.choices];
  let lastOpenedDoorKey = r.lastOpenedDoorKey;

  // ============================================================
  // GAME 1: THE 8 DOORS OF KRAMPUS (3 SUB-ROUNDS)
  // ============================================================
  if (r.gameStage === 'POLL_MINE' && r.inputMode === 'MODE_A_CHOICE') {
    const subRound = r.eightDoorsSubRound || 'SUB1_SURVIVAL';

    if (subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT') {
      const picks = r.snakeDraftPicks || [];
      if (picks.length > 0) {
        for (const tid of TEAM_ORDER) {
          const teamPicks = picks.filter((p) => p.teamId === tid);
          if (teamPicks.length === 0) continue;
          const safeCount = teamPicks.filter((p) => p.isSafe).length;
          const wrongCount = teamPicks.length - safeCount;
          const earned = safeCount * 300;
          const doorsStr = teamPicks.map((p) => `${p.doorKey}(#${p.rank})`).join(', ');
          summary.push(
            `${nextTeams[tid].name}: เปิด ${doorsStr} • ได้ +${earned} ฿${
              wrongCount > 0 ? ` / เสีย -${wrongCount} 🛡️` : ''
            }`
          );
        }
      } else {
        summary.push('ด่านย่อย (Snake Draft): ยังไม่มีการเปิดประตู');
      }
    } else if (subRound === 'SUB2_DOOR_AND_BET') {
      const suggested = getSuggestedSafeRange(r.choiceCount, 'SUB2_DOOR_AND_BET');
      const safeMin = r.safeRankMin ?? suggested.min;
      const safeMax = r.safeRankMax ?? suggested.max;
      const winnerTid = r.auctionWinnerTeamId;
      const winnerSub = winnerTid ? subs[winnerTid] : undefined;
      const doorKey = String(winnerSub?.value || r.lastOpenedDoorKey || '');
      const door = nextChoices.find((c) => c.key === doorKey);
      const rank = door?.rank ?? r.choiceCount;
      const isSuccess = rank >= safeMin && rank <= safeMax;

      if (doorKey) {
        lastOpenedDoorKey = doorKey;
        nextChoices = nextChoices.map((c) =>
          c.key === doorKey ? { ...c, isOpened: true } : c
        );
      }

      if (winnerTid) {
        if (isSuccess) {
          if (r.cowardFreePick) {
            summary.push(
              `${nextTeams[winnerTid].name} (เปิดฟรี Coward's Tax): เปิดประตู ${doorKey} เจออันดับ #${rank} สำเร็จ! (ได้ 0 ฿ ตามกติกา Coward's Tax)`
            );
          } else {
            nextTeams[winnerTid].coins += 700;
            summary.push(
              `${nextTeams[winnerTid].name} (ผู้ชนะประมูล): เปิดประตู ${doorKey} เจออันดับ #${rank} สำเร็จ! (+700 ฿)`
            );
          }
        } else {
          const newShields = Math.max(0, nextTeams[winnerTid].shields - 1);
          nextTeams[winnerTid].shields = newShields;
          nextTeams[winnerTid].candles = newShields;
          summary.push(
            `${nextTeams[winnerTid].name} (ผู้ชนะประมูล): เปิดประตู ${doorKey} เจออันดับ #${rank} พลาด! (เสียเกราะเด็กดี -1 🛡️ เหลือ ${newShields} ดวง)`
          );
        }
      }

      for (const tid of TEAM_ORDER) {
        if (tid === winnerTid) continue;
        const sub = subs[tid];
        if (!sub) continue;
        const betChoice = String(sub.value || sub.secondaryValue || 'SAFE');
        const betSafe = betChoice === 'SAFE';
        const betCorrect = (betSafe && isSuccess) || (!betSafe && !isSuccess);

        if (betCorrect) {
          nextTeams[tid].coins += 200;
          summary.push(
            `${nextTeams[tid].name}: แทงข้างว่า "${betSafe ? 'รอด' : 'พัง'}" ถูกต้อง! (+200 ฿)`
          );
        } else {
          nextTeams[tid].coins -= 100;
          summary.push(
            `${nextTeams[tid].name}: แทงข้างว่า "${betSafe ? 'รอด' : 'พัง'}" ผิด! (-100 ฿ ไม่เสียเกราะ)`
          );
        }
      }
    } else if (subRound === 'SUB3_POLARITY') {
      nextChoices = nextChoices.map((c) => ({ ...c, isOpened: true }));
      const lastRank = r.choiceCount || 8;
      const door1Key = nextChoices.slice(0, lastRank).find((c) => c.rank === 1)?.key || 'A';
      const doorLastKey =
        nextChoices.slice(0, lastRank).find((c) => c.rank === lastRank)?.key ||
        DOOR_LABELS[lastRank - 1] ||
        'H';

      for (const tid of TEAM_ORDER) {
        const sub = subs[tid];
        if (!sub) continue;
        const pick1 = String(sub.value || '');
        const pickLast = String(sub.secondaryValue || '');
        const hit1 = pick1 === door1Key;
        const hitLast = pickLast === doorLastKey;
        const hits = (hit1 ? 1 : 0) + (hitLast ? 1 : 0);

        if (hits === 2) {
          nextTeams[tid].coins += 700;
          summary.push(
            `${nextTeams[tid].name}: ทายถูกทั้งอันดับ #1 (${pick1}) และ #${lastRank} (${pickLast})! รับ +700 ฿`
          );
        } else if (hits === 1) {
          nextTeams[tid].coins += 300;
          summary.push(
            `${nextTeams[tid].name}: ทายถูก 1 ประตู (${
              hit1 ? `#1=${pick1}` : `#${lastRank}=${pickLast}`
            }) (+300 ฿)`
          );
        } else {
          summary.push(
            `${nextTeams[tid].name}: ทายผิดทั้ง 2 ประตู (#1=${pick1}, #${lastRank}=${pickLast}) (0 ฿)`
          );
        }
      }
    }
  } else if (r.inputMode === 'MODE_A_CHOICE') {
    for (const tid of TEAM_ORDER) {
      const sub = subs[tid];
      if (!sub) continue;
      const choiceKey = String(sub.value);
      const choiceObj = r.choices.find((c) => c.key === choiceKey);
      const isCorrect = choiceObj?.isCorrect || r.correctChoices.includes(choiceKey);
      const isTrap = choiceObj?.isTrap || r.trapChoices.includes(choiceKey);

      if (isCorrect) {
        nextTeams[tid].coins += r.rewardCoins;
        summary.push(`${nextTeams[tid].name}: ตอบ ${choiceKey} ถูกต้อง (+${r.rewardCoins} เหรียญ)`);
      } else if (isTrap) {
        nextTeams[tid].coins -= r.penaltyCoins;
        if (r.gameStage === 'TRIVIA_MURDER') {
          nextTeams[tid].isInKillingFloor = true;
        }
        summary.push(`${nextTeams[tid].name}: ตอบผิดข้อ ${choiceKey} (-${r.penaltyCoins} เหรียญ)`);
      } else if (r.gameStage === 'TRIVIA_MURDER') {
        nextTeams[tid].isInKillingFloor = true;
        nextTeams[tid].coins -= r.penaltyCoins;
        summary.push(`${nextTeams[tid].name}: ตอบผิด (-${r.penaltyCoins} เหรียญ & ลงลานประหาร)`);
      }
    }
  } else if (r.inputMode === 'MODE_B_YEAR') {
    const resolvedYears: Partial<Record<TeamId, number>> = {};
    let maxDiff = 0;
    for (const tid of TEAM_ORDER) {
      const subVal = subs[tid]?.value;
      let year: number | undefined =
        subVal !== undefined && subVal !== '' && !Number.isNaN(Number(subVal))
          ? Number(subVal)
          : undefined;
      if (year === undefined && r.chronoFastFingerClaims) {
        const claimedEntry = Object.entries(r.chronoFastFingerClaims).find(
          ([, claimTid]) => claimTid === tid
        );
        if (claimedEntry) {
          year = Number(claimedEntry[0]);
        }
      }
      if (year === undefined) continue;
      resolvedYears[tid] = year;
      const d = Math.abs(year - r.targetYear);
      if (d > maxDiff) maxDiff = d;
    }

    for (const tid of TEAM_ORDER) {
      const year = resolvedYears[tid];
      if (year === undefined) continue;
      const res = scoreChronoTeam(r, tid, year, maxDiff);
      nextTeams[tid].coins += res.delta;
      const unitLabel = r.yearUnit === 'BE' ? 'พ.ศ.' : 'ค.ศ.';
      summary.push(`${nextTeams[tid].name}: ตอบ ${unitLabel} ${year} — ${res.label}`);
    }
  } else if (r.inputMode === 'MODE_C_BUZZER') {
    if (prev.buzzerQueue.length > 0) {
      const first = prev.buzzerQueue[0];
      nextTeams[first.teamId].coins += r.rewardCoins;
      summary.push(`${nextTeams[first.teamId].name}: กดกระดิ่งอันดับ 1 (+${r.rewardCoins} เหรียญ)`);
    }
  } else if (r.inputMode === 'MODE_D_SECRET') {
    if (r.modeDSubType === 'UNIQUE_NUMBER_1_10') {
      const counts: Record<string, number> = {};
      for (const tid of TEAM_ORDER) {
        const v = subs[tid]?.value;
        if (v !== undefined) {
          counts[String(v)] = (counts[String(v)] || 0) + 1;
        }
      }
      const uniqueEntries = TEAM_ORDER.filter((tid) => {
        const v = subs[tid]?.value;
        return v !== undefined && counts[String(v)] === 1;
      }).map((tid) => ({ tid, num: Number(subs[tid]!.value) }));

      uniqueEntries.sort((a, b) => (r.uniqueRule === 'HIGHEST' ? b.num - a.num : a.num - b.num));
      const winnerTid = uniqueEntries[0]?.tid;

      for (const tid of TEAM_ORDER) {
        const sub = subs[tid];
        if (!sub) continue;
        const isDup = counts[String(sub.value)] > 1;
        if (tid === winnerTid) {
          nextTeams[tid].coins += r.rewardCoins;
          nextTeams[tid].isInKillingFloor = false;
          summary.push(`${nextTeams[tid].name}: ชนะเลขไม่ซ้ำ (${sub.value}) (+${r.rewardCoins} เหรียญ)`);
        } else if (isDup) {
          nextTeams[tid].coins -= r.penaltyCoins;
          summary.push(`${nextTeams[tid].name}: เลขซ้ำ (${sub.value}) โดนลงทัณฑ์ (-${r.penaltyCoins} เหรียญ)`);
        }
      }
    } else if (r.modeDSubType === 'QUIXORT_BET' && quixortOutcome) {
      for (const tid of TEAM_ORDER) {
        if (tid === r.activeTeamId) {
          if (quixortOutcome === 'PASS') {
            nextTeams[tid].coins += r.rewardCoins;
            summary.push(`${nextTeams[tid].name} (ทีมลงสนาม): ภารกิจสำเร็จ (+${r.rewardCoins} เหรียญ)`);
          } else {
            nextTeams[tid].coins -= r.penaltyCoins;
            summary.push(`${nextTeams[tid].name} (ทีมลงสนาม): ภารกิจล้มเหลว (-${r.penaltyCoins} เหรียญ)`);
          }
          continue;
        }
        const sub = subs[tid];
        if (!sub) continue;
        const wager = Math.max(0, Number(sub.value) || 0);
        const prediction = sub.secondaryValue || 'PASS';
        if (prediction === quixortOutcome) {
          nextTeams[tid].coins += wager;
          summary.push(`${nextTeams[tid].name}: แทง ${prediction} ถูก! (+${wager} เหรียญ)`);
        } else {
          nextTeams[tid].coins -= wager;
          summary.push(`${nextTeams[tid].name}: แทง ${prediction} ผิด! (-${wager} เหรียญ)`);
        }
      }
    } else if (r.modeDSubType === 'COIN_WAGER') {
      let maxBribe = -1;
      let winnerTid: TeamId | null = null;
      for (const tid of TEAM_ORDER) {
        const w = Number(subs[tid]?.value ?? -1);
        if (w > maxBribe) {
          maxBribe = w;
          winnerTid = tid;
        }
      }
      for (const tid of TEAM_ORDER) {
        const sub = subs[tid];
        if (!sub) continue;
        const wager = Math.max(0, Number(sub.value) || 0);
        if (tid === winnerTid && wager > 0) {
          const netGain = r.rewardCoins - wager;
          nextTeams[tid].coins += netGain;
          nextTeams[tid].isInKillingFloor = false;
          summary.push(`${nextTeams[tid].name}: ประมูลชนะด้วย ${wager} เหรียญ (สุทธิ ${netGain >= 0 ? '+' : ''}${netGain} เหรียญ)`);
        } else {
          nextTeams[tid].coins -= wager;
          summary.push(`${nextTeams[tid].name}: เสียส่วยประมูล (-${wager} เหรียญ)`);
        }
      }
    } else if (r.modeDSubType === 'CURSED_CHALICE') {
      for (const tid of TEAM_ORDER) {
        const sub = subs[tid];
        if (!sub) continue;
        const key = String(sub.value);
        if (r.correctChoices.includes(key)) {
          nextTeams[tid].coins += r.rewardCoins;
          summary.push(`${nextTeams[tid].name}: เลือกกล่องปลอดภัย #${key} (+${r.rewardCoins} เหรียญ)`);
        } else {
          nextTeams[tid].coins -= r.penaltyCoins;
          summary.push(`${nextTeams[tid].name}: เลือกกล่องต้องสาป #${key} (-${r.penaltyCoins} เหรียญ)`);
        }
      }
    }
  }

  const tx: CoinTransaction = {
    id: `tx-auto-${Date.now()}`,
    timestamp: Date.now(),
    teamId: 'ALL',
    delta: 0,
    reason: `สรุปผลคะแนนรอบ: ${r.title}`,
    prevBalances,
    prevShields,
  };

  return {
    summary,
    nextState: {
      ...prev,
      teams: nextTeams,
      round: {
        ...prev.round,
        choices: nextChoices,
        lastOpenedDoorKey,
        status: 'REVEALED',
        rewardsApplied: true,
        timerStartedAt: null,
        timerEndAt: null,
        briefingOpen: false,
      },
      transactions: [tx, ...prev.transactions.slice(0, 49)],
    },
  };
}

interface GameContextValue {
  state: KrampusGameState;
  clientRole: ClientRole;
  isHost: boolean;
  pendingActions: Record<string, PendingPlayerAction>;
  actionSyncError: string | null;
  clearActionSyncError: () => void;
  lanIp: string;
  connectionMode: 'LOCAL_SERVER' | 'SUPABASE_CLOUD' | 'BROWSER_SYNC';
  isConnected: boolean;
  serverTimeOffset: number;
  getAuthoritativeNow: () => number;
  supabaseConfig: SupabaseConfig;
  saveSupabaseConfig: (cfg: SupabaseConfig) => void;

  // Team Controller Actions
  registerTeam: (teamId: TeamId, name: string, icon?: string, motto?: string, roster?: string[]) => void;
  submitTeamAnswer: (
    teamId: TeamId,
    value: string | number,
    secondaryValue?: string,
    options?: { force?: boolean }
  ) => void;
  clearTeamSubmission: (teamId: TeamId) => void;
  pressTeamBuzzer: (teamId: TeamId) => void;

  // GM Round Actions
  startMansionGame: () => void;
  loadPreset: (preset: QuestionPreset) => void;
  saveCustomPreset: (preset: QuestionPreset) => void;
  launchFreestyle: (params: {
    gameStage?: GameStage;
    inputMode: InputMode;
    modeDSubType?: ModeDSubType;
    choiceCount?: number;
    targetYear?: number;
    durationSeconds?: number;
    title?: string;
    questionText?: string;
  }) => void;
  updateRoundConfig: (patch: Partial<RoundConfig>) => void;
  updateChoiceOption: (key: string, patch: Partial<ChoiceOption>) => void;
  toggleDoorOpened: (key: string) => void;
  shuffleDoors: () => void;
  bailoutNiceShield: (teamId: TeamId) => void;
  submitSnakeDraftPick: (teamId: TeamId, doorKey: string) => void;
  finishEightDoorsGame: () => void;
  switchEightDoorsSubRound: (
    subRound: EightDoorsSubRound,
    options?: { auctionIteration?: 1 | 2; revealRemaining2To4?: boolean; loadPresetQuestion?: boolean }
  ) => void;
  // Game 2: THE CHRONO CRUSH
  switchChronoSubRound: (
    subRound: ChronoSubRound,
    options?: { presetId?: string; phase?: 'TRAP_PLACEMENT' | 'YEAR_GUESS' }
  ) => void;
  launchChronoTrapGuessPhase: () => void;
  placeChronoTraps: (teamId: TeamId, allocations: Partial<Record<TeamId, number>>) => void;
  claimChronoYear: (teamId: TeamId, year: number) => void;
  finishChronoGame: () => void;
  // Game 3: THE TOY FACTORY CHAOS
  startToyFactoryGame: () => void;
  selectToyFactoryDataset: (teamId: TeamId, datasetId: string) => void;
  startToyFactoryActionPhase: () => void;
  triggerToyFactoryShuffle: (spectatorTeamId: TeamId) => void;
  resumeToyFactoryFromBuffer: () => void;
  enterToyFactoryRevealPhase: () => void;
  judgeToyFactorySlot: (slotIndex: number, verdict: 'CORRECT' | 'WRONG') => void;
  revealToyFactoryMystery: (slotIndex: number) => void;
  finalizeToyFactoryRound: () => void;
  nextToyFactoryRound: () => void;
  updateToyFactoryDataset: (datasetId: string, patch: Partial<ToyFactoryDataset>) => void;
  finishToyFactoryGame: () => void;

  // Game 4: THE LAST MAN STANDING
  startLastManStandingGame: () => void;
  prepareLastManPart1Round: (roundNum?: number) => void;
  startLastManPart1Trivia: (roundNum?: number) => void;
  revealLastManPart1Trivia: () => void;
  autoResolveMiseryPull: () => void;
  enterLastManBlackMarket: () => void;
  enterLastManMinigame: () => void;
  rollKrampusDeathDice: () => void;
  revealLastManMinigame: () => void;
  advanceFromLastManMinigame: () => void;
  triggerLastManFreezeWarning: () => void;
  penalizeLastManCurseViolation: (teamId: TeamId) => void;
  startLastManPart2Escape: () => void;
  openLastManPart2Question: () => void;
  revealLastManPart2Question: () => void;
  nextLastManPart2Question: () => void;
  updateLastManPart1Question: (id: string, patch: Partial<LastManPart1Question>) => void;
  updateLastManPart2Question: (id: string, patch: Partial<LastManPart2Question>) => void;
  lmsSoulSacrifice: (teamId: TeamId) => void;
  lmsMiseryPull: (teamId: TeamId, targetTeamId: TeamId) => void;
  lmsBuyItem: (teamId: TeamId, itemId: LastManShopItemId, targetTeamId?: TeamId) => void;
  lmsMinigameAction: (
    teamId: TeamId,
    payload: {
      subType: 'POISON_SET' | 'CHALICE_PICK' | 'SPLIT_STEAL' | 'DARE_VOTE' | 'DEATH_DICE';
      chalices?: number[];
      chalice?: number;
      choice?: 'SPLIT' | 'STEAL';
      vote?: 'SPARE' | 'EXECUTE';
    }
  ) => void;
  lmsUseJetpack: (teamId: TeamId) => void;
  finishLastManStandingGame: (toFinale?: boolean) => void;
  resolveSubRound2Auction: (overrideWinnerTeamId?: TeamId) => {
    winnerTeamId: TeamId | null;
    winningBid: number;
    message: string;
  };
  startTimer: (customDurationSeconds?: number) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  lockRound: () => void;
  revealRound: () => { summary: string[] };
  resetRoundSubmissions: () => void;

  // GM Economy & Team Actions
  adjustCoins: (teamId: TeamId | 'ALL', delta: number, reason?: string) => void;
  setExactCoins: (teamId: TeamId, amount: number, reason?: string) => void;
  adjustShields: (teamId: TeamId, delta: number) => void;
  adjustLmsHearts: (teamId: TeamId, delta: number) => void;
  adjustCandles: (teamId: TeamId, delta: number) => void;
  toggleKillingFloor: (teamId: TeamId) => void;
  updateTeamProfile: (teamId: TeamId, patch: Partial<Team>) => void;
  undoLastTransaction: () => void;
  autoApplyRoundScoring: (quixortOutcome?: 'PASS' | 'FAIL') => { summary: string[] };
  setShowLeaderboardOverlay: (show: boolean) => void;
  setShowQrOverlay: (show: boolean) => void;
  setGameStage: (stage: GameStage, syncPreset?: boolean) => void;
  triggerKrampusAlert: (msg: string | null) => void;
  toggleSound: () => void;
  resetAllGameData: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const PLAYER_ACTION_RETRY_MS = 2000;
const PLAYER_ACTION_MAX_ATTEMPTS = 6;

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientRole, setClientRole] = useState<ClientRole>(() =>
    typeof window !== 'undefined'
      ? resolveClientRole(window.location.pathname, window.location.hash)
      : 'HOME'
  );
  const isHost = clientRole === 'HOST';
  const clientRoleRef = useRef<ClientRole>(clientRole);
  clientRoleRef.current = clientRole;

  useEffect(() => {
    const onRouteChange = () => {
      const nextRole = resolveClientRole(window.location.pathname, window.location.hash);
      clientRoleRef.current = nextRole;
      setClientRole(nextRole);
    };
    window.addEventListener('popstate', onRouteChange);
    window.addEventListener('hashchange', onRouteChange);
    return () => {
      window.removeEventListener('popstate', onRouteChange);
      window.removeEventListener('hashchange', onRouteChange);
    };
  }, []);

  const [state, setState] = useState<KrampusGameState>(() => {
    const initialRole =
      typeof window !== 'undefined'
        ? resolveClientRole(window.location.pathname, window.location.hash)
        : 'HOME';
    if (initialRole === 'HOST') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.teams && parsed.round) {
            return normalizeGameState(parsed);
          }
        }
      } catch {
        // ignore
      }
      return INITIAL_GAME_STATE;
    }
    return createUnhydratedClientState(INITIAL_GAME_STATE);
  });

  const [lanIp, setLanIp] = useState<string>('localhost');
  const [connectionMode, setConnectionMode] = useState<'LOCAL_SERVER' | 'SUPABASE_CLOUD' | 'BROWSER_SYNC'>('BROWSER_SYNC');
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const clockOffsetRef = useRef<number>(0);

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    try {
      const saved = localStorage.getItem(SUPABASE_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.url && parsed.anonKey) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return {
      url: envUrl,
      anonKey: envKey,
      enabled: Boolean(envUrl && envKey),
    };
  });

  const isSupabaseCloudActive = Boolean(
    supabaseConfig.enabled && supabaseConfig.url && supabaseConfig.anonKey
  );
  const isSupabaseCloudActiveRef = useRef<boolean>(isSupabaseCloudActive);
  isSupabaseCloudActiveRef.current = isSupabaseCloudActive;

  const connectionModeRef = useRef<'LOCAL_SERVER' | 'SUPABASE_CLOUD' | 'BROWSER_SYNC'>(
    connectionMode
  );
  connectionModeRef.current = connectionMode;

  const stateRef = useRef<KrampusGameState>(state);
  stateRef.current = state;

  const bcRef = useRef<BroadcastChannel | null>(null);
  const supaChannelRef = useRef<RealtimeChannel | null>(null);

  const getAuthoritativeNow = useCallback(() => {
    return Date.now() + clockOffsetRef.current;
  }, []);

  // Synchronous action locks to drop duplicate/rapid clicks before React re-renders
  const actionLocksRef = useRef<Map<string, number>>(new Map());
  const acquireActionLock = useCallback((key: string, cooldownMs = 450): boolean => {
    const now = Date.now();
    const last = actionLocksRef.current.get(key) || 0;
    if (now - last < cooldownMs) {
      return false;
    }
    actionLocksRef.current.set(key, now);
    return true;
  }, []);

  const createActionId = useCallback((actor: string, action: string, now: number) => {
    return `${actor}-${action}-${now}-${Math.random().toString(36).slice(2, 6)}`;
  }, []);

  // Sync sound setting
  useEffect(() => {
    soundFX.enabled = state.soundEnabled;
  }, [state.soundEnabled]);

  // Pending player action queue & automatic 2-second retry mechanism (/play -> /admin)
  const pendingActionsRef = useRef<Record<string, PendingPlayerAction>>({});
  const retryTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [pendingActions, setPendingActions] = useState<Record<string, PendingPlayerAction>>({});
  const [actionSyncError, setActionSyncError] = useState<string | null>(null);

  const clearActionSyncError = useCallback(() => setActionSyncError(null), []);

  const clearPendingAction = useCallback((actionId: string) => {
    const timer = retryTimersRef.current[actionId];
    if (timer) {
      clearTimeout(timer);
      delete retryTimersRef.current[actionId];
    }
    if (pendingActionsRef.current[actionId]) {
      delete pendingActionsRef.current[actionId];
      setPendingActions({ ...pendingActionsRef.current });
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(retryTimersRef.current).forEach((t) => clearTimeout(t));
      retryTimersRef.current = {};
    };
  }, []);

  // Host-only state broadcast helper (never called from /play or /display)
  const broadcastAuthoritativeState = useCallback((stamped: KrampusGameState) => {
    if (clientRoleRef.current !== 'HOST') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    } catch {
      // ignore quota errors
    }

    if (isSupabaseCloudActiveRef.current) {
      if (supaChannelRef.current) {
        supaChannelRef.current
          .send({
            type: 'broadcast',
            event: 'STATE_SYNC',
            payload: {
              state: stamped,
              serverNow: Date.now(),
              stateVersion: stamped.stateVersion,
              updatedAt: stamped.updatedAt,
            },
          })
          .catch(() => {});
      }
      return;
    }

    if (bcRef.current) {
      try {
        bcRef.current.postMessage({
          type: 'STATE_SYNC',
          state: stamped,
          serverNow: Date.now(),
        });
      } catch {
        // ignore
      }
    }

    if (connectionModeRef.current === 'LOCAL_SERVER') {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'FULL_STATE', state: stamped }),
      }).catch(() => {});
    }
  }, []);

  // Apply incoming STATE_SYNC on non-host clients with strict monotonic stateVersion guard
  const applyIncomingState = useCallback(
    (
      incoming: KrampusGameState,
      serverNow?: number,
      options?: { allowHostFromLocalServer?: boolean }
    ) => {
      if (clientRoleRef.current === 'HOST' && !options?.allowHostFromLocalServer) return;
      if (!incoming || !incoming.teams) return;

      const normalized = normalizeGameState(incoming);
      const prev = stateRef.current;

      if (!shouldAcceptIncomingState(prev, normalized)) {
        return;
      }

      if (typeof serverNow === 'number') {
        const diff = serverNow - Date.now();
        clockOffsetRef.current = Math.abs(diff) > 1500 ? diff : 0;
      }

      if (prev.round.status !== 'REVEALED' && normalized.round.status === 'REVEALED') {
        soundFX.playReveal();
      }
      if (normalized.buzzerQueue.length > prev.buzzerQueue.length) {
        soundFX.playBuzzer(normalized.buzzerQueue.length);
      } else if (
        Object.keys(normalized.submissions).length > Object.keys(prev.submissions).length
      ) {
        soundFX.playSubmit();
      }

      let pendingChanged = false;
      for (const [actionId, pending] of Object.entries(pendingActionsRef.current)) {
        const confirmed = isPendingActionConfirmed(pending, normalized);
        const cancelled = shouldCancelPendingAction(pending, normalized);
        if (confirmed || cancelled) {
          if (confirmed) {
            triggerHaptic('CONFIRM');
          }
          const timer = retryTimersRef.current[actionId];
          if (timer) {
            clearTimeout(timer);
            delete retryTimersRef.current[actionId];
          }
          delete pendingActionsRef.current[actionId];
          pendingChanged = true;
        }
      }

      stateRef.current = normalized;
      setState(normalized);
      if (pendingChanged) {
        setPendingActions({ ...pendingActionsRef.current });
      }
    },
    []
  );

  // Authoritative state commit (HOST only)
  const commitState = useCallback(
    (updater: (prev: KrampusGameState) => KrampusGameState | null) => {
      if (clientRoleRef.current !== 'HOST') return;
      const prev = stateRef.current;
      const next = updater(prev);
      if (!next || next === prev) return;
      const stamped = stampNextState(prev, next, Date.now());
      stateRef.current = stamped;
      setState(stamped);
      broadcastAuthoritativeState(stamped);
    },
    [broadcastAuthoritativeState]
  );

  const sendPlayerActionOverTransport = useCallback((event: PlayerActionEvent) => {
    if (isSupabaseCloudActiveRef.current) {
      if (supaChannelRef.current) {
        supaChannelRef.current
          .send({
            type: 'broadcast',
            event: 'PLAYER_ACTION',
            payload: event,
          })
          .catch(() => {});
      }
      return;
    }

    if (connectionModeRef.current === 'LOCAL_SERVER') {
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEAM_ACTION',
          teamId: event.teamId,
          action: event.type,
          actionId: event.actionId,
          payload: event.payload,
        }),
      }).catch(() => {});
      return;
    }

    if (bcRef.current) {
      try {
        bcRef.current.postMessage({ type: 'PLAYER_ACTION', payload: event });
      } catch {
        // ignore
      }
    }
  }, []);

  const scheduleRetry = useCallback(
    (actionId: string) => {
      const existingTimer = retryTimersRef.current[actionId];
      if (existingTimer) clearTimeout(existingTimer);

      retryTimersRef.current[actionId] = setTimeout(() => {
        const current = pendingActionsRef.current[actionId];
        if (!current) return;

        if (shouldCancelPendingAction(current, stateRef.current)) {
          clearPendingAction(actionId);
          return;
        }

        if (current.attempts >= PLAYER_ACTION_MAX_ATTEMPTS) {
          clearPendingAction(actionId);
          setActionSyncError(
            'ไม่สามารถส่งคำตอบถึง Host ได้ภายในเวลาที่กำหนด กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง'
          );
          triggerHaptic('ERROR');
          return;
        }

        const retried: PendingPlayerAction = {
          ...current,
          attempts: current.attempts + 1,
          lastSentAt: Date.now(),
        };
        pendingActionsRef.current[actionId] = retried;
        setPendingActions({ ...pendingActionsRef.current });

        sendPlayerActionOverTransport({
          type: retried.type,
          teamId: retried.teamId,
          payload: retried.payload,
          clientTimestamp: retried.clientTimestamp,
          actionId: retried.actionId,
          roundId: retried.roundId,
        });
        scheduleRetry(actionId);
      }, PLAYER_ACTION_RETRY_MS);
    },
    [clearPendingAction, sendPlayerActionOverTransport]
  );

  const dispatchPlayerAction = useCallback(
    (type: PlayerActionType, teamId: TeamId, payload: Record<string, unknown> = {}) => {
      const now = getAuthoritativeNow();

      if (clientRoleRef.current === 'HOST') {
        const actionId = createActionId(teamId, type, now);
        const event: PlayerActionEvent = {
          type,
          teamId,
          payload,
          clientTimestamp: now,
          actionId,
          roundId: stateRef.current.round.id,
        };
        commitState((prev) => {
          const res = applyPlayerAction(prev, event, now);
          return res.status === 'APPLIED' ? res.nextState : prev;
        });
        return;
      }

      const alreadyPending = Object.values(pendingActionsRef.current).some(
        (p) => p.teamId === teamId && p.type === type
      );
      if (alreadyPending) return;

      setActionSyncError(null);
      const actionId = createActionId(teamId, type, now);
      const event: PlayerActionEvent = {
        type,
        teamId,
        payload,
        clientTimestamp: now,
        actionId,
        roundId: stateRef.current.round.id,
      };

      const pending: PendingPlayerAction = {
        ...event,
        attempts: 1,
        createdAt: Date.now(),
        lastSentAt: Date.now(),
      };
      pendingActionsRef.current[actionId] = pending;
      setPendingActions({ ...pendingActionsRef.current });

      triggerHaptic(type === 'PRESS_BUZZER' ? 'BUZZER' : 'SUBMIT');
      sendPlayerActionOverTransport(event);
      scheduleRetry(actionId);
    },
    [commitState, createActionId, getAuthoritativeNow, scheduleRetry, sendPlayerActionOverTransport]
  );

  const emitActionRejected = useCallback((actionId: string, teamId: TeamId, reason?: string) => {
    const payload = { actionId, teamId, reason };
    if (isSupabaseCloudActiveRef.current) {
      supaChannelRef.current
        ?.send({ type: 'broadcast', event: 'ACTION_REJECTED', payload })
        .catch(() => {});
      return;
    }
    if (bcRef.current) {
      try {
        bcRef.current.postMessage({ type: 'ACTION_REJECTED', payload });
      } catch {
        // ignore
      }
    }
  }, []);

  const handleIncomingPlayerAction = useCallback(
    (event: PlayerActionEvent) => {
      if (clientRoleRef.current !== 'HOST') return;
      const hostNow = Date.now();
      const prev = stateRef.current;
      const res = applyPlayerAction(prev, event, hostNow);

      if (res.status === 'APPLIED') {
        if (event.type === 'PRESS_BUZZER') {
          soundFX.playBuzzer(res.nextState.buzzerQueue.length);
        } else {
          soundFX.playSubmit();
        }
        commitState(() => res.nextState);
      } else if (res.status === 'DUPLICATE') {
        broadcastAuthoritativeState(stateRef.current);
      } else {
        emitActionRejected(event.actionId, event.teamId, res.reason);
        broadcastAuthoritativeState(stateRef.current);
      }
    },
    [broadcastAuthoritativeState, commitState, emitActionRejected]
  );

  const handleActionRejected = useCallback(
    (payload?: { actionId?: string; teamId?: TeamId; reason?: string }) => {
      if (clientRoleRef.current === 'HOST') return;
      if (!payload?.actionId) return;
      clearPendingAction(payload.actionId);
    },
    [clearPendingAction]
  );

  const applyIncomingStateRef = useRef(applyIncomingState);
  applyIncomingStateRef.current = applyIncomingState;
  const handleIncomingPlayerActionRef = useRef(handleIncomingPlayerAction);
  handleIncomingPlayerActionRef.current = handleIncomingPlayerAction;
  const handleActionRejectedRef = useRef(handleActionRejected);
  handleActionRejectedRef.current = handleActionRejected;

  // 1. Setup BroadcastChannel + storage event listener (ONLY when Supabase Cloud Sync is OFF)
  useEffect(() => {
    if (isSupabaseCloudActive) {
      if (bcRef.current) {
        bcRef.current.close();
        bcRef.current = null;
      }
      return;
    }

    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('krampus_eve_sync');
      bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === 'STATE_SYNC' && msg.state) {
          applyIncomingStateRef.current(msg.state, msg.serverNow);
        } else if (msg.type === 'REQUEST_STATE') {
          if (clientRoleRef.current === 'HOST') {
            bc.postMessage({
              type: 'STATE_SYNC',
              state: stateRef.current,
              serverNow: Date.now(),
            });
          }
        } else if (msg.type === 'PLAYER_ACTION' && msg.payload) {
          if (clientRoleRef.current === 'HOST') {
            handleIncomingPlayerActionRef.current(msg.payload);
          }
        } else if (msg.type === 'ACTION_REJECTED' && msg.payload) {
          handleActionRejectedRef.current(msg.payload);
        }
      };
      bcRef.current = bc;
      if (clientRoleRef.current !== 'HOST') {
        bc.postMessage({ type: 'REQUEST_STATE' });
      }
    }

    const onStorage = (e: StorageEvent) => {
      if (isSupabaseCloudActiveRef.current) return;
      if (clientRoleRef.current === 'HOST') return;
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          applyIncomingStateRef.current(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      bcRef.current?.close();
      bcRef.current = null;
      window.removeEventListener('storage', onStorage);
    };
  }, [isSupabaseCloudActive]);

  // 2. Setup Local Server SSE (/api/events) ONLY when Supabase Cloud Sync is OFF
  useEffect(() => {
    if (isSupabaseCloudActive) {
      return;
    }

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connectSSE = () => {
      try {
        es = new EventSource('/api/events');
        es.onopen = () => {
          setIsConnected(true);
          if (!isSupabaseCloudActiveRef.current) {
            setConnectionMode('LOCAL_SERVER');
          }
        };
        es.onmessage = (event) => {
          if (isSupabaseCloudActiveRef.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.lanIp) {
              setLanIp(data.lanIp);
            }
            if (data.type === 'CONNECTED') {
              if (data.state && data.state.teams) {
                applyIncomingStateRef.current(data.state, data.serverNow, {
                  allowHostFromLocalServer: true,
                });
              } else if (clientRoleRef.current === 'HOST') {
                fetch('/api/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'FULL_STATE', state: stateRef.current }),
                }).catch(() => {});
              }
            } else if (data.type === 'STATE_SYNC' && data.state) {
              applyIncomingStateRef.current(data.state, data.serverNow, {
                allowHostFromLocalServer: true,
              });
            }
          } catch {
            // ignore
          }
        };
        es.onerror = () => {
          es?.close();
          retryTimer = setTimeout(connectSSE, 3000);
        };
      } catch {
        // Fallback to Browser Sync
      }
    };

    connectSSE();
    return () => {
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isSupabaseCloudActive]);

  // 3. Setup Supabase Realtime Broadcast (Host-Authoritative Single Source of Truth)
  useEffect(() => {
    if (!supabaseConfig.enabled || !supabaseConfig.url || !supabaseConfig.anonKey) {
      supaChannelRef.current = null;
      return;
    }

    let unmounted = false;
    let hydratePollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
      const channel = supabase.channel('krampus_eve_room', {
        config: { broadcast: { self: false } },
      });

      channel
        .on('broadcast', { event: 'STATE_SYNC' }, ({ payload }) => {
          if (payload?.state) {
            applyIncomingStateRef.current(payload.state, payload.serverNow);
          }
        })
        .on('broadcast', { event: 'REQUEST_STATE' }, () => {
          if (clientRoleRef.current !== 'HOST') return;
          const current = stateRef.current;
          channel
            .send({
              type: 'broadcast',
              event: 'STATE_SYNC',
              payload: {
                state: current,
                serverNow: Date.now(),
                stateVersion: current.stateVersion,
                updatedAt: current.updatedAt,
              },
            })
            .catch(() => {});
        })
        .on('broadcast', { event: 'PLAYER_ACTION' }, ({ payload }) => {
          if (clientRoleRef.current !== 'HOST' || !payload) return;
          handleIncomingPlayerActionRef.current(payload as PlayerActionEvent);
        })
        .on('broadcast', { event: 'TEAM_ACTION' }, ({ payload }) => {
          if (clientRoleRef.current !== 'HOST' || !payload) return;
          const legacyEvent: PlayerActionEvent = {
            type: payload.action as PlayerActionType,
            teamId: payload.teamId as TeamId,
            payload: (payload.data || payload.payload || {}) as Record<string, unknown>,
            clientTimestamp: Number(payload.clientNow || Date.now()),
            actionId: String(
              payload.actionId || `${payload.teamId}-${payload.action}-${Date.now()}`
            ),
          };
          handleIncomingPlayerActionRef.current(legacyEvent);
        })
        .on('broadcast', { event: 'ACTION_REJECTED' }, ({ payload }) => {
          if (clientRoleRef.current === 'HOST') return;
          handleActionRejectedRef.current(payload);
        })
        .subscribe((status) => {
          if (unmounted) return;
          if (status === 'SUBSCRIBED') {
            setConnectionMode('SUPABASE_CLOUD');
            setIsConnected(true);

            if (clientRoleRef.current === 'HOST') {
              const current = stateRef.current;
              channel
                .send({
                  type: 'broadcast',
                  event: 'STATE_SYNC',
                  payload: {
                    state: current,
                    serverNow: Date.now(),
                    stateVersion: current.stateVersion,
                    updatedAt: current.updatedAt,
                  },
                })
                .catch(() => {});
            } else {
              const sendRequest = () => {
                channel
                  .send({
                    type: 'broadcast',
                    event: 'REQUEST_STATE',
                    payload: { requestedAt: Date.now() },
                  })
                  .catch(() => {});
              };
              sendRequest();

              if (stateRef.current.stateVersion === 0) {
                hydratePollTimer = setInterval(() => {
                  if (stateRef.current.stateVersion > 0) {
                    if (hydratePollTimer) {
                      clearInterval(hydratePollTimer);
                      hydratePollTimer = null;
                    }
                    return;
                  }
                  sendRequest();
                }, 2500);
              }
            }
          }
        });

      supaChannelRef.current = channel;
      return () => {
        unmounted = true;
        if (hydratePollTimer) clearInterval(hydratePollTimer);
        supabase.removeChannel(channel);
        supaChannelRef.current = null;
      };
    } catch {
      // ignore invalid supabase url
    }
  }, [supabaseConfig.enabled, supabaseConfig.url, supabaseConfig.anonKey]);

  const saveSupabaseConfig = useCallback((cfg: SupabaseConfig) => {
    setSupabaseConfig(cfg);
    try {
      localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify(cfg));
    } catch {
      // ignore
    }
  }, []);

  // ==============================================================
  // TEAM CONTROLLER ACTIONS (Host-Authoritative Lightweight Events + 2s Retry)
  // ==============================================================

  const registerTeam = useCallback(
    (teamId: TeamId, name: string, icon?: string, motto?: string, roster?: string[]) => {
      soundFX.playSubmit();
      dispatchPlayerAction('REGISTER_TEAM', teamId, {
        name: name.trim(),
        icon,
        motto,
        roster,
      });
    },
    [dispatchPlayerAction]
  );

  const submitTeamAnswer = useCallback(
    (
      teamId: TeamId,
      value: string | number,
      secondaryValue?: string,
      options?: { force?: boolean }
    ) => {
      if (!options?.force && stateRef.current.round.status !== 'ACTIVE') return;
      soundFX.playSubmit();
      dispatchPlayerAction('SUBMIT_ANSWER', teamId, {
        value,
        secondaryValue,
        force: Boolean(options?.force),
      });
    },
    [dispatchPlayerAction]
  );

  const clearTeamSubmission = useCallback(
    (teamId: TeamId) => {
      commitState((prev) => {
        const nextSubs = { ...prev.submissions };
        delete nextSubs[teamId];
        return {
          ...prev,
          submissions: nextSubs,
        };
      });
    },
    [commitState]
  );

  const pressTeamBuzzer = useCallback(
    (teamId: TeamId) => {
      if (stateRef.current.round.status !== 'ACTIVE') return;
      if (stateRef.current.buzzerQueue.some((b) => b.teamId === teamId)) return;
      soundFX.playSubmit();
      dispatchPlayerAction('PRESS_BUZZER', teamId, {});
    },
    [dispatchPlayerAction]
  );

  // ==============================================================
  // GM ROUND CONTROL ACTIONS
  // ==============================================================

  const loadPreset = useCallback(
    (preset: QuestionPreset) => {
      commitState((prev) => {
        const round = createRoundFromPreset(preset);
        if (round.gameStage === 'TIMEJINX' && round.chronoSubRound === 'CHRONO_SUB2_TRAP') {
          const rankings = computeChronoRankings(prev.teams);
          round.chronoQuotas = rankings.quotas;
          round.chronoShields = rankings.shields;
          round.chronoPhase = 'TRAP_PLACEMENT';
        }
        const phaseChanged =
          prev.round.gameStage !== round.gameStage ||
          (round.gameStage === 'POLL_MINE' &&
            prev.round.eightDoorsSubRound !== round.eightDoorsSubRound) ||
          (round.gameStage === 'TIMEJINX' &&
            prev.round.chronoSubRound !== round.chronoSubRound);
        round.status = 'IDLE';
        round.timerStartedAt = null;
        round.timerEndAt = null;
        round.briefingOpen = phaseChanged;
        return {
          ...prev,
          showLeaderboardOverlay: false,
          round,
          submissions: {},
          buzzerQueue: [],
        };
      });
    },
    [commitState]
  );

  const saveCustomPreset = useCallback(
    (preset: QuestionPreset) => {
      commitState((prev) => {
        const exists = prev.presets.some((p) => p.id === preset.id);
        const nextPresets = exists
          ? prev.presets.map((p) => (p.id === preset.id ? preset : p))
          : [...prev.presets, preset];
        return {
          ...prev,
          presets: nextPresets,
          round: createRoundFromPreset(preset),
          submissions: {},
          buzzerQueue: [],
        };
      });
    },
    [commitState]
  );

  const launchFreestyle = useCallback(
    (params: {
      gameStage?: GameStage;
      inputMode: InputMode;
      modeDSubType?: ModeDSubType;
      choiceCount?: number;
      targetYear?: number;
      durationSeconds?: number;
      title?: string;
      questionText?: string;
    }) => {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      const count = params.choiceCount || (params.gameStage === 'POLL_MINE' ? 8 : 4);
      const duration = params.durationSeconds || 30;

      // Sync GameStage automatically based on inputMode / params
      const resolvedStage: GameStage =
        params.gameStage ??
        (params.inputMode === 'MODE_B_YEAR'
          ? 'TIMEJINX'
          : params.inputMode === 'MODE_C_BUZZER'
          ? 'QUIXORT'
          : params.inputMode === 'MODE_D_SECRET'
          ? params.modeDSubType === 'QUIXORT_BET'
            ? 'QUIXORT'
            : 'TRIVIA_MURDER'
          : count === 8
          ? 'POLL_MINE'
          : 'TRIVIA_MURDER');

      const modeTitles: Record<InputMode, string> = {
        MODE_A_CHOICE:
          resolvedStage === 'POLL_MINE'
            ? 'ด่านที่ 1: 8 ประตูวัดใจครามปุส (The 8 Doors of Krampus)'
            : `โหมด A: ปรนัย ${count} ตัวเลือก (A - ${letters[count - 1]})`,
        MODE_B_YEAR: 'ด่านที่ 2: กงล้อกาลเวลาของครามปุส (Timejinx)',
        MODE_C_BUZZER: 'ด่านที่ 3: ศึกกดกระดิ่งแย่งสิทธิ์ความเร็ว (Speed Buzzer)',
        MODE_D_SECRET:
          params.modeDSubType === 'COIN_WAGER'
            ? 'ด่านที่ 4: ประมูลส่วยลับครามปุส (Secret Coin Wager)'
            : params.modeDSubType === 'QUIXORT_BET'
            ? 'ด่านที่ 3: สายพานคัดแยกของเล่นผีสิง (แทงข้าง PASS / FAIL)'
            : params.modeDSubType === 'CURSED_CHALICE'
            ? 'ด่านที่ 4: กล่องของขวัญต้องสาป & มีดตัดนิ้ว'
            : 'ด่านที่ 4: เลือกเลขลับ 1-10 ไม่ซ้ำใคร (Lowest Unique Number)',
      };

      const choices: ChoiceOption[] =
        params.modeDSubType === 'CURSED_CHALICE'
          ? [
              { key: '1', label: 'หมายเลข 1', isCorrect: true },
              { key: '2', label: 'หมายเลข 2', isCorrect: false, isTrap: true },
              { key: '3', label: 'หมายเลข 3', isCorrect: true },
              { key: '4', label: 'หมายเลข 4', isCorrect: false, isTrap: true },
            ]
          : letters.slice(0, count).map((key, idx) => ({
              key,
              label: `ประตูตัวเลือก ${key}`,
              rank: idx + 1,
              isCorrect: idx < 3,
              isTrap: idx >= 3,
              isOpened: false,
            }));

      commitState((prev) => ({
        ...prev,
        showLeaderboardOverlay: false,
        submissions: {},
        buzzerQueue: [],
        round: {
          id: `free-${Date.now()}`,
          gameStage: resolvedStage,
          inputMode: params.inputMode,
          modeDSubType: params.modeDSubType || 'UNIQUE_NUMBER_1_10',
          eightDoorsSubRound: 'SUB1_SURVIVAL',
          auctionIteration: 1,
          subRound2LockedTeamId: null,
          auctionWinnerTeamId: null,
          auctionWinningBid: 0,
          lastOpenedDoorKey: null,
          title: params.title || modeTitles[params.inputMode],
          subtitle:
            resolvedStage === 'POLL_MINE'
              ? 'ด่านย่อยที่ 1: เปิดทางรอด — ค้นหาประตูอันดับ 1, 2 หรือ 3 (+300🪙 / พลาดเสีย -1🛡️)'
              : 'ส่งคำตอบผ่านสมาร์ตโฟนประจำทีมก่อนหมดเวลา!',
          questionText:
            params.questionText ||
            (params.inputMode === 'MODE_C_BUZZER'
              ? 'กดปุ่มกระดิ่งยักษ์ให้ไวที่สุดเมื่อเริ่มจับเวลา!'
              : 'ดูโจทย์จาก GM ใหญ่ และกดส่งคำตอบผ่านมือถือประจำทีม!'),
          choiceCount: count,
          choices,
          correctChoices: resolvedStage === 'POLL_MINE' ? ['A', 'B', 'C'] : ['A'],
          trapChoices: [],
          targetYear: params.targetYear ?? 2020,
          yearPenaltyPerDiff: 20,
          yearFastestBonus: 200,
          activeTeamId: 'team1',
          quixortRule: 'เรียงลำดับให้ถูกต้องภายในเวลาที่กำหนด',
          quixortItems: [],
          uniqueRule: 'LOWEST',
          wagerMultiplier: 2,
          rewardCoins: resolvedStage === 'POLL_MINE' ? 300 : 200,
          penaltyCoins: 150,
          durationSeconds: duration,
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: duration * 1000,
          status: 'IDLE',
          rewardsApplied: false,
          briefingOpen: prev.round.gameStage !== resolvedStage,
        },
      }));
    },
    [commitState]
  );

  const updateRoundConfig = useCallback(
    (patch: Partial<RoundConfig>) => {
      commitState((prev) => {
        const nextRound = { ...prev.round, ...patch };
        if (patch.choiceCount && patch.choiceCount !== prev.round.choiceCount) {
          const usedRanks = new Set(
            prev.round.choices
              .slice(0, patch.choiceCount)
              .map((c) => c.rank)
              .filter((r): r is number => typeof r === 'number' && r <= patch.choiceCount!)
          );
          const availableRanks: number[] = [];
          for (let r = 1; r <= patch.choiceCount; r++) {
            if (!usedRanks.has(r)) availableRanks.push(r);
          }

          let nextSafeMin = patch.safeRankMin ?? prev.round.safeRankMin;
          let nextSafeMax = patch.safeRankMax ?? prev.round.safeRankMax;
          if (
            prev.round.gameStage === 'POLL_MINE' &&
            patch.safeRankMin === undefined &&
            patch.safeRankMax === undefined
          ) {
            const suggested = getSuggestedSafeRange(patch.choiceCount, prev.round.eightDoorsSubRound);
            nextSafeMin = suggested.min;
            nextSafeMax = suggested.max;
          }
          nextRound.safeRankMin = nextSafeMin;
          nextRound.safeRankMax = nextSafeMax;

          nextRound.choices = DOOR_LABELS.slice(0, patch.choiceCount).map((key, idx) => {
            const existing = prev.round.choices.find((c) => c.key === key);
            if (existing) {
              const rank =
                existing.rank && existing.rank <= patch.choiceCount!
                  ? existing.rank
                  : availableRanks.shift() ?? idx + 1;
              const isSafe =
                nextSafeMin !== undefined && nextSafeMax !== undefined
                  ? rank >= nextSafeMin && rank <= nextSafeMax
                  : existing.isCorrect;
              return { ...existing, rank, isCorrect: isSafe, isTrap: !isSafe };
            }
            const rank = availableRanks.shift() ?? idx + 1;
            const isSafe =
              nextSafeMin !== undefined && nextSafeMax !== undefined
                ? rank >= nextSafeMin && rank <= nextSafeMax
                : idx < 3;
            return {
              key,
              label: `ตัวเลือก ${key}`,
              rank,
              isCorrect: isSafe,
              isTrap: !isSafe,
              isOpened: false,
            };
          });
        }
        return {
          ...prev,
          round: nextRound,
        };
      });
    },
    [commitState]
  );

  const updateChoiceOption = useCallback(
    (key: string, patch: Partial<ChoiceOption>) => {
      commitState((prev) => {
        const nextChoices = prev.round.choices.map((c) => (c.key === key ? { ...c, ...patch } : c));
        const correctChoices = nextChoices.filter((c) => c.isCorrect).map((c) => c.key);
        const trapChoices = nextChoices.filter((c) => c.isTrap).map((c) => c.key);
        return {
          ...prev,
          round: {
            ...prev.round,
            choices: nextChoices,
            correctChoices,
            trapChoices,
          },
        };
      });
    },
    [commitState]
  );

  const toggleDoorOpened = useCallback(
    (key: string) => {
      commitState((prev) => ({
        ...prev,
        round: {
          ...prev.round,
          choices: prev.round.choices.map((c) =>
            c.key === key ? { ...c, isOpened: !c.isOpened } : c
          ),
        },
      }));
    },
    [commitState]
  );

  const shuffleDoors = useCallback(() => {
    commitState((prev) => {
      const count = prev.round.choiceCount;
      const active = prev.round.choices.slice(0, count);
      const payloads = active.map((c) => ({
        label: c.label,
        rank: c.rank,
        votes: c.votes,
        isCorrect: c.isCorrect,
        isTrap: c.isTrap,
      }));
      for (let i = payloads.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [payloads[i], payloads[j]] = [payloads[j], payloads[i]];
      }
      const nextChoices = prev.round.choices.map((c, idx) =>
        idx < count
          ? {
              ...c,
              ...payloads[idx],
              isOpened: false,
            }
          : c
      );
      return {
        ...prev,
        round: {
          ...prev.round,
          choices: nextChoices,
          correctChoices: nextChoices.filter((c) => c.isCorrect).map((c) => c.key),
          trapChoices: nextChoices.filter((c) => c.isTrap).map((c) => c.key),
        },
      };
    });
  }, [commitState]);

  const bailoutNiceShield = useCallback(
    (teamId: TeamId) => {
      soundFX.playSubmit();
      dispatchPlayerAction('BAILOUT_SHIELD', teamId, {});
    },
    [dispatchPlayerAction]
  );

  const submitSnakeDraftPick = useCallback(
    (teamId: TeamId, doorKey: string) => {
      soundFX.playSubmit();
      dispatchPlayerAction('SNAKE_PICK', teamId, { doorKey });
    },
    [dispatchPlayerAction]
  );

  const finishEightDoorsGame = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      clearedStages: Array.from(new Set([...(prev.clearedStages || []), 'POLL_MINE' as GameStage])),
      submissions: {},
      buzzerQueue: [],
      round: {
        ...prev.round,
        gameStage: 'WORLD_MAP',
        status: 'IDLE',
        timerStartedAt: null,
        timerEndAt: null,
        timerRemainingMs: 0,
      },
    }));
  }, [commitState]);

  const switchChronoSubRound = useCallback(
    (
      subRound: ChronoSubRound,
      options?: { presetId?: string; phase?: 'TRAP_PLACEMENT' | 'YEAR_GUESS' }
    ) => {
      if (!acquireActionLock('host:switchChronoSubRound', 400)) return;
      commitState((prev) => {
        const defaultPresetId =
          subRound === 'CHRONO_SUB1_CLASSIC'
            ? 'tj-1'
            : subRound === 'CHRONO_SUB2_TRAP'
            ? 'tj-4'
            : 'tj-7';
        const targetPreset =
          prev.presets.find((p) => p.id === (options?.presetId || defaultPresetId)) ||
          prev.presets.find((p) => p.gameStage === 'TIMEJINX');

        const baseRound = targetPreset
          ? createRoundFromPreset(targetPreset)
          : {
              ...prev.round,
              gameStage: 'TIMEJINX' as GameStage,
              inputMode: 'MODE_B_YEAR' as InputMode,
              chronoSubRound: subRound,
            };

        const phase =
          options?.phase ??
          (subRound === 'CHRONO_SUB2_TRAP' ? 'TRAP_PLACEMENT' : 'YEAR_GUESS');

        const rankings =
          subRound === 'CHRONO_SUB2_TRAP' ? computeChronoRankings(prev.teams) : null;
        const duration =
          subRound === 'CHRONO_SUB3_FAST_FINGER'
            ? 20
            : subRound === 'CHRONO_SUB2_TRAP' && phase === 'TRAP_PLACEMENT'
            ? 25
            : baseRound.durationSeconds || 30;
        const shouldOpenBriefing =
          prev.round.gameStage !== 'TIMEJINX' ||
          prev.round.chronoSubRound !== subRound ||
          !options?.presetId;

        return {
          ...prev,
          submissions: {},
          buzzerQueue: [],
          round: {
            ...baseRound,
            gameStage: 'TIMEJINX',
            inputMode: 'MODE_B_YEAR',
            chronoSubRound: subRound,
            chronoPhase: phase,
            chronoTrapsPlaced: {},
            chronoQuotas: rankings?.quotas ?? {},
            chronoShields: rankings?.shields ?? {},
            chronoFastFingerClaims: {},
            durationSeconds: duration,
            timerStartedAt: null,
            timerEndAt: null,
            timerRemainingMs: duration * 1000,
            status: 'IDLE',
            rewardsApplied: false,
            briefingOpen: shouldOpenBriefing,
          },
        };
      });
    },
    [commitState]
  );

  const launchChronoTrapGuessPhase = useCallback(() => {
    const now = getAuthoritativeNow();
    commitState((prev) => ({
      ...prev,
      submissions: {},
      buzzerQueue: [],
      round: {
        ...prev.round,
        chronoSubRound: 'CHRONO_SUB2_TRAP',
        chronoPhase: 'YEAR_GUESS',
        durationSeconds: 35,
        timerStartedAt: now,
        timerEndAt: now + 35 * 1000,
        timerRemainingMs: 35 * 1000,
        status: 'ACTIVE',
        rewardsApplied: false,
      },
    }));
    soundFX.playReveal();
  }, [commitState, getAuthoritativeNow]);

  const placeChronoTraps = useCallback(
    (teamId: TeamId, allocations: Partial<Record<TeamId, number>>) => {
      soundFX.playSubmit();
      dispatchPlayerAction('PLACE_CHRONO_TRAPS', teamId, { allocations });
    },
    [dispatchPlayerAction]
  );

  const claimChronoYear = useCallback(
    (teamId: TeamId, year: number) => {
      soundFX.playSubmit();
      dispatchPlayerAction('CLAIM_CHRONO_YEAR', teamId, { year });
    },
    [dispatchPlayerAction]
  );

  const finishChronoGame = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      clearedStages: Array.from(new Set([...(prev.clearedStages || []), 'TIMEJINX' as GameStage])),
      submissions: {},
      buzzerQueue: [],
      round: {
        ...prev.round,
        gameStage: 'WORLD_MAP',
        status: 'IDLE',
        timerStartedAt: null,
        timerEndAt: null,
        timerRemainingMs: 0,
      },
    }));
  }, [commitState]);

  // ==============================================================
  // GAME 3: THE TOY FACTORY CHAOS ACTIONS
  // ==============================================================

  const startToyFactoryGame = useCallback(() => {
    commitState((prev) => {
      const active = getActiveTeamIds(prev.teams);
      const pairings = buildToyFactoryPairings(active);
      const durSec = prev.round.gameStage === 'QUIXORT' && prev.round.durationSeconds > 0
        ? prev.round.durationSeconds
        : 120;
      return {
        ...prev,
        submissions: {},
        buzzerQueue: [],
        showLeaderboardOverlay: false,
        round: {
          ...prev.round,
          id: `round-tf-${Date.now()}`,
          gameStage: 'QUIXORT',
          inputMode: 'MODE_D_SECRET',
          modeDSubType: 'QUIXORT_BET',
          title: `THE TOY FACTORY CHAOS • รอบที่ 1/${pairings.length}`,
          subtitle: 'เลือกชุดข้อมูล (1–5) เพื่อสุ่มจับคู่คนถือข้อมูลและเริ่มเตรียมตัว 10 วินาที!',
          questionText: 'สายพานคัดแยกของเล่นผีสิง — วิ่งล่าข้อมูล & ยืนเรียงหน้ากระดาน!',
          durationSeconds: durSec,
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: durSec * 1000,
          status: 'IDLE',
          rewardsApplied: false,
          briefingOpen: true,
          toyFactory: {
            roundIndex: 1,
            pairings,
            usedDatasetIds: [],
            selectedDatasetId: null,
            phase: 'TOPIC_SELECT',
            prepEndsAt: null,
            bufferEndsAt: null,
            assignments: [],
            shuffleUsedByTeams: [],
            shuffleUsedThisRound: false,
            revealSlots: [],
            mysterySpotlightActive: false,
          },
        },
      };
    });
  }, [commitState]);

  const selectToyFactoryDataset = useCallback(
    (teamId: TeamId, datasetId: string) => {
      soundFX.playSubmit();
      dispatchPlayerAction('SELECT_TOY_DATASET', teamId, { datasetId });
    },
    [dispatchPlayerAction]
  );

  const startToyFactoryActionPhase = useCallback(() => {
    const now = getAuthoritativeNow();
    commitState((prev) => {
      const tf = prev.round.toyFactory;
      if (!tf) return prev;
      const dur = prev.round.durationSeconds || 120;
      return {
        ...prev,
        round: {
          ...prev.round,
          status: 'ACTIVE',
          timerStartedAt: now,
          timerEndAt: now + dur * 1000,
          timerRemainingMs: dur * 1000,
          toyFactory: {
            ...tf,
            phase: 'ACTION',
            prepEndsAt: null,
          },
        },
      };
    });
    soundFX.playReveal();
  }, [commitState, getAuthoritativeNow]);

  const triggerToyFactoryShuffle = useCallback(
    (spectatorTeamId: TeamId) => {
      soundFX.playBuzzer(1);
      dispatchPlayerAction('TOY_SHUFFLE', spectatorTeamId, {});
    },
    [dispatchPlayerAction]
  );

  const resumeToyFactoryFromBuffer = useCallback(() => {
    const now = getAuthoritativeNow();
    commitState((prev) => {
      const tf = prev.round.toyFactory;
      if (!tf || tf.phase !== 'SHUFFLE_BUFFER_10S') return prev;
      const rem = prev.round.timerRemainingMs ?? prev.round.durationSeconds * 1000;
      const durMs = prev.round.durationSeconds * 1000;
      const syntheticStart = now - (durMs - rem);
      return {
        ...prev,
        round: {
          ...prev.round,
          status: 'ACTIVE',
          timerStartedAt: syntheticStart,
          timerEndAt: now + rem,
          toyFactory: {
            ...tf,
            phase: 'ACTION',
            bufferEndsAt: null,
          },
        },
      };
    });
  }, [commitState, getAuthoritativeNow]);

  const enterToyFactoryRevealPhase = useCallback(() => {
    commitState((prev) => {
      const tf = prev.round.toyFactory;
      if (!tf) return prev;
      const datasets = prev.toyFactoryDatasets || DEFAULT_TOY_FACTORY_DATASETS;
      const ds = datasets.find((d) => d.id === tf.selectedDatasetId);
      const items = ds?.items || [];
      const assignMap = new Map(tf.assignments.map((a) => [a.itemId, a.memberName]));
      const slots = items.map((item, idx) => ({
        index: idx,
        itemId: item.id,
        holderName: assignMap.get(item.id) || `สมาชิก #${idx + 1}`,
        label: item.label,
        realValue: item.realValue,
        isMystery: Boolean(item.isMystery),
        mysteryClue: item.mysteryClue,
        revealed: false,
      }));
      return {
        ...prev,
        round: {
          ...prev.round,
          status: 'LOCKED',
          timerStartedAt: null,
          timerEndAt: null,
          toyFactory: {
            ...tf,
            phase: 'REVEAL_JUDGE',
            revealSlots: slots,
            mysterySpotlightActive: false,
          },
        },
      };
    });
  }, [commitState]);

  const judgeToyFactorySlot = useCallback(
    (slotIndex: number, verdict: 'CORRECT' | 'WRONG') => {
      commitState((prev) => {
        const tf = prev.round.toyFactory;
        if (!tf) return prev;
        const nextSlots = tf.revealSlots.map((s) =>
          s.index === slotIndex ? { ...s, revealed: true, verdict } : s
        );
        return {
          ...prev,
          round: {
            ...prev.round,
            toyFactory: {
              ...tf,
              revealSlots: nextSlots,
              mysterySpotlightActive: false,
            },
          },
        };
      });
      soundFX.playCoinChange(verdict === 'CORRECT');
    },
    [commitState]
  );

  const revealToyFactoryMystery = useCallback(
    (slotIndex: number) => {
      commitState((prev) => {
        const tf = prev.round.toyFactory;
        if (!tf) return prev;
        const nextSlots = tf.revealSlots.map((s) =>
          s.index === slotIndex ? { ...s, revealed: true } : s
        );
        return {
          ...prev,
          round: {
            ...prev.round,
            toyFactory: {
              ...tf,
              revealSlots: nextSlots,
              mysterySpotlightActive: true,
            },
          },
        };
      });
      soundFX.playReveal();
    },
    [commitState]
  );

  const finalizeToyFactoryRound = useCallback(() => {
    if (!acquireActionLock('host:finalizeToyFactoryRound', 500)) return;
    commitState((prev) => {
      const tf = prev.round.toyFactory;
      if (!tf || prev.round.rewardsApplied) return prev;
      const pair = tf.pairings[tf.roundIndex - 1];
      if (!pair) return prev;

      const wrongCount = tf.revealSlots.filter((s) => s.verdict === 'WRONG').length;
      const prevBalances: Record<TeamId, number> = {
        team1: prev.teams.team1.coins,
        team2: prev.teams.team2.coins,
        team3: prev.teams.team3.coins,
        team4: prev.teams.team4.coins,
      };
      const nextTeams = structuredClone(prev.teams);
      let reason = '';

      if (wrongCount === 0) {
        nextTeams[pair.sortingTeamId].coins += 800;
        nextTeams[pair.holdingTeamId].coins += 300;
        reason = `Toy Factory รอบ ${tf.roundIndex}: เรียงถูก 100%! ${nextTeams[pair.sortingTeamId].name} +800 ฿ • ${nextTeams[pair.holdingTeamId].name} +300 ฿`;
      } else {
        const penalty = wrongCount * 100;
        nextTeams[pair.sortingTeamId].coins -= penalty;
        nextTeams[pair.holdingTeamId].toyFactoryCurse = true;
        reason = `Toy Factory รอบ ${tf.roundIndex}: ผิด ${wrongCount} จุด! ${nextTeams[pair.sortingTeamId].name} -${penalty} ฿ • ${nextTeams[pair.holdingTeamId].name} ติดคำสาปโรงงานของเล่น (-1 ❤️ เกม 4)`;
      }

      const tx: CoinTransaction = {
        id: `tx-tf-${Date.now()}`,
        timestamp: Date.now(),
        teamId: 'ALL',
        delta: 0,
        reason,
        prevBalances,
      };

      return {
        ...prev,
        teams: nextTeams,
        transactions: [tx, ...prev.transactions.slice(0, 49)],
        round: {
          ...prev.round,
          status: 'REVEALED',
          rewardsApplied: true,
        },
      };
    });
    soundFX.playCoinChange(true);
  }, [commitState]);

  const nextToyFactoryRound = useCallback(() => {
    if (!acquireActionLock('host:nextToyFactoryRound', 500)) return;
    commitState((prev) => {
      const tf = prev.round.toyFactory;
      if (!tf) return prev;
      if (tf.roundIndex >= tf.pairings.length) {
        return {
          ...prev,
          clearedStages: Array.from(new Set([...(prev.clearedStages || []), 'QUIXORT' as GameStage])),
          round: {
            ...prev.round,
            gameStage: 'WORLD_MAP',
            status: 'IDLE',
            timerStartedAt: null,
            timerEndAt: null,
            timerRemainingMs: 0,
          },
        };
      }
      const nextIndex = tf.roundIndex + 1;
      const durSec = prev.round.durationSeconds || 120;
      return {
        ...prev,
        submissions: {},
        buzzerQueue: [],
        round: {
          ...prev.round,
          id: `round-tf-${Date.now()}`,
          title: `THE TOY FACTORY CHAOS • รอบที่ ${nextIndex}/${tf.pairings.length}`,
          subtitle: 'เลือกชุดข้อมูลที่เหลือเพื่อเริ่มรอบถัดไป!',
          questionText: 'สายพานคัดแยกของเล่นผีสิง — วิ่งล่าข้อมูล & ยืนเรียงหน้ากระดาน!',
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: durSec * 1000,
          status: 'IDLE',
          rewardsApplied: false,
          briefingOpen: false,
          toyFactory: {
            ...tf,
            roundIndex: nextIndex,
            selectedDatasetId: null,
            phase: 'TOPIC_SELECT',
            prepEndsAt: null,
            bufferEndsAt: null,
            assignments: [],
            shuffleUsedThisRound: false,
            revealSlots: [],
            mysterySpotlightActive: false,
          },
        },
      };
    });
  }, [commitState]);

  const updateToyFactoryDataset = useCallback(
    (datasetId: string, patch: Partial<ToyFactoryDataset>) => {
      commitState((prev) => {
        const list = prev.toyFactoryDatasets || DEFAULT_TOY_FACTORY_DATASETS;
        return {
          ...prev,
          toyFactoryDatasets: list.map((ds) =>
            ds.id === datasetId ? { ...ds, ...patch } : ds
          ),
        };
      });
    },
    [commitState]
  );

  const finishToyFactoryGame = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      clearedStages: Array.from(new Set([...(prev.clearedStages || []), 'QUIXORT' as GameStage])),
      submissions: {},
      buzzerQueue: [],
      round: {
        ...prev.round,
        gameStage: 'WORLD_MAP',
        status: 'IDLE',
        timerStartedAt: null,
        timerEndAt: null,
        timerRemainingMs: 0,
      },
    }));
  }, [commitState]);

  // Switch between Sub-Rounds 1, 2 (2.1 / 2.2), and 3 of "THE DOORS OF DOOM"
  // Spec: Each Sub-Round (1, 2, 3) uses a separate question and resets all 8-12 doors to unopened.
  const switchEightDoorsSubRound = useCallback(
    (
      subRound: EightDoorsSubRound,
      options?: { auctionIteration?: 1 | 2; revealRemaining2To4?: boolean; loadPresetQuestion?: boolean }
    ) => {
      if (!acquireActionLock('host:switchEightDoorsSubRound', 400)) return;
      commitState((prev) => {
        const iter = options?.auctionIteration ?? prev.round.auctionIteration ?? 1;
        const isFreshSubRound =
          subRound !== 'SUB2_DOOR_AND_BET' &&
          !(subRound === 'SUB2_AUCTION' && iter === 2) &&
          options?.loadPresetQuestion !== false;

        let baseRound = prev.round;
        if (isFreshSubRound) {
          const targetPresetId =
            subRound === 'SUB1_SURVIVAL'
              ? 'pm-1'
              : subRound === 'SUB2_SNAKE_DRAFT' || subRound === 'SUB2_AUCTION'
              ? 'pm-2'
              : 'pm-3';
          const matchedPreset = prev.presets.find((p) => p.id === targetPresetId);
          if (matchedPreset && prev.round.presetId !== targetPresetId) {
            baseRound = createRoundFromPreset(matchedPreset);
          }
        }

        const choiceCount = baseRound.choiceCount || 8;
        const suggested = getSuggestedSafeRange(choiceCount, subRound);
        const safeMin =
          isFreshSubRound || prev.round.eightDoorsSubRound !== subRound
            ? suggested.min
            : baseRound.safeRankMin ?? suggested.min;
        const safeMax =
          isFreshSubRound || prev.round.eightDoorsSubRound !== subRound
            ? suggested.max
            : baseRound.safeRankMax ?? suggested.max;

        let nextChoices = baseRound.choices.map((c) => {
          const resetOpen = isFreshSubRound ? false : Boolean(c.isOpened);
          const isSafe = (c.rank ?? 99) >= safeMin && (c.rank ?? 99) <= safeMax;
          return {
            ...c,
            isOpened: resetOpen,
            isCorrect: isSafe,
            isTrap: !isSafe,
          };
        });

        if (options?.revealRemaining2To4) {
          nextChoices = nextChoices.map((c) =>
            (c.rank ?? 99) >= safeMin && (c.rank ?? 99) <= safeMax ? { ...c, isOpened: true } : c
          );
        }

        const subtitles: Record<EightDoorsSubRound, string> = {
          SUB1_SURVIVAL: `ด่านย่อยที่ 1: Snake Draft 1 (1-2-3-4-4-3-2-1) — ค้นหาประตูอันดับ ${safeMin}-${safeMax} (+300 ฿ / พลาด -1 🛡️ / เปิดครบ 8 บานไม่เจอคำตอบ -200 ฿)`,
          SUB2_SNAKE_DRAFT: `ด่านย่อยที่ 2: Snake Draft 2 (4-3-2-1-1-2-3-4) — ค้นหาประตูอันดับ ${safeMin}-${safeMax} (+300 ฿ / พลาด -1 🛡️ / เปิดครบ 8 บานไม่เจอคำตอบ -200 ฿)`,
          SUB2_AUCTION: `ด่านย่อยที่ 2 (รอบ 2.${iter} ประมูลชิงสิทธิ์): บิดเพิ่มทีละ 50 ฿ เพื่อเปิดประตูอันดับ ${safeMin}-${safeMax} (+700 ฿) • ไม่บิดเลยโดน Coward's Tax -100 ฿!`,
          SUB2_DOOR_AND_BET: `ด่านย่อยที่ 2 (รอบ 2.${iter} เลือกประตู & แทงข้าง): ทีมชนะเปิดประตู (+700 ฿ / -1 🛡️) • ทีมอื่นแทงข้าง (+200 ฿ / -100 ฿)!`,
          SUB3_POLARITY: `ด่านย่อยที่ 3: วัดใจขั้วตรงข้าม (#1 & #${choiceCount}) + เก้าอี้ 12 ตัวหน้ากระดาน (1 ที่นั่ง/กลุ่ม ห้ามซ้ำ) — ถูก 1 อันดับ +300 ฿ / ถูก 2 อันดับ +700 ฿`,
        };

        const duration = subRound === 'SUB2_AUCTION' ? 30 : 45;
        const snakeOrder =
          subRound === 'SUB1_SURVIVAL'
            ? buildSnakeDraftOrder(prev.teams, false)
            : subRound === 'SUB2_SNAKE_DRAFT'
            ? buildSnakeDraftOrder(prev.teams, true)
            : [];

        return {
          ...prev,
          submissions: {},
          buzzerQueue: [],
          round: {
            ...baseRound,
            gameStage: 'POLL_MINE',
            inputMode: 'MODE_A_CHOICE',
            choiceCount,
            eightDoorsSubRound: subRound,
            auctionIteration: iter,
            safeRankMin: safeMin,
            safeRankMax: safeMax,
            snakeDraftOrder: snakeOrder,
            snakeDraftIndex: 0,
            snakeDraftPicks: [],
            cowardFreePick: false,
            subRound2LockedTeamId:
              subRound === 'SUB1_SURVIVAL'
                ? null
                : iter === 1 && subRound === 'SUB2_AUCTION'
                ? null
                : prev.round.subRound2LockedTeamId,
            auctionWinnerTeamId:
              subRound === 'SUB2_DOOR_AND_BET' ? prev.round.auctionWinnerTeamId : null,
            auctionWinningBid:
              subRound === 'SUB2_DOOR_AND_BET' ? prev.round.auctionWinningBid : 0,
            lastOpenedDoorKey: null,
            subtitle: subtitles[subRound],
            choices: nextChoices,
            durationSeconds: duration,
            timerStartedAt: null,
            timerEndAt: null,
            timerRemainingMs: duration * 1000,
            status: 'IDLE',
            rewardsApplied: false,
            briefingOpen:
              prev.round.gameStage !== 'POLL_MINE' ||
              (isFreshSubRound && prev.round.eightDoorsSubRound !== subRound),
          },
        };
      });
    },
    [commitState]
  );

  // Resolve Phase 1 of Sub-Round 2 (Auction): find highest bidder, or apply Coward's Tax if 0 bids
  const resolveSubRound2Auction = useCallback(
    (overrideWinnerTeamId?: TeamId) => {
      if (!acquireActionLock('host:resolveSubRound2Auction', 500)) {
        return { winnerTeamId: null, winningBid: 0, message: '' };
      }
      let resultWinner: TeamId | null = null;
      let resultBid = 0;
      let resultMsg = '';
      const now = getAuthoritativeNow();

      commitState((prev) => {
        const lockedTid =
          prev.round.auctionIteration === 2 ? prev.round.subRound2LockedTeamId : null;

        let bestTeam: TeamId | null = overrideWinnerTeamId || null;
        let bestBid = 0;
        let bestTime = Infinity;

        if (bestTeam) {
          bestBid = Math.max(0, Number(prev.submissions[bestTeam]?.value) || 0);
        } else {
          for (const tid of TEAM_ORDER) {
            if (tid === lockedTid) continue;
            const sub = prev.submissions[tid];
            if (!sub) continue;
            const bid = Math.max(0, Number(sub.value) || 0);
            if (bid > bestBid || (bid > 0 && bid === bestBid && sub.submittedAt < bestTime)) {
              bestBid = bid;
              bestTime = sub.submittedAt;
              bestTeam = tid;
            }
          }
        }

        const prevBalances: Record<TeamId, number> = {
          team1: prev.teams.team1.coins,
          team2: prev.teams.team2.coins,
          team3: prev.teams.team3.coins,
          team4: prev.teams.team4.coins,
        };

        const nextTeams = structuredClone(prev.teams);
        const iter = prev.round.auctionIteration || 1;
        let isCowardTax = false;
        let tx: CoinTransaction | null = null;

        if (!bestTeam || (bestBid <= 0 && !overrideWinnerTeamId)) {
          // Coward's Tax: 0 ฿ total bids -> deduct -100 ฿ from all eligible teams, random 1 eligible team opens free (no reward)
          isCowardTax = true;
          const registered = TEAM_ORDER.filter((tid) => prev.teams[tid]?.isRegistered);
          const pool = registered.length >= 2 ? registered : [...TEAM_ORDER];
          const eligible = pool.filter((tid) => tid !== lockedTid);
          const targetPool = eligible.length > 0 ? eligible : TEAM_ORDER.filter((tid) => tid !== lockedTid);

          for (const tid of targetPool) {
            nextTeams[tid].coins -= 100;
          }
          bestTeam = targetPool[Math.floor(Math.random() * targetPool.length)] || 'team1';
          bestBid = 0;
          resultMsg = `⚠️ Coward's Tax! ไม่มีทีมใดประมูล (-100 ฿ ทุกทีมที่มีสิทธิ์) • สุ่มให้ ${nextTeams[bestTeam].name} เปิดประตูฟรี (ไม่ได้รางวัลเงิน)`;
          tx = {
            id: `tx-coward-${Date.now()}`,
            timestamp: Date.now(),
            teamId: 'ALL',
            delta: -100,
            reason: `Coward's Tax รอบ 2.${iter}: ไม่มีทีมใดประมูล (-100 ฿) • สุ่ม ${nextTeams[bestTeam].name} เปิดฟรี`,
            prevBalances,
          };
        } else {
          resultMsg = `${nextTeams[bestTeam].name} ชนะการประมูลด้วยยอด ${bestBid} ฿ (หักเงินทันที & ได้สิทธิ์เลือกประตู!)`;
          if (bestBid > 0) {
            nextTeams[bestTeam].coins -= bestBid;
            tx = {
              id: `tx-auction-${Date.now()}`,
              timestamp: Date.now(),
              teamId: bestTeam,
              delta: -bestBid,
              reason: `ชนะประมูลด่านย่อยที่ 2.${iter} (-${bestBid} ฿)`,
              prevBalances,
            };
          }
        }

        resultWinner = bestTeam;
        resultBid = bestBid;

        return {
          ...prev,
          teams: nextTeams,
          submissions: {},
          transactions: tx ? [tx, ...prev.transactions.slice(0, 49)] : prev.transactions,
          round: {
            ...prev.round,
            eightDoorsSubRound: 'SUB2_DOOR_AND_BET',
            auctionWinnerTeamId: bestTeam,
            auctionWinningBid: bestBid,
            cowardFreePick: isCowardTax,
            subRound2LockedTeamId: iter === 1 ? bestTeam : prev.round.subRound2LockedTeamId,
            subtitle: isCowardTax
              ? `Coward's Tax รอบ 2.${iter}: ${nextTeams[bestTeam].name} ถูกสุ่มเปิดประตูฟรี (ไม่ได้เงินรางวัล) • ทีมอื่นแทงข้าง!`
              : `ด่านย่อยที่ 2.${iter} (เลือกประตู & แทงข้าง): ${nextTeams[bestTeam].name} เลือกเปิดประตู 1 บาน • ทีมอื่นแทงว่ารอดหรือพัง!`,
            durationSeconds: 35,
            timerStartedAt: now,
            timerEndAt: now + 35 * 1000,
            timerRemainingMs: 35 * 1000,
            status: 'ACTIVE',
            rewardsApplied: false,
          },
        };
      });

      soundFX.playReveal();
      return { winnerTeamId: resultWinner, winningBid: resultBid, message: resultMsg };
    },
    [commitState, getAuthoritativeNow]
  );

  const startTimer = useCallback(
    (customDurationSeconds?: number) => {
      if (!acquireActionLock('host:startTimer', 400)) return;
      const now = getAuthoritativeNow();
      commitState((prev) => {
        const durationSec = customDurationSeconds ?? prev.round.durationSeconds;
        if (prev.round.gameStage === 'QUIXORT' && prev.round.toyFactory?.phase === 'TOPIC_SELECT') {
          return {
            ...prev,
            round: {
              ...prev.round,
              durationSeconds: durationSec,
              timerStartedAt: null,
              timerEndAt: null,
              timerRemainingMs: durationSec * 1000,
              status: 'ACTIVE',
              briefingOpen: false,
            },
          };
        }
        return {
          ...prev,
          round: {
            ...prev.round,
            durationSeconds: durationSec,
            timerStartedAt: now,
            timerEndAt: now + durationSec * 1000,
            timerRemainingMs: durationSec * 1000,
            status: 'ACTIVE',
            briefingOpen: false,
          },
        };
      });
    },
    [commitState, getAuthoritativeNow]
  );

  const pauseTimer = useCallback(() => {
    const now = getAuthoritativeNow();
    commitState((prev) => {
      if (!prev.round.timerStartedAt && !prev.round.timerEndAt) return prev;
      const remaining =
        prev.round.timerEndAt !== null && prev.round.timerEndAt !== undefined
          ? Math.max(0, prev.round.timerEndAt - now)
          : Math.max(0, prev.round.durationSeconds * 1000 - Math.max(0, now - (prev.round.timerStartedAt || now)));
      return {
        ...prev,
        round: {
          ...prev.round,
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: remaining,
          status: 'LOCKED',
        },
      };
    });
  }, [commitState, getAuthoritativeNow]);

  const resetTimer = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      round: {
        ...prev.round,
        timerStartedAt: null,
        timerEndAt: null,
        timerRemainingMs: prev.round.durationSeconds * 1000,
        status: 'IDLE',
      },
    }));
  }, [commitState]);

  const lockRound = useCallback(() => {
    soundFX.playTimeUp();
    commitState((prev) => {
      if (
        prev.round.status === 'LOCKED' &&
        prev.round.timerRemainingMs === 0 &&
        prev.round.timerEndAt === null
      ) {
        return prev;
      }
      return {
        ...prev,
        round: {
          ...prev.round,
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: 0,
          status: 'LOCKED',
        },
      };
    });
  }, [commitState]);

  const revealRound = useCallback(() => {
    if (!acquireActionLock('host:revealRound', 500)) {
      return { summary: [] as string[] };
    }
    soundFX.playReveal();
    const curRound = stateRef.current.round;
    const isTrapPhase =
      curRound.gameStage === 'TIMEJINX' &&
      curRound.chronoSubRound === 'CHRONO_SUB2_TRAP' &&
      curRound.chronoPhase === 'TRAP_PLACEMENT';
    const needsQuixortOutcome =
      curRound.inputMode === 'MODE_D_SECRET' && curRound.modeDSubType === 'QUIXORT_BET';

    const previewScored =
      !curRound.rewardsApplied && !isTrapPhase && !needsQuixortOutcome
        ? computeRoundScoring(stateRef.current)
        : { summary: [] as string[] };

    commitState((prev) => {
      const r = prev.round;
      const shouldAutoScore =
        !r.rewardsApplied &&
        !(
          r.gameStage === 'TIMEJINX' &&
          r.chronoSubRound === 'CHRONO_SUB2_TRAP' &&
          r.chronoPhase === 'TRAP_PLACEMENT'
        ) &&
        !(r.inputMode === 'MODE_D_SECRET' && r.modeDSubType === 'QUIXORT_BET');

      if (shouldAutoScore) {
        const { nextState } = computeRoundScoring(prev);
        // Ensure Game 1 Snake Draft picks that were already revealed keep opened doors
        if (r.gameStage === 'POLL_MINE') {
          const subRound = r.eightDoorsSubRound || 'SUB1_SURVIVAL';
          if (subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT') {
            const pickedKeys = new Set(
              TEAM_ORDER.map((tid) => prev.submissions[tid]?.value).filter(Boolean).map(String)
            );
            nextState.round = {
              ...nextState.round,
              choices: nextState.round.choices.map((c) =>
                pickedKeys.has(c.key) ? { ...c, isOpened: true } : c
              ),
            };
          }
        }
        return nextState;
      }

      let nextChoices = [...r.choices];
      let lastOpenedDoorKey = r.lastOpenedDoorKey;

      if (r.gameStage === 'POLL_MINE') {
        const subRound = r.eightDoorsSubRound || 'SUB1_SURVIVAL';
        if (subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT') {
          const pickedKeys = new Set(
            TEAM_ORDER.map((tid) => prev.submissions[tid]?.value).filter(Boolean).map(String)
          );
          nextChoices = nextChoices.map((c) =>
            pickedKeys.has(c.key) ? { ...c, isOpened: true } : c
          );
        } else if (subRound === 'SUB2_DOOR_AND_BET') {
          const winnerTid = r.auctionWinnerTeamId;
          const winnerPick = winnerTid ? String(prev.submissions[winnerTid]?.value || '') : '';
          if (winnerPick) {
            lastOpenedDoorKey = winnerPick;
            nextChoices = nextChoices.map((c) =>
              c.key === winnerPick ? { ...c, isOpened: true } : c
            );
          }
        } else if (subRound === 'SUB3_POLARITY') {
          nextChoices = nextChoices.map((c) => ({ ...c, isOpened: true }));
        }
      }

      return {
        ...prev,
        round: {
          ...prev.round,
          choices: nextChoices,
          lastOpenedDoorKey,
          timerStartedAt: null,
          timerEndAt: null,
          status: 'REVEALED',
          briefingOpen: false,
        },
      };
    });

    if (previewScored.summary.length > 0) {
      soundFX.playCoinChange(true);
    }
    return { summary: previewScored.summary };
  }, [commitState]);

  const resetRoundSubmissions = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      submissions: {},
      buzzerQueue: [],
      round: {
        ...prev.round,
        timerStartedAt: null,
        timerEndAt: null,
        timerRemainingMs: prev.round.durationSeconds * 1000,
        status: 'IDLE',
        rewardsApplied: false,
      },
    }));
  }, [commitState]);

  // ==============================================================
  // GM ECONOMY & SCOREBOARD ACTIONS
  // ==============================================================

  const adjustCoins = useCallback(
    (teamId: TeamId | 'ALL', delta: number, reason: string = 'ปรับยอดเหรียญโดย GM') => {
      if (delta === 0) return;
      soundFX.playCoinChange(delta > 0);
      commitState((prev) => {
        const prevBalances: Record<TeamId, number> = {
          team1: prev.teams.team1.coins,
          team2: prev.teams.team2.coins,
          team3: prev.teams.team3.coins,
          team4: prev.teams.team4.coins,
        };
        const nextTeams = { ...prev.teams };
        const targets: TeamId[] = teamId === 'ALL' ? TEAM_ORDER : [teamId];
        for (const tid of targets) {
          nextTeams[tid] = {
            ...nextTeams[tid],
            coins: nextTeams[tid].coins + delta,
          };
        }
        const tx: CoinTransaction = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: Date.now(),
          teamId,
          delta,
          reason,
          prevBalances,
        };
        return {
          ...prev,
          teams: nextTeams,
          transactions: [tx, ...prev.transactions.slice(0, 49)],
        };
      });
    },
    [commitState]
  );

  const setExactCoins = useCallback(
    (teamId: TeamId, amount: number, reason: string = 'ตั้งค่าเหรียญโดย GM') => {
      commitState((prev) => {
        const prevBalances: Record<TeamId, number> = {
          team1: prev.teams.team1.coins,
          team2: prev.teams.team2.coins,
          team3: prev.teams.team3.coins,
          team4: prev.teams.team4.coins,
        };
        const delta = amount - prev.teams[teamId].coins;
        const tx: CoinTransaction = {
          id: `tx-${Date.now()}`,
          timestamp: Date.now(),
          teamId,
          delta,
          reason,
          prevBalances,
        };
        return {
          ...prev,
          teams: {
            ...prev.teams,
            [teamId]: {
              ...prev.teams[teamId],
              coins: amount,
            },
          },
          transactions: [tx, ...prev.transactions.slice(0, 49)],
        };
      });
    },
    [commitState]
  );

  const adjustShields = useCallback(
    (teamId: TeamId, delta: number) => {
      commitState((prev) => {
        const current = prev.teams[teamId].shields ?? prev.teams[teamId].candles ?? 3;
        const nextVal = Math.max(0, Math.min(5, current + delta));
        return {
          ...prev,
          teams: {
            ...prev.teams,
            [teamId]: {
              ...prev.teams[teamId],
              shields: nextVal,
              candles: nextVal,
            },
          },
        };
      });
    },
    [commitState]
  );

  const adjustCandles = adjustShields;

  const adjustLmsHearts = useCallback(
    (teamId: TeamId, delta: number) => {
      commitState((prev) => {
        const lms = prev.round.lastMan;
        if (!lms || !lms.teamStates[teamId]) return prev;
        const currentTs = lms.teamStates[teamId];
        const nextHearts = Math.max(0, Math.min(4, currentTs.hearts + delta));
        const nextTs = {
          ...currentTs,
          hearts: nextHearts,
          isGhost: nextHearts <= 0,
        };
        return {
          ...prev,
          round: {
            ...prev.round,
            lastMan: {
              ...lms,
              teamStates: {
                ...lms.teamStates,
                [teamId]: nextTs,
              },
            },
          },
        };
      });
    },
    [commitState]
  );

  const toggleKillingFloor = useCallback(
    (teamId: TeamId) => {
      commitState((prev) => ({
        ...prev,
        teams: {
          ...prev.teams,
          [teamId]: {
            ...prev.teams[teamId],
            isInKillingFloor: !prev.teams[teamId].isInKillingFloor,
          },
        },
      }));
    },
    [commitState]
  );

  const updateTeamProfile = useCallback(
    (teamId: TeamId, patch: Partial<Team>) => {
      commitState((prev) => ({
        ...prev,
        teams: {
          ...prev.teams,
          [teamId]: {
            ...prev.teams[teamId],
            ...patch,
          },
        },
      }));
    },
    [commitState]
  );

  const undoLastTransaction = useCallback(() => {
    commitState((prev) => {
      if (prev.transactions.length === 0) return prev;
      const [lastTx, ...rest] = prev.transactions;
      const restoredTeams = { ...prev.teams };
      for (const tid of TEAM_ORDER) {
        if (typeof lastTx.prevBalances[tid] === 'number') {
          restoredTeams[tid] = {
            ...restoredTeams[tid],
            coins: lastTx.prevBalances[tid],
          };
        }
        if (lastTx.prevShields && typeof lastTx.prevShields[tid] === 'number') {
          restoredTeams[tid] = {
            ...restoredTeams[tid],
            shields: lastTx.prevShields[tid],
            candles: lastTx.prevShields[tid],
          };
        }
      }
      return {
        ...prev,
        teams: restoredTeams,
        transactions: rest,
      };
    });
  }, [commitState]);

  // Smart 1-Click Auto Scoring for all 4 games & 3 sub-rounds of "The 8 Doors of Krampus"
  const autoApplyRoundScoring = useCallback(
    (quixortOutcome?: 'PASS' | 'FAIL') => {
      if (!acquireActionLock('host:autoApplyRoundScoring', 500)) {
        return { summary: [] as string[] };
      }
      const { summary } = computeRoundScoring(stateRef.current, quixortOutcome);
      commitState((prev) => computeRoundScoring(prev, quixortOutcome).nextState);
      soundFX.playCoinChange(true);
      return { summary };
    },
    [commitState]
  );

  const setShowLeaderboardOverlay = useCallback(
    (show: boolean) => {
      commitState((prev) => ({
        ...prev,
        showLeaderboardOverlay: show,
      }));
    },
    [commitState]
  );

  const setShowQrOverlay = useCallback(
    (show: boolean) => {
      commitState((prev) => ({
        ...prev,
        showQrOverlay: show,
      }));
    },
    [commitState]
  );

  const startMansionGame = useCallback(() => {
    soundFX.playReveal();
    commitState((prev) => ({
      ...prev,
      roomLocked: true,
      showLeaderboardOverlay: false,
      showQrOverlay: false,
      round: {
        ...prev.round,
        gameStage: 'WORLD_MAP',
        status: 'IDLE',
        title: 'คฤหาสน์ครามปุส (Mansion World Map)',
        subtitle: 'ห้องถูกล็อกแล้ว! เตรียมตัวเข้าสู่ 4 บททดสอบแห่งคืนวันคริสต์มาสอีฟ',
      },
    }));
  }, [commitState]);

  const startLastManStandingGame = useCallback(() => {
    soundFX.playReveal();
    commitState((prev) => {
      const lms = createInitialLastManState(prev.teams);
      const nextTeams = { ...prev.teams };
      TEAM_ORDER.forEach((tid) => {
        nextTeams[tid] = { ...nextTeams[tid], isInKillingFloor: false };
      });
      return {
        ...prev,
        roomLocked: true,
        showLeaderboardOverlay: false,
        submissions: {},
        buzzerQueue: [],
        teams: nextTeams,
        lastManPart1Questions:
          prev.lastManPart1Questions && prev.lastManPart1Questions.length >= 4
            ? prev.lastManPart1Questions
            : DEFAULT_LAST_MAN_PART1_QUESTIONS,
        lastManPart2Questions:
          prev.lastManPart2Questions && prev.lastManPart2Questions.length >= 1
            ? prev.lastManPart2Questions
            : DEFAULT_LAST_MAN_PART2_QUESTIONS,
        round: {
          ...prev.round,
          id: `round-lms-${Date.now()}`,
          gameStage: 'TRIVIA_MURDER',
          inputMode: 'MODE_A_CHOICE',
          title: 'THE LAST MAN STANDING — ลานประหารคริสต์มาส',
          subtitle: 'กติกาหักมุม: Holy Coins คือกระสุนและแต้มต่อ วิ่งทะลุบันได 25 ขั้นเป็นทีมแรกเพื่อคว้าแชมป์!',
          questionText: 'ประกาศจากครามปุส: เตรียมตัวเข้าสู่ลานประหาร!',
          status: 'IDLE',
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: null,
          rewardsApplied: false,
          briefingOpen: true,
          lastMan: lms,
        },
      };
    });
  }, [commitState]);

  const prepareLastManPart1Round = useCallback(
    (roundNum?: number) => {
      if (!acquireActionLock('host:prepareLastManPart1Round', 450)) return;
      const now = getAuthoritativeNow();
      commitState((prev) => {
        const lms = prev.round.lastMan
          ? structuredClone(prev.round.lastMan)
          : createInitialLastManState(prev.teams);
        const rNum = roundNum ?? lms.part1Round;
        const p1List =
          prev.lastManPart1Questions && prev.lastManPart1Questions.length >= 4
            ? prev.lastManPart1Questions
            : DEFAULT_LAST_MAN_PART1_QUESTIONS;
        const q = p1List[(rNum - 1) % p1List.length];

        lms.phase = 'PART1_TRIVIA';
        lms.part1Round = rNum;
        lms.miseryPullTeamId = null;
        lms.miseryEndsAt = null;
        lms.poisonedChalices = [];
        lms.chalicePicks = {};
        lms.splitStealPicks = {};
        lms.dareVotes = {};
        lms.krampusDiceRoll = null;
        lms.teamDiceRolls = {};
        lms.roundStock = createDefaultLastManRoundStock();
        TEAM_ORDER.forEach((tid) => {
          lms.teamStates[tid].mirrorShield = false;
          lms.teamStates[tid].activeCurse = null;
        });

        return {
          ...prev,
          submissions: {},
          buzzerQueue: [],
          round: {
            ...prev.round,
            id: `lms-p1-r${rNum}-${now}`,
            gameStage: 'TRIVIA_MURDER',
            inputMode: 'MODE_A_CHOICE',
            title: `ช่วงที่ 1 • รอบที่ ${rNum}/4: คำถามเอาชีวิตรอด`,
            subtitle: 'เตรียมพร้อม! รอ Host กดเปิดโจทย์เพื่อเริ่มนับถอยหลัง 15 วินาที',
            questionText: q.questionText,
            choiceCount: 4,
            choices: q.choices.map((c) => ({
              key: c.key,
              label: c.label,
              isCorrect: c.key === q.correctKey,
            })),
            correctChoices: [q.correctKey],
            durationSeconds: 15,
            timerStartedAt: null,
            timerEndAt: null,
            timerRemainingMs: 15 * 1000,
            status: 'IDLE',
            rewardsApplied: false,
            briefingOpen: false,
            lastMan: lms,
          },
        };
      });
    },
    [commitState, getAuthoritativeNow]
  );

  const startLastManPart1Trivia = useCallback(
    (roundNum?: number) => {
      if (!acquireActionLock('host:startLastManPart1Trivia', 450)) return;
      const now = getAuthoritativeNow();
      soundFX.playTick(true);
      commitState((prev) => {
        const lms = prev.round.lastMan
          ? structuredClone(prev.round.lastMan)
          : createInitialLastManState(prev.teams);
        const rNum = roundNum ?? lms.part1Round;
        const p1List =
          prev.lastManPart1Questions && prev.lastManPart1Questions.length >= 4
            ? prev.lastManPart1Questions
            : DEFAULT_LAST_MAN_PART1_QUESTIONS;
        const q = p1List[(rNum - 1) % p1List.length];

        lms.phase = 'PART1_TRIVIA';
        lms.part1Round = rNum;
        lms.miseryPullTeamId = null;
        lms.miseryEndsAt = null;
        lms.poisonedChalices = [];
        lms.chalicePicks = {};
        lms.splitStealPicks = {};
        lms.dareVotes = {};
        lms.krampusDiceRoll = null;
        lms.teamDiceRolls = {};
        lms.roundStock = createDefaultLastManRoundStock();
        TEAM_ORDER.forEach((tid) => {
          lms.teamStates[tid].mirrorShield = false;
          lms.teamStates[tid].activeCurse = null;
        });

        return {
          ...prev,
          submissions: {},
          buzzerQueue: [],
          round: {
            ...prev.round,
            id: `lms-p1-r${rNum}-${now}`,
            gameStage: 'TRIVIA_MURDER',
            inputMode: 'MODE_A_CHOICE',
            title: `ช่วงที่ 1 • รอบที่ ${rNum}/4: คำถามเอาชีวิตรอด`,
            subtitle: 'ตอบภายใน 15 วินาที! ตอบผิดร่วงลงลานประหาร!',
            questionText: q.questionText,
            choiceCount: 4,
            choices: q.choices.map((c) => ({
              key: c.key,
              label: c.label,
              isCorrect: c.key === q.correctKey,
            })),
            correctChoices: [q.correctKey],
            durationSeconds: 15,
            timerStartedAt: now,
            timerEndAt: now + 15 * 1000,
            timerRemainingMs: null,
            status: 'ACTIVE',
            rewardsApplied: false,
            briefingOpen: false,
            lastMan: lms,
          },
        };
      });
    },
    [commitState, getAuthoritativeNow]
  );

  const revealLastManPart1Trivia = useCallback(() => {
    if (!acquireActionLock('host:revealLastManPart1Trivia', 500)) return;
    const now = getAuthoritativeNow();
    soundFX.playReveal();
    commitState((prev) => {
      const lms = prev.round.lastMan ? structuredClone(prev.round.lastMan) : null;
      if (!lms) return prev;
      const p1List = prev.lastManPart1Questions || DEFAULT_LAST_MAN_PART1_QUESTIONS;
      const q = p1List[(lms.part1Round - 1) % p1List.length];
      const active = getActiveTeamIds(prev.teams);
      const nextTeams = { ...prev.teams };

      const livingTeams = active.filter((tid) => !lms.teamStates[tid].isGhost);
      const correctLiving = livingTeams.filter(
        (tid) => String(prev.submissions[tid]?.value || '') === q.correctKey
      );
      const wrongLiving = livingTeams.filter(
        (tid) => String(prev.submissions[tid]?.value || '') !== q.correctKey
      );

      const soleSurvivor = correctLiving.length === 1;
      const reward = soleSurvivor ? 500 : 250;

      correctLiving.forEach((tid) => {
        nextTeams[tid] = { ...nextTeams[tid], coins: nextTeams[tid].coins + reward };
      });
      wrongLiving.forEach((tid) => {
        lms.teamStates[tid].inKillingFloor = true;
        nextTeams[tid] = { ...nextTeams[tid], isInKillingFloor: true };
      });

      const safeLiving = livingTeams.filter((tid) => !lms.teamStates[tid].inKillingFloor);
      if (wrongLiving.length === 1 && safeLiving.length >= 1) {
        lms.phase = 'PART1_MISERY_PULL';
        lms.miseryPullTeamId = wrongLiving[0];
        lms.miseryEndsAt = now + 10000;
        pushLmsFeed(
          lms ? { ...prev, round: { ...prev.round, lastMan: lms } } : prev,
          now,
          '😈',
          `${nextTeams[wrongLiving[0]].icon} ${nextTeams[wrongLiving[0]].name} ตอบผิดทีมเดียว! มีสิทธิ์ลากเพื่อนตกนรก 1 ทีม (10 วิ)!`
        );
      } else {
        lms.phase = 'PART1_TRIVIA_REVEAL';
      }

      if (soleSurvivor) {
        pushLmsFeed(
          { ...prev, round: { ...prev.round, lastMan: lms } },
          now,
          '👑',
          `${nextTeams[correctLiving[0]].icon} ${nextTeams[correctLiving[0]].name} รอดคนเดียวทั้งห้อง! รับโบนัส x2 (+500 ฿)`
        );
      }

      return {
        ...prev,
        teams: nextTeams,
        round: {
          ...prev.round,
          status: 'REVEALED',
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: 0,
          rewardsApplied: true,
          lastMan: lms,
        },
      };
    });
  }, [commitState, getAuthoritativeNow]);

  const enterLastManBlackMarket = useCallback(() => {
    const now = getAuthoritativeNow();
    soundFX.playTick(true);
    commitState((prev) => {
      const lms = prev.round.lastMan ? structuredClone(prev.round.lastMan) : null;
      if (!lms) return prev;
      lms.phase = 'PART1_BLACK_MARKET';
      lms.miseryPullTeamId = null;
      lms.miseryEndsAt = null;
      return {
        ...prev,
        round: {
          ...prev.round,
          title: `ช่วงที่ 1 • รอบที่ ${lms.part1Round}/4: ตลาดมืดละลายทรัพย์`,
          subtitle: '25 วินาที! ซื้อปุ๊บ ออกฤทธิ์ปั๊บตามลำดับเวลา!',
          durationSeconds: 25,
          timerStartedAt: now,
          timerEndAt: now + 25 * 1000,
          timerRemainingMs: null,
          status: 'ACTIVE',
          lastMan: lms,
        },
      };
    });
  }, [commitState, getAuthoritativeNow]);

  const autoResolveMiseryPull = useCallback(() => {
    const now = getAuthoritativeNow();
    commitState((prev) => {
      const lms = prev.round.lastMan ? structuredClone(prev.round.lastMan) : null;
      if (!lms || lms.phase !== 'PART1_MISERY_PULL' || !lms.miseryPullTeamId) return prev;
      const active = getActiveTeamIds(prev.teams);
      const candidates = active.filter(
        (tid) => !lms.teamStates[tid].isGhost && !lms.teamStates[tid].inKillingFloor
      );
      if (candidates.length > 0) {
        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        const next = structuredClone(prev);
        applyLmsMiseryPull(next, lms.miseryPullTeamId, picked, now);
        return next;
      }
      lms.phase = 'PART1_BLACK_MARKET';
      lms.miseryPullTeamId = null;
      lms.miseryEndsAt = null;
      return {
        ...prev,
        round: {
          ...prev.round,
          durationSeconds: 25,
          timerStartedAt: now,
          timerEndAt: now + 25 * 1000,
          timerRemainingMs: null,
          status: 'ACTIVE',
          lastMan: lms,
        },
      };
    });
  }, [commitState, getAuthoritativeNow]);

  const enterLastManMinigame = useCallback(() => {
    const now = getAuthoritativeNow();
    soundFX.playTick(true);
    commitState((prev) => {
      const lms = prev.round.lastMan ? structuredClone(prev.round.lastMan) : null;
      if (!lms) return prev;
      lms.phase = 'PART1_MINIGAME';
      lms.poisonedChalices = [];
      lms.chalicePicks = {};
      lms.splitStealPicks = {};
      lms.dareVotes = {};
      lms.krampusDiceRoll = null;
      lms.teamDiceRolls = {};
      const durSec = lms.part1Round === 3 ? 15 : 30;
      const mgNames = [
        '',
        'มินิเกม 1: ถ้วยยาพิษ (Poison Chalice)',
        'มินิเกม 2: หักหลังแบ่งสมบัติ (Split or Steal)',
        'มินิเกม 3: ท้าทายความกล้า (Krampus Dare • 15 วิ)',
        'มินิเกม 4: ทอยเต๋าวัดดวง (Death Dice)',
      ];
      return {
        ...prev,
        round: {
          ...prev.round,
          title: `ลานประหาร • ${mgNames[lms.part1Round] || 'มินิเกม'}`,
          subtitle: 'ผู้ที่รอดจากลานประหารโดยไม่เสียหัวใจ รับเงินปลอบใจ +150 ฿!',
          durationSeconds: durSec,
          timerStartedAt: now,
          timerEndAt: now + durSec * 1000,
          timerRemainingMs: null,
          status: 'ACTIVE',
          lastMan: lms,
        },
      };
    });
  }, [commitState, getAuthoritativeNow]);

  const rollKrampusDeathDice = useCallback(() => {
    soundFX.playReveal();
    commitState((prev) => {
      const lms = prev.round.lastMan ? structuredClone(prev.round.lastMan) : null;
      if (!lms) return prev;
      lms.krampusDiceRoll = Math.floor(Math.random() * 6) + 1;
      return {
        ...prev,
        round: { ...prev.round, lastMan: lms },
      };
    });
  }, [commitState]);

  const revealLastManMinigame = useCallback(() => {
    const now = getAuthoritativeNow();
    soundFX.playReveal();
    commitState((prev) => {
      const lms = prev.round.lastMan ? structuredClone(prev.round.lastMan) : null;
      if (!lms) return prev;
      const next = structuredClone(prev);
      const nLms = next.round.lastMan!;
      const active = getActiveTeamIds(next.teams);
      const kfTeams = active.filter(
        (tid) => !nLms.teamStates[tid].isGhost && nLms.teamStates[tid].inKillingFloor
      );

      const hurt = (tid: TeamId, reason: string) => {
        const ts = nLms.teamStates[tid];
        ts.hearts = Math.max(0, ts.hearts - 1);
        if (ts.hearts <= 0) ts.isGhost = true;
        pushLmsFeed(
          next,
          now,
          '💀',
          `${next.teams[tid].icon} ${next.teams[tid].name} ${reason} (-1 ❤️)${
            ts.isGhost ? ' -> กลายเป็นวิญญาณ!' : ''
          }`
        );
      };
      const survive = (tid: TeamId, bonus = 150) => {
        next.teams[tid].coins += bonus;
        pushLmsFeed(
          next,
          now,
          '💚',
          `${next.teams[tid].icon} ${next.teams[tid].name} รอดจากลานประหาร! (+${bonus} ฿)`
        );
      };

      if (nLms.part1Round === 1) {
        // Poison Chalice
        const poisoned =
          nLms.poisonedChalices.length > 0
            ? nLms.poisonedChalices
            : [Math.floor(Math.random() * 4) + 1];
        nLms.poisonedChalices = poisoned;
        kfTeams.forEach((tid) => {
          const pick = nLms.chalicePicks[tid] || 1;
          if (poisoned.includes(pick)) {
            hurt(tid, `ดื่มถ้วยยาพิษ #${pick}`);
          } else {
            survive(tid, 150);
          }
        });
      } else if (nLms.part1Round === 2) {
        // Split or Steal
        const stealers = kfTeams.filter((tid) => nLms.splitStealPicks[tid] === 'STEAL');
        const splitters = kfTeams.filter((tid) => nLms.splitStealPicks[tid] !== 'STEAL');
        if (stealers.length > 0 && splitters.length > 0) {
          stealers.forEach((tid) => survive(tid, 300));
          splitters.forEach((tid) => hurt(tid, 'โดนแทงข้างหลัง'));
        } else if (stealers.length > 1 && splitters.length === 0) {
          stealers.forEach((tid) => hurt(tid, 'แทงกันเองตายหมู่'));
        } else if (stealers.length === 1 && splitters.length === 0) {
          survive(stealers[0], 300);
        } else {
          splitters.forEach((tid) => survive(tid, 150));
        }
      } else if (nLms.part1Round === 3) {
        // Krampus Dare vote
        const votes = Object.values(nLms.dareVotes || {});
        const execCount = votes.filter((v) => v === 'EXECUTE').length;
        const spareCount = votes.filter((v) => v === 'SPARE').length;
        const executeAll = execCount > spareCount;
        kfTeams.forEach((tid) => {
          if (executeAll) {
            hurt(tid, 'ถูกโหวตประหาร');
          } else {
            survive(tid, 150);
          }
        });
      } else {
        // Death Dice
        const kRoll = nLms.krampusDiceRoll ?? Math.floor(Math.random() * 6) + 1;
        nLms.krampusDiceRoll = kRoll;
        kfTeams.forEach((tid) => {
          const tRoll = nLms.teamDiceRolls[tid] ?? Math.floor(Math.random() * 6) + 1;
          nLms.teamDiceRolls[tid] = tRoll;
          if (tRoll < kRoll) {
            hurt(tid, `ทอยได้ ${tRoll} แพ้ Krampus (${kRoll})`);
          } else {
            survive(tid, 150);
          }
        });
      }

      // Clear Killing Floor after minigame
      TEAM_ORDER.forEach((tid) => {
        nLms.teamStates[tid].inKillingFloor = false;
        nLms.teamStates[tid].activeCurse = null;
        nLms.teamStates[tid].mirrorShield = false;
        next.teams[tid].isInKillingFloor = false;
      });
      nLms.phase = 'PART1_MINIGAME_REVEAL';
      next.round.status = 'REVEALED';
      next.round.timerStartedAt = null;
      next.round.timerEndAt = null;
      next.round.timerRemainingMs = 0;
      return next;
    });
  }, [commitState, getAuthoritativeNow]);

  const startLastManPart2Escape = useCallback(() => {
    const now = getAuthoritativeNow();
    soundFX.playReveal();
    commitState((prev) => {
      const next = structuredClone(prev);
      const lms = next.round.lastMan || createInitialLastManState(next.teams);
      const active = getActiveTeamIds(next.teams);
      const allGhosts = active.every((tid) => lms.teamStates[tid].isGhost || lms.teamStates[tid].hearts <= 0);
      const startSteps: Partial<Record<TeamId, number>> = {};

      active.forEach((tid) => {
        const ts = lms.teamStates[tid];
        ts.inKillingFloor = false;
        ts.activeCurse = null;
        ts.mirrorShield = false;
        next.teams[tid].isInKillingFloor = false;
        if (allGhosts) {
          ts.isGhost = false;
          ts.hearts = 1;
          ts.step = 0;
        } else if (ts.isGhost || ts.hearts <= 0) {
          ts.isGhost = true;
          ts.hearts = 0;
          ts.step = 0;
        } else {
          // Every 400 = +1 step, capped at 3 steps (1200)
          const headStart = Math.min(3, Math.floor(next.teams[tid].coins / 400));
          ts.step = headStart;
        }
        startSteps[tid] = ts.step;
        next.teams[tid].coins = 0;
      });

      const p2List =
        next.lastManPart2Questions && next.lastManPart2Questions.length > 0
          ? next.lastManPart2Questions
          : DEFAULT_LAST_MAN_PART2_QUESTIONS;
      const q = p2List[0];

      lms.phase = 'PART2_CLUE';
      lms.part2QuestionIndex = 0;
      lms.krampusStep = 0;
      lms.winnerTeamId = null;
      lms.part2StartSteps = startSteps;
      next.round.lastMan = lms;
      next.submissions = {};
      next.round = {
        ...next.round,
        id: `lms-p2-q0-${now}`,
        inputMode: 'MODE_A_CHOICE',
        title: 'ช่วงที่ 2 • บันไดหนีตาย 25 ขั้น (The Final Escape)',
        subtitle: 'ขั้นตอนที่ 1: อ่านเบาะแสตั้งต้นก่อนเปิดคำถาม!',
        questionText: q.clueText,
        choiceCount: 3,
        choices: q.choices.map((c) => ({
          key: c.key,
          label: c.label,
          isCorrect: c.key === q.correctKey,
        })),
        correctChoices: [q.correctKey],
        durationSeconds: q.durationSeconds || 60,
        timerStartedAt: null,
        timerEndAt: null,
        timerRemainingMs: null,
        status: 'IDLE',
        rewardsApplied: false,
        lastMan: lms,
      };
      return next;
    });
  }, [commitState, getAuthoritativeNow]);

  const advanceFromLastManMinigame = useCallback(() => {
    const now = getAuthoritativeNow();
    commitState((prev) => {
      const lms = prev.round.lastMan ? structuredClone(prev.round.lastMan) : null;
      if (!lms) return prev;
      // After Round 2 -> trigger GREED TAX if not yet shown
      if (lms.part1Round === 2 && lms.phase === 'PART1_MINIGAME_REVEAL') {
        const next = structuredClone(prev);
        const nLms = next.round.lastMan!;
        const report: Array<{ teamId: TeamId; before: number; after: number; lost: number }> = [];
        TEAM_ORDER.forEach((tid) => {
          const before = next.teams[tid].coins;
          if (before > 1000) {
            const lost = Math.floor(before / 2);
            const after = before - lost;
            next.teams[tid].coins = after;
            report.push({ teamId: tid, before, after, lost });
          }
        });
        nLms.greedTaxReport = report;
        nLms.phase = 'PART1_GREED_TAX';
        next.round.title = 'ภาษีคนงกของ Krampus!';
        next.round.subtitle = 'ทีมที่มีเงินเกิน 1,000 ฿ ถูกหักเงินครึ่งหนึ่งทันที!';
        pushLmsFeed(
          next,
          now,
          '💸',
          report.length > 0
            ? `Krampus เก็บภาษีคนงก! ${report.map((r) => `${next.teams[r.teamId].name} -${r.lost} ฿`).join(', ')}`
            : 'ไม่มีทีมไหนถือเงินเกิน 1,000 ฿ — รอดภาษีคนงกทั้งหมด!'
        );
        return next;
      }

      if (lms.part1Round >= 4) {
        return prev; // Admin clicks "เข้าสู่ช่วงที่ 2"
      }

      const nextRound = lms.part1Round + 1;
      const p1List = prev.lastManPart1Questions || DEFAULT_LAST_MAN_PART1_QUESTIONS;
      const q = p1List[(nextRound - 1) % p1List.length];
      lms.phase = 'PART1_TRIVIA';
      lms.part1Round = nextRound;
      lms.roundStock = createDefaultLastManRoundStock();
      TEAM_ORDER.forEach((tid) => {
        lms.teamStates[tid].mirrorShield = false;
        lms.teamStates[tid].activeCurse = null;
      });
      return {
        ...prev,
        submissions: {},
        round: {
          ...prev.round,
          id: `lms-p1-r${nextRound}-${now}`,
          title: `ช่วงที่ 1 • รอบที่ ${nextRound}/4: คำถามเอาชีวิตรอด`,
          subtitle: 'เตรียมพร้อม! รอ Host กดเปิดโจทย์เพื่อเริ่มนับถอยหลัง 15 วินาที',
          questionText: q.questionText,
          choiceCount: 4,
          choices: q.choices.map((c) => ({
            key: c.key,
            label: c.label,
            isCorrect: c.key === q.correctKey,
          })),
          correctChoices: [q.correctKey],
          durationSeconds: 15,
          timerStartedAt: null,
          timerEndAt: null,
          timerRemainingMs: 15 * 1000,
          status: 'IDLE',
          rewardsApplied: false,
          briefingOpen: false,
          lastMan: lms,
        },
      };
    });
  }, [commitState, getAuthoritativeNow]);

  const triggerLastManFreezeWarning = useCallback(() => {
    soundFX.playCoinChange(false);
    commitState((prev) => ({
      ...prev,
      krampusAlertMessage: '🗿 KRAMPUS มองอยู่! ทีมต้องสาปหยุดนิ่งเป็นรูปปั้น 3 วินาที!',
    }));
  }, [commitState]);

  const penalizeLastManCurseViolation = useCallback(
    (teamId: TeamId) => {
      const now = getAuthoritativeNow();
      soundFX.playCoinChange(false);
      commitState((prev) => {
        const next = structuredClone(prev);
        const lms = next.round.lastMan;
        const ts = lms?.teamStates?.[teamId];
        if (!lms || !ts || ts.isGhost) return prev;
        ts.hearts = Math.max(0, ts.hearts - 1);
        if (ts.hearts <= 0) ts.isGhost = true;
        pushLmsFeed(
          next,
          now,
          '⚡',
          `${next.teams[teamId].icon} ${next.teams[teamId].name} ทำผิดกติกาคำสาป! (-1 ❤️)`
        );
        return next;
      });
    },
    [commitState, getAuthoritativeNow]
  );

  const openLastManPart2Question = useCallback(() => {
    if (!acquireActionLock('host:openLastManPart2Question', 450)) return;
    const now = getAuthoritativeNow();
    soundFX.playTick(true);
    commitState((prev) => {
      const next = structuredClone(prev);
      const lms = next.round.lastMan;
      if (!lms) return prev;
      const p2List = next.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
      const q = p2List[lms.part2QuestionIndex % p2List.length];
      lms.phase = 'PART2_QUESTION';
      next.submissions = {};
      const durSec = q.durationSeconds || 60;
      next.round = {
        ...next.round,
        title: `ช่วงที่ 2 • ข้อที่ ${lms.part2QuestionIndex + 1}: บันไดหนีตาย 25 ขั้น`,
        subtitle: 'กดปุ่มสี A / B / C ให้ไวที่สุด!',
        questionText: q.questionText,
        durationSeconds: durSec,
        timerStartedAt: now,
        timerEndAt: now + durSec * 1000,
        timerRemainingMs: null,
        status: 'ACTIVE',
        rewardsApplied: false,
      };
      return next;
    });
  }, [commitState, getAuthoritativeNow]);

  const revealLastManPart2Question = useCallback(() => {
    if (!acquireActionLock('host:revealLastManPart2Question', 500)) return;
    const now = getAuthoritativeNow();
    soundFX.playReveal();
    commitState((prev) => {
      const next = structuredClone(prev);
      const lms = next.round.lastMan;
      if (!lms) return prev;
      const p2List = next.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
      const q = p2List[lms.part2QuestionIndex % p2List.length];
      const active = getActiveTeamIds(next.teams);

      const correctTeams = active
        .filter((tid) => String(next.submissions[tid]?.value || '') === q.correctKey)
        .sort(
          (a, b) =>
            (next.submissions[a]?.submittedAt || Infinity) -
            (next.submissions[b]?.submittedAt || Infinity)
        );

      active.forEach((tid) => {
        const ts = lms.teamStates[tid];
        const sub = next.submissions[tid];
        const cRank = correctTeams.indexOf(tid);
        let delta = 0;
        if (cRank === 0) delta = 3;
        else if (cRank === 1) delta = 2;
        else if (cRank >= 2) delta = 1;
        else if (!sub) delta = -1;
        else delta = 0;

        let nextStep = Math.max(0, ts.step + delta);
        if (ts.isGhost) {
          nextStep = Math.min(24.5, nextStep);
        } else {
          nextStep = Math.min(25, nextStep);
        }
        ts.step = nextStep;
      });

      // Check Ghost Possession
      resolveGhostPossessions(next, now);

      // Move Krampus +1.5 steps
      lms.krampusStep = Math.min(25, lms.krampusStep + 1.5);
      active.forEach((tid) => {
        const ts = lms.teamStates[tid];
        if (!ts.isGhost && ts.step < 25 && lms.krampusStep >= ts.step) {
          ts.isGhost = true;
          ts.hearts = 0;
          ts.jetpacks = 0;
          pushLmsFeed(
            next,
            now,
            '💀',
            `Krampus ไล่ทัน ${next.teams[tid].icon} ${next.teams[tid].name} ที่ขั้น ${ts.step}! กลายเป็นวิญญาณทันที!`
          );
        }
        if (ts.isGhost && lms.krampusStep >= ts.step) {
          ts.step = Math.min(24.5, lms.krampusStep + 1);
        }
      });

      // Check Champion (living team >= 25)
      const champion = active
        .filter((tid) => !lms.teamStates[tid].isGhost && lms.teamStates[tid].step >= 25)
        .sort((a, b) => (next.submissions[a]?.submittedAt || 0) - (next.submissions[b]?.submittedAt || 0))[0];

      if (champion) {
        lms.winnerTeamId = champion;
        lms.phase = 'CHAMPION';
        pushLmsFeed(
          next,
          now,
          '🏆',
          `${next.teams[champion].icon} ${next.teams[champion].name} วิ่งทะลุประตูขั้นที่ 25 คว้าแชมป์ THE KRAMPUS EVE!!`
        );
      } else {
        lms.phase = 'PART2_REVEAL';
      }

      next.round.status = 'REVEALED';
      next.round.timerStartedAt = null;
      next.round.timerEndAt = null;
      next.round.timerRemainingMs = 0;
      return next;
    });
  }, [commitState, getAuthoritativeNow]);

  const nextLastManPart2Question = useCallback(() => {
    if (!acquireActionLock('host:nextLastManPart2Question', 500)) return;
    const now = getAuthoritativeNow();
    commitState((prev) => {
      const next = structuredClone(prev);
      const lms = next.round.lastMan;
      if (!lms) return prev;
      const p2List = next.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
      const nextIdx = (lms.part2QuestionIndex + 1) % p2List.length;
      const q = p2List[nextIdx];
      lms.part2QuestionIndex = nextIdx;
      lms.phase = 'PART2_CLUE';
      next.submissions = {};
      next.round = {
        ...next.round,
        id: `lms-p2-q${nextIdx}-${now}`,
        title: `ช่วงที่ 2 • ข้อที่ ${nextIdx + 1}: บันไดหนีตาย 25 ขั้น`,
        subtitle: 'ขั้นตอนที่ 1: อ่านเบาะแสตั้งต้นก่อนเปิดคำถาม!',
        questionText: q.clueText,
        choiceCount: 3,
        choices: q.choices.map((c) => ({
          key: c.key,
          label: c.label,
          isCorrect: c.key === q.correctKey,
        })),
        correctChoices: [q.correctKey],
        durationSeconds: q.durationSeconds || 60,
        timerStartedAt: null,
        timerEndAt: null,
        timerRemainingMs: null,
        status: 'IDLE',
        rewardsApplied: false,
      };
      return next;
    });
  }, [commitState, getAuthoritativeNow]);

  const updateLastManPart1Question = useCallback(
    (id: string, patch: Partial<LastManPart1Question>) => {
      commitState((prev) => {
        const list = prev.lastManPart1Questions || DEFAULT_LAST_MAN_PART1_QUESTIONS;
        return {
          ...prev,
          lastManPart1Questions: list.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        };
      });
    },
    [commitState]
  );

  const updateLastManPart2Question = useCallback(
    (id: string, patch: Partial<LastManPart2Question>) => {
      commitState((prev) => {
        const list = prev.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
        return {
          ...prev,
          lastManPart2Questions: list.map((q) => (q.id === id ? { ...q, ...patch } : q)),
        };
      });
    },
    [commitState]
  );

  const lmsSoulSacrifice = useCallback(
    (teamId: TeamId) => {
      soundFX.playCoinChange(true);
      dispatchPlayerAction('LMS_SOUL_SACRIFICE', teamId, {});
    },
    [dispatchPlayerAction]
  );

  const lmsMiseryPull = useCallback(
    (teamId: TeamId, targetTeamId: TeamId) => {
      soundFX.playSubmit();
      dispatchPlayerAction('LMS_MISERY_PULL', teamId, { targetTeamId });
    },
    [dispatchPlayerAction]
  );

  const lmsBuyItem = useCallback(
    (teamId: TeamId, itemId: LastManShopItemId, targetTeamId?: TeamId) => {
      soundFX.playCoinChange(false);
      dispatchPlayerAction('LMS_BUY_ITEM', teamId, { itemId, targetTeamId });
    },
    [dispatchPlayerAction]
  );

  const lmsMinigameAction = useCallback(
    (
      teamId: TeamId,
      payload: {
        subType: 'POISON_SET' | 'CHALICE_PICK' | 'SPLIT_STEAL' | 'DARE_VOTE' | 'DEATH_DICE';
        chalices?: number[];
        chalice?: number;
        choice?: 'SPLIT' | 'STEAL';
        vote?: 'SPARE' | 'EXECUTE';
      }
    ) => {
      soundFX.playSubmit();
      dispatchPlayerAction('LMS_MINIGAME_ACTION', teamId, payload as Record<string, unknown>);
    },
    [dispatchPlayerAction]
  );

  const lmsUseJetpack = useCallback(
    (teamId: TeamId) => {
      soundFX.playReveal();
      dispatchPlayerAction('LMS_USE_JETPACK', teamId, {});
    },
    [dispatchPlayerAction]
  );

  const finishLastManStandingGame = useCallback(
    (toFinale = false) => {
      commitState((prev) => ({
        ...prev,
        clearedStages: Array.from(new Set([...(prev.clearedStages || []), 'TRIVIA_MURDER' as GameStage])),
        showLeaderboardOverlay: toFinale,
        round: {
          ...prev.round,
          gameStage: toFinale ? 'FINALE' : 'WORLD_MAP',
          status: 'IDLE',
          timerStartedAt: null,
          timerEndAt: null,
          title: toFinale
            ? 'คำพิพากษาแห่งครามปุส (Nice vs Naughty List)'
            : 'คฤหาสน์ครามปุส (Mansion World Map)',
        },
      }));
    },
    [commitState]
  );

  const setGameStage = useCallback(
    (stage: GameStage, syncPreset: boolean = true) => {
      commitState((prev) => {
        if (stage === 'LOBBY') {
          return {
            ...prev,
            roomLocked: false,
            showLeaderboardOverlay: false,
            showQrOverlay: false,
            round: {
              ...prev.round,
              gameStage: 'LOBBY',
              status: 'IDLE',
              timerStartedAt: null,
              timerEndAt: null,
              title: 'THE KRAMPUS EVE - มหากาพย์การเอาชีวิตรอดในคืนคริสต์มาสอีฟ',
              subtitle: 'รอ Sub-GM ประจำกลุ่มลงทะเบียนเข้าสู่คฤหาสน์ครามปุส...',
            },
          };
        }
        if (stage === 'WORLD_MAP') {
          return {
            ...prev,
            roomLocked: true,
            showLeaderboardOverlay: false,
            showQrOverlay: false,
            round: {
              ...prev.round,
              gameStage: 'WORLD_MAP',
              status: 'IDLE',
              timerStartedAt: null,
              timerEndAt: null,
              title: 'คฤหาสน์ครามปุส (Mansion World Map)',
              subtitle: 'เลือกด่านบททดสอบทั้ง 4 ห้องแห่งคฤหาสน์ครามปุส',
            },
          };
        }
        if (stage === 'FINALE') {
          return {
            ...prev,
            showLeaderboardOverlay: true,
            round: {
              ...prev.round,
              gameStage: 'FINALE',
              timerStartedAt: null,
              timerEndAt: null,
              title: 'คำพิพากษาแห่งครามปุส (Nice vs Naughty List)',
            },
          };
        }
        // If syncPreset is true, load the first preset of that stage so /display badge, title, question, and /play UI all sync in 1 click
        const stagePreset = syncPreset
          ? prev.presets.find((p) => p.gameStage === stage)
          : undefined;

        if (stagePreset) {
          const nextRound = createRoundFromPreset(stagePreset);
          nextRound.status = 'IDLE';
          nextRound.timerStartedAt = null;
          nextRound.timerEndAt = null;
          nextRound.briefingOpen = true;
          return {
            ...prev,
            roomLocked: true,
            showLeaderboardOverlay: false,
            submissions: {},
            buzzerQueue: [],
            round: nextRound,
          };
        }

        return {
          ...prev,
          roomLocked: true,
          round: {
            ...prev.round,
            gameStage: stage,
            status: 'IDLE',
            timerStartedAt: null,
            timerEndAt: null,
            briefingOpen: true,
          },
        };
      });
    },
    [commitState]
  );

  const triggerKrampusAlert = useCallback(
    (msg: string | null) => {
      if (msg) soundFX.playCoinChange(false);
      commitState((prev) => ({
        ...prev,
        krampusAlertMessage: msg,
      }));
    },
    [commitState]
  );

  const toggleSound = useCallback(() => {
    commitState((prev) => ({
      ...prev,
      soundEnabled: !prev.soundEnabled,
    }));
  }, [commitState]);

  const resetAllGameData = useCallback(() => {
    commitState(() => ({
      ...INITIAL_GAME_STATE,
      teams: structuredClone(INITIAL_TEAMS),
      serverTimestamp: Date.now(),
    }));
  }, [commitState]);

  return (
    <GameContext.Provider
      value={{
        state,
        clientRole,
        isHost,
        pendingActions,
        actionSyncError,
        clearActionSyncError,
        lanIp,
        connectionMode,
        isConnected,
        serverTimeOffset: 0,
        getAuthoritativeNow,
        supabaseConfig,
        saveSupabaseConfig,
        registerTeam,
        submitTeamAnswer,
        clearTeamSubmission,
        pressTeamBuzzer,
        startMansionGame,
        loadPreset,
        saveCustomPreset,
        launchFreestyle,
        updateRoundConfig,
        updateChoiceOption,
        toggleDoorOpened,
        shuffleDoors,
        bailoutNiceShield,
        submitSnakeDraftPick,
        finishEightDoorsGame,
        switchEightDoorsSubRound,
        switchChronoSubRound,
        launchChronoTrapGuessPhase,
        placeChronoTraps,
        claimChronoYear,
        finishChronoGame,
        startToyFactoryGame,
        selectToyFactoryDataset,
        startToyFactoryActionPhase,
        triggerToyFactoryShuffle,
        resumeToyFactoryFromBuffer,
        enterToyFactoryRevealPhase,
        judgeToyFactorySlot,
        revealToyFactoryMystery,
        finalizeToyFactoryRound,
        nextToyFactoryRound,
        updateToyFactoryDataset,
        finishToyFactoryGame,
        startLastManStandingGame,
        prepareLastManPart1Round,
        startLastManPart1Trivia,
        revealLastManPart1Trivia,
        autoResolveMiseryPull,
        enterLastManBlackMarket,
        enterLastManMinigame,
        rollKrampusDeathDice,
        revealLastManMinigame,
        advanceFromLastManMinigame,
        triggerLastManFreezeWarning,
        penalizeLastManCurseViolation,
        startLastManPart2Escape,
        openLastManPart2Question,
        revealLastManPart2Question,
        nextLastManPart2Question,
        updateLastManPart1Question,
        updateLastManPart2Question,
        lmsSoulSacrifice,
        lmsMiseryPull,
        lmsBuyItem,
        lmsMinigameAction,
        lmsUseJetpack,
        finishLastManStandingGame,
        resolveSubRound2Auction,
        startTimer,
        pauseTimer,
        resetTimer,
        lockRound,
        revealRound,
        resetRoundSubmissions,
        adjustCoins,
        setExactCoins,
        adjustShields,
        adjustCandles,
        adjustLmsHearts,
        toggleKillingFloor,
        updateTeamProfile,
        undoLastTransaction,
        autoApplyRoundScoring,
        setShowLeaderboardOverlay,
        setShowQrOverlay,
        setGameStage,
        triggerKrampusAlert,
        toggleSound,
        resetAllGameData,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
