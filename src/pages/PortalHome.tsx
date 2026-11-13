import React, { useState } from 'react';
import { Monitor, Sliders, Smartphone, QrCode, Sparkles, Coins, ShieldAlert } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { TEAM_ORDER } from '../data/initialData';
import { QrCodeModal } from '../components/QrCodeModal';

export const PortalHome: React.FC = () => {
  const { state, connectionMode } = useGame();
  const [qrOpen, setQrOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070a12] text-slate-100 flex flex-col justify-between p-6 relative overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(220, 38, 38, 0.4), transparent 45%), radial-gradient(circle at 80% 25%, rgba(234, 179, 8, 0.3), transparent 45%), radial-gradient(circle at 50% 85%, rgba(21, 128, 61, 0.35), transparent 50%)',
        }}
      />

      <div className="relative z-10 max-w-5xl w-full mx-auto my-auto py-8 space-y-8">
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-700 via-red-900 to-slate-950 border-2 border-amber-400 shadow-[0_0_40px_rgba(220,38,38,0.6)] flex items-center justify-center text-5xl mx-auto">
            👹
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-red-950/90 border border-amber-500/50 text-amber-300 font-mono text-xs font-extrabold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> THE KRAMPUS EVE • LIVE ACTION PARTY SYSTEM
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
            คืนวันคริสต์มาสทมิฬของครามปุส
          </h1>
          <p className="text-slate-300 max-w-2xl mx-auto text-sm md:text-base">
            ระบบเว็บแอปพลิเคชัน Realtime Party Game สไตล์ Jackbox Games สำหรับควบคุมการส่งคำตอบ จับเวลาระดับมิลลิวินาที และบริหารเหรียญศักดิ์สิทธิ์ของทั้ง 4 ทีม
          </p>
          <div className="pt-1">
            <span className="px-3 py-1 rounded-full bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
              ● สถานะการเชื่อมต่อ: {connectionMode} (พร้อมใช้งานทันที)
            </span>
          </div>
        </div>

        {/* Main 3 Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Projector Display */}
          <a
            href="/display"
            className="group rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/60 hover:border-amber-300 p-6 shadow-2xl transition-all hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center justify-center mb-4">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                SCREEN 1 • PROJECTOR
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                หน้าจอขึ้น Projector (/display)
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                สำหรับลากขึ้นจอใหญ่ให้ผู้เล่นทั้งห้องดู แสดงเวลาถอยหลัง สถานะส่งคำตอบ เฉลยคำตอบ (ซ่อนคำตอบไว้จนกว่าจะกด Reveal) และตารางอันดับเหรียญ
              </p>
            </div>
            <div className="mt-6 py-3 px-4 rounded-xl bg-amber-500 group-hover:bg-amber-400 text-slate-950 font-black text-center text-sm">
              เปิดหน้าจอ Projector ➔
            </div>
          </a>

          {/* 2. GM Admin Control Panel */}
          <a
            href="/admin"
            className="group rounded-3xl bg-gradient-to-b from-red-950/70 to-slate-950 border-2 border-red-500/60 hover:border-amber-400 p-6 shadow-2xl transition-all hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-400/50 text-red-300 flex items-center justify-center mb-4">
                <Sliders className="w-6 h-6" />
              </div>
              <span className="text-xs font-mono font-bold text-red-400 uppercase">
                SCREEN 2 • SECRET GM DECK
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                แผงควบคุม GM ใหญ่ (/admin)
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                สำหรับ GM ใหญ่เปิดบนจอโน้ตบุ๊กส่วนตัว เพื่อเลือกด่าน เปิดโหมดฟรีสไตล์ A/B/C/D แอบดูคำตอบที่ส่งมา กดเฉลย และบวก/ลบเหรียญทั้ง 4 ทีม
              </p>
            </div>
            <div className="mt-6 py-3 px-4 rounded-xl bg-red-600 group-hover:bg-red-500 text-white font-black text-center text-sm">
              เปิดแผงควบคุม GM ใหญ่ ➔
            </div>
          </a>

          {/* 3. Team Controllers */}
          <div className="rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center justify-center">
                  <Smartphone className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setQrOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" /> สแกน QR
                </button>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                SCREEN 3 • 4 MOBILE CONTROLLERS
              </span>
              <h2 className="text-2xl font-black text-white mt-1">
                จอมือถือ GM ประจำทีม (/play)
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                เข้าผ่านสมาร์ตโฟนของ GM ประจำกลุ่มทั้ง 4 ทีม (เปลี่ยนปุ่มตามโหมดที่ GM ใหญ่สั่งการอัตโนมัติ):
              </p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {TEAM_ORDER.map((tid) => {
                  const t = state.teams[tid];
                  return (
                    <a
                      key={tid}
                      href={`/play?team=${t.number}`}
                      className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400 transition flex items-center gap-2"
                    >
                      <span className="text-xl">{t.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-white truncate">
                          Team {t.number}
                        </div>
                        <div className="text-[11px] font-mono text-amber-400">
                          {t.coins} 🪙 • {'🛡️'.repeat(t.shields)}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
            <button
              onClick={() => setQrOpen(true)}
              className="mt-5 w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-center text-sm flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" /> เปิด QR Code ให้ทั้ง 4 ทีมสแกน
            </button>
          </div>
        </div>
      </div>

      <QrCodeModal isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </div>
  );
};
