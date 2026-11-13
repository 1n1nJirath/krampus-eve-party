import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Delete,
  Lock,
  RefreshCw,
  Sparkles,
  Bell,
  Trophy,
  Swords,
  Gavel,
  Shield,
  Skull,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { TEAM_ORDER } from '../data/initialData';
import { TeamId } from '../types/game';
import { CountdownTimer } from '../components/CountdownTimer';

export const TeamController: React.FC = () => {
  const { state, registerTeam, submitTeamAnswer, pressTeamBuzzer } = useGame();
  const { round, teams, submissions, buzzerQueue } = state;

  // Read ?team=1..4 from URL query parameter or localStorage
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const tParam = params.get('team');
    if (tParam === '1' || tParam === 'team1') return 'team1';
    if (tParam === '2' || tParam === 'team2') return 'team2';
    if (tParam === '3' || tParam === 'team3') return 'team3';
    if (tParam === '4' || tParam === 'team4') return 'team4';
    const saved = localStorage.getItem('krampus_selected_team') as TeamId | null;
    if (saved && TEAM_ORDER.includes(saved)) return saved;
    return null;
  });

  // Sub-GM Registration form state
  const [isEditingRegistration, setIsEditingRegistration] = useState<boolean>(false);
  const [regSlotId, setRegSlotId] = useState<TeamId>(() => selectedTeamId || 'team1');
  const [regTeamName, setRegTeamName] = useState<string>('');
  const [regTeamMotto, setRegTeamMotto] = useState<string>('');
  const [regTeamIcon, setRegTeamIcon] = useState<string>('🛡️');

  useEffect(() => {
    const targetTid = selectedTeamId || regSlotId;
    const t = teams[targetTid];
    if (t) {
      setRegSlotId(targetTid);
      setRegTeamName(t.isRegistered ? t.name : '');
      setRegTeamMotto(t.motto || 'แก๊งเด็กดื้อท้าชนครามปุส!');
      setRegTeamIcon(t.icon || '🛡️');
    }
  }, [selectedTeamId]);

  // Local draft inputs before pressing Confirm
  const [draftChoice, setDraftChoice] = useState<string | null>(null);
  const [draftYear, setDraftYear] = useState<string>('');
  const [draftSecretNum, setDraftSecretNum] = useState<number | null>(null);
  const [draftWager, setDraftWager] = useState<string>('100');
  const [draftQuixortOutcome, setDraftQuixortOutcome] = useState<'PASS' | 'FAIL'>('PASS');

  // Game 1 ("The 8 Doors of Krampus") specific drafts
  const [draftAuctionBid, setDraftAuctionBid] = useState<number>(100);
  const [draftSideBet, setDraftSideBet] = useState<'SAFE' | 'FAIL' | null>(null);
  const [draftRank1Door, setDraftRank1Door] = useState<string | null>(null);
  const [draftRank8Door, setDraftRank8Door] = useState<string | null>(null);
  const [activePolaritySlot, setActivePolaritySlot] = useState<'RANK1' | 'RANK8'>('RANK1');

  // Reset local drafts whenever round ID, sub-round, or status changes
  useEffect(() => {
    setDraftChoice(null);
    setDraftYear('');
    setDraftSecretNum(null);
    setDraftWager('100');
    setDraftQuixortOutcome('PASS');
    setDraftAuctionBid(100);
    setDraftSideBet(null);
    setDraftRank1Door(null);
    setDraftRank8Door(null);
    setActivePolaritySlot('RANK1');
  }, [round.id, round.eightDoorsSubRound, round.auctionIteration, round.status]);

  const handleSelectTeam = (tid: TeamId) => {
    setSelectedTeamId(tid);
    localStorage.setItem('krampus_selected_team', tid);
    const num = teams[tid].number;
    const url = new URL(window.location.href);
    url.searchParams.set('team', String(num));
    window.history.replaceState({}, '', url.toString());
  };

  const teamRank = useMemo(() => {
    if (!selectedTeamId) return 1;
    const sorted = TEAM_ORDER.map((id) => teams[id]).sort((a, b) => b.coins - a.coins);
    return sorted.findIndex((t) => t.id === selectedTeamId) + 1;
  }, [teams, selectedTeamId]);

  // ==============================================================
  // 1. SUB-GM REGISTRATION & SLOT SELECTION SCREEN (/play)
  // ==============================================================
  const needsRegistration =
    !selectedTeamId || isEditingRegistration || !teams[selectedTeamId]?.isRegistered;

  if (needsRegistration) {
    const activeSlotTeam = teams[regSlotId];
    const iconOptions = ['🛡️', '🎄', '🪙', '❄️', '🦌', '⛄', '🎅', '🐐', '🔔', '🍪'];
    const funnySampleNames = [
      'แก๊งเด็กดื้อไม่กลัวแพะ',
      'ซานต้าส่งมาป่วน',
      'กวางเรนเดียร์สายดริฟต์',
      'ผู้รอดชีวิตหอใน',
      'ภาคีคุกกี้กล่องแดง',
      'อัศวินโต้รุ่งส่งงาน',
    ];

    const handlePickSlot = (tid: TeamId) => {
      setRegSlotId(tid);
      const t = teams[tid];
      setRegTeamName(t.isRegistered ? t.name : '');
      setRegTeamMotto(t.motto || 'พร้อมลุยคืนคริสต์มาสอีฟ!');
      setRegTeamIcon(t.icon);
    };

    const handleSubmitRegistration = (e: React.FormEvent) => {
      e.preventDefault();
      const finalName =
        regTeamName.trim() || `Team ${activeSlotTeam.number} (${activeSlotTeam.name.split(' ')[0]})`;
      registerTeam(regSlotId, finalName, regTeamIcon, regTeamMotto.trim() || 'พร้อมลุย!');
      handleSelectTeam(regSlotId);
      setIsEditingRegistration(false);
    };

    return (
      <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-4 select-none">
        <div className="max-w-md w-full mx-auto my-auto space-y-4">
          {/* Header Banner (2D Cutout Style) */}
          <div className="rounded-3xl bg-[#b91c1c] border-4 border-black shadow-[6px_6px_0px_#000] p-4 text-center">
            <div className="inline-block px-3 py-0.5 rounded-lg bg-[#facc15] text-black border-2 border-black font-mono text-xs font-black uppercase mb-1">
              THE KRAMPUS EVE • SUB-GM REGISTRATION
            </div>
            <h1
              className="text-2xl font-black text-white"
              style={{ textShadow: '2px 2px 0px #000' }}
            >
              ลงทะเบียนทีมประจำกลุ่ม
            </h1>
            <p className="text-xs font-bold text-amber-100 mt-0.5">
              1. เลือก Slot ทีม (1-4) • 2. ตั้งชื่อทีม • 3. กด Submit ส่งขึ้นจอใหญ่!
            </p>
          </div>

          {/* Step 1: Pick Team Slot (1 - 4) */}
          <div className="rounded-3xl bg-slate-900 border-4 border-black shadow-[6px_6px_0px_#000] p-4">
            <div className="text-xs font-mono uppercase text-amber-400 font-black mb-2.5">
              STEP 1: เลือก SLOT ทีมของคุณ (TEAM 1 - 4)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {TEAM_ORDER.map((tid) => {
                const t = teams[tid];
                const isSelected = regSlotId === tid;
                const isTaken = Boolean(t.isRegistered);

                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => handlePickSlot(tid)}
                    className={`p-3 rounded-2xl border-[3px] border-black text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-amber-400 text-black shadow-[4px_4px_0px_#000] scale-[1.02]'
                        : isTaken
                        ? 'bg-emerald-950/90 text-white hover:bg-emerald-900'
                        : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded border border-black ${
                          isSelected ? 'bg-black text-amber-300' : 'bg-slate-950 text-amber-300'
                        }`}
                      >
                        TEAM {t.number}
                      </span>
                      <span className="text-2xl">{t.icon}</span>
                    </div>

                    <div className="font-extrabold text-sm truncate">
                      {isTaken ? t.name : 'ว่าง (กดเลือกได้)'}
                    </div>

                    <div className="mt-1">
                      {isTaken ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border border-black ${
                            isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-400 text-black'
                          }`}
                        >
                          ✅ พร้อมลุย!
                        </span>
                      ) : (
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isSelected ? 'bg-black/20 text-black' : 'bg-slate-950 text-slate-300'
                          }`}
                        >
                          🟢 Slot ว่างอยู่
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Reconnect Button if this slot is already registered (e.g., phone disconnected mid-game) */}
            {activeSlotTeam.isRegistered && (
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-xs text-emerald-300 font-bold">
                  Slot นี้ลงทะเบียนชื่อ “{activeSlotTeam.name}” แล้ว
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectTeam(regSlotId);
                    setIsEditingRegistration(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs border-2 border-black shadow-[2px_2px_0px_#000] shrink-0"
                >
                  เข้าควบคุมทีมนี้ต่อทันที ➔
                </button>
              </div>
            )}
          </div>

          {/* Step 2: Team Name & Icon Registration Form */}
          <form
            onSubmit={handleSubmitRegistration}
            className="rounded-3xl bg-slate-900 border-4 border-black shadow-[6px_6px_0px_#000] p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-amber-400 font-black">
                STEP 2: ตั้งชื่อทีมสำหรับ TEAM {activeSlotTeam.number}
              </span>
              <button
                type="button"
                onClick={() => {
                  const randomName =
                    funnySampleNames[Math.floor(Math.random() * funnySampleNames.length)];
                  setRegTeamName(randomName);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-600 text-xs font-bold"
              >
                🎲 สุ่มชื่อกวนๆ
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1">
                ชื่อทีมของคุณ (จะเด้งขึ้นจอใหญ่ /display ทันที):
              </label>
              <input
                type="text"
                required
                maxLength={32}
                value={regTeamName}
                onChange={(e) => setRegTeamName(e.target.value)}
                placeholder={`พิมพ์ชื่อทีมกลุ่มที่ ${activeSlotTeam.number}...`}
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border-[3px] border-black focus:border-amber-400 text-white font-extrabold text-base focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-200 mb-1.5">
                เลือกไอคอนประจำกลุ่ม:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {iconOptions.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setRegTeamIcon(ic)}
                    className={`py-2 rounded-xl text-2xl border-2 border-black flex items-center justify-center transition ${
                      regTeamIcon === ic
                        ? 'bg-amber-400 scale-105 shadow-[3px_3px_0px_#000]'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                สโลแกน / คำขวัญข่มขวัญทีมอื่น (ไม่บังคับ):
              </label>
              <input
                type="text"
                maxLength={45}
                value={regTeamMotto}
                onChange={(e) => setRegTeamMotto(e.target.value)}
                placeholder="เช่น เด็กดื้อพร้อมบวกครามปุส!"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border-2 border-slate-700 text-slate-200 text-xs font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-2xl bg-[#22c55e] hover:bg-emerald-400 active:scale-[0.99] text-black font-black text-lg border-4 border-black shadow-[5px_5px_0px_#000] flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-6 h-6 stroke-[3]" />
              <span>Submit ส่งชื่อทีมขึ้นจอใหญ่!</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const team = teams[selectedTeamId];
  const mySubmission = submissions[selectedTeamId];
  const myBuzzerEntry = buzzerQueue.find((b) => b.teamId === selectedTeamId);
  const isRoundActive = round.status === 'ACTIVE';
  const isRevealed = round.status === 'REVEALED';
  const isEightDoorsGame = round.gameStage === 'POLL_MINE' && round.inputMode === 'MODE_A_CHOICE';
  const subRound = round.eightDoorsSubRound || 'SUB1_SURVIVAL';

  const appendDigit = (digit: string, current: string, setter: (v: string) => void, maxLen = 4) => {
    if (current.length >= maxLen) return;
    setter(current + digit);
  };

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between select-none pb-6">
      {/* ============================================================
          MOBILE CONTROLLER TOP STATUS BAR
      ============================================================ */}
      <header className="sticky top-0 z-30 bg-slate-950/95 border-b-2 border-amber-500/40 px-4 py-3 backdrop-blur-md">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={() => setIsEditingRegistration(true)}
              className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-2xl shrink-0 active:scale-95"
              title="แตะเพื่อแก้ไขชื่อทีมหรือเปลี่ยนทีม"
            >
              {team.icon}
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-black text-amber-400">
                  TEAM {team.number}
                </span>
                <span className="px-2 py-0.2 rounded-full bg-slate-800 text-[11px] font-mono text-slate-200">
                  อันดับ #{teamRank}
                </span>
              </div>
              <div className="font-extrabold text-sm text-white truncate">{team.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right font-mono">
              <div className="text-base font-black text-amber-300 flex items-center justify-end gap-1">
                <span>{team.coins.toLocaleString()}</span>
                <span className="text-sm">🪙</span>
              </div>
              <div className="text-[11px] text-slate-200 font-bold">
                {team.shields > 0 ? `เกราะ ${'🛡️'.repeat(team.shields)}` : '👹 NAUGHTY LIST'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================================
          MAIN CONTROLLER BODY
      ============================================================ */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 pt-3 flex flex-col justify-between gap-4">
        {/* Compact Question & Timer Card */}
        <div className="rounded-2xl bg-slate-900/95 border border-slate-700/80 p-3.5 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-red-700/60 text-amber-300 text-[11px] font-bold">
              {round.title}
            </span>
            <CountdownTimer size="sm" />
          </div>
          <p className="text-sm md:text-base font-bold text-white leading-snug">
            {round.questionText}
          </p>
          <p className="text-xs text-amber-200/90 font-semibold mt-1">{round.subtitle}</p>
        </div>

        {/* Waiting / Ready Overlay if in LOBBY, WORLD_MAP, or Round is IDLE */}
        {(round.gameStage === 'LOBBY' || round.gameStage === 'WORLD_MAP') && (
          <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-emerald-950/90 to-slate-950 border-4 border-black shadow-[6px_6px_0px_#000] p-6 text-center my-2 space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-[#fef08a] border-4 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-5xl">
              {team.icon}
            </div>
            <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-xl bg-[#22c55e] text-black border-2 border-black font-black text-sm shadow-[3px_3px_0px_#000]">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>พร้อมลุย! (แสดงบนจอ /display แล้ว)</span>
            </div>
            <div>
              <div className="text-xs font-mono text-amber-300 font-bold">
                TEAM {team.number} REGISTERED
              </div>
              <h2 className="text-2xl font-black text-white mt-0.5">{team.name}</h2>
              <p className="text-xs text-slate-300 mt-1">“{team.motto}”</p>
            </div>
            <p className="text-sm text-amber-200 font-bold">
              {round.gameStage === 'LOBBY'
                ? 'รอ GM ใหญ่กด “เริ่มเข้าสู่คฤหาสน์ (Start Game)”...'
                : 'เข้าสู่แผนที่คฤหาสน์แล้ว! รอ GM ใหญ่เลือกห้องบททดสอบ...'}
            </p>
            <button
              type="button"
              onClick={() => setIsEditingRegistration(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-black text-xs font-bold"
            >
              ✏️ แก้ไขชื่อทีม / เปลี่ยน Slot ทีม
            </button>
          </div>
        )}

        {round.gameStage !== 'LOBBY' &&
          round.gameStage !== 'WORLD_MAP' &&
          round.status === 'IDLE' && (
            <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-900/70 border-2 border-dashed border-slate-700 p-8 text-center my-2">
              <Sparkles className="w-12 h-12 text-amber-400 animate-spin mb-3" />
              <h2 className="text-xl font-extrabold text-white">รอ GM ใหญ่เริ่มจับเวลา...</h2>
              <p className="text-sm text-slate-300 mt-1">
                เมื่อ GM กดเริ่มรอบคำถาม ปุ่มส่งคำตอบจะปรากฏขึ้นบนหน้าจอนี้ทันที
              </p>
            </div>
          )}

        {/* ==========================================================
            ALREADY SUBMITTED STATE
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.inputMode !== 'MODE_C_BUZZER' &&
          mySubmission && (
            <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-emerald-950/80 to-slate-950 border-2 border-emerald-400 p-6 text-center shadow-[0_0_30px_rgba(16,185,129,0.25)] my-2">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-3" />
              <div className="text-xs font-mono uppercase tracking-widest text-emerald-300 font-bold">
                LOCKED IN • ส่งคำตอบสำเร็จ
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                บันทึกคำตอบของ Team {team.number} แล้ว!
              </h2>

              <div className="my-4 px-6 py-4 rounded-2xl bg-black/60 border border-white/10 w-full">
                <div className="text-xs text-slate-300 mb-1">ข้อมูลที่ส่ง:</div>
                <div className="text-2xl md:text-3xl font-mono font-black text-amber-300">
                  {(round.inputMode === 'MODE_D_SECRET' ||
                    (isEightDoorsGame && subRound === 'SUB2_AUCTION')) &&
                  !isRevealed
                    ? '🔒 เก็บเป็นความลับ'
                    : isEightDoorsGame && subRound === 'SUB3_POLARITY'
                    ? `อันดับ #1 = [ ${mySubmission.value} ] • อันดับ #8 = [ ${mySubmission.secondaryValue} ]`
                    : isEightDoorsGame &&
                      subRound === 'SUB2_DOOR_AND_BET' &&
                      round.auctionWinnerTeamId !== selectedTeamId
                    ? String(mySubmission.value) === 'SAFE'
                      ? '🛡️ ทายว่ารอด (ถูก)'
                      : '💀 ทายว่าพัง (ผิด)'
                    : String(mySubmission.value)}
                </div>
                {mySubmission.secondaryValue &&
                  isRevealed &&
                  !(isEightDoorsGame && subRound === 'SUB3_POLARITY') && (
                    <div className="text-sm font-bold text-amber-200 mt-1">
                      ({mySubmission.secondaryValue})
                    </div>
                  )}
                <div className="text-xs font-mono text-slate-300 mt-2">
                  ความเร็ว: {(mySubmission.elapsedMs / 1000).toFixed(3)} วินาที ({mySubmission.elapsedMs} ms)
                </div>
              </div>

              <p className="text-xs text-slate-300">
                รอดูผลเฉลยพร้อมกันบนจอ Projector ใหญ่!
              </p>
            </div>
          )}

        {/* ==========================================================
            GAME 1: THE 8 DOORS OF KRAMPUS (3 SUB-ROUNDS ON MOBILE)
        ========================================================== */}
        {round.status !== 'IDLE' && isEightDoorsGame && !mySubmission && (
          <div className="flex-1 flex flex-col justify-between gap-3">
            {!isRoundActive ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-red-950/40 border-2 border-red-600/60 p-6 text-center">
                <Lock className="w-12 h-12 text-red-400 mb-2" />
                <h3 className="text-xl font-extrabold text-white">ปิดรับคำตอบแล้ว!</h3>
              </div>
            ) : subRound === 'SUB1_SURVIVAL' ? (
              /* ด่านย่อยที่ 1: เปิดทางรอด (เลือก 1 ประตู A-H ค้นหาอันดับ 1-3) */
              <>
                <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/50 px-3 py-2 text-center text-xs font-bold text-emerald-200">
                  🛡️ ด่านย่อยที่ 1: เลือกประตู A - H เพื่อหาอันดับ 1, 2 หรือ 3 (+300🪙 / พลาด -1🛡️)
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {round.choices.slice(0, 8).map((choice) => {
                    const isSelected = draftChoice === choice.key;
                    return (
                      <button
                        key={choice.key}
                        type="button"
                        onClick={() => setDraftChoice(choice.key)}
                        disabled={Boolean(choice.isOpened)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 active:scale-[0.98] ${
                          choice.isOpened
                            ? 'bg-slate-950 border-slate-800 opacity-40 cursor-not-allowed'
                            : isSelected
                            ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                            : 'bg-slate-900/95 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <span
                          className={`w-10 h-10 rounded-xl font-mono font-black text-lg flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-red-950 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {choice.key}
                        </span>
                        <span className="font-bold text-xs md:text-sm text-white line-clamp-2">
                          {choice.isOpened ? `[#${choice.rank}] ${choice.label}` : choice.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={!draftChoice}
                  onClick={() => draftChoice && submitTeamAnswer(selectedTeamId, draftChoice)}
                  className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition-all shadow-xl ${
                    draftChoice
                      ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(234,179,8,0.5)] active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {draftChoice
                    ? `ยืนยันเลือกประตู [ ${draftChoice} ]`
                    : 'กรุณาแตะเลือกประตู A - H'}
                </button>
              </>
            ) : subRound === 'SUB2_AUCTION' ? (
              /* ด่านย่อยที่ 2 Phase 1: ประมูลชิงสิทธิ์ (บิดทีละ 50 เหรียญ, ล็อกผู้ชนะรอบ 2.1 ในรอบ 2.2) */
              round.auctionIteration === 2 && round.subRound2LockedTeamId === selectedTeamId ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-amber-950/50 border-2 border-amber-400 p-6 text-center my-2">
                  <Lock className="w-14 h-14 text-amber-300 mb-3" />
                  <h3 className="text-xl font-black text-white">
                    คุณชนะการประมูลในรอบ 2.1 ไปแล้ว!
                  </h3>
                  <p className="text-sm text-amber-200 mt-2">
                    ตามกติกา ปุ่มประมูลของทีมคุณจะถูกล็อกในรอบ 2.2 เพื่อให้ 3 ทีมที่เหลือประมูลแข่งกัน และคุณจะได้ร่วมแทงข้างในขั้นตอนถัดไป!
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-amber-950/60 border border-amber-500/50 px-3 py-2 text-center text-xs font-bold text-amber-200">
                    🔨 ด่านย่อยที่ 2.{round.auctionIteration || 1} (ประมูลชิงสิทธิ์): บิดเงินเพิ่มทีละ 50🪙 ทีมที่บิดสูงสุดจะได้สิทธิ์เปิดประตูหาอันดับ 2-4!
                  </div>

                  <div className="rounded-2xl bg-black/80 border-2 border-amber-500/60 p-4 text-center">
                    <div className="text-xs text-slate-300">
                      ยอดบิดประมูลของคุณ (มีเหรียญอยู่ {team.coins.toLocaleString()} 🪙)
                    </div>
                    <div className="text-5xl font-mono font-black text-amber-300 my-2">
                      {draftAuctionBid.toLocaleString()} 🪙
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftAuctionBid((prev) => Math.max(0, prev - 50))
                        }
                        className="px-5 py-2.5 rounded-xl bg-red-900/70 hover:bg-red-800 border border-red-500 font-mono font-black text-lg text-white active:scale-95"
                      >
                        -50 🪙
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftAuctionBid((prev) =>
                            Math.min(Math.max(0, Math.floor(team.coins / 50) * 50), prev + 50)
                          )
                        }
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 border border-emerald-400 font-mono font-black text-lg text-white active:scale-95"
                      >
                        +50 🪙
                      </button>
                    </div>
                  </div>

                  {/* Step-50 Quick Chips */}
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 150, 200, 250, 300, 400, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setDraftAuctionBid(Math.min(Math.max(0, team.coins), amt))}
                        className={`py-2.5 rounded-xl border font-mono font-black text-sm transition ${
                          draftAuctionBid === amt
                            ? 'bg-amber-400 text-slate-950 border-white shadow'
                            : 'bg-slate-900 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {amt} 🪙
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => submitTeamAnswer(selectedTeamId, draftAuctionBid)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-lg uppercase shadow-xl active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Gavel className="w-5 h-5" />
                    <span>ยืนยันบิดประมูล [ {draftAuctionBid} 🪙 ]</span>
                  </button>
                </>
              )
            ) : subRound === 'SUB2_DOOR_AND_BET' ? (
              /* ด่านย่อยที่ 2 Phase 2: ทีมชนะประมูลเลือกประตู A-H / อีก 3 ทีมแทงข้าง รอด หรือ พัง */
              round.auctionWinnerTeamId === selectedTeamId ? (
                <>
                  <div className="rounded-xl bg-amber-500/20 border-2 border-amber-400 p-3 text-center">
                    <div className="text-sm font-black text-amber-300">
                      👑 คุณชนะการประมูล! เลือกเปิดประตู 1 บาน
                    </div>
                    <div className="text-xs text-slate-200 mt-0.5">
                      ค้นหาประตูอันดับ 2, 3 หรือ 4 (ถูกได้ +500🪙 / ผิดเสียเกราะ -1🛡️)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {round.choices.slice(0, 8).map((choice) => {
                      const isSelected = draftChoice === choice.key;
                      return (
                        <button
                          key={choice.key}
                          type="button"
                          onClick={() => setDraftChoice(choice.key)}
                          disabled={Boolean(choice.isOpened)}
                          className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-2.5 ${
                            choice.isOpened
                              ? 'bg-slate-950 border-slate-800 opacity-35 cursor-not-allowed'
                              : isSelected
                              ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                              : 'bg-slate-900/95 border-slate-700'
                          }`}
                        >
                          <span
                            className={`w-10 h-10 rounded-xl font-mono font-black text-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-red-950 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {choice.key}
                          </span>
                          <span className="font-bold text-xs md:text-sm text-white line-clamp-2">
                            {choice.isOpened ? `[#${choice.rank}] เปิดแล้ว` : choice.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={!draftChoice}
                    onClick={() => draftChoice && submitTeamAnswer(selectedTeamId, draftChoice)}
                    className={`w-full py-4 rounded-2xl font-black text-lg uppercase transition-all shadow-xl ${
                      draftChoice
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {draftChoice
                      ? `ยืนยันเปิดประตู [ ${draftChoice} ]`
                      : 'เลือกประตูที่ยังไม่เปิด 1 บาน'}
                  </button>
                </>
              ) : (
                /* อีก 3 ทีมที่เหลือ: ปุ่มแทงข้าง [ ทายว่ารอด (ถูก) ] หรือ [ ทายว่าพัง (ผิด) ] */
                <>
                  <div className="rounded-xl bg-purple-950/60 border border-purple-400/60 p-3 text-center">
                    <div className="text-sm font-black text-purple-200">
                      🎲 โหมดแทงข้างทีมผู้ชนะประมูล ({teams[round.auctionWinnerTeamId || 'team1'].name})
                    </div>
                    <div className="text-xs text-slate-200 mt-0.5">
                      ทายถูกได้ +200 🪙 • ทายผิดเสีย -100 🪙 (ไม่เสียเกราะเด็กดี)
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 my-auto">
                    <button
                      type="button"
                      onClick={() => setDraftSideBet('SAFE')}
                      className={`p-5 rounded-3xl border-2 text-center transition-all flex flex-col items-center gap-2 ${
                        draftSideBet === 'SAFE'
                          ? 'bg-emerald-600 text-white border-amber-300 shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-[1.02]'
                          : 'bg-slate-900 text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      <Shield className="w-10 h-10" />
                      <span className="text-xl font-black">[ ทายว่ารอด (ถูก) ]</span>
                      <span className="text-xs opacity-90">
                        เชื่อว่าเพื่อนจะเปิดเจอประตูอันดับ 2, 3 หรือ 4
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDraftSideBet('FAIL')}
                      className={`p-5 rounded-3xl border-2 text-center transition-all flex flex-col items-center gap-2 ${
                        draftSideBet === 'FAIL'
                          ? 'bg-red-600 text-white border-amber-300 shadow-[0_0_30px_rgba(239,68,68,0.5)] scale-[1.02]'
                          : 'bg-slate-900 text-red-300 border-red-500/40'
                      }`}
                    >
                      <Skull className="w-10 h-10" />
                      <span className="text-xl font-black">[ ทายว่าพัง (ผิด) ]</span>
                      <span className="text-xs opacity-90">
                        เชื่อว่าเพื่อนจะเปิดพลาดไปโดนประตูอันดับอื่น!
                      </span>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!draftSideBet}
                    onClick={() => draftSideBet && submitTeamAnswer(selectedTeamId, draftSideBet)}
                    className={`w-full py-4 rounded-2xl font-black text-lg uppercase transition-all shadow-xl ${
                      draftSideBet
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {draftSideBet === 'SAFE'
                      ? 'ยืนยันแทงข้าง: [ ทายว่ารอด (ถูก) ]'
                      : draftSideBet === 'FAIL'
                      ? 'ยืนยันแทงข้าง: [ ทายว่าพัง (ผิด) ]'
                      : 'แตะเลือก ทายว่ารอด หรือ ทายว่าพัง'}
                  </button>
                </>
              )
            ) : (
              /* ด่านย่อยที่ 3: วัดใจขั้วตรงข้าม (เลือก 2 ช่อง: อันดับ #1 และ อันดับ #8) */
              <>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActivePolaritySlot('RANK1')}
                    className={`p-3 rounded-2xl border-2 text-center transition ${
                      activePolaritySlot === 'RANK1'
                        ? 'bg-emerald-950 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-emerald-300">
                      1. ประตูอันดับ #1 (มากสุด)
                    </div>
                    <div className="text-3xl font-mono font-black text-white mt-1">
                      {draftRank1Door || '?'}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePolaritySlot('RANK8')}
                    className={`p-3 rounded-2xl border-2 text-center transition ${
                      activePolaritySlot === 'RANK8'
                        ? 'bg-red-950 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-red-300">
                      2. ประตูอันดับ #8 (น้อยสุด)
                    </div>
                    <div className="text-3xl font-mono font-black text-white mt-1">
                      {draftRank8Door || '?'}
                    </div>
                  </button>
                </div>

                <div className="text-center text-xs font-bold text-amber-300">
                  กำลังเลือกช่อง:{' '}
                  {activePolaritySlot === 'RANK1'
                    ? '🌟 อันดับ #1 (คนเลือกเยอะสุด)'
                    : '💀 อันดับ #8 (คนเลือกน้อยสุด)'}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {round.choices.slice(0, 8).map((choice) => {
                    const isPicked1 = draftRank1Door === choice.key;
                    const isPicked8 = draftRank8Door === choice.key;
                    return (
                      <button
                        key={choice.key}
                        type="button"
                        disabled={Boolean(choice.isOpened)}
                        onClick={() => {
                          if (activePolaritySlot === 'RANK1') {
                            if (draftRank8Door === choice.key) setDraftRank8Door(null);
                            setDraftRank1Door(choice.key);
                            if (!draftRank8Door) setActivePolaritySlot('RANK8');
                          } else {
                            if (draftRank1Door === choice.key) setDraftRank1Door(null);
                            setDraftRank8Door(choice.key);
                          }
                        }}
                        className={`p-2.5 rounded-2xl border-2 text-left transition flex items-center gap-2 ${
                          choice.isOpened
                            ? 'bg-slate-950 border-slate-800 opacity-35 cursor-not-allowed'
                            : isPicked1
                            ? 'bg-emerald-900/60 border-emerald-400'
                            : isPicked8
                            ? 'bg-red-900/60 border-red-400'
                            : 'bg-slate-900 border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-xl font-mono font-black text-base flex items-center justify-center shrink-0 ${
                            isPicked1
                              ? 'bg-emerald-400 text-slate-950'
                              : isPicked8
                              ? 'bg-red-500 text-white'
                              : 'bg-slate-800 text-amber-300'
                          }`}
                        >
                          {choice.key}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {choice.isOpened ? `[#${choice.rank}] เปิดแล้ว` : choice.label}
                          </div>
                          {isPicked1 && (
                            <span className="text-[10px] font-black text-emerald-300">
                              ★ เลือกเป็น #1
                            </span>
                          )}
                          {isPicked8 && (
                            <span className="text-[10px] font-black text-red-300">
                              💀 เลือกเป็น #8
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={!draftRank1Door || !draftRank8Door}
                  onClick={() => {
                    if (draftRank1Door && draftRank8Door) {
                      submitTeamAnswer(selectedTeamId, draftRank1Door, draftRank8Door);
                    }
                  }}
                  className={`w-full py-4 rounded-2xl font-black text-base uppercase transition-all shadow-xl ${
                    draftRank1Door && draftRank8Door
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {draftRank1Door && draftRank8Door
                    ? `ยืนยันส่งคู่ [ #1 = ${draftRank1Door} | #8 = ${draftRank8Door} ]`
                    : 'กรุณาเลือกประตูทั้งอันดับ #1 และ #8'}
                </button>
              </>
            )}
          </div>
        )}

        {/* ==========================================================
            STANDARD MODE A: MULTIPLE CHOICE CONTROLLER (e.g. Trivia Murder Party)
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.inputMode === 'MODE_A_CHOICE' &&
          !isEightDoorsGame &&
          !mySubmission && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              {!isRoundActive ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-red-950/40 border-2 border-red-600/60 p-6 text-center">
                  <Lock className="w-12 h-12 text-red-400 mb-2" />
                  <h3 className="text-xl font-extrabold text-white">ปิดรับคำตอบแล้ว!</h3>
                </div>
              ) : (
                <>
                  <div
                    className={`grid gap-2.5 ${
                      round.choiceCount <= 4 ? 'grid-cols-1' : 'grid-cols-2'
                    }`}
                  >
                    {round.choices.slice(0, round.choiceCount).map((choice) => {
                      const isSelected = draftChoice === choice.key;
                      return (
                        <button
                          key={choice.key}
                          type="button"
                          onClick={() => setDraftChoice(choice.key)}
                          disabled={Boolean(choice.isOpened)}
                          className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 active:scale-[0.98] ${
                            choice.isOpened
                              ? 'bg-slate-950 border-slate-800 opacity-40 cursor-not-allowed'
                              : isSelected
                              ? 'bg-amber-500/25 border-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                              : 'bg-slate-900/95 border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          <span
                            className={`w-11 h-11 rounded-xl font-mono font-black text-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-red-950 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {choice.key}
                          </span>
                          <span className="font-bold text-sm md:text-base text-white line-clamp-2">
                            {choice.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={!draftChoice}
                    onClick={() => {
                      if (draftChoice) {
                        submitTeamAnswer(selectedTeamId, draftChoice);
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition-all shadow-xl ${
                      draftChoice
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(234,179,8,0.5)] active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {draftChoice
                      ? `ยืนยันคำตอบข้อ [ ${draftChoice} ]`
                      : 'กรุณาแตะเลือกช้อยส์ก่อน'}
                  </button>
                </>
              )}
            </div>
          )}

        {/* ==========================================================
            MODE B: NUMBER / YEAR NUMPAD CONTROLLER (Timejinx)
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.inputMode === 'MODE_B_YEAR' &&
          !mySubmission && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              {!isRoundActive ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-red-950/40 border-2 border-red-600/60 p-6 text-center">
                  <Lock className="w-12 h-12 text-red-400 mb-2" />
                  <h3 className="text-xl font-extrabold text-white">หมดเวลาส่งตัวเลข!</h3>
                </div>
              ) : (
                <>
                  <div className="rounded-2xl bg-black/80 border-2 border-amber-500/60 py-3 px-4 text-center">
                    <div className="text-xs font-mono text-amber-400 uppercase">
                      ระบุปี ค.ศ. (4 หลัก) เช่น 2017
                    </div>
                    <div className="text-4xl font-mono font-black text-white tracking-[0.25em] h-12 flex items-center justify-center">
                      {draftYear || '____'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => appendDigit(digit, draftYear, setDraftYear, 4)}
                        className="py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-700 font-mono font-black text-2xl text-white transition"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDraftYear('')}
                      className="py-3.5 rounded-2xl bg-red-950/70 hover:bg-red-900 border border-red-700/60 font-bold text-sm text-red-200 flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" /> ล้าง
                    </button>
                    <button
                      type="button"
                      onClick={() => appendDigit('0', draftYear, setDraftYear, 4)}
                      className="py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-amber-500 active:text-slate-950 border border-slate-700 font-mono font-black text-2xl text-white transition"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftYear((prev) => prev.slice(0, -1))}
                      className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-bold text-sm text-slate-200 flex items-center justify-center gap-1"
                    >
                      <Delete className="w-5 h-5" /> ลบ
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={draftYear.length === 0}
                    onClick={() => submitTeamAnswer(selectedTeamId, Number(draftYear))}
                    className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition-all shadow-xl ${
                      draftYear.length > 0
                        ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(234,179,8,0.5)] active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    ส่งคำตอบปี ค.ศ. {draftYear}
                  </button>
                </>
              )}
            </div>
          )}

        {/* ==========================================================
            MODE C: GIANT BUZZER / REACTION CONTROLLER
        ========================================================== */}
        {round.status !== 'IDLE' && round.inputMode === 'MODE_C_BUZZER' && (
          <div className="flex-1 flex flex-col items-center justify-center py-4">
            {myBuzzerEntry ? (
              <div className="w-full rounded-3xl bg-gradient-to-b from-amber-950/90 to-slate-950 border-2 border-amber-400 p-6 text-center shadow-[0_0_40px_rgba(234,179,8,0.4)]">
                <Trophy className="w-16 h-16 text-amber-300 mx-auto mb-2 animate-bounce" />
                <div className="text-xs font-mono text-amber-300 uppercase">
                  BUZZER LOCKED • บันทึกความเร็วแล้ว
                </div>
                <div className="text-4xl font-black text-white my-2">
                  คิวอันดับที่ #{myBuzzerEntry.rank}
                </div>
                <div className="text-sm font-mono text-emerald-300 font-bold">
                  เวลา: {(myBuzzerEntry.elapsedFromStartMs / 1000).toFixed(3)} วินาที
                  {myBuzzerEntry.rank > 1 &&
                    ` (+${(myBuzzerEntry.deltaMs / 1000).toFixed(3)}s จากอันดับ 1)`}
                </div>
              </div>
            ) : !isRoundActive ? (
              <div className="text-center p-6 rounded-3xl bg-slate-900 border border-slate-700 w-full">
                <Lock className="w-12 h-12 text-red-400 mx-auto mb-2" />
                <div className="text-xl font-bold text-white">กระดิ่งถูกล็อกแล้ว</div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => pressTeamBuzzer(selectedTeamId)}
                className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-b from-red-500 via-red-600 to-red-900 border-8 border-amber-400 shadow-[0_0_70px_rgba(220,38,38,0.85),inset_0_8px_25px_rgba(255,255,255,0.4)] active:scale-90 transition-transform flex flex-col items-center justify-center gap-2"
              >
                <Bell className="w-20 h-20 text-amber-200 drop-shadow-lg animate-bounce" />
                <span className="text-3xl font-black text-white tracking-wider uppercase drop-shadow">
                  กดกระดิ่ง!
                </span>
                <span className="text-xs font-mono text-amber-200 font-bold">
                  TAP TO BUZZ IN
                </span>
              </button>
            )}
          </div>
        )}

        {/* ==========================================================
            MODE D: WAGERING / SECRET NUMBER 1-10 / QUIXORT BET
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.inputMode === 'MODE_D_SECRET' &&
          !mySubmission && (
            <div className="flex-1 flex flex-col justify-between gap-3">
              {!isRoundActive ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-red-950/40 border-2 border-red-600/60 p-6 text-center">
                  <Lock className="w-12 h-12 text-red-400 mb-2" />
                  <h3 className="text-xl font-extrabold text-white">ปิดรับข้อมูลลับแล้ว!</h3>
                </div>
              ) : round.modeDSubType === 'QUIXORT_BET' &&
                round.activeTeamId === selectedTeamId ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-purple-950/60 border-2 border-purple-400 p-6 text-center">
                  <Swords className="w-14 h-14 text-purple-300 mb-3 animate-bounce" />
                  <h3 className="text-2xl font-black text-white">
                    ทีมของคุณกำลังลงสนามจัดเรียง!
                  </h3>
                  <p className="text-sm text-purple-200 mt-2">
                    ทำภารกิจหน้าเวทีให้สำเร็จภายในเวลาที่กำหนด ส่วนอีก 3 ทีมกำลังวางเดิมพันข้างคุณ!
                  </p>
                </div>
              ) : round.modeDSubType === 'UNIQUE_NUMBER_1_10' ? (
                <>
                  <div className="text-center text-xs font-bold text-amber-300 bg-amber-950/40 border border-amber-500/40 rounded-xl py-2 px-3">
                    เลือกตัวเลขลับ 1 ถึง 10 (ห้ามซ้ำกับทีมอื่น!)
                  </div>
                  <div className="grid grid-cols-5 gap-2.5 my-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                      const active = draftSecretNum === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setDraftSecretNum(num)}
                          className={`aspect-square rounded-2xl font-mono font-black text-2xl border-2 transition-all flex items-center justify-center ${
                            active
                              ? 'bg-amber-400 text-slate-950 border-white shadow-[0_0_20px_rgba(234,179,8,0.6)] scale-105'
                              : 'bg-slate-900 text-white border-slate-700 hover:border-amber-500/50'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={draftSecretNum === null}
                    onClick={() => {
                      if (draftSecretNum !== null) {
                        submitTeamAnswer(selectedTeamId, draftSecretNum);
                      }
                    }}
                    className={`w-full py-4 rounded-2xl font-black text-lg uppercase transition-all ${
                      draftSecretNum !== null
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-xl'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {draftSecretNum !== null
                      ? `ผนึกเลขลับ [ ${draftSecretNum} ]`
                      : 'แตะเลือกตัวเลข 1 - 10'}
                  </button>
                </>
              ) : round.modeDSubType === 'CURSED_CHALICE' ? (
                <>
                  <div className="grid grid-cols-2 gap-3 my-auto">
                    {(round.choices.length > 0
                      ? round.choices.slice(0, 4)
                      : [
                          { key: '1', label: 'กล่องที่ #1' },
                          { key: '2', label: 'กล่องที่ #2' },
                          { key: '3', label: 'กล่องที่ #3' },
                          { key: '4', label: 'กล่องที่ #4' },
                        ]
                    ).map((c) => {
                      const active = draftChoice === c.key;
                      return (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => setDraftChoice(c.key)}
                          className={`p-5 rounded-2xl border-2 text-center transition-all ${
                            active
                              ? 'bg-red-900/80 border-amber-400 shadow-[0_0_25px_rgba(234,179,8,0.5)]'
                              : 'bg-slate-900 border-slate-700'
                          }`}
                        >
                          <div className="text-3xl mb-1">🎁</div>
                          <div className="font-mono font-black text-xl text-amber-300">
                            #{c.key}
                          </div>
                          <div className="text-xs font-bold text-slate-200 mt-1">{c.label}</div>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    disabled={!draftChoice}
                    onClick={() => draftChoice && submitTeamAnswer(selectedTeamId, draftChoice)}
                    className={`w-full py-4 rounded-2xl font-black text-lg uppercase ${
                      draftChoice
                        ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    ยืนยันเลือกกล่อง #{draftChoice || '?'}
                  </button>
                </>
              ) : (
                <>
                  {round.modeDSubType === 'QUIXORT_BET' && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setDraftQuixortOutcome('PASS')}
                        className={`py-3 rounded-2xl font-black text-sm border-2 transition ${
                          draftQuixortOutcome === 'PASS'
                            ? 'bg-emerald-600 text-white border-amber-300 shadow-lg'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        ✓ แทงว่า สำเร็จ (PASS)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftQuixortOutcome('FAIL')}
                        className={`py-3 rounded-2xl font-black text-sm border-2 transition ${
                          draftQuixortOutcome === 'FAIL'
                            ? 'bg-red-600 text-white border-amber-300 shadow-lg'
                            : 'bg-slate-900 text-slate-400 border-slate-700'
                        }`}
                      >
                        ✕ แทงว่า พัง (FAIL)
                      </button>
                    </div>
                  )}

                  <div className="rounded-2xl bg-black/80 border-2 border-amber-500/60 p-3 text-center">
                    <div className="text-xs text-slate-300">
                      จำนวนเหรียญเดิมพันลับ (มีอยู่ {team.coins.toLocaleString()} 🪙)
                    </div>
                    <div className="text-3xl font-mono font-black text-amber-300 mt-0.5">
                      {draftWager || '0'} 🪙
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[100, 200, 300, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() =>
                          setDraftWager(String(Math.min(Math.max(0, team.coins), amt)))
                        }
                        className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 font-mono font-bold text-xs text-amber-300"
                      >
                        {amt}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDraftWager(String(Math.max(0, team.coins)))}
                      className="py-2 rounded-xl bg-red-600/30 border border-red-500 font-mono font-black text-xs text-red-200"
                    >
                      ALL IN
                    </button>
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={Math.max(0, team.coins)}
                    value={draftWager}
                    onChange={(e) => setDraftWager(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-lg text-center text-white"
                    placeholder="ระบุจำนวนเหรียญ..."
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const cleanWager = Math.max(
                        0,
                        Math.min(Math.max(0, team.coins), Number(draftWager) || 0)
                      );
                      submitTeamAnswer(
                        selectedTeamId,
                        cleanWager,
                        round.modeDSubType === 'QUIXORT_BET' ? draftQuixortOutcome : undefined
                      );
                    }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-lg uppercase shadow-xl active:scale-95"
                  >
                    ยืนยันลงเดิมพันลับ ({draftWager || 0} 🪙)
                  </button>
                </>
              )}
            </div>
          )}
      </main>
    </div>
  );
};
