import React, { useState } from 'react';
import {
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Coins,
  Minus,
  Plus,
  Undo2,
  Zap,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { TEAM_ORDER } from '../../data/initialData';
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
    adjustCoins,
    adjustShields,
    adjustLmsHearts,
    toggleKillingFloor,
    undoLastTransaction,
    submitTeamAnswer,
    pressTeamBuzzer,
    clearTeamSubmission,
    triggerKrampusAlert,
  } = useGame();

  const { round, teams, submissions, buzzerQueue, transactions } = state;
  const livePhase = deriveLiveScreenPhase(round);
  const isLms = round.gameStage === 'TRIVIA_MURDER' && Boolean(round.lastMan);
  const isEightDoors = round.gameStage === 'POLL_MINE' && round.inputMode === 'MODE_A_CHOICE';
  const subRound = round.eightDoorsSubRound || 'SUB1_SURVIVAL';
  const isSnake = isEightDoors && (subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT');

  const [expandedTeam, setExpandedTeam] = useState<TeamId | null>(null);
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

      {/* 2. GM OMNISCIENCE: 4 TEAMS LIVE STATUS */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
            👁️ ตาทิพย์ GM (4 ทีม Realtime)
          </h3>
          <span className="text-[10px] text-slate-400">กด ⚡ เพื่อส่ง/แก้แทนทีม</span>
        </div>

        <div className="space-y-2">
          {TEAM_ORDER.map((tid) => {
            const t = teams[tid];
            const sub = submissions[tid];
            const buzz = buzzerQueue.find((b) => b.teamId === tid);
            const lmsState = isLms ? round.lastMan?.teamStates[tid] : null;
            const snakePicks = (round.snakeDraftPicks || []).filter((p) => p.teamId === tid);
            const snakeTurnTid =
              isSnake && round.status === 'ACTIVE'
                ? round.snakeDraftOrder?.[round.snakeDraftIndex ?? 0]
                : null;
            const isOpen = expandedTeam === tid;

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
                            {lmsState.isGhost ? '👻 ผี' : `❤️${lmsState.hearts}/4`}
                          </span>
                        ) : (
                          <span className={t.shields <= 0 ? 'text-red-400 font-bold' : 'text-sky-300'}>
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
                        {isEightDoors && subRound === 'SUB3_POLARITY'
                          ? `${sub.value}/${sub.secondaryValue}`
                          : String(sub.value)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                        💭 Thinking...
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => setExpandedTeam(isOpen ? null : tid)}
                      className={`p-1 rounded-lg border text-xs transition ${
                        isOpen
                          ? 'bg-amber-400 text-slate-950 border-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                      }`}
                      title="เปิดเมนู Override ทีมนี้"
                    >
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Collapsible Override Panel */}
                {isOpen && (
                  <div className="mt-2 pt-2 border-t border-slate-800 space-y-2 text-[11px]">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">เกราะ:</span>
                        <button
                          type="button"
                          onClick={() => adjustShields(tid, -1)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-red-300 font-bold"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-white">{t.shields}</span>
                        <button
                          type="button"
                          onClick={() => adjustShields(tid, 1)}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold"
                        >
                          +
                        </button>
                      </div>

                      {lmsState && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">❤️ LMS:</span>
                          <button
                            type="button"
                            onClick={() => adjustLmsHearts(tid, -1)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-red-300 font-bold"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-rose-300">
                            {lmsState.isGhost ? '💀 ผี' : lmsState.hearts}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustLmsHearts(tid, 1)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-bold"
                          >
                            +
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleKillingFloor(tid)}
                        className={`px-2 py-0.5 rounded font-bold border ${
                          t.isInKillingFloor
                            ? 'bg-red-600 text-white border-red-300'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        💀 ลานประหาร
                      </button>

                      {sub && (
                        <button
                          type="button"
                          onClick={() => clearTeamSubmission(tid)}
                          className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700/60 font-bold"
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

                    {round.inputMode === 'MODE_A_CHOICE' && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-slate-400 mr-1">ส่งแทน:</span>
                        {round.choices.slice(0, round.choiceCount).map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() =>
                              submitTeamAnswer(tid, c.key, undefined, { force: true })
                            }
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-400 hover:text-slate-950 font-mono font-bold text-white"
                          >
                            {c.key}
                          </button>
                        ))}
                      </div>
                    )}

                    {round.inputMode === 'MODE_B_YEAR' && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-slate-400 mr-1">ส่งปีแทน:</span>
                        {[
                          { label: `${round.targetYear}`, val: round.targetYear },
                          { label: '+1', val: round.targetYear + 1 },
                          { label: '-5', val: round.targetYear - 5 },
                        ].map((opt) => (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() =>
                              submitTeamAnswer(tid, opt.val, undefined, { force: true })
                            }
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-400 hover:text-slate-950 font-mono font-bold text-white"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}

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

      {/* Subtle collapse notice if expanded team toggled */}
      {expandedTeam && (
        <div className="text-[10px] text-center text-slate-500 flex items-center justify-center gap-1">
          <ChevronDown className="w-3 h-3" />
          <span>กำลังเปิด Override ของ Team {teams[expandedTeam].number}</span>
        </div>
      )}
    </aside>
  );
};
