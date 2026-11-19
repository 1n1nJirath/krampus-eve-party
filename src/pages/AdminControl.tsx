import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
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

export const AdminControl: React.FC = () => {
  const { state } = useGame();
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

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col bg-[#090d16] text-slate-100">
      <AdminTopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQr={() => setQrOpen(true)}
        onOpenManual={() => setManualOpen(true)}
        onOpenSettings={(tab) => openSettings(tab || 'PRESETS')}
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
