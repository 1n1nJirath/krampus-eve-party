import React from 'react';
import { CheckCircle2, Lock, Map, QrCode, Sparkles, Unlock } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { TEAM_ORDER } from '../../data/initialData';
import { AdminTabId } from '../../logic/adminFlowLogic';
import { GameStage } from '../../types/game';
import { SafeActionButton } from '../SafeActionButton';

interface LobbyWorkspaceProps {
  onOpenQr: () => void;
  onJumpToGameTab: (tab: AdminTabId) => void;
}

const WORLD_STAGES: Array<{
  stage: GameStage;
  tab: AdminTabId;
  icon: string;
  title: string;
  desc: string;
}> = [
  {
    stage: 'POLL_MINE',
    tab: 'GAME1',
    icon: '🚪',
    title: 'เกมที่ 1: 8 Doors of Krampus',
    desc: 'Snake Draft 2 ด่าน + Polarity (#1 & #8)',
  },
  {
    stage: 'TIMEJINX',
    tab: 'GAME2',
    icon: '⏳',
    title: 'เกมที่ 2: The Chrono Crush',
    desc: 'ทายปี 9 ข้อ (Classic / Time Trap / Fast Finger)',
  },
  {
    stage: 'QUIXORT',
    tab: 'GAME3',
    icon: '⚙️',
    title: 'เกมที่ 3: Toy Factory Chaos',
    desc: 'สายพานเรียงของเล่น 4 รอบ + ปุ่มป่วน Shuffle',
  },
  {
    stage: 'TRIVIA_MURDER',
    tab: 'GAME4',
    icon: '💀',
    title: 'เกมที่ 4: The Last Man Standing',
    desc: 'ลานประหาร 4 รอบ + ตลาดมืด + บันไดหนีตาย 25 ขั้น',
  },
];

export const LobbyWorkspace: React.FC<LobbyWorkspaceProps> = ({
  onOpenQr,
  onJumpToGameTab,
}) => {
  const {
    state,
    updateTeamProfile,
    setGameStage,
    startMansionGame,
    switchEightDoorsSubRound,
    switchChronoSubRound,
    startToyFactoryGame,
    startLastManStandingGame,
  } = useGame();

  const { teams, round, clearedStages = [] } = state;
  const regCount = TEAM_ORDER.filter((tid) => teams[tid].isRegistered).length;

  const handleLaunchStage = (stage: GameStage, tab: AdminTabId) => {
    if (stage === 'POLL_MINE') {
      switchEightDoorsSubRound('SUB1_SURVIVAL');
    } else if (stage === 'TIMEJINX') {
      switchChronoSubRound('CHRONO_SUB1_CLASSIC', { presetId: 'tj-1' });
    } else if (stage === 'QUIXORT') {
      startToyFactoryGame();
    } else if (stage === 'TRIVIA_MURDER') {
      startLastManStandingGame();
    }
    onJumpToGameTab(tab);
  };

  return (
    <div className="space-y-4">
      {/* Lobby Gate Hero Card */}
      <div className="rounded-2xl bg-gradient-to-r from-red-950/70 via-slate-900 to-emerald-950/60 border border-amber-500/40 p-4 md:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[11px] font-black uppercase">
                LOBBY & MANSION GATE
              </span>
              <span className="text-xs font-mono font-bold text-emerald-300">
                Sub-GM ลงทะเบียนแล้ว: {regCount}/4 ทีม
              </span>
              {state.roomLocked ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold">
                  <Lock className="w-3 h-3" /> ล็อกห้องแล้ว
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] font-bold">
                  <Unlock className="w-3 h-3" /> เปิดลงทะเบียน
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              ลงทะเบียนตัวแทน 4 ทีม (คลิกที่การ์ดเพื่อสลับสถานะด้วยมือ)
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SafeActionButton
              type="button"
              showSpinner={false}
              onClick={() => setGameStage('LOBBY')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition ${
                round.gameStage === 'LOBBY'
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              🏠 จอ Lobby
            </SafeActionButton>

            <SafeActionButton
              type="button"
              showSpinner={false}
              onClick={() => setGameStage('WORLD_MAP')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold border transition flex items-center gap-1 ${
                round.gameStage === 'WORLD_MAP'
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>แผนที่คฤหาสน์</span>
            </SafeActionButton>

            <button
              type="button"
              onClick={onOpenQr}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/50 font-extrabold text-xs flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>เปิด QR Code</span>
            </button>

            <SafeActionButton
              type="button"
              loadingText="กำลังเริ่มเกม..."
              onClick={() => {
                if (regCount < 2) {
                  window.alert(
                    `ต้องมี Sub-GM ลงทะเบียนอย่างน้อย 2 ทีมก่อนเริ่มเกม (ตอนนี้ลงทะเบียนแล้ว ${regCount} ทีม)`
                  );
                  return;
                }
                if (
                  window.confirm(
                    `ยืนยันล็อกห้องและเปิด Mansion World Map ด้วย ${regCount} ทีมหรือไม่?`
                  )
                ) {
                  startMansionGame();
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs border border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center gap-1.5 transition"
            >
              <Sparkles className="w-4 h-4" />
              <span>🏰 เริ่มเข้าสู่คฤหาสน์ (Start Game)</span>
            </SafeActionButton>
          </div>
        </div>

        {/* 4 Team Registration Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TEAM_ORDER.map((tid) => {
            const t = teams[tid];
            const isReg = Boolean(t.isRegistered);
            return (
              <button
                key={tid}
                type="button"
                onClick={() => updateTeamProfile(tid, { isRegistered: !isReg })}
                className={`p-3.5 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-2 ${
                  isReg
                    ? 'bg-emerald-950/60 border-emerald-400 text-white shadow'
                    : 'bg-slate-950/90 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-black text-amber-400">
                    TEAM {t.number} {t.icon}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 ${
                      isReg ? 'bg-emerald-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isReg && <CheckCircle2 className="w-3 h-3" />}
                    {isReg ? 'พร้อมลุย!' : 'รอลงทะเบียน'}
                  </span>
                </div>
                <div className="font-black text-sm text-white truncate">{t.name}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  สมาชิกเกม 3: {t.roster?.length || 0} คน
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mansion World Map Quick Launcher */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white">
            🗺️ ทางลัดเลือกห้องบททดสอบ (เข้าสู่โหมด 🟡 STANDBY ทันที)
          </h3>
          <span className="text-xs text-slate-400">
            ผ่านแล้ว {clearedStages.length}/4 ด่าน
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WORLD_STAGES.map((st) => {
            const cleared = clearedStages.includes(st.stage);
            const active = round.gameStage === st.stage;
            return (
              <div
                key={st.stage}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  active
                    ? 'bg-emerald-950/40 border-emerald-400'
                    : cleared
                    ? 'bg-slate-950/90 border-amber-500/40'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{st.icon}</span>
                    <span className="text-sm font-black text-white truncate">{st.title}</span>
                    {cleared && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400 text-amber-300 text-[10px] font-black shrink-0">
                        CLEARED ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{st.desc}</p>
                </div>

                <SafeActionButton
                  type="button"
                  loadingText="กำลังโหลด..."
                  onClick={() => handleLaunchStage(st.stage, st.tab)}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white border border-slate-700 hover:border-emerald-300 font-black text-xs shrink-0 transition"
                >
                  {active ? 'กำลังเล่น ➔' : 'เข้าด่าน (Standby)'}
                </SafeActionButton>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
