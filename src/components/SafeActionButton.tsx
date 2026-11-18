import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface UseSafeClickOptions {
  /** Minimum cooldown window (ms) before the handler can fire again. Defaults to 450ms. */
  cooldownMs?: number;
  /** Calls e.stopPropagation() to block event bubbling into parent containers. Defaults to true. */
  stopPropagation?: boolean;
  /** Calls e.preventDefault() when firing. Defaults to false. */
  preventDefault?: boolean;
}

/**
 * Custom React hook to eliminate double-clicks, phantom taps, and rapid multi-firing.
 * Uses synchronous refs so duplicate events arriving in the same render frame are dropped
 * immediately before React state latency can leave UI controls enabled.
 */
export function useSafeClick<TEvent extends React.SyntheticEvent = React.MouseEvent<HTMLButtonElement>>(
  callback?: (event: TEvent) => void | Promise<unknown>,
  options: UseSafeClickOptions = {}
): [(event: TEvent) => void, boolean] {
  const { cooldownMs = 450, stopPropagation = true, preventDefault = false } = options;

  const [isPending, setIsPending] = useState(false);
  const busyRef = useRef(false);
  const lastFiredRef = useRef(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
    };
  }, []);

  const wrappedHandler = useCallback(
    (event: TEvent) => {
      if (stopPropagation && typeof event?.stopPropagation === 'function') {
        event.stopPropagation();
      }
      if (preventDefault && typeof event?.preventDefault === 'function') {
        event.preventDefault();
      }

      const now = Date.now();
      if (busyRef.current || now - lastFiredRef.current < cooldownMs) {
        if (typeof event?.preventDefault === 'function') {
          event.preventDefault();
        }
        return;
      }

      busyRef.current = true;
      lastFiredRef.current = now;
      if (mountedRef.current) {
        setIsPending(true);
      }

      const releaseAfterCooldown = () => {
        const elapsed = Date.now() - now;
        const remaining = Math.max(0, cooldownMs - elapsed);
        if (cooldownTimerRef.current) {
          clearTimeout(cooldownTimerRef.current);
        }
        cooldownTimerRef.current = setTimeout(() => {
          busyRef.current = false;
          if (mountedRef.current) {
            setIsPending(false);
          }
        }, remaining);
      };

      if (!callback) {
        releaseAfterCooldown();
        return;
      }

      Promise.resolve()
        .then(() => callback(event))
        .catch(() => {
          // Allow caller-specific error handling without leaving the button permanently stuck
        })
        .finally(releaseAfterCooldown);
    },
    [callback, cooldownMs, preventDefault, stopPropagation]
  );

  return [wrappedHandler, isPending];
}

export interface SafeActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Cooldown window (ms) preventing duplicate fires. Defaults to 450ms. */
  cooldownMs?: number;
  /** Whether to show a spinning Loader icon while the click lock is active. Defaults to true. */
  showSpinner?: boolean;
  /** Optional replacement text while loading/pending. */
  loadingText?: string;
  /** Stop event bubbling to parent clickable elements. Defaults to true. */
  stopPropagation?: boolean;
  /** Call preventDefault on click. Defaults to true for non-submit buttons. */
  preventDefault?: boolean;
}

/**
 * Drop-in replacement for `<button>` that prevents double-click / phantom click bugs via:
 * 1. Immediate optimistic disabled state (`isPending`) + optional spinner.
 * 2. Synchronous ref debounce/cooldown lock (`cooldownMs`).
 * 3. Built-in `stopPropagation()` and safe `preventDefault()` handling.
 */
export const SafeActionButton: React.FC<SafeActionButtonProps> = ({
  onClick,
  disabled,
  children,
  className = '',
  type = 'button',
  cooldownMs = 450,
  showSpinner = true,
  loadingText,
  stopPropagation = true,
  preventDefault,
  ...rest
}) => {
  const shouldPreventDefault = preventDefault ?? type !== 'submit';

  const [handleSafeClick, isPending] = useSafeClick<React.MouseEvent<HTMLButtonElement>>(
    onClick,
    {
      cooldownMs,
      stopPropagation,
      preventDefault: shouldPreventDefault,
    }
  );

  const isDisabled = Boolean(disabled || isPending);

  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      aria-busy={isPending || undefined}
      onClick={handleSafeClick}
      className={`${className} ${isPending ? 'opacity-75 pointer-events-none' : ''}`}
    >
      {isPending && showSpinner ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{loadingText || children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
