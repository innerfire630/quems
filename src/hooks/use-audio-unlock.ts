// =============================================================================
// src/hooks/use-audio-unlock.ts — Audio unlock listener (3.3.1)
// =============================================================================
// Listens for the `quems:audio-unlocked` CustomEvent dispatched by the audio
// unlock overlay (3.2.1) when the operator clicks to enable audio.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';

/**
 * Module-scoped flag — survives client-side navigation (SPA transitions)
 * but resets on hard refresh / new tab.  This prevents the unlock overlay
 * from re-appearing when the user navigates within the app.
 */
let audioUnlockedGlobal = false;

/**
 * Returns `{ isAudioUnlocked: boolean }` — starts `false` (or `true` if
 * already unlocked in this browser session), flips to `true` once the
 * operator dismisses the audio unlock overlay.
 */
export function useAudioUnlock(): { isAudioUnlocked: boolean } {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(audioUnlockedGlobal);

  useEffect(() => {
    const handler = () => {
      audioUnlockedGlobal = true;
      setIsAudioUnlocked(true);
    };

    // Sync in case another component already unlocked audio
    if (audioUnlockedGlobal && !isAudioUnlocked) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from module-scoped flag
      setIsAudioUnlocked(true);
    }

    window.addEventListener('quems:audio-unlocked', handler);

    return () => {
      window.removeEventListener('quems:audio-unlocked', handler);
    };
  }, [isAudioUnlocked]);

  return { isAudioUnlocked };
}
