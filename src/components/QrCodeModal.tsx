import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, ExternalLink, Copy, Check, Wifi } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { TEAM_ORDER } from '../data/initialData';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose }) => {
  const { state, lanIp } = useGame();
  const port = window.location.port ? `:${window.location.port}` : '';
  const defaultOrigin =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `${window.location.protocol}//${lanIp}${port}`
      : window.location.origin;

  const [customOrigin, setCustomOrigin] = useState<string>(defaultOrigin);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const baseUrl = customOrigin.replace(/\/$/, '');
  const mainPlayUrl = `${baseUrl}/play`;

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-3xl bg-slate-900 border-2 border-amber-500/50 shadow-[0_0_60px_rgba(220,38,38,0.35)] p-6 md:p-8 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-white border border-slate-700 transition"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/90 border border-red-600/50 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
              <Smartphone className="w-4 h-4" /> Team Controller Connection
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white">
              สแกน QR Code สำหรับ GM ประจำกลุ่ม (4 ทีม)
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              ใช้สมาร์ตโฟนสแกนเพื่อเข้าสู่หน้าจอกดส่งคำตอบแบบ Realtime (ไม่ต้องสมัครสมาชิก)
            </p>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[280px]">
            <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" /> URL หลักสำหรับสแกน (แก้ได้หากใช้ Ngrok / Vercel):
            </label>
            <input
              type="text"
              value={customOrigin}
              onChange={(e) => setCustomOrigin(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-400"
              placeholder="http://192.168.1.x:5173"
            />
          </div>
        </div>

        {/* Main Universal QR + 4 Direct Team QR Codes */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-stretch">
          {/* Universal /play QR */}
          <div className="lg:col-span-1 flex flex-col items-center justify-between p-4 rounded-2xl bg-gradient-to-b from-amber-950/40 to-slate-950 border-2 border-amber-500/60">
            <div className="text-center mb-3">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs">
                รวมทุกทีม
              </span>
              <h3 className="font-bold text-base text-amber-300 mt-1.5">หน้าเลือกทีม (/play)</h3>
            </div>
            <div className="p-3 bg-white rounded-2xl shadow-lg">
              <QRCodeSVG value={mainPlayUrl} size={135} level="M" />
            </div>
            <div className="w-full mt-3 flex flex-col gap-1.5">
              <button
                onClick={() => copyLink(mainPlayUrl)}
                className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 flex items-center justify-center gap-1.5 border border-slate-700"
              >
                {copiedUrl === mainPlayUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                คัดลอกลิงก์รวม
              </button>
              <a
                href="/play"
                target="_blank"
                rel="noreferrer"
                className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 border border-amber-500/40"
              >
                เปิดแท็บทดสอบ <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* 4 Individual Team QR Cards */}
          <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TEAM_ORDER.map((tid) => {
              const team = state.teams[tid];
              const teamUrl = `${baseUrl}/play?team=${team.number}`;
              return (
                <div
                  key={tid}
                  className="flex flex-col items-center justify-between p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-slate-600 transition"
                >
                  <div className="text-center mb-2">
                    <div className="text-2xl mb-0.5">{team.icon}</div>
                    <div className="font-extrabold text-sm text-white line-clamp-1">{team.name}</div>
                    <div className="text-xs font-mono text-amber-400">Team {team.number}</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl shadow">
                    <QRCodeSVG value={teamUrl} size={120} level="M" />
                  </div>
                  <div className="w-full mt-3 flex flex-col gap-1.5">
                    <button
                      onClick={() => copyLink(teamUrl)}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-mono text-slate-300 flex items-center justify-center gap-1 border border-slate-800"
                    >
                      {copiedUrl === teamUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      ?team={team.number}
                    </button>
                    <a
                      href={`/play?team=${team.number}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1"
                    >
                      เปิดจอมือถือ {team.number} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
