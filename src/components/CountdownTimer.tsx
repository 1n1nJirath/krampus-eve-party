import React, { useEffect, useRef, useState } from 'react';
import { Timer, AlertTriangle, Lock } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { computeSecondsLeft } from '../logic/syncLogic';
import { soundFX } from '../utils/sound';
import { triggerHaptic } from '../utils/haptics';

interface CountdownTimerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  autoLockOnZero?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  size = 'lg',
  autoLockOnZero = false,
}) => {
  const { state, isHost, getAuthoritativeNow, lockRound } = useGame();
  const { round } = state;

  const effectiveEndAt =
    round.status === 'ACTIVE'
      ? round.timerEndAt ??
        (round.timerStartedAt !== null
          ? round.timerStartedAt + round.durationSeconds * 1000
          : null)
      : null;

  const getStaticSeconds = () =>
    round.status === 'IDLE'
      ? round.durationSeconds
      : Math.max(0, Math.ceil((round.timerRemainingMs ?? 0) / 1000));

  const [secondsLeft, setSecondsLeft] = useState<number>(() =>
    effectiveEndAt !== null
      ? computeSecondsLeft(effectiveEndAt, getAuthoritativeNow())
      : getStaticSeconds()
  );

  const lastSecRef = useRef<number>(-1);
  const autoLockedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (round.status !== 'ACTIVE' || effectiveEndAt === null) {
      const staticSecs =
        round.status === 'IDLE'
          ? round.durationSeconds
          : Math.max(0, Math.ceil((round.timerRemainingMs ?? 0) / 1000));
      setSecondsLeft(staticSecs);
      lastSecRef.current = -1;
      return;
    }

    const lockKey = `${round.id}:${effectiveEndAt}`;

    const tick = () => {
      const secsLeft = computeSecondsLeft(effectiveEndAt, getAuthoritativeNow());
      setSecondsLeft(secsLeft);

      if (
        secsLeft !== lastSecRef.current &&
        secsLeft > 0 &&
        secsLeft <= round.durationSeconds
      ) {
        lastSecRef.current = secsLeft;
        if (secsLeft <= 10) {
          soundFX.playTick(secsLeft <= 5);
          if (secsLeft <= 5) {
            triggerHaptic('PANIC');
          }
        }
      }

      if (
        secsLeft <= 0 &&
        autoLockOnZero &&
        isHost &&
        round.status === 'ACTIVE' &&
        autoLockedKeyRef.current !== lockKey
      ) {
        autoLockedKeyRef.current = lockKey;
        lockRound();
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [
    round.id,
    round.status,
    round.durationSeconds,
    round.timerRemainingMs,
    effectiveEndAt,
    getAuthoritativeNow,
    autoLockOnZero,
    isHost,
    lockRound,
  ]);

  const totalSec = Math.max(1, round.durationSeconds);
  const progressPct = Math.min(100, Math.max(0, (secondsLeft / totalSec) * 100));
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const isUrgent = round.status === 'ACTIVE' && secondsLeft > 0 && secondsLeft < 10;
  const isTimeUp =
    (round.status === 'LOCKED' && secondsLeft === 0) ||
    (round.status === 'ACTIVE' && effectiveEndAt !== null && secondsLeft === 0);

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
        ) : round.status === 'LOCKED' || isTimeUp ? (
          <Lock className="w-6 h-6 text-amber-400 shrink-0" />
        ) : (
          <Timer className="w-6 h-6 text-amber-400 shrink-0" />
        )}

        <span>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
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
          className={`h-full transition-all duration-200 ${
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
