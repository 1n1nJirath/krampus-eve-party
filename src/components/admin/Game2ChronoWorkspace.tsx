import React, { useEffect, useState } from 'react';
import { Clock, EyeOff, Map, RotateCcw } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { TEAM_ORDER } from '../../data/initialData';
import { canRevealCurrentRound, getNextChronoPreset } from '../../logic/adminFlowLogic';
import { ChronoSubRound, YearUnit } from '../../types/game';
import { SafeActionButton } from '../SafeActionButton';
import { RoundStepperBar } from './RoundStepperBar';

interface Game2ChronoWorkspaceProps {
  onShowFeedback: (lines: string[]) => void;
  onAdvanceToGame3: () => void;
}

const CHRONO_GROUPS: Array<{
  sub: ChronoSubRound;
  title: string;
  desc: string;
  ids: string[];
}> = [
  {
    sub: 'CHRONO_SUB1_CLASSIC',
    title: '1. หยุดเข็มนาฬิกา (Classic)',
    desc: '+600 / ±1 ปี +300 / ±2 ปี 0 / -100 ต่อปี',
    ids: ['tj-1', 'tj-2', 'tj-3'],
  },
  {
    sub: 'CHRONO_SUB2_TRAP',
    title: '2. วางกับดักเวลา (Time Trap)',
    desc: 'วางกับดัก ➔ ทายปี (ฝ่าได้ x2!)',
    ids: ['tj-4', 'tj-5', 'tj-6'],
  },
  {
    sub: 'CHRONO_SUB3_FAST_FINGER',
    title: '3. สงครามแย่งปี (Fast Finger)',
    desc: 'เก้าอี้ + แย่งล็อกปี (+1,000 / ≤2 ปี +400)',
    ids: ['tj-7', 'tj-8', 'tj-9'],
  },
];

