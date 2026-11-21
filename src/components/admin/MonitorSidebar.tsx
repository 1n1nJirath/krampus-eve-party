import React, { useState } from 'react';
import {
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Coins,
  FlaskConical,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  DEFAULT_LAST_MAN_PART1_QUESTIONS,
  DEFAULT_LAST_MAN_PART2_QUESTIONS,
  DEFAULT_TOY_FACTORY_DATASETS,
  getSuggestedSafeRange,
  TEAM_ORDER,
} from '../../data/initialData';
import { deriveLiveScreenPhase } from '../../logic/adminFlowLogic';
import { TeamId } from '../../types/game';
import { CountdownTimer } from '../CountdownTimer';
import { SafeActionButton } from '../SafeActionButton';

const QUICK_ALERTS = [
  '🤫 ฟัง Host อธิบายกติกาบนเวทีก่อนนะ!',
  '⏰ เหลือเวลา 10 วินาทีสุดท้าย รีบส่งคำตอบ!',
  '👹 ครามปุสกำลังจ้องมองพวกเจ้าอยู่!',
];

export const MonitorSidebar: React.FC = () => {
  const {
    state,
    registerTeam,
    adjustCoins,
    adjustShields,
    adjustLmsHearts,
    adjustLmsStep,
    toggleKillingFloor,
    undoLastTransaction,
    submitTeamAnswer,
    pressTeamBuzzer,
    clearTeamSubmission,
    resetRoundSubmissions,
    bailoutNiceShield,
    submitSnakeDraftPick,
    undoTeamSnakePick,
    placeChronoTraps,
    claimChronoYear,
    selectToyFactoryDataset,
    triggerToyFactoryShuffle,
    judgeToyFactorySlot,
    lmsSoulSacrifice,
    lmsMiseryPull,
    lmsBuyItem,
    lmsMinigameAction,
    lmsUseJetpack,
    triggerKrampusAlert,
  } = useGame();

  const { round, teams, submissions, buzzerQueue, transactions } = state;
  const livePhase = deriveLiveScreenPhase(round);
  const isLms = round.gameStage === 'TRIVIA_MURDER' && Boolean(round.lastMan);
  const isEightDoors = round.gameStage === 'POLL_MINE' && round.inputMode === 'MODE_A_CHOICE';
  const subRound = round.eightDoorsSubRound || 'SUB1_SURVIVAL';
  const isSnake = isEightDoors && (subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT');
  const isPolarity = isEightDoors && subRound === 'SUB3_POLARITY';
  const isChrono = round.gameStage === 'TIMEJINX';
  const chronoSub = round.chronoSubRound || 'CHRONO_SUB1_CLASSIC';
  const isToyFactory = round.gameStage === 'QUIXORT' && Boolean(round.toyFactory);

  const [expandedTeam, setExpandedTeam] = useState<TeamId | null>(null);
  const [expandAllTeams, setExpandAllTeams] = useState<boolean>(true);
  const [customYearInputs, setCustomYearInputs] = useState<Record<TeamId, string>>({
    team1: '',
    team2: '',
    team3: '',
    team4: '',
  });
  const [selectedCoinTeam, setSelectedCoinTeam] = useState<TeamId | 'ALL'>('team1');
  const [customCoinInput, setCustomCoinInput] = useState('100');
  const [alertDraft, setAlertDraft] = useState(
    '👹 ครามปุสกำลังออกล่า! รักษาเกราะเด็กดีและเหรียญศักดิ์สิทธิ์ของพวกเจ้าให้ดี!'
  );

  const phaseMeta = {
    BRIEFING: {
      badge: '📖 BRIEFING — แสดงหน้ากติกา & Demo',
      cls: 'bg-purple-950/90 border-purple-400 text-purple-200',
      dot: 'bg-purple-400',
    },
    STANDBY: {
      badge: '🟡 STANDBY — ซ่อนโจทย์ • ล็อกปุ่มผู้เล่น',
      cls: 'bg-amber-950/70 border-amber-500/70 text-amber-200',
      dot: 'bg-amber-400',
    },
    LIVE: {
      badge: '🟢 LIVE — เปิดโจทย์ • กำลังรับคำตอบ',
      cls: 'bg-emerald-950/80 border-emerald-400 text-emerald-200',
      dot: 'bg-emerald-400 animate-ping',
    },
    LOCKED: {
      badge: '🟠 LOCKED — ปิดรับคำตอบ • รอเฉลย',
      cls: 'bg-orange-950/80 border-orange-400 text-orange-200',
      dot: 'bg-orange-400',
    },
    REVEALED: {
      badge: '✨ REVEALED — เฉลย & คิดคะแนนแล้ว',
      cls: 'bg-sky-950/80 border-sky-400 text-sky-200',
      dot: 'bg-sky-400',
    },
  }[livePhase];

  const submittedCount = TEAM_ORDER.filter((tid) => Boolean(submissions[tid])).length;

  // Game 1 Helpers
  const activeDoors = round.choices.slice(0, round.choiceCount);
  const suggestedRange = getSuggestedSafeRange(round.choiceCount, subRound);
  const safeMin = round.safeRankMin ?? suggestedRange.min;
  const safeMax = round.safeRankMax ?? suggestedRange.max;
  const rank1DoorKey =
    activeDoors.find((c) => (c.rank ?? 0) === 1)?.key || activeDoors[0]?.key || 'A';
  const rank8DoorKey =
    activeDoors.find((c) => (c.rank ?? 0) === round.choiceCount)?.key ||
    activeDoors.find((c) => (c.rank ?? 0) === 8)?.key ||
    activeDoors[activeDoors.length - 1]?.key ||
    'H';
  const wrongDoorKeys = activeDoors
    .filter((c) => c.key !== rank1DoorKey && c.key !== rank8DoorKey)
    .map((c) => c.key);

  // Game 4 Helpers
  const lms = round.lastMan;
  const lmsP1List = state.lastManPart1Questions || DEFAULT_LAST_MAN_PART1_QUESTIONS;
  const lmsP2List = state.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
  const currentLmsP1Q = lms
    ? lmsP1List[(Math.max(1, lms.part1Round) - 1) % lmsP1List.length]
    : null;
  const currentLmsP2Q = lms ? lmsP2List[lms.part2QuestionIndex % lmsP2List.length] : null;

  // Game 3 Helpers
  const tf = round.toyFactory;
  const tfDatasets = state.toyFactoryDatasets || DEFAULT_TOY_FACTORY_DATASETS;
  const currentTfPair = tf ? tf.pairings[tf.roundIndex - 1] : null;

  // Quick Batch Simulator Handlers
  const handleSimulateAllTeams = () => {
    if (round.gameStage === 'LOBBY') {
      TEAM_ORDER.forEach((tid, idx) => {
        const t = teams[tid];
        registerTeam(
          tid,
          t.name || `Team ${idx + 1}`,
          t.icon || '🛡️',
          t.motto || 'แก๊งเด็กดื้อท้าชนครามปุส!',
          t.roster && t.roster.length > 0 ? t.roster : ['A', 'B', 'C', 'D', 'E']
        );
      });
      return;
    }

    if (isSnake) {
      // Pick 1 unopened door for current snake draft turn team
      const turnTid = round.snakeDraftOrder?.[round.snakeDraftIndex ?? 0] || 'team1';
      const unopened = activeDoors.filter((c) => !c.isOpened);
      if (unopened.length > 0) {
        const pick = unopened[Math.floor(Math.random() * unopened.length)];
        submitSnakeDraftPick(turnTid, pick.key);
      }
      return;
    }

    if (isPolarity) {
      // Team 1: both right, Team 2: only #1 right, Team 3: only #8 right, Team 4: both wrong
      const w1 = wrongDoorKeys[0] || 'C';
      const w2 = wrongDoorKeys[1] || 'D';
      submitTeamAnswer('team1', rank1DoorKey, rank8DoorKey, { force: true });
      submitTeamAnswer('team2', rank1DoorKey, w1, { force: true });
      submitTeamAnswer('team3', w1, rank8DoorKey, { force: true });
      submitTeamAnswer('team4', w1, w2, { force: true });
      return;
    }

    if (isChrono) {
      if (chronoSub === 'CHRONO_SUB2_TRAP' && round.chronoPhase === 'TRAP_PLACEMENT') {
        TEAM_ORDER.forEach((tid, idx) => {
          const quota = round.chronoQuotas?.[tid] ?? 0;
          const targetTid = TEAM_ORDER[(idx + 1) % TEAM_ORDER.length];
          placeChronoTraps(tid, quota > 0 ? { [targetTid]: quota } : {});
        });
        return;
      }
      if (chronoSub === 'CHRONO_SUB3_FAST_FINGER') {
        const offsets = [0, 1, -2, 4];
        TEAM_ORDER.forEach((tid, idx) => {
          claimChronoYear(tid, round.targetYear + offsets[idx]);
        });
        return;
      }
      // Classic & Year Guess
      const offsets = [0, 1, -2, -5];
      TEAM_ORDER.forEach((tid, idx) => {
        submitTeamAnswer(tid, round.targetYear + offsets[idx], undefined, { force: true });
      });
      return;
    }

    if (isLms && lms) {
      if (lms.phase === 'PART1_TRIVIA' && currentLmsP1Q) {
        const correct = currentLmsP1Q.correctKey;
        const wrong =
          currentLmsP1Q.choices.find((c) => c.key !== correct)?.key ||
          (correct === 'A' ? 'B' : 'A');
        // 3 correct, 1 wrong (to test Killing Floor & Misery Pull)
        submitTeamAnswer('team1', correct, undefined, { force: true });
        submitTeamAnswer('team2', correct, undefined, { force: true });
        submitTeamAnswer('team3', correct, undefined, { force: true });
        submitTeamAnswer('team4', wrong, undefined, { force: true });
        return;
      }
      if (lms.phase === 'PART1_MISERY_PULL' && lms.miseryPullTeamId) {
        const target = TEAM_ORDER.find(
          (tid) =>
            tid !== lms.miseryPullTeamId &&
            !lms.teamStates[tid].isGhost &&
            !lms.teamStates[tid].inKillingFloor
        );
        if (target) lmsMiseryPull(lms.miseryPullTeamId, target);
        return;
      }
      if (lms.phase === 'PART1_MINIGAME') {
        TEAM_ORDER.forEach((tid, idx) => {
          const ts = lms.teamStates[tid];
          if (ts.isGhost) return;
          if (lms.part1Round === 1) {
            if (ts.inKillingFloor) {
              lmsMinigameAction(tid, { subType: 'CHALICE_PICK', chalice: (idx % 4) + 1 });
            } else {
              lmsMinigameAction(tid, { subType: 'POISON_SET', chalices: [1, 3] });
            }
          } else if (lms.part1Round === 2 && ts.inKillingFloor) {
            lmsMinigameAction(tid, {
              subType: 'SPLIT_STEAL',
              choice: idx % 2 === 0 ? 'SPLIT' : 'STEAL',
            });
          } else if (lms.part1Round === 3 && !ts.inKillingFloor) {
            lmsMinigameAction(tid, {
              subType: 'DARE_VOTE',
              vote: idx % 2 === 0 ? 'SPARE' : 'EXECUTE',
            });
          } else if (lms.part1Round === 4 && ts.inKillingFloor) {
            lmsMinigameAction(tid, { subType: 'DEATH_DICE' });
          }
        });
        return;
      }
      if (
        (lms.phase === 'PART2_CLUE' ||
          lms.phase === 'PART2_QUESTION' ||
          lms.phase === 'PART2_REVEAL') &&
        currentLmsP2Q
      ) {
        const correct = currentLmsP2Q.correctKey;
        const wrong = correct === 'A' ? 'B' : 'A';
        submitTeamAnswer('team1', correct, undefined, { force: true });
        submitTeamAnswer('team2', correct, undefined, { force: true });
        submitTeamAnswer('team3', correct, undefined, { force: true });
        submitTeamAnswer('team4', wrong, undefined, { force: true });
        return;
      }
    }

    if (round.inputMode === 'MODE_C_BUZZER') {
      TEAM_ORDER.forEach((tid) => pressTeamBuzzer(tid));
      return;
    }

    if (round.inputMode === 'MODE_B_YEAR') {
      const offsets = [0, 1, -2, -5];
      TEAM_ORDER.forEach((tid, idx) => {
        submitTeamAnswer(tid, round.targetYear + offsets[idx], undefined, { force: true });
      });
      return;
    }

    // Default MODE_A_CHOICE
    const validChoices = round.choices.slice(0, round.choiceCount);
    if (validChoices.length > 0) {
      TEAM_ORDER.forEach((tid, idx) => {
        const c = validChoices[idx % validChoices.length];
        submitTeamAnswer(tid, c.key, undefined, { force: true });
      });
    }
  };

  return (
    <aside className="p-3.5 space-y-3.5 text-slate-100">
      {/* 1. LIVE SCREEN STATUS BADGE + COMPACT TIMER */}
      <div className={`rounded-2xl border-2 p-3 space-y-2.5 ${phaseMeta.cls}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${phaseMeta.dot}`} />
            <span className="text-xs font-black truncate">{phaseMeta.badge}</span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 border border-white/15 shrink-0">
            {round.gameStage}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 bg-black/30 rounded-xl px-2.5 py-1.5">
          <div className="min-w-0">
            <div className="text-[10px] text-slate-300 font-semibold truncate">{round.title}</div>
            <div className="text-[11px] font-mono font-bold text-white">
              ส่งแล้ว: {submittedCount}/4 ทีม
            </div>
          </div>
          <CountdownTimer size="sm" autoLockOnZero={true} />
        </div>
      </div>

      {/* 2. GM OMNISCIENCE & ANSWER SIMULATOR / EDITOR */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
            <span>👁️ ตาทิพย์ & แก้คำตอบ</span>
          </h3>
          <button
            type="button"
            onClick={() => setExpandAllTeams((v) => !v)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
              expandAllTeams
                ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {expandAllTeams ? 'ซ่อนแผงแก้คำตอบ' : '✏️ เปิดแก้คำตอบทุกทีม'}
          </button>
        </div>

        {/* QUICK TEST SIMULATOR BAR (Context-aware per game) */}
        <div className="rounded-xl bg-indigo-950/50 border border-indigo-500/40 p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-indigo-200 font-bold">
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3 text-indigo-400" />
              <span>แผงเทสต์ด่วน (Host Simulator)</span>
            </span>
            {isChrono && (
              <span className="font-mono text-amber-300">เฉลย: {round.targetYear}</span>
            )}
            {isPolarity && (
              <span className="font-mono text-amber-300">
                #1={rank1DoorKey} • #8={rank8DoorKey}
              </span>
            )}
            {isSnake && (
              <span className="font-mono text-emerald-300">
                ตาที่ {(round.snakeDraftIndex ?? 0) + 1}/{round.snakeDraftOrder?.length || 8}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={handleSimulateAllTeams}
              className="flex-1 py-1 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[11px] flex items-center justify-center gap-1 shadow transition"
            >
              <Zap className="w-3 h-3" />
              <span>
                {round.gameStage === 'LOBBY'
                  ? 'จำลองลงทะเบียนครบ 4 ทีม'
                  : isSnake
                  ? 'สุ่มเปิดประตูให้คิวปัจจุบัน (1 ตา)'
                  : isChrono &&
                    chronoSub === 'CHRONO_SUB2_TRAP' &&
                    round.chronoPhase === 'TRAP_PLACEMENT'
                  ? 'จำลองวางกับดักครบ 4 ทีม'
                  : isChrono && chronoSub === 'CHRONO_SUB3_FAST_FINGER'
                  ? 'จำลองแย่งล็อกปีครบ 4 ทีม'
                  : isLms && lms?.phase === 'PART1_MINIGAME'
                  ? 'จำลองเล่นมินิเกมครบทุกทีม'
                  : 'จำลองส่งคำตอบครบ 4 ทีม'}
              </span>
            </button>

            {(submittedCount > 0 || buzzerQueue.length > 0) && (
              <button
                type="button"
                onClick={resetRoundSubmissions}
                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-red-950 text-red-300 border border-slate-700 text-[10px] font-bold flex items-center gap-1"
                title="ล้างคำตอบของทุกทีมในรอบนี้"
              >
                <Trash2 className="w-3 h-3" />
                <span>ล้างทั้งหมด</span>
              </button>
            )}
          </div>

          {/* Extra Game 3 Reveal Judge Quick Simulator */}
          {isToyFactory && tf?.phase === 'REVEAL_JUDGE' && (
            <div className="grid grid-cols-2 gap-1 pt-1">
              <button
                type="button"
                onClick={() =>
                  tf.revealSlots.forEach((_, idx) => judgeToyFactorySlot(idx, 'CORRECT'))
                }
                className="py-1 rounded bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-[10px] font-bold"
              >
                ✅ ติ๊กถูกทุกช่อง (5/5)
              </button>
              <button
                type="button"
                onClick={() =>
                  tf.revealSlots.forEach((_, idx) =>
                    judgeToyFactorySlot(idx, idx < 3 ? 'CORRECT' : 'WRONG')
                  )
                }
                className="py-1 rounded bg-amber-800/80 hover:bg-amber-700 text-amber-100 text-[10px] font-bold"
              >
                ⚠️ ให้ผิด 2 ช่อง (3/5)
              </button>
            </div>
          )}
        </div>

        {/* 4 TEAM CARDS WITH INLINE ANSWER EDITORS */}
        <div className="space-y-2">
          {TEAM_ORDER.map((tid) => {
            const t = teams[tid];
            const sub = submissions[tid];
            const buzz = buzzerQueue.find((b) => b.teamId === tid);
            const lmsState = isLms ? round.lastMan?.teamStates[tid] : null;
            const snakePicks = (round.snakeDraftPicks || []).filter((p) => p.teamId === tid);
            const snakeTurnTid = isSnake
              ? round.snakeDraftOrder?.[round.snakeDraftIndex ?? 0]
              : null;
            const isOpen = expandAllTeams || expandedTeam === tid;

            // Current traps placed by this team in Game 2 Sub 2
            const placedByTeam = round.chronoTrapsPlaced?.[tid] || {};
            const placedSum = Object.values(placedByTeam).reduce((acc, v) => acc + (v || 0), 0);
            const trapQuota = round.chronoQuotas?.[tid] ?? 0;

            return (
              <div
                key={tid}
                className={`rounded-xl border p-2.5 transition ${
                  sub || buzz || snakeTurnTid === tid
                    ? 'bg-amber-950/20 border-amber-500/60'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base shrink-0">{t.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-white truncate">
                        T{t.number} {t.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono">
                        {t.coins < 0 ? (
                          <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-500 font-black animate-pulse">
                            ⛓️ หนี้ {t.coins.toLocaleString()} ฿
                          </span>
                        ) : (
                          <span className="text-amber-300 font-bold">
                            {t.coins.toLocaleString()} ฿
                          </span>
                        )}
                        <span className="text-slate-600">•</span>
                        {lmsState ? (
                          <span className="text-rose-300 font-bold">
                            {lmsState.isGhost ? '👻 ผี' : `❤️${lmsState.hearts}/4`} • ขั้น{' '}
                            {lmsState.step}
                          </span>
                        ) : (
                          <span
                            className={
                              t.shields <= 0 ? 'text-red-400 font-bold' : 'text-sky-300'
                            }
                          >
                            {t.shields <= 0 ? '💔 0🛡️' : `🛡️×${t.shields}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Answer / Status Pill */}
                    {round.inputMode === 'MODE_C_BUZZER' ? (
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                          buzz
                            ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                            : 'bg-slate-900 border border-slate-700 text-slate-400'
                        }`}
                      >
                        {buzz ? `🔔 #${buzz.rank}` : 'รอ...'}
                      </span>
                    ) : isSnake ? (
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                          snakeTurnTid === tid
                            ? 'bg-emerald-500 text-slate-950 animate-pulse'
                            : snakePicks.length > 0
                            ? 'bg-amber-500/20 border border-amber-400/50 text-amber-200'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {snakeTurnTid === tid
                          ? '🎯 ตาเลือก!'
                          : snakePicks.length > 0
                          ? snakePicks.map((p) => `${p.doorKey}(#${p.rank})`).join(' ')
                          : 'รอคิว...'}
                      </span>
                    ) : sub ? (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 font-mono text-[10px] font-bold max-w-[115px] truncate">
                        🔒{' '}
                        {isPolarity
                          ? `#1:${sub.value} / #8:${sub.secondaryValue || '?'}`
                          : isChrono &&
                            chronoSub === 'CHRONO_SUB2_TRAP' &&
                            round.chronoPhase === 'TRAP_PLACEMENT'
                          ? `วาง ${sub.value} ลูก`
                          : String(sub.value)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                        💭 รอส่ง...
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (expandAllTeams) {
                          setExpandAllTeams(false);
                          setExpandedTeam(tid);
                        } else {
                          setExpandedTeam(expandedTeam === tid ? null : tid);
                        }
                      }}
                      className={`p-1 rounded-lg border text-xs transition ${
                        isOpen
                          ? 'bg-amber-400 text-slate-950 border-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                      }`}
                      title="เปิด/ปิดแผงแก้ไขคำตอบของทีมนี้"
                    >
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Override & Answer Editor Panel */}
                {isOpen && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-2 text-[11px]">
                    {/* Top Row: Shields, LMS Hearts, Killing Floor, Clear Submission */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">🛡️:</span>
                        <button
                          type="button"
                          onClick={() => adjustShields(tid, -1)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-red-300 font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-white">{t.shields}</span>
                        <button
                          type="button"
                          onClick={() => adjustShields(tid, 1)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold"
                        >
                          +
                        </button>
                      </div>

                      {lmsState && (
                        <>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">❤️:</span>
                            <button
                              type="button"
                              onClick={() => adjustLmsHearts(tid, -1)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-red-300 font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-rose-300">
                              {lmsState.isGhost ? '💀' : lmsState.hearts}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustLmsHearts(tid, 1)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">ขั้น:</span>
                            <button
                              type="button"
                              onClick={() => adjustLmsStep(tid, -1)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-red-300 font-bold"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-amber-300">
                              {lmsState.step}
                            </span>
                            <button
                              type="button"
                              onClick={() => adjustLmsStep(tid, 1)}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold"
                            >
                              +
                            </button>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleKillingFloor(tid)}
                        className={`px-2 py-0.5 rounded font-bold border ${
                          t.isInKillingFloor || lmsState?.inKillingFloor
                            ? 'bg-red-600 text-white border-red-300'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        💀 ลานประหาร
                      </button>

                      {(sub || buzz) && (
                        <button
                          type="button"
                          onClick={() => clearTeamSubmission(tid)}
                          className="px-2 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-300 border border-red-700/60 font-bold"
                        >
                          ล้างคำตอบ
                        </button>
                      )}
                    </div>

                    {t.coins < 0 && (
                      <button
                        type="button"
                        onClick={() => adjustCoins(tid, Math.abs(t.coins), 'GM ล้างหนี้บาป')}
                        className="w-full py-1 rounded bg-amber-950/80 hover:bg-amber-900 border border-amber-500/80 text-amber-200 font-bold flex items-center justify-center gap-1 transition"
                      >
                        <span>✨ ล้างหนี้บาป (ปลดหนี้ {t.coins.toLocaleString()} ฿ เป็น 0)</span>
                      </button>
                    )}

                    {/* ====================================================
                        GAME-SPECIFIC ANSWER EDITORS FOR HOST TESTING
                    ==================================================== */}

                    {/* 0. LOBBY REGISTRATION OVERRIDE */}
                    {round.gameStage === 'LOBBY' && (
                      <div className="flex items-center justify-between gap-1.5 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-300">
                          สถานะ: {t.isRegistered ? '✅ ลงทะเบียนแล้ว' : '⏳ ยังไม่ลงทะเบียน'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            registerTeam(
                              tid,
                              t.name,
                              t.icon,
                              t.motto || 'พร้อมลุย!',
                              t.roster && t.roster.length > 0
                                ? t.roster
                                : ['สมาชิก 1', 'สมาชิก 2', 'สมาชิก 3', 'สมาชิก 4', 'สมาชิก 5']
                            )
                          }
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]"
                        >
                          ✅ จำลองลงทะเบียนทีมนี้
                        </button>
                      </div>
                    )}

                    {/* 1A. GAME 1: SNAKE DRAFT (SUB 1 & SUB 2) */}
                    {isSnake && (
                      <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-amber-300">
                            🚪 เลือก/แก้ประตู Snake Draft (โซนถูก #{safeMin}-#{safeMax}):
                          </span>
                          {snakePicks.length > 0 && (
                            <button
                              type="button"
                              onClick={() => undoTeamSnakePick(tid)}
                              className="px-1.5 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-700 text-[10px] font-bold flex items-center gap-0.5"
                              title="ยกเลิกประตูบานล่าสุดที่ทีมนี้เปิดและคืนค่าคะแนน/เกราะ"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>ยกเลิกบานล่าสุด</span>
                            </button>
                          )}
                        </div>

                        {t.shields <= 0 && (
                          <button
                            type="button"
                            onClick={() => bailoutNiceShield(tid)}
                            className="w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px]"
                          >
                            🛡️ กด Bailout ไถ่เกราะ (-500 ฿ ➔ +2 🛡️)
                          </button>
                        )}

                        <div className="flex flex-wrap gap-1">
                          {activeDoors.map((c, idx) => {
                            const rnk = c.rank ?? idx + 1;
                            const isSafe = rnk >= safeMin && rnk <= safeMax;
                            const pickedByThisTeam = snakePicks.some((p) => p.doorKey === c.key);
                            return (
                              <button
                                key={c.key}
                                type="button"
                                disabled={Boolean(c.isOpened)}
                                onClick={() => submitSnakeDraftPick(tid, c.key)}
                                className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border transition ${
                                  pickedByThisTeam
                                    ? 'bg-amber-400 text-slate-950 border-white'
                                    : c.isOpened
                                    ? 'bg-slate-950 text-slate-600 border-slate-800 line-through cursor-not-allowed'
                                    : isSafe
                                    ? 'bg-emerald-950/80 hover:bg-emerald-600 text-emerald-200 border-emerald-600/60'
                                    : 'bg-rose-950/60 hover:bg-rose-600 text-rose-200 border-rose-700/60'
                                }`}
                                title={`ประตู ${c.key}: อันดับ #${rnk} (${
                                  isSafe ? 'ปลอดภัย +300฿' : 'กับดัก -1🛡️'
                                })`}
                              >
                                {c.key}(#{rnk}
                                {isSafe ? '✓' : '✗'})
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 1B. GAME 1: SUB 3 POLARITY (#1 & #8) */}
                    {isPolarity && (
                      <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-amber-300">
                            ⚖️ แก้คำตอบคู่ขั้วตรงข้าม (#1 & #8):
                          </span>
                          <span className="font-mono text-slate-400">
                            เฉลย: #1={rank1DoorKey}, #8={rank8DoorKey}
                          </span>
                        </div>

                        {/* Quick 1-click polarity outcome presets */}
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              submitTeamAnswer(tid, rank1DoorKey, rank8DoorKey, { force: true })
                            }
                            className="py-1 rounded bg-emerald-900/80 hover:bg-emerald-700 text-emerald-200 border border-emerald-600/60 font-bold text-[10px]"
                          >
                            ✅ ถูกคู่ (+700)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              submitTeamAnswer(tid, rank1DoorKey, wrongDoorKeys[0] || 'C', {
                                force: true,
                              })
                            }
                            className="py-1 rounded bg-amber-900/80 hover:bg-amber-700 text-amber-200 border border-amber-600/60 font-bold text-[10px]"
                          >
                            🌓 ถูก 1 (+300)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              submitTeamAnswer(
                                tid,
                                wrongDoorKeys[0] || 'C',
                                wrongDoorKeys[1] || 'D',
                                { force: true }
                              )
                            }
                            className="py-1 rounded bg-rose-950 hover:bg-rose-800 text-rose-200 border border-rose-700/60 font-bold text-[10px]"
                          >
                            ❌ ผิดคู่ (0)
                          </button>
                        </div>

                        {/* Granular #1 Door Selector */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-emerald-300 font-bold w-12">
                            เลือก #1:
                          </span>
                          {activeDoors.map((c) => {
                            const selected1 = String(sub?.value || '') === c.key;
                            const isTrue1 = c.key === rank1DoorKey;
                            return (
                              <button
                                key={`p1-${c.key}`}
                                type="button"
                                onClick={() =>
                                  submitTeamAnswer(
                                    tid,
                                    c.key,
                                    sub?.secondaryValue || rank8DoorKey,
                                    { force: true }
                                  )
                                }
                                className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                  selected1
                                    ? 'bg-emerald-400 text-slate-950 border-white'
                                    : isTrue1
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {c.key}
                                {isTrue1 ? '★' : ''}
                              </button>
                            );
                          })}
                        </div>

                        {/* Granular #8 Door Selector */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-rose-300 font-bold w-12">
                            เลือก #8:
                          </span>
                          {activeDoors.map((c) => {
                            const selected8 = String(sub?.secondaryValue || '') === c.key;
                            const isTrue8 = c.key === rank8DoorKey;
                            return (
                              <button
                                key={`p8-${c.key}`}
                                type="button"
                                onClick={() =>
                                  submitTeamAnswer(
                                    tid,
                                    String(sub?.value || rank1DoorKey),
                                    c.key,
                                    { force: true }
                                  )
                                }
                                className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${
                                  selected8
                                    ? 'bg-rose-400 text-slate-950 border-white'
                                    : isTrue8
                                    ? 'bg-rose-950 text-rose-300 border-rose-500'
                                    : 'bg-slate-800 text-slate-300 border-slate-700'
                                }`}
                              >
                                {c.key}
                                {isTrue8 ? '★' : ''}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* 2A. GAME 2: TIME TRAP PLACEMENT PHASE */}
                    {isChrono &&
                      chronoSub === 'CHRONO_SUB2_TRAP' &&
                      round.chronoPhase === 'TRAP_PLACEMENT' && (
                        <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-amber-300">
                              🪤 วางกับดักเวลา (โควตา {trapQuota} ลูก):
                            </span>
                            <span className="font-mono text-emerald-300">
                              วางแล้ว {placedSum}/{trapQuota}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {TEAM_ORDER.filter((targetTid) => targetTid !== tid).map(
                              (targetTid) => {
                                const currentOnTarget = placedByTeam[targetTid] || 0;
                                return (
                                  <button
                                    key={targetTid}
                                    type="button"
                                    onClick={() => {
                                      const nextCount =
                                        currentOnTarget >= Math.max(1, trapQuota)
                                          ? 0
                                          : currentOnTarget + 1;
                                      placeChronoTraps(tid, {
                                        ...placedByTeam,
                                        [targetTid]: nextCount,
                                      });
                                    }}
                                    className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                                      currentOnTarget > 0
                                        ? 'bg-amber-500 text-slate-950 border-white'
                                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                    }`}
                                  >
                                    แกล้ง T{teams[targetTid].number} ({currentOnTarget} ลูก)
                                  </button>
                                );
                              }
                            )}
                            <button
                              type="button"
                              onClick={() => placeChronoTraps(tid, {})}
                              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
                            >
                              วาง 0 (ผ่าน)
                            </button>
                          </div>
                        </div>
                      )}

                    {/* 2B. GAME 2: YEAR INPUT (CLASSIC, TRAP YEAR GUESS, FAST FINGER) & GENERIC MODE_B_YEAR */}
                    {((isChrono &&
                      !(
                        chronoSub === 'CHRONO_SUB2_TRAP' &&
                        round.chronoPhase === 'TRAP_PLACEMENT'
                      )) ||
                      (!isChrono && round.inputMode === 'MODE_B_YEAR')) && (
                      <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-amber-300">
                            {chronoSub === 'CHRONO_SUB3_FAST_FINGER'
                              ? '⚡ ล็อก/แก้ปี Fast Finger:'
                              : '⏳ ส่ง/แก้ปีที่ทาย:'}
                          </span>
                          <span className="font-mono text-slate-400">
                            เฉลย: {round.targetYear}
                          </span>
                        </div>

                        {/* Quick Year Presets */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            {
                              label: `🎯 ${round.targetYear}`,
                              val: round.targetYear,
                              cls: 'bg-emerald-900/80 text-emerald-200 border-emerald-600/60',
                            },
                            {
                              label: `+1 (${round.targetYear + 1})`,
                              val: round.targetYear + 1,
                              cls: 'bg-sky-900/80 text-sky-200 border-sky-600/60',
                            },
                            {
                              label: `-1 (${round.targetYear - 1})`,
                              val: round.targetYear - 1,
                              cls: 'bg-sky-900/80 text-sky-200 border-sky-600/60',
                            },
                            {
                              label: `+2 (${round.targetYear + 2})`,
                              val: round.targetYear + 2,
                              cls: 'bg-slate-800 text-slate-200 border-slate-700',
                            },
                            {
                              label: `-5 (${round.targetYear - 5})`,
                              val: round.targetYear - 5,
                              cls: 'bg-rose-950 text-rose-200 border-rose-700/60',
                            },
                          ].map((opt) => {
                            const isCurrent = Number(sub?.value) === opt.val;
                            return (
                              <button
                                key={opt.label}
                                type="button"
                                onClick={() => {
                                  if (isChrono && chronoSub === 'CHRONO_SUB3_FAST_FINGER') {
                                    claimChronoYear(tid, opt.val);
                                  } else {
                                    submitTeamAnswer(tid, opt.val, undefined, { force: true });
                                  }
                                }}
                                className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border transition ${
                                  isCurrent
                                    ? 'bg-amber-400 text-slate-950 border-white'
                                    : `${opt.cls} hover:bg-amber-400 hover:text-slate-950`
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Year Direct Input */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={customYearInputs[tid] ?? ''}
                            onChange={(e) =>
                              setCustomYearInputs((prev) => ({
                                ...prev,
                                [tid]: e.target.value,
                              }))
                            }
                            placeholder={`พิมพ์ปี (เช่น ${round.targetYear})`}
                            className="flex-1 min-w-0 px-2 py-1 rounded bg-slate-950 border border-slate-700 font-mono text-[11px] text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const parsed = Number(customYearInputs[tid]);
                              const finalYear = Number.isFinite(parsed) && customYearInputs[tid] !== ''
                                ? parsed
                                : round.targetYear;
                              if (isChrono && chronoSub === 'CHRONO_SUB3_FAST_FINGER') {
                                claimChronoYear(tid, finalYear);
                              } else {
                                submitTeamAnswer(tid, finalYear, undefined, { force: true });
                              }
                            }}
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px]"
                          >
                            💾 บันทึกปี
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 3. GAME 3: TOY FACTORY CHAOS OVERRIDES */}
                    {isToyFactory && tf && currentTfPair && (
                      <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        <div className="text-[10px] font-bold text-amber-300">
                          ⚙️ บทบาท:{' '}
                          {currentTfPair.sortingTeamId === tid
                            ? '🔧 ทีมเรียงลำดับ'
                            : currentTfPair.holdingTeamId === tid
                            ? '📋 ทีมถือโพยข้อมูล'
                            : '👀 ทีมผู้ชม (มีสิทธิ์กด SHUFFLE!)'}
                        </div>

                        {currentTfPair.sortingTeamId === tid && (
                          <div className="flex flex-wrap gap-1">
                            {tfDatasets.map((ds, idx) => (
                              <button
                                key={ds.id}
                                type="button"
                                onClick={() => selectToyFactoryDataset(tid, ds.id)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                  tf.selectedDatasetId === ds.id
                                    ? 'bg-amber-400 text-slate-950 border-white'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                }`}
                              >
                                หัวข้อ #{idx + 1}
                              </button>
                            ))}
                          </div>
                        )}

                        {currentTfPair.sortingTeamId !== tid &&
                          currentTfPair.holdingTeamId !== tid && (
                            <button
                              type="button"
                              onClick={() => triggerToyFactoryShuffle(tid)}
                              className="w-full py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-black text-[10px]"
                            >
                              🔀 กดปุ่ม SHUFFLE! สลับโพยป่วนแทนทีมนี้
                            </button>
                          )}
                      </div>
                    )}

                    {/* 4. GAME 4: LAST MAN STANDING SPECIFIC EDITORS */}
                    {isLms && lms && lmsState && (
                      <div className="space-y-1.5 bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                        {/* 4A. Misery Pull */}
                        {lms.phase === 'PART1_MISERY_PULL' && lms.miseryPullTeamId === tid && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-rose-300">
                              🪝 เลือกทีมที่จะลากลงลานประหาร:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {TEAM_ORDER.filter(
                                (targetTid) =>
                                  targetTid !== tid &&
                                  !lms.teamStates[targetTid].isGhost &&
                                  !lms.teamStates[targetTid].inKillingFloor
                              ).map((targetTid) => (
                                <button
                                  key={targetTid}
                                  type="button"
                                  onClick={() => lmsMiseryPull(tid, targetTid)}
                                  className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px]"
                                >
                                  🪝 ลาก T{teams[targetTid].number}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4B. Black Market Quick Actions */}
                        {lms.phase === 'PART1_BLACK_MARKET' && !lmsState.isGhost && (
                          <div className="space-y-1">
                            <div className="text-[10px] font-bold text-amber-300">
                              🛒 จำลองซื้อของตลาดมืด / ขายวิญญาณ:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <button
                                type="button"
                                onClick={() => lmsSoulSacrifice(tid)}
                                className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-800 text-rose-200 border border-rose-700 text-[10px] font-bold"
                              >
                                💔 ขายวิญญาณ (+500฿)
                              </button>
                              <button
                                type="button"
                                onClick={() => lmsBuyItem(tid, 'MIRROR_SHIELD')}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-200 border border-slate-700 text-[10px] font-bold"
                              >
                                🪞 โล่กระจก
                              </button>
                              <button
                                type="button"
                                onClick={() => lmsBuyItem(tid, 'REVIVE_POTION')}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-slate-700 text-[10px] font-bold"
                              >
                                🧪 ยาชุบ (+1❤️)
                              </button>
                              <button
                                type="button"
                                onClick={() => lmsBuyItem(tid, 'JETPACK')}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-700 text-[10px] font-bold"
                              >
                                🚀 ไอพ่น
                              </button>
                              {lmsState.inKillingFloor && (
                                <button
                                  type="button"
                                  onClick={() => lmsBuyItem(tid, 'EXECUTIONER_BRIBE')}
                                  className="px-2 py-0.5 rounded bg-amber-700 hover:bg-amber-600 text-white text-[10px] font-bold"
                                >
                                  💰 ยัดสินบนหนีตาย
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 4C. Part 1 Minigames (Round 1..4) */}
                        {lms.phase === 'PART1_MINIGAME' && !lmsState.isGhost && (
                          <div className="space-y-1">
                            {lms.part1Round === 1 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="text-[10px] text-amber-300 font-bold">
                                  {lmsState.inKillingFloor ? '🍷 เลือกดื่มแก้ว:' : '☠️ วางยาพิษแก้ว:'}
                                </span>
                                {[1, 2, 3, 4].map((ch) => {
                                  const picked = lmsState.inKillingFloor
                                    ? lms.chalicePicks[tid] === ch
                                    : (lms.poisonedChalices || []).includes(ch);
                                  return (
                                    <button
                                      key={ch}
                                      type="button"
                                      onClick={() =>
                                        lmsState.inKillingFloor
                                          ? lmsMinigameAction(tid, {
                                              subType: 'CHALICE_PICK',
                                              chalice: ch,
                                            })
                                          : lmsMinigameAction(tid, {
                                              subType: 'POISON_SET',
                                              chalices: [ch],
                                            })
                                      }
                                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${
                                        picked
                                          ? 'bg-amber-400 text-slate-950 border-white'
                                          : 'bg-slate-800 text-white border-slate-700'
                                      }`}
                                    >
                                      แก้ว #{ch}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {lms.part1Round === 2 && lmsState.inKillingFloor && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-amber-300 font-bold">
                                  เลือกว่าจะ:
                                </span>
                                {(['SPLIT', 'STEAL'] as const).map((choice) => (
                                  <button
                                    key={choice}
                                    type="button"
                                    onClick={() =>
                                      lmsMinigameAction(tid, { subType: 'SPLIT_STEAL', choice })
                                    }
                                    className={`px-2.5 py-0.5 rounded font-bold text-[10px] border ${
                                      lms.splitStealPicks[tid] === choice
                                        ? 'bg-amber-400 text-slate-950 border-white'
                                        : 'bg-slate-800 text-white border-slate-700'
                                    }`}
                                  >
                                    {choice === 'SPLIT' ? '🤝 SPLIT (แบ่ง)' : '🗡️ STEAL (หักหลัง)'}
                                  </button>
                                ))}
                              </div>
                            )}

                            {lms.part1Round === 3 && !lmsState.inKillingFloor && (
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-amber-300 font-bold">
                                  โหวตชะตา:
                                </span>
                                {(['SPARE', 'EXECUTE'] as const).map((vote) => (
                                  <button
                                    key={vote}
                                    type="button"
                                    onClick={() =>
                                      lmsMinigameAction(tid, { subType: 'DARE_VOTE', vote })
                                    }
                                    className={`px-2.5 py-0.5 rounded font-bold text-[10px] border ${
                                      lms.dareVotes[tid] === vote
                                        ? 'bg-amber-400 text-slate-950 border-white'
                                        : 'bg-slate-800 text-white border-slate-700'
                                    }`}
                                  >
                                    {vote === 'SPARE' ? '🕊️ ไว้ชีวิต' : '🪓 ประหาร'}
                                  </button>
                                ))}
                              </div>
                            )}

                            {lms.part1Round === 4 && lmsState.inKillingFloor && (
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-amber-300 font-bold">
                                  🎲 แต้มเต๋าทีมนี้: {lms.teamDiceRolls[tid] ?? 'ยังไม่ทอย'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    lmsMinigameAction(tid, { subType: 'DEATH_DICE' })
                                  }
                                  className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px]"
                                >
                                  🎲 ทอยเต๋าแทนทีมนี้
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 4D. Part 2 Jetpack */}
                        {lms.phase.startsWith('PART2_') && lmsState.jetpacks > 0 && (
                          <button
                            type="button"
                            onClick={() => lmsUseJetpack(tid)}
                            className="w-full py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-black text-[10px]"
                          >
                            🚀 กดใช้พลุไอพ่น (+3 ขั้น) [มี {lmsState.jetpacks} ลูก]
                          </button>
                        )}
                      </div>
                    )}

                    {/* STANDARD MULTIPLE CHOICE EDITOR (MODE_A_CHOICE outside Snake/Polarity) */}
                    {round.inputMode === 'MODE_A_CHOICE' && !isSnake && !isPolarity && (
                      <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
                        <span className="text-slate-400 text-[10px] mr-1">✏️ แก้คำตอบ:</span>
                        {round.choices.slice(0, round.choiceCount).map((c) => {
                          const isSelected = String(sub?.value || '') === c.key;
                          const isCorrect =
                            Boolean(c.isCorrect) || round.correctChoices.includes(c.key);
                          return (
                            <button
                              key={c.key}
                              type="button"
                              onClick={() =>
                                submitTeamAnswer(tid, c.key, undefined, { force: true })
                              }
                              className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border transition ${
                                isSelected
                                  ? 'bg-amber-400 text-slate-950 border-white'
                                  : isCorrect
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/70 hover:bg-emerald-500 hover:text-slate-950'
                                  : 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-white border-slate-700'
                              }`}
                              title={isCorrect ? `ตัวเลือก ${c.key} (คำตอบที่ถูก ✓)` : `ตัวเลือก ${c.key}`}
                            >
                              {c.key}
                              {isCorrect ? '✓' : ''}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* BUZZER OVERRIDE */}
                    {round.inputMode === 'MODE_C_BUZZER' && (
                      <button
                        type="button"
                        onClick={() => pressTeamBuzzer(tid)}
                        className="w-full py-1 rounded bg-red-900/70 hover:bg-red-800 text-amber-200 font-bold"
                      >
                        🔔 กดกระดิ่งแทน Team {t.number}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. QUICK SCORE ADJUSTER & UNDO */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
            <Coins className="w-4 h-4" />
            <span>ปรับคะแนนด่วน</span>
          </div>
          <SafeActionButton
            type="button"
            loadingText="กำลัง Undo..."
            onClick={undoLastTransaction}
            disabled={transactions.length === 0}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-[11px] font-bold text-amber-300 border border-slate-700 flex items-center gap-1 transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo ({transactions.length})</span>
          </SafeActionButton>
        </div>

        {/* Target Team Selector */}
        <div className="grid grid-cols-5 gap-1">
          {([...TEAM_ORDER, 'ALL'] as Array<TeamId | 'ALL'>).map((tid) => (
            <button
              key={tid}
              type="button"
              onClick={() => setSelectedCoinTeam(tid)}
              className={`py-1 rounded-lg text-[11px] font-mono font-black border transition ${
                selectedCoinTeam === tid
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
              }`}
            >
              {tid === 'ALL' ? 'ALL' : `T${teams[tid].number}`}
            </button>
          ))}
        </div>

        {/* +100 / +300 / -100 / -300 Quick Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {[100, 300, -100, -300].map((amt) => (
            <SafeActionButton
              key={amt}
              type="button"
              showSpinner={false}
              onClick={() =>
                adjustCoins(
                  selectedCoinTeam,
                  amt,
                  `GM ปรับ ${amt > 0 ? `+${amt}` : amt} ฿ (${
                    selectedCoinTeam === 'ALL' ? 'ทุกทีม' : teams[selectedCoinTeam].name
                  })`
                )
              }
              className={`py-1.5 rounded-lg font-mono text-xs font-black border transition ${
                amt > 0
                  ? 'bg-emerald-950/90 hover:bg-emerald-800 border-emerald-600/60 text-emerald-300'
                  : 'bg-red-950/90 hover:bg-red-800 border-red-600/60 text-red-300'
              }`}
            >
              {amt > 0 ? `+${amt}` : amt}
            </SafeActionButton>
          ))}
        </div>

        {/* Custom Delta Input */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={customCoinInput}
            onChange={(e) => setCustomCoinInput(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-white text-center"
            placeholder="จำนวน ฿"
          />
          <SafeActionButton
            type="button"
            showSpinner={false}
            onClick={() =>
              adjustCoins(
                selectedCoinTeam,
                Math.abs(Number(customCoinInput) || 0),
                'ปรับเพิ่มระบุจำนวนโดย GM'
              )
            }
            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1"
            title="บวกตามจำนวนที่กรอก"
          >
            <Plus className="w-3.5 h-3.5" />
          </SafeActionButton>
          <SafeActionButton
            type="button"
            showSpinner={false}
            onClick={() =>
              adjustCoins(
                selectedCoinTeam,
                -Math.abs(Number(customCoinInput) || 0),
                'หักยอดระบุจำนวนโดย GM'
              )
            }
            className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1"
            title="ลบตามจำนวนที่กรอก"
          >
            <Minus className="w-3.5 h-3.5" />
          </SafeActionButton>
        </div>

        {transactions[0] && (
          <div className="text-[10px] text-slate-400 truncate bg-slate-950 rounded-lg px-2 py-1 border border-slate-800">
            ล่าสุด: {transactions[0].reason}
          </div>
        )}
      </div>

      {/* 4. QUICK BROADCAST */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 space-y-2">
        <div className="text-[11px] font-extrabold text-red-400 uppercase flex items-center gap-1.5">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Quick Broadcast ขึ้นจอ /display</span>
        </div>

        <div className="flex gap-1.5">
          <input
            type="text"
            value={alertDraft}
            onChange={(e) => setAlertDraft(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
            placeholder="พิมพ์ข้อความประกาศ..."
          />
          <SafeActionButton
            type="button"
            showSpinner={false}
            onClick={() => triggerKrampusAlert(state.krampusAlertMessage ? null : alertDraft)}
            className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 transition ${
              state.krampusAlertMessage
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            {state.krampusAlertMessage ? 'ปิดประกาศ' : 'ยิงขึ้นจอ!'}
          </SafeActionButton>
        </div>

        <div className="flex flex-wrap gap-1">
          {QUICK_ALERTS.map((msg) => (
            <button
              key={msg}
              type="button"
              onClick={() => {
                setAlertDraft(msg);
                triggerKrampusAlert(msg);
              }}
              className="px-2 py-0.5 rounded bg-slate-950 hover:bg-red-950/60 border border-slate-800 text-[10px] text-slate-300 truncate max-w-full"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
