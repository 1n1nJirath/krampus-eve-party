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
  BookOpen,
  Music,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { soundFX } from '../utils/sound';
import { bgmEngine, BgmTrack } from '../utils/bgm';
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
import { computeFinaleTeamsRanking } from '../logic/adminFlowLogic';
import { CountdownTimer } from '../components/CountdownTimer';
import {
  SnowPineForestFrame,
  StageCardIllustration,
  TeamSouthParkAvatar,
} from '../components/SouthParkArt';
import { PhaseBriefingModal, getPhaseBriefingKey } from '../components/PhaseBriefingModal';
import { SafeActionButton } from '../components/SafeActionButton';
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
  const { state } = useGame();
  const {
    round,
    teams,
    submissions,
    buzzerQueue,
    showLeaderboardOverlay,
    krampusAlertMessage,
  } = state;

  // Read-only local projector mute (does not mutate or broadcast Host state)
  const [localMuted, setLocalMuted] = useState(false);
  const effectiveSound = state.soundEnabled && !localMuted;
  useEffect(() => {
    soundFX.enabled = effectiveSound;
  }, [effectiveSound]);

  // Phase Rules & Demo Briefing Screen state (local dismissal only; paused until Host starts)
  const activePhaseKey = getPhaseBriefingKey(round);
  const [dismissedPhases, setDismissedPhases] = useState<Record<string, boolean>>({});
  const [forceBriefing, setForceBriefing] = useState(false);

  // BGM Engine UI state & Synchronization
  const [showBgmMenu, setShowBgmMenu] = useState(false);
  const [bgmInfo, setBgmInfo] = useState(() => ({
    currentTrack: bgmEngine.getCurrentTrack(),
    isPlaying: bgmEngine.getCurrentTrack() !== 'OFF' && !bgmEngine.isMuted(),
    volume: bgmEngine.getVolume(),
    autoMode: bgmEngine.getAutoMode(),
    isUsingFallback: false,
  }));

  useEffect(() => {
    return bgmEngine.subscribe(setBgmInfo);
  }, []);

  useEffect(() => {
    setForceBriefing(false);
  }, [activePhaseKey]);

  useEffect(() => {
    if (round.briefingOpen && activePhaseKey) {
      setDismissedPhases((prev) => ({ ...prev, [activePhaseKey]: false }));
    }
  }, [round.briefingOpen, activePhaseKey]);

  const showPhaseBriefing = Boolean(
    activePhaseKey && (forceBriefing || (round.briefingOpen && !dismissedPhases[activePhaseKey]))
  );

  useEffect(() => {
    if (!effectiveSound) {
      bgmEngine.stop();
      return;
    }
    bgmEngine.syncWithGameState(round.gameStage, round.status, null, showPhaseBriefing);
  }, [effectiveSound, round.gameStage, round.status, showPhaseBriefing]);

  const isSpecialGame3View =
    round.gameStage === 'QUIXORT' &&
    Boolean(round.toyFactory) &&
    !(round.status === 'IDLE' && round.toyFactory!.phase === 'TOPIC_SELECT');
  const isSpecialGame4View =
    round.gameStage === 'TRIVIA_MURDER' &&
    Boolean(round.lastMan) &&
    !(round.lastMan!.phase === 'PART1_TRIVIA' && round.status === 'IDLE');
  const isStandbyPrep =
    round.gameStage !== 'LOBBY' &&
    round.gameStage !== 'WORLD_MAP' &&
    round.gameStage !== 'FINALE' &&
    round.status === 'IDLE' &&
    !isSpecialGame3View &&
    !isSpecialGame4View;

  const activeStageArt =
    round.gameStage === 'POLL_MINE'
      ? '/art/manor-interior.png'
      : round.gameStage === 'TIMEJINX'
      ? '/art/winter-forest.png'
      : round.gameStage === 'QUIXORT'
      ? '/art/manor-snowy.png'
      : '/art/manor-exterior.png';

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
    <div className="min-h-screen flex flex-col justify-between bg-[#1e1828] text-[#EFE2D2] relative overflow-hidden select-none">
      {/* The Christmas Manor Concept Art Backdrop for Active Game Stages */}
      {round.gameStage !== 'LOBBY' && round.gameStage !== 'WORLD_MAP' && (
        <>
          <div
            className="pointer-events-none fixed inset-0 bg-cover bg-center scale-[1.01] transition-all duration-700"
            style={{ backgroundImage: `url('${activeStageArt}')` }}
          />
          <div
            className="pointer-events-none fixed inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(35,28,46,0.82) 0%, rgba(28,22,38,0.72) 50%, rgba(25,19,34,0.88) 100%)',
            }}
          />
        </>
      )}

      {/* Phase Rules & Demo Briefing Modal */}
      {showPhaseBriefing && activePhaseKey && (
        <PhaseBriefingModal
          phaseKey={activePhaseKey}
          onStartGame={() => {
            setDismissedPhases((prev) => ({ ...prev, [activePhaseKey]: true }));
            setForceBriefing(false);
          }}
        />
      )}

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
          1. TOP HEADER BAR (Hidden on illustrated LOBBY & WORLD_MAP)
      ============================================================ */}
      {round.gameStage === 'LOBBY' || round.gameStage === 'WORLD_MAP' ? (
        <div className="fixed top-3 right-4 z-30 flex items-center gap-2">
          <button
            onClick={() => setLocalMuted((m) => !m)}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-2 border-black shadow-[3px_3px_0px_#000] transition"
            title={effectiveSound ? 'ปิดเสียงหน้าจอนี้' : 'เปิดเสียงหน้าจอนี้'}
          >
            {effectiveSound ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-red-400" />
            )}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-2 border-black shadow-[3px_3px_0px_#000] transition"
            title="เต็มจอ (Fullscreen)"
          >
            <Maximize2 className="w-5 h-5 text-amber-400" />
          </button>
        </div>
      ) : (
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 bg-[#352D45]/92 border-b-[3px] border-[#D8C6B5]/40 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EFE2D2] border-[3px] border-[#352D45] shadow-[0_4px_0_#1e1828] flex items-center justify-center p-1 overflow-hidden">
            <img src="/art/char-4.png" alt="Host" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-[#B94B50] border border-[#EFE2D2]/50 text-[#EFE2D2] font-manor-display text-xs md:text-sm font-bold tracking-wider uppercase">
                {stageInfo.badge}
              </span>
              {isEightDoorsGame ? (
                <span className="px-3 py-0.5 rounded-full bg-[#E5B86C]/20 border border-[#E5B86C] text-[#E5B86C] font-manor-display text-xs md:text-sm font-bold">
                  {subRound === 'SUB1_SURVIVAL' && 'ด่านย่อยที่ 1 • ค้นหาอันดับ 1-3'}
                  {subRound === 'SUB2_AUCTION' &&
                    `ด่านย่อยที่ 2.${round.auctionIteration || 1} • ประมูลชิงสิทธิ์`}
                  {subRound === 'SUB2_DOOR_AND_BET' &&
                    `ด่านย่อยที่ 2.${round.auctionIteration || 1} • เปิดประตู & แทงข้าง (อันดับ 2-4)`}
                  {subRound === 'SUB3_POLARITY' && 'ด่านย่อยที่ 3 • วัดใจขั้วตรงข้าม (#1 & #8)'}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-[#241e30] border border-[#D8C6B5]/30 text-[#D8C6B5] font-mono text-xs md:text-sm font-bold">
                  {round.inputMode === 'MODE_A_CHOICE' && `Mode A • ${round.choiceCount} Choices`}
                  {round.inputMode === 'MODE_B_YEAR' && 'Mode B • Timejinx Year'}
                  {round.inputMode === 'MODE_C_BUZZER' && 'Mode C • Speed Buzzer'}
                  {round.inputMode === 'MODE_D_SECRET' && 'Mode D • Secret / Wager'}
                </span>
              )}
            </div>
            <h1 className="font-manor-display text-2xl md:text-3xl font-bold text-[#EFE2D2] tracking-tight mt-0.5">
              {round.title || stageInfo.name}
            </h1>
          </div>
        </div>

        {/* Center Countdown Timer */}
        <div className="flex items-center gap-6">
          <CountdownTimer size="lg" />
        </div>

        {/* Minimalist Projector Controls (Rules & Demo + Sound + Fullscreen) */}
        <div className="flex items-center gap-2.5">
          {activePhaseKey && (
            <button
              onClick={() => setForceBriefing(true)}
              className="px-3.5 py-2 rounded-xl bg-[#E5B86C] hover:bg-[#f0c77e] text-[#352D45] border-2 border-[#352D45] shadow-[0_3px_0_#1e1828] font-manor-display font-bold text-xs md:text-sm flex items-center gap-1.5 transition"
              title="เปิดหน้าอธิบายกติกาและตัวอย่าง Demo ของเฟสนี้"
            >
              <BookOpen className="w-4 h-4" />
              <span>กติกา & Demo</span>
            </button>
          )}
          <button
            onClick={() => setLocalMuted((m) => !m)}
            className="p-2.5 rounded-xl bg-[#241e30] hover:bg-[#443a59] text-[#EFE2D2] border border-[#D8C6B5]/30 transition"
            title={effectiveSound ? 'ปิดเสียงเอฟเฟกต์หน้าจอนี้' : 'เปิดเสียงเอฟเฟกต์หน้าจอนี้'}
          >
            {effectiveSound ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-red-400" />
            )}
          </button>

          {/* BGM Music Control Button */}
          <div className="relative">
            <button
              onClick={() => setShowBgmMenu((v) => !v)}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 ${
                bgmInfo.isPlaying
                  ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-[#241e30] border-[#D8C6B5]/30 text-slate-400'
              }`}
              title="ระบบเพลงประกอบ BGM"
            >
              <Music className={`w-5 h-5 ${bgmInfo.isPlaying ? 'animate-pulse text-amber-300' : ''}`} />
              <span className="text-[11px] font-mono font-bold hidden md:inline">
                {bgmInfo.currentTrack !== 'OFF' ? bgmInfo.currentTrack : 'BGM'}
              </span>
            </button>

            {showBgmMenu && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl bg-slate-950/95 border-2 border-amber-400/60 p-4 shadow-2xl backdrop-blur-md z-50 space-y-3 text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                    <Music className="w-4 h-4" />
                    <span>เพลงประกอบ (BGM)</span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                      bgmInfo.isUsingFallback
                        ? 'bg-purple-950 text-purple-300 border border-purple-600'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                    }`}
                  >
                    {bgmInfo.isUsingFallback ? 'Ambient Synth' : 'MP3 Audio'}
                  </span>
                </div>

                {/* Track Switcher */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 font-semibold">เลือกเพลง:</div>
                  <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                    {(['LOUNGE', 'SUSPENSE', 'PANIC', 'VICTORY'] as BgmTrack[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          bgmEngine.setAutoMode(false);
                          bgmEngine.playTrack(t);
                        }}
                        className={`p-2 rounded-xl border text-center transition ${
                          bgmInfo.currentTrack === t
                            ? 'bg-amber-400 text-slate-950 border-white font-black'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                        }`}
                      >
                        {t === 'LOUNGE' && '☕ คฤหาสน์ (Lobby)'}
                        {t === 'SUSPENSE' && '⏳ กดดัน (Live)'}
                        {t === 'PANIC' && '🚨 เร่งด่วน (Panic)'}
                        {t === 'VICTORY' && '🏆 ชัยชนะ (Finale)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                    <span>ระดับเสียง BGM</span>
                    <span className="font-mono text-amber-300">
                      {Math.round(bgmInfo.volume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={bgmInfo.volume}
                    onChange={(e) => bgmEngine.setVolume(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !bgmInfo.autoMode;
                      bgmEngine.setAutoMode(next);
                      if (next) {
                        bgmEngine.syncWithGameState(round.gameStage, round.status, null, false);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg border font-bold ${
                      bgmInfo.autoMode
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-700'
                    }`}
                  >
                    {bgmInfo.autoMode ? '✓ เปลี่ยนตามเกมอัตโนมัติ' : '○ คุมเพลงเอง'}
                  </button>

                  <button
                    type="button"
                    onClick={() => bgmEngine.stop()}
                    className="px-2.5 py-1 rounded-lg bg-red-950 hover:bg-red-900 text-red-300 border border-red-700 font-bold"
                  >
                    ปิดเพลง
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-[#241e30] hover:bg-[#443a59] text-[#EFE2D2] border border-[#D8C6B5]/30 transition"
            title="เต็มจอ (Fullscreen)"
          >
            <Maximize2 className="w-5 h-5 text-[#E5B86C]" />
          </button>
        </div>
      </header>
      )}

      {/* ============================================================
          2. MAIN STAGE CONTENT
      ============================================================ */}
      <main
        className={
          round.gameStage === 'LOBBY' || round.gameStage === 'WORLD_MAP'
            ? 'relative z-10 flex-1 flex flex-col w-full'
            : 'relative z-10 flex-1 flex flex-col justify-between px-6 lg:px-10 py-4 max-w-[1800px] w-full mx-auto gap-4'
        }
      >
        {/* ==========================================================
            STAGE 0.1: LOBBY VIEW (The Christmas Manor UI Kit)
        ========================================================== */}
        {round.gameStage === 'LOBBY' && (
          <SnowPineForestFrame variant="LOBBY">
            {/* Title */}
            <div className="text-center pt-1 pb-2">
              <div className="inline-block px-5 py-1 rounded-full bg-[#352D45] border-2 border-[#D8C6B5] text-[#E5B86C] font-manor-display text-xs md:text-sm tracking-[0.2em] uppercase mb-2 shadow-[0_3px_0_#1e1928]">
                The Christmas Manor • Live Party Survival
              </div>
              <h1
                className="font-manor-display text-5xl md:text-7xl font-bold text-[#EFE2D2] tracking-wide leading-none"
                style={{
                  textShadow: '0 5px 0 #352D45, 0 10px 24px rgba(0,0,0,0.6)',
                }}
              >
                THE KRAMPUS EVE
              </h1>
              <h2
                className="font-manor-display text-2xl md:text-3xl font-bold text-[#E5B86C] mt-2"
                style={{
                  textShadow: '0 3px 0 #352D45, 0 6px 14px rgba(0,0,0,0.5)',
                }}
              >
                มหากาพย์การเอาชีวิตรอดในคฤหาสน์คริสต์มาส
              </h2>
            </div>

            {/* Center 2x2 Aged Cream Paper-Cut Team Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl w-full mx-auto my-auto py-3">
              {TEAM_ORDER.map((tid) => {
                const team = teams[tid];
                const isRegistered = Boolean(team.isRegistered);

                return (
                  <div
                    key={tid}
                    className={`rounded-2xl border-[3px] border-[#352D45] shadow-[0_7px_0_#352D45] overflow-hidden flex flex-col transition-all ${
                      isRegistered ? 'bg-[#EFE2D2]' : 'bg-[#D8C6B5]/95'
                    }`}
                  >
                    {/* Card Header Ribbon */}
                    <div
                      className={`px-5 py-2.5 border-b-[3px] border-[#352D45] flex items-center justify-between gap-2 ${
                        isRegistered ? 'bg-[#B94B50]' : 'bg-[#352D45]'
                      }`}
                    >
                      <span className="font-manor-display text-lg md:text-xl font-bold text-[#EFE2D2] truncate">
                        TEAM {team.number}: {isRegistered ? `${team.name} ${team.icon}` : 'กำลังรอลงทะเบียน...'}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border-2 border-[#352D45] shrink-0 ${
                          isRegistered
                            ? 'bg-[#536B59] text-[#EFE2D2]'
                            : 'bg-[#77718B] text-[#EFE2D2]'
                        }`}
                      >
                        {isRegistered ? 'READY' : 'WAITING'}
                      </span>
                    </div>

                    {/* Card Body */}
                    <div className="px-5 py-4 flex-1 flex items-center justify-center min-h-[126px]">
                      {isRegistered ? (
                        <div className="flex items-center justify-center gap-6 w-full">
                          <TeamSouthParkAvatar
                            slotNumber={team.number}
                            className="w-24 h-24 shrink-0"
                          />
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-block px-4 py-1.5 rounded-xl bg-[#536B59] border-[2.5px] border-[#352D45] shadow-[0_4px_0_#352D45] font-manor-display text-2xl md:text-3xl font-bold text-[#EFE2D2]">
                              พร้อมลุย!
                            </span>
                            <span className="font-manor-score text-sm font-bold text-[#352D45]/80">
                              🪙 {team.coins.toLocaleString()} ฿ • 🛡️ {team.shields} เกราะ
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-4 opacity-75">
                          <TeamSouthParkAvatar
                            slotNumber={team.number}
                            className="w-16 h-16 grayscale opacity-70"
                          />
                          <div className="font-manor-display text-xl md:text-2xl font-bold text-[#352D45]">
                            สถานะ: กำลังค้นหาทีม...
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Paper Note */}
            <div className="pb-1 text-center">
              <span className="inline-block px-4 py-1.5 rounded-xl bg-[#EFE2D2]/95 border-2 border-[#352D45] shadow-[0_3px_0_#352D45] text-xs md:text-sm font-bold text-[#352D45]">
                (หาก Sub-GM สแกนเข้ามาเพิ่ม ชื่อทีมจะปรากฏใน Slot แทนสถานะรออัตโนมัติ)
              </span>
            </div>
          </SnowPineForestFrame>
        )}

        {/* ==========================================================
            STAGE 0.2: MANSION WORLD MAP VIEW (The Christmas Manor UI Kit)
        ========================================================== */}
        {round.gameStage === 'WORLD_MAP' && (() => {
          const clearedList = state.clearedStages || [];
          const stageOrder: GameStage[] = ['POLL_MINE', 'TIMEJINX', 'QUIXORT', 'TRIVIA_MURDER'];
          const firstUnclearedStage =
            stageOrder.find((s) => !clearedList.includes(s)) || 'TRIVIA_MURDER';

          const rooms = [
            {
              stage: 'POLL_MINE' as GameStage,
              no: 'ด่านที่ 1',
              eng: 'THE 8 DOORS OF DOOM',
              th: '8 ประตูวัดใจครามปุส',
            },
            {
              stage: 'TIMEJINX' as GameStage,
              no: 'ด่านที่ 2',
              eng: 'THE CHRONO CRUSH',
              th: 'กงล้อกาลเวลาของครามปุส',
            },
            {
              stage: 'QUIXORT' as GameStage,
              no: 'ด่านที่ 3',
              eng: 'THE TOY FACTORY CHAOS',
              th: 'สายพานคัดแยกของเล่นผีสิง',
            },
            {
              stage: 'TRIVIA_MURDER' as GameStage,
              no: 'ด่านที่ 4',
              eng: 'THE LAST MAN STANDING',
              th: 'ลานประหารคริสต์มาส',
            },
          ];

          return (
            <SnowPineForestFrame variant="WORLD_MAP">
              {/* Top Centered Title */}
              <div className="text-center pt-1 pb-2">
                <h1
                  className="font-manor-display text-5xl md:text-6xl font-bold text-[#EFE2D2] tracking-wide leading-none"
                  style={{
                    textShadow: '0 5px 0 #352D45, 0 10px 24px rgba(0,0,0,0.6)',
                  }}
                >
                  THE KRAMPUS EVE
                </h1>
                <div className="inline-block mt-2 px-5 py-1 rounded-xl bg-[#352D45] border-2 border-[#D8C6B5] shadow-[0_4px_0_#1e1928]">
                  <h2 className="font-manor-display text-xl md:text-2xl font-bold text-[#E5B86C]">
                    แผนที่ผจญภัยในคฤหาสน์ครามปุส
                  </h2>
                </div>
              </div>

              {/* 4 Tall Vertical Stage Cards in 1 Horizontal Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full mx-auto my-auto">
                {rooms.map((room) => {
                  const isCleared = clearedList.includes(room.stage);
                  const isPlaying = !isCleared && room.stage === firstUnclearedStage;
                  const cardStatus: 'CLEARED' | 'PLAYING' | 'LOCKED' = isCleared
                    ? 'CLEARED'
                    : isPlaying
                    ? 'PLAYING'
                    : 'LOCKED';

                  return (
                    <div
                      key={room.stage}
                      className={`rounded-2xl p-4 border-[3px] border-[#352D45] text-center flex flex-col justify-between min-h-[295px] ${
                        isCleared
                          ? 'bg-[#536B59] shadow-[0_7px_0_#352D45]'
                          : isPlaying
                          ? 'bg-[#EFE2D2] shadow-[0_0_28px_rgba(229,184,108,0.85),0_7px_0_#352D45]'
                          : 'bg-[#77718B]/95 shadow-[0_7px_0_#352D45]'
                      }`}
                    >
                      {/* Card Header */}
                      <div>
                        <div
                          className={`inline-block px-3 py-0.5 rounded-lg text-sm font-manor-display font-bold border-2 border-[#352D45] mb-1 ${
                            isPlaying
                              ? 'bg-[#B94B50] text-[#EFE2D2]'
                              : 'bg-[#352D45] text-[#E5B86C]'
                          }`}
                        >
                          {room.no}
                        </div>
                        <div
                          className={`font-manor-display text-sm font-bold uppercase tracking-tight mt-0.5 ${
                            isPlaying ? 'text-[#B94B50]' : 'text-[#E5B86C]'
                          }`}
                        >
                          {room.eng}
                        </div>
                        <div
                          className={`text-xs font-bold mt-0.5 ${
                            isPlaying ? 'text-[#352D45]' : 'text-[#EFE2D2]'
                          }`}
                        >
                          {room.th}
                        </div>
                      </div>

                      {/* Center Illustration */}
                      <div className="my-auto py-1">
                        <StageCardIllustration stage={room.stage} status={cardStatus} />
                      </div>

                      {/* Card Footer Status */}
                      <div className="pt-1">
                        {isCleared ? (
                          <div className="px-3 py-1.5 rounded-xl bg-[#352D45] border-2 border-[#D8C6B5] font-manor-display text-base font-bold text-[#E5B86C]">
                            ผ่านแล้ว ✓ (CLEARED)
                          </div>
                        ) : isPlaying ? (
                          <div className="px-3 py-1.5 rounded-xl bg-[#B94B50] border-2 border-[#352D45] shadow-[0_3px_0_#352D45] font-manor-display text-base font-bold text-[#EFE2D2]">
                            กำลังเล่น ⚡ (PLAYING)
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 rounded-xl bg-[#352D45]/80 border-2 border-[#352D45] font-manor-display text-base font-bold text-[#D9D6DD]">
                            ยังไม่ปลดล็อก (LOCKED)
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Aged Cream 2-Column Scoreboard Table */}
              <div className="max-w-4xl w-full mx-auto pt-2 pb-1">
                <div className="grid grid-cols-1 md:grid-cols-2 bg-[#EFE2D2] rounded-2xl border-[3px] border-[#352D45] shadow-[0_6px_0_#352D45] overflow-hidden">
                  {TEAM_ORDER.map((tid) => {
                    const t = teams[tid];
                    return (
                      <div
                        key={tid}
                        className="flex items-center justify-between border border-[#352D45]/40 px-4 py-2"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <TeamSouthParkAvatar slotNumber={t.number} className="w-10 h-10 shrink-0" />
                          <span className="font-manor-display font-bold text-base md:text-lg text-[#352D45] truncate">
                            {t.isRegistered ? t.name : `TEAM ${t.number}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 border-l-2 border-[#352D45]/30 pl-3 shrink-0 font-manor-score font-extrabold text-xl text-[#352D45]">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#E5B86C] border-2 border-[#352D45] text-xs font-black text-[#352D45]">
                            ฿
                          </span>
                          <span>{t.coins.toLocaleString()} ฿</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SnowPineForestFrame>
          );
        })()}

        {/* ==========================================================
            ACTIVE GAME STAGES (POLL_MINE, TIMEJINX, QUIXORT, TRIVIA_MURDER)
        ========================================================== */}
        {round.gameStage !== 'LOBBY' && round.gameStage !== 'WORLD_MAP' && (
          isStandbyPrep ? (
            <div className="flex-1 flex flex-col items-center justify-center my-auto py-6">
              <div className="max-w-4xl w-full rounded-3xl bg-[#EFE2D2] border-4 border-[#352D45] shadow-[0_12px_0_#352D45,0_25px_50px_rgba(0,0,0,0.85)] p-7 md:p-10 text-center text-[#352D45] space-y-6">
                <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#B94B50] border-2 border-[#352D45] text-[#EFE2D2] font-manor-display text-sm md:text-base font-bold uppercase tracking-wider shadow-[0_3px_0_#352D45]">
                  <Clock className="w-4 h-4 text-[#E5B86C]" />
                  <span>โหมดเตรียมความพร้อม (STANDBY • ยังไม่เริ่มจับเวลา)</span>
                </div>

                <div>
                  <div className="text-sm font-manor-display font-bold text-[#77718B] uppercase tracking-widest">
                    {stageInfo.badge}
                  </div>
                  <h2 className="font-manor-display text-3xl md:text-5xl font-bold text-[#352D45] mt-1">
                    {round.title || stageInfo.name}
                  </h2>
                  <p className="text-base md:text-lg font-bold text-[#B94B50] mt-2 max-w-2xl mx-auto">
                    {round.subtitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                  {TEAM_ORDER.map((tid) => {
                    const t = teams[tid];
                    return (
                      <div
                        key={tid}
                        className="rounded-2xl bg-white/80 border-2 border-[#352D45] p-3 flex flex-col items-center gap-1.5 shadow-[0_4px_0_#D8C6B5]"
                      >
                        <TeamSouthParkAvatar slotNumber={t.number} className="w-16 h-16" />
                        <div className="font-manor-display font-bold text-sm text-[#352D45] truncate w-full">
                          {t.icon} {t.name}
                        </div>
                        <div className="font-manor-score font-extrabold text-sm text-[#B94B50]">
                          🪙 {t.coins.toLocaleString()} ฿ • 🛡️ {t.shields}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  {activePhaseKey && (
                    <SafeActionButton
                      type="button"
                      showSpinner={false}
                      onClick={() => setForceBriefing(true)}
                      className="px-6 py-3.5 rounded-2xl bg-[#D8C6B5] hover:bg-[#ccb6a1] border-[3px] border-[#352D45] shadow-[0_5px_0_#352D45] active:translate-y-1 active:shadow-none text-[#352D45] font-manor-display text-base md:text-lg font-bold flex items-center gap-2 transition-all"
                    >
                      <BookOpen className="w-5 h-5" />
                      <span>เปิดหน้าอธิบายกติกา & Demo</span>
                    </SafeActionButton>
                  )}
                  <div className="px-7 py-3.5 rounded-2xl bg-[#352D45]/95 border-[3px] border-[#E5B86C] shadow-[0_6px_0_#1e1828] text-[#EFE2D2] font-manor-display text-lg md:text-xl font-bold flex items-center gap-3">
                    <Clock className="w-6 h-6 text-[#E5B86C] animate-pulse" />
                    <span>⏳ รอ Host กดเริ่มเปิดโจทย์ &amp; จับเวลาจากหน้า /admin...</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <>
        {/* Question Banner (Hidden for Game 4 LMS & Finale which use dedicated 10-foot TV Stage Cards) */}
        {!(round.gameStage === 'TRIVIA_MURDER' && round.lastMan) &&
          round.gameStage !== 'FINALE' && (
            <div className="relative rounded-3xl bg-[#352D45]/95 border-[3px] border-[#D8C6B5] shadow-[0_7px_0_#1e1828,0_14px_35px_rgba(0,0,0,0.75)] p-5 md:p-6 text-center">
              <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-[#B94B50] border-2 border-[#EFE2D2]/80 text-[#EFE2D2] font-manor-display text-base md:text-xl font-bold mb-2 shadow">
                <Sparkles className="w-5 h-5 text-[#E5B86C] shrink-0" />
                <span>{round.subtitle}</span>
              </div>
              <h2 className="font-manor-display text-2xl md:text-4xl lg:text-5xl font-bold text-[#EFE2D2] leading-tight tracking-tight drop-shadow-[0_3px_0_#1e1828]">
                {round.questionText}
              </h2>
            </div>
          )}

        {/* ==========================================================
            GAME 1 SPECIAL: THE DOORS OF DOOM (8-12 Doors Board + 3 Sub-Rounds)
        ========================================================== */}
        {isEightDoorsGame && (() => {
          const suggested = getSuggestedSafeRange(round.choiceCount, subRound);
          const safeMin = round.safeRankMin ?? suggested.min;
          const safeMax = round.safeRankMax ?? suggested.max;
          const snakeOrder = round.snakeDraftOrder || [];
          const snakeIdx = round.snakeDraftIndex ?? 0;
          const isSnakeSub = subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT';
          const currentTurnTid =
            isSnakeSub && round.status === 'ACTIVE' && snakeIdx < snakeOrder.length
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
            {/* Live Sub-Round Status Banner (Snake Draft Turn / Polarity 12 Chairs / Auction Live Leader) */}
            {(subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT') && snakeOrder.length > 0 && (
              <div className="rounded-2xl bg-slate-900/95 border-2 border-amber-400/70 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono font-black text-xs">
                    {subRound === 'SUB2_SNAKE_DRAFT' ? 'SNAKE DRAFT 2' : 'SNAKE DRAFT 1'} • คิว{' '}
                    {Math.min(snakeIdx + 1, snakeOrder.length)}/{snakeOrder.length}
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
                  โซนปลอดภัย: อันดับ <span className="text-emerald-300 font-black">#{safeMin} – #{safeMax}</span> (+300 ฿)
                </div>
              </div>
            )}

            {subRound === 'SUB3_POLARITY' && (
              <div className="rounded-2xl bg-purple-950/75 border-2 border-purple-400 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-2.5 text-sm md:text-base font-black text-white">
                  <span>🪑 เก้าอี้ 12 ตัววางหน้ากระดาน: กลุ่มไหนมั่นใจมานั่งก่อนได้เลย (1 ที่นั่ง/กลุ่ม ห้ามซ้ำ!)</span>
                </div>
                <div className="text-xs md:text-sm font-black text-amber-300">
                  ถูก 1 อันดับ +300 ฿ • ถูก 2 อันดับ +700 ฿
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
                  subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT'
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

                    {/* Sub-Round 1 & 2: Snake Draft Picks */}
                    {(subRound === 'SUB1_SURVIVAL' || subRound === 'SUB2_SNAKE_DRAFT') && (
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
            GAME 4: THE LAST MAN STANDING (10-Foot TV Readability Overhaul)
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
            const latestAction = lms.killFeed && lms.killFeed.length > 0 ? lms.killFeed[0] : null;

            return (
              <div className="flex-1 flex flex-col justify-between gap-5">
                {/* 10-Foot Single Live Action Banner / Toast (One event at a time, High Contrast) */}
                {latestAction && lms.phase !== 'PART1_BLACK_MARKET' && (
                  <div
                    key={latestAction.id}
                    className="rounded-3xl bg-black border-4 border-amber-400 px-6 py-4 shadow-[0_0_40px_rgba(245,158,11,0.45)] flex items-center justify-center gap-4 text-center"
                  >
                    <span className="text-4xl md:text-5xl shrink-0">{latestAction.icon}</span>
                    <div className="text-2xl md:text-3xl font-black text-white tracking-tight">
                      {latestAction.message}
                    </div>
                  </div>
                )}

                {/* Part 1 Top Status Strip: Safe Zone vs Killing Floor (Oversized 10-Foot Cards) */}
                {!isPart2 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {active.map((tid) => {
                      const ts = lms.teamStates[tid];
                      const t = teams[tid];
                      const curse = ts.activeCurse ? CURSE_CATALOG[ts.activeCurse] : null;
                      return (
                        <div
                          key={tid}
                          className={`rounded-3xl p-4 border-4 transition-all ${
                            ts.isGhost
                              ? 'bg-black/90 border-slate-700 opacity-75'
                              : ts.inKillingFloor
                              ? 'bg-red-950/95 border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)]'
                              : 'bg-emerald-950/95 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-xl md:text-2xl text-white truncate">
                              {t.icon} {t.name}
                            </span>
                            <span className="font-mono text-base md:text-lg font-black text-amber-300 shrink-0">
                              {t.coins.toLocaleString()} ฿
                            </span>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm md:text-base font-black">
                            <span className="px-3 py-1 rounded-xl bg-black text-rose-300 border border-rose-500/50">
                              {ts.isGhost ? '👻 วิญญาณ' : `❤️ ${ts.hearts}/4`}
                            </span>
                            {!ts.isGhost && (
                              <span
                                className={`px-3 py-1 rounded-xl ${
                                  ts.inKillingFloor
                                    ? 'bg-red-600 text-white'
                                    : 'bg-emerald-400 text-slate-950'
                                }`}
                              >
                                {ts.inKillingFloor ? '💀 ลานประหาร' : '🛡️ ปลอดภัย'}
                              </span>
                            )}
                            {ts.mirrorShield && (
                              <span className="px-2.5 py-1 rounded-xl bg-cyan-400 text-black">
                                🪞 โล่
                              </span>
                            )}
                            {ts.jetpacks > 0 && (
                              <span className="px-2.5 py-1 rounded-xl bg-amber-400 text-black">
                                🚀 x{ts.jetpacks}
                              </span>
                            )}
                          </div>
                          {curse && (
                            <div className="mt-2 text-sm font-black text-yellow-300 bg-purple-950 border border-purple-400 rounded-xl px-3 py-1 truncate">
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
                  <div className="flex-1 rounded-3xl bg-black/95 border-4 border-rose-500 p-10 flex flex-col items-center justify-center text-center gap-6 shadow-2xl">
                    <div className="text-8xl animate-bounce">👹</div>
                    <h2 className="text-5xl md:text-6xl font-black text-amber-300 tracking-tight">
                      ประกาศหักมุมจาก KRAMPUS!
                    </h2>
                    <p className="text-2xl md:text-3xl font-black text-white max-w-4xl leading-relaxed">
                      &ldquo;เงิน Holy Coins (฿) คือ{' '}
                      <span className="text-rose-400 underline">กระสุนในตลาดมืดและแต้มต่อ</span>{' '}
                      ทีมแรกที่วิ่งทะลุบันไดหนีตาย 25 ขั้น ชนะเลิศทันที!&rdquo;
                    </p>
                  </div>
                )}

                {/* PART1_TRIVIA / PART1_TRIVIA_REVEAL / PART1_MISERY_PULL (10-Foot High Contrast) */}
                {(lms.phase === 'PART1_TRIVIA' ||
                  lms.phase === 'PART1_TRIVIA_REVEAL' ||
                  lms.phase === 'PART1_MISERY_PULL') && (
                  <div className="flex-1 flex flex-col justify-between gap-5">
                    {lms.phase === 'PART1_MISERY_PULL' && (
                      <div className="rounded-3xl bg-red-600 border-4 border-yellow-300 p-6 text-center animate-pulse shadow-2xl">
                        <div className="text-3xl md:text-4xl font-black text-white">
                          😈 ลากเพื่อนตกนรก! {teams[lms.miseryPullTeamId || 'team1']?.name} เลือกดึง 1 ทีมลงลานประหาร!
                        </div>
                      </div>
                    )}

                    <div className="rounded-3xl bg-black/95 border-4 border-amber-400 p-7 md:p-9 text-center space-y-4 shadow-2xl">
                      <div className="inline-block px-4 py-1 rounded-full bg-rose-600 text-white text-sm md:text-base font-black uppercase tracking-wider">
                        คำถามคัดคนลงลานประหาร • รอบที่ {lms.part1Round}/4
                      </div>
                      {p1Q.imageUrl && (
                        <img
                          src={p1Q.imageUrl}
                          alt="Trivia"
                          className="max-h-52 mx-auto rounded-2xl border-2 border-slate-700 object-contain"
                        />
                      )}
                      <div className="text-3xl md:text-5xl font-black text-white leading-tight">
                        {p1Q.questionText}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {p1Q.choices.map((c) => {
                        const isRev = lms.phase !== 'PART1_TRIVIA';
                        const isCorrect = c.key === p1Q.correctKey;
                        const pickers = active.filter(
                          (tid) => String(submissions[tid]?.value || '') === c.key
                        );
                        return (
                          <div
                            key={c.key}
                            className={`rounded-3xl p-6 border-4 transition-all flex items-center justify-between gap-4 ${
                              isRev
                                ? isCorrect
                                  ? 'bg-emerald-950 border-emerald-400 shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                                  : 'bg-black/75 border-slate-800 opacity-60'
                                : 'bg-black/95 border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <span
                                className={`w-14 h-14 rounded-2xl font-mono font-black text-3xl flex items-center justify-center shrink-0 ${
                                  isRev && isCorrect
                                    ? 'bg-emerald-400 text-black'
                                    : 'bg-amber-400 text-black'
                                }`}
                              >
                                {c.key}
                              </span>
                              <span className="text-2xl md:text-3xl font-black text-white leading-snug">
                                {c.label}
                              </span>
                            </div>
                            {isRev && pickers.length > 0 && (
                              <div className="flex gap-2 shrink-0">
                                {pickers.map((tid) => (
                                  <span
                                    key={tid}
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 border-2 border-white/30 text-xl font-black text-white"
                                  >
                                    {teams[tid].icon} T{teams[tid].number}
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

                {/* PART1_BLACK_MARKET (Clean Catalog + Single Oversized Live Action Toast) */}
                {lms.phase === 'PART1_BLACK_MARKET' && (
                  <div className="flex-1 flex flex-col justify-between gap-5">
                    {/* Giant Single Live Action Spotlight Banner */}
                    <div className="rounded-3xl bg-black/95 border-4 border-amber-400 p-7 md:p-8 text-center shadow-[0_0_50px_rgba(245,158,11,0.35)]">
                      <div className="inline-block px-4 py-1 rounded-full bg-amber-400 text-black font-mono font-black text-sm uppercase tracking-widest mb-3">
                        ⚡ LIVE BLACK MARKET ACTION
                      </div>
                      {latestAction ? (
                        <div
                          key={latestAction.id}
                          className="flex flex-col md:flex-row items-center justify-center gap-4"
                        >
                          <span className="text-6xl md:text-7xl">{latestAction.icon}</span>
                          <span className="text-3xl md:text-5xl font-black text-white leading-tight">
                            {latestAction.message}
                          </span>
                        </div>
                      ) : (
                        <div className="text-2xl md:text-4xl font-black text-slate-300 py-2">
                          🛒 ตลาดมืดเปิดแล้ว! กดซื้อไอเทมบนมือถือเพื่อโจมตีหรือเอาชีวิตรอดทันที
                        </div>
                      )}
                    </div>

                    {/* Clean High-Contrast Item Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
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
                            className={`rounded-2xl p-4 border-2 flex flex-col justify-between text-center ${
                              left > 0
                                ? 'bg-black/95 border-purple-400'
                                : 'bg-black/50 border-slate-800 opacity-40'
                            }`}
                          >
                            <div className="text-4xl mb-1">{item.icon}</div>
                            <div className="font-black text-base text-white leading-snug">
                              {item.name}
                            </div>
                            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-mono font-black">
                              <span className="text-amber-300">{item.price} ฿</span>
                              <span className="text-slate-300">x{left}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PART1_MINIGAME / PART1_MINIGAME_REVEAL */}
                {(lms.phase === 'PART1_MINIGAME' || lms.phase === 'PART1_MINIGAME_REVEAL') && (
                  <div className="flex-1 rounded-3xl bg-black/95 border-4 border-red-500 p-8 flex flex-col justify-between gap-6">
                    {lms.part1Round === 1 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 my-auto">
                        {[1, 2, 3, 4].map((num) => {
                          const isPoison =
                            lms.phase === 'PART1_MINIGAME_REVEAL' &&
                            lms.poisonedChalices.includes(num);
                          const drinkers = active.filter((tid) => lms.chalicePicks[tid] === num);
                          return (
                            <div
                              key={num}
                              className={`rounded-3xl p-6 border-4 text-center space-y-3 ${
                                isPoison
                                  ? 'bg-purple-950 border-purple-400'
                                  : 'bg-slate-950 border-slate-700'
                              }`}
                            >
                              <div className="text-6xl">{isPoison ? '☠️' : '🍷'}</div>
                              <div className="text-2xl md:text-3xl font-black text-white">
                                ถ้วย #{num}
                              </div>
                              {lms.phase === 'PART1_MINIGAME_REVEAL' && (
                                <div className="text-lg font-black text-amber-300">
                                  {isPoison ? 'มียาพิษ! (-1 ❤️)' : 'ปลอดภัย!'}
                                </div>
                              )}
                              {lms.phase === 'PART1_MINIGAME_REVEAL' && drinkers.length > 0 && (
                                <div className="flex flex-wrap justify-center gap-2 pt-2">
                                  {drinkers.map((tid) => (
                                    <span
                                      key={tid}
                                      className="px-3 py-1 rounded-xl bg-black border border-white/20 text-base font-black text-white"
                                    >
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
                      <div className="my-auto text-center space-y-6">
                        <div className="text-4xl md:text-5xl font-black text-amber-300">
                          🤝 หักหลังแบ่งสมบัติ (SPLIT OR STEAL)
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                          {active.map((tid) => {
                            const pick = lms.splitStealPicks[tid];
                            if (!pick && lms.phase !== 'PART1_MINIGAME_REVEAL') return null;
                            return (
                              <div
                                key={tid}
                                className="rounded-3xl bg-slate-950 border-4 border-slate-700 p-6"
                              >
                                <div className="text-4xl">{teams[tid].icon}</div>
                                <div className="text-2xl font-black text-white mt-2">
                                  {teams[tid].name}
                                </div>
                                <div className="mt-3 text-xl font-black text-amber-300">
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
                      <div className="my-auto text-center space-y-5">
                        <div className="text-7xl">🎭</div>
                        <div className="text-4xl md:text-5xl font-black text-white">
                          ท้าทายความกล้า (Krampus Dare)
                        </div>
                        <div className="text-2xl md:text-3xl font-black text-amber-300">
                          {lms.phase === 'PART1_MINIGAME_REVEAL'
                            ? `ผลโหวต: 💚 ไว้ชีวิต ${
                                Object.values(lms.dareVotes).filter((v) => v === 'SPARE').length
                              } เสียง vs 💀 ประหาร ${
                                Object.values(lms.dareVotes).filter((v) => v === 'EXECUTE').length
                              } เสียง`
                            : 'ทีมโซนปลอดภัยกำลังโหวตว่าจะไว้ชีวิตหรือประหาร!'}
                        </div>
                      </div>
                    )}

                    {lms.part1Round === 4 && (
                      <div className="my-auto text-center space-y-6">
                        <div className="text-3xl md:text-4xl font-black text-orange-400">
                          🎲 แต้มลูกเต๋าของ Krampus:{' '}
                          <span className="text-6xl text-white ml-2">
                            {lms.krampusDiceRoll ?? '?'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                          {active.map((tid) => {
                            const roll = lms.teamDiceRolls[tid];
                            return (
                              <div
                                key={tid}
                                className="rounded-3xl bg-slate-950 border-4 border-slate-700 p-6"
                              >
                                <div className="text-xl font-black text-white">
                                  {teams[tid].icon} {teams[tid].name}
                                </div>
                                <div className="text-5xl font-black text-amber-300 mt-2">
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
                  <div className="flex-1 rounded-3xl bg-black/95 border-4 border-amber-400 p-10 flex flex-col items-center justify-center text-center gap-6">
                    <div className="text-7xl">💸</div>
                    <h2 className="text-4xl md:text-6xl font-black text-amber-300">
                      ภาษีคนงกของ KRAMPUS!
                    </h2>
                    <p className="text-xl md:text-2xl font-bold text-white">
                      ทีมใดถือเงินสดเกิน 1,000 ฿ ถูกหักเงินครึ่งหนึ่ง (50%) ทันที!
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl">
                      {lms.greedTaxReport.length === 0 ? (
                        <div className="col-span-2 text-emerald-300 font-black text-2xl">
                          ✨ ไม่มีทีมไหนถือเงินเกิน 1,000 ฿ — รอดภาษีทั้งหมด!
                        </div>
                      ) : (
                        lms.greedTaxReport.map((r) => (
                          <div
                            key={r.teamId}
                            className="rounded-2xl bg-slate-950 border-4 border-red-500 p-4 flex items-center justify-between text-xl"
                          >
                            <span className="font-black text-white">
                              {teams[r.teamId].icon} {teams[r.teamId].name}
                            </span>
                            <span className="font-mono font-black text-red-400">
                              {r.before} ฿ → {r.after} ฿
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* PART2: 10-FOOT SPLIT-SCREEN 25-STEP STAIRCASE + CLUE/QUESTION */}
                {isPart2 && (
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {/* Left: Clean 25-Step Staircase (No cluttered scroll log) */}
                    <div className="lg:col-span-5 rounded-3xl bg-black/95 border-4 border-slate-700 p-6 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-2xl font-black text-amber-300">
                          🪜 บันไดหนีตาย 25 ขั้น
                        </h3>
                        <span className="px-4 py-1.5 rounded-xl bg-red-600 text-white text-base font-black">
                          👹 Krampus: ขั้น {lms.krampusStep}
                        </span>
                      </div>

                      <div className="space-y-5 my-auto">
                        {active.map((tid) => {
                          const ts = lms.teamStates[tid];
                          const pct = Math.min(100, Math.max(0, (ts.step / 25) * 100));
                          return (
                            <div key={tid} className="space-y-2">
                              <div className="flex items-center justify-between text-lg md:text-xl font-black">
                                <span className={ts.isGhost ? 'text-purple-300' : 'text-white'}>
                                  {ts.isGhost ? '👻' : '🏃'} {teams[tid].icon} {teams[tid].name}
                                </span>
                                <span className="font-mono text-2xl text-amber-300">
                                  ขั้น {ts.step} / 25
                                </span>
                              </div>
                              <div className="h-8 rounded-full bg-slate-900 border-2 border-slate-600 relative overflow-hidden">
                                <div
                                  className={`h-full transition-all duration-500 ${
                                    ts.isGhost ? 'bg-purple-600' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                                <div
                                  className="absolute top-0 bottom-0 w-1.5 bg-red-500 shadow-[0_0_12px_#ef4444]"
                                  style={{
                                    left: `${Math.min(100, (lms.krampusStep / 25) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Oversized Clue / Question / 3 High-Contrast Options / Champion */}
                    <div className="lg:col-span-7 rounded-3xl bg-black/95 border-4 border-amber-400 p-7 flex flex-col justify-between gap-5">
                      {lms.phase === 'CHAMPION' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                          <div className="text-8xl animate-bounce">🏆</div>
                          <div className="text-base font-mono font-black text-amber-400 uppercase tracking-widest">
                            THE KRAMPUS EVE CHAMPION!
                          </div>
                          <div className="text-5xl md:text-6xl font-black text-white">
                            {teams[lms.winnerTeamId || 'team1']?.icon}{' '}
                            {teams[lms.winnerTeamId || 'team1']?.name}
                          </div>
                          <div className="text-2xl font-bold text-emerald-300">
                            วิ่งทะลุประตูขั้นที่ 25 สำเร็จเป็นทีมแรก!
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-3">
                            <div className="inline-block px-4 py-1.5 rounded-full bg-amber-400 text-black text-sm md:text-base font-black">
                              ข้อที่ {lms.part2QuestionIndex + 1} •{' '}
                              {lms.phase === 'PART2_CLUE'
                                ? 'เบาะแสตั้งต้น'
                                : lms.phase === 'PART2_QUESTION'
                                ? 'กดปุ่มสี A / B / C บนมือถือ!'
                                : 'เฉลย & ขยับขั้น!'}
                            </div>
                            <div className="rounded-2xl bg-slate-950 border-2 border-slate-700 p-5 text-xl md:text-2xl font-bold text-amber-200 leading-snug">
                              {p2Q.clueText}
                            </div>
                            {p2Q.imageUrl && (
                              <img
                                src={p2Q.imageUrl}
                                alt="Clue"
                                className="max-h-44 mx-auto rounded-2xl object-contain"
                              />
                            )}
                          </div>

                          {lms.phase !== 'PART2_CLUE' && (
                            <div className="space-y-4">
                              <div className="text-2xl md:text-4xl font-black text-white leading-tight">
                                {p2Q.questionText}
                              </div>
                              <div className="space-y-3">
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
                                      className={`rounded-2xl p-4 border-4 flex items-center gap-4 ${
                                        isRev && isCorrect
                                          ? 'bg-emerald-950 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.45)]'
                                          : 'bg-slate-950 border-slate-700'
                                      }`}
                                    >
                                      <span
                                        className={`w-12 h-12 rounded-xl font-mono font-black text-2xl flex items-center justify-center shrink-0 ${colorBadge}`}
                                      >
                                        {c.key}
                                      </span>
                                      <span className="font-black text-white text-xl md:text-2xl">
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
                    1 ลูก = บังคับเลขคู่/คี่ • 2 ลูก = ทีละ 5 ปี • 3 ลูก = ทีละ 10 ปี (ฝ่ากับดักสำเร็จรับ x2!)
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
                          {netTraps === 1 ? 'คู่/คี่ (Even/Odd)' : `Step ${step} ปี`}
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
                          โดนเล็ง: {trapsRecv} ลูก ({netTraps === 1 ? 'บังคับคู่/คี่' : `Step ${step} ปี`})
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
          )
        )}
      </main>

      {/* ============================================================
          3. PERSISTENT REALTIME LEADERBOARD & ECONOMY FOOTER (Hidden on LOBBY & WORLD_MAP)
      ============================================================ */}
      {round.gameStage !== 'LOBBY' && round.gameStage !== 'WORLD_MAP' && (
      <footer className="relative z-20 bg-[#352D45]/95 border-t-[3px] border-[#D8C6B5]/50 px-6 py-3 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 rounded-xl bg-[#E5B86C]/20 border border-[#E5B86C]/60 text-[#E5B86C]">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="font-manor-display text-xs uppercase tracking-wider text-[#E5B86C] font-bold">
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
                    <TeamSouthParkAvatar slotNumber={team.number} className="w-9 h-9 shrink-0" />
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
          4A. SIMPLIFIED FINAL LEADERBOARD (END OF GAME 4 / FINALE)
              Displays ONLY the final ranking order (1st, 2nd, 3rd, 4th)
              and team names/avatars with zero cluttered stats or coin breakdowns.
      ============================================================ */}
      {round.gameStage === 'FINALE' &&
        (() => {
          const finaleTeams = computeFinaleTeamsRanking(state);
          const rankLabels = ['1ST', '2ND', '3RD', '4TH'];
          return (
            <div className="fixed inset-0 z-40 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-y-auto">
              <div className="max-w-4xl w-full rounded-3xl bg-black border-4 border-amber-400 shadow-[0_0_90px_rgba(245,158,11,0.35)] p-8 md:p-12 space-y-8">
                <div className="text-center space-y-2 border-b-2 border-slate-800 pb-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400 text-black text-sm font-black uppercase tracking-widest">
                    <Crown className="w-5 h-5" /> FINAL RANKINGS • THE KRAMPUS EVE
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight">
                    สรุปอันดับผลการแข่งขันสุดท้าย
                  </h2>
                </div>

                <div className="space-y-4">
                  {finaleTeams.map((team, idx) => {
                    const rank = idx + 1;
                    const isChampion = rank === 1;
                    return (
                      <div
                        key={team.id}
                        className={`flex items-center justify-between gap-6 p-6 rounded-3xl border-4 transition-all ${
                          isChampion
                            ? 'bg-gradient-to-r from-amber-950/90 via-slate-900 to-black border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.4)] scale-[1.01]'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-6 min-w-0">
                          <div
                            className={`w-20 h-20 rounded-2xl font-mono font-black text-2xl md:text-3xl flex items-center justify-center border-4 shrink-0 ${
                              isChampion
                                ? 'bg-amber-400 text-black border-white'
                                : rank === 2
                                ? 'bg-slate-300 text-slate-950 border-white'
                                : rank === 3
                                ? 'bg-amber-700 text-white border-amber-400'
                                : 'bg-slate-900 text-slate-300 border-slate-700'
                            }`}
                          >
                            {rankLabels[idx] || `#${rank}`}
                          </div>
                          <TeamSouthParkAvatar
                            slotNumber={team.number}
                            className="w-16 h-16 md:w-20 md:h-20 shrink-0"
                          />
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-4xl md:text-5xl shrink-0">{team.icon}</span>
                            <span className="text-3xl md:text-5xl font-black text-white truncate">
                              {team.name}
                            </span>
                          </div>
                        </div>

                        {isChampion && (
                          <span className="px-5 py-2 rounded-2xl bg-amber-400 text-black font-black text-lg md:text-xl uppercase shrink-0">
                            🏆 CHAMPION
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ============================================================
          4B. CUMULATIVE SCOREBOARD POPUP / MODAL (BETWEEN MAIN GAMES)
              Triggered automatically when Game 1, 2, or 3 returns to Lobby.
      ============================================================ */}
      {showLeaderboardOverlay && round.gameStage !== 'FINALE' && (
        <div className="fixed inset-0 z-40 bg-black/92 backdrop-blur-xl flex flex-col items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-5xl w-full rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-black border-4 border-amber-400 shadow-[0_0_80px_rgba(234,179,8,0.35)] p-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5 mb-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-extrabold uppercase tracking-widest mb-2">
                  <Crown className="w-4 h-4" /> CUMULATIVE SCOREBOARD • คะแนนสะสมรวม
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white">
                  สรุปอันดับเหรียญสะสมหลังจบเกม ({(state.clearedStages || []).length}/4 ด่าน)
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              {sortedTeams.map((team, idx) => {
                const rank = idx + 1;
                const isFirst = rank === 1;

                return (
                  <div
                    key={team.id}
                    className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border-2 transition-all ${
                      isFirst
                        ? 'bg-gradient-to-r from-amber-950/90 via-emerald-950/70 to-slate-900 border-amber-400 shadow-[0_0_35px_rgba(234,179,8,0.35)] scale-[1.01]'
                        : 'bg-slate-900/90 border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-2xl font-mono font-black text-2xl flex items-center justify-center border-2 ${
                          isFirst
                            ? 'bg-amber-400 text-slate-950 border-white'
                            : 'bg-slate-800 text-slate-200 border-slate-600'
                        }`}
                      >
                        #{rank}
                      </div>
                      <TeamSouthParkAvatar slotNumber={team.number} className="w-14 h-14 shrink-0" />
                      <span className="text-4xl">{team.icon}</span>
                      <div>
                        <span className="text-2xl md:text-3xl font-black text-white">
                          {team.name}
                        </span>
                        <div className="text-sm text-slate-300 mt-1">
                          Team {team.number} • เกราะเด็กดี: 🛡️×{team.shields}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-4xl md:text-5xl font-black text-amber-300">
                        {team.coins.toLocaleString()} <span className="text-2xl">฿</span>
                      </div>
                      <div className="text-xs text-amber-400/80 uppercase tracking-wider">
                        TOTAL HOLY COINS
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