export const Game2ChronoWorkspace: React.FC<Game2ChronoWorkspaceProps> = ({
  onShowFeedback,
  onAdvanceToGame3,
}) => {
  const {
    state,
    getAuthoritativeNow,
    switchChronoSubRound,
    launchChronoTrapGuessPhase,
    finishChronoGame,
    startToyFactoryGame,
    updateRoundConfig,
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

  const isOnAir = round.gameStage === 'TIMEJINX';
  const chronoSub = round.chronoSubRound || 'CHRONO_SUB1_CLASSIC';
  const chronoPhase = round.chronoPhase || 'YEAR_GUESS';
  const isTrapPlacePhase =
    isOnAir && chronoSub === 'CHRONO_SUB2_TRAP' && chronoPhase === 'TRAP_PLACEMENT';
  const nextPreset = getNextChronoPreset(presets, round.presetId);
  const revealCheck = canRevealCurrentRound(state, nowMs);
  const chronoPresets = presets.filter((p) => p.gameStage === 'TIMEJINX');

  const handleReveal = () => {
    const res = revealRound();
    if (res?.summary && res.summary.length > 0) {
      onShowFeedback(res.summary);
    }
  };

  const handleNext = () => {
    if (nextPreset) {
      switchChronoSubRound(nextPreset.chronoSubRound || 'CHRONO_SUB1_CLASSIC', {
        presetId: nextPreset.id,
      });
    } else {
      finishChronoGame();
      startToyFactoryGame();
      onAdvanceToGame3();
    }
  };

  const step2IsLaunchGuess = isTrapPlacePhase && round.status !== 'IDLE';

  const activeStep: 1 | 2 | 3 | 4 =
    !isOnAir || round.status === 'IDLE'
      ? 2
      : step2IsLaunchGuess
      ? 2
      : round.status === 'REVEALED'
      ? 4
      : 3;

  return (
    <div className="space-y-4">
      {/* Header + Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base md:text-lg font-black text-white">
            เกมที่ 2: The Chrono Crush (9 ข้อ)
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

      {!isOnAir && (
        <div className="rounded-2xl bg-amber-950/50 border-2 border-amber-400/70 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-black text-amber-300">
              หน้าจอ /display กำลังอยู่ที่ {round.gameStage} (ยังไม่ได้โหลดเกมที่ 2)
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              กดโหลดเกมที่ 2 ข้อที่ 1 เพื่อเริ่มในโหมด 🟡 STANDBY (ผู้เล่นยังไม่เห็นโจทย์)
            </p>
          </div>
          <SafeActionButton
            type="button"
            loadingText="กำลังโหลดเกมที่ 2..."
            onClick={() => switchChronoSubRound('CHRONO_SUB1_CLASSIC', { presetId: 'tj-1' })}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow transition shrink-0"
          >
            📡 โหลดเกมที่ 2 ขึ้นจอ (เข้าโหมด STANDBY)
          </SafeActionButton>
        </div>
      )}

      {subTab === 'LIVE' ? (
        <div className="space-y-4">
          {/* 3x3 Question Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {CHRONO_GROUPS.map((grp) => {
              const activeGroup = isOnAir && chronoSub === grp.sub;
              return (
                <div
                  key={grp.sub}
                  className={`p-2.5 rounded-xl border space-y-2 ${
                    activeGroup
                      ? 'bg-emerald-950/50 border-emerald-400'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-xs font-black text-white">{grp.title}</div>
                    <div className="text-[10px] text-slate-400">{grp.desc}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {grp.ids.map((pid, idx) => (
                      <SafeActionButton
                        key={pid}
                        type="button"
                        showSpinner={false}
                        onClick={() => switchChronoSubRound(grp.sub, { presetId: pid })}
                        className={`py-1.5 rounded-lg font-mono font-black text-xs border transition ${
                          isOnAir && round.presetId === pid
                            ? 'bg-amber-400 text-slate-950 border-white shadow'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-400/60'
                        }`}
                      >
                        ข้อ {idx + 1}
                      </SafeActionButton>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {isOnAir && (
            <>
              <RoundStepperBar
                activeStep={activeStep}
                briefingOpen={Boolean(round.briefingOpen)}
                onToggleBriefing={() => updateRoundConfig({ briefingOpen: !round.briefingOpen })}
                step1={{
                  label: '1. โหลด / Standby',
                  sublabel: 'ซ่อนโจทย์ • ล็อกปุ่ม /play',
                  onClick: () =>
                    switchChronoSubRound(chronoSub, {
                      presetId: round.presetId,
                    }),
                }}
                step2={{
                  label: step2IsLaunchGuess
                    ? '2. 🚀 เปิดแถบเลื่อนทายปี!'
                    : isTrapPlacePhase
                    ? '2. ▶️ เริ่มวางกับดักเวลา'
                    : '2. ▶️ เปิดโจทย์ & จับเวลา',
                  sublabel: step2IsLaunchGuess
                    ? 'จังหวะที่ 2: คำนวณ Step 1/5/10 ปี & ทายปี'
                    : isTrapPlacePhase
                    ? 'จังหวะที่ 1: ปลดล็อกโควตากับดัก'
                    : 'ขึ้นจอ /display • ปลดล็อก /play',
                  disabled: !step2IsLaunchGuess && round.status === 'ACTIVE',
                  onClick: step2IsLaunchGuess ? launchChronoTrapGuessPhase : () => startTimer(),
                }}
                step3={{
                  label: isTrapPlacePhase
                    ? '3. ⏸️ ล็อกกับดัก (จังหวะ 1)'
                    : round.status === 'ACTIVE' && !revealCheck.allowed
                    ? '3. ⏸️ ล็อกคำตอบ (Pause)'
                    : '3. ✨ เฉลย & คิดคะแนน',
                  sublabel: isTrapPlacePhase
                    ? 'หยุดวางกับดัก ก่อนกดจังหวะ 2 ใน Step 2'
                    : round.status === 'IDLE'
                    ? 'กรุณากด Step 2 ก่อน'
                    : round.status === 'ACTIVE' && !revealCheck.allowed
                    ? revealCheck.reason
                    : round.status === 'REVEALED'
                    ? 'เฉลยรอบนี้แล้ว'
                    : 'แสดงปีเฉลย + คิด ฿ อัตโนมัติ',
                  disabled:
                    round.status === 'IDLE' ||
                    round.status === 'REVEALED' ||
                    (isTrapPlacePhase && round.status !== 'ACTIVE'),
                  onClick: isTrapPlacePhase
                    ? lockRound
                    : round.status === 'ACTIVE' && !revealCheck.allowed
                    ? lockRound
                    : handleReveal,
                }}
                step4={{
                  label: nextPreset
                    ? `4. ⏭️ ข้อถัดไป (Standby)`
                    : '4. 🏁 จบเกมที่ 2 ➔ ไปเกมที่ 3',
                  sublabel: nextPreset
                    ? `ถัดไป: ${nextPreset.id.toUpperCase()} (เข้าโหมด Standby)`
                    : 'ครบ 9 ข้อแล้ว ➔ เริ่มเกมที่ 3',
                  onClick: handleNext,
                }}
                secondaryStep3Action={
                  !isTrapPlacePhase && round.status === 'ACTIVE' && !revealCheck.allowed
                    ? {
                        label: '⚡ บังคับเฉลยเลย (Override)',
                        onClick: handleReveal,
                      }
                    : undefined
                }
              />

              {/* Host Preview Card */}
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-black text-amber-300 uppercase">
                      HOST PREVIEW • ซ่อนจากผู้เล่นขณะ STANDBY
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-400/20 border border-amber-400 text-amber-300 font-mono text-xs font-black">
                      🎯 ปีเฉลย (ลับ): {round.yearUnit === 'BE' ? 'พ.ศ.' : 'ค.ศ.'}{' '}
                      {round.targetYear}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ({round.yearMin ?? 1980}–{round.yearMax ?? 2026})
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="text-base font-black text-white">{round.questionText}</div>
                  <div className="text-xs text-slate-400 mt-1">{round.subtitle}</div>
                </div>

                {/* Sub2 Trap Quotas / Sub3 Fast Finger Claims */}
                {chronoSub === 'CHRONO_SUB2_TRAP' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TEAM_ORDER.map((tid) => {
                      const quota = round.chronoQuotas?.[tid] ?? 0;
                      const trapsOnMe = TEAM_ORDER.reduce(
                        (acc, from) => acc + (round.chronoTrapsPlaced?.[from]?.[tid] || 0),
                        0
                      );
                      const shield = round.chronoShields?.[tid] ?? 0;
                      return (
                        <div
                          key={tid}
                          className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                        >
                          <div className="font-bold text-white truncate">
                            {teams[tid].icon} {teams[tid].name}
                          </div>
                          <div className="text-[11px] font-mono text-amber-300 mt-0.5">
                            โควตา: {quota} | โดน: {trapsOnMe} | โล่: {shield}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {chronoSub === 'CHRONO_SUB3_FAST_FINGER' &&
                  round.chronoFastFingerClaims &&
                  Object.keys(round.chronoFastFingerClaims).length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-slate-400 font-bold">ปีที่ถูกล็อกแล้ว:</span>
                      {Object.entries(round.chronoFastFingerClaims).map(([yr, tid]) => (
                        <span
                          key={yr}
                          className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-emerald-200 font-mono font-bold"
                        >
                          {yr}: {teams[tid].icon} T{teams[tid].number}
                        </span>
                      ))}
                    </div>
                  )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">เวลา:</span>
                    {[20, 25, 30, 35, 45].map((sec) => (
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
                        if (window.confirm('ล้างคำตอบรอบนี้และกลับเข้า STANDBY?')) {
                          resetRoundSubmissions();
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 font-bold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>ล้างคำตอบรอบนี้</span>
                    </SafeActionButton>

                    <SafeActionButton
                      type="button"
                      showSpinner={false}
                      onClick={finishChronoGame}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1"
                    >
                      <Map className="w-3 h-3" />
                      <span>กลับ World Map</span>
                    </SafeActionButton>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        /* EDIT QUESTIONS SUB-TAB */
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-black text-white">📝 แก้ไขโจทย์ & ปีเฉลยเกมที่ 2</h3>
              <p className="text-xs text-slate-400">
                เลือกข้อที่ต้องการแก้ไข (เมื่อโหลดแล้วสามารถแก้ปีเฉลย ขอบเขตปี และข้อความได้สดๆ)
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {chronoPresets.map((p, idx) => (
                <SafeActionButton
                  key={p.id}
                  type="button"
                  showSpinner={false}
                  onClick={() => loadPreset(p)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border ${
                    round.presetId === p.id
                      ? 'bg-amber-400 text-slate-950 border-white'
                      : 'bg-slate-950 text-slate-300 border-slate-700'
                  }`}
                >
                  {idx + 1}
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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="text-xs text-emerald-300 font-bold">ด่านย่อย:</label>
              <select
                value={chronoSub}
                onChange={(e) =>
                  updateRoundConfig({
                    chronoSubRound: e.target.value as ChronoSubRound,
                    chronoPhase:
                      e.target.value === 'CHRONO_SUB2_TRAP' ? 'TRAP_PLACEMENT' : 'YEAR_GUESS',
                  })
                }
                className="w-full mt-1 px-2 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white"
              >
                <option value="CHRONO_SUB1_CLASSIC">1. Classic</option>
                <option value="CHRONO_SUB2_TRAP">2. Time Trap</option>
                <option value="CHRONO_SUB3_FAST_FINGER">3. Fast Finger</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-emerald-300 font-bold">หน่วยปี:</label>
              <select
                value={round.yearUnit || 'AD'}
                onChange={(e) => updateRoundConfig({ yearUnit: e.target.value as YearUnit })}
                className="w-full mt-1 px-2 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300"
              >
                <option value="AD">ค.ศ. (AD)</option>
                <option value="BE">พ.ศ. (BE)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold">Min Year:</label>
              <input
                type="number"
                value={round.yearMin ?? 1980}
                onChange={(e) => updateRoundConfig({ yearMin: Number(e.target.value) })}
                className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-bold">Max Year:</label>
              <input
                type="number"
                value={round.yearMax ?? 2026}
                onChange={(e) => updateRoundConfig({ yearMax: Number(e.target.value) })}
                className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-amber-300 font-bold">Correct Year:</label>
              <input
                type="number"
                value={round.targetYear}
                onChange={(e) => updateRoundConfig({ targetYear: Number(e.target.value) })}
                className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-amber-500/60 font-mono text-base font-black text-amber-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
