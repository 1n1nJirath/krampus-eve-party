import React, { useState } from 'react';
import {
  Play,
  Pause,
  Eye,
  RotateCcw,
  Coins,
  QrCode,
  ExternalLink,
  Trophy,
  Undo2,
  Settings,
  Sparkles,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  ListChecks,
  Wand2,
  AlertOctagon,
  Sliders,
  Gavel,
  DoorOpen,
  Shield,
  Shuffle,
  Map,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { TEAM_ORDER, getSuggestedSafeRange } from '../data/initialData';
import { ChronoSubRound, GameStage, TeamId, YearUnit } from '../types/game';
import { CountdownTimer } from '../components/CountdownTimer';
import { QrCodeModal } from '../components/QrCodeModal';

export const AdminControl: React.FC = () => {
  const {
    state,
    connectionMode,
    supabaseConfig,
    saveSupabaseConfig,
    startMansionGame,
    loadPreset,
    launchFreestyle,
    updateRoundConfig,
    updateChoiceOption,
    toggleDoorOpened,
    shuffleDoors,
    finishEightDoorsGame,
    switchEightDoorsSubRound,
    switchChronoSubRound,
    launchChronoTrapGuessPhase,
    finishChronoGame,
    resolveSubRound2Auction,
    startTimer,
    pauseTimer,
    lockRound,
    revealRound,
    resetRoundSubmissions,
    adjustCoins,
    adjustShields,
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
    submitTeamAnswer,
    pressTeamBuzzer,
    clearTeamSubmission,
  } = useGame();

  const { round, teams, submissions, buzzerQueue, presets, transactions } = state;

  const [qrOpen, setQrOpen] = useState(false);
  const [cloudModalOpen, setCloudModalOpen] = useState(false);
  const [selectedStageTab, setSelectedStageTab] = useState<GameStage | 'ALL'>('ALL');
  const [customCoinInputs, setCustomCoinInputs] = useState<Record<TeamId, string>>({
    team1: '100',
    team2: '100',
    team3: '100',
    team4: '100',
  });
  const [alertDraft, setAlertDraft] = useState(
    '👹 ครามปุสกำลังออกล่า! รักษาเกราะเด็กดีและเหรียญศักดิ์สิทธิ์ของพวกเจ้าให้ดี!'
  );
  const [scoringFeedback, setScoringFeedback] = useState<string[] | null>(null);
  const [supaUrlDraft, setSupaUrlDraft] = useState(supabaseConfig.url);
  const [supaKeyDraft, setSupaKeyDraft] = useState(supabaseConfig.anonKey);
  const [supaEnabledDraft, setSupaEnabledDraft] = useState(supabaseConfig.enabled);

  const filteredPresets =
    selectedStageTab === 'ALL'
      ? presets
      : presets.filter((p) => p.gameStage === selectedStageTab);

  const isEightDoorsGame = round.gameStage === 'POLL_MINE' && round.inputMode === 'MODE_A_CHOICE';
  const subRound = round.eightDoorsSubRound || 'SUB1_SURVIVAL';

  // Count how many of ranks 2, 3, 4 are already opened on the 8-door board
  const openedRanks2To4Count = round.choices.filter(
    (c) => (c.rank === 2 || c.rank === 3 || c.rank === 4) && c.isOpened
  ).length;

  const handleAutoScore = (quixortOutcome?: 'PASS' | 'FAIL') => {
    const res = autoApplyRoundScoring(quixortOutcome);
    setScoringFeedback(res.summary.length > 0 ? res.summary : ['ไม่มีการเปลี่ยนแปลงเหรียญ/เกราะ']);
    setTimeout(() => setScoringFeedback(null), 8000);
  };

  const handleConfirmResetSubmissions = () => {
    if (
      window.confirm(
        'ยืนยันการล้างคำตอบของทั้ง 4 ทีมในรอบนี้หรือไม่? (สถานะประตูที่เปิดไปแล้วในด่านที่ 1 จะยังอยู่ครบ)'
      )
    ) {
      resetRoundSubmissions();
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-12">
      {/* ============================================================
          1. TOP ADMIN NAVBAR (Includes Remote Projector Toggles)
      ============================================================ */}
      <header className="sticky top-0 z-30 bg-slate-950/95 border-b border-slate-800 px-5 py-3 backdrop-blur-md">
        <div className="max-w-[1750px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700 border border-amber-400 flex items-center justify-center text-xl shadow">
              👹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-lg text-white">
                  GM MASTER CONTROL • แผงควบคุมใหญ่
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-mono text-[11px] font-bold">
                  ● {connectionMode === 'LOCAL_SERVER' && 'Local Realtime (<30ms)'}
                  {connectionMode === 'SUPABASE_CLOUD' && 'Supabase Cloud Realtime'}
                  {connectionMode === 'BROWSER_SYNC' && 'Instant Browser Sync'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                ควบคุมจอใหญ่ (/display) และจอมือถือทั้ง 4 ทีมแบบ Realtime
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/display"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow"
            >
              <span>เปิดจอ Projector (/display)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setShowLeaderboardOverlay(!state.showLeaderboardOverlay)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition ${
                state.showLeaderboardOverlay
                  ? 'bg-emerald-500 text-slate-950 border-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>
                {state.showLeaderboardOverlay
                  ? 'ซ่อนตารางอันดับบนจอ /display'
                  : 'เปิดตารางอันดับบนจอ /display'}
              </span>
            </button>

            <button
              onClick={() => setQrOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 border border-white font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.4)]"
            >
              <QrCode className="w-4 h-4 text-slate-950" />
              <span>เปิด QR Code 4 ทีม (ให้ Sub-GM สแกน)</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200"
              title="เปิด/ปิดเสียง"
            >
              {state.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-red-400" />
              )}
            </button>

            <button
              onClick={() => setCloudModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Cloud Sync</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1750px] mx-auto px-5 pt-5 space-y-6">
        {/* ============================================================
            1.5 LOBBY & SUB-GM REGISTRATION CONTROL BAR + START GAME BUTTON
        ============================================================ */}
        <div className="rounded-3xl bg-gradient-to-r from-red-950/90 via-slate-900 to-emerald-950/80 border-2 border-amber-500/50 p-4 md:p-5 shadow-xl">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-xs font-black uppercase">
                  LOBBY & MANSION GATE
                </span>
                <span className="text-xs font-mono font-bold text-emerald-300">
                  Sub-GM ลงทะเบียนแล้ว:{' '}
                  {TEAM_ORDER.filter((tid) => teams[tid].isRegistered).length} / 4 ทีม
                </span>
                {state.roomLocked && (
                  <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold">
                    🔒 ล็อกห้องแล้ว
                  </span>
                )}
              </div>
              <h2 className="text-base md:text-lg font-black text-white">
                ระบบเข้าห้อง & ลงทะเบียน Sub-GM (ไม่แสดง QR บนจอ /display เพื่อกันผู้เล่นทั่วไปแอบสแกน)
              </h2>
            </div>

            {/* 4 Team Registration Status Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-3xl">
              {TEAM_ORDER.map((tid) => {
                const t = teams[tid];
                const isReg = Boolean(t.isRegistered);
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => updateTeamProfile(tid, { isRegistered: !isReg })}
                    title="คลิกเพื่อสลับสถานะลงทะเบียนด้วยมือ (Manual Override)"
                    className={`p-2.5 rounded-2xl border text-left transition flex items-center justify-between gap-2 ${
                      isReg
                        ? 'bg-emerald-950/90 border-emerald-400 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono font-bold text-amber-400">
                        TEAM {t.number} {t.icon}
                      </div>
                      <div className="text-xs font-extrabold truncate">
                        {isReg ? t.name : 'กำลังค้นหาทีม...'}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                        isReg ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isReg ? 'พร้อมลุย!' : 'รอ...'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Action Buttons: Open QR on Admin / Show Lobby / Start Game (Mansion World Map) */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setGameStage('LOBBY')}
                className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs border transition ${
                  round.gameStage === 'LOBBY'
                    ? 'bg-amber-400 text-slate-950 border-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
              >
                🏠 เปิดหน้า Lobby
              </button>

              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 font-extrabold text-xs flex items-center gap-1.5"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code 4 ทีม</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const regCount = TEAM_ORDER.filter((tid) => teams[tid].isRegistered).length;
                  if (regCount < 2) {
                    window.alert(
                      `ต้องมี Sub-GM ลงทะเบียนอย่างน้อย 2 ทีมก่อนเริ่มเกม (ตอนนี้ลงทะเบียนแล้ว ${regCount} ทีม)`
                    );
                    return;
                  }
                  if (
                    window.confirm(
                      `ยืนยันล็อกห้องและเริ่มเข้าสู่คฤหาสน์ด้วย ${regCount} ทีมหรือไม่?`
                    )
                  ) {
                    startMansionGame();
                  }
                }}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm border-2 border-white shadow-[0_0_25px_rgba(16,185,129,0.5)] flex items-center gap-2 active:scale-95 transition"
              >
                <span>🏰 เริ่มเข้าสู่คฤหาสน์ (Start Game)</span>
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================
            2. TOP HALF: QUESTION BANK (LEFT 5 COLS) + ROUND CONTROL & LIVE EDITOR (RIGHT 7 COLS)
        ============================================================ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT 5 COLS (TOP): QUESTION BANK & STAGE SWITCHER + LIVE INSPECTOR */}
          <div className="xl:col-span-5 space-y-6">
            {/* QUESTION BANK (Moved to Top for Instant Access without Scrolling!) */}
            <div className="rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-amber-400" />
                  <h2 className="font-extrabold text-base text-white">
                    คลังโจทย์สำเร็จรูป 4 เกม (กดปุ่มเดียวเปลี่ยนทั้งโจทย์, มือถือ & ป้ายชื่อเกม!)
                  </h2>
                </div>
              </div>

              {/* Game Stage Filter + Instant Stage Switcher */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {(
                  [
                    ['ALL', 'ดูทั้งหมด'],
                    ['LOBBY', '🏠 Lobby'],
                    ['WORLD_MAP', '🏰 Mansion Map'],
                    ['POLL_MINE', '1. 8 ประตูวัดใจครามปุส'],
                    ['TIMEJINX', '2. Timejinx'],
                    ['QUIXORT', '3. Quixort'],
                    ['TRIVIA_MURDER', '4. Trivia Murder'],
                    ['FINALE', '🏆 Finale'],
                  ] as [GameStage | 'ALL', string][]
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    onClick={() => {
                      if (tab === 'FINALE' || tab === 'LOBBY' || tab === 'WORLD_MAP') {
                        setGameStage(tab, true);
                      } else {
                        setSelectedStageTab(tab);
                        if (tab !== 'ALL') {
                          setGameStage(tab, true);
                        }
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                      (tab === 'ALL' && selectedStageTab === 'ALL') ||
                      (tab !== 'ALL' && round.gameStage === tab)
                        ? 'bg-amber-400 text-slate-950 border-white shadow'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="space-y-2 max-h-[370px] overflow-y-auto pr-1">
                {filteredPresets.map((preset) => {
                  const isCurrent = round.presetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                            {preset.gameStage === 'POLL_MINE' ? '8 DOORS' : preset.gameStage}
                          </span>
                          <span className="text-xs font-extrabold text-white truncate">
                            {preset.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 truncate mt-1">
                          {preset.questionText}
                        </p>
                      </div>
                      <button
                        onClick={() => loadPreset(preset)}
                        className={`px-3.5 py-2 rounded-xl font-black text-xs shrink-0 transition ${
                          isCurrent
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        {isCurrent ? '✓ โหลดอยู่' : 'โหลดข้อนี้'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GM SECRET LIVE INSPECTOR (See answers before Reveal!) */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-base text-white">
                    ตาทิพย์ GM: ตรวจคำตอบลับของ 4 ทีมแบบ Realtime (ก่อนกด Reveal)
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TEAM_ORDER.map((tid) => {
                  const t = teams[tid];
                  const sub = submissions[tid];
                  const buzz = buzzerQueue.find((b) => b.teamId === tid);

                  return (
                    <div
                      key={tid}
                      className={`p-3.5 rounded-2xl border ${
                        sub || buzz
                          ? 'bg-amber-950/25 border-amber-500/60'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-white">
                          {t.icon} Team {t.number} ({t.coins}🪙 | {'🛡️'.repeat(t.shields)})
                        </span>
                        {sub && (
                          <button
                            onClick={() => clearTeamSubmission(tid)}
                            className="text-[11px] text-red-400 hover:underline"
                          >
                            ยกเลิกส่ง
                          </button>
                        )}
                      </div>

                      {round.inputMode === 'MODE_C_BUZZER' ? (
                        <div className="space-y-2">
                          {buzz ? (
                            <div className="p-2 rounded-xl bg-black/50 text-center">
                              <div className="text-lg font-black text-amber-300">
                                คิว #{buzz.rank}
                              </div>
                              <div className="text-xs font-mono text-slate-300">
                                {(buzz.elapsedFromStartMs / 1000).toFixed(3)}s
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 text-center py-2">
                              ยังไม่กดกระดิ่ง
                            </div>
                          )}
                          <button
                            onClick={() => pressTeamBuzzer(tid)}
                            className="w-full py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-xs font-bold text-amber-200 border border-red-600/40"
                          >
                            กดกระดิ่งแทน Team {t.number}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {sub ? (
                            <div className="p-2 rounded-xl bg-black/60 border border-amber-500/30 text-center">
                              <div className="text-[11px] text-slate-300">คำตอบลับที่ส่งมา:</div>
                              <div className="text-lg font-mono font-black text-amber-300">
                                {isEightDoorsGame && subRound === 'SUB3_POLARITY'
                                  ? `#1=${sub.value} | #8=${sub.secondaryValue}`
                                  : `${String(sub.value)} ${
                                      sub.secondaryValue ? `(${sub.secondaryValue})` : ''
                                    }`}
                              </div>
                              <div className="text-[11px] font-mono text-emerald-400">
                                {(sub.elapsedMs / 1000).toFixed(3)}s ({sub.elapsedMs} ms)
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-slate-400 text-center py-2.5">
                              กำลังคิดคำตอบ...
                            </div>
                          )}

                          {/* Quick simulate buttons for Mode A */}
                          {round.inputMode === 'MODE_A_CHOICE' && (
                            <div className="flex flex-wrap gap-1 justify-center">
                              {round.choices.slice(0, round.choiceCount).map((c) => (
                                <button
                                  key={c.key}
                                  onClick={() => submitTeamAnswer(tid, c.key)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-mono text-xs font-bold"
                                  title={`ส่งข้อ ${c.key} แทน Team ${t.number}`}
                                >
                                  {c.key}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT 7 COLS (TOP): MASTER EXECUTION + 8 DOORS SUB-ROUND DECK + LIVE EDITOR */}
          <div className="xl:col-span-7 space-y-6">
            {/* Master Timer, Reveal & Auto-Scoring Controls */}
            <div className="rounded-3xl bg-slate-900 border-2 border-amber-500/50 p-5 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-black uppercase ${
                        round.status === 'ACTIVE'
                          ? 'bg-emerald-500 text-slate-950'
                          : round.status === 'REVEALED'
                          ? 'bg-amber-400 text-slate-950'
                          : round.status === 'LOCKED'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      STATUS: {round.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-red-950 border border-amber-500/40 text-xs font-mono text-amber-300 font-bold">
                      {round.gameStage === 'POLL_MINE'
                        ? 'GAME 1 • THE 8 DOORS OF KRAMPUS'
                        : round.gameStage}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">{round.title}</h3>
                </div>

                <CountdownTimer size="md" />
              </div>

              {/* ========================================================
                  DEDICATED 3 SUB-ROUND CONTROLLER FOR "THE 8 DOORS OF KRAMPUS"
              ======================================================== */}
              {isEightDoorsGame && (
                <div className="my-4 p-4 rounded-2xl bg-slate-950/90 border-2 border-amber-500/40 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="w-5 h-5 text-amber-400" />
                      <span className="font-extrabold text-sm text-amber-300">
                        ลำดับการเล่น 8 ประตูวัดใจครามปุส (กระดาน 8 บานค้างหน้าจอตลอด 3 ด่านย่อย):
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-300">
                      เปิดอันดับ 2-4 ไปแล้ว: {openedRanks2To4Count}/3 บาน
                    </span>
                  </div>

                  {/* 4 Step Sub-Round Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <button
                      onClick={() => switchEightDoorsSubRound('SUB1_SURVIVAL')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        subRound === 'SUB1_SURVIVAL'
                          ? 'bg-emerald-900/70 border-emerald-400 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-black text-emerald-300">
                        ด่านย่อยที่ 1
                      </div>
                      <div className="font-extrabold text-xs">เปิดทางรอด (หา #1-#3)</div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        ถูก +300🪙 / ผิด -1🛡️
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        switchEightDoorsSubRound('SUB2_AUCTION', { auctionIteration: 1 })
                      }
                      className={`p-2.5 rounded-xl border text-left transition ${
                        (subRound === 'SUB2_AUCTION' || subRound === 'SUB2_DOOR_AND_BET') &&
                        round.auctionIteration === 1
                          ? 'bg-amber-900/70 border-amber-400 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-black text-amber-300">
                        ด่านย่อยที่ 2 (รอบ 2.1)
                      </div>
                      <div className="font-extrabold text-xs">ประมูลรอบแรก (หา #2-#4)</div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        บิดทีละ 50🪙 ➔ แทงข้าง
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        switchEightDoorsSubRound('SUB2_AUCTION', { auctionIteration: 2 })
                      }
                      className={`p-2.5 rounded-xl border text-left transition ${
                        (subRound === 'SUB2_AUCTION' || subRound === 'SUB2_DOOR_AND_BET') &&
                        round.auctionIteration === 2
                          ? 'bg-amber-900/70 border-amber-400 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-black text-amber-300">
                        ด่านย่อยที่ 2 (รอบ 2.2)
                      </div>
                      <div className="font-extrabold text-xs">ประมูลรอบสอง (ล็อกทีม 2.1)</div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        {round.subRound2LockedTeamId
                          ? `ล็อก ${teams[round.subRound2LockedTeamId].name}`
                          : '3 ทีมที่เหลือประมูล'}
                      </div>
                    </button>

                    <button
                      onClick={() => switchEightDoorsSubRound('SUB3_POLARITY')}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        subRound === 'SUB3_POLARITY'
                          ? 'bg-purple-900/70 border-purple-400 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-black text-purple-300">
                        ด่านย่อยที่ 3 (ข้อ 3)
                      </div>
                      <div className="font-extrabold text-xs">
                        วัดใจขั้วตรงข้าม (#1 & #{round.choiceCount})
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5">
                        โหลดคำถามข้อ 3 & ปิดประตูใหม่
                      </div>
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={finishEightDoorsGame}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>จบเกมที่ 1 (ปิดเกราะเด็กดี) ➔ กลับ Mansion World Map</span>
                    </button>
                  </div>

                  {/* Special Sub-Round 2 Phase 1 -> Phase 2 Auction Resolution Banner */}
                  {subRound === 'SUB2_AUCTION' && (
                    <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-amber-200 font-bold">
                        🔨 เมื่อทีมบิดเสร็จแล้ว กดปุ่มนี้เพื่อหักเงินผู้ชนะสูงสุด (หรือคิด Coward&apos;s Tax -100 ฿ หากไม่มีคนบิด) และไปหน้าเลือกประตู/แทงข้าง:
                      </div>
                      <button
                        onClick={() => {
                          const res = resolveSubRound2Auction();
                          setScoringFeedback([res.message]);
                          setTimeout(() => setScoringFeedback(null), 7000);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shrink-0"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>ตัดสินผู้ชนะประมูล & หักเงินบิด ➔ ไปช่วงเลือกประตู/แทงข้าง</span>
                      </button>
                    </div>
                  )}

                  {subRound === 'SUB2_DOOR_AND_BET' && round.auctionWinnerTeamId && (
                    <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-400/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-purple-200">
                        {round.cowardFreePick
                          ? `⚠️ Coward's Tax: สุ่มให้ ${teams[round.auctionWinnerTeamId].icon} ${teams[round.auctionWinnerTeamId].name} เปิดประตูฟรี (ได้ 0 ฿)`
                          : `👑 ผู้ชนะประมูลรอบนี้: ${teams[round.auctionWinnerTeamId].icon} ${teams[round.auctionWinnerTeamId].name} (จ่าย ${round.auctionWinningBid} ฿)`}{' '}
                        — กำลังเลือกประตู 1 บาน ส่วนทีมอื่นกำลังแทงข้าง (รอด/พัง)
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* GAME 2 SPECIAL: THE CHRONO CRUSH SUB-ROUND & 9-QUESTION DECK */}
              {round.gameStage === 'TIMEJINX' && (
                <div className="mb-4 p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/40 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-emerald-300">
                        ⏳ คอนโซลควบคุมเกมที่ 2: THE CHRONO CRUSH (3 ด่านย่อย x 3 ข้อ = 9 ข้อ)
                      </span>
                    </div>
                    <span className="text-xs font-mono text-amber-300">
                      หน่วย: {round.yearUnit === 'BE' ? 'พ.ศ. (BE)' : 'ค.ศ. (AD)'} • ช่วง {round.yearMin ?? 1980}–{round.yearMax ?? 2026}
                    </span>
                  </div>

                  {/* 3 Sub-Rounds x 3 Questions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {[
                      {
                        sub: 'CHRONO_SUB1_CLASSIC' as ChronoSubRound,
                        title: '1. หยุดเข็มนาฬิกา (Classic)',
                        desc: '+600 / +300 / ห่าง ≥8 ปีหรือห่างสุด -50 ฿/ปี',
                        ids: ['tj-1', 'tj-2', 'tj-3'],
                      },
                      {
                        sub: 'CHRONO_SUB2_TRAP' as ChronoSubRound,
                        title: '2. วางกับดักเวลา (Time Trap)',
                        desc: 'วางกับดักลดสเต็ป 5/10 ปี • ฝ่าได้ x2 (+1,200 ฿)',
                        ids: ['tj-4', 'tj-5', 'tj-6'],
                      },
                      {
                        sub: 'CHRONO_SUB3_FAST_FINGER' as ChronoSubRound,
                        title: '3. สงครามแย่งปี (Fast Finger)',
                        desc: 'แย่งล็อกปี Realtime • +1,000 / +400 / -150 ฿/ปี',
                        ids: ['tj-7', 'tj-8', 'tj-9'],
                      },
                    ].map((group) => {
                      const isActiveGroup = (round.chronoSubRound || 'CHRONO_SUB1_CLASSIC') === group.sub;
                      return (
                        <div
                          key={group.sub}
                          className={`p-2.5 rounded-xl border space-y-2 ${
                            isActiveGroup
                              ? 'bg-emerald-950/60 border-emerald-400'
                              : 'bg-slate-900/80 border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="font-extrabold text-xs text-white">{group.title}</div>
                            <div className="text-[10px] text-slate-300">{group.desc}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {group.ids.map((pid, idx) => (
                              <button
                                key={pid}
                                type="button"
                                onClick={() => switchChronoSubRound(group.sub, { presetId: pid })}
                                className={`py-1.5 rounded-lg font-mono font-bold text-xs border transition ${
                                  round.presetId === pid
                                    ? 'bg-amber-400 text-slate-950 border-white shadow'
                                    : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-amber-400/60'
                                }`}
                              >
                                ข้อ {idx + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sub2 Phase 1 -> Phase 2 Transition */}
                  {round.chronoSubRound === 'CHRONO_SUB2_TRAP' &&
                    round.chronoPhase === 'TRAP_PLACEMENT' && (
                      <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-400/60 flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-amber-200 font-bold">
                          💣 จังหวะที่ 1: ทุกทีมกำลังวางกับดักเวลา — เมื่อวางเสร็จแล้ว กดปุ่มนี้เพื่อคำนวณ Step (1/5/10 ปี) และเริ่มทายปี:
                        </div>
                        <button
                          type="button"
                          onClick={launchChronoTrapGuessPhase}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg shrink-0"
                        >
                          🚀 จังหวะที่ 2: เปิดแถบเลื่อนทายปี!
                        </button>
                      </div>
                    )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={finishChronoGame}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Map className="w-3.5 h-3.5" />
                      <span>จบเกมที่ 2 (ครบ 9 ข้อ) ➔ กลับ Mansion World Map</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Primary 3 Action Buttons (Separated from Reset to prevent misclicks!) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
                <button
                  onClick={() => startTimer()}
                  className="py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>เริ่มจับเวลา (Start)</span>
                </button>

                <button
                  onClick={round.status === 'ACTIVE' ? pauseTimer : lockRound}
                  className="py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg transition"
                >
                  <Pause className="w-5 h-5 fill-current" />
                  <span>หยุด / ล็อกคำตอบ</span>
                </button>

                <button
                  onClick={revealRound}
                  className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:brightness-110 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(234,179,8,0.5)] transition"
                >
                  <Eye className="w-5 h-5" />
                  <span>เฉลยขึ้นจอ (Reveal!)</span>
                </button>
              </div>

              {/* Secondary Bar: Quick Duration Presets + Auto-Score + Safe Separated Reset Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400 mr-1">ตั้งเวลาด่วน:</span>
                  {[15, 20, 30, 45, 60, 90].map((sec) => (
                    <button
                      key={sec}
                      onClick={() => startTimer(sec)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                        round.durationSeconds === sec
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Auto-Calculate Coins & Shields Button */}
                  {round.inputMode === 'MODE_D_SECRET' && round.modeDSubType === 'QUIXORT_BET' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAutoScore('PASS')}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
                      >
                        ✓ ทีมสนามสำเร็จ (จ่าย PASS)
                      </button>
                      <button
                        onClick={() => handleAutoScore('FAIL')}
                        className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black"
                      >
                        ✕ ทีมสนามล้มเหลว (จ่าย FAIL)
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAutoScore()}
                      disabled={round.rewardsApplied}
                      className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition ${
                        round.rewardsApplied
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 cursor-default'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {round.rewardsApplied
                          ? '✓ คำนวณเหรียญ & เกราะรอบนี้แล้ว'
                          : 'คำนวณเหรียญ & เกราะอัตโนมัติตามกติกา'}
                      </span>
                    </button>
                  )}

                  {/* Separated Reset Button with Confirmation Dialog */}
                  <button
                    onClick={handleConfirmResetSubmissions}
                    className="px-3 py-2 rounded-xl bg-red-950/50 hover:bg-red-900/70 text-red-300 border border-red-800/60 font-bold text-xs flex items-center gap-1.5 transition ml-2"
                    title="มีหน้าต่างถามยืนยันก่อนล้างข้อมูล"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ล้างคำตอบรอบนี้</span>
                  </button>
                </div>
              </div>

              {scoringFeedback && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-xs text-emerald-200 space-y-1">
                  <div className="font-bold text-emerald-300">
                    สรุปรายการคำนวณเหรียญศักดิ์สิทธิ์ & เกราะเด็กดี:
                  </div>
                  {scoringFeedback.map((line, idx) => (
                    <div key={idx}>• {line}</div>
                  ))}
                </div>
              )}
            </div>

            {/* LIVE QUESTION & 8-DOOR BOARD EDITOR (Top Right Half) */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  <h3 className="font-extrabold text-base text-white">
                    แก้ไขโจทย์ & จัดการกระดานประตูแบบสดๆ (Live Editor)
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <label className="text-slate-400">รางวัลตอบถูก:</label>
                  <input
                    type="number"
                    value={round.rewardCoins}
                    onChange={(e) => updateRoundConfig({ rewardCoins: Number(e.target.value) })}
                    className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono text-emerald-400 font-bold"
                  />
                  <label className="text-slate-400 ml-2">ปรับตอบผิด:</label>
                  <input
                    type="number"
                    value={round.penaltyCoins}
                    onChange={(e) => updateRoundConfig({ penaltyCoins: Number(e.target.value) })}
                    className="w-20 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 font-mono text-red-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 font-semibold">ชื่อรอบ / ชื่อด่าน:</label>
                  <input
                    type="text"
                    value={round.title}
                    onChange={(e) => updateRoundConfig({ title: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-semibold">คำอธิบายกติกาย่อย:</label>
                  <input
                    type="text"
                    value={round.subtitle}
                    onChange={(e) => updateRoundConfig({ subtitle: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold">
                  ข้อความคำถามบนจอ Projector:
                </label>
                <textarea
                  rows={2}
                  value={round.questionText}
                  onChange={(e) => updateRoundConfig({ questionText: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-bold"
                />
              </div>

              {/* Mode-Specific Answer Settings */}
              {round.inputMode === 'MODE_A_CHOICE' && (
                <div className="space-y-2.5 pt-2 border-t border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-amber-300">
                      {isEightDoorsGame
                        ? `จัดการประตู ${round.choiceCount} บาน (A–${round.choices[round.choiceCount - 1]?.key || 'L'}) • ล็อกอันดับห้ามซ้ำ:`
                        : 'ตัวเลือกช้อยส์ (คลิกปุ่ม "✓ ถูก" หรือ "💀 กับดัก" เพื่อกำหนดเฉลย):'}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-slate-400">
                        {isEightDoorsGame ? 'จำนวนประตู:' : 'จำนวนช้อยส์:'}
                      </span>
                      {(isEightDoorsGame ? [8, 9, 10, 11, 12] : [4, 5, 6, 7, 8]).map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => updateRoundConfig({ choiceCount: cnt })}
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            round.choiceCount === cnt
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                      {isEightDoorsGame && (
                        <button
                          type="button"
                          onClick={shuffleDoors}
                          className="ml-2 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 transition"
                          title="สุ่มสลับข้อความตัวเลือกและอันดับไปยังประตู A-L ใหม่"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>สุ่มสลับประตู (Shuffle)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isEightDoorsGame && (() => {
                    const suggested = getSuggestedSafeRange(round.choiceCount, round.eightDoorsSubRound);
                    const safeMin = round.safeRankMin ?? suggested.min;
                    const safeMax = round.safeRankMax ?? suggested.max;
                    return (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-emerald-300">
                            🛡️ โซนปลอดภัย (Auto-Suggest: #{suggested.min}–#{suggested.max}):
                          </span>
                          <label className="text-slate-300">อันดับ</label>
                          <input
                            type="number"
                            min={1}
                            max={round.choiceCount}
                            value={safeMin}
                            onChange={(e) =>
                              updateRoundConfig({ safeRankMin: Math.max(1, Number(e.target.value)) })
                            }
                            className="w-14 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-emerald-300 font-bold text-center"
                          />
                          <span className="text-slate-400">ถึง</span>
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
                            className="w-14 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-emerald-300 font-bold text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            updateRoundConfig({ safeRankMin: suggested.min, safeRankMax: suggested.max })
                          }
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold"
                        >
                          ใช้ค่าแนะนำ (#{suggested.min}–#{suggested.max})
                        </button>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {round.choices.slice(0, round.choiceCount).map((choice) => {
                      const usedRanksElsewhere = new Set(
                        round.choices
                          .slice(0, round.choiceCount)
                          .filter((c) => c.key !== choice.key)
                          .map((c) => c.rank)
                      );
                      const suggested = getSuggestedSafeRange(round.choiceCount, round.eightDoorsSubRound);
                      const safeMin = round.safeRankMin ?? suggested.min;
                      const safeMax = round.safeRankMax ?? suggested.max;

                      return (
                      <div
                        key={choice.key}
                        className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-800"
                      >
                        <span className="w-7 h-7 rounded-lg bg-slate-800 font-mono font-black text-sm flex items-center justify-center text-amber-300 shrink-0">
                          {choice.key}
                        </span>
                        <input
                          type="text"
                          value={choice.label}
                          onChange={(e) =>
                            updateChoiceOption(choice.key, { label: e.target.value })
                          }
                          className="flex-1 min-w-0 bg-transparent text-xs text-white focus:outline-none border-b border-transparent focus:border-amber-500"
                        />

                        {isEightDoorsGame ? (
                          <>
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
                              className="px-1.5 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-amber-300"
                              title={`เลขอันดับผลโพล #1 - #${round.choiceCount} (ล็อกห้ามซ้ำ)`}
                            >
                              {Array.from({ length: round.choiceCount }, (_, i) => i + 1).map((rNum) => (
                                <option
                                  key={rNum}
                                  value={rNum}
                                  disabled={usedRanksElsewhere.has(rNum)}
                                >
                                  #{rNum} {usedRanksElsewhere.has(rNum) ? '(ซ้ำ)' : ''}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => toggleDoorOpened(choice.key)}
                              className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 ${
                                choice.isOpened
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {choice.isOpened ? 'เปิดอยู่' : 'ปิดอยู่'}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                updateChoiceOption(choice.key, {
                                  isCorrect: !choice.isCorrect,
                                  isTrap: false,
                                })
                              }
                              className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 ${
                                choice.isCorrect
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              ✓ ถูก
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateChoiceOption(choice.key, {
                                  isTrap: !choice.isTrap,
                                  isCorrect: false,
                                })
                              }
                              className={`px-2 py-1 rounded text-[11px] font-bold shrink-0 ${
                                choice.isTrap
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              💀 กับดัก
                            </button>
                          </>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {round.inputMode === 'MODE_B_YEAR' && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <label className="text-xs text-emerald-300 font-bold">ด่านย่อย:</label>
                      <select
                        value={round.chronoSubRound || 'CHRONO_SUB1_CLASSIC'}
                        onChange={(e) =>
                          updateRoundConfig({
                            chronoSubRound: e.target.value as ChronoSubRound,
                            chronoPhase:
                              e.target.value === 'CHRONO_SUB2_TRAP'
                                ? 'TRAP_PLACEMENT'
                                : 'YEAR_GUESS',
                          })
                        }
                        className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-white"
                      >
                        <option value="CHRONO_SUB1_CLASSIC">1. Classic Timeline</option>
                        <option value="CHRONO_SUB2_TRAP">2. Time Trap</option>
                        <option value="CHRONO_SUB3_FAST_FINGER">3. Fast Finger Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-emerald-300 font-bold">หน่วยปี (AD/BE):</label>
                      <select
                        value={round.yearUnit || 'AD'}
                        onChange={(e) =>
                          updateRoundConfig({ yearUnit: e.target.value as YearUnit })
                        }
                        className="w-full mt-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-bold text-amber-300"
                      >
                        <option value="AD">ค.ศ. (AD)</option>
                        <option value="BE">พ.ศ. (BE)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold">Min Year:</label>
                      <input
                        type="number"
                        value={round.yearMin ?? 1980}
                        onChange={(e) => updateRoundConfig({ yearMin: Number(e.target.value) })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 font-semibold">Max Year:</label>
                      <input
                        type="number"
                        value={round.yearMax ?? 2026}
                        onChange={(e) => updateRoundConfig({ yearMax: Number(e.target.value) })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-sm text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-amber-300 font-bold">
                        Correct Year ({round.yearUnit === 'BE' ? 'พ.ศ.' : 'ค.ศ.'}):
                      </label>
                      <input
                        type="number"
                        value={round.targetYear}
                        onChange={(e) => updateRoundConfig({ targetYear: Number(e.target.value) })}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/60 font-mono text-lg font-black text-amber-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {round.inputMode === 'MODE_D_SECRET' && round.modeDSubType === 'QUIXORT_BET' && (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-purple-300">
                    เลือกทีมที่กำลังลงสนามจัดเรียง (อีก 3 ทีมจะขึ้นหน้าจอแทงข้าง):
                  </span>
                  {TEAM_ORDER.map((tid) => (
                    <button
                      key={tid}
                      onClick={() => updateRoundConfig({ activeTeamId: tid })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                        round.activeTeamId === tid
                          ? 'bg-purple-600 text-white border-amber-300'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {teams[tid].icon} Team {teams[tid].number}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================
            3. BOTTOM HALF: SCOREBOARD & ECONOMY MANAGER + QUICK LAUNCH FREESTYLE
        ============================================================ */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* SCOREBOARD & HOLY COINS + NICE SHIELDS ECONOMY MANAGER (7 COLS) */}
          <div className="xl:col-span-7 rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-base text-white">
                  ระบบเศรษฐกิจเหรียญศักดิ์สิทธิ์ & เกราะเด็กดี 🛡️ (Scoreboard & Economy)
                </h3>
              </div>
              <button
                onClick={undoLastTransaction}
                disabled={transactions.length === 0}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold text-amber-300 flex items-center gap-1 border border-slate-700"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>ย้อนกลับ ({transactions.length})</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {TEAM_ORDER.map((tid) => {
                const team = teams[tid];
                const isNaughtyShields = team.shields <= 0;
                return (
                  <div
                    key={tid}
                    className={`p-3.5 rounded-2xl border space-y-2.5 ${
                      isNaughtyShields
                        ? 'bg-red-950/30 border-red-600/70'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{team.icon}</span>
                        <input
                          type="text"
                          value={team.name}
                          onChange={(e) => updateTeamProfile(tid, { name: e.target.value })}
                          className="bg-transparent font-extrabold text-sm text-white focus:outline-none border-b border-transparent focus:border-amber-400 truncate"
                        />
                      </div>

                      <div className="font-mono font-black text-xl text-amber-300 shrink-0">
                        {team.coins.toLocaleString()} 🪙
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {/* Nice Shields (เกราะเด็กดี) */}
                      <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                        <button
                          onClick={() => adjustShields(tid, -1)}
                          className="text-xs text-red-400 font-black px-1.5 hover:bg-red-950 rounded"
                        >
                          -
                        </button>
                        <span
                          className="text-xs font-bold text-slate-200 whitespace-nowrap"
                          title="เกราะเด็กดี (Nice Shields)"
                        >
                          {team.shields > 0
                            ? `🛡️×${team.shields}`
                            : '💔 0 (NAUGHTY)'}
                        </span>
                        <button
                          onClick={() => adjustShields(tid, 1)}
                          className="text-xs text-emerald-400 font-black px-1.5 hover:bg-emerald-950 rounded"
                        >
                          +
                        </button>
                      </div>

                      {/* Killing Floor Toggle (Single line whitespace-nowrap) */}
                      <button
                        onClick={() => toggleKillingFloor(tid)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                          team.isInKillingFloor
                            ? 'bg-red-600 text-white border-red-300'
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}
                      >
                        💀 ลานประหาร
                      </button>
                    </div>

                    {/* Quick Action Coin Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-900">
                      <div className="flex flex-wrap items-center gap-1">
                        {[100, 200, 300, 500].map((amt) => (
                          <button
                            key={`plus-${amt}`}
                            onClick={() =>
                              adjustCoins(tid, amt, `GM เพิ่มเหรียญ +${amt} ให้ Team ${team.number}`)
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-800 border border-emerald-600/50 font-mono text-xs font-bold text-emerald-300"
                          >
                            +{amt}
                          </button>
                        ))}
                        {[-100, -200, -300].map((amt) => (
                          <button
                            key={`minus-${amt}`}
                            onClick={() =>
                              adjustCoins(tid, amt, `GM หักเหรียญ ${amt} จาก Team ${team.number}`)
                            }
                            className="px-2 py-1 rounded-lg bg-red-950/90 hover:bg-red-800 border border-red-600/50 font-mono text-xs font-bold text-red-300"
                          >
                            {amt}
                          </button>
                        ))}
                      </div>

                      {/* Custom amount input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={customCoinInputs[tid]}
                          onChange={(e) =>
                            setCustomCoinInputs((prev) => ({ ...prev, [tid]: e.target.value }))
                          }
                          className="w-16 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-white text-center"
                        />
                        <button
                          onClick={() =>
                            adjustCoins(
                              tid,
                              Math.abs(Number(customCoinInputs[tid]) || 0),
                              'ปรับยอดระบุจำนวนโดย GM'
                            )
                          }
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                          title="บวกตามจำนวนที่กรอก"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            adjustCoins(
                              tid,
                              -Math.abs(Number(customCoinInputs[tid]) || 0),
                              'หักยอดระบุจำนวนโดย GM'
                            )
                          }
                          className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white"
                          title="ลบตามจำนวนที่กรอก"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QUICK LAUNCH FREESTYLE + KRAMPUS CURSE BROADCAST (5 COLS) */}
          <div className="xl:col-span-5 space-y-6">
            <section className="rounded-3xl bg-slate-900 border border-amber-500/30 p-5 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Wand2 className="w-5 h-5 text-amber-400" />
                <h2 className="font-extrabold text-sm md:text-base text-white">
                  Quick Launch (โหมดฟรีสไตล์) — สลับโหมดมือถือ + ป้ายบนจอใหญ่ทันที
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() =>
                    launchFreestyle({
                      gameStage: 'POLL_MINE',
                      inputMode: 'MODE_A_CHOICE',
                      choiceCount: 8,
                      durationSeconds: 45,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left transition"
                >
                  <div className="text-xs font-mono font-bold text-amber-400">
                    GAME 1 (8 ประตู)
                  </div>
                  <div className="font-extrabold text-sm text-white mt-0.5">
                    8 Doors of Krampus
                  </div>
                </button>

                <button
                  onClick={() =>
                    launchFreestyle({
                      gameStage: 'TRIVIA_MURDER',
                      inputMode: 'MODE_A_CHOICE',
                      choiceCount: 4,
                      durationSeconds: 30,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 text-left transition"
                >
                  <div className="text-xs font-mono font-bold text-amber-400">MODE A (4 ช้อยส์)</div>
                  <div className="font-extrabold text-sm text-white mt-0.5">ปรนัย A - D</div>
                </button>

                <button
                  onClick={() =>
                    launchFreestyle({
                      gameStage: 'TIMEJINX',
                      inputMode: 'MODE_B_YEAR',
                      targetYear: 2018,
                      durationSeconds: 30,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-emerald-400 text-left transition"
                >
                  <div className="text-xs font-mono font-bold text-emerald-400">
                    GAME 2 • MODE B
                  </div>
                  <div className="font-extrabold text-sm text-white mt-0.5">
                    ทายปี ค.ศ. (Timejinx)
                  </div>
                </button>

                <button
                  onClick={() =>
                    launchFreestyle({
                      gameStage: 'QUIXORT',
                      inputMode: 'MODE_C_BUZZER',
                      durationSeconds: 15,
                    })
                  }
                  className="p-3 rounded-xl bg-red-950/60 hover:bg-red-900/70 border border-red-500/60 text-left transition"
                >
                  <div className="text-xs font-mono font-bold text-amber-300">MODE C (Buzzer)</div>
                  <div className="font-extrabold text-sm text-white mt-0.5">🔔 แย่งกดกระดิ่ง</div>
                </button>

                <button
                  onClick={() =>
                    launchFreestyle({
                      gameStage: 'QUIXORT',
                      inputMode: 'MODE_D_SECRET',
                      modeDSubType: 'QUIXORT_BET',
                      durationSeconds: 60,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-purple-400 text-left transition"
                >
                  <div className="text-xs font-mono font-bold text-purple-400">
                    GAME 3 • QUIXORT
                  </div>
                  <div className="font-extrabold text-sm text-white mt-0.5">แทงข้าง PASS/FAIL</div>
                </button>

                <button
                  onClick={() =>
                    launchFreestyle({
                      gameStage: 'TRIVIA_MURDER',
                      inputMode: 'MODE_D_SECRET',
                      modeDSubType: 'UNIQUE_NUMBER_1_10',
                      durationSeconds: 30,
                    })
                  }
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-purple-400 text-left transition"
                >
                  <div className="text-xs font-mono font-bold text-purple-400">
                    GAME 4 • MODE D
                  </div>
                  <div className="font-extrabold text-sm text-white mt-0.5">เลขลับไม่ซ้ำ 1-10</div>
                </button>
              </div>
            </section>

            {/* Krampus Special Event Broadcast & Reset */}
            <div className="rounded-3xl bg-slate-900 border border-slate-800 p-5 space-y-3">
              <div className="text-xs font-bold text-red-400 uppercase flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4" /> ส่งข้อความประกาศคำสาป Krampus ขึ้นจอใหญ่:
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={alertDraft}
                  onChange={(e) => setAlertDraft(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                />
                <button
                  onClick={() =>
                    triggerKrampusAlert(state.krampusAlertMessage ? null : alertDraft)
                  }
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs shrink-0 ${
                    state.krampusAlertMessage
                      ? 'bg-slate-700 text-white'
                      : 'bg-red-600 hover:bg-red-500 text-white'
                  }`}
                >
                  {state.krampusAlertMessage ? 'ปิดประกาศ' : 'ยิงขึ้นจอ!'}
                </button>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                <span className="text-xs text-slate-400">
                  รีเซ็ตเหรียญ 1,000🪙 และเกราะเด็กดี 🛡️×3 ใหม่ทั้งหมด:
                </span>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        'ยืนยันการรีเซ็ตเหรียญ 1,000 เหรียญ และเกราะเด็กดี 3 ดวงของทุกทีมกลับเป็นค่าเริ่มต้น?'
                      )
                    ) {
                      resetAllGameData();
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/60 text-xs font-bold"
                >
                  รีเซ็ตเกมใหม่ทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Sync Settings Modal (Supabase Optional Configuration) */}
      {cloudModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="max-w-lg w-full rounded-3xl bg-slate-900 border border-amber-500/50 p-6 space-y-4">
            <h3 className="text-xl font-black text-white">
              ตั้งค่าระบบ Realtime Sync (Local Server & Supabase Cloud)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              • <strong>โหมดเริ่มต้น (Local Realtime Server):</strong> ทำงานทันทีเมื่อต่อ Wi-Fi / Hotspot เดียวกัน
              <br />• <strong>โหมด Cloud (Supabase Realtime):</strong> ซิงก์ข้ามเครือข่าย 4G/5G ทั่วโลกอัตโนมัติ
            </p>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-bold text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={supaEnabledDraft}
                  onChange={(e) => setSupaEnabledDraft(e.target.checked)}
                  className="w-4 h-4 accent-amber-400"
                />
                เปิดใช้งาน Supabase Realtime Broadcast
              </label>

              <div>
                <label className="text-xs text-slate-400">Supabase Project URL:</label>
                <input
                  type="text"
                  value={supaUrlDraft}
                  onChange={(e) => setSupaUrlDraft(e.target.value)}
                  placeholder="https://xxxx.supabase.co"
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400">Supabase Publishable / Anon Key:</label>
                <input
                  type="password"
                  value={supaKeyDraft}
                  onChange={(e) => setSupaKeyDraft(e.target.value)}
                  placeholder="sb_publishable_..."
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setCloudModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-bold text-slate-300"
              >
                ปิด
              </button>
              <button
                onClick={() => {
                  saveSupabaseConfig({
                    url: supaUrlDraft.trim(),
                    anonKey: supaKeyDraft.trim(),
                    enabled: supaEnabledDraft,
                  });
                  setCloudModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-black"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </div>
      )}

      <QrCodeModal isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
};
