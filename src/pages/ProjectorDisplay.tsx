import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Crown,
  Skull,
  Coins,
  Volume2,
  VolumeX,
  Maximize2,
  Lock,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Eye,
  Swords,
  Shield,
  Gavel,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import {
  BLACK_MARKET_ITEMS,
  CURSE_CATALOG,
  DEFAULT_LAST_MAN_PART1_QUESTIONS,
  DEFAULT_LAST_MAN_PART2_QUESTIONS,
  TEAM_ORDER,
  getActiveTeamIds,
  getChronoNetTraps,
  getChronoSliderStep,
  getChronoTrapsReceived,
  getSuggestedSafeRange,
  scoreChronoTeam,
} from '../data/initialData';
import { CountdownTimer } from '../components/CountdownTimer';
import { GameStage, TeamId } from '../types/game';

const STAGE_META: Record<GameStage, { badge: string; name: string; color: string }> = {
  LOBBY: {
    badge: 'LOBBY • SOUTH PARK CUTOUT EDITION',
    name: 'THE KRAMPUS EVE - มหากาพย์การเอาชีวิตรอดในคืนคริสต์มาสอีฟ',
    color: 'from-red-900 via-slate-900 to-emerald-950',
  },
  WORLD_MAP: {
    badge: 'KRAMPUS MANSION • WORLD MAP',
    name: 'แผนที่คฤหาสน์ครามปุส (Mansion World Map)',
    color: 'from-amber-950 via-red-950 to-slate-950',
  },
  POLL_MINE: {
    badge: 'GAME 1 • THE DOORS OF DOOM',
    name: 'THE DOORS OF DOOM',
    color: 'from-amber-900/80 via-red-950 to-slate-950',
  },
  TIMEJINX: {
    badge: 'GAME 2 • THE CHRONO CRUSH',
    name: 'THE CHRONO CRUSH (กงล้อกาลเวลาของครามปุส)',
    color: 'from-emerald-950 via-slate-900 to-amber-950',
  },
  QUIXORT: {
    badge: 'GAME 3 • THE TOY FACTORY CHAOS',
    name: 'THE TOY FACTORY CHAOS (สายพานคัดแยกของเล่นผีสิง)',
    color: 'from-purple-950 via-red-950 to-slate-950',
  },
  TRIVIA_MURDER: {
    badge: 'GAME 4 • THE LAST MAN STANDING',
    name: 'THE LAST MAN STANDING (ลานประหารคริสต์มาส)',
    color: 'from-red-950 via-black to-red-950',
  },
  FINALE: {
    badge: 'JUDGMENT NIGHT • FINALE',
    name: 'คำพิพากษาแห่งครามปุส (Nice vs Naughty List)',
    color: 'from-amber-900 via-red-950 to-black',
  },
};

