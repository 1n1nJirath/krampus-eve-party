import React, { useEffect, useRef, useState } from 'react';
import { Lock, ShieldAlert, X } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { AdminTabId, stageToAdminTab } from '../logic/adminFlowLogic';
import { QrCodeModal } from '../components/QrCodeModal';
import { AdminTopBar } from '../components/admin/AdminTopBar';
import { MonitorSidebar } from '../components/admin/MonitorSidebar';
import { LobbyWorkspace } from '../components/admin/LobbyWorkspace';
import { Game1DoorsWorkspace } from '../components/admin/Game1DoorsWorkspace';
import { Game2ChronoWorkspace } from '../components/admin/Game2ChronoWorkspace';
import { Game3ToyFactoryWorkspace } from '../components/admin/Game3ToyFactoryWorkspace';
import { Game4LmsWorkspace } from '../components/admin/Game4LmsWorkspace';
import { FinaleWorkspace } from '../components/admin/FinaleWorkspace';
import { GmManualModal } from '../components/admin/GmManualModal';
import {
  SettingsDrawerTab,
  SettingsEditorDrawer,
} from '../components/admin/SettingsEditorDrawer';

const ADMIN_UNLOCK_SESSION_KEY = 'krampus_admin_unlocked';
const DEFAULT_DEV_ADMIN_PIN = '2512';

function getConfiguredAdminPin(): string {
  const envObj = (import.meta as unknown as {
    env?: { VITE_ADMIN_PIN?: string; DEV?: boolean };
  }).env;
  const rawPin = envObj?.VITE_ADMIN_PIN?.trim();
  if (!rawPin) {
    if (envObj?.DEV) {
      console.warn(
        `[Security] VITE_ADMIN_PIN is not set; falling back to default dev PIN '${DEFAULT_DEV_ADMIN_PIN}'.`
      );
    }
    return DEFAULT_DEV_ADMIN_PIN;
  }
  return rawPin;
}

