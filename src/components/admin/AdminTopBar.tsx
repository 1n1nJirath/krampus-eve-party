import React from 'react';
import {
  BookOpen,
  ExternalLink,
  QrCode,
  Settings,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { AdminTabId, stageToAdminTab } from '../../logic/adminFlowLogic';
import { SafeActionButton } from '../SafeActionButton';

interface AdminTopBarProps {
  activeTab: AdminTabId;
  onSelectTab: (tab: AdminTabId) => void;
  onOpenQr: () => void;
  onOpenManual: () => void;
  onOpenSettings: (tab?: 'PRESETS' | 'FREESTYLE' | 'TEAMS' | 'CLOUD') => void;
}

const MAIN_TABS: Array<{ id: AdminTabId; label: string; shortLabel: string }> = [
  { id: 'LOBBY', label: '🏠 Lobby', shortLabel: '🏠 Lobby' },
  { id: 'GAME1', label: '🚪 Game 1: Doors', shortLabel: '🚪 G1' },
  { id: 'GAME2', label: '⏳ Game 2: Chrono', shortLabel: '⏳ G2' },
  { id: 'GAME3', label: '⚙️ Game 3: Toy Factory', shortLabel: '⚙️ G3' },
  { id: 'GAME4', label: '💀 Game 4: LMS', shortLabel: '💀 G4' },
  { id: 'FINALE', label: '🏆 Finale', shortLabel: '🏆 Finale' },
];

export const AdminTopBar: React.FC<AdminTopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenQr,
  onOpenManual,
  onOpenSettings,
}) => {
  const { state, connectionMode, setShowLeaderboardOverlay, toggleSound } = useGame();
  const onAirTab = stageToAdminTab(state.round.gameStage);

  const syncLabel =
    connectionMode === 'LOCAL_SERVER'
      ? 'Local <30ms'
      : connectionMode === 'SUPABASE_CLOUD'
      ? 'Supabase Cloud'
      : 'Browser Sync';

  return (
    <header className="shrink-0 sticky top-0 z-30 bg-slate-950/95 border-b border-slate-800 px-3 lg:px-5 py-2.5 backdrop-blur-md">
      <div className="max-w-[1850px] mx-auto flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: App Title + Cloud Sync Status */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-700 border border-amber-400 flex items-center justify-center text-lg shadow">
            👹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm xl:text-base text-white tracking-tight">
                GM CONTROL DECK
              </h1>
              <button
                type="button"
                onClick={() => onOpenSettings('CLOUD')}
                title="คลิกเพื่อตั้งค่า Cloud Sync"
                className="px-2 py-0.5 rounded-full bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-mono text-[10px] font-bold transition"
              >
                ● {syncLabel}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              สลับแท็บเพื่อดู/เตรียมงานได้โดยไม่ตัดจอผู้เล่น
            </p>
          </div>
        </div>

        {/* Center: Main Stage Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-1 overflow-x-auto max-w-full">
          {MAIN_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const isOnAir = onAirTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                className={`relative px-2.5 xl:px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 shadow'
                    : isOnAir
                    ? 'bg-slate-800 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="hidden 2xl:inline">{tab.label}</span>
                <span className="2xl:hidden">{tab.shortLabel}</span>
                {isOnAir && (
                  <span
                    className={`inline-block w-2 h-2 rounded-full animate-pulse ${
                      isSelected ? 'bg-red-600' : 'bg-emerald-400'
                    }`}
                    title="กำลังแสดงผลบนจอ /display"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Utilities */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <a
            href="/display"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow transition"
            title="เปิดหน้าจอ Projector Display แยกหน้าต่าง"
          >
            <span>/display</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onOpenQr}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-extrabold text-xs flex items-center gap-1 transition"
            title="เปิด QR Code ให้ Sub-GM 4 ทีมสแกน"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>QR</span>
          </button>

          <SafeActionButton
            type="button"
            showSpinner={false}
            onClick={() => setShowLeaderboardOverlay(!state.showLeaderboardOverlay)}
            className={`px-2.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 border transition ${
              state.showLeaderboardOverlay
                ? 'bg-emerald-500 text-slate-950 border-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title="แสดง/ซ่อนตารางคะแนนบนจอ Projector"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden md:inline">อันดับ</span>
          </SafeActionButton>

          <button
            type="button"
            onClick={onOpenManual}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 font-extrabold text-xs flex items-center gap-1 transition"
            title="เปิดคู่มือปฏิบัติการหน้างาน (GM Manual)"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span>GM Manual</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSettings('PRESETS')}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1 transition"
            title="เปิดคลังโจทย์, Freestyle Editor, รายชื่อสมาชิก และ Cloud Sync"
          >
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Editor / Settings</span>
          </button>

          <button
            type="button"
            onClick={toggleSound}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition"
            title={state.soundEnabled ? 'ปิดเสียงเอฟเฟกต์' : 'เปิดเสียงเอฟเฟกต์'}
          >
            {state.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-red-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