export const ProjectorDisplay: React.FC = () => {
  const { state, toggleSound, setShowLeaderboardOverlay, setGameStage } = useGame();
  const {
    round,
    teams,
    submissions,
    buzzerQueue,
    showLeaderboardOverlay,
    krampusAlertMessage,
  } = state;

  // Sorted leaderboard (Rank 1 to 4 by Holy Coins, tie-break by Nice Shields)
  const sortedTeams = useMemo(() => {
    return TEAM_ORDER.map((id) => teams[id]).sort((a, b) => {
      if (b.coins !== a.coins) return b.coins - a.coins;
      return b.shields - a.shields;
    });
  }, [teams]);

  // Trigger confetti on Finale or Leaderboard ceremony
  useEffect(() => {
    if (showLeaderboardOverlay || round.gameStage === 'FINALE') {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#eab308', '#facc15', '#dc2626', '#15803d'],
      });
    }
  }, [showLeaderboardOverlay, round.gameStage]);

  // Game 3 ("THE TOY FACTORY CHAOS") live timer & Shuffle siren
  const [toyNowMs, setToyNowMs] = useState<number>(() => Date.now());
  const isToyFactoryDisplay = round.gameStage === 'QUIXORT' && Boolean(round.toyFactory);
  useEffect(() => {
    if (!isToyFactoryDisplay) return;
    setToyNowMs(Date.now());
    const id = setInterval(() => setToyNowMs(Date.now()), 200);
    return () => clearInterval(id);
  }, [isToyFactoryDisplay]);

  useEffect(() => {
    if (round.gameStage !== 'QUIXORT' || round.toyFactory?.phase !== 'SHUFFLE_BUFFER_10S') {
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(920, ctx.currentTime + 0.18);
      osc.frequency.linearRampToValueAtTime(540, ctx.currentTime + 0.36);
      osc.frequency.linearRampToValueAtTime(880, ctx.currentTime + 0.54);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.65);
      setTimeout(() => ctx.close().catch(() => {}), 800);
    } catch {
      // ignore audio autoplay restrictions
    }
  }, [round.gameStage, round.toyFactory?.phase, round.toyFactory?.bufferEndsAt]);

  // Mode B (Timejinx) submission speed ranking + closest year calculation
  const timejinxRanking = useMemo(() => {
    const list = TEAM_ORDER.filter((tid) => submissions[tid] !== undefined).map((tid) => {
      const sub = submissions[tid]!;
      const year = Number(sub.value) || 0;
      const diff = Math.abs(year - round.targetYear);
      return {
        teamId: tid,
        year,
        diff,
        elapsedMs: sub.elapsedMs,
        submittedAt: sub.submittedAt,
      };
    });

    const bySpeed = [...list].sort((a, b) => a.submittedAt - b.submittedAt);
    const speedRankMap: Partial<Record<TeamId, number>> = {};
    bySpeed.forEach((item, idx) => {
      speedRankMap[item.teamId] = idx + 1;
    });

    const byAccuracy = [...list].sort((a, b) => {
      if (a.diff !== b.diff) return a.diff - b.diff;
      return a.elapsedMs - b.elapsedMs;
    });
    const bestTeamId = byAccuracy[0]?.teamId || null;

    return { speedRankMap, bestTeamId };
  }, [submissions, round.targetYear]);

  // Mode D (Unique Number 1-10) analysis
  const uniqueNumberAnalysis = useMemo(() => {
    const counts: Record<string, number> = {};
    TEAM_ORDER.forEach((tid) => {
      const v = submissions[tid]?.value;
      if (v !== undefined && v !== '') {
        counts[String(v)] = (counts[String(v)] || 0) + 1;
      }
    });

    const uniqueTeams = TEAM_ORDER.filter((tid) => {
      const v = submissions[tid]?.value;
      return v !== undefined && counts[String(v)] === 1;
    }).map((tid) => ({
      teamId: tid,
      num: Number(submissions[tid]!.value),
    }));

    uniqueTeams.sort((a, b) =>
      round.uniqueRule === 'HIGHEST' ? b.num - a.num : a.num - b.num
    );

    return {
      counts,
      winnerTeamId: uniqueTeams[0]?.teamId || null,
    };
  }, [submissions, round.uniqueRule]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const stageInfo = STAGE_META[round.gameStage] || STAGE_META.POLL_MINE;
  const latestTx = state.transactions[0];
  const isEightDoorsGame = round.gameStage === 'POLL_MINE' && round.inputMode === 'MODE_A_CHOICE';
  const subRound = round.eightDoorsSubRound || 'SUB1_SURVIVAL';

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#070a12] text-slate-100 relative overflow-hidden select-none">
      {/* Atmospheric Dark Christmas Background Effects */}
      <div
        className={`pointer-events-none fixed inset-0 bg-gradient-to-br ${stageInfo.color} opacity-50 transition-colors duration-700`}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(220, 38, 38, 0.35), transparent 45%), radial-gradient(circle at 80% 15%, rgba(234, 179, 8, 0.25), transparent 40%), radial-gradient(circle at 50% 85%, rgba(21, 128, 61, 0.3), transparent 50%)',
        }}
      />

      {/* Krampus Emergency / Curse Alert Banner */}
      {krampusAlertMessage && (
        <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-6 animate-bounce">
          <div className="max-w-4xl w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-red-950 via-red-700 to-red-950 border-2 border-amber-400 shadow-[0_0_60px_rgba(220,38,38,0.9)] flex items-center justify-center gap-4 text-center">
            <Skull className="w-10 h-10 text-amber-300 shrink-0 animate-pulse" />
            <span className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
              {krampusAlertMessage}
            </span>
            <Skull className="w-10 h-10 text-amber-300 shrink-0 animate-pulse" />
          </div>
        </div>
      )}

      {/* ============================================================
          1. TOP HEADER BAR (Projector - Clean View)
      ============================================================ */}
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-6 py-4 bg-slate-950/85 border-b-2 border-red-900/60 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-700 via-red-900 to-slate-950 border-2 border-amber-400/80 shadow-[0_0_25px_rgba(220,38,38,0.5)] flex items-center justify-center text-3xl">
            👹
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-red-900/90 border border-amber-500/50 text-amber-300 font-mono text-xs md:text-sm font-extrabold tracking-widest uppercase">
                {stageInfo.badge}
              </span>
              {isEightDoorsGame ? (
                <span className="px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-200 font-mono text-xs md:text-sm font-extrabold">
                  {subRound === 'SUB1_SURVIVAL' && 'ด่านย่อยที่ 1 • ค้นหาอันดับ 1-3'}
                  {subRound === 'SUB2_AUCTION' &&
                    `ด่านย่อยที่ 2.${round.auctionIteration || 1} • ประมูลชิงสิทธิ์`}
                  {subRound === 'SUB2_DOOR_AND_BET' &&
                    `ด่านย่อยที่ 2.${round.auctionIteration || 1} • เปิดประตู & แทงข้าง (อันดับ 2-4)`}
                  {subRound === 'SUB3_POLARITY' && 'ด่านย่อยที่ 3 • วัดใจขั้วตรงข้าม (#1 & #8)'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-200 font-mono text-xs md:text-sm font-bold">
                  {round.inputMode === 'MODE_A_CHOICE' && `Mode A • ${round.choiceCount} Choices`}
                  {round.inputMode === 'MODE_B_YEAR' && 'Mode B • Timejinx Year'}
                  {round.inputMode === 'MODE_C_BUZZER' && 'Mode C • Speed Buzzer'}
                  {round.inputMode === 'MODE_D_SECRET' && 'Mode D • Secret / Wager'}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-0.5">
              {round.title || stageInfo.name}
            </h1>
          </div>
        </div>

        {/* Center Countdown Timer (Hidden in LOBBY & WORLD_MAP) */}
        {round.gameStage !== 'LOBBY' && round.gameStage !== 'WORLD_MAP' && (
          <div className="flex items-center gap-6">
            <CountdownTimer size="lg" autoLockOnZero={true} />
          </div>
        )}

        {/* Minimalist Projector Controls (Leaderboard & QR moved to /admin) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            title={state.soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
          >
            {state.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-red-400" />
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 transition"
            title="เต็มจอ (Fullscreen)"
          >
            <Maximize2 className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      </header>

      {/* ============================================================
          2. MAIN STAGE CONTENT
      ============================================================ */}
      <main className="relative z-10 flex-1 flex flex-col justify-between px-6 lg:px-10 py-4 max-w-[1800px] w-full mx-auto gap-4">
        {/* ==========================================================
            STAGE 0.1: LOBBY VIEW (2D Paper Cutout South Park Style, 2x2 Team Cards, NO QR Code)
        ========================================================== */}
        {round.gameStage === 'LOBBY' && (
          <div className="flex-1 flex flex-col justify-between gap-5 py-1">
            {/* South Park 2D Cutout Title Banner */}
            <div className="relative rounded-3xl bg-[#b91c1c] border-4 border-black shadow-[10px_10px_0px_#000000] px-6 py-5 text-center overflow-hidden">
              {/* Construction paper snow & pine tree cutouts */}
              <div className="pointer-events-none absolute -bottom-3 left-6 text-5xl opacity-90 drop-shadow-[3px_3px_0px_#000] select-none">
                🎄⛄🎄
              </div>
              <div className="pointer-events-none absolute -bottom-3 right-6 text-5xl opacity-90 drop-shadow-[3px_3px_0px_#000] select-none">
                🎄🐐🎄
              </div>

              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-xl bg-[#facc15] text-black border-[3px] border-black shadow-[4px_4px_0px_#000] font-black text-xs md:text-sm uppercase tracking-wider -rotate-1 mb-2">
                  <span>✂️ 2D PAPER CUTOUT SURVIVAL PARTY • คืนคริสต์มาสปีศาจ</span>
                </div>

                <h2
                  className="text-2xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight"
                  style={{ textShadow: '4px 4px 0px #000000' }}
                >
                  THE KRAMPUS EVE - มหากาพย์การเอาชีวิตรอดในคืนคริสต์มาสอีฟ
                </h2>

                <p className="mt-2 text-base md:text-xl font-extrabold text-[#fef08a] drop-shadow-[2px_2px_0px_#000]">
                  Sub-GM ประจำกลุ่มลงทะเบียนชื่อทีมผ่านสมาร์ตโฟน • เมื่อครบแล้ว GM ใหญ่จะเปิดประตูสู่คฤหาสน์!
                </p>
              </div>
            </div>

            {/* Center 2x2 Team Cards Grid (South Park 2D Paper Cutout Style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl w-full mx-auto my-auto flex-1 items-stretch">
              {TEAM_ORDER.map((tid, idx) => {
                const team = teams[tid];
                const isRegistered = Boolean(team.isRegistered);

                // South Park construction-paper color palettes per slot
                const paperThemes = [
                  {
                    bg: 'bg-[#dc2626]',
                    hat: '#991b1b',
                    trim: '#fde047',
                    coat: '#b91c1c',
                    tilt: '-rotate-[0.5deg]',
                  },
                  {
                    bg: 'bg-[#15803d]',
                    hat: '#166534',
                    trim: '#f97316',
                    coat: '#14532d',
                    tilt: 'rotate-[0.5deg]',
                  },
                  {
                    bg: 'bg-[#d97706]',
                    hat: '#92400e',
                    trim: '#fef08a',
                    coat: '#b45309',
                    tilt: 'rotate-[0.5deg]',
                  },
                  {
                    bg: 'bg-[#0284c7]',
                    hat: '#075985',
                    trim: '#f43f5e',
                    coat: '#0369a1',
                    tilt: '-rotate-[0.5deg]',
                  },
                ];
                const theme = paperThemes[idx] || paperThemes[0];

                return (
                  <div
                    key={tid}
                    className={`relative rounded-3xl p-6 border-4 border-black transition-all duration-500 flex flex-col justify-between ${
                      isRegistered
                        ? `${theme.bg} ${theme.tilt} shadow-[10px_10px_0px_#000000] scale-[1.01]`
                        : 'bg-[#1e293b] border-dashed border-slate-950 shadow-[8px_8px_0px_#000000] opacity-90'
                    }`}
                  >
                    {/* Top Slot Sticker Tag + Status Pill */}
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`px-4 py-1 rounded-xl border-[3px] border-black font-mono font-black text-sm md:text-base shadow-[3px_3px_0px_#000] ${
                          isRegistered ? 'bg-[#facc15] text-black' : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        TEAM {team.number} SLOT
                      </span>

                      {isRegistered ? (
                        <span className="px-4 py-1.5 rounded-xl bg-[#22c55e] text-black border-[3px] border-black shadow-[4px_4px_0px_#000] font-black text-base md:text-lg flex items-center gap-1.5 animate-bounce">
                          <CheckCircle2 className="w-5 h-5 stroke-[3]" />
                          <span>พร้อมลุย!</span>
                        </span>
                      ) : (
                        <span className="px-4 py-1.5 rounded-xl bg-slate-900 text-amber-300 border-[3px] border-black shadow-[3px_3px_0px_#000] font-extrabold text-sm md:text-base flex items-center gap-2">
                          <Clock className="w-4 h-4 animate-spin text-amber-400" />
                          <span>รอ Sub-GM...</span>
                        </span>
                      )}
                    </div>

                    {/* Center Cutout Character & Team Identity */}
                    {!isRegistered ? (
                      <div className="my-auto py-5 flex items-center gap-5 px-3">
                        {/* Unregistered South Park Cutout Silhouette */}
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-slate-900 border-4 border-black shadow-[5px_5px_0px_#000] flex items-center justify-center shrink-0 relative">
                          <svg viewBox="0 0 100 100" className="w-20 h-20">
                            {/* Parka Hood Cutout */}
                            <circle
                              cx="50"
                              cy="42"
                              r="26"
                              fill="#334155"
                              stroke="#000"
                              strokeWidth="4"
                            />
                            <circle
                              cx="50"
                              cy="42"
                              r="17"
                              fill="#0f172a"
                              stroke="#000"
                              strokeWidth="3"
                            />
                            {/* Quirky tilted cartoon eyes */}
                            <ellipse
                              cx="44"
                              cy="41"
                              rx="5"
                              ry="6.5"
                              fill="#cbd5e1"
                              stroke="#000"
                              strokeWidth="2"
                            />
                            <ellipse
                              cx="56"
                              cy="41"
                              rx="5"
                              ry="6.5"
                              fill="#cbd5e1"
                              stroke="#000"
                              strokeWidth="2"
                            />
                            <circle cx="45" cy="41" r="2" fill="#000" />
                            <circle cx="55" cy="41" r="2" fill="#000" />
                            {/* Body */}
                            <path
                              d="M24 88 C24 66, 76 66, 76 88 Z"
                              fill="#1e293b"
                              stroke="#000"
                              strokeWidth="4"
                            />
                          </svg>
                          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-amber-400 text-black font-black text-xs border-2 border-black">
                            ?
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className="text-2xl md:text-3xl font-black text-slate-200 tracking-wide animate-pulse"
                            style={{ textShadow: '3px 3px 0px #000000' }}
                          >
                            กำลังค้นหาทีม...
                          </div>
                          <p className="text-sm md:text-base font-bold text-slate-400 mt-1">
                            รอ Sub-GM ประจำกลุ่มที่ {team.number} ตั้งชื่อทีมและกดยืนยันจากมือถือ
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="my-auto py-4 flex items-center gap-5 px-2">
                        {/* Registered South Park 2D Paper Cutout Avatar + Team Icon */}
                        <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-[#fef9c3] border-4 border-black shadow-[6px_6px_0px_#000] flex items-center justify-center shrink-0 relative">
                          <svg viewBox="0 0 100 100" className="w-22 h-22">
                            {/* Coat */}
                            <path
                              d="M20 92 C20 65, 80 65, 80 92 Z"
                              fill={theme.coat}
                              stroke="#000"
                              strokeWidth="4"
                            />
                            {/* Head (construction paper peach) */}
                            <circle
                              cx="50"
                              cy="46"
                              r="23"
                              fill="#fde68a"
                              stroke="#000"
                              strokeWidth="4"
                            />
                            {/* South Park Beanie Hat */}
                            <path
                              d="M27 38 C28 16, 72 16, 73 38 Z"
                              fill={theme.hat}
                              stroke="#000"
                              strokeWidth="4"
                            />
                            <rect
                              x="25"
                              y="33"
                              width="50"
                              height="8"
                              rx="3"
                              fill={theme.trim}
                              stroke="#000"
                              strokeWidth="3.5"
                            />
                            <circle
                              cx="50"
                              cy="16"
                              r="6"
                              fill={theme.trim}
                              stroke="#000"
                              strokeWidth="3"
                            />
                            {/* Oversized South Park Eyes */}
                            <ellipse
                              cx="43"
                              cy="46"
                              rx="6"
                              ry="7.5"
                              fill="#ffffff"
                              stroke="#000"
                              strokeWidth="2.5"
                            />
                            <ellipse
                              cx="57"
                              cy="46"
                              rx="6"
                              ry="7.5"
                              fill="#ffffff"
                              stroke="#000"
                              strokeWidth="2.5"
                            />
                            <circle cx="44" cy="46" r="2.3" fill="#000" />
                            <circle cx="56" cy="46" r="2.3" fill="#000" />
                            {/* Cheeky Cutout Mouth */}
                            <path
                              d="M42 58 L58 57 L54 63 L45 63 Z"
                              fill="#000"
                            />
                          </svg>
                          {/* Floating Team Emoji Sticker */}
                          <span className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl bg-white border-[3px] border-black shadow-[3px_3px_0px_#000] flex items-center justify-center text-2xl">
                            {team.icon}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="inline-block px-2.5 py-0.5 rounded-lg bg-black/40 border border-black text-amber-200 font-mono text-xs font-extrabold mb-1">
                            ลงทะเบียนสำเร็จ • Sub-GM Team {team.number}
                          </div>
                          <div
                            className="text-2xl md:text-4xl font-black text-white leading-tight break-words"
                            style={{ textShadow: '3px 3px 0px #000000' }}
                          >
                            {team.name}
                          </div>
                          <div className="text-sm md:text-base font-extrabold text-amber-100 mt-1 truncate">
                            “{team.motto}”
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom Survival Starter Pack Strip */}
                    <div className="pt-3 border-t-[3px] border-black/60 flex items-center justify-between text-xs md:text-sm font-mono font-extrabold">
                      <span className="px-3 py-1 rounded-xl bg-black/50 text-amber-300 border-2 border-black">
                        ทุนเริ่มต้น: {team.coins.toLocaleString()} 🪙
                      </span>
                      <span className="px-3 py-1 rounded-xl bg-black/50 text-white border-2 border-black">
                        เกราะเด็กดี: {'🛡️'.repeat(team.shields)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================================
            STAGE 0.2: MANSION WORLD MAP VIEW (Locked Room & 4 Haunted Rooms)
        ========================================================== */}
        {round.gameStage === 'WORLD_MAP' && (
          <div className="flex-1 flex flex-col justify-between gap-5 py-1">
            <div className="rounded-3xl bg-gradient-to-r from-[#7f1d1d] via-[#450a0a] to-[#7f1d1d] border-4 border-black shadow-[10px_10px_0px_#000] p-5 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-xl bg-[#22c55e] text-black border-[3px] border-black shadow-[3px_3px_0px_#000] font-black text-xs md:text-sm uppercase mb-2">
                <Lock className="w-4 h-4 stroke-[3]" />
                <span>ROOM LOCKED • ประตูคฤหาสน์ครามปุสปิดตายแล้ว!</span>
              </div>
              <h2
                className="text-3xl md:text-5xl font-black text-white"
                style={{ textShadow: '4px 4px 0px #000000' }}
              >
                🏰 แผนที่คฤหาสน์ครามปุส (MANSION WORLD MAP)
              </h2>
              <p className="text-base md:text-xl font-bold text-amber-200 mt-1">
                ทั้ง 4 ทีมต้องเผชิญหน้ากับ 4 ห้องมรณะ เพื่อรักษาเหรียญศักดิ์สิทธิ์ 🪙 และเกราะเด็กดี 🛡️
              </p>
            </div>

            {/* 2x2 Mansion Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-6xl w-full mx-auto my-auto flex-1">
              {[
                {
                  stage: 'POLL_MINE' as GameStage,
                  roomNo: 'ROOM 1',
                  icon: '🚪',
                  title: 'THE DOORS OF DOOM',
                  thaiTitle: 'THE DOORS OF DOOM',
                  desc: 'เปิดประตูโพล 3 ด่านย่อย: Snake Draft 2 บาน, ประมูลแทงข้าง (+700 ฿) และวัดใจขั้วตรงข้าม #1 & #N',
                  bg: 'bg-[#b45309]',
                },
                {
                  stage: 'TIMEJINX' as GameStage,
                  roomNo: 'ROOM 2',
                  icon: '⏳',
                  title: 'THE CHRONO CRUSH',
                  thaiTitle: 'กงล้อกาลเวลาของครามปุส',
                  desc: '3 ด่านย่อยทายปี (ค.ศ./พ.ศ.): หยุดเข็มนาฬิกา, วางกับดักเวลา (Step 5/10 ปี • ฝ่าได้ x2) และสงครามแย่งปี Realtime!',
                  bg: 'bg-[#047857]',
                },
                {
                  stage: 'QUIXORT' as GameStage,
                  roomNo: 'ROOM 3',
                  icon: '⚙️',
                  title: 'THE TOY FACTORY CHAOS',
                  thaiTitle: 'สายพานคัดแยกของเล่นผีสิง',
                  desc: '4 รอบสลับคู่ Sorting vs Data-Holding: ถาม-ตอบหน้าเวที หนีปุ่ม SHUFFLE! ป่วนสายพาน และลุ้นเปิดกล่องความลับ ???',
                  bg: 'bg-[#6d28d9]',
                },
                {
                  stage: 'TRIVIA_MURDER' as GameStage,
                  roomNo: 'ROOM 4',
                  icon: '💀',
                  title: 'THE LAST MAN STANDING',
                  thaiTitle: 'ลานประหารคริสต์มาส (ตัดสินแชมป์)',
                  desc: 'เอาชีวิตรอด 4 รอบ + ตลาดมืดละลายทรัพย์ + มินิเกมลานประหาร แล้ววิ่งขึ้นบันไดหนีตาย 25 ขั้นหนี Krampus เพื่อคว้าแชมป์!',
                  bg: 'bg-[#be123c]',
                },
              ].map((room) => (
                <button
                  key={room.stage}
                  onClick={() => setGameStage(room.stage, true)}
                  className={`text-left rounded-3xl p-6 ${room.bg} border-4 border-black shadow-[8px_8px_0px_#000] hover:scale-[1.01] transition flex items-start gap-5`}
                >
                  <div className="w-20 h-20 rounded-2xl bg-[#fef08a] border-4 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-4xl shrink-0">
                    {room.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="inline-block px-3 py-0.5 rounded-lg bg-black text-amber-300 font-mono font-black text-xs mb-1">
                      {room.roomNo} • {room.title}
                    </div>
                    <h3
                      className="text-2xl md:text-3xl font-black text-white"
                      style={{ textShadow: '3px 3px 0px #000' }}
                    >
                      {room.thaiTitle}
                    </h3>
                    <p className="text-sm md:text-base font-bold text-amber-100 mt-1 leading-snug">
                      {room.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* World Map Bottom Team Status Bar: Only Team Name, Icon & Aligned ฿ Balance (No Shields) */}
            <div className="max-w-6xl w-full mx-auto mt-4 rounded-2xl bg-slate-950/90 border-2 border-amber-500/50 p-3 shadow-xl">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {TEAM_ORDER.map((tid) => {
                  const t = teams[tid];
                  return (
                    <div
                      key={tid}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{t.icon}</span>
                        <span className="font-extrabold text-sm text-white truncate">{t.name}</span>
                      </div>
                      <span className="font-mono font-black text-lg text-amber-300 tabular-nums text-right shrink-0">
                        {t.coins.toLocaleString()} ฿
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==========================================================
            ACTIVE GAME STAGES (POLL_MINE, TIMEJINX, QUIXORT, TRIVIA_MURDER)
        ========================================================== */}
        {round.gameStage !== 'LOBBY' && round.gameStage !== 'WORLD_MAP' && (
          <>
        {/* Question Banner (High Contrast & Large Subtitle for Projector Readability) */}
        <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-2 border-amber-500/50 shadow-[0_10px_40px_rgba(0,0,0,0.7)] p-5 md:p-6 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-red-950/95 border border-amber-400/60 text-amber-200 text-base md:text-xl font-extrabold mb-2 shadow">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0" />
            <span>{round.subtitle}</span>
          </div>
          <h2 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight">
            {round.questionText}
          </h2>
        </div>

        {/* ==========================================================
            GAME 1 SPECIAL: THE DOORS OF DOOM (8-12 Doors Board + 3 Sub-Rounds)
        ========================================================== */}
        {isEightDoorsGame && (() => {
          const suggested = getSuggestedSafeRange(round.choiceCount, subRound);
          const safeMin = round.safeRankMin ?? suggested.min;
          const safeMax = round.safeRankMax ?? suggested.max;
          const snakeOrder = round.snakeDraftOrder || [];
          const snakeIdx = round.snakeDraftIndex ?? 0;
          const currentTurnTid =
            subRound === 'SUB1_SURVIVAL' && round.status === 'ACTIVE' && snakeIdx < snakeOrder.length
              ? snakeOrder[snakeIdx]
              : null;

          // Live Auction Leader
          let liveTopBid = 0;
          let liveTopTid: TeamId | null = null;
          if (subRound === 'SUB2_AUCTION') {
            for (const tid of TEAM_ORDER) {
              const bid = Number(submissions[tid]?.value) || 0;
              if (bid > liveTopBid) {
                liveTopBid = bid;
                liveTopTid = tid;
              }
            }
          }

          return (
          <div className="flex-1 flex flex-col justify-between gap-4">
            {/* Live Sub-Round Status Banner (Snake Draft Turn / Auction Live Leader) */}
            {subRound === 'SUB1_SURVIVAL' && snakeOrder.length > 0 && (
              <div className="rounded-2xl bg-slate-900/95 border-2 border-amber-400/70 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono font-black text-xs">
                    SNAKE DRAFT • คิว {Math.min(snakeIdx + 1, snakeOrder.length)}/{snakeOrder.length}
                  </span>
                  {currentTurnTid ? (
                    <span className="text-base md:text-lg font-black text-white">
                      🎯 ตาของทีม: <span className="text-amber-300">{teams[currentTurnTid].icon} {teams[currentTurnTid].name}</span>
                    </span>
                  ) : (
                    <span className="text-base md:text-lg font-black text-emerald-300">
                      ✅ จบรอบ Snake Draft แล้ว!
                    </span>
                  )}
                </div>
                <div className="text-xs md:text-sm font-bold text-slate-300">
                  โซนปลอดภัย: อันดับ <span className="text-emerald-300 font-black">#{safeMin} – #{safeMax}</span>
                </div>
              </div>
            )}

            {subRound === 'SUB2_AUCTION' && (
              <div className="rounded-2xl bg-amber-950/70 border-2 border-amber-400 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <Gavel className="w-5 h-5 text-amber-300 shrink-0" />
                  <span className="text-base md:text-lg font-black text-white">
                    {liveTopTid
                      ? `👑 ผู้นำประมูลล่าสุด: ${teams[liveTopTid].icon} ${teams[liveTopTid].name} (${liveTopBid.toLocaleString()} ฿)`
                      : '⏳ ยังไม่มีทีมใดเสนอราคาประมูล (ระวัง Coward\'s Tax -100 ฿!)'}
                  </span>
                </div>
                <div className="text-xs md:text-sm font-bold text-amber-200">
                  เป้าหมายโซนปลอดภัย: อันดับ <span className="text-emerald-300 font-black">#{safeMin} – #{safeMax}</span> (+700 ฿)
                </div>
              </div>
            )}

            {/* Persistent 8-12 Door Board */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {round.choices.slice(0, round.choiceCount).map((choice) => {
                const isOpened = Boolean(choice.isOpened);
                const rank = choice.rank ?? round.choiceCount;
                const isSafe = rank >= safeMin && rank <= safeMax;

                // Color coding when opened: Green = Safe Zone, Red = Danger Zone
                const openedColorClass = isSafe
                  ? 'bg-gradient-to-br from-emerald-950 via-emerald-900/90 to-slate-950 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.45)]'
                  : 'bg-gradient-to-br from-red-950 via-red-900/85 to-slate-950 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]';

                const rankBadgeClass = isSafe
                  ? 'bg-emerald-400 text-slate-950 border-white'
                  : 'bg-red-600 text-white border-red-300';

                // Teams that picked this door in current sub-round
                const teamsWhoPicked =
                  subRound === 'SUB1_SURVIVAL'
                    ? (round.snakeDraftPicks || [])
                        .filter((p) => p.doorKey === choice.key)
                        .map((p) => p.teamId)
                    : round.status === 'REVEALED'
                    ? TEAM_ORDER.filter((tid) => {
                        const sub = submissions[tid];
                        if (!sub) return false;
                        if (subRound === 'SUB2_DOOR_AND_BET') {
                          return (
                            tid === round.auctionWinnerTeamId && String(sub.value) === choice.key
                          );
                        }
                        if (subRound === 'SUB3_POLARITY') {
                          return (
                            String(sub.value) === choice.key ||
                            String(sub.secondaryValue) === choice.key
                          );
                        }
                        return false;
                      })
                    : [];

                return (
                  <div
                    key={choice.key}
                    className={`relative rounded-2xl p-4 md:p-5 border-2 transition-all duration-500 min-h-[124px] flex flex-col justify-between ${
                      isOpened
                        ? openedColorClass
                        : 'bg-slate-900/95 border-slate-700 hover:border-amber-500/60 shadow-lg'
                    }`}
                  >
                    {!isOpened ? (
                      /* Unopened Door State: Big A-L + Large Clear Label */
                      <div className="flex items-center gap-4 my-auto">
                        <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-red-950 text-amber-300 border-2 border-amber-500/60 font-mono font-black text-3xl md:text-4xl flex items-center justify-center shrink-0 shadow-lg">
                          {choice.key}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-mono uppercase tracking-wider text-amber-400/90 font-bold">
                            DOOR {choice.key} • ประตูยังไม่เปิด
                          </div>
                          <div className="text-lg md:text-xl font-extrabold text-white leading-snug mt-0.5">
                            {choice.label}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Opened Door State: Giant Rank #1-#N in Center + Compact Option Label Below */
                      <div className="flex flex-col items-center justify-center text-center my-auto py-1">
                        <div className="w-full flex items-center justify-between text-xs font-mono font-bold mb-1">
                          <span className="px-2 py-0.5 rounded bg-black/50 text-amber-300 border border-white/15">
                            ประตู {choice.key}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-extrabold ${
                              isSafe
                                ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400/50'
                                : 'bg-red-500/30 text-red-200 border border-red-400/50'
                            }`}
                          >
                            {isSafe
                              ? `★ โซนปลอดภัย (#${safeMin}-#${safeMax})`
                              : '💀 โซนอันตราย'}
                          </span>
                        </div>

                        <div
                          className={`px-6 py-1.5 rounded-2xl border-2 font-mono font-black text-4xl md:text-5xl tracking-tight shadow-xl my-1 ${rankBadgeClass}`}
                        >
                          [ #{rank} ]
                        </div>

                        <div className="text-sm md:text-base font-bold text-slate-100 mt-1 line-clamp-1">
                          {choice.label}
                        </div>
                      </div>
                    )}

                    {/* Show which teams picked this door */}
                    {teamsWhoPicked.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-white/15 flex flex-wrap justify-center gap-1.5">
                        {teamsWhoPicked.map((tid, pIdx) => {
                          const t = teams[tid];
                          return (
                            <span
                              key={`${tid}-${pIdx}`}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/70 border border-amber-400 text-xs font-extrabold text-amber-200"
                            >
                              <span>{t.icon}</span>
                              <span>Team {t.number}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 4 Team Status Cards for THE DOORS OF DOOM (Adapts to Sub-Round 1 / 2 / 3) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEAM_ORDER.map((tid) => {
                const team = teams[tid];
                const sub = submissions[tid];
                const hasSubmitted = Boolean(sub);
                const isRevealed = round.status === 'REVEALED';
                const isNaughtyShieldBroken = team.shields <= 0;
                const isLockedInAuction =
                  subRound === 'SUB2_AUCTION' &&
                  round.auctionIteration === 2 &&
                  round.subRound2LockedTeamId === tid;
                const isAuctionWinner =
                  subRound === 'SUB2_DOOR_AND_BET' && round.auctionWinnerTeamId === tid;
                const isCurrentSnakeTurn = currentTurnTid === tid;
                const isLiveAuctionLeader = subRound === 'SUB2_AUCTION' && liveTopTid === tid;
                const teamSnakePicks = (round.snakeDraftPicks || []).filter((p) => p.teamId === tid);

                return (
                  <div
                    key={tid}
                    className={`rounded-2xl p-4 border-2 transition-all duration-300 flex flex-col justify-between ${
                      isAuctionWinner || isCurrentSnakeTurn || isLiveAuctionLeader
                        ? 'bg-gradient-to-b from-amber-950/90 to-slate-950 border-amber-400 shadow-[0_0_25px_rgba(234,179,8,0.45)]'
                        : hasSubmitted
                        ? 'bg-slate-900/95 border-amber-400/80 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    {/* Card Header: Team Name + Shields + Single-line Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{team.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-mono uppercase text-amber-400 font-bold">
                            TEAM {team.number} • {team.coins.toLocaleString()} ฿
                          </div>
                          <div className="font-extrabold text-sm md:text-base text-white truncate">
                            {team.name}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isNaughtyShieldBroken ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold whitespace-nowrap shrink-0">
                            👹 NAUGHTY LIST
                          </span>
                        ) : (
                          <div
                            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-sm whitespace-nowrap shrink-0"
                            title="เกราะเด็กดี (Nice Shields)"
                          >
                            {Array.from({ length: team.shields }).map((_, i) => (
                              <span key={i}>🛡️</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Sub-Round 1: Snake Draft Picks */}
                    {subRound === 'SUB1_SURVIVAL' && (
                      <div className="py-2.5 px-3 rounded-xl bg-black/55 border border-white/15 text-center space-y-1">
                        {isCurrentSnakeTurn ? (
                          <div className="text-amber-300 font-black text-base animate-pulse">
                            🎯 กำลังเลือกประตู...
                          </div>
                        ) : teamSnakePicks.length > 0 ? (
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {teamSnakePicks.map((p, i) => (
                              <span
                                key={i}
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-black ${
                                  p.isSafe
                                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50'
                                    : 'bg-red-500/25 text-red-300 border border-red-400/50'
                                }`}
                              >
                                {p.doorKey} (#{p.rank})
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-slate-400 font-bold text-sm">รอคิว Snake Draft...</div>
                        )}
                      </div>
                    )}

                    {/* Sub-Round 2 Phase 1: Live Auction Bidding */}
                    {subRound === 'SUB2_AUCTION' && (
                      <div className="py-3 px-3 rounded-xl bg-black/50 border border-white/10 text-center">
                        {isLockedInAuction ? (
                          <div className="text-amber-300 font-extrabold text-sm">
                            🔒 ชนะประมูลรอบ 2.1 แล้ว (ล็อกรอบ 2.2)
                          </div>
                        ) : hasSubmitted ? (
                          <div>
                            <div className="text-xs text-slate-300 flex items-center justify-center gap-1">
                              {isLiveAuctionLeader && <span>👑</span>}
                              <span>ยอดบิดปัจจุบัน:</span>
                            </div>
                            <div className="text-3xl font-mono font-black text-amber-300 tabular-nums">
                              {Number(sub!.value).toLocaleString()} ฿
                            </div>
                          </div>
                        ) : (
                          <div className="text-slate-300 font-bold text-base animate-pulse">
                            กำลังตัดสินใจบิด... (0 ฿)
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sub-Round 2 Phase 2: Winner Picks Door & Side Bet */}
                    {subRound === 'SUB2_DOOR_AND_BET' && (
                      <div className="py-2.5 px-3 rounded-xl bg-black/55 border border-white/15 text-center">
                        {isAuctionWinner ? (
                          !isRevealed ? (
                            <div className="text-amber-300 font-extrabold text-sm">
                              {hasSubmitted
                                ? '👑 เลือกประตูแล้ว! รอเปิดพร้อมกัน'
                                : round.cowardFreePick
                                ? '⚠️ สุ่มเปิดฟรี (Coward\'s Tax • ได้ 0 ฿)...'
                                : `👑 ชนะประมูล (${round.auctionWinningBid} ฿) • กำลังเลือกประตู...`}
                            </div>
                          ) : (
                            <div className="text-amber-300 font-extrabold text-lg">
                              👑 เปิดประตู [ {String(sub?.value || round.lastOpenedDoorKey || '?')} ]
                            </div>
                          )
                        ) : !isRevealed ? (
                          <div className="text-slate-200 font-bold text-base">
                            {hasSubmitted ? '✓ ล็อกคำทายแทงข้างแล้ว!' : 'กำลังแทงข้าง (รอด / พัง)...'}
                          </div>
                        ) : hasSubmitted ? (
                          <div className="flex items-center justify-between px-2">
                            <span className="text-xs text-slate-300 font-bold">แทงข้าง:</span>
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-black ${
                                String(sub!.value) === 'SAFE'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-red-600 text-white'
                              }`}
                            >
                              {String(sub!.value) === 'SAFE'
                                ? '🛡️ ทายว่ารอด (ถูก)'
                                : '💀 ทายว่าพัง (ผิด)'}
                            </span>
                          </div>
                        ) : (
                          <div className="text-red-400 font-bold">ไม่ได้แทงข้าง</div>
                        )}
                      </div>
                    )}

                    {/* Sub-Round 3: Polarity (#1 & #N Dual Selection) */}
                    {subRound === 'SUB3_POLARITY' && (
                      <div className="py-2.5 px-3 rounded-xl bg-black/55 border border-white/15 text-center">
                        {!isRevealed ? (
                          hasSubmitted ? (
                            <div className="flex items-center justify-center gap-2 text-emerald-300 font-extrabold text-lg">
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                              <span>ล็อก 2 ประตู (#1 & #{round.choiceCount}) แล้ว!</span>
                            </div>
                          ) : (
                            <div className="text-slate-200 font-bold text-base animate-pulse">
                              กำลังเลือกประตู #1 และ #{round.choiceCount}...
                            </div>
                          )
                        ) : hasSubmitted ? (
                          <div className="flex items-center justify-around gap-2">
                            <div className="px-3 py-1 rounded-xl bg-emerald-950 border border-emerald-400">
                              <div className="text-[11px] text-emerald-300 font-bold">ทาย #1</div>
                              <div className="text-2xl font-mono font-black text-white">
                                {String(sub!.value)}
                              </div>
                            </div>
                            <div className="px-3 py-1 rounded-xl bg-red-950 border border-red-400">
                              <div className="text-[11px] text-red-300 font-bold">
                                ทาย #{round.choiceCount}
                              </div>
                              <div className="text-2xl font-mono font-black text-white">
                                {String(sub!.secondaryValue || '?')}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-red-400 font-bold py-1">ไม่ได้ส่งคำตอบ!</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
            const active = getActiveTeamIds(teams);
            const p1List = state.lastManPart1Questions || DEFAULT_LAST_MAN_PART1_QUESTIONS;
            const p2List = state.lastManPart2Questions || DEFAULT_LAST_MAN_PART2_QUESTIONS;
            const p1Q = p1List[(lms.part1Round - 1) % p1List.length];
            const p2Q = p2List[lms.part2QuestionIndex % p2List.length];
            const isPart2 = lms.phase.startsWith('PART2_') || lms.phase === 'CHAMPION';

            return (
              <div className="flex-1 flex flex-col justify-between gap-4">
                {/* Part 1 Top Status Strip: Safe Zone vs Killing Floor */}
                {!isPart2 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {active.map((tid) => {
                      const ts = lms.teamStates[tid];
                      const t = teams[tid];
                      const curse = ts.activeCurse ? CURSE_CATALOG[ts.activeCurse] : null;
                      return (
                        <div
                          key={tid}
                          className={`rounded-2xl p-3 border-4 border-black shadow-[4px_4px_0px_#000] transition-all ${
                            ts.isGhost
                              ? 'bg-slate-900/80 opacity-75'
                              : ts.inKillingFloor
                              ? 'bg-red-950/90 border-red-500'
                              : 'bg-emerald-950/80 border-emerald-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-base text-white truncate">
                              {t.icon} {t.name}
                            </span>
                            <span className="font-mono text-xs font-black text-amber-300">
                              {t.coins.toLocaleString()} ฿
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-black">
                            <span className="px-2 py-0.5 rounded bg-black/60 text-rose-300">
                              {ts.isGhost ? '👻 วิญญาณ' : `❤️ ${ts.hearts}/4`}
                            </span>
                            {!ts.isGhost && (
                              <span
                                className={`px-2 py-0.5 rounded ${
                                  ts.inKillingFloor
                                    ? 'bg-red-600 text-white'
                                    : 'bg-emerald-600 text-black'
                                }`}
                              >
                                {ts.inKillingFloor ? '💀 ลานประหาร' : '🛡️ โซนปลอดภัย'}
                              </span>
                            )}
                            {ts.mirrorShield && (
                              <span className="px-2 py-0.5 rounded bg-cyan-500 text-black">
                                🪞 โล่
                              </span>
                            )}
                            {ts.jetpacks > 0 && (
                              <span className="px-2 py-0.5 rounded bg-amber-400 text-black">
                                🚀 x{ts.jetpacks}
                              </span>
                            )}
                          </div>
                          {curse && (
                            <div className="mt-1.5 text-[11px] font-black text-yellow-300 bg-purple-950/90 rounded px-2 py-0.5 truncate">
                              {curse.icon} คำสาป: {curse.name}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* KRAMPUS_TWIST */}
                {lms.phase === 'KRAMPUS_TWIST' && (
                  <div className="flex-1 rounded-3xl bg-gradient-to-br from-rose-950 via-black to-slate-950 border-4 border-rose-500 p-8 flex flex-col items-center justify-center text-center gap-4">
                    <div className="text-7xl animate-bounce">👹</div>
                    <h2 className="text-4xl md:text-5xl font-black text-amber-300">
                      ประกาศหักมุมจาก KRAMPUS!
                    </h2>
                    <p className="text-xl md:text-2xl font-bold text-white max-w-3xl leading-relaxed">
                      &ldquo;เงิน Holy Coins (฿) ที่สะสมมาไม่ใช่คะแนนตัดสินแชมป์อีกต่อไป! แต่มันคือ{' '}
                      <span className="text-rose-400 font-black">กระสุนในตลาดมืดและแต้มต่อ</span>{' '}
                      ใครวิ่งทะลุประตูบันไดหนีตาย 25 ขั้นได้เป็นทีมแรก ชนะเลิศทั้งค่ายทันที!&rdquo;
                    </p>
                  </div>
                )}

                {/* PART1_TRIVIA / PART1_TRIVIA_REVEAL / PART1_MISERY_PULL */}
                {(lms.phase === 'PART1_TRIVIA' ||
                  lms.phase === 'PART1_TRIVIA_REVEAL' ||
                  lms.phase === 'PART1_MISERY_PULL') && (
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    {lms.phase === 'PART1_MISERY_PULL' && (
                      <div className="rounded-2xl bg-red-600 border-4 border-yellow-300 p-4 text-center animate-pulse">
                        <div className="text-2xl font-black text-white">
                          😈 ลากเพื่อนตกนรก! {teams[lms.miseryPullTeamId || 'team1']?.name} ตอบผิดทีมเดียว — เลือกดึง 1 ทีมที่รอดลงลานประหารภายใน 10 วิ!
                        </div>
                      </div>
                    )}

                    <div className="rounded-3xl bg-slate-900/95 border-4 border-black p-5 text-center space-y-3">
                      {p1Q.imageUrl && (
                        <img
                          src={p1Q.imageUrl}
                          alt="Trivia"
                          className="max-h-48 mx-auto rounded-2xl border-2 border-slate-700 object-contain"
                        />
                      )}
                      <div className="text-2xl md:text-3xl font-black text-white">
                        {p1Q.questionText}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {p1Q.choices.map((c) => {
                        const isRev = lms.phase !== 'PART1_TRIVIA';
                        const isCorrect = c.key === p1Q.correctKey;
                        const pickers = active.filter(
                          (tid) => String(submissions[tid]?.value || '') === c.key
                        );
                        return (
                          <div
                            key={c.key}
                            className={`rounded-2xl p-4 border-4 transition-all flex items-center justify-between gap-3 ${
                              isRev
                                ? isCorrect
                                  ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                                  : 'bg-red-950/50 border-slate-800 opacity-75'
                                : 'bg-slate-900 border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-10 h-10 rounded-xl font-black text-xl flex items-center justify-center ${
                                  isRev && isCorrect
                                    ? 'bg-emerald-400 text-black'
                                    : 'bg-amber-400 text-black'
                                }`}
                              >
                                {c.key}
                              </span>
                              <span className="text-lg font-black text-white">{c.label}</span>
                            </div>
                            {isRev && pickers.length > 0 && (
                              <div className="flex gap-1">
                                {pickers.map((tid) => (
                                  <span
                                    key={tid}
                                    className="px-2 py-1 rounded-lg bg-black/70 text-sm font-black text-white"
                                  >
                                    {teams[tid].icon}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PART1_BLACK_MARKET */}
                {lms.phase === 'PART1_BLACK_MARKET' && (
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 rounded-3xl bg-purple-950/50 border-4 border-purple-500/60 p-4 space-y-2.5">
                      <h3 className="text-xl font-black text-amber-300">
                        🛒 ตลาดมืดละลายทรัพย์ (25 วินาที • ซื้อปุ๊บ ออกฤทธิ์ปั๊บ!)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {BLACK_MARKET_ITEMS.map((item) => {
                          const rStock = lms.roundStock[item.id] ?? 0;
                          const gStock =
                            item.id === 'HELL_CHAINS'
                              ? lms.gameStock.HELL_CHAINS
                              : item.id === 'JETPACK'
                              ? lms.gameStock.JETPACK
                              : 99;
                          const left = Math.min(rStock, gStock);
                          return (
                            <div
                              key={item.id}
                              className={`rounded-2xl p-3 border-2 ${
                                left > 0
                                  ? 'bg-slate-900 border-purple-400/60'
                                  : 'bg-slate-950 border-slate-800 opacity-45'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 font-black text-sm text-white">
                                <span>
                                  {item.icon} {item.name}
                                </span>
                                <span className="text-amber-300 font-mono">{item.price} ฿</span>
                              </div>
                              <div className="text-[11px] text-slate-300 mt-1">
                                คงเหลือ: <span className="font-black text-white">{left} ชิ้น</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="lg:col-span-5 rounded-3xl bg-slate-950 border-4 border-rose-500/60 p-4 flex flex-col">
                      <h3 className="text-lg font-black text-rose-400 mb-2">
                        ⚡ LIVE KILL-FEED (ประกาศสดตามเวลา!)
                      </h3>
                      <div className="flex-1 space-y-2 overflow-y-auto max-h-[340px]">
                        {lms.killFeed.length === 0 ? (
                          <div className="text-sm text-slate-500 text-center py-8">
                            รอทีมแรกกดซื้อไอเทมในตลาดมืด...
                          </div>
                        ) : (
                          lms.killFeed.map((kf) => (
                            <div
                              key={kf.id}
                              className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs font-bold text-white flex items-center gap-2"
                            >
                              <span className="text-lg">{kf.icon}</span>
                              <span>{kf.message}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* PART1_MINIGAME / PART1_MINIGAME_REVEAL */}
                {(lms.phase === 'PART1_MINIGAME' || lms.phase === 'PART1_MINIGAME_REVEAL') && (
                  <div className="flex-1 rounded-3xl bg-slate-900/95 border-4 border-red-500/70 p-6 flex flex-col justify-between gap-4">
                    {lms.part1Round === 1 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-auto">
                        {[1, 2, 3, 4].map((num) => {
                          const isPoison =
                            lms.phase === 'PART1_MINIGAME_REVEAL' &&
                            lms.poisonedChalices.includes(num);
                          const drinkers = active.filter((tid) => lms.chalicePicks[tid] === num);
                          return (
                            <div
                              key={num}
                              className={`rounded-3xl p-5 border-4 text-center space-y-2 ${
                                isPoison
                                  ? 'bg-purple-950 border-purple-400'
                                  : 'bg-slate-950 border-slate-700'
                              }`}
                            >
                              <div className="text-5xl">{isPoison ? '☠️' : '🍷'}</div>
                              <div className="text-xl font-black text-white">ถ้วย #{num}</div>
                              {lms.phase === 'PART1_MINIGAME_REVEAL' && (
                                <div className="text-xs font-black text-amber-300">
                                  {isPoison ? 'มียาพิษ!' : 'ปลอดภัย!'}
                                </div>
                              )}
                              {lms.phase === 'PART1_MINIGAME_REVEAL' && drinkers.length > 0 && (
                                <div className="flex justify-center gap-1 pt-1">
                                  {drinkers.map((tid) => (
                                    <span key={tid} className="px-2 py-0.5 rounded bg-black text-xs">
                                      {teams[tid].icon} {teams[tid].name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {lms.part1Round === 2 && (
                      <div className="my-auto text-center space-y-4">
                        <div className="text-3xl font-black text-amber-300">
                          🤝 หักหลังแบ่งสมบัติ (SPLIT OR STEAL)
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {active.map((tid) => {
                            const pick = lms.splitStealPicks[tid];
                            if (!pick && lms.phase !== 'PART1_MINIGAME_REVEAL') return null;
                            return (
                              <div
                                key={tid}
                                className="rounded-2xl bg-slate-950 border-2 border-slate-700 p-4"
                              >
                                <div className="text-2xl">{teams[tid].icon}</div>
                                <div className="font-black text-white">{teams[tid].name}</div>
                                <div className="mt-2 text-sm font-black text-amber-300">
                                  {lms.phase === 'PART1_MINIGAME_REVEAL'
                                    ? pick === 'STEAL'
                                      ? '🗡️ แทงข้างหลัง!'
                                      : '🤝 จับมือ'
                                    : '🔒 เลือกแล้ว'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {lms.part1Round === 3 && (
                      <div className="my-auto text-center space-y-3">
                        <div className="text-5xl">🎭</div>
                        <div className="text-3xl font-black text-white">
                          ท้าทายความกล้า (Krampus Dare • 15 วิ)
                        </div>
                        <div className="text-lg font-bold text-amber-300">
                          {lms.phase === 'PART1_MINIGAME_REVEAL'
                            ? `ผลโหวต: 💚 ไว้ชีวิต ${
                                Object.values(lms.dareVotes).filter((v) => v === 'SPARE').length
                              } เสียง vs 💀 ประหาร ${
                                Object.values(lms.dareVotes).filter((v) => v === 'EXECUTE').length
                              } เสียง`
                            : 'ทีมที่รอดกำลังโหวตว่าจะไว้ชีวิตหรือประหาร!'}
                        </div>
                      </div>
                    )}

                    {lms.part1Round === 4 && (
                      <div className="my-auto text-center space-y-4">
                        <div className="text-2xl font-black text-orange-400">
                          🎲 แต้มลูกเต๋าของ Krampus:{' '}
                          <span className="text-5xl text-white ml-2">
                            {lms.krampusDiceRoll ?? '?'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {active.map((tid) => {
                            const roll = lms.teamDiceRolls[tid];
                            return (
                              <div
                                key={tid}
                                className="rounded-2xl bg-slate-950 border-2 border-slate-700 p-4"
                              >
                                <div className="font-black text-white">
                                  {teams[tid].icon} {teams[tid].name}
                                </div>
                                <div className="text-4xl font-black text-amber-300 mt-1">
                                  🎲 {roll ?? '-'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PART1_GREED_TAX */}
                {lms.phase === 'PART1_GREED_TAX' && (
                  <div className="flex-1 rounded-3xl bg-gradient-to-b from-amber-950 via-black to-red-950 border-4 border-amber-400 p-8 flex flex-col items-center justify-center text-center gap-4">
                    <div className="text-6xl">💸</div>
                    <h2 className="text-4xl font-black text-amber-300">
                      ภาษีคนงกของ KRAMPUS!
                    </h2>
                    <p className="text-lg font-bold text-white">
                      ทีมใดถือเงินสดเกิน 1,000 ฿ ถูกหักเงินครึ่งหนึ่ง (50%) ทันที!
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                      {lms.greedTaxReport.length === 0 ? (
                        <div className="col-span-2 text-emerald-300 font-black text-xl">
                          ✨ ไม่มีทีมไหนถือเงินเกิน 1,000 ฿ — รอดภาษีทั้งหมด!
                        </div>
                      ) : (
                        lms.greedTaxReport.map((r) => (
                          <div
                            key={r.teamId}
                            className="rounded-2xl bg-slate-950 border-2 border-red-500 p-3 flex items-center justify-between"
                          >
                            <span className="font-black text-white">
                              {teams[r.teamId].icon} {teams[r.teamId].name}
                            </span>
                            <span className="font-mono font-black text-red-400">
                              {r.before} ฿ → {r.after} ฿ (-{r.lost} ฿)
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* PART2: SPLIT-SCREEN 25-STEP STAIRCASE + CLUE/QUESTION */}
                {isPart2 && (
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left: 25-Step Staircase */}
                    <div className="lg:col-span-6 rounded-3xl bg-slate-950 border-4 border-black p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-black text-amber-300">
                          🪜 บันไดหนีตาย 25 ขั้น
                        </h3>
                        <span className="px-2.5 py-1 rounded-lg bg-red-900 text-white text-xs font-black">
                          👹 Krampus: ขั้น {lms.krampusStep}
                        </span>
                      </div>

                      <div className="space-y-2.5 my-auto">
                        {active.map((tid) => {
                          const ts = lms.teamStates[tid];
                          const pct = Math.min(100, Math.max(0, (ts.step / 25) * 100));
                          return (
                            <div key={tid} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-black">
                                <span className={ts.isGhost ? 'text-purple-300' : 'text-white'}>
                                  {ts.isGhost ? '👻 [วิญญาณ]' : '🏃'} {teams[tid].icon}{' '}
                                  {teams[tid].name}
                                </span>
                                <span className="font-mono text-amber-300">
                                  ขั้น {ts.step} / 25
                                </span>
                              </div>
                              <div className="h-6 rounded-full bg-slate-900 border-2 border-slate-700 relative overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    ts.isGhost ? 'bg-purple-600/80' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                                {/* Krampus marker */}
                                <div
                                  className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_8px_#ef4444]"
                                  style={{
                                    left: `${Math.min(100, (lms.krampusStep / 25) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 rounded-xl bg-slate-900 border border-slate-800 p-2.5 max-h-28 overflow-y-auto space-y-1">
                        {lms.killFeed.slice(0, 4).map((kf) => (
                          <div key={kf.id} className="text-[11px] font-bold text-slate-200">
                            {kf.icon} {kf.message}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Clue / Question / 3 Options / Champion */}
                    <div className="lg:col-span-6 rounded-3xl bg-slate-900/95 border-4 border-black p-5 flex flex-col justify-between gap-4">
                      {lms.phase === 'CHAMPION' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                          <div className="text-7xl animate-bounce">🏆</div>
                          <div className="text-sm font-mono font-black text-amber-400 uppercase">
                            THE KRAMPUS EVE CHAMPION!
                          </div>
                          <div className="text-4xl font-black text-white">
                            {teams[lms.winnerTeamId || 'team1']?.icon}{' '}
                            {teams[lms.winnerTeamId || 'team1']?.name}
                          </div>
                          <div className="text-base font-bold text-emerald-300">
                            วิ่งทะลุประตูขั้นที่ 25 สำเร็จเป็นทีมแรก!
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <div className="inline-block px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-black">
                              ข้อที่ {lms.part2QuestionIndex + 1} •{' '}
                              {lms.phase === 'PART2_CLUE'
                                ? 'เบาะแสตั้งต้น (รอเปิดคำถาม)'
                                : lms.phase === 'PART2_QUESTION'
                                ? 'กดปุ่มสีบนมือถือ!'
                                : 'เฉลย & ขยับขั้น!'}
                            </div>
                            <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-base font-bold text-amber-200">
                              {p2Q.clueText}
                            </div>
                            {p2Q.imageUrl && (
                              <img
                                src={p2Q.imageUrl}
                                alt="Clue"
                                className="max-h-36 mx-auto rounded-xl object-contain"
                              />
                            )}
                          </div>

                          {lms.phase !== 'PART2_CLUE' && (
                            <div className="space-y-3">
                              <div className="text-xl font-black text-white">
                                {p2Q.questionText}
                              </div>
                              <div className="space-y-2">
                                {p2Q.choices.map((c) => {
                                  const isRev = lms.phase === 'PART2_REVEAL';
                                  const isCorrect = c.key === p2Q.correctKey;
                                  const colorBadge =
                                    c.key === 'A'
                                      ? 'bg-red-600 text-white'
                                      : c.key === 'B'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-yellow-400 text-black';
                                  return (
                                    <div
                                      key={c.key}
                                      className={`rounded-2xl p-3 border-2 flex items-center gap-3 ${
                                        isRev && isCorrect
                                          ? 'bg-emerald-950 border-emerald-400'
                                          : 'bg-slate-950 border-slate-800'
                                      }`}
                                    >
                                      <span
                                        className={`w-9 h-9 rounded-xl font-black flex items-center justify-center shrink-0 ${colorBadge}`}
                                      >
                                        {c.key}
                                      </span>
                                      <span className="font-bold text-white text-sm">
                                        {c.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {/* ==========================================================
            STANDARD MODE A: MULTIPLE CHOICE (e.g. Trivia Murder Party)
        ========================================================== */}
        {round.inputMode === 'MODE_A_CHOICE' &&
          !isEightDoorsGame &&
          !(round.gameStage === 'TRIVIA_MURDER' && round.lastMan) && (
          <div className="flex-1 flex flex-col justify-between gap-5">
            <div
              className={`grid gap-3.5 ${
                round.choiceCount <= 4
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-2 lg:grid-cols-4'
              }`}
            >
              {round.choices.slice(0, round.choiceCount).map((choice) => {
                const isRevealed = round.status === 'REVEALED' || choice.isOpened;
                const isCorrect = choice.isCorrect || round.correctChoices.includes(choice.key);
                const isTrap = choice.isTrap || round.trapChoices.includes(choice.key);

                const teamsWhoPicked = TEAM_ORDER.filter(
                  (tid) => String(submissions[tid]?.value) === choice.key
                );

                return (
                  <div
                    key={choice.key}
                    className={`relative rounded-2xl p-4 md:p-5 border-2 transition-all duration-500 flex flex-col justify-between ${
                      isRevealed
                        ? isCorrect
                          ? 'bg-gradient-to-br from-emerald-950 via-emerald-900/80 to-slate-950 border-amber-400 shadow-[0_0_30px_rgba(16,185,129,0.4)] scale-[1.01]'
                          : isTrap
                          ? 'bg-gradient-to-br from-red-950 via-red-900/70 to-slate-950 border-red-500 shadow-[0_0_25px_rgba(220,38,38,0.4)]'
                          : 'bg-slate-900/70 border-slate-700 opacity-75'
                        : 'bg-slate-900/90 border-slate-700/90 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl font-mono font-black text-2xl md:text-3xl flex items-center justify-center shrink-0 border-2 ${
                          isRevealed && isCorrect
                            ? 'bg-amber-400 text-slate-950 border-white shadow-lg'
                            : isRevealed && isTrap
                            ? 'bg-red-600 text-white border-red-300'
                            : 'bg-red-950/90 text-amber-300 border-amber-500/50'
                        }`}
                      >
                        {choice.key}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-lg md:text-2xl font-extrabold text-white leading-snug">
                          {choice.label}
                        </div>
                      </div>

                      {isRevealed && (
                        <div className="shrink-0">
                          {isCorrect && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs font-extrabold whitespace-nowrap">
                              ✓ ถูกต้อง
                            </span>
                          )}
                          {isTrap && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/30 border border-red-400 text-red-200 text-xs font-extrabold whitespace-nowrap">
                              💀 ผิด
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {round.status === 'REVEALED' && teamsWhoPicked.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-2">
                        {teamsWhoPicked.map((tid) => {
                          const t = teams[tid];
                          return (
                            <span
                              key={tid}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-amber-400/60 text-xs font-extrabold text-amber-200"
                            >
                              <span>{t.icon}</span>
                              <span>Team {t.number}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 4 Team Submission Status / Reveal Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {TEAM_ORDER.map((tid) => {
                const team = teams[tid];
                const sub = submissions[tid];
                const hasSubmitted = Boolean(sub);
                const isRevealed = round.status === 'REVEALED';
                const chosenKey = sub ? String(sub.value) : null;
                const chosenOption = round.choices.find((c) => c.key === chosenKey);
                const isCorrect =
                  chosenKey &&
                  (chosenOption?.isCorrect || round.correctChoices.includes(chosenKey));
                const isTrap =
                  chosenKey && (chosenOption?.isTrap || round.trapChoices.includes(chosenKey));

                return (
                  <div
                    key={tid}
                    className={`rounded-2xl p-4 border-2 transition-all duration-300 flex flex-col justify-between ${
                      isRevealed
                        ? isCorrect
                          ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                          : isTrap
                          ? 'bg-red-950/90 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.35)]'
                          : 'bg-slate-900/90 border-slate-700'
                        : hasSubmitted
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(234,179,8,0.25)]'
                        : 'bg-slate-900/75 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-2xl shrink-0">{team.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-mono uppercase text-amber-400 font-bold">
                            TEAM {team.number}
                          </div>
                          <div className="font-extrabold text-sm md:text-base text-white truncate">
                            {team.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {team.isInKillingFloor && (
                          <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold whitespace-nowrap shrink-0">
                            💀 ลานประหาร
                          </span>
                        )}
                        <div className="flex items-center gap-0.5 text-sm whitespace-nowrap shrink-0" title="เกราะเด็กดี">
                          {Array.from({ length: team.shields }).map((_, i) => (
                            <span key={i}>🛡️</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {!isRevealed ? (
                      <div className="py-3 flex flex-col items-center justify-center rounded-xl bg-black/40 border border-white/5">
                        {hasSubmitted ? (
                          <>
                            <div className="flex items-center gap-2 text-amber-300 font-extrabold text-lg">
                              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                              <span>ส่งคำตอบแล้ว!</span>
                            </div>
                            <span className="text-xs font-mono text-slate-300 mt-0.5">
                              เวลา {(sub!.elapsedMs / 1000).toFixed(2)} วินาที
                            </span>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-200 font-bold text-lg animate-pulse">
                            <Clock className="w-5 h-5 text-amber-400" />
                            <span>กำลังปรึกษา...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-2.5 px-3 rounded-xl bg-black/55 border border-white/10 flex items-center justify-between">
                        {hasSubmitted ? (
                          <>
                            <div>
                              <div className="text-xs text-slate-300">คำตอบที่เลือก:</div>
                              <div className="text-sm font-bold text-slate-100 line-clamp-1">
                                {chosenOption?.label || `ตัวเลือก ${chosenKey}`}
                              </div>
                            </div>
                            <div
                              className={`w-12 h-12 rounded-xl font-mono font-black text-2xl flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? 'bg-emerald-400 text-slate-950'
                                  : isTrap
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {chosenKey}
                            </div>
                          </>
                        ) : (
                          <div className="w-full text-center text-red-400 font-bold py-2">
                            ไม่ได้ส่งคำตอบ!
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================================
            MODE B: GAME 2 — THE CHRONO CRUSH (3 Sub-Rounds)
        ========================================================== */}
        {round.inputMode === 'MODE_B_YEAR' && (() => {
          const chronoSub = round.chronoSubRound || 'CHRONO_SUB1_CLASSIC';
          const chronoPhase = round.chronoPhase || 'YEAR_GUESS';
          const unitLabel = round.yearUnit === 'BE' ? 'พ.ศ.' : 'ค.ศ.';
          const minY = round.yearMin ?? (round.yearUnit === 'BE' ? 2520 : 1980);
          const maxY = round.yearMax ?? (round.yearUnit === 'BE' ? 2569 : 2026);
          const span = Math.max(1, maxY - minY);
          const targetPct = Math.min(100, Math.max(0, ((round.targetYear - minY) / span) * 100));
          const isRevealed = round.status === 'REVEALED';

          let maxDiff = 0;
          for (const tid of TEAM_ORDER) {
            const s = submissions[tid];
            if (!s) continue;
            const d = Math.abs(Number(s.value) - round.targetYear);
            if (d > maxDiff) maxDiff = d;
          }

          const allYears: number[] = [];
          if (chronoSub === 'CHRONO_SUB3_FAST_FINGER') {
            for (let y = minY; y <= maxY; y++) allYears.push(y);
          }

          return (
          <div className="flex-1 flex flex-col justify-between gap-4">
            {/* Timeline / Chrono Wheel Banner */}
            <div className="flex flex-col items-center justify-center py-4 px-6 rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950/50 to-slate-950 border-4 border-black shadow-[8px_8px_0px_#000]">
              <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
                <span className="px-3 py-0.5 rounded-full bg-amber-400 text-black font-mono font-black text-xs border-2 border-black">
                  {chronoSub === 'CHRONO_SUB1_CLASSIC'
                    ? 'SUB-ROUND 1 • CLASSIC TIMELINE'
                    : chronoSub === 'CHRONO_SUB2_TRAP'
                    ? chronoPhase === 'TRAP_PLACEMENT'
                      ? 'SUB-ROUND 2 • จังหวะที่ 1: วางกับดักเวลา'
                      : 'SUB-ROUND 2 • จังหวะที่ 2: ทายปีฝ่ากับดัก (x2)'
                    : 'SUB-ROUND 3 • FAST FINGER YEAR'}
                </span>
                <span className="px-3 py-0.5 rounded-full bg-slate-900 text-amber-300 font-mono font-bold text-xs border border-amber-500/40">
                  ช่วงปี: {unitLabel} {minY} – {maxY}
                </span>
              </div>

              {chronoSub === 'CHRONO_SUB2_TRAP' && chronoPhase === 'TRAP_PLACEMENT' ? (
                <div className="text-center py-2">
                  <div className="text-3xl md:text-5xl font-black text-amber-300">
                    💣 กำลังวางกับดักเวลาใส่คู่แข่ง!
                  </div>
                  <div className="text-sm md:text-base text-slate-200 mt-1">
                    0 ลูก = เลื่อนทีละ 1 ปี • 1 ลูก = ทีละ 5 ปี • 2+ ลูก = ทีละ 10 ปี (ฝ่ากับดักได้รางวัล x2!)
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-4xl space-y-3">
                  <div className="text-center">
                    {isRevealed ? (
                      <div className="text-5xl md:text-7xl font-mono font-black text-amber-300 drop-shadow-[0_0_25px_rgba(234,179,8,0.6)]">
                        ✨ {unitLabel} {round.targetYear} ✨
                      </div>
                    ) : (
                      <div className="text-4xl md:text-5xl font-mono font-black text-slate-400 tracking-widest">
                        {unitLabel} ? ? ? ?
                      </div>
                    )}
                  </div>

                  {/* Animated Chrono Needle Timeline Bar */}
                  <div className="relative pt-6 pb-2 px-2">
                    <div className="h-4 rounded-full bg-slate-900 border-2 border-amber-500/50 relative overflow-visible">
                      {/* Target Needle */}
                      <div
                        className={`absolute -top-6 -translate-x-1/2 transition-all duration-1000 ease-out flex flex-col items-center ${
                          isRevealed ? 'opacity-100 scale-110' : 'opacity-0 scale-75'
                        }`}
                        style={{ left: `${targetPct}%` }}
                      >
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-black font-mono font-black text-xs border-2 border-black shadow">
                          {round.targetYear}
                        </span>
                        <div className="w-1 h-7 bg-amber-400 shadow-[0_0_12px_#facc15]" />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs font-mono font-bold text-slate-300 mt-1.5">
                      <span>{unitLabel} {minY}</span>
                      <span>{unitLabel} {Math.round((minY + maxY) / 2)}</span>
                      <span>{unitLabel} {maxY}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Round 3 Fast Finger Shared Board */}
              {chronoSub === 'CHRONO_SUB3_FAST_FINGER' && (
                <div className="w-full max-w-5xl mt-3 pt-3 border-t border-white/10">
                  <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2">
                    {allYears.map((yr) => {
                      const claimTid = round.chronoFastFingerClaims?.[String(yr)];
                      const claimTeam = claimTid ? teams[claimTid] : null;
                      const isTarget = isRevealed && yr === round.targetYear;
                      return (
                        <div
                          key={yr}
                          className={`rounded-xl p-2 border-2 text-center transition-all ${
                            isTarget
                              ? 'bg-amber-400 text-black border-white scale-105 shadow-[0_0_20px_rgba(250,204,21,0.8)]'
                              : claimTeam
                              ? 'bg-slate-900 border-amber-400 text-white shadow'
                              : 'bg-slate-900/70 border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="font-mono font-black text-base md:text-lg">{yr}</div>
                          {claimTeam ? (
                            <div className="text-xs font-extrabold truncate mt-0.5 text-amber-300">
                              {claimTeam.icon} T{claimTeam.number}
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-500 font-bold">ว่าง</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4 Team Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEAM_ORDER.map((tid) => {
                const team = teams[tid];
                const sub = submissions[tid];
                const quota = round.chronoQuotas?.[tid] ?? 1;
                const shield = round.chronoShields?.[tid] ?? 0;
                const trapsRecv = getChronoTrapsReceived(round, tid);
                const netTraps = getChronoNetTraps(round, tid);
                const step = getChronoSliderStep(netTraps);

                const submittedYear = sub ? Number(sub.value) : null;
                const scoreRes =
                  isRevealed && submittedYear !== null && chronoPhase === 'YEAR_GUESS'
                    ? scoreChronoTeam(round, tid, submittedYear, maxDiff)
                    : null;

                return (
                  <div
                    key={tid}
                    className={`relative rounded-3xl p-4 border-4 border-black shadow-[6px_6px_0px_#000] transition-all flex flex-col justify-between ${
                      scoreRes && scoreRes.delta > 0
                        ? 'bg-emerald-950/95'
                        : scoreRes && scoreRes.delta < 0
                        ? 'bg-red-950/95'
                        : sub
                        ? 'bg-slate-900'
                        : 'bg-slate-900/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-3xl shrink-0">{team.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-mono text-amber-400 font-bold">
                            TEAM {team.number} • {team.coins.toLocaleString()} ฿
                          </div>
                          <div className="font-extrabold text-sm md:text-base text-white truncate">
                            {team.name}
                          </div>
                        </div>
                      </div>
                      {chronoSub === 'CHRONO_SUB2_TRAP' && (
                        <span className="px-2 py-0.5 rounded-lg bg-black/70 border border-amber-400/50 text-[11px] font-mono font-bold text-amber-300 shrink-0">
                          Step {step} ปี
                        </span>
                      )}
                    </div>

                    {chronoSub === 'CHRONO_SUB2_TRAP' && chronoPhase === 'TRAP_PLACEMENT' ? (
                      <div className="my-2 p-3 rounded-2xl bg-black/60 border border-white/10 text-center space-y-1.5">
                        <div className="flex justify-center gap-2 text-xs font-bold">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            โควตา: {quota} 💣
                          </span>
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                            โล่: {shield} 🛡️
                          </span>
                        </div>
                        <div className="text-sm font-black text-red-300">
                          โดนเล็ง: {trapsRecv} ลูก (สุทธิ {netTraps} ลูก → Step {step} ปี)
                        </div>
                        <div className="text-xs font-bold text-emerald-300">
                          {sub ? '✓ วางกับดักครบแล้ว' : '⏳ กำลังเลือกเป้าหมาย...'}
                        </div>
                      </div>
                    ) : (
                      <div className="my-2 py-3 px-2 rounded-2xl bg-black/60 border border-white/10 text-center">
                        {!sub ? (
                          <div className="text-lg font-bold text-slate-300 animate-pulse py-2">
                            {chronoSub === 'CHRONO_SUB3_FAST_FINGER'
                              ? 'กำลังแย่งกดปี...'
                              : 'กำลังเลื่อนแถบปี...'}
                          </div>
                        ) : !isRevealed ? (
                          <div>
                            <div className="text-2xl font-extrabold text-emerald-400 flex items-center justify-center gap-2">
                              <Lock className="w-5 h-5" />
                              {chronoSub === 'CHRONO_SUB3_FAST_FINGER'
                                ? `ล็อกปี ${submittedYear}`
                                : 'ล็อกคำตอบแล้ว'}
                            </div>
                            {chronoSub === 'CHRONO_SUB2_TRAP' && netTraps >= 1 && (
                              <div className="text-xs font-bold text-amber-300 mt-1">
                                🔥 ติดกับดัก Step {step} ปี (ลุ้นโบนัส x2!)
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="text-xs text-slate-300">ปีที่ทาย ({unitLabel}):</div>
                            <div className="text-4xl font-mono font-black text-white my-0.5">
                              {submittedYear}
                            </div>
                            {scoreRes && (
                              <div
                                className={`inline-block px-3 py-1 rounded-full text-xs font-black mt-1 ${
                                  scoreRes.delta > 0
                                    ? 'bg-emerald-400 text-black'
                                    : scoreRes.delta < 0
                                    ? 'bg-red-600 text-white'
                                    : 'bg-slate-700 text-slate-200'
                                }`}
                              >
                                {scoreRes.label}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* ==========================================================
            MODE C: BUZZER / REACTION (Instant Queue 1, 2, 3, 4 by ms)
        ========================================================== */}
        {round.inputMode === 'MODE_C_BUZZER' && (
          <div className="flex-1 flex flex-col justify-between gap-6">
            <div className="flex-1 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-b from-red-950/60 via-slate-950 to-slate-950 border-2 border-amber-500/60 p-6 shadow-2xl">
              {buzzerQueue.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-24 h-24 rounded-full bg-red-600/20 border-4 border-red-500 flex items-center justify-center mx-auto mb-4 animate-ping" />
                  <div className="text-3xl md:text-5xl font-extrabold text-amber-300 tracking-wide">
                    🔔 รอสัญญาณกดกระดิ่งสายฟ้าแลบ!
                  </div>
                  <p className="text-slate-200 text-xl font-semibold mt-2">
                    ทีมที่กดปุ่ม Buzzer บนจอมือถือได้เร็วที่สุดระดับมิลลิวินาทีจะขึ้นอันดับ 1 ทันที!
                  </p>
                </div>
              ) : (
                <div className="w-full max-w-4xl text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider mb-3 shadow-lg">
                    <Zap className="w-4 h-4" /> อันดับ 1 — กดกระดิ่งได้เร็วที่สุด!
                  </div>
                  {(() => {
                    const first = buzzerQueue[0];
                    const winner = teams[first.teamId];
                    return (
                      <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/20 via-red-600/25 to-amber-500/20 border-2 border-amber-400 shadow-[0_0_50px_rgba(234,179,8,0.45)] flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className="text-6xl">{winner.icon}</span>
                          <div className="text-left">
                            <div className="text-sm font-mono font-bold text-amber-300">
                              TEAM {winner.number} • FIRST BUZZER
                            </div>
                            <div className="text-3xl md:text-5xl font-black text-white">
                              {winner.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-xs text-amber-200 uppercase">Reaction Time</div>
                          <div className="text-3xl md:text-4xl font-black text-amber-300">
                            {(first.elapsedFromStartMs / 1000).toFixed(3)}s
                          </div>
                          <div className="text-xs text-emerald-300 font-bold">
                            ({first.elapsedFromStartMs} ms)
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((idx) => {
                const entry = buzzerQueue[idx];
                const team = entry ? teams[entry.teamId] : null;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl p-4 border-2 transition-all ${
                      entry
                        ? idx === 0
                          ? 'bg-amber-950/60 border-amber-400 shadow-[0_0_25px_rgba(234,179,8,0.35)]'
                          : 'bg-slate-900/95 border-slate-600'
                        : 'bg-slate-950/60 border-slate-800/80 border-dashed'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`px-3 py-0.5 rounded-full font-mono font-black text-sm ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-200'
                        }`}
                      >
                        คิวอันดับ #{idx + 1}
                      </span>
                      {entry && (
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {idx === 0
                            ? '0.000s (คนแรก!)'
                            : `+${(entry.deltaMs / 1000).toFixed(3)}s ช้ากว่าคนแรก`}
                        </span>
                      )}
                    </div>

                    {team ? (
                      <div className="flex items-center gap-3 py-2">
                        <span className="text-4xl">{team.icon}</span>
                        <div>
                          <div className="font-extrabold text-lg text-white">{team.name}</div>
                          <div className="text-xs font-mono text-slate-300">
                            กดที่วินาที {(entry.elapsedFromStartMs / 1000).toFixed(3)}s
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-5 text-center text-slate-300 font-bold text-lg">
                        รอทีมกดกระดิ่ง...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==========================================================
            GAME 3: THE TOY FACTORY CHAOS (สายพานคัดแยกของเล่นผีสิง)
        ========================================================== */}
        {round.gameStage === 'QUIXORT' &&
          round.toyFactory &&
          (() => {
            const tf = round.toyFactory;
            const datasets = state.toyFactoryDatasets || [];
            const activeDataset = datasets.find((d) => d.id === tf.selectedDatasetId) || null;
            const activePairing = tf.pairings[tf.roundIndex - 1] || tf.pairings[0];
            const sortingTeamId = activePairing?.sortingTeamId || 'team1';
            const holdingTeamId = activePairing?.holdingTeamId || 'team2';
            const sortingTeam = teams[sortingTeamId];
            const holdingTeam = teams[holdingTeamId];
            const prepSec = tf.prepEndsAt
              ? Math.max(0, Math.ceil((tf.prepEndsAt - toyNowMs) / 1000))
              : 0;
            const bufferSec = tf.bufferEndsAt
              ? Math.max(0, Math.ceil((tf.bufferEndsAt - toyNowMs) / 1000))
              : 0;
            const errorsCount = tf.revealSlots.filter((s) => s.verdict === 'WRONG').length;

            return (
              <div className="flex-1 flex flex-col justify-between gap-4 relative">
                {/* 10s Prep or 10s Shuffle Buffer Giant Overlay */}
                {tf.phase === 'PREP_10S' && (
                  <div className="rounded-3xl bg-amber-500 text-black border-4 border-black shadow-[8px_8px_0px_#000] p-6 text-center">
                    <div className="text-sm font-mono font-black uppercase tracking-widest">
                      PREPARE TIME • เตรียมตัวอ่านโพยลับ
                    </div>
                    <div className="text-7xl font-black my-2 font-mono">{prepSec}</div>
                    <div className="text-xl font-black">
                      ทีม {holdingTeam?.icon} {holdingTeam?.name} กำลังเช็กข้อมูลลับบนมือถือ!
                    </div>
                  </div>
                )}

                {tf.phase === 'SHUFFLE_BUFFER_10S' && (
                  <div className="rounded-3xl bg-red-600 text-white border-4 border-yellow-300 shadow-[0_0_50px_rgba(239,68,68,0.85)] p-7 text-center animate-pulse">
                    <div className="inline-block px-4 py-1 rounded-full bg-yellow-400 text-black font-black text-sm mb-2">
                      ⚡ SHUFFLE! มีทีมกดปุ่มสลับคนถือข้อมูลแล้ว!
                    </div>
                    <div className="text-8xl font-black font-mono text-yellow-300 my-1">
                      {bufferSec}
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-white">
                      หยุดถาม! ให้เวลาทีม {holdingTeam?.icon} {holdingTeam?.name} เช็กข้อมูลใหม่ 10 วินาที
                    </div>
                  </div>
                )}

                {/* Pairings + Topic Banner (NEVER reveal answers during action) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="rounded-3xl bg-emerald-950/75 border-4 border-black shadow-[6px_6px_0px_#000] p-4 flex items-center gap-3">
                    <span className="text-4xl">{sortingTeam?.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-black text-emerald-300 uppercase">
                        🏃 ทีมจัดเรียง (SORTING) • ROUND {tf.roundIndex}/{tf.pairings.length}
                      </div>
                      <div className="text-xl font-black text-white truncate">
                        {sortingTeam?.name}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl bg-purple-950/85 border-4 border-black shadow-[6px_6px_0px_#000] p-4 text-center flex flex-col justify-center">
                    {activeDataset ? (
                      <>
                        <div className="text-xs font-mono font-black text-purple-300 uppercase">
                          หัวข้อภารกิจ
                        </div>
                        <div className="text-xl font-black text-amber-300">{activeDataset.title}</div>
                        <div className="text-sm font-bold text-white mt-0.5">
                          กติกา: {activeDataset.direction}
                        </div>
                      </>
                    ) : (
                      <div className="text-lg font-black text-amber-300 animate-pulse">
                        ⏳ รอทีมจัดเรียงเลือกหัวข้อ (1 ใน 5)...
                      </div>
                    )}
                  </div>

                  <div className="rounded-3xl bg-amber-950/75 border-4 border-black shadow-[6px_6px_0px_#000] p-4 flex items-center gap-3">
                    <span className="text-4xl">{holdingTeam?.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-black text-amber-300 uppercase">
                        📜 ทีมถือข้อมูล (DATA-HOLDING)
                      </div>
                      <div className="text-xl font-black text-white truncate">
                        {holdingTeam?.name}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TOPIC_SELECT / ACTION Status Area */}
                {(tf.phase === 'TOPIC_SELECT' || tf.phase === 'ACTION') && (
                  <div className="flex-1 rounded-3xl bg-slate-900/90 border-4 border-black shadow-[6px_6px_0px_#000] p-6 flex flex-col items-center justify-center text-center gap-3">
                    {tf.phase === 'TOPIC_SELECT' ? (
                      <>
                        <div className="text-5xl">🎁</div>
                        <div className="text-2xl font-black text-white">
                          กำลังเลือกกล่องของเล่นผีสิง...
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                          {datasets.map((ds) => {
                            const used = tf.usedDatasetIds.includes(ds.id);
                            return (
                              <span
                                key={ds.id}
                                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-black ${
                                  used
                                    ? 'bg-slate-800 border-slate-700 text-slate-500 line-through'
                                    : 'bg-purple-900/70 border-purple-400 text-purple-100'
                                }`}
                              >
                                {ds.title}
                              </span>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-5xl animate-bounce">⚙️</div>
                        <div className="text-3xl font-black text-amber-300">
                          กำลังปฏิบัติภารกิจเรียงลำดับหน้าเวที!
                        </div>
                        <div className="text-base font-bold text-slate-200 max-w-2xl">
                          ข้อมูลทั้งหมดถูกซ่อนเป็นความลับบนมือถือของทีม {holdingTeam?.name} • ทีมผู้ชมอีก 2 ทีมสามารถกดปุ่ม{' '}
                          <span className="text-red-400 font-black">SHUFFLE!</span> เพื่อสลับคนถือข้อมูลได้ (ก่อน 15 วินาทีสุดท้าย)
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* REVEAL_JUDGE Left-to-Right Cards */}
                {tf.phase === 'REVEAL_JUDGE' && (
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {tf.revealSlots.map((slot, idx) => {
                        const isCorrect = slot.verdict === 'CORRECT';
                        const isWrong = slot.verdict === 'WRONG';
                        const isSpotlight = Boolean(slot.isMystery && tf.mysterySpotlightActive);
                        return (
                          <div
                            key={`${slot.itemId}-${idx}`}
                            className={`rounded-2xl p-4 border-4 transition-all flex flex-col justify-between text-center min-h-[170px] ${
                              isCorrect
                                ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)]'
                                : isWrong
                                ? 'bg-red-950/90 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.45)]'
                                : isSpotlight
                                ? 'bg-amber-950/90 border-yellow-300 shadow-[0_0_35px_rgba(250,204,21,0.7)] scale-[1.03]'
                                : 'bg-slate-900/95 border-slate-700'
                            }`}
                          >
                            <div className="text-xs font-mono font-black text-slate-400">
                              ลำดับที่ #{idx + 1}
                            </div>

                            {slot.revealed ? (
                              <div className="my-auto space-y-1">
                                {slot.isMystery && (
                                  <div className="inline-block px-2 py-0.5 rounded bg-yellow-400 text-black text-[10px] font-black">
                                    ✨ ตัวปริศนา ???
                                  </div>
                                )}
                                <div className="text-base font-black text-white leading-tight">
                                  {slot.label}
                                </div>
                                <div className="text-sm font-mono font-extrabold text-amber-300">
                                  ({slot.realValue})
                                </div>
                              </div>
                            ) : (
                              <div className="my-auto">
                                <div className="text-4xl font-black text-purple-300">
                                  {slot.isMystery ? '❓' : '🎁'}
                                </div>
                                <div className="text-xs font-bold text-slate-300 mt-1">
                                  {slot.isMystery ? 'ตัวปริศนา ???' : 'รอตรวจคำตอบ'}
                                </div>
                              </div>
                            )}

                            <div className="mt-2">
                              {isCorrect && (
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-xs font-black">
                                  ✓ ถูก!
                                </span>
                              )}
                              {isWrong && (
                                <span className="inline-block px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-black">
                                  ✗ ผิด (-100 ฿)
                                </span>
                              )}
                              {!slot.verdict && (
                                <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-bold">
                                  {isSpotlight ? '🔍 กำลังเปิดไฟ...' : 'ยังไม่ตัดสิน'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {round.status === 'REVEALED' && (
                      <div className="rounded-3xl bg-slate-950 border-4 border-amber-400 p-4 flex flex-wrap items-center justify-around gap-4 text-center">
                        <div>
                          <div className="text-xs font-bold text-slate-400">จำนวนข้อผิด</div>
                          <div className="text-2xl font-black text-white">
                            {errorsCount} ข้อ
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-emerald-300">
                            ทีมจัดเรียง ({sortingTeam?.name})
                          </div>
                          <div className="text-2xl font-black text-amber-300">
                            {errorsCount === 0
                              ? '+800 ฿ (Perfect!)'
                              : `-${errorsCount * 100} ฿`}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-amber-300">
                            ทีมถือข้อมูล ({holdingTeam?.name})
                          </div>
                          <div className="text-2xl font-black text-white">
                            {errorsCount === 0
                              ? '+300 ฿'
                              : '0 ฿ • 💀 ติดคำสาป (-1 ❤️ เกม 4)'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {/* ==========================================================
            MODE D: WAGERING / SECRET NUMBER (1-10, Quixort Bet, Bribe)
        ========================================================== */}
        {round.inputMode === 'MODE_D_SECRET' &&
          !(round.gameStage === 'QUIXORT' && round.toyFactory) && (
          <div className="flex-1 flex flex-col justify-between gap-5">
            {round.modeDSubType === 'QUIXORT_BET' && (
              <div className="rounded-3xl bg-slate-900/95 border-2 border-purple-500/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-purple-900 text-purple-200 font-bold text-sm">
                      ทีมที่ลงสนามจัดเรียง: {teams[round.activeTeamId || 'team1'].icon}{' '}
                      {teams[round.activeTeamId || 'team1'].name}
                    </span>
                    <span className="text-amber-300 font-bold text-base">
                      กติกา: {round.quixortRule}
                    </span>
                  </div>
                  <span className="text-sm text-slate-200 font-semibold">
                    อีก 3 ทีมที่นั่งดู: ลงเงินเดิมพันลับว่าทีมในสนามจะ PASS (ผ่าน) หรือ FAIL (ล้มเหลว)!
                  </span>
                </div>

                {round.quixortItems && round.quixortItems.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {round.quixortItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs md:text-sm font-bold text-amber-200 text-center"
                      >
                        {round.status === 'REVEALED' ? item : item.replace(/\s*\(.*?\)/g, '')}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl bg-slate-950/90 border border-amber-500/40 p-4 text-center">
              {round.status !== 'REVEALED' ? (
                <div className="flex items-center justify-center gap-3 text-amber-300 font-extrabold text-xl">
                  <Lock className="w-6 h-6 text-red-400 animate-pulse" />
                  <span>
                    ค่าเดิมพันและตัวเลขลับของทุกทีมถูกซ่อนไว้ จนกว่า GM ใหญ่จะกด &ldquo;Reveal All&rdquo;
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 text-emerald-300 font-extrabold text-xl">
                  <Eye className="w-6 h-6" />
                  <span>เปิดเผยความลับของทั้ง 4 ทีมพร้อมกัน!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TEAM_ORDER.map((tid) => {
                const team = teams[tid];
                const sub = submissions[tid];
                const isRevealed = round.status === 'REVEALED';
                const isActiveQuixortTeam =
                  round.modeDSubType === 'QUIXORT_BET' && round.activeTeamId === tid;

                const isUniqueWinner =
                  isRevealed &&
                  round.modeDSubType === 'UNIQUE_NUMBER_1_10' &&
                  uniqueNumberAnalysis.winnerTeamId === tid;

                const isDuplicateNumber =
                  isRevealed &&
                  round.modeDSubType === 'UNIQUE_NUMBER_1_10' &&
                  sub &&
                  (uniqueNumberAnalysis.counts[String(sub.value)] || 0) > 1;

                return (
                  <div
                    key={tid}
                    className={`rounded-3xl p-5 border-2 transition-all duration-500 flex flex-col justify-between ${
                      isUniqueWinner
                        ? 'bg-gradient-to-b from-amber-950 via-emerald-950 to-slate-950 border-amber-300 shadow-[0_0_35px_rgba(234,179,8,0.5)] scale-[1.02]'
                        : isDuplicateNumber
                        ? 'bg-red-950/90 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                        : sub
                        ? 'bg-slate-900/95 border-amber-500/60'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-3xl shrink-0">{team.icon}</span>
                        <div className="truncate">
                          <div className="text-xs font-mono text-amber-400 font-bold">
                            TEAM {team.number}
                          </div>
                          <div className="font-extrabold text-base text-white truncate">
                            {team.name}
                          </div>
                        </div>
                      </div>
                      {team.isInKillingFloor && (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold whitespace-nowrap shrink-0">
                          💀 ลานประหาร
                        </span>
                      )}
                    </div>

                    {isActiveQuixortTeam ? (
                      <div className="my-3 py-6 rounded-2xl bg-purple-950/50 border border-purple-500/50 text-center">
                        <Swords className="w-8 h-8 text-purple-300 mx-auto mb-1" />
                        <div className="text-lg font-extrabold text-purple-200">
                          กำลังปฏิบัติภารกิจในสนาม!
                        </div>
                      </div>
                    ) : !isRevealed ? (
                      <div className="my-3 py-6 rounded-2xl bg-black/55 border border-white/10 text-center">
                        {sub ? (
                          <>
                            <Lock className="w-9 h-9 text-amber-400 mx-auto mb-1.5" />
                            <div className="text-lg font-extrabold text-amber-300">
                              ส่งความลับแล้ว
                            </div>
                            <div className="text-xs font-mono text-slate-300 mt-0.5">
                              เวลา {(sub.elapsedMs / 1000).toFixed(2)}s
                            </div>
                          </>
                        ) : (
                          <div className="text-xl font-bold text-slate-200 animate-pulse py-3">
                            รอส่งข้อมูลลับ...
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="my-3 py-5 px-3 rounded-2xl bg-black/65 border border-white/15 text-center">
                        {!sub ? (
                          <div className="text-red-400 font-bold py-4">ไม่ได้ส่งข้อมูล!</div>
                        ) : (
                          <>
                            <div className="text-xs text-slate-300 uppercase font-mono">
                              {round.modeDSubType === 'UNIQUE_NUMBER_1_10' && 'ตัวเลขลับที่เลือก'}
                              {round.modeDSubType === 'COIN_WAGER' && 'จำนวนเหรียญเดิมพันลับ'}
                              {round.modeDSubType === 'QUIXORT_BET' && 'เดิมพัน & คำทำนาย'}
                              {round.modeDSubType === 'CURSED_CHALICE' && 'กล่องต้องสาปที่เลือก'}
                            </div>

                            <div className="text-5xl font-mono font-black text-amber-300 my-1.5">
                              {round.modeDSubType === 'COIN_WAGER' ||
                              round.modeDSubType === 'QUIXORT_BET'
                                ? `${sub.value} 🪙`
                                : sub.value}
                            </div>

                            {round.modeDSubType === 'QUIXORT_BET' && sub.secondaryValue && (
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                                  sub.secondaryValue === 'PASS'
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-red-600 text-white'
                                }`}
                              >
                                แทงว่า: {sub.secondaryValue === 'PASS' ? 'สำเร็จ (PASS)' : 'พัง (FAIL)'}
                              </span>
                            )}

                            {isUniqueWinner && (
                              <div className="mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-xs font-extrabold">
                                👑 ชนะเลิศเลขไม่ซ้ำ!
                              </div>
                            )}

                            {isDuplicateNumber && (
                              <div className="mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-red-600 text-white text-xs font-extrabold">
                                ❌ เลขซ้ำกัน! โดนลงโทษ
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    <div className="text-xs font-mono text-slate-300 flex justify-between pt-2 border-t border-slate-800">
                      <span>เหรียญคงเหลือ:</span>
                      <span className="text-amber-300 font-bold">
                        {team.coins.toLocaleString()} 🪙
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* ============================================================
          3. PERSISTENT REALTIME LEADERBOARD & ECONOMY FOOTER (Hidden on LOBBY & WORLD_MAP)
      ============================================================ */}
      {round.gameStage !== 'LOBBY' && round.gameStage !== 'WORLD_MAP' && (
      <footer className="relative z-20 bg-slate-950/95 border-t-2 border-amber-500/40 px-6 py-3.5 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                HOLY COINS & NICE SHIELDS • อันดับความมั่งคั่ง & เกราะเด็กดี
              </div>
              {latestTx ? (
                <div className="text-xs text-slate-200 truncate max-w-xs">
                  ล่าสุด: {latestTx.reason}{' '}
                  {latestTx.delta !== 0 && (
                    <span
                      className={
                        latestTx.delta > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                      }
                    >
                      ({latestTx.delta > 0 ? `+${latestTx.delta}` : latestTx.delta} 🪙)
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-300">
                  เริ่มต้นทีมละ 1,000 เหรียญศักดิ์สิทธิ์ • เกราะเด็กดี 🛡️ 3 ดวง
                </div>
              )}
            </div>
          </div>

          {/* Sorted 1st to 4th Leaderboard Pills */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
            {sortedTeams.map((team, index) => {
              const rank = index + 1;
              const isNaughty = rank === 4 || team.coins <= 0 || team.shields <= 0;
              const isNiceLeader = rank === 1 && !isNaughty;

              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-all ${
                    isNiceLeader
                      ? 'bg-gradient-to-r from-amber-950/80 to-slate-900 border-amber-400 shadow-[0_0_15px_rgba(234,179,8,0.25)]'
                      : isNaughty
                      ? 'bg-gradient-to-r from-red-950/80 to-slate-900 border-red-600/80'
                      : 'bg-slate-900/90 border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg font-mono font-black text-sm flex items-center justify-center shrink-0 ${
                        rank === 1
                          ? 'bg-amber-400 text-slate-950'
                          : isNaughty
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      #{rank}
                    </span>
                    <span className="text-xl shrink-0">{team.icon}</span>
                    <div className="truncate">
                      <div className="font-extrabold text-sm text-white truncate">{team.name}</div>
                      <div className="flex items-center gap-1.5">
                        {isNiceLeader && (
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 whitespace-nowrap">
                            🌟 Nice List
                          </span>
                        )}
                        {isNaughty && (
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-red-600/30 text-red-200 border border-red-500/50 whitespace-nowrap">
                            👹 Naughty List
                          </span>
                        )}
                        <span className="text-xs whitespace-nowrap" title="เกราะเด็กดี">
                          {'🛡️'.repeat(team.shields) || '💔ไร้เกราะ'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0 ml-2">
                    <div className="text-lg md:text-xl font-black text-amber-300">
                      {team.coins.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-amber-400 uppercase font-bold">
                      Holy Coins
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </footer>
      )}

      {/* ============================================================
          4. FULLSCREEN LEADERBOARD / FINALE CEREMONY OVERLAY
      ============================================================ */}
      {(showLeaderboardOverlay || round.gameStage === 'FINALE') && (
        <div className="fixed inset-0 z-40 bg-black/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-5xl w-full rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-2 border-amber-400 shadow-[0_0_80px_rgba(234,179,8,0.3)] p-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-extrabold uppercase tracking-widest mb-2">
                  <Crown className="w-4 h-4" /> THE KRAMPUS EVE STANDINGS
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white">
                  ตารางอันดับเหรียญศักดิ์สิทธิ์ & เกราะเด็กดี (Nice vs Naughty List)
                </h2>
              </div>
              {showLeaderboardOverlay && (
                <button
                  onClick={() => setShowLeaderboardOverlay(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-600"
                >
                  กลับสู่หน้าเกม
                </button>
              )}
            </div>

            <div className="space-y-4">
              {sortedTeams.map((team, idx) => {
                const rank = idx + 1;
                const isNaughty = rank === 4 || team.coins <= 0 || team.shields <= 0;
                const isFirst = rank === 1 && !isNaughty;

                return (
                  <div
                    key={team.id}
                    className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border-2 transition-all ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-950/90 via-emerald-950/70 to-slate-900 border-amber-400 shadow-[0_0_35px_rgba(234,179,8,0.35)] scale-[1.01]'
                        : isNaughty
                        ? 'bg-gradient-to-r from-red-950/90 via-black to-red-950/60 border-red-500'
                        : 'bg-slate-900/90 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-2xl font-mono font-black text-2xl flex items-center justify-center border-2 ${
                          isFirst
                            ? 'bg-amber-400 text-slate-950 border-white'
                            : isNaughty
                            ? 'bg-red-600 text-white border-red-300'
                            : 'bg-slate-800 text-slate-200 border-slate-600'
                        }`}
                      >
                        #{rank}
                      </div>
                      <span className="text-5xl">{team.icon}</span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-2xl md:text-3xl font-black text-white">
                            {team.name}
                          </span>
                          {isFirst && (
                            <span className="px-3 py-1 rounded-full bg-emerald-400 text-slate-950 font-black text-xs uppercase whitespace-nowrap">
                              🌟 NICE LIST (เด็กดีรอดชีวิต!)
                            </span>
                          )}
                          {isNaughty && (
                            <span className="px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase animate-pulse whitespace-nowrap">
                              👹 NAUGHTY LIST (ถูกครามปุสลงทัณฑ์!)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-300 mt-1 flex flex-wrap items-center gap-4">
                          <span>Team {team.number}</span>
                          <span>•</span>
                          <span>
                            เกราะเด็กดี (Nice Shields):{' '}
                            {'🛡️'.repeat(team.shields) || '💔 แตกหมดแล้ว (Naughty List)'}
                          </span>
                          {team.isInKillingFloor && (
                            <span className="text-red-400 font-bold whitespace-nowrap">
                              • 💀 ติดอยู่ในลานประหาร
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-4xl md:text-5xl font-black text-amber-300">
                        {team.coins.toLocaleString()} <span className="text-2xl">🪙</span>
                      </div>
                      <div className="text-xs text-amber-400/80 uppercase tracking-wider">
                        HOLY COINS BALANCE
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
