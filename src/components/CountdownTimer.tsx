import React, { useEffect, useState, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { computeSecondsLeft } from '../logic/syncLogic';
import { soundFX } from '../utils/sound';
import { bgmEngine } from '../utils/bgm';
import { triggerHaptic } from '../utils/haptics';

interface CountdownTimerProps {
  size?: 'sm' | 'md' | 'lg';
  autoLockOnZero?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  size = 'md',
  autoLockOnZero = false,
}) => {
  const { state, isHost, getAuthoritativeNow, lockRound } = useGame();
  const { round } = state;
  const [displaySeconds, setDisplaySeconds] = useState<number>(round.durationSeconds);
  const lastSecRef = useRef<number>(-1);
  const autoLockedRoundKeyRef = useRef<string | null>(null);
  const timeUpFiredKeyRef = useRef<string | null>(null);

  useEffect(() => {
    lastSecRef.current = -1;
    soundFX.cancelScheduledCountdown();
  }, [round.id, round.status, round.timerEndAt, round.timerStartedAt]);

  useEffect(() => {
    if (round.status !== 'ACTIVE' || (round.timerEndAt === null && round.timerStartedAt === null)) {
      soundFX.cancelScheduledCountdown();
      if (round.timerRemainingMs !== null) {
        setDisplaySeconds(Math.max(0, Math.ceil(round.timerRemainingMs / 1000)));
      } else {
        setDisplaySeconds(round.durationSeconds);
      }
      return;
    }

    const effectiveEndAt =
      typeof round.timerEndAt === 'number'
        ? round.timerEndAt
        : (round.timerStartedAt as number) + round.durationSeconds * 1000;

    const tick = () => {
      const now = getAuthoritativeNow();
      const secsLeft = computeSecondsLeft(effectiveEndAt, now);
      setDisplaySeconds(secsLeft);

      if (secsLeft !== lastSecRef.current) {
        lastSecRef.current = secsLeft;
        if (secsLeft > 0 && secsLeft <= 10) {
          soundFX.playCountdownTick(secsLeft);
          // Switch BGM to PANIC track on final 10 seconds
          bgmEngine.syncWithGameState(round.gameStage, round.status, secsLeft, false);
          // Mobile haptic pulse on final 5 seconds
          if (secsLeft <= 5) {
            triggerHaptic('TIMER_URGENT');
          }
        }
      }

      if (secsLeft === 0 && round.status === 'ACTIVE') {
        const lockKey = `${round.id}:${effectiveEndAt}`;
        if (timeUpFiredKeyRef.current !== lockKey) {
          timeUpFiredKeyRef.current = lockKey;
          soundFX.playTimeUp();
          triggerHaptic('ERROR');
        }
        if (autoLockOnZero && isHost && autoLockedRoundKeyRef.current !== lockKey) {
          autoLockedRoundKeyRef.current = lockKey;
          lockRound();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 150);
    return () => {
      clearInterval(interval);
    };
  }, [
    round.id,
    round.status,
    round.timerEndAt,
    round.timerStartedAt,
    round.timerRemainingMs,
    round.durationSeconds,
    round.gameStage,
    autoLockOnZero,
    isHost,
    getAuthoritativeNow,
    lockRound,
  ]);

  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const isUrgent = round.status === 'ACTIVE' && displaySeconds <= 10 && displaySeconds > 0;
  const isCriticalFinal5 = round.status === 'ACTIVE' && displaySeconds <= 5 && displaySeconds > 0;
  const isEnded = displaySeconds === 0 && (round.status === 'LOCKED' || round.status === 'ACTIVE');

  const sizeClasses = {
    sm: 'text-xl px-3 py-1 rounded-lg',
    md: 'text-3xl px-4 py-2 rounded-xl',
    lg: 'text-5xl md:text-6xl px-6 py-3 rounded-2xl',
  }[size];

  return (
    <>
      {/* Full-Screen Pulsing Crimson Vignette on /display during final 5 seconds */}
      {size === 'lg' && isCriticalFinal5 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40 animate-final-5s-vignette"
        />
      )}
      <div
        className={`font-mono font-black tracking-wider border-2 transition-all duration-300 select-none flex items-center justify-center gap-2 ${sizeClasses} ${
          isEnded
            ? 'bg-red-950/90 border-red-500 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.65)]'
            : isCriticalFinal5
            ? 'bg-red-700/95 border-yellow-300 text-white animate-pulse shadow-[0_0_45px_rgba(239,68,68,0.95)] scale-105'
            : isUrgent
            ? 'bg-red-900/85 border-amber-400 text-amber-200 animate-pulse shadow-[0_0_35px_rgba(220,38,38,0.8)]'
            : round.status === 'ACTIVE'
            ? 'bg-slate-900/90 border-amber-500/70 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
            : 'bg-slate-900/70 border-slate-700 text-slate-300'
        }`}
      >
        <span>{formatted}</span>
        {round.status === 'LOCKED' && (
          <span className="text-xs font-sans uppercase tracking-widest px-2 py-0.5 bg-red-600 text-white rounded-full">
            LOCKED
          </span>
        )}
      </div>
    </>
  );
};
