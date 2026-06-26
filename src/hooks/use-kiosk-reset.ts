// =============================================================================
// src/hooks/use-kiosk-reset.ts — Auto-reset inactivity timer (2.2.2)
// =============================================================================
// Client-side hook that resets the kiosk to the home screen after a
// configured period of user inactivity. Any tap, touch, keypress, or
// scroll resets the timer. An in-flight API call pauses the timer.
// =============================================================================
'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseKioskResetOptions {
  inactivitySeconds: number;
  onReset: () => void;
  paused?: boolean;
}

interface UseKioskResetReturn {
  reset: () => void;
}

const INTERACTION_EVENTS = ['click', 'touchstart', 'keydown', 'scroll'] as const;

export function useKioskReset({
  inactivitySeconds,
  onReset,
  paused = false,
}: UseKioskResetOptions): UseKioskResetReturn {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResetRef = useRef(onReset);

  // Sync the callback ref without triggering re-render issues
  useEffect(() => {
    onResetRef.current = onReset;
  }, [onReset]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      onResetRef.current();
    }, inactivitySeconds * 1000);
  }, [inactivitySeconds, clearTimer]);

  const handleInteraction = useCallback(() => {
    if (!paused) {
      startTimer();
    }
  }, [paused, startTimer]);

  // Manual reset trigger
  const reset = useCallback(() => {
    onResetRef.current();
  }, []);

  // Start timer on mount / restart on activity
  useEffect(() => {
    if (!paused) {
      startTimer();
    } else {
      clearTimer();
    }

    for (const event of INTERACTION_EVENTS) {
      document.addEventListener(event, handleInteraction, { passive: true });
    }

    return () => {
      clearTimer();
      for (const event of INTERACTION_EVENTS) {
        document.removeEventListener(event, handleInteraction);
      }
    };
  }, [paused, startTimer, clearTimer, handleInteraction]);

  return { reset };
}
