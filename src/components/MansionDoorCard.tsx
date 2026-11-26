import React, { useEffect, useRef, useState } from 'react';
import { Shield, Skull, Sparkles } from 'lucide-react';
import { soundFX } from '../utils/sound';

export interface MansionDoorDisplayProps {
  doorKey: string;
  label: string;
  isOpened: boolean;
  rank?: number;
  isSafe: boolean;
  isRank1?: boolean;
  isRankLast?: boolean;
  choiceCount?: number;
  subRound: string;
  isJustOpened?: boolean;
  pickedByBadges?: Array<{ id: string; icon: string; name: string; tag?: string }>;
  playDoorSoundOnOpen?: boolean;
}

/**
 * 10-Foot TV/Projector Dark Christmas Mansion Door Card with 3D Swing-Open Reveal
 */
export const MansionDoorDisplayCard: React.FC<MansionDoorDisplayProps> = ({
  doorKey,
  label,
  isOpened,
  rank,
  isSafe,
  isRank1 = false,
  isRankLast = false,
  choiceCount = 8,
  subRound,
  isJustOpened = false,
  pickedByBadges = [],
  playDoorSoundOnOpen = true,
}) => {
  const prevOpenedRef = useRef<boolean>(isOpened);
  const [justSwungDanger, setJustSwungDanger] = useState(false);

  useEffect(() => {
    if (!prevOpenedRef.current && isOpened) {
      if (playDoorSoundOnOpen) {
        soundFX.playDoorOpen(isSafe);
      }
      if (!isSafe) {
        setJustSwungDanger(true);
        const timer = setTimeout(() => setJustSwungDanger(false), 750);
        prevOpenedRef.current = isOpened;
        return () => clearTimeout(timer);
      }
    }
    prevOpenedRef.current = isOpened;
  }, [isOpened, isSafe, playDoorSoundOnOpen]);

  const safeRewardLabel =
    subRound === 'SUB3_POLARITY'
      ? isRank1
        ? '🌟 อันดับ #1 (มากที่สุด)'
        : isRankLast
        ? `💀 อันดับ #${choiceCount} (น้อยที่สุด)`
        : 'ประตูทั่วไป'
      : subRound === 'SUB2_DOOR_AND_BET'
      ? '✨ โซนปลอดภัย (+700 ฿)'
      : '✨ โซนปลอดภัย (+300 ฿)';

  return (
    <div
      className={`door-perspective relative rounded-t-[2.2rem] rounded-b-2xl min-h-[205px] flex flex-col select-none transition-all duration-500 ${
        justSwungDanger ? 'animate-door-danger-shake' : ''
      } ${isJustOpened ? 'scale-[1.03] z-10' : ''}`}
    >
      {/* OUTER STONE & IRON ARCHWAY FRAME */}
      <div
        className={`relative flex-1 rounded-t-[2.2rem] rounded-b-2xl border-4 overflow-hidden flex flex-col justify-between p-3.5 transition-all duration-500 ${
          isOpened
            ? isSafe
              ? 'border-amber-300 shadow-[0_0_45px_rgba(245,158,11,0.6),0_8px_0_#000]'
              : 'border-red-500 shadow-[0_0_45px_rgba(239,68,68,0.65),0_8px_0_#000]'
            : 'border-amber-500/70 hover:border-amber-300 shadow-[0_0_22px_rgba(245,158,11,0.22),0_7px_0_#000]'
        }`}
        style={{
          background: isOpened
            ? isSafe
              ? 'radial-gradient(circle at 50% 42%, rgba(251,191,36,0.38) 0%, rgba(6,78,59,0.92) 55%, rgba(4,24,20,0.98) 100%)'
              : 'radial-gradient(circle at 50% 42%, rgba(220,38,38,0.45) 0%, rgba(69,10,10,0.95) 58%, rgba(15,4,6,0.99) 100%)'
            : '#140d18',
        }}
      >
        {/* ============================================================
            DOORWAY INTERIOR (REVEALED WHEN DOOR SWINGS OPEN)
        ============================================================ */}
        <div className="relative z-10 flex-1 flex flex-col justify-between">
          {/* Top Header inside Doorway: Door Key Badge + Picked Team Pills */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-11 h-11 rounded-xl font-mono font-black text-2xl flex items-center justify-center border-2 shadow-md ${
                  isSafe
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-black border-white'
                    : 'bg-gradient-to-b from-red-500 to-red-800 text-white border-red-200'
                }`}
              >
                {doorKey}
              </span>
              {pickedByBadges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pickedByBadges.map((b) => (
                    <span
                      key={b.id}
                      className="px-2 py-0.5 rounded-lg bg-black/85 border border-amber-400/70 text-[11px] font-extrabold text-white flex items-center gap-1 shadow"
                    >
                      <span>{b.icon}</span>
                      <span className="truncate max-w-[78px]">{b.name}</span>
                      {b.tag && <span className="text-amber-300 font-black">{b.tag}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Revealed Rank Medal inside Doorway */}
            {isOpened && typeof rank === 'number' && (
              <div
                className={`px-3 py-1 rounded-2xl font-mono font-black text-2xl md:text-3xl border-2 shadow-xl flex items-center gap-1 ${
                  isSafe
                    ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-black border-white shadow-[0_0_25px_rgba(250,204,21,0.75)]'
                    : 'bg-gradient-to-b from-red-600 to-red-900 text-white border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.7)]'
                }`}
              >
                <span>#{rank}</span>
              </div>
            )}
          </div>

          {/* Center Portal Light Burst / Krampus Trap Emblem + Answer Text */}
          <div className="my-2 px-2.5 py-2 rounded-xl bg-black/75 border-2 border-white/20 backdrop-blur-sm">
            <div className="display-choice-text font-black text-lg md:text-xl leading-snug text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              {label}
            </div>
          </div>

          {/* Bottom Outcome Banner inside Doorway */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/20">
            {isSafe ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-black text-xs md:text-sm font-black shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{safeRewardLabel}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white border border-red-300 text-xs md:text-sm font-black shadow-[0_0_15px_rgba(239,68,68,0.65)]">
                <Skull className="w-4 h-4 shrink-0" />
                <span>
                  {subRound === 'SUB3_POLARITY' ? 'ประตูหลอก (0 ฿)' : 'ประตูกับดัก (-1 🛡️)'}
                </span>
              </span>
            )}
            <span className="text-[11px] font-mono font-bold text-amber-200/90 uppercase">
              {isSafe ? 'HOLY PORTAL' : 'KRAMPUS TRAP'}
            </span>
          </div>
        </div>

        {/* ============================================================
            3D SWINGING MANSION DOOR LEAF (CLOSED -> SWINGS OPEN -106deg)
        ============================================================ */}
        <div
          aria-hidden={isOpened}
          className={`door-leaf absolute inset-0 z-20 rounded-t-[2rem] rounded-b-xl p-3.5 flex flex-col justify-between overflow-hidden ${
            isOpened ? 'door-leaf-open pointer-events-none' : 'door-leaf-closed'
          }`}
          style={{
            background:
              'linear-gradient(135deg, #3c2218 0%, #27150e 45%, #1b0e0a 100%)',
            boxShadow:
              'inset 0 2px 0 rgba(251,191,36,0.35), inset 0 -6px 16px rgba(0,0,0,0.85)',
          }}
        >
          {/* Subtle Carved Gothic Wood Grain & Recessed Door Panels */}
          <div
            className="pointer-events-none absolute inset-2.5 rounded-t-[1.6rem] rounded-b-lg border-2 border-amber-500/30"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, rgba(0,0,0,0.18) 0px, rgba(0,0,0,0.18) 2px, transparent 2px, transparent 10px)',
            }}
          />
          {/* Left Heavy Iron Hinges */}
          <div className="pointer-events-none absolute left-0 top-7 w-3.5 h-5 rounded-r bg-gradient-to-r from-zinc-700 to-zinc-500 border border-black shadow" />
          <div className="pointer-events-none absolute left-0 bottom-7 w-3.5 h-5 rounded-r bg-gradient-to-r from-zinc-700 to-zinc-500 border border-black shadow" />

          {/* Glowing Brass Ring Knocker / Doorknob on Right Edge */}
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-700 border-2 border-black shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
            <div className="w-5 h-5 -mt-1.5 rounded-full border-[3px] border-amber-400 shadow-[0_2px_4px_rgba(0,0,0,0.9)]" />
          </div>

          {/* Door Top Arch Header: Brass Letter Plaque A-H & Team Picks */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-slate-950 border-[3px] border-black font-mono font-black text-2xl md:text-3xl flex items-center justify-center shadow-[0_4px_0_#000,0_0_18px_rgba(245,158,11,0.5)]">
                {doorKey}
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-amber-300/90">
                  MANSION DOOR {doorKey}
                </span>
                <span className="text-xs font-extrabold text-amber-100/90">
                  🚪 ประตูปิดตาย • รอเปิดพิสูจน์
                </span>
              </div>
            </div>

            {pickedByBadges.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1">
                {pickedByBadges.map((b) => (
                  <span
                    key={b.id}
                    className="px-2 py-0.5 rounded-lg bg-black/85 border border-amber-400 text-xs font-black text-amber-200 flex items-center gap-1 shadow"
                  >
                    <span>{b.icon}</span>
                    {b.tag && <span>{b.tag}</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* High-Contrast 10-Foot Parchment/Brass Nameplate for Answer Text */}
          <div className="relative z-10 my-auto mr-5 px-3.5 py-2.5 rounded-xl bg-[#110c16]/95 border-2 border-amber-400/70 shadow-[0_4px_12px_rgba(0,0,0,0.85)]">
            <div className="display-choice-text font-black text-lg md:text-xl leading-snug text-white">
              {label}
            </div>
          </div>

          {/* Bottom Iron Trim & Status */}
          <div className="relative z-10 flex items-center justify-between text-[11px] font-mono font-bold text-amber-300/80 pt-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span>KRAMPUS MANOR</span>
            </span>
            <span>? RANK HIDDEN ?</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface MobileMansionDoorButtonProps {
  doorKey: string;
  label: string;
  isOpened: boolean;
  rank?: number;
  isSafe?: boolean;
  isSelected?: boolean;
  selectedBadgeText?: string;
  selectedVariant?: 'GOLD' | 'EMERALD' | 'CRIMSON';
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Mobile /play Interactive 3D Mansion Door Button
 */
export const MobileMansionDoorButton: React.FC<MobileMansionDoorButtonProps> = ({
  doorKey,
  label,
  isOpened,
  rank,
  isSafe = false,
  isSelected = false,
  selectedBadgeText,
  selectedVariant = 'GOLD',
  disabled = false,
  onClick,
}) => {
  const prevOpenedRef = useRef<boolean>(isOpened);

  useEffect(() => {
    if (!prevOpenedRef.current && isOpened) {
      soundFX.playDoorOpen(isSafe);
    }
    prevOpenedRef.current = isOpened;
  }, [isOpened, isSafe]);

  const activeBorderCls = isSelected
    ? selectedVariant === 'EMERALD'
      ? 'border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.55)] scale-[1.02]'
      : selectedVariant === 'CRIMSON'
      ? 'border-red-400 shadow-[0_0_22px_rgba(239,68,68,0.55)] scale-[1.02]'
      : 'border-amber-300 shadow-[0_0_24px_rgba(250,204,21,0.6)] scale-[1.02]'
    : 'border-amber-600/60 hover:border-amber-400';

  return (
    <button
      type="button"
      disabled={disabled || isOpened}
      onClick={onClick}
      className={`door-perspective relative rounded-t-3xl rounded-b-2xl min-h-[108px] text-left transition-all active:scale-95 overflow-hidden border-2 p-3 flex flex-col justify-between ${
        isOpened
          ? isSafe
            ? 'bg-emerald-950/75 border-emerald-500/60 opacity-85 cursor-not-allowed'
            : 'bg-red-950/75 border-red-500/60 opacity-85 cursor-not-allowed'
          : activeBorderCls
      }`}
      style={
        !isOpened
          ? {
              background: isSelected
                ? selectedVariant === 'EMERALD'
                  ? 'linear-gradient(145deg, #064e3b 0%, #1e140f 100%)'
                  : selectedVariant === 'CRIMSON'
                  ? 'linear-gradient(145deg, #7f1d1d 0%, #1e140f 100%)'
                  : 'linear-gradient(145deg, #5c341d 0%, #27150e 100%)'
                : 'linear-gradient(145deg, #382015 0%, #1d100b 100%)',
            }
          : undefined
      }
    >
      {/* Top Row: Brass Door Plaque + Opened Rank or Knocker */}
      <div className="flex items-center justify-between gap-2 w-full">
        <span
          className={`w-10 h-10 rounded-xl font-mono font-black text-xl flex items-center justify-center border-2 shrink-0 shadow ${
            isOpened
              ? isSafe
                ? 'bg-emerald-400 text-slate-950 border-white'
                : 'bg-red-600 text-white border-red-200'
              : isSelected
              ? 'bg-amber-300 text-slate-950 border-white'
              : 'bg-gradient-to-b from-amber-300 to-amber-600 text-slate-950 border-black'
          }`}
        >
          {doorKey}
        </span>

        {isOpened ? (
          <span
            className={`px-2 py-0.5 rounded-lg font-mono font-black text-xs border ${
              isSafe
                ? 'bg-emerald-500/30 border-emerald-300 text-emerald-200'
                : 'bg-red-600/30 border-red-300 text-red-200'
            }`}
          >
            {typeof rank === 'number' ? `#${rank} ${isSafe ? '✓ รอด' : '✗ กับดัก'}` : 'เปิดแล้ว'}
          </span>
        ) : selectedBadgeText ? (
          <span
            className={`px-2 py-0.5 rounded-lg font-black text-[10px] border ${
              selectedVariant === 'EMERALD'
                ? 'bg-emerald-400 text-slate-950 border-white'
                : selectedVariant === 'CRIMSON'
                ? 'bg-red-500 text-white border-white'
                : 'bg-amber-400 text-slate-950 border-white'
            }`}
          >
            {selectedBadgeText}
          </span>
        ) : (
          <span className="w-3.5 h-3.5 rounded-full bg-amber-400 border border-black shadow-[0_0_8px_rgba(251,191,36,0.85)]" />
        )}
      </div>

      {/* Door Nameplate Text */}
      <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-black/80 border border-amber-400/40 w-full">
        <div className="text-xs sm:text-sm font-extrabold text-white line-clamp-2 leading-snug">
          {label}
        </div>
      </div>
    </button>
  );
};
