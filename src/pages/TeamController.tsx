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
import {
  BLACK_MARKET_ITEMS,
  CURSE_CATALOG,
  TEAM_ORDER,
  getActiveTeamIds,
  getChronoNetTraps,
  getChronoSliderStep,
  getChronoTrapsReceived,
  getSuggestedSafeRange,
} from '../data/initialData';
import { LastManShopItemId, TeamId } from '../types/game';
import { CountdownTimer } from '../components/CountdownTimer';

export const TeamController: React.FC = () => {
  const {
    state,
    registerTeam,
    submitTeamAnswer,
    pressTeamBuzzer,
    bailoutNiceShield,
    submitSnakeDraftPick,
    placeChronoTraps,
    claimChronoYear,
    selectToyFactoryDataset,
    triggerToyFactoryShuffle,
    lmsSoulSacrifice,
    lmsMiseryPull,
    lmsBuyItem,
    lmsMinigameAction,
    lmsUseJetpack,
  } = useGame();
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
  const [regTeamRoster, setRegTeamRoster] = useState<string>('');

  useEffect(() => {
    const targetTid = selectedTeamId || regSlotId;
    const t = teams[targetTid];
    if (t) {
      setRegSlotId(targetTid);
      setRegTeamName(t.isRegistered ? t.name : '');
      setRegTeamMotto(t.motto || 'แก๊งเด็กดื้อท้าชนครามปุส!');
      setRegTeamIcon(t.icon || '🛡️');
      setRegTeamRoster((t.roster || []).join(', '));
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

  // Game 2 ("THE CHRONO CRUSH") specific drafts
  const [draftSliderYear, setDraftSliderYear] = useState<number>(2000);
  const [draftTrapAllocations, setDraftTrapAllocations] = useState<Partial<Record<TeamId, number>>>({});

  // Game 3 ("THE TOY FACTORY CHAOS") live timer & vibration
  const [toyNowMs, setToyNowMs] = useState<number>(() => Date.now());

  // Game 4 ("THE LAST MAN STANDING") Black Market debounce & target modal
  const [lmsPendingTargetItem, setLmsPendingTargetItem] = useState<LastManShopItemId | null>(null);
  const [lmsShopBusy, setLmsShopBusy] = useState<boolean>(false);
  const [lmsPoisonPicks, setLmsPoisonPicks] = useState<number[]>([]);
  const isToyFactoryActive = round.gameStage === 'QUIXORT' && Boolean(round.toyFactory);
  useEffect(() => {
    if (!isToyFactoryActive) return;
    setToyNowMs(Date.now());
    const id = setInterval(() => setToyNowMs(Date.now()), 250);
    return () => clearInterval(id);
  }, [isToyFactoryActive]);

  useEffect(() => {
    const tf = round.toyFactory;
    const activePairing = tf ? tf.pairings[tf.roundIndex - 1] || tf.pairings[0] : null;
    if (
      round.gameStage === 'QUIXORT' &&
      tf?.phase === 'SHUFFLE_BUFFER_10S' &&
      activePairing &&
      selectedTeamId === activePairing.holdingTeamId &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate([250, 100, 250, 100, 450]);
    }
  }, [round.gameStage, round.toyFactory?.phase, round.toyFactory?.bufferEndsAt, selectedTeamId]);

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
    const minY = round.yearMin ?? (round.yearUnit === 'BE' ? 2520 : 1980);
    const maxY = round.yearMax ?? (round.yearUnit === 'BE' ? 2569 : 2026);
    setDraftSliderYear(Math.round((minY + maxY) / 2));
    setDraftTrapAllocations({});
  }, [round.id, round.eightDoorsSubRound, round.auctionIteration, round.chronoSubRound, round.chronoPhase, round.status]);

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
      setRegTeamRoster((t.roster || []).join(', '));
    };

    const handleSubmitRegistration = (e: React.FormEvent) => {
      e.preventDefault();
      const finalName =
        regTeamName.trim() || `Team ${activeSlotTeam.number} (${activeSlotTeam.name.split(' ')[0]})`;
      const parsedRoster = regTeamRoster
        .split(/[,\n]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);
      registerTeam(
        regSlotId,
        finalName,
        regTeamIcon,
        regTeamMotto.trim() || 'พร้อมลุย!',
        parsedRoster
      );
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

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                รายชื่อเล่นสมาชิกในทีม (4–10 คน คั่นด้วยเครื่องหมาย ,):
              </label>
              <input
                type="text"
                value={regTeamRoster}
                onChange={(e) => setRegTeamRoster(e.target.value)}
                placeholder="เช่น บอล, มายด์, เต้, พลอย, ต้น, แนน"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border-2 border-slate-700 text-amber-200 text-xs font-bold focus:outline-none focus:border-amber-400"
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
            GAME 1: THE DOORS OF DOOM (3 SUB-ROUNDS ON MOBILE + NAUGHTY LIST BAILOUT)
        ========================================================== */}
        {round.status !== 'IDLE' && isEightDoorsGame && team.shields <= 0 && (
          <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-red-950 via-red-900/80 to-black border-4 border-red-500 p-6 text-center shadow-[0_0_40px_rgba(239,68,68,0.5)] gap-4">
            <div className="w-20 h-20 rounded-full bg-red-600/30 border-2 border-red-400 flex items-center justify-center text-5xl">
              👹
            </div>
            <div>
              <span className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black uppercase tracking-widest">
                NAUGHTY LIST • เกราะเด็กดีหมด!
              </span>
              <h3 className="text-2xl font-black text-white mt-2">
                ทีมของคุณติดบัญชีดำ (0 🛡️)
              </h3>
              <p className="text-sm text-red-200 mt-1">
                ปุ่มเล่นเกมถูกล็อกชั่วคราว! ต้องจ่ายค่าไถ่เกราะเด็กดี +2 ดวง (สามารถติดลบได้) เพื่อกลับเข้าเล่นต่อ
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-black/60 border border-red-500/40 text-xs font-mono text-amber-300">
              ยอดเงินปัจจุบัน: {team.coins.toLocaleString()} ฿ → หลังไถ่: {(team.coins - 500).toLocaleString()} ฿
            </div>
            <button
              type="button"
              onClick={() => bailoutNiceShield(selectedTeamId)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-lg shadow-xl active:scale-95 transition"
            >
              🛡️ ไถ่เกราะเด็กดี +2 ดวง (ราคา 500 ฿)
            </button>
          </div>
        )}

        {round.status !== 'IDLE' && isEightDoorsGame && team.shields > 0 && !mySubmission && (() => {
          const suggested = getSuggestedSafeRange(round.choiceCount, subRound);
          const safeMin = round.safeRankMin ?? suggested.min;
          const safeMax = round.safeRankMax ?? suggested.max;
          const snakeOrder = round.snakeDraftOrder || [];
          const snakeIdx = round.snakeDraftIndex ?? 0;
          const currentTurnTid = snakeIdx < snakeOrder.length ? snakeOrder[snakeIdx] : null;
          const isMySnakeTurn = currentTurnTid === selectedTeamId;
          const highestBid = TEAM_ORDER.reduce(
            (max, tid) => Math.max(max, Number(submissions[tid]?.value) || 0),
            0
          );
          const minNextBid = highestBid > 0 ? highestBid + 50 : 50;
          const cannotAffordBid = team.coins < minNextBid;

          return (
          <div className="flex-1 flex flex-col justify-between gap-3">
            {!isRoundActive ? (
              <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-red-950/40 border-2 border-red-600/60 p-6 text-center">
                <Lock className="w-12 h-12 text-red-400 mb-2" />
                <h3 className="text-xl font-extrabold text-white">ปิดรับคำตอบแล้ว!</h3>
              </div>
            ) : subRound === 'SUB1_SURVIVAL' ? (
              /* ด่านย่อยที่ 1: Snake Draft (สลับคิวเปิดทันที ทีมละ 2 บาน) */
              !isMySnakeTurn ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-900/95 border-2 border-amber-500/40 p-6 text-center gap-3">
                  <div className="text-4xl animate-pulse">⏳</div>
                  <h3 className="text-xl font-black text-amber-300">
                    {currentTurnTid
                      ? `รอคิวของ ${teams[currentTurnTid].icon} ${teams[currentTurnTid].name}`
                      : 'จบรอบ Snake Draft แล้ว!'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    คิวที่ {Math.min(snakeIdx + 1, snakeOrder.length)}/{snakeOrder.length} • โซนปลอดภัย: อันดับ #{safeMin}–#{safeMax} (+300 ฿/บาน, ถูก 2 บานรับ +800 ฿)
                  </p>
                </div>
              ) : (
              <>
                <div className="rounded-xl bg-emerald-950/70 border-2 border-emerald-400 px-3 py-2 text-center text-xs font-black text-emerald-200">
                  🎯 ตาคุณเลือกแล้ว! (คิว {snakeIdx + 1}/{snakeOrder.length}) — หาอันดับ #{safeMin}–#{safeMax} (+300 ฿ / ถูก 2 บาน +800 ฿)
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {round.choices.slice(0, round.choiceCount).map((choice) => {
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
                  onClick={() => {
                    if (draftChoice) {
                      submitSnakeDraftPick(selectedTeamId, draftChoice);
                      setDraftChoice(null);
                    }
                  }}
                  className={`w-full py-4 rounded-2xl font-black text-lg uppercase tracking-wider transition-all shadow-xl ${
                    draftChoice
                      ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-[0_0_25px_rgba(234,179,8,0.5)] active:scale-95'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {draftChoice
                    ? `ยืนยันเปิดประตู [ ${draftChoice} ] ทันที!`
                    : 'กรุณาแตะเลือกประตูที่ยังไม่เปิด'}
                </button>
              </>
              )
            ) : subRound === 'SUB2_AUCTION' ? (
              /* ด่านย่อยที่ 2 Phase 1: ประมูลชิงสิทธิ์ (Strict Balance Cap) */
              round.auctionIteration === 2 && round.subRound2LockedTeamId === selectedTeamId ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-amber-950/50 border-2 border-amber-400 p-6 text-center my-2">
                  <Lock className="w-14 h-14 text-amber-300 mb-3" />
                  <h3 className="text-xl font-black text-white">
                    คุณชนะการประมูลในรอบ 2.1 ไปแล้ว!
                  </h3>
                  <p className="text-sm text-amber-200 mt-2">
                    ตามกติกา ปุ่มประมูลของทีมคุณจะถูกล็อกในรอบ 2.2 เพื่อให้ทีมที่เหลือประมูลแข่งกัน และคุณจะได้ร่วมแทงข้างในขั้นตอนถัดไป!
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-amber-950/60 border border-amber-500/50 px-3 py-2 text-center text-xs font-bold text-amber-200">
                    🔨 รอบ 2.{round.auctionIteration || 1} (ประมูลชิงสิทธิ์): หาอันดับ #{safeMin}–#{safeMax} (+700 ฿) • บิดขั้นต่ำถัดไป {minNextBid.toLocaleString()} ฿
                  </div>

                  <div className="rounded-2xl bg-black/80 border-2 border-amber-500/60 p-4 text-center">
                    <div className="text-xs text-slate-300">
                      ยอดบิดประมูลของคุณ (เงินคงเหลือ {team.coins.toLocaleString()} ฿)
                    </div>
                    <div className="text-5xl font-mono font-black text-amber-300 my-2">
                      {draftAuctionBid.toLocaleString()} ฿
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftAuctionBid((prev) => Math.max(0, prev - 50))
                        }
                        className="px-5 py-2.5 rounded-xl bg-red-900/70 hover:bg-red-800 border border-red-500 font-mono font-black text-lg text-white active:scale-95"
                      >
                        -50 ฿
                      </button>
                      <button
                        type="button"
                        disabled={cannotAffordBid}
                        onClick={() =>
                          setDraftAuctionBid((prev) =>
                            Math.min(Math.max(0, Math.floor(team.coins / 50) * 50), prev + 50)
                          )
                        }
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 border border-emerald-400 font-mono font-black text-lg text-white active:scale-95"
                      >
                        +50 ฿
                      </button>
                    </div>
                  </div>

                  {/* Step-50 Quick Chips */}
                  <div className="grid grid-cols-4 gap-2">
                    {[50, 100, 150, 200, 250, 300, 400, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        disabled={team.coins < amt}
                        onClick={() => setDraftAuctionBid(Math.min(Math.max(0, team.coins), amt))}
                        className={`py-2.5 rounded-xl border font-mono font-black text-sm transition ${
                          team.coins < amt
                            ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-not-allowed'
                            : draftAuctionBid === amt
                            ? 'bg-amber-400 text-slate-950 border-white shadow'
                            : 'bg-slate-900 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {amt} ฿
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={cannotAffordBid || draftAuctionBid < minNextBid || draftAuctionBid > team.coins}
                    onClick={() => submitTeamAnswer(selectedTeamId, draftAuctionBid)}
                    className={`w-full py-4 rounded-2xl font-black text-lg uppercase shadow-xl flex items-center justify-center gap-2 ${
                      cannotAffordBid || draftAuctionBid < minNextBid || draftAuctionBid > team.coins
                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 active:scale-95'
                    }`}
                  >
                    <Gavel className="w-5 h-5" />
                    <span>
                      {cannotAffordBid
                        ? 'เงินไม่พอประมูล'
                        : draftAuctionBid < minNextBid
                        ? `ต้องบิดอย่างน้อย ${minNextBid.toLocaleString()} ฿`
                        : `ยืนยันบิดประมูล [ ${draftAuctionBid.toLocaleString()} ฿ ]`}
                    </span>
                  </button>
                </>
              )
            ) : subRound === 'SUB2_DOOR_AND_BET' ? (
              /* ด่านย่อยที่ 2 Phase 2: ทีมชนะประมูลเลือกประตู / ทีมอื่นแทงข้าง รอด หรือ พัง */
              round.auctionWinnerTeamId === selectedTeamId ? (
                <>
                  <div className="rounded-xl bg-amber-500/20 border-2 border-amber-400 p-3 text-center">
                    <div className="text-sm font-black text-amber-300">
                      {round.cowardFreePick
                        ? '⚠️ คุณถูกสุ่มเปิดประตูฟรี (Coward\'s Tax • ได้ 0 ฿)'
                        : '👑 คุณชนะการประมูล! เลือกเปิดประตู 1 บาน'}
                    </div>
                    <div className="text-xs text-slate-200 mt-0.5">
                      ค้นหาประตูอันดับ #{safeMin}–#{safeMax} ({round.cowardFreePick ? 'ได้ 0 ฿' : 'ถูกได้ +700 ฿'} / ผิดเสียเกราะ -1 🛡️)
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {round.choices.slice(0, round.choiceCount).map((choice) => {
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
              /* ด่านย่อยที่ 3: วัดใจขั้วตรงข้าม (เลือก 2 ช่อง: อันดับ #1 และ อันดับ #N) */
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
                      2. ประตูอันดับ #{round.choiceCount} (น้อยสุด)
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
                    : `💀 อันดับ #${round.choiceCount} (คนเลือกน้อยสุด)`}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {round.choices.slice(0, round.choiceCount).map((choice) => {
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
                              💀 เลือกเป็น #{round.choiceCount}
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
                    ? `ยืนยันส่งคู่ [ #1 = ${draftRank1Door} | #${round.choiceCount} = ${draftRank8Door} ]`
                    : `กรุณาเลือกประตูทั้งอันดับ #1 และ #${round.choiceCount}`}
                </button>
              </>
            )}
          </div>
          );
        })()}

        {/* ==========================================================
            STANDARD MODE A: MULTIPLE CHOICE CONTROLLER (e.g. Trivia Murder Party)
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.inputMode === 'MODE_A_CHOICE' &&
          !isEightDoorsGame &&
          !(round.gameStage === 'TRIVIA_MURDER' && round.lastMan) &&
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
            MODE B: GAME 2 — THE CHRONO CRUSH (3 SUB-ROUNDS ON MOBILE)
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.inputMode === 'MODE_B_YEAR' &&
          !mySubmission && (() => {
            const chronoSub = round.chronoSubRound || 'CHRONO_SUB1_CLASSIC';
            const chronoPhase = round.chronoPhase || 'YEAR_GUESS';
            const unitLabel = round.yearUnit === 'BE' ? 'พ.ศ.' : 'ค.ศ.';
            const minY = round.yearMin ?? (round.yearUnit === 'BE' ? 2520 : 1980);
            const maxY = round.yearMax ?? (round.yearUnit === 'BE' ? 2569 : 2026);
            const netTraps = chronoSub === 'CHRONO_SUB2_TRAP' ? getChronoNetTraps(round, selectedTeamId) : 0;
            const step = chronoSub === 'CHRONO_SUB2_TRAP' ? getChronoSliderStep(netTraps) : 1;
            const sliderMin = step > 1 ? Math.ceil(minY / step) * step : minY;
            const sliderMax = step > 1 ? Math.floor(maxY / step) * step : maxY;
            const clampedSliderYear = Math.min(
              sliderMax,
              Math.max(sliderMin, Math.round((draftSliderYear - sliderMin) / step) * step + sliderMin)
            );

            const myQuota = round.chronoQuotas?.[selectedTeamId] ?? 1;
            const myShield = round.chronoShields?.[selectedTeamId] ?? 0;
            const usedQuota = Object.values(draftTrapAllocations).reduce(
              (acc, v) => acc + (v ?? 0),
              0
            );
            const remainingQuota = Math.max(0, myQuota - usedQuota);

            const allYears: number[] = [];
            if (chronoSub === 'CHRONO_SUB3_FAST_FINGER') {
              for (let y = minY; y <= maxY; y++) allYears.push(y);
            }

            return (
            <div className="flex-1 flex flex-col justify-between gap-3">
              {!isRoundActive ? (
                <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-red-950/40 border-2 border-red-600/60 p-6 text-center">
                  <Lock className="w-12 h-12 text-red-400 mb-2" />
                  <h3 className="text-xl font-extrabold text-white">หมดเวลารอบนี้แล้ว!</h3>
                </div>
              ) : chronoSub === 'CHRONO_SUB2_TRAP' && chronoPhase === 'TRAP_PLACEMENT' ? (
                /* Sub2 จังหวะที่ 1: วางกับดักเวลา */
                <>
                  <div className="rounded-2xl bg-amber-950/70 border-2 border-amber-400 p-3 text-center">
                    <div className="text-sm font-black text-amber-300">
                      💣 วางกับดักเวลา • โควตาของคุณ: {remainingQuota} / {myQuota} ลูก
                    </div>
                    <div className="text-xs text-slate-200 mt-0.5">
                      โล่ป้องกันของคุณ: {myShield} 🛡️ • แปะซ้ำทีมเดิมได้ไม่จำกัด! (0 ลูก=1 ปี, 1 ลูก=5 ปี, 2+ ลูก=10 ปี)
                    </div>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {TEAM_ORDER.filter((tid) => tid !== selectedTeamId).map((targetTid) => {
                      const targetTeam = teams[targetTid];
                      const count = draftTrapAllocations[targetTid] ?? 0;
                      const targetShield = round.chronoShields?.[targetTid] ?? 0;
                      const alreadyRecv = getChronoTrapsReceived(round, targetTid);
                      return (
                        <div
                          key={targetTid}
                          className="p-3 rounded-2xl bg-slate-900 border-2 border-slate-700 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-extrabold text-sm text-white truncate">
                              {targetTeam.icon} {targetTeam.name}
                            </div>
                            <div className="text-[11px] text-slate-300">
                              เงิน: {targetTeam.coins.toLocaleString()} ฿ • โล่ {targetShield} 🛡️ • โดนรวม {alreadyRecv}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={count <= 0}
                              onClick={() =>
                                setDraftTrapAllocations((prev) => ({
                                  ...prev,
                                  [targetTid]: Math.max(0, (prev[targetTid] ?? 0) - 1),
                                }))
                              }
                              className="w-9 h-9 rounded-xl bg-slate-800 disabled:opacity-35 text-white font-black text-lg"
                            >
                              -
                            </button>
                            <span className="w-7 text-center font-mono font-black text-xl text-amber-300">
                              {count}
                            </span>
                            <button
                              type="button"
                              disabled={remainingQuota <= 0}
                              onClick={() =>
                                setDraftTrapAllocations((prev) => ({
                                  ...prev,
                                  [targetTid]: (prev[targetTid] ?? 0) + 1,
                                }))
                              }
                              className="w-9 h-9 rounded-xl bg-red-600 disabled:opacity-35 text-white font-black text-lg"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => placeChronoTraps(selectedTeamId, draftTrapAllocations)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-lg shadow-xl active:scale-95"
                  >
                    💣 ยืนยันวางกับดัก ({usedQuota}/{myQuota} ลูก)
                  </button>
                </>
              ) : chronoSub === 'CHRONO_SUB3_FAST_FINGER' ? (
                /* Sub3: สงครามแย่งปี (Exclusive Realtime Lock) */
                <>
                  <div className="rounded-xl bg-red-950/70 border-2 border-red-400 px-3 py-2 text-center text-xs font-black text-red-100">
                    ⚡ ใครไวใครได้! แตะเลือก 1 ปี (ล็อกทันที เปลี่ยนใจไม่ได้) — ตรงเป๊ะ +1,000 ฿ / ห่าง 1-2 ปี +400 ฿ / ห่าง ≥3 ปี -150 ฿/ปี
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-auto">
                    {allYears.map((yr) => {
                      const claimTid = round.chronoFastFingerClaims?.[String(yr)];
                      const claimTeam = claimTid ? teams[claimTid] : null;
                      return (
                        <button
                          key={yr}
                          type="button"
                          disabled={Boolean(claimTid)}
                          onClick={() => claimChronoYear(selectedTeamId, yr)}
                          className={`p-3 rounded-2xl border-2 text-center transition-all ${
                            claimTeam
                              ? 'bg-slate-950 border-red-500/60 opacity-60 cursor-not-allowed'
                              : 'bg-slate-900 hover:bg-amber-500/20 border-amber-400/70 active:scale-95'
                          }`}
                        >
                          <div className="font-mono font-black text-2xl text-white">
                            {unitLabel} {yr}
                          </div>
                          {claimTeam ? (
                            <div className="text-xs font-extrabold text-amber-300 mt-0.5 truncate">
                              🔒 {claimTeam.icon} {claimTeam.name}
                            </div>
                          ) : (
                            <div className="text-[11px] font-bold text-emerald-300 mt-0.5">
                              แตะเพื่อแย่งล็อก!
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* Sub1 & Sub2 จังหวะที่ 2: Timeline Slider */
                <>
                  {chronoSub === 'CHRONO_SUB2_TRAP' && (
                    <div
                      className={`rounded-xl px-3 py-2 text-center text-xs font-black border ${
                        netTraps >= 1
                          ? 'bg-red-950/70 border-red-400 text-red-200'
                          : 'bg-emerald-950/70 border-emerald-400 text-emerald-200'
                      }`}
                    >
                      {netTraps >= 1
                        ? `⚠️ โดนกับดักสุทธิ ${netTraps} ลูก! เลื่อนได้ทีละ ${step} ปี (ฝ่าสำเร็จรับรางวัล x2!)`
                        : '🛡️ ปลอดภัยจากกับดัก! เลื่อนได้ปกติทีละ 1 ปี'}
                    </div>
                  )}

                  <div className="rounded-3xl bg-black/80 border-2 border-amber-500/60 p-5 text-center space-y-4 my-auto">
                    <div className="text-xs font-mono text-amber-400 uppercase">
                      แถบเลื่อนเลือกปี ({unitLabel}) • ช่วง {minY} – {maxY} • ขยับทีละ {step} ปี
                    </div>
                    <div className="text-5xl font-mono font-black text-white tracking-wider">
                      {unitLabel} {clampedSliderYear}
                    </div>

                    <input
                      type="range"
                      min={sliderMin}
                      max={sliderMax}
                      step={step}
                      value={clampedSliderYear}
                      onChange={(e) => setDraftSliderYear(Number(e.target.value))}
                      className="w-full h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />

                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>{sliderMin}</span>
                      <span>{sliderMax}</span>
                    </div>

                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          setDraftSliderYear(Math.max(sliderMin, clampedSliderYear - step))
                        }
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-mono font-black text-base text-white active:scale-95"
                      >
                        -{step} ปี
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftSliderYear(Math.min(sliderMax, clampedSliderYear + step))
                        }
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 font-mono font-black text-base text-white active:scale-95"
                      >
                        +{step} ปี
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => submitTeamAnswer(selectedTeamId, clampedSliderYear)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 font-black text-lg uppercase tracking-wider shadow-xl active:scale-95"
                  >
                    ยืนยันปี {unitLabel} {clampedSliderYear}
                  </button>
                </>
              )}
            </div>
            );
          })()}

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
            GAME 3: THE TOY FACTORY CHAOS (สายพานคัดแยกของเล่นผีสิง)
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.gameStage === 'QUIXORT' &&
          round.toyFactory &&
          (() => {
            const tf = round.toyFactory;
            const datasets = state.toyFactoryDatasets || [];
            const activeDataset = datasets.find((d) => d.id === tf.selectedDatasetId) || null;
            const activePairing = tf.pairings[tf.roundIndex - 1] || tf.pairings[0];
            const sortingTeamId = activePairing?.sortingTeamId || 'team1';
            const holdingTeamId = activePairing?.holdingTeamId || 'team2';
            const isSorting = selectedTeamId === sortingTeamId;
            const isHolding = selectedTeamId === holdingTeamId;
            const isSpectator = !isSorting && !isHolding;

            const prepRemainingSec = tf.prepEndsAt
              ? Math.max(0, Math.ceil((tf.prepEndsAt - toyNowMs) / 1000))
              : 0;
            const bufferRemainingSec = tf.bufferEndsAt
              ? Math.max(0, Math.ceil((tf.bufferEndsAt - toyNowMs) / 1000))
              : 0;
            const actionRemainingSec =
              round.timerStartedAt !== null
                ? Math.max(
                    0,
                    Math.ceil(
                      (round.durationSeconds * 1000 - (toyNowMs - round.timerStartedAt)) / 1000
                    )
                  )
                : round.timerRemainingMs !== null
                ? Math.max(0, Math.ceil(round.timerRemainingMs / 1000))
                : round.durationSeconds;

            const alreadyUsedShuffleQuota = tf.shuffleUsedByTeams.includes(selectedTeamId);
            const roundShuffleTaken = tf.shuffleUsedThisRound;
            const isLast15Sec = actionRemainingSec <= 15;
            const canClickShuffle =
              tf.phase === 'ACTION' &&
              isSpectator &&
              !alreadyUsedShuffleQuota &&
              !roundShuffleTaken &&
              !isLast15Sec;

            return (
              <div className="flex-1 flex flex-col gap-3">
                {/* Round & Pairings Header */}
                <div className="rounded-2xl bg-slate-900 border-2 border-purple-500/60 p-3">
                  <div className="flex items-center justify-between text-xs font-mono text-purple-300 font-bold mb-1.5">
                    <span>
                      ROUND {tf.roundIndex}/{tf.pairings.length}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-950 border border-purple-400/50">
                      {isSorting
                        ? '🏃 ทีมจัดเรียง (Sorting)'
                        : isHolding
                        ? '📜 ทีมถือข้อมูล (Holding)'
                        : '👀 ทีมผู้ชม (Spectator)'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-emerald-950/50 border border-emerald-500/40 p-2">
                      <div className="text-[10px] text-emerald-300 font-bold">ทีมจัดเรียง</div>
                      <div className="font-black text-white truncate">
                        {teams[sortingTeamId]?.icon} {teams[sortingTeamId]?.name}
                      </div>
                    </div>
                    <div className="rounded-xl bg-amber-950/50 border border-amber-500/40 p-2">
                      <div className="text-[10px] text-amber-300 font-bold">ทีมถือข้อมูล</div>
                      <div className="font-black text-white truncate">
                        {teams[holdingTeamId]?.icon} {teams[holdingTeamId]?.name}
                      </div>
                    </div>
                  </div>
                  {activeDataset && (
                    <div className="mt-2 rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-center">
                      <div className="text-xs font-black text-amber-300">{activeDataset.title}</div>
                      <div className="text-[11px] font-bold text-slate-300">
                        กติกา: {activeDataset.direction}
                      </div>
                    </div>
                  )}
                </div>

                {/* TOPIC_SELECT */}
                {tf.phase === 'TOPIC_SELECT' && (
                  <div className="flex-1 flex flex-col gap-2.5">
                    {isSorting ? (
                      <>
                        <div className="rounded-xl bg-emerald-950/60 border border-emerald-400 p-3 text-center">
                          <div className="text-sm font-black text-emerald-200">
                            🎯 ตาทีมคุณเลือกหัวข้อโจทย์! (เลือกได้ครั้งเดียว)
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {datasets.map((ds) => {
                            const used = tf.usedDatasetIds.includes(ds.id);
                            return (
                              <button
                                key={ds.id}
                                type="button"
                                disabled={used}
                                onClick={() => selectToyFactoryDataset(selectedTeamId, ds.id)}
                                className={`p-3.5 rounded-2xl border-2 text-left transition-all ${
                                  used
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-55 cursor-not-allowed'
                                    : 'bg-purple-950/70 hover:bg-purple-900 border-purple-400 text-white active:scale-[0.98]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-sm">{ds.title}</span>
                                  {used && (
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold">
                                      ใช้แล้ว
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-amber-300 font-bold mt-0.5">
                                  {ds.direction}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 text-center">
                        <div className="text-3xl mb-2 animate-bounce">🎲</div>
                        <h3 className="text-lg font-black text-white">
                          รอทีมจัดเรียง ({teams[sortingTeamId]?.name}) เลือกหัวข้อ...
                        </h3>
                      </div>
                    )}
                  </div>
                )}

                {/* PREP_10S / ACTION / SHUFFLE_BUFFER_10S */}
                {(tf.phase === 'PREP_10S' ||
                  tf.phase === 'ACTION' ||
                  tf.phase === 'SHUFFLE_BUFFER_10S') && (
                  <div className="flex-1 flex flex-col gap-3">
                    {isHolding && (
                      <>
                        {tf.phase === 'PREP_10S' && (
                          <div className="rounded-2xl bg-amber-500 text-black border-2 border-black p-3 text-center font-black">
                            ⏱️ เตรียมความพร้อม! จำโพยของตัวเอง ({prepRemainingSec} วิ)
                          </div>
                        )}
                        {tf.phase === 'SHUFFLE_BUFFER_10S' && (
                          <div className="rounded-2xl bg-yellow-400 text-black border-4 border-black p-3 text-center animate-pulse shadow-[0_0_20px_rgba(250,204,21,0.7)]">
                            <div className="text-base font-black">
                              ⚡ โดน SHUFFLE! สลับคนถือข้อมูลแล้ว!
                            </div>
                            <div className="text-xs font-extrabold mt-0.5">
                              รีบเช็กข้อมูลใหม่ของตัวเองภายใน {bufferRemainingSec} วินาที!
                            </div>
                          </div>
                        )}
                        <div className="text-xs font-bold text-amber-300 text-center">
                          🔒 ข้อมูลลับสำหรับทีมถือข้อมูล (ห้ามให้ทีมอื่นแอบดูหน้าจอ!)
                        </div>
                        <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                          {tf.assignments.map((a, idx) => (
                            <div
                              key={`${a.itemId}-${idx}`}
                              className={`rounded-2xl p-3 border-2 transition-all ${
                                a.changedOnShuffle
                                  ? 'bg-yellow-400/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.45)]'
                                  : a.isMystery
                                  ? 'bg-purple-950/70 border-purple-400'
                                  : 'bg-slate-900 border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-black text-amber-300">
                                  👤 {a.memberName}
                                </span>
                                {a.changedOnShuffle && (
                                  <span className="px-2 py-0.5 rounded bg-yellow-400 text-black text-[10px] font-black">
                                    🔄 สลับใหม่!
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-base font-black text-white">
                                {a.isMystery ? '❓ ??? (ตัวปริศนา)' : a.label}
                              </div>
                              {a.isMystery && (
                                <div className="mt-1 text-xs font-bold text-purple-200 bg-purple-900/60 rounded-lg px-2.5 py-1.5">
                                  💡 คำใบ้: {a.mysteryClue || 'ไม่มีคำใบ้'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {isSorting && (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-emerald-950/40 border-2 border-emerald-500/60 p-5 text-center gap-3">
                        <div className="text-4xl">
                          {tf.phase === 'SHUFFLE_BUFFER_10S' ? '⏸️' : '🏃'}
                        </div>
                        <h3 className="text-xl font-black text-white">
                          {tf.phase === 'PREP_10S'
                            ? `เตรียมพร้อม! เริ่มใน ${prepRemainingSec} วิ`
                            : tf.phase === 'SHUFFLE_BUFFER_10S'
                            ? `หยุดถาม! ทีมถือข้อมูลโดน SHUFFLE (${bufferRemainingSec} วิ)`
                            : 'ตะโกนถามเพื่อน แล้ววิ่งไปเรียงลำดับหน้าเวที!'}
                        </h3>
                        <p className="text-xs text-emerald-200 font-semibold">
                          ห้ามเดินไปแอบดูมือถือทีมถือข้อมูล! ฟังคำตอบจากปากเพื่อนเท่านั้น
                        </p>
                      </div>
                    )}

                    {isSpectator && (
                      <div className="flex-1 flex flex-col justify-between gap-3">
                        <div className="rounded-2xl bg-slate-900 border border-slate-700 p-4 text-center">
                          <div className="text-xs font-bold text-slate-300">
                            {tf.phase === 'PREP_10S'
                              ? `เตรียมพร้อม... (${prepRemainingSec} วิ)`
                              : tf.phase === 'SHUFFLE_BUFFER_10S'
                              ? `⏸️ SHUFFLE ทำงาน! พักเบรก ${bufferRemainingSec} วินาที`
                              : 'จับจังหวะดีๆ แล้วกดปุ่ม SHUFFLE เพื่อสลับคนถือข้อมูล!'}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canClickShuffle}
                          onClick={() => triggerToyFactoryShuffle(selectedTeamId)}
                          className={`flex-1 min-h-[150px] rounded-3xl border-4 border-black p-6 flex flex-col items-center justify-center gap-2 font-black transition-all ${
                            canClickShuffle
                              ? 'bg-red-600 hover:bg-red-500 active:scale-95 text-white shadow-[6px_6px_0px_#000] animate-pulse'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-75'
                          }`}
                        >
                          <span className="text-4xl">🔀</span>
                          <span className="text-2xl">SHUFFLE! สลับคนถือ</span>
                          <span className="text-xs font-bold">
                            {alreadyUsedShuffleQuota
                              ? 'ทีมคุณใช้สิทธิ์ครบแล้ว (1 ครั้ง/เกม)'
                              : roundShuffleTaken
                              ? 'รอบนี้มีทีมกด SHUFFLE ไปแล้ว'
                              : isLast15Sec
                              ? 'ล็อกปุ่มอัตโนมัติใน 15 วินาทีสุดท้าย!'
                              : tf.phase !== 'ACTION'
                              ? 'กดได้เฉพาะช่วงเวลา Action เท่านั้น'
                              : 'กดได้ 1 ครั้งตลอดทั้งเกม!'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* REVEAL_JUDGE */}
                {tf.phase === 'REVEAL_JUDGE' && (
                  <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-900 border-2 border-amber-400/60 p-6 text-center gap-2">
                    <div className="text-4xl">🔍</div>
                    <h3 className="text-xl font-black text-amber-300">
                      {round.status === 'REVEALED'
                        ? 'สรุปผลรอบนี้เรียบร้อย!'
                        : 'กำลังตรวจคำตอบทีละใบที่จอใหญ่!'}
                    </h3>
                    <p className="text-xs text-slate-300">
                      ดูผลเฉลยและคะแนน Holy Coins บนจอโปรเจกเตอร์
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ==========================================================
            GAME 4: THE LAST MAN STANDING (ลานประหารคริสต์มาส)
        ========================================================== */}
        {round.gameStage === 'TRIVIA_MURDER' &&
          round.lastMan &&
          (() => {
            const lms = round.lastMan;
            const myState = lms.teamStates[selectedTeamId];
            const active = getActiveTeamIds(teams);
            const myCurse = myState.activeCurse ? CURSE_CATALOG[myState.activeCurse] : null;
            const isPart1 = lms.phase.startsWith('PART1_');

            const handleBuyWithDebounce = (itemId: LastManShopItemId, targetId?: TeamId) => {
              if (lmsShopBusy) return;
              setLmsShopBusy(true);
              lmsBuyItem(selectedTeamId, itemId, targetId);
              setLmsPendingTargetItem(null);
              setTimeout(() => setLmsShopBusy(false), 350);
            };

            return (
              <div className="flex-1 flex flex-col gap-3">
                {/* Status Bar: Hearts, Zone, Shields, Jetpacks, Soul Sacrifice */}
                <div className="rounded-2xl bg-slate-900 border-2 border-rose-500/60 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-black">
                      <span className="px-2.5 py-1 rounded-xl bg-rose-950 border border-rose-500/60 text-rose-300">
                        {myState.isGhost ? '👻 สถานะวิญญาณ' : `❤️ ${myState.hearts}/4 ดวง`}
                      </span>
                      {!myState.isGhost && isPart1 && (
                        <span
                          className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                            myState.inKillingFloor
                              ? 'bg-red-600 text-white'
                              : 'bg-emerald-700 text-white'
                          }`}
                        >
                          {myState.inKillingFloor ? '💀 ลานประหาร' : '🛡️ โซนปลอดภัย'}
                        </span>
                      )}
                      {lms.phase.startsWith('PART2_') && (
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-black text-xs font-black">
                          🪜 ขั้น {myState.step}/25
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      {myState.mirrorShield && (
                        <span className="px-2 py-0.5 rounded bg-cyan-600 text-white">🪞 โล่กระจก</span>
                      )}
                      {myState.jetpacks > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-black">
                          🚀 x{myState.jetpacks}
                        </span>
                      )}
                    </div>
                  </div>

                  {isPart1 && !myState.isGhost && myState.hearts > 1 && (
                    <button
                      type="button"
                      onClick={() => lmsSoulSacrifice(selectedTeamId)}
                      className="w-full py-2 rounded-xl bg-rose-950 hover:bg-rose-900 border border-rose-500 text-rose-200 font-black text-xs"
                    >
                      💔 ขายวิญญาณ (-1 ❤️ แลกเงินสด +500 ฿)
                    </button>
                  )}

                  {myCurse && (
                    <div className="rounded-xl bg-purple-950 border-2 border-purple-400 p-2.5 text-center animate-pulse">
                      <div className="text-xs font-black text-yellow-300">
                        {myCurse.icon} ทีมคุณติดคำสาป: {myCurse.name}
                      </div>
                      <div className="text-[11px] text-purple-100 mt-0.5">{myCurse.desc}</div>
                    </div>
                  )}
                </div>

                {/* KRAMPUS_TWIST */}
                {lms.phase === 'KRAMPUS_TWIST' && (
                  <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-rose-950/60 border-2 border-rose-500 p-6 text-center gap-3">
                    <div className="text-5xl animate-bounce">👹</div>
                    <h3 className="text-xl font-black text-amber-300">
                      THE LAST MAN STANDING — ประกาศหักมุม!
                    </h3>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      เงิน Holy Coins เป็นเพียงกระสุนและแต้มต่อ! เตรียมตอบคำถามเอาชีวิตรอด 4 รอบ แล้ววิ่งขึ้นบันไดหนีตาย 25 ขั้นเป็นทีมแรกเพื่อคว้าแชมป์ค่าย!
                    </p>
                  </div>
                )}

                {/* PART1_TRIVIA */}
                {lms.phase === 'PART1_TRIVIA' && (
                  <div className="flex-1 flex flex-col gap-2.5">
                    {mySubmission ? (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-emerald-950/50 border-2 border-emerald-400 p-6 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                        <div className="text-xl font-black text-white">
                          ล็อกคำตอบ [{mySubmission.value}] แล้ว!
                        </div>
                        <div className="text-xs text-slate-300 mt-1">รอเฉลยพร้อมกันบนจอใหญ่...</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5 my-auto">
                        {round.choices.slice(0, 4).map((c) => (
                          <button
                            key={c.key}
                            type="button"
                            onClick={() => submitTeamAnswer(selectedTeamId, c.key)}
                            className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] border-2 border-amber-400/60 text-left flex items-center gap-3"
                          >
                            <span className="w-9 h-9 rounded-xl bg-amber-400 text-black font-black flex items-center justify-center shrink-0">
                              {c.key}
                            </span>
                            <span className="font-bold text-sm text-white">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PART1_TRIVIA_REVEAL */}
                {lms.phase === 'PART1_TRIVIA_REVEAL' && (
                  <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-900 border-2 border-slate-700 p-6 text-center gap-2">
                    <div className="text-4xl">{myState.inKillingFloor ? '💀' : '🛡️'}</div>
                    <h3 className="text-xl font-black text-white">
                      {myState.isGhost
                        ? 'คุณเป็นวิญญาณ รอช่วงที่ 2!'
                        : myState.inKillingFloor
                        ? 'คุณร่วงลงลานประหาร!'
                        : 'คุณรอดอยู่โซนปลอดภัย! (+250 ฿)'}
                    </h3>
                  </div>
                )}

                {/* PART1_MISERY_PULL */}
                {lms.phase === 'PART1_MISERY_PULL' && (
                  <div className="flex-1 flex flex-col gap-3 justify-center">
                    {lms.miseryPullTeamId === selectedTeamId ? (
                      <div className="rounded-3xl bg-red-950/80 border-4 border-amber-400 p-5 text-center space-y-3">
                        <div className="text-3xl">😈</div>
                        <h3 className="text-lg font-black text-amber-300">
                          คุณตอบผิดทีมเดียว! เลือก 1 ทีมที่รอดมาตกนรกด้วยกัน!
                        </h3>
                        <div className="grid grid-cols-1 gap-2">
                          {active
                            .filter((tid) => !lms.teamStates[tid].isGhost && !lms.teamStates[tid].inKillingFloor)
                            .map((tid) => (
                              <button
                                key={tid}
                                type="button"
                                onClick={() => lmsMiseryPull(selectedTeamId, tid)}
                                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm border-2 border-black"
                              >
                                🪝 ลาก {teams[tid].icon} {teams[tid].name} ลงลานประหาร!
                              </button>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-3xl bg-slate-900 border-2 border-rose-500/50 p-6 text-center">
                        <div className="text-3xl mb-2 animate-pulse">😱</div>
                        <h3 className="text-lg font-black text-white">
                          {teams[lms.miseryPullTeamId || 'team1']?.name} กำลังเลือกลากเพื่อนตกนรก 1 ทีม!
                        </h3>
                      </div>
                    )}
                  </div>
                )}

                {/* PART1_BLACK_MARKET */}
                {lms.phase === 'PART1_BLACK_MARKET' && (
                  <div className="flex-1 flex flex-col gap-2.5">
                    {myState.isGhost ? (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-900 border-2 border-purple-500/50 p-6 text-center">
                        <div className="text-4xl mb-2">👻</div>
                        <h3 className="text-lg font-black text-purple-300">
                          สถานะวิญญาณ: เงินถูกแช่แข็ง!
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          ไม่สามารถซื้อหรือใช้ไอเทมในตลาดมืดได้ รอสิงร่างช่วงที่ 2!
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="rounded-xl bg-purple-950/70 border border-purple-400 px-3 py-2 text-center text-xs font-black text-amber-300">
                          🛒 ตลาดมืดเปิดแล้ว! ซื้อปุ๊บ ออกฤทธิ์ปั๊บ! (เงินคงเหลือ: {team.coins.toLocaleString()} ฿)
                        </div>

                        {lmsPendingTargetItem && (
                          <div className="rounded-2xl bg-amber-950 border-2 border-amber-400 p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs font-black text-amber-300">
                              <span>🎯 เลือกทีมเป้าหมาย:</span>
                              <button
                                type="button"
                                onClick={() => setLmsPendingTargetItem(null)}
                                className="px-2 py-0.5 rounded bg-slate-800 text-white"
                              >
                                ยกเลิก
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                              {active
                                .filter((tid) => {
                                  const ts = lms.teamStates[tid];
                                  if (ts.isGhost) return false;
                                  if (lmsPendingTargetItem === 'CURSE_BOX') return ts.inKillingFloor;
                                  return tid !== selectedTeamId;
                                })
                                .map((tid) => (
                                  <button
                                    key={tid}
                                    type="button"
                                    onClick={() => handleBuyWithDebounce(lmsPendingTargetItem, tid)}
                                    className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs text-left"
                                  >
                                    {teams[tid].icon} {teams[tid].name} ({lms.teamStates[tid].hearts} ❤️)
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1">
                          {BLACK_MARKET_ITEMS.map((item) => {
                            const rStock = lms.roundStock[item.id] ?? 0;
                            const gStock =
                              item.id === 'HELL_CHAINS'
                                ? lms.gameStock.HELL_CHAINS
                                : item.id === 'JETPACK'
                                ? lms.gameStock.JETPACK
                                : 99;
                            const stockLeft = Math.min(rStock, gStock);
                            const cantAfford = team.coins < item.price;
                            const notEligible =
                              (item.onlyKillingFloorBuyer && !myState.inKillingFloor) ||
                              (item.id === 'MIRROR_SHIELD' && myState.mirrorShield) ||
                              (item.id === 'REVIVE_POTION' && myState.hearts >= 4);
                            const hasTargets =
                              item.needsTarget === 'KILLING_FLOOR'
                                ? active.some((tid) => !lms.teamStates[tid].isGhost && lms.teamStates[tid].inKillingFloor)
                                : item.needsTarget === 'RIVAL_LIVING'
                                ? active.some((tid) => tid !== selectedTeamId && !lms.teamStates[tid].isGhost)
                                : true;
                            const disabled =
                              lmsShopBusy || stockLeft <= 0 || cantAfford || notEligible || !hasTargets;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (item.needsTarget) {
                                    setLmsPendingTargetItem(item.id);
                                  } else {
                                    handleBuyWithDebounce(item.id);
                                  }
                                }}
                                className={`w-full rounded-2xl p-3 border-2 text-left transition-all ${
                                  disabled
                                    ? 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                                    : 'bg-slate-900 hover:bg-purple-950/60 border-purple-500/70 text-white active:scale-[0.98]'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-black text-sm">
                                    {item.icon} {item.name}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="px-2 py-0.5 rounded bg-amber-500 text-black font-mono text-xs font-black">
                                      {item.price} ฿
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] font-bold">
                                      เหลือ {stockLeft}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-300 mt-1">{item.description}</div>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* PART1_MINIGAME */}
                {lms.phase === 'PART1_MINIGAME' && (
                  <div className="flex-1 flex flex-col justify-center gap-3">
                    {lms.part1Round === 1 && !myState.inKillingFloor && !myState.isGhost && (
                      <div className="rounded-3xl bg-purple-950/70 border-2 border-purple-400 p-5 text-center space-y-3">
                        <h3 className="text-lg font-black text-amber-300">
                          🍷 วางยาพิษใส่ถ้วย (เลือกได้ 1–2 ใบ)
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[1, 2, 3, 4].map((num) => {
                            const picked = lmsPoisonPicks.includes(num);
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() => {
                                  const next = picked
                                    ? lmsPoisonPicks.filter((x) => x !== num)
                                    : lmsPoisonPicks.length < 2
                                    ? [...lmsPoisonPicks, num]
                                    : [lmsPoisonPicks[1], num];
                                  setLmsPoisonPicks(next);
                                  lmsMinigameAction(selectedTeamId, {
                                    subType: 'POISON_SET',
                                    chalices: next,
                                  });
                                }}
                                className={`py-4 rounded-2xl border-2 font-black text-base ${
                                  picked
                                    ? 'bg-purple-600 border-yellow-300 text-white'
                                    : 'bg-slate-900 border-slate-700 text-slate-300'
                                }`}
                              >
                                🍷 ถ้วย #{num}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {lms.part1Round === 1 && myState.inKillingFloor && !myState.isGhost && (
                      <div className="rounded-3xl bg-red-950/70 border-2 border-red-500 p-5 text-center space-y-3">
                        <h3 className="text-lg font-black text-white">
                          🍷 เลือกหยิบถ้วยดื่มเอาชีวิตรอด!
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[1, 2, 3, 4].map((num) => {
                            const picked = lms.chalicePicks[selectedTeamId] === num;
                            return (
                              <button
                                key={num}
                                type="button"
                                onClick={() =>
                                  lmsMinigameAction(selectedTeamId, {
                                    subType: 'CHALICE_PICK',
                                    chalice: num,
                                  })
                                }
                                className={`py-4 rounded-2xl border-2 font-black text-base ${
                                  picked
                                    ? 'bg-amber-500 border-black text-black'
                                    : 'bg-slate-900 border-slate-700 text-white'
                                }`}
                              >
                                🍷 ดื่มถ้วย #{num}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {lms.part1Round === 2 && myState.inKillingFloor && !myState.isGhost && (
                      <div className="rounded-3xl bg-slate-900 border-2 border-amber-400 p-5 text-center space-y-3">
                        <h3 className="text-lg font-black text-amber-300">
                          🤝 หักหลังแบ่งสมบัติ (Split or Steal)
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              lmsMinigameAction(selectedTeamId, {
                                subType: 'SPLIT_STEAL',
                                choice: 'SPLIT',
                              })
                            }
                            className={`py-4 rounded-2xl border-2 font-black text-base ${
                              lms.splitStealPicks[selectedTeamId] === 'SPLIT'
                                ? 'bg-emerald-500 text-black border-white'
                                : 'bg-emerald-950 text-emerald-200 border-emerald-500'
                            }`}
                          >
                            🤝 จับมือรอดไปด้วยกัน (SPLIT)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              lmsMinigameAction(selectedTeamId, {
                                subType: 'SPLIT_STEAL',
                                choice: 'STEAL',
                              })
                            }
                            className={`py-4 rounded-2xl border-2 font-black text-base ${
                              lms.splitStealPicks[selectedTeamId] === 'STEAL'
                                ? 'bg-red-600 text-white border-yellow-300'
                                : 'bg-red-950 text-red-200 border-red-500'
                            }`}
                          >
                            🗡️ แทงข้างหลัง! (STEAL +300 ฿)
                          </button>
                        </div>
                      </div>
                    )}

                    {lms.part1Round === 3 && !myState.inKillingFloor && (
                      <div className="rounded-3xl bg-slate-900 border-2 border-rose-500 p-5 text-center space-y-3">
                        <h3 className="text-lg font-black text-white">
                          🎭 โหวตชี้ชะตาทีมบนลานประหาร!
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              lmsMinigameAction(selectedTeamId, {
                                subType: 'DARE_VOTE',
                                vote: 'SPARE',
                              })
                            }
                            className={`py-4 rounded-2xl border-2 font-black ${
                              lms.dareVotes[selectedTeamId] === 'SPARE'
                                ? 'bg-emerald-500 text-black border-white'
                                : 'bg-emerald-950 text-emerald-200 border-emerald-500'
                            }`}
                          >
                            💚 ไว้ชีวิต
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              lmsMinigameAction(selectedTeamId, {
                                subType: 'DARE_VOTE',
                                vote: 'EXECUTE',
                              })
                            }
                            className={`py-4 rounded-2xl border-2 font-black ${
                              lms.dareVotes[selectedTeamId] === 'EXECUTE'
                                ? 'bg-red-600 text-white border-yellow-300'
                                : 'bg-red-950 text-red-200 border-red-500'
                            }`}
                          >
                            💀 ประหาร (-1 ❤️)
                          </button>
                        </div>
                      </div>
                    )}

                    {lms.part1Round === 4 && myState.inKillingFloor && !myState.isGhost && (
                      <div className="rounded-3xl bg-slate-900 border-2 border-orange-500 p-5 text-center space-y-3">
                        <h3 className="text-lg font-black text-amber-300">
                          🎲 ทอยเต๋าวัดดวงแข่ง Krampus!
                        </h3>
                        {lms.teamDiceRolls[selectedTeamId] ? (
                          <div className="text-5xl font-black text-white">
                            🎲 {lms.teamDiceRolls[selectedTeamId]}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              lmsMinigameAction(selectedTeamId, { subType: 'DEATH_DICE' })
                            }
                            className="w-full py-5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-black font-black text-xl border-4 border-black"
                          >
                            🎲 กดทอยลูกเต๋า!
                          </button>
                        )}
                      </div>
                    )}

                    {((lms.part1Round !== 1 && lms.part1Round !== 3 && !myState.inKillingFloor) ||
                      (lms.part1Round === 3 && myState.inKillingFloor) ||
                      myState.isGhost) && (
                      <div className="rounded-3xl bg-slate-900 border border-slate-700 p-6 text-center text-sm font-bold text-slate-300">
                        👀 ดูเหตุการณ์สดบนหน้าเวทีและจอใหญ่!
                      </div>
                    )}
                  </div>
                )}

                {/* PART1_MINIGAME_REVEAL / PART1_GREED_TAX */}
                {(lms.phase === 'PART1_MINIGAME_REVEAL' || lms.phase === 'PART1_GREED_TAX') && (
                  <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-slate-900 border-2 border-amber-400/60 p-6 text-center gap-2">
                    <div className="text-4xl">
                      {lms.phase === 'PART1_GREED_TAX' ? '💸' : '⚖️'}
                    </div>
                    <h3 className="text-xl font-black text-amber-300">
                      {lms.phase === 'PART1_GREED_TAX'
                        ? 'Krampus เก็บภาษีคนงก (>1,000 ฿ หัก 50%)!'
                        : 'เฉลยผลลานประหารบนจอใหญ่แล้ว!'}
                    </h3>
                  </div>
                )}

                {/* PART2: GIANT 3-COLOR BUTTONS + JETPACK */}
                {(lms.phase === 'PART2_CLUE' ||
                  lms.phase === 'PART2_QUESTION' ||
                  lms.phase === 'PART2_REVEAL' ||
                  lms.phase === 'CHAMPION') && (
                  <div className="flex-1 flex flex-col justify-between gap-3">
                    {!myState.isGhost && myState.jetpacks > 0 && lms.phase !== 'CHAMPION' && (
                      <button
                        type="button"
                        onClick={() => lmsUseJetpack(selectedTeamId)}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-base border-4 border-black shadow-[4px_4px_0px_#000] active:scale-95"
                      >
                        🚀 จุดพลุไอพ่นหนีตาย (+3 ขั้นทันที! เหลือ {myState.jetpacks})
                      </button>
                    )}

                    {lms.phase === 'CHAMPION' ? (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-amber-950/60 border-4 border-amber-400 p-6 text-center">
                        <div className="text-5xl mb-2">🏆</div>
                        <h3 className="text-2xl font-black text-amber-300">
                          แชมป์คือ {teams[lms.winnerTeamId || 'team1']?.icon}{' '}
                          {teams[lms.winnerTeamId || 'team1']?.name}!
                        </h3>
                      </div>
                    ) : mySubmission && lms.phase === 'PART2_QUESTION' ? (
                      <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-emerald-950/60 border-2 border-emerald-400 p-6 text-center">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2" />
                        <div className="text-2xl font-black text-white">
                          กดสี [{mySubmission.value}] แล้ว!
                        </div>
                        <div className="text-xs text-slate-300 mt-1">รอเฉลยบนจอใหญ่...</div>
                      </div>
                    ) : (
                      <div className="flex-1 grid grid-cols-1 gap-3">
                        {(
                          [
                            { key: 'A', label: 'A สีแดง', bg: 'bg-red-600 hover:bg-red-500 text-white' },
                            { key: 'B', label: 'B สีน้ำเงิน', bg: 'bg-blue-600 hover:bg-blue-500 text-white' },
                            { key: 'C', label: 'C สีเหลือง', bg: 'bg-yellow-400 hover:bg-yellow-300 text-black' },
                          ] as const
                        ).map((btn) => {
                          const unlocked = lms.phase === 'PART2_QUESTION';
                          return (
                            <button
                              key={btn.key}
                              type="button"
                              disabled={!unlocked}
                              onClick={() => submitTeamAnswer(selectedTeamId, btn.key)}
                              className={`rounded-3xl border-4 border-black font-black text-3xl flex items-center justify-center shadow-[6px_6px_0px_#000] transition-all ${
                                unlocked
                                  ? `${btn.bg} active:scale-95`
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-70'
                              }`}
                            >
                              {unlocked ? btn.label : `🔒 ${btn.label}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {/* ==========================================================
            MODE D: WAGERING / SECRET NUMBER 1-10 / QUIXORT BET
        ========================================================== */}
        {round.status !== 'IDLE' &&
          round.inputMode === 'MODE_D_SECRET' &&
          !(round.gameStage === 'QUIXORT' && round.toyFactory) &&
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
