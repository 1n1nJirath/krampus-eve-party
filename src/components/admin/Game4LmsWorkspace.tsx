import React, { useEffect, useState } from 'react';
import { EyeOff, Flame, Skull } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import {
  CURSE_CATALOG,
  DEFAULT_LAST_MAN_PART1_QUESTIONS,
  DEFAULT_LAST_MAN_PART2_QUESTIONS,
  getActiveTeamIds,
} from '../../data/initialData';
import { SafeActionButton } from '../SafeActionButton';
import { RoundStepperBar } from './RoundStepperBar';

interface Game4LmsWorkspaceProps {
  onGoToFinale: () => void;
}

export const Game4LmsWorkspace: React.FC<Game4LmsWorkspaceProps> = ({ onGoToFinale }) => {
  const {
    state,
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
    finishLastManStandingGame,
    updateRoundConfig,
    startTimer,
    lockRound,
    revealRound,
    resetRoundSubmissions,
  } = useGame();

  const { round, teams } = state;
  const isOnAir = round.gameStage === 'TRIVIA_MURDER' && Boolean(round.lastMan);
  const isFreestyleOnAir =
    round.gameStage === 'TRIVIA_MURDER' && !round.lastMan && round.id.startsWith('free-');
  const lms = round.lastMan;
  const p1List = state.lastManPart1Questions || DEFAULT_LAST_MAN_PART1_QUESTIONS;
  const p2List = state.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
  const active = getActiveTeamIds(teams);

  const isPart2Phase = Boolean(
    lms && (lms.phase.startsWith('PART2_') || lms.phase === 'CHAMPION')
  );
  const [subTab, setSubTab] = useState<'PART1' | 'PART2' | 'EDIT'>(
    isPart2Phase ? 'PART2' : 'PART1'
  );

  useEffect(() => {
    if (!lms || subTab === 'EDIT') return;
    setSubTab(isPart2Phase ? 'PART2' : 'PART1');
  }, [isPart2Phase, lms, subTab]);

  const cursedTeams = lms ? active.filter((tid) => lms.teamStates[tid]?.activeCurse) : [];
  const currentP1Q = lms ? p1List[(lms.part1Round - 1) % p1List.length] : p1List[0];
  const currentP2Q = lms ? p2List[lms.part2QuestionIndex % p2List.length] : p2List[0];

  return (
    <div className="space-y-4">
      {/* Header + Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skull className="w-5 h-5 text-rose-400" />
          <h2 className="text-base md:text-lg font-black text-white">
            เกมที่ 4: The Last Man Standing
          </h2>
          {isOnAir && lms && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400 text-rose-200 text-[10px] font-mono font-black">
              {lms.phase} • R{lms.part1Round}/4
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setSubTab('PART1')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
              subTab === 'PART1'
                ? 'bg-rose-500 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            ⚔️ Part 1: ตลาดมืด & ลานประหาร
          </button>
          <button
            type="button"
            onClick={() => setSubTab('PART2')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
              subTab === 'PART2'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            🪜 Part 2: บันได 25 ขั้น
          </button>
          <button
            type="button"
            onClick={() => setSubTab('EDIT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition ${
              subTab === 'EDIT'
                ? 'bg-amber-400 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            📝 Edit Questions
          </button>
        </div>
      </div>

      {subTab !== 'EDIT' && (!isOnAir || !lms) ? (
        <div className="space-y-4">
          {isFreestyleOnAir && (
            <div className="space-y-3 rounded-2xl bg-slate-900 border border-amber-500/50 p-4">
              <div className="text-xs font-mono font-black text-amber-300 uppercase">
                ⚡ FREESTYLE ON AIR • {round.title}
              </div>
              <RoundStepperBar
                activeStep={
                  round.status === 'IDLE' ? 2 : round.status === 'REVEALED' ? 4 : 3
                }
                step1={{
                  label: '1. Standby / ล้างคำตอบ',
                  onClick: resetRoundSubmissions,
                }}
                step2={{
                  label: '2. ▶️ เปิดโจทย์ & จับเวลา',
                  disabled: round.status === 'ACTIVE',
                  onClick: () => startTimer(),
                }}
                step3={{
                  label:
                    round.status === 'ACTIVE'
                      ? '3. ⏸️ ล็อกคำตอบ'
                      : '3. ✨ เฉลย & คิดคะแนน',
                  disabled: round.status === 'IDLE' || round.status === 'REVEALED',
                  onClick: round.status === 'ACTIVE' ? lockRound : () => revealRound(),
                }}
                step4={{
                  label: '4. ⏭️ รอบถัดไป (Standby)',
                  onClick: resetRoundSubmissions,
                }}
              />
            </div>
          )}
          <div className="rounded-2xl bg-rose-950/35 border-2 border-rose-500/60 p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-base font-black text-white">
                พร้อมเริ่มเกมที่ 4: The Last Man Standing (ตัดสินแชมป์ค่าย)
              </div>
              <p className="text-xs text-slate-300 mt-1">
                กดเพื่อเปิดประกาศ Krampus Twist และแจกหัวใจ 4 ดวงให้ทุกทีม (เริ่มต้นในโหมด 🟡 STANDBY)
              </p>
            </div>
            <SafeActionButton
              type="button"
              loadingText="กำลังเริ่มเกมที่ 4..."
              onClick={startLastManStandingGame}
              className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-sm shadow-lg transition shrink-0"
            >
              💀 เริ่มเกมที่ 4 (Krampus Twist + 4 ❤️)
            </SafeActionButton>
          </div>
        </div>
      ) : subTab !== 'EDIT' && lms ? (
        <div className="space-y-4">
          {/* Compact 4-Team Survival Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {active.map((tid) => {
              const ts = lms.teamStates[tid];
              const t = teams[tid];
              const curse = ts.activeCurse ? CURSE_CATALOG[ts.activeCurse] : null;
              return (
                <div
                  key={tid}
                  className={`rounded-xl p-2.5 border text-xs ${
                    ts.isGhost
                      ? 'bg-slate-950 border-purple-500/60'
                      : ts.inKillingFloor
                      ? 'bg-red-950/60 border-red-500'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-white truncate">
                      {t.icon} {t.name}
                    </span>
                    <span className="font-mono text-[11px] text-amber-300 font-bold shrink-0">
                      {t.coins}฿
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 text-rose-300">
                      {ts.isGhost ? '👻 วิญญาณ' : `❤️${ts.hearts}/4`}
                    </span>
                    {!ts.isGhost && ts.inKillingFloor && (
                      <span className="px-1.5 py-0.5 rounded bg-red-600 text-white">💀 ประหาร</span>
                    )}
                    {ts.mirrorShield && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-700 text-white">🪞โล่</span>
                    )}
                    {ts.jetpacks > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-black">
                        🚀×{ts.jetpacks}
                      </span>
                    )}
                    {isPart2Phase && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-100">
                        🪜{ts.step}/25
                      </span>
                    )}
                  </div>
                  {curse && (
                    <div className="mt-1.5 flex items-center justify-between gap-1 bg-purple-950/80 border border-purple-500/50 rounded px-1.5 py-0.5 text-[10px]">
                      <span className="text-purple-200 truncate">
                        {curse.icon} {curse.name}
                      </span>
                      <SafeActionButton
                        type="button"
                        showSpinner={false}
                        onClick={() => penalizeLastManCurseViolation(tid)}
                        className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-black shrink-0"
                      >
                        -1❤️
                      </SafeActionButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {cursedTeams.length > 0 && (
            <div className="flex justify-end">
              <SafeActionButton
                type="button"
                loadingText="กำลังส่ง Alert..."
                onClick={triggerLastManFreezeWarning}
                className="px-3 py-1.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black text-xs animate-pulse flex items-center gap-1"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>🗿 KRAMPUS มองอยู่! (ส่ง Freeze 3 วิ)</span>
              </SafeActionButton>
            </div>
          )}

          {/* ================= PART 1 TAB ================= */}
          {subTab === 'PART1' && (() => {
            const isTriviaStandby =
              lms.phase === 'KRAMPUS_TWIST' ||
              (lms.phase === 'PART1_TRIVIA' && round.status === 'IDLE');
            const isTriviaLive =
              lms.phase === 'PART1_TRIVIA' && round.status === 'ACTIVE';
            const isTriviaLocked =
              lms.phase === 'PART1_TRIVIA' && round.status === 'LOCKED';

            const activeStep: 1 | 2 | 3 | 4 = isTriviaStandby
              ? 2
              : lms.phase === 'PART1_MINIGAME_REVEAL' || lms.phase === 'PART1_GREED_TAX'
              ? 4
              : 3;

            const step3Config = (() => {
              if (isTriviaLive || isTriviaLocked) {
                return {
                  label: isTriviaLive ? '3. ⏸️ ล็อกคำตอบรอบนี้' : '3. ✨ เฉลย & เปิดประตูกล',
                  sublabel: isTriviaLive
                    ? 'ปิดรับคำตอบก่อนกดเฉลย'
                    : 'ตัดสินผู้รอด / ตกลานประหาร',
                  onClick: isTriviaLive ? lockRound : revealLastManPart1Trivia,
                };
              }
              if (lms.phase === 'PART1_MISERY_PULL') {
                return {
                  label: '3. 🪝 สุ่มดึงเพื่อนตกนรก!',
                  sublabel: 'ใช้เมื่อทีมผู้แพ้ไม่ยอมเลือกภายใน 10 วิ',
                  onClick: autoResolveMiseryPull,
                };
              }
              if (lms.phase === 'PART1_TRIVIA_REVEAL') {
                return {
                  label: '3. 🛒 เปิดตลาดมืด (25 วิ)',
                  sublabel: 'ให้ผู้เล่นซื้อไอเทมละลายทรัพย์',
                  onClick: enterLastManBlackMarket,
                };
              }
              if (lms.phase === 'PART1_BLACK_MARKET') {
                return {
                  label: `3. ⚔️ เข้ามินิเกม (รอบ ${lms.part1Round})`,
                  sublabel: 'เปิดมินิเกมตัดสินหัวใจในลานประหาร',
                  onClick: enterLastManMinigame,
                };
              }
              if (lms.phase === 'PART1_MINIGAME') {
                return {
                  label: '3. ⚖️ เฉลยมินิเกม & ตัดสิน ❤️',
                  sublabel:
                    lms.part1Round === 4 && lms.krampusDiceRoll === null
                      ? 'อย่าลืมทอยเต๋า Krampus ก่อนกด!'
                      : 'อัปเดตหัวใจและเคลียร์ลานประหาร',
                  onClick: revealLastManMinigame,
                };
              }
              return {
                label: '3. ✓ จบรอบย่อยแล้ว',
                sublabel: 'กด Step 4 เพื่อไปรอบถัดไป',
                disabled: true,
                onClick: () => {},
              };
            })();

            const step4Config =
              lms.part1Round === 2 && lms.phase === 'PART1_MINIGAME_REVEAL'
                ? {
                    label: '4. 💸 เก็บภาษีคนงก (>1,000 ฿)',
                    sublabel: 'หัก 50% ทีมที่ถือเงินเกิน 1,000 ฿',
                    onClick: advanceFromLastManMinigame,
                  }
                : lms.part1Round < 4
                ? {
                    label: `4. ⏭️ รอบที่ ${lms.part1Round + 1}/4 (Standby)`,
                    sublabel: 'โหลดคำถามรอบถัดไปในโหมดซ่อนโจทย์',
                    onClick: advanceFromLastManMinigame,
                  }
                : {
                    label: '4. 🪜 เข้าสู่ช่วงที่ 2 (25 ขั้น)',
                    sublabel: 'แปลง 400 ฿ = +1 ขั้น ➔ เริ่มช่วงหนีตาย',
                    onClick: startLastManPart2Escape,
                  };

            return (
              <div className="space-y-4">
                {/* Round Selector Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[1, 2, 3, 4].map((rNum) => (
                      <SafeActionButton
                        key={rNum}
                        type="button"
                        showSpinner={false}
                        onClick={() => prepareLastManPart1Round(rNum)}
                        className={`px-3 py-1 rounded-lg text-xs font-black border transition ${
                          lms.part1Round === rNum
                            ? 'bg-rose-600 text-white border-white shadow'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600'
                        }`}
                      >
                        รอบ {rNum}/4 (Standby)
                      </SafeActionButton>
                    ))}
                  </div>

                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={() => {
                      if (window.confirm('รีเซ็ตเกมที่ 4 กลับไป Krampus Twist ตั้งแต่รอบ 1?')) {
                        startLastManStandingGame();
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-bold"
                  >
                    🔄 รีเซ็ตเกมที่ 4
                  </SafeActionButton>
                </div>

                {/* 4-Step Linear Wizard */}
                <RoundStepperBar
                  activeStep={activeStep}
                  briefingOpen={Boolean(round.briefingOpen)}
                  onToggleBriefing={() => updateRoundConfig({ briefingOpen: !round.briefingOpen })}
                  step1={{
                    label: `1. โหลดรอบ ${lms.part1Round} (Standby)`,
                    sublabel: 'ซ่อนโจทย์ • ล็อกมือถือ /play',
                    onClick: () => prepareLastManPart1Round(lms.part1Round),
                  }}
                  step2={{
                    label: `2. ▶️ เปิดคำถามรอบ ${lms.part1Round} (15 วิ)`,
                    sublabel: 'แสดงโจทย์บน /display • ปลดล็อก /play',
                    disabled: !isTriviaStandby,
                    onClick: () => startLastManPart1Trivia(lms.part1Round),
                  }}
                  step3={step3Config}
                  step4={step4Config}
                  secondaryStep3Action={
                    isTriviaLive
                      ? {
                          label: '⚡ บังคับเฉลยเลย (Override)',
                          onClick: revealLastManPart1Trivia,
                        }
                      : lms.phase === 'PART1_MINIGAME' && lms.part1Round === 4
                      ? {
                          label: `🎲 Krampus ทอยเต๋า (${lms.krampusDiceRoll ?? '?'})`,
                          onClick: rollKrampusDeathDice,
                        }
                      : undefined
                  }
                />

                {/* Direct Phase Override Strip + Host Question Preview */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-black text-amber-300 uppercase">
                        HOST PREVIEW • คำถามช่วงที่ 1 รอบ {lms.part1Round}/4
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <SafeActionButton
                        type="button"
                        showSpinner={false}
                        onClick={enterLastManBlackMarket}
                        className="px-2 py-0.5 rounded bg-purple-900/70 hover:bg-purple-800 text-purple-200 border border-purple-500/50 font-bold"
                      >
                        🛒 ตลาดมืด
                      </SafeActionButton>
                      <SafeActionButton
                        type="button"
                        showSpinner={false}
                        onClick={enterLastManMinigame}
                        className="px-2 py-0.5 rounded bg-red-900/70 hover:bg-red-800 text-red-200 border border-red-500/50 font-bold"
                      >
                        ⚔️ มินิเกม
                      </SafeActionButton>
                      {lms.phase === 'PART1_MINIGAME' && lms.part1Round === 4 && (
                        <SafeActionButton
                          type="button"
                          showSpinner={false}
                          onClick={rollKrampusDeathDice}
                          className="px-2 py-0.5 rounded bg-orange-500 text-black font-black"
                        >
                          🎲 ทอยเต๋า ({lms.krampusDiceRoll ?? '?'})
                        </SafeActionButton>
                      )}
                    </div>
                  </div>

                  {currentP1Q && (
                    <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2">
                      <div className="text-sm font-black text-white">{currentP1Q.questionText}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {currentP1Q.choices.map((c) => (
                          <div
                            key={c.key}
                            className={`px-2.5 py-1.5 rounded-lg border ${
                              c.key === currentP1Q.correctKey
                                ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 font-black'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            {c.key}. {c.label} {c.key === currentP1Q.correctKey ? '✓' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {lms.killFeed.length > 0 && (
                    <div className="space-y-1 pt-2 border-t border-slate-800">
                      <div className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                        Kill Feed ล่าสุด:
                      </div>
                      {lms.killFeed.slice(0, 4).map((kf) => (
                        <div key={kf.id} className="text-xs text-slate-300 truncate">
                          {kf.icon} {kf.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ================= PART 2 TAB ================= */}
          {subTab === 'PART2' && (() => {
            const isClueStandby = lms.phase === 'PART2_CLUE';
            const isQActive = lms.phase === 'PART2_QUESTION' && round.status === 'ACTIVE';
            const isQLocked = lms.phase === 'PART2_QUESTION' && round.status === 'LOCKED';
            const isP2Revealed = lms.phase === 'PART2_REVEAL';
            const isChamp = lms.phase === 'CHAMPION';

            const activeStep: 1 | 2 | 3 | 4 = !isPart2Phase
              ? 1
              : isClueStandby
              ? 2
              : isQActive || isQLocked
              ? 3
              : 4;

            return (
              <div className="space-y-4">
                {!isPart2Phase && (
                  <div className="rounded-xl bg-amber-950/50 border border-amber-400/70 p-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-200">
                      ยังอยู่ในช่วงที่ 1 — กดปุ่มเพื่อแปลงเงินคงเหลือเป็นแต้มต่อ (400 ฿ = +1 ขั้น) และเริ่มบันได 25 ขั้น
                    </span>
                    <SafeActionButton
                      type="button"
                      loadingText="กำลังเริ่มช่วงที่ 2..."
                      onClick={startLastManPart2Escape}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs"
                    >
                      🪜 เริ่มช่วงที่ 2: บันได 25 ขั้น!
                    </SafeActionButton>
                  </div>
                )}

                <RoundStepperBar
                  activeStep={activeStep}
                  briefingOpen={Boolean(round.briefingOpen)}
                  onToggleBriefing={() => updateRoundConfig({ briefingOpen: !round.briefingOpen })}
                  step1={{
                    label: '1. รีสตาร์ท/เข้าช่วง 2 (Standby)',
                    sublabel: 'แปลง 400 ฿ = +1 ขั้น • โชว์เฉพาะเบาะแส',
                    onClick: startLastManPart2Escape,
                  }}
                  step2={{
                    label: '2. ▶️ เปิดคำถาม + ปลดล็อก A/B/C',
                    sublabel: 'ขึ้นตัวเลือก 3 สี & เริ่มจับเวลา',
                    disabled: !isClueStandby,
                    onClick: openLastManPart2Question,
                  }}
                  step3={{
                    label: isQActive
                      ? '3. ⏸️ ล็อกปุ่มสี (Pause)'
                      : '3. ✅ เฉลย & เดินหน้า (+Krampus 1.5)',
                    sublabel: isQActive
                      ? 'หยุดรับคำตอบก่อนเฉลย'
                      : 'ขยับขั้น + ตรวจการสิงร่าง + Krampus ไล่ล่า',
                    disabled: !isQActive && !isQLocked,
                    onClick: isQActive ? lockRound : revealLastManPart2Question,
                  }}
                  step4={
                    isChamp
                      ? {
                          label: '4. 🏆 ไปหน้า Finale ฉลองแชมป์!',
                          sublabel: 'แสดงผู้ชนะเลิศแห่งค่ายบนจอใหญ่',
                          onClick: () => {
                            finishLastManStandingGame(true);
                            onGoToFinale();
                          },
                        }
                      : {
                          label: '4. ⏭️ ข้อถัดไป (Standby เบาะแส)',
                          sublabel: 'โหลดเบาะแสข้อต่อไป & ล็อกปุ่ม A/B/C',
                          disabled: !isPart2Phase,
                          onClick: nextLastManPart2Question,
                        }
                  }
                  secondaryStep3Action={
                    isQActive
                      ? {
                          label: '⚡ บังคับเฉลยเลย (Override)',
                          onClick: revealLastManPart2Question,
                        }
                      : undefined
                  }
                />

                {/* 0-25 Staircase Progress Visualizer */}
                <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-white">
                      🪜 สถานะบันไดหนีตาย (ข้อ {lms.part2QuestionIndex + 1}/{p2List.length})
                    </span>
                    <span className="px-2 py-0.5 rounded bg-red-950 border border-red-500/60 text-red-300 font-mono font-bold">
                      👹 Krampus อยู่ขั้น: {lms.krampusStep}/25
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {active.map((tid) => {
                      const ts = lms.teamStates[tid];
                      const pct = Math.min(100, (ts.step / 25) * 100);
                      return (
                        <div key={tid} className="flex items-center gap-2 text-xs">
                          <span className="w-28 truncate font-bold text-slate-200">
                            {teams[tid].icon} {teams[tid].name}
                          </span>
                          <div className="flex-1 h-4 rounded-full bg-slate-950 border border-slate-800 overflow-hidden relative">
                            <div
                              className={`h-full transition-all ${
                                ts.isGhost ? 'bg-purple-600' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-16 text-right font-mono font-bold text-amber-300">
                            {ts.step}/25
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Part 2 Host Question Preview */}
                {currentP2Q && (
                  <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-black text-amber-300">
                        HOST PREVIEW • เบาะแส & เฉลยข้อที่ {lms.part2QuestionIndex + 1}
                      </span>
                      {isP2Revealed && (
                        <span className="text-xs font-bold text-emerald-300">
                          ✓ เฉลยข้อนี้แล้ว
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-200 font-bold">
                      💡 เบาะแส: {currentP2Q.clueText}
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm font-black text-white">
                      ❓ {currentP2Q.questionText}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs">
                      {currentP2Q.choices.map((c) => (
                        <div
                          key={c.key}
                          className={`p-2 rounded-lg border ${
                            c.key === currentP2Q.correctKey
                              ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 font-black'
                              : 'bg-slate-950 border-slate-800 text-slate-300'
                          }`}
                        >
                          {c.key}. {c.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        /* EDIT QUESTIONS SUB-TAB */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5 max-h-[65vh] overflow-y-auto">
            <h3 className="text-xs font-black text-rose-300 uppercase">
              📝 แก้ไขโจทย์ช่วงที่ 1 (4 รอบ • 4 ตัวเลือก + รูปภาพ)
            </h3>
            {p1List.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2"
              >
                <div className="text-xs font-black text-amber-300">รอบที่ {idx + 1}</div>
                <input
                  type="text"
                  value={q.questionText}
                  onChange={(e) =>
                    updateLastManPart1Question(q.id, { questionText: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  placeholder="คำถาม..."
                />
                <input
                  type="text"
                  value={q.imageUrl || ''}
                  onChange={(e) =>
                    updateLastManPart1Question(q.id, { imageUrl: e.target.value })
                  }
                  className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                  placeholder="URL รูปภาพประกอบ (ไม่บังคับ)..."
                />
                <div className="grid grid-cols-2 gap-1.5">
                  {q.choices.map((c) => (
                    <div key={c.key} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateLastManPart1Question(q.id, { correctKey: c.key })}
                        className={`px-2 py-1 rounded text-[10px] font-black ${
                          q.correctKey === c.key
                            ? 'bg-emerald-500 text-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.key}
                      </button>
                      <input
                        type="text"
                        value={c.label}
                        onChange={(e) =>
                          updateLastManPart1Question(q.id, {
                            choices: q.choices.map((x) =>
                              x.key === c.key ? { ...x, label: e.target.value } : x
                            ),
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-2.5 max-h-[65vh] overflow-y-auto">
            <h3 className="text-xs font-black text-emerald-300 uppercase">
              🪜 แก้ไขโจทย์ช่วงที่ 2 (บันได 25 ขั้น • เบาะแส + 3 ตัวเลือก + เวลา)
            </h3>
            {p2List.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-300">ข้อที่ {idx + 1}</span>
                  <div className="flex items-center gap-1 text-[11px] text-slate-300">
                    <span>เวลา (วิ):</span>
                    <input
                      type="number"
                      min={10}
                      max={180}
                      value={q.durationSeconds}
                      onChange={(e) =>
                        updateLastManPart2Question(q.id, {
                          durationSeconds: Math.max(10, Number(e.target.value) || 60),
                        })
                      }
                      className="w-14 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-center text-white"
                    />
                  </div>
                </div>
                <input
                  type="text"
                  value={q.clueText}
                  onChange={(e) => updateLastManPart2Question(q.id, { clueText: e.target.value })}
                  className="w-full px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-amber-200"
                  placeholder="เบาะแส / ประโยคตั้งต้น..."
                />
                <input
                  type="text"
                  value={q.questionText}
                  onChange={(e) =>
                    updateLastManPart2Question(q.id, { questionText: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  placeholder="คำถาม..."
                />
                <div className="grid grid-cols-1 gap-1">
                  {q.choices.map((c) => (
                    <div key={c.key} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateLastManPart2Question(q.id, { correctKey: c.key })}
                        className={`px-2 py-1 rounded text-[10px] font-black ${
                          q.correctKey === c.key
                            ? 'bg-emerald-500 text-black'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {c.key}
                      </button>
                      <input
                        type="text"
                        value={c.label}
                        onChange={(e) =>
                          updateLastManPart2Question(q.id, {
                            choices: q.choices.map((x) =>
                              x.key === c.key ? { ...x, label: e.target.value } : x
                            ),
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
