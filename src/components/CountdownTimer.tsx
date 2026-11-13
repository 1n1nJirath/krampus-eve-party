import React, { useEffect, useRef, useState } from 'react';
import { Timer, AlertTriangle, Lock } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { soundFX } from '../utils/sound';

interface CountdownTimerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  autoLockOnZero?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  size = 'lg',
  autoLockOnZero = false,
}) => {
  const { state, getAuthoritativeNow, lockRound } = useGame();
  const { round } = state;
  const [remainingMs, setRemainingMs] = useState<number>(round.durationSeconds * 1000);
  const lastSecRef = useRef<number>(-1);

  useEffect(() => {
    if (round.status !== 'ACTIVE' || !round.timerStartedAt) {
      const staticMs =
        round.status === 'IDLE'
          ? round.durationSeconds * 1000
          : round.timerRemainingMs ?? 0;
      setRemainingMs(staticMs);
      lastSecRef.current = -1;
      return;
    }

    const interval = setInterval(() => {
      const now = getAuthoritativeNow();
      const elapsed = Math.max(0, now - round.timerStartedAt!);
      const rem = Math.max(0, round.durationSeconds * 1000 - elapsed);
      setRemainingMs(rem);

      const wholeSec = Math.ceil(rem / 1000);
      if (wholeSec !== lastSecRef.current && wholeSec > 0 && wholeSec <= round.durationSeconds) {
        lastSecRef.current = wholeSec;
        if (wholeSec <= 10) {
          soundFX.playTick(wholeSec <= 5);
        }
      }

      if (rem <= 0) {
        clearInterval(interval);
        if (autoLockOnZero && round.status === 'ACTIVE') {
          lockRound();
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [
    round.status,
    round.timerStartedAt,
    round.durationSeconds,
    round.timerRemainingMs,
    getAuthoritativeNow,
    autoLockOnZero,
    lockRound,
  ]);

  const totalMs = Math.max(1000, round.durationSeconds * 1000);
  const progressPct = Math.min(100, Math.max(0, (remainingMs / totalMs) * 100));
  const seconds = Math.floor(remainingMs / 1000);
  const tenths = Math.floor((remainingMs % 1000) / 100);
  const isUrgent = round.status === 'ACTIVE' && seconds < 6 && remainingMs > 0;
  const isTimeUp = round.status === 'LOCKED' && remainingMs === 0;

  const sizeClasses = {
    sm: 'text-xl px-3 py-1',
    md: 'text-2xl px-4 py-1.5',
    lg: 'text-4xl px-5 py-2.5',
    xl: 'text-5xl md:text-6xl px-7 py-3',
  }[size];

  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative flex items-center gap-3 rounded-2xl border-2 font-mono font-extrabold tracking-wider transition-all duration-200 ${sizeClasses} ${
          isUrgent
            ? 'bg-red-950/90 border-red-500 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.65)] animate-pulse'
            : round.status === 'ACTIVE'
            ? 'bg-slate-900/90 border-amber-500/80 text-amber-300 shadow-[0_0_20px_rgba(234,179,8,0.25)]'
            : round.status === 'REVEALED'
            ? 'bg-emerald-950/80 border-emerald-500/70 text-emerald-300'
            : 'bg-slate-900/80 border-slate-700 text-slate-300'
        }`}
      >
        {isUrgent ? (
          <AlertTriangle className="w-7 h-7 text-red-400 animate-bounce shrink-0" />
        ) : round.status === 'LOCKED' ? (
          <Lock className="w-6 h-6 text-amber-400 shrink-0" />
        ) : (
          <Timer className="w-6 h-6 text-amber-400 shrink-0" />
        )}

        <span>
          {String(seconds).padStart(2, '0')}
          <span className="text-amber-500/80 text-0.7em">.{tenths}s</span>
        </span>

        {isTimeUp && (
          <span className="ml-2 text-xs md:text-sm font-sans uppercase px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold">
            หมดเวลา!
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-800/90 rounded-full overflow-hidden mt-1.5 border border-slate-700/60">
        <div
          className={`h-full transition-all duration-100 ${
            isUrgent
              ? 'bg-gradient-to-r from-red-600 to-amber-500'
              : 'bg-gradient-to-r from-emerald-600 via-amber-500 to-amber-300'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
};
