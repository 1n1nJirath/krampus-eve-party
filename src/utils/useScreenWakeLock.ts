import { useEffect } from 'react';

/**
 * Keeps mobile (/play) and projector (/display) screens awake using the Screen Wake Lock API.
 * Automatically re-acquires the lock when the tab regains visibility.
 */
export function useScreenWakeLock(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let wakeLockSentinel: WakeLockSentinel | null = null;
    let isMounted = true;

    const requestLock = async () => {
      try {
        if (!isMounted || document.visibilityState !== 'visible') return;
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinel> };
        };
        if (nav.wakeLock) {
          wakeLockSentinel = await nav.wakeLock.request('screen');
        }
      } catch {
        // Ignore if browser/OS denies wakeLock (e.g., low battery mode or background tab)
      }
    };

    requestLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {});
        wakeLockSentinel = null;
      }
    };
  }, [enabled]);
}
