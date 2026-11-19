import React, { useEffect, useState } from 'react';
import { DoorOpen, EyeOff, Gavel, Map, RotateCcw, Shuffle } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { getSuggestedSafeRange } from '../../data/initialData';
import {
  canRevealCurrentRound,
  getNextGame1SubRound,
} from '../../logic/adminFlowLogic';
import { EightDoorsSubRound } from '../../types/game';
import { SafeActionButton } from '../SafeActionButton';
import { RoundStepperBar } from './RoundStepperBar';

interface Game1DoorsWorkspaceProps {
  onShowFeedback: (lines: string[]) => void;
  onAdvanceToGame2: () => void;
}

export const Game1DoorsWorkspace: React.FC<Game1DoorsWorkspaceProps> = ({
  onShowFeedback,
  onAdvanceToGame2,
}) => {
  const {
    state,
    getAuthoritativeNow,
    switchEightDoorsSubRound,
    switchChronoSubRound,
    finishEightDoorsGame,
    resolveSubRound2Auction,
    updateRoundConfig,
    updateChoiceOption,
    toggleDoorOpened,
    shuffleDoors,
    loadPreset,
    startTimer,
    lockRound,
    revealRound,
    resetRoundSubmissions,
  } = useGame();

  const { round, presets, teams } = state;
  const [subTab, setSubTab] = useState<'LIVE' | 'EDIT'>('LIVE');
  const [nowMs, setNowMs] = useState(() => getAuthoritativeNow());

  useEffect(() => {
    if (round.status !== 'ACTIVE') return;
    setNowMs(getAuthoritativeNow());
    const id = setInterval(() => setNowMs(getAuthoritativeNow()), 500);
    return () => clearInterval(id);
  }, [round.status, getAuthoritativeNow]);

  const isOnAir = round.gameStage === 'POLL_MINE' && round.inputMode === 'MODE_A_CHOICE';
  const subRound: EightDoorsSubRound = round.eightDoorsSubRound || 'SUB1_SURVIVAL';
  const nextSub = getNextGame1SubRound(subRound);
  const revealCheck = canRevealCurrentRound(state, nowMs);

  const suggested = getSuggestedSafeRange(round.choiceCount, subRound);
  const safeMin = round.safeRankMin ?? suggested.min;
  const safeMax = round.safeRankMax ?? suggested.max;
  const snakeOrder = round.snakeDraftOrder || [];
  const snakeIdx = round.snakeDraftIndex ?? 0;
  const currentSnakeTeam =
    (subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT') &&
    round.status === 'ACTIVE' &&
    snakeIdx < snakeOrder.length
      ? teams[snakeOrder[snakeIdx]]
      : null;

  const game1Presets = presets.filter((p) => p.gameStage === 'POLL_MINE');

  const handleReveal = () => {
    const res = revealRound();
    if (res?.summary && res.summary.length > 0) {
      onShowFeedback(res.summary);
    }
  };

  const handleNext = () => {
    if (nextSub) {
      switchEightDoorsSubRound(nextSub);
    } else {
      finishEightDoorsGame();
      switchChronoSubRound('CHRONO_SUB1_CLASSIC', { presetId: 'tj-1' });
      onAdvanceToGame2();
    }
  };

  const activeStep: 1 | 2 | 3 | 4 =
    !isOnAir || round.status === 'IDLE'
      ? 2
      : round.status === 'REVEALED'
      ? 4
      : 3;

  return (
    <div className="space-y-4">
      {/* Workspace Header + Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-amber-400" />
          <h2 className="text-base md:text-lg font-black text-white">
            เกมที่ 1: The 8 Doors of Krampus
          </h2>
          {isOnAir && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-mono font-black">
              ON AIR
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setSubTab('LIVE')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
              subTab === 'LIVE'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🎮 Live Control
          </button>
          <button
            type="button"
            onClick={() => setSubTab('EDIT')}
            className={`px-3 py-1 rounded-lg text-xs font-extrabold transition ${
              subTab === 'EDIT'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            📝 Edit Questions
          </button>
        </div>
      </div>

      {/* On-Air Mismatch Banner */}
      {!isOnAir && (
        <div className="rounded-2xl bg-amber-950/50 border-2 border-amber-400/70 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-amber-300">
              หน้าจอ /display กำลังอยู่ที่ {round.gameStage} (ยังไม่ได้โหลดเกมที่ 1)
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              กดปุ่มด้านขวาเพื่อสลับจอ /display มาเตรียมความพร้อมในโหมด 🟡 STANDBY (ซ่อนโจทย์)
            </p>
          </div>
          <SafeActionButton
            type="button"
            loadingText="กำลังโหลดเกมที่ 1..."
            onClick={() => switchEightDoorsSubRound('SUB1_SURVIVAL')}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition shrink-0"
          >
            📡 โหลดเกมที่ 1 ขึ้นจอ (เข้าโหมด STANDBY)
          </SafeActionButton>
        </div>
      )}

      {subTab === 'LIVE' ? (
        <div className="space-y-4">
          {/* 3 Sub-Round Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {(
              [
                {
                  sub: 'SUB1_SURVIVAL' as EightDoorsSubRound,
                  tag: 'ด่านย่อยที่ 1',
                  title: 'Snake Draft 1 (1→4→1 • #1–#3)',
                  subText: 'ถูก +300 ฿ / ผิด -1 🛡️ / ไม่เจอ -200 ฿',
                },
                {
                  sub: 'SUB2_SNAKE_DRAFT' as EightDoorsSubRound,
                  tag: 'ด่านย่อยที่ 2',
                  title: 'Snake Draft 2 (4→1→4 • #2–#4)',
                  subText: 'ระวัง #1 คือกับดัก! ถูก +300 ฿ / พลาด -1 🛡️',
                },
                {
                  sub: 'SUB3_POLARITY' as EightDoorsSubRound,
                  tag: 'ด่านย่อยที่ 3',
                  title: `Polarity (#1 & #${round.choiceCount})`,
                  subText: 'ถูก 1 อันดับ +300 ฿ / ถูกคู่ +700 ฿',
                },
              ] as const
            ).map((item) => {
              const active = isOnAir && subRound === item.sub;
              return (
                <SafeActionButton
                  key={item.sub}
                  type="button"
                  showSpinner={false}
                  onClick={() => switchEightDoorsSubRound(item.sub)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    active
                      ? 'bg-emerald-950/70 border-emerald-400 text-white shadow'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="text-[10px] font-mono font-black text-amber-300">{item.tag}</div>
                  <div className="text-xs font-extrabold mt-0.5">{item.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.subText}</div>
                </SafeActionButton>
              );
            })}
          </div>

          {/* 4-Step Linear Wizard */}
          {isOnAir && (
            <RoundStepperBar
              activeStep={activeStep}
              briefingOpen={Boolean(round.briefingOpen)}
              onToggleBriefing={() => updateRoundConfig({ briefingOpen: !round.briefingOpen })}
              step1={{
                label: '1. โหลด / Standby',
                sublabel: 'ซ่อนโจทย์ • ล็อกปุ่ม /play',
                onClick: () => switchEightDoorsSubRound(subRound),
              }}
              step2={{
                label: '2. ▶️ เปิดโจทย์ & ปลดล็อก',
                sublabel: 'ขึ้นจอ /display • เริ่มจับเวลา',
                disabled: round.status === 'ACTIVE',
                loadingText: 'กำลังเริ่ม...',
                onClick: () => startTimer(),
              }}
              step3={{
                label:
                  round.status === 'ACTIVE' && !revealCheck.allowed
                    ? '3. ⏸️ ล็อกคำตอบ (Pause)'
                    : '3. ✨ เฉลย & คิดคะแนน',
                sublabel:
                  round.status === 'IDLE'
                    ? 'กรุณากด Step 2 ก่อน'
                    : round.status === 'ACTIVE' && !revealCheck.allowed
                    ? revealCheck.reason
                    : round.status === 'REVEALED'
                    ? 'เฉลยรอบนี้แล้ว'
                    : 'หยุดเวลา • แจก/หัก ฿ อัตโนมัติ',
                disabled: round.status === 'IDLE' || round.status === 'REVEALED',
                loadingText: 'กำลังดำเนินการ...',
                onClick:
                  round.status === 'ACTIVE' && !revealCheck.allowed ? lockRound : handleReveal,
              }}
              step4={{
                label: nextSub
                  ? '4. ⏭️ ข้อถัดไป (Standby)'
                  : '4. 🏁 จบเกมที่ 1 ➔ ไปเกมที่ 2',
                sublabel: nextSub ? 'ขึ้นด่านย่อยถัดไปอัตโนมัติ' : 'สรุปด่านและโหลด Game 2 (Standby)',
                onClick: handleNext,
              }}
              secondaryStep3Action={
                round.status === 'ACTIVE' && !revealCheck.allowed
                  ? {
                      label: '⚡ บังคับเฉลยเลย (Override)',
                      onClick: handleReveal,
                    }
                  : undefined
              }
            />
          )}

          {/* Special Sub2 Auction banner (legacy support if entered) */}
          {isOnAir && subRound === 'SUB2_AUCTION' && (
            <div className="rounded-xl bg-amber-950/60 border border-amber-400/60 p-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-200">
                🔨 รอบประมูลชิงสิทธิ์: เมื่อทุกทีมเสนอราคาเสร็จ กดปุ่มนี้เพื่อตัดสินผู้ชนะประมูล
              </span>
              <SafeActionButton
                type="button"
                loadingText="กำลังตัดสิน..."
                onClick={() => {
                  const res = resolveSubRound2Auction();
                  if (res?.message) onShowFeedback([res.message]);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1"
              >
                <Gavel className="w-3.5 h-3.5" />
                <span>ตัดสินผู้ชนะประมูล</span>
              </SafeActionButton>
            </div>
          )}

          {/* Host Preview Card + Doors Board */}
          {isOnAir && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-mono font-black text-amber-300 uppercase">
                    HOST PREVIEW • ซ่อนจากผู้เล่นขณะ STANDBY
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold">
                    โซนปลอดภัย: #{safeMin}–#{safeMax}
                  </span>
                  {currentSnakeTeam && (
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-black animate-pulse">
                      คิว {snakeIdx + 1}/{snakeOrder.length}: {currentSnakeTeam.icon}{' '}
                      {currentSnakeTeam.name}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                <div className="text-base font-black text-white">{round.questionText}</div>
                <div className="text-xs text-slate-400 mt-1">{round.subtitle}</div>
              </div>

              {/* Quick Timer Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-400 font-bold">เวลา:</span>
                  {[30, 45, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() =>
                        updateRoundConfig({
                          durationSeconds: sec,
                          timerRemainingMs: sec * 1000,
                        })
                      }
                      className={`px-2 py-0.5 rounded font-mono font-bold border ${
                        round.durationSeconds === sec
                          ? 'bg-amber-400 text-slate-950 border-white'
                          : 'bg-slate-950 text-slate-300 border-slate-700'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={() => {
                      if (window.confirm('ล้างคำตอบรอบนี้และกลับเข้าสู่ STANDBY?')) {
                        resetRoundSubmissions();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-bold flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>ล้างคำตอบรอบนี้</span>
                  </SafeActionButton>

                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={finishEightDoorsGame}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1"
                  >
                    <Map className="w-3 h-3" />
                    <span>กลับ World Map</span>
                  </SafeActionButton>
                </div>
              </div>

              {/* 8-12 Doors Live Grid (Host Secret Rank View) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {round.choices.slice(0, round.choiceCount).map((choice) => {
                  const rank = choice.rank ?? 1;
                  const isSafe = rank >= safeMin && rank <= safeMax;
                  return (
                    <button
                      key={choice.key}
                      type="button"
                      onClick={() => toggleDoorOpened(choice.key)}
                      title="คลิกเพื่อสลับสถานะเปิด/ปิดประตูด้วยมือ"
                      className={`p-2.5 rounded-xl border text-left transition ${
                        choice.isOpened
                          ? isSafe
                            ? 'bg-emerald-950/70 border-emerald-400'
                            : 'bg-red-950/60 border-red-500'
                          : isSafe
                          ? 'bg-slate-950 border-emerald-700/60 hover:border-emerald-400'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono font-black text-xs text-amber-300">
                          {choice.key} • #{rank}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                            choice.isOpened
                              ? 'bg-amber-400 text-slate-950'
                              : isSafe
                              ? 'bg-emerald-900/70 text-emerald-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {choice.isOpened ? 'เปิดแล้ว' : isSafe ? 'ปลอดภัย' : 'กับดัก'}
                        </span>
                      </div>
                      <div className="text-xs text-white font-semibold mt-1 line-clamp-2">
                        {choice.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* EDIT QUESTIONS SUB-TAB */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white">📝 แก้ไขโจทย์ & ประตูเกมที่ 1</h3>
              <p className="text-xs text-slate-400">
                เลือกข้อจาก Preset หรือปรับข้อความและอันดับประตู #1–#{round.choiceCount} ด้านล่าง
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {game1Presets.map((p, idx) => (
                <SafeActionButton
                  key={p.id}
                  type="button"
                  showSpinner={false}
                  onClick={() => loadPreset(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                    round.presetId === p.id
                      ? 'bg-amber-400 text-slate-950 border-white'
                      : 'bg-slate-950 text-slate-300 border-slate-700'
                  }`}
                >
                  ข้อ {idx + 1} ({p.id})
                </SafeActionButton>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-bold">ชื่อรอบ:</label>
              <input
                type="text"
                value={round.title}
                onChange={(e) => updateRoundConfig({ title: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold">คำอธิบายกติกา:</label>
              <input
                type="text"
                value={round.subtitle}
                onChange={(e) => updateRoundConfig({ subtitle: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold">ข้อความคำถาม:</label>
            <textarea
              rows={2}
              value={round.questionText}
              onChange={(e) => updateRoundConfig({ questionText: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-bold text-white"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400">จำนวนประตู:</span>
              {[8, 9, 10, 11, 12].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => updateRoundConfig({ choiceCount: cnt })}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    round.choiceCount === cnt
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {cnt}
                </button>
              ))}
              <SafeActionButton
                type="button"
                showSpinner={false}
                onClick={shuffleDoors}
                className="ml-2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>สุ่มสลับประตู</span>
              </SafeActionButton>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-300 font-bold">โซนปลอดภัย: #</span>
              <input
                type="number"
                min={1}
                max={round.choiceCount}
                value={safeMin}
                onChange={(e) =>
                  updateRoundConfig({ safeRankMin: Math.max(1, Number(e.target.value)) })
                }
                className="w-12 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-center font-mono text-emerald-300"
              />
              <span>–</span>
              <input
                type="number"
                min={1}
                max={round.choiceCount}
                value={safeMax}
                onChange={(e) =>
                  updateRoundConfig({
                    safeRankMax: Math.min(round.choiceCount, Number(e.target.value)),
                  })
                }
                className="w-12 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-center font-mono text-emerald-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {round.choices.slice(0, round.choiceCount).map((choice) => {
              const usedRanks = new Set(
                round.choices
                  .slice(0, round.choiceCount)
                  .filter((c) => c.key !== choice.key)
                  .map((c) => c.rank)
              );
              return (
                <div
                  key={choice.key}
                  className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800"
                >
                  <span className="w-7 h-7 rounded-lg bg-slate-800 font-mono font-black text-xs flex items-center justify-center text-amber-300 shrink-0">
                    {choice.key}
                  </span>
                  <input
                    type="text"
                    value={choice.label}
                    onChange={(e) => updateChoiceOption(choice.key, { label: e.target.value })}
                    className="flex-1 min-w-0 bg-transparent text-xs text-white border-b border-transparent focus:border-amber-400 focus:outline-none"
                  />
                  <select
                    value={choice.rank ?? 1}
                    onChange={(e) => {
                      const newRank = Number(e.target.value);
                      const isSafe = newRank >= safeMin && newRank <= safeMax;
                      updateChoiceOption(choice.key, {
                        rank: newRank,
                        isCorrect: isSafe,
                        isTrap: !isSafe,
                      });
                    }}
                    className="px-1.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs text-amber-300"
                  >
                    {Array.from({ length: round.choiceCount }, (_, i) => i + 1).map((rNum) => (
                      <option key={rNum} value={rNum} disabled={usedRanks.has(rNum)}>
                        #{rNum} {usedRanks.has(rNum) ? '(ซ้ำ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
