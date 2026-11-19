import React, { useEffect, useState } from 'react';
import { BookOpen, CheckSquare, Square, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  MANUAL_SECTIONS,
  PRE_SHOW_CHECKLIST,
  TROUBLESHOOTING_ITEMS,
} from '../../data/gmManualContent';

interface GmManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ManualNavId = 'PRESHOW' | 'TROUBLESHOOT' | string;

const BADGE_CLASSES: Record<string, string> = {
  neutral: 'bg-slate-800 text-slate-200 border-slate-600',
  emerald: 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60',
  amber: 'bg-amber-950/90 text-amber-300 border-amber-500/60',
  sky: 'bg-sky-950/90 text-sky-300 border-sky-500/60',
  rose: 'bg-rose-950/90 text-rose-300 border-rose-500/60',
};

export const GmManualModal: React.FC<GmManualModalProps> = ({ isOpen, onClose }) => {
  const [selectedId, setSelectedId] = useState<ManualNavId>('PRESHOW');
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const completedCount = PRE_SHOW_CHECKLIST.filter((c) => checkedIds[c.id]).length;
  const activeSection = MANUAL_SECTIONS.find((s) => s.id === selectedId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl h-[88vh] rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-[0_0_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/60 flex items-center justify-center text-amber-300 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-black text-white truncate">
                📖 คู่มือ Host & Live Runbook — THE KRAMPUS EVE
              </h2>
              <p className="text-xs text-slate-400 truncate">
                สรุปลำดับปุ่มกดหน้างาน ตั้งแต่ Pre-Show ➔ จบเกม และวิธีแก้ปัญหาฉุกเฉิน (กด Esc เพื่อปิด)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
            aria-label="ปิดคู่มือ GM"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Left Nav + Scrollable Content */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <aside className="md:w-64 shrink-0 bg-slate-950/70 border-b md:border-b-0 md:border-r border-slate-800 p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedId('PRESHOW')}
              className={`px-3 py-2.5 rounded-xl text-left text-xs font-extrabold border transition flex items-center justify-between gap-2 shrink-0 ${
                selectedId === 'PRESHOW'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <span>✅ Pre-Show Checklist</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300">
                {completedCount}/{PRE_SHOW_CHECKLIST.length}
              </span>
            </button>

            {MANUAL_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedId(sec.id)}
                className={`px-3 py-2.5 rounded-xl text-left text-xs font-bold border transition flex items-center gap-2 shrink-0 ${
                  selectedId === sec.id
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <span>{sec.icon}</span>
                <span className="truncate">{sec.title}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={() => setSelectedId('TROUBLESHOOT')}
              className={`px-3 py-2.5 rounded-xl text-left text-xs font-extrabold border transition flex items-center gap-2 shrink-0 ${
                selectedId === 'TROUBLESHOOT'
                  ? 'bg-red-500/20 border-red-400 text-red-200'
                  : 'bg-slate-900/70 border-slate-800 text-red-300/90 hover:text-white'
              }`}
            >
              <span>🚨 แก้ปัญหาฉุกเฉิน (SOS)</span>
            </button>
          </aside>

          <div className="flex-1 min-w-0 overflow-y-auto p-5 md:p-6 space-y-5">
            {selectedId === 'PRESHOW' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-white">
                      ✅ Pre-Show Checklist (เช็กก่อนเปิดห้อง)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ติ๊กตรวจสอบทีละรายการก่อนเริ่มรันคิวงานจริง
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      พร้อมแล้ว {completedCount}/{PRE_SHOW_CHECKLIST.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {PRE_SHOW_CHECKLIST.map((item) => {
                    const checked = Boolean(checkedIds[item.id]);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleCheck(item.id)}
                        className={`w-full p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                          checked
                            ? 'bg-emerald-950/35 border-emerald-500/60 text-emerald-100'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-600 text-slate-200'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div
                            className={`text-sm font-extrabold ${
                              checked ? 'line-through text-emerald-300' : 'text-white'
                            }`}
                          >
                            {item.label}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{item.detail}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSection && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase">
                    {activeSection.subtitle}
                  </div>
                  <h3 className="text-xl font-black text-white mt-0.5">
                    {activeSection.icon} {activeSection.title}
                  </h3>
                  <p className="text-sm text-slate-300 mt-1">{activeSection.summary}</p>
                </div>

                <div className="space-y-3">
                  {activeSection.steps.map((st, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-lg border text-xs font-mono font-black ${
                            BADGE_CLASSES[st.badgeColor] || BADGE_CLASSES.neutral
                          }`}
                        >
                          {st.step}
                        </span>
                        <span className="text-sm font-extrabold text-white">{st.action}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{st.detail}</p>
                    </div>
                  ))}
                </div>

                {activeSection.tips && activeSection.tips.length > 0 && (
                  <div className="rounded-2xl bg-amber-950/30 border border-amber-500/40 p-4 space-y-1.5">
                    <div className="text-xs font-black text-amber-300">💡 เคล็ดลับหน้างาน</div>
                    {activeSection.tips.map((tip, i) => (
                      <p key={i} className="text-xs text-amber-100/90 leading-relaxed">
                        • {tip}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedId === 'TROUBLESHOOT' && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-red-400 font-black text-lg">
                    <AlertTriangle className="w-5 h-5" />
                    <h3>🚨 แก้ปัญหาเฉพาะหน้า (Emergency SOS)</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    วิธีรับมือสถานการณ์ไม่คาดคิดระหว่างรายการสดโดยไม่ต้องรีเฟรชหน้าจอใหญ่
                  </p>
                </div>

                <div className="space-y-3">
                  {TROUBLESHOOTING_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl bg-slate-950 border border-red-900/50 p-4 space-y-1.5"
                    >
                      <div className="text-sm font-black text-red-300">❓ {item.symptom}</div>
                      <div className="text-xs text-slate-200 leading-relaxed">
                        ✅ <strong className="text-emerald-300">วิธีแก้:</strong> {item.solution}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
