import React, { useEffect, useMemo } from 'react';
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
import { TEAM_ORDER, getSuggestedSafeRange } from '../data/initialData';
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
    badge: 'GAME 2 • TIMEJINX',
    name: 'กงล้อกาลเวลาของครามปุส',
    color: 'from-emerald-950 via-slate-900 to-amber-950',
  },
  QUIXORT: {
    badge: 'GAME 3 • QUIXORT',
    name: 'สายพานคัดแยกของเล่นผีสิง',
    color: 'from-purple-950 via-red-950 to-slate-950',
  },
  TRIVIA_MURDER: {
    badge: 'GAME 4 • TRIVIA MURDER PARTY',
    name: 'ลานประหารของครามปุส',
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
                  title: 'Timejinx',
                  thaiTitle: 'กงล้อกาลเวลาของครามปุส',
                  desc: 'ทายปี ค.ศ. วัดความแม่นยำและความไวระดับมิลลิวินาที ยิ่งทายเพี้ยนยิ่งโดนหักเหรียญ!',
                  bg: 'bg-[#047857]',
                },
                {
                  stage: 'QUIXORT' as GameStage,
                  roomNo: 'ROOM 3',
                  icon: '⚙️',
                  title: 'Quixort',
                  thaiTitle: 'สายพานคัดแยกของเล่นผีสิง',
                  desc: 'ภารกิจเรียงลำดับ Live Action หน้าเวที พร้อมระบบวางเดิมพันแทงข้าง PASS / FAIL และศึกชิงกระดิ่ง!',
                  bg: 'bg-[#6d28d9]',
                },
                {
                  stage: 'TRIVIA_MURDER' as GameStage,
                  roomNo: 'ROOM 4',
                  icon: '💀',
                  title: 'Trivia Murder Party',
                  thaiTitle: 'ลานประหารของครามปุส',
                  desc: 'คำถามชี้ชะตาและมินิเกมลานประหาร: เลขลับไม่ซ้ำ 1-10, ประมูลส่วยเลือด และกล่องต้องสาป!',
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
            STANDARD MODE A: MULTIPLE CHOICE (e.g. Trivia Murder Party)
        ========================================================== */}
        {round.inputMode === 'MODE_A_CHOICE' && !isEightDoorsGame && (
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
            MODE B: NUMBER / YEAR INPUT (Timejinx + ms Timestamp + Diff)
        ========================================================== */}
        {round.inputMode === 'MODE_B_YEAR' && (
          <div className="flex-1 flex flex-col justify-between gap-6">
            <div className="flex flex-col items-center justify-center py-5 px-8 rounded-3xl bg-gradient-to-r from-slate-950 via-amber-950/40 to-slate-950 border-2 border-amber-500/60 shadow-2xl">
              <div className="text-sm md:text-base font-mono uppercase tracking-widest text-amber-200 font-bold mb-1">
                {round.status === 'REVEALED'
                  ? '✨ ปี ค.ศ. เฉลยที่ถูกต้อง (TRUE YEAR) ✨'
                  : '⏳ ทายปี ค.ศ. 4 หลัก — วัดความแม่นยำและความเร็วระดับมิลลิวินาที (ms)'}
              </div>

              {round.status === 'REVEALED' ? (
                <div className="text-6xl md:text-8xl font-mono font-black text-amber-300 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] tracking-widest">
                  {round.targetYear}
                </div>
              ) : (
                <div className="text-5xl md:text-7xl font-mono font-black text-slate-500 tracking-widest">
                  ? ? ? ?
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm md:text-base text-slate-200">
                <span className="px-3.5 py-1 rounded-full bg-red-950/90 border border-red-700/70 text-red-200 font-bold">
                  บทลงโทษ: ห่างปีละ -{round.yearPenaltyPerDiff} เหรียญ
                </span>
                <span className="px-3.5 py-1 rounded-full bg-amber-950/90 border border-amber-600/70 text-amber-200 font-bold">
                  โบนัสทีมแม่น & ไวที่สุด: +{round.yearFastestBonus} เหรียญ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {TEAM_ORDER.map((tid) => {
                const team = teams[tid];
                const sub = submissions[tid];
                const speedRank = timejinxRanking.speedRankMap[tid];
                const isBest = round.status === 'REVEALED' && timejinxRanking.bestTeamId === tid;
                const submittedYear = sub ? Number(sub.value) : null;
                const absDiff =
                  submittedYear !== null ? Math.abs(submittedYear - round.targetYear) : null;

                return (
                  <div
                    key={tid}
                    className={`relative rounded-3xl p-5 border-2 transition-all duration-500 flex flex-col justify-between ${
                      isBest
                        ? 'bg-gradient-to-b from-amber-950/90 via-emerald-950/80 to-slate-950 border-amber-300 shadow-[0_0_35px_rgba(234,179,8,0.45)] scale-[1.02]'
                        : sub
                        ? 'bg-slate-900/95 border-amber-500/60'
                        : 'bg-slate-900/70 border-slate-800'
                    }`}
                  >
                    {isBest && (
                      <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                        <span className="px-4 py-1 rounded-full bg-amber-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1">
                          <Crown className="w-4 h-4" /> แม่นยำ & ไวที่สุด!
                        </span>
                      </div>
                    )}

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
                      {speedRank && (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-800 border border-amber-500/40 font-mono text-xs font-bold text-amber-300 whitespace-nowrap shrink-0">
                          ส่งอันดับ #{speedRank}
                        </span>
                      )}
                    </div>

                    <div className="my-2 py-4 rounded-2xl bg-black/60 border border-white/10 text-center">
                      {!sub ? (
                        <div className="text-xl font-bold text-slate-200 animate-pulse py-2">
                          กำลังกรอกตัวเลข...
                        </div>
                      ) : round.status !== 'REVEALED' ? (
                        <div>
                          <div className="text-3xl font-extrabold text-emerald-400 flex items-center justify-center gap-2">
                            <Lock className="w-6 h-6" /> ล็อกคำตอบแล้ว
                          </div>
                          <div className="text-sm font-mono text-amber-300 mt-1">
                            Timestamp: {(sub.elapsedMs / 1000).toFixed(3)}s ({sub.elapsedMs} ms)
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs text-slate-300">ปีที่ตอบ:</div>
                          <div className="text-4xl md:text-5xl font-mono font-black text-white tracking-wider my-1">
                            {submittedYear}
                          </div>
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-extrabold mt-1 ${
                              absDiff === 0
                                ? 'bg-emerald-400 text-slate-950'
                                : absDiff! <= 3
                                ? 'bg-amber-500/30 border border-amber-400 text-amber-200'
                                : 'bg-red-900/70 border border-red-500 text-red-200'
                            }`}
                          >
                            {absDiff === 0
                              ? '🎯 ตรงเป๊ะ! (คลาดเคลื่อน 0 ปี)'
                              : `ผลต่าง: ห่าง ${absDiff} ปี (-${absDiff! * round.yearPenaltyPerDiff} เหรียญ)`}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-2 border-t border-slate-800">
                      <span>ความเร็วที่ส่ง:</span>
                      <span className="text-amber-300 font-bold">
                        {sub ? `${(sub.elapsedMs / 1000).toFixed(3)} วินาที` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
            MODE D: WAGERING / SECRET NUMBER (1-10, Quixort Bet, Bribe)
        ========================================================== */}
        {round.inputMode === 'MODE_D_SECRET' && (
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
