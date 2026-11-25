import React, { useEffect, useState } from 'react';
import {
  Cloud,
  ListChecks,
  RotateCcw,
  Sliders,
  Users,
  Volume2,
  VolumeX,
  Wand2,
  X,
} from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { TEAM_ORDER } from '../../data/initialData';
import { GameStage } from '../../types/game';
import { SafeActionButton } from '../SafeActionButton';

export type SettingsDrawerTab = 'PRESETS' | 'FREESTYLE' | 'TEAMS' | 'CLOUD';

interface SettingsEditorDrawerProps {
  isOpen: boolean;
  initialTab: SettingsDrawerTab;
  onClose: () => void;
}

export const SettingsEditorDrawer: React.FC<SettingsEditorDrawerProps> = ({
  isOpen,
  initialTab,
  onClose,
}) => {
  const {
    state,
    supabaseConfig,
    saveSupabaseConfig,
    loadPreset,
    launchFreestyle,
    updateRoundConfig,
    updateTeamProfile,
    toggleSound,
    resetAllGameData,
  } = useGame();

  const [tab, setTab] = useState<SettingsDrawerTab>(initialTab);
  const [stageFilter, setStageFilter] = useState<GameStage | 'ALL'>('ALL');
  const [supaUrlDraft, setSupaUrlDraft] = useState(supabaseConfig.url);
  const [supaKeyDraft, setSupaKeyDraft] = useState(supabaseConfig.anonKey);
  const [supaEnabledDraft, setSupaEnabledDraft] = useState(supabaseConfig.enabled);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    setSupaUrlDraft(supabaseConfig.url);
    setSupaKeyDraft(supabaseConfig.anonKey);
    setSupaEnabledDraft(supabaseConfig.enabled);
  }, [supabaseConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredPresets =
    stageFilter === 'ALL'
      ? state.presets
      : state.presets.filter((p) => p.gameStage === stageFilter);

  const { round, teams } = state;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl h-full bg-slate-900 border-l-2 border-amber-500/50 shadow-2xl flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-black text-white">
              ⚙️ คลังโจทย์, Freestyle Editor & ตั้งค่าระบบ
            </h2>
            <p className="text-xs text-slate-400">
              แยกส่วนแก้ไขและตั้งค่าออกจากหน้าคุมสด เพื่อกันมือลั่นระหว่างรายการ (Esc เพื่อปิด)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-white border border-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="shrink-0 flex flex-wrap gap-1.5 px-5 py-2.5 bg-slate-950/70 border-b border-slate-800">
          {(
            [
              { id: 'PRESETS' as SettingsDrawerTab, label: '📚 คลังโจทย์ (Presets)', Icon: ListChecks },
              { id: 'FREESTYLE' as SettingsDrawerTab, label: '⚡ Freestyle & Editor', Icon: Wand2 },
              { id: 'TEAMS' as SettingsDrawerTab, label: '👥 ทีม & สมาชิก', Icon: Users },
              { id: 'CLOUD' as SettingsDrawerTab, label: '☁️ Cloud Sync & ระบบ', Icon: Cloud },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition ${
                tab === id
                  ? 'bg-amber-400 text-slate-950 border-white'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Drawer Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
          {tab === 'PRESETS' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['ALL', 'ทั้งหมด'],
                    ['POLL_MINE', 'Game 1 (8 Doors)'],
                    ['TIMEJINX', 'Game 2 (Chrono)'],
                    ['QUIXORT', 'Game 3 (Quixort)'],
                    ['TRIVIA_MURDER', 'Game 4 (LMS)'],
                  ] as Array<[GameStage | 'ALL', string]>
                ).map(([st, lbl]) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStageFilter(st)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      stageFilter === st
                        ? 'bg-amber-400 text-slate-950 border-white'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredPresets.map((preset) => {
                  const isCurrent = round.presetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isCurrent
                          ? 'bg-amber-950/40 border-amber-400'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                            {preset.id}
                          </span>
                          <span className="text-xs font-black text-white truncate">
                            {preset.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {preset.questionText}
                        </p>
                      </div>

                      <SafeActionButton
                        type="button"
                        showSpinner={false}
                        onClick={() => {
                          loadPreset(preset);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 ${
                          isCurrent
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        }`}
                      >
                        {isCurrent ? '✓ โหลดอยู่' : 'โหลด Standby'}
                      </SafeActionButton>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'FREESTYLE' && (
            <div className="space-y-5">
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase">
                  <Wand2 className="w-4 h-4" />
                  <span>Quick Launch โหมดฟรีสไตล์ (เข้าสู่ Standby ทันที)</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={() => {
                      launchFreestyle({
                        gameStage: 'POLL_MINE',
                        inputMode: 'MODE_A_CHOICE',
                        choiceCount: 8,
                        durationSeconds: 45,
                      });
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-left"
                  >
                    <div className="text-[10px] font-mono text-amber-400 font-bold">GAME 1</div>
                    <div className="text-xs font-black text-white mt-0.5">8 Doors of Krampus</div>
                  </SafeActionButton>

                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={() => {
                      launchFreestyle({
                        gameStage: 'TRIVIA_MURDER',
                        inputMode: 'MODE_A_CHOICE',
                        choiceCount: 4,
                        durationSeconds: 30,
                      });
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-left"
                  >
                    <div className="text-[10px] font-mono text-amber-400 font-bold">MODE A</div>
                    <div className="text-xs font-black text-white mt-0.5">ปรนัย A - D</div>
                  </SafeActionButton>

                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={() => {
                      launchFreestyle({
                        gameStage: 'TIMEJINX',
                        inputMode: 'MODE_B_YEAR',
                        targetYear: 2018,
                        durationSeconds: 30,
                      });
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-left"
                  >
                    <div className="text-[10px] font-mono text-emerald-400 font-bold">MODE B</div>
                    <div className="text-xs font-black text-white mt-0.5">ทายปี (Chrono)</div>
                  </SafeActionButton>

                  <SafeActionButton
                    type="button"
                    showSpinner={false}
                    onClick={() => {
                      launchFreestyle({
                        gameStage: 'QUIXORT',
                        inputMode: 'MODE_C_BUZZER',
                        durationSeconds: 15,
                      });
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-500/50 text-left"
                  >
                    <div className="text-[10px] font-mono text-amber-300 font-bold">MODE C</div>
                    <div className="text-xs font-black text-white mt-0.5">🔔 แย่งกดกระดิ่ง</div>
                  </SafeActionButton>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-white">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>แก้ไขข้อความ & รางวัลรอบปัจจุบันแบบด่วน</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-slate-400 font-bold">รางวัล (+฿):</label>
                    <input
                      type="number"
                      value={round.rewardCoins}
                      onChange={(e) => updateRoundConfig({ rewardCoins: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-bold">ปรับผิด (-฿):</label>
                    <input
                      type="number"
                      value={round.penaltyCoins}
                      onChange={(e) => updateRoundConfig({ penaltyCoins: Number(e.target.value) })}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-red-300"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold">หัวข้อรอบ:</label>
                  <input
                    type="text"
                    value={round.title}
                    onChange={(e) => updateRoundConfig({ title: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold">คำถาม:</label>
                  <textarea
                    rows={2}
                    value={round.questionText}
                    onChange={(e) => updateRoundConfig({ questionText: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'TEAMS' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">
                แก้ชื่อทีม คำขวัญ และรายชื่อสมาชิกสำหรับเกมที่ 3 (Toy Factory Chaos) คั่นด้วยเครื่องหมายจุลภาค (,)
              </div>
              {TEAM_ORDER.map((tid) => {
                const t = teams[tid];
                return (
                  <div
                    key={tid}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-black text-amber-400">
                        {t.icon} TEAM {t.number}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateTeamProfile(tid, { isRegistered: !Boolean(t.isRegistered) })
                        }
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          t.isRegistered
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {t.isRegistered ? 'ลงทะเบียนแล้ว' : 'ยังไม่ลงทะเบียน'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => updateTeamProfile(tid, { name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white"
                      placeholder="ชื่อทีม..."
                    />
                    <input
                      type="text"
                      value={(t.roster || []).join(', ')}
                      onChange={(e) =>
                        updateTeamProfile(tid, {
                          roster: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                      placeholder="เช่น นนท์, มายด์, บอส, เฟิร์น, ต้น, แพรว"
                    />
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'CLOUD' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h3 className="text-sm font-black text-white">
                  🔥 ตั้งค่าระบบ Realtime Sync (Firebase Realtime Database / Local Server)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  • <strong>Firebase Realtime Database (แนะนำ • ฟรี 10 GB/เดือน):</strong> ซิงก์ข้ามเครือข่าย 4G/5G ทั่วโลก พร้อมดึง State ล่าสุดให้อัตโนมัติทันทีที่ผู้เล่นเข้าห้อง
                  <br />• <strong>วิธีเปิดใช้งานใน 1 นาที:</strong> เข้า <code className="text-amber-300">console.firebase.google.com</code> → สร้างโปรเจกต์ → เมนู <strong>Build &gt; Realtime Database</strong> → กด <strong>Create Database</strong> (เลือก <strong>Start in test mode</strong>) → คัดลอก URL มาวางด้านล่างได้เลย (ไม่ต้องใส่ API Key ก็ทำงานได้ทันที!)
                </p>

                <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={supaEnabledDraft}
                    onChange={(e) => setSupaEnabledDraft(e.target.checked)}
                    className="w-4 h-4 accent-amber-400"
                  />
                  เปิดใช้งาน Cloud Realtime Sync (Firebase / Supabase)
                </label>

                <div>
                  <label className="text-xs text-slate-400">
                    Firebase Realtime Database URL (หรือ Supabase URL):
                  </label>
                  <input
                    type="text"
                    value={supaUrlDraft}
                    onChange={(e) => setSupaUrlDraft(e.target.value)}
                    placeholder="https://your-project-default-rtdb.asia-southeast1.firebasedatabase.app"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">
                    API Key (สำหรับ Firebase เว้นว่างได้หากเปิด Test Mode / สำหรับ Supabase ใส่ Anon Key):
                  </label>
                  <input
                    type="password"
                    value={supaKeyDraft}
                    onChange={(e) => setSupaKeyDraft(e.target.value)}
                    placeholder="เว้นว่างได้สำหรับ Firebase Test Mode..."
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                  />
                </div>

                <SafeActionButton
                  type="button"
                  showSpinner={false}
                  onClick={() => {
                    saveSupabaseConfig({
                      url: supaUrlDraft.trim(),
                      anonKey: supaKeyDraft.trim(),
                      enabled: supaEnabledDraft,
                    });
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs"
                >
                  บันทึกการตั้งค่า Cloud Sync
                </SafeActionButton>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">เสียงเอฟเฟกต์ (Sound FX)</span>
                <button
                  type="button"
                  onClick={toggleSound}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold flex items-center gap-1.5"
                >
                  {state.soundEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">เปิดอยู่</span>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 text-red-400" />
                      <span className="text-red-300">ปิดอยู่</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/60 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-red-300">
                  รีเซ็ตข้อมูลเกมทั้งหมดกลับเป็น 1,000 ฿ / 3 🛡️
                </span>
                <SafeActionButton
                  type="button"
                  showSpinner={false}
                  onClick={() => {
                    if (
                      window.confirm(
                        'ยืนยันการรีเซ็ตเหรียญ 1,000 ฿ และเกราะ 3 ดวงของทุกทีมกลับเป็นค่าเริ่มต้น?'
                      )
                    ) {
                      resetAllGameData();
                      onClose();
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-black text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>รีเซ็ตเกมใหม่ทั้งหมด</span>
                </SafeActionButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