export const AdminControl: React.FC = () => {
  const { state } = useGame();
  const [expectedPin] = useState<string>(() => getConfiguredAdminPin());
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_UNLOCK_SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabId>(() =>
    stageToAdminTab(state.round.gameStage)
  );
  const [qrOpen, setQrOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [settingsDrawer, setSettingsDrawer] = useState<{
    open: boolean;
    initialTab: SettingsDrawerTab;
  }>({ open: false, initialTab: 'PRESETS' });
  const [scoringFeedback, setScoringFeedback] = useState<string[] | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow on-air stage changes automatically (e.g. when loading preset or advancing game),
  // while still letting the Host manually browse other tabs without disrupting /display.
  useEffect(() => {
    setActiveTab(stageToAdminTab(state.round.gameStage));
  }, [state.round.gameStage]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const showFeedback = (lines: string[]) => {
    setScoringFeedback(lines);
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => setScoringFeedback(null), 8000);
  };

  const openSettings = (initialTab: SettingsDrawerTab = 'PRESETS') => {
    setSettingsDrawer({ open: true, initialTab });
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === expectedPin) {
      try {
        sessionStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, '1');
      } catch {
        // ignore
      }
      setIsUnlocked(true);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('รหัส PIN ไม่ถูกต้อง กรุณาลองอีกครั้ง');
      setPinInput('');
    }
  };

  const handleLockAdmin = () => {
    try {
      sessionStorage.removeItem(ADMIN_UNLOCK_SESSION_KEY);
    } catch {
      // ignore
    }
    setIsUnlocked(false);
    setPinInput('');
    setPinError(null);
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070a12] text-slate-100 p-4 select-none">
        <div className="w-full max-w-md rounded-3xl bg-slate-900/95 border-2 border-amber-500/60 shadow-[0_0_60px_rgba(220,38,38,0.3)] p-7 space-y-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-950 border-2 border-amber-400 flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-8 h-8 text-amber-300" />
          </div>
          <div className="space-y-1">
            <div className="inline-block px-3 py-0.5 rounded-full bg-red-950 border border-red-500/40 text-amber-300 font-mono text-[11px] font-bold uppercase tracking-widest">
              GM SECURITY GATE
            </div>
            <h1 className="text-2xl font-black text-white">THE KRAMPUS EVE • /admin</h1>
            <p className="text-xs text-slate-400">
              กรุณากรอกรหัส PIN สำหรับ Host (GM) เพื่อเข้าสู่แผงควบคุมและเฉลยคำตอบ
            </p>
          </div>

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                if (pinError) setPinError(null);
              }}
              placeholder="••••"
              maxLength={12}
              className="w-full px-4 py-3.5 rounded-2xl bg-slate-950 border-2 border-slate-700 focus:border-amber-400 focus:outline-none text-center font-mono text-2xl font-black tracking-[0.4em] text-amber-300"
            />
            {pinError && (
              <div className="rounded-xl bg-red-950/90 border border-red-500 px-3 py-2 text-xs font-bold text-red-200 flex items-center justify-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base shadow-lg transition cursor-pointer"
            >
              🔓 ปลดล็อกด้วยรหัส PIN
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  sessionStorage.setItem(ADMIN_UNLOCK_SESSION_KEY, '1');
                } catch {
                  // ignore
                }
                setIsUnlocked(true);
                setPinInput('');
                setPinError(null);
              }}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow transition cursor-pointer"
            >
              ⚡ กดเข้าหน้าควบคุม GM ทันที (Quick Unlock)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#090d16] text-slate-100">
      <AdminTopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQr={() => setQrOpen(true)}
        onOpenManual={() => setManualOpen(true)}
        onOpenSettings={(tab) => openSettings(tab || 'PRESETS')}
        onLockAdmin={handleLockAdmin}
      />

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Main Context-Aware Workspace (~70%) */}
        <main className="flex-1 min-w-0 overflow-y-auto p-4 lg:p-5 space-y-4">
          {scoringFeedback && scoringFeedback.length > 0 && (
            <div className="rounded-2xl bg-emerald-950/85 border border-emerald-400/70 p-3 text-xs text-emerald-100 flex items-start justify-between gap-3 shadow-lg">
              <div className="space-y-0.5">
                <div className="font-black text-emerald-300">
                  ✨ สรุปการคำนวณเหรียญศักดิ์สิทธิ์ & เกราะเด็กดี:
                </div>
                {scoringFeedback.map((line, i) => (
                  <div key={i}>• {line}</div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setScoringFeedback(null)}
                className="p-1 rounded-lg hover:bg-emerald-900 text-emerald-200 shrink-0"
                aria-label="ปิดสรุปคะแนน"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {activeTab === 'LOBBY' && (
            <LobbyWorkspace
              onOpenQr={() => setQrOpen(true)}
              onJumpToGameTab={setActiveTab}
            />
          )}

          {activeTab === 'GAME1' && (
            <Game1DoorsWorkspace
              onShowFeedback={showFeedback}
              onAdvanceToGame2={() => setActiveTab('GAME2')}
            />
          )}

          {activeTab === 'GAME2' && (
            <Game2ChronoWorkspace
              onShowFeedback={showFeedback}
              onAdvanceToGame3={() => setActiveTab('GAME3')}
            />
          )}

          {activeTab === 'GAME3' && (
            <Game3ToyFactoryWorkspace
              onAdvanceToGame4={() => setActiveTab('GAME4')}
              onOpenTeamsSettings={() => openSettings('TEAMS')}
            />
          )}

          {activeTab === 'GAME4' && (
            <Game4LmsWorkspace onGoToFinale={() => setActiveTab('FINALE')} />
          )}

          {activeTab === 'FINALE' && <FinaleWorkspace />}
        </main>

        {/* Persistent Right Monitor & Quick Economy Sidebar (~30%) */}
        <div className="w-full lg:w-[340px] xl:w-[390px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-950/95 overflow-y-auto">
          <MonitorSidebar />
        </div>
      </div>

      <QrCodeModal isOpen={qrOpen} onClose={() => setQrOpen(false)} />

      <GmManualModal isOpen={manualOpen} onClose={() => setManualOpen(false)} />

      <SettingsEditorDrawer
        isOpen={settingsDrawer.open}
        initialTab={settingsDrawer.initialTab}
        onClose={() => setSettingsDrawer((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};
