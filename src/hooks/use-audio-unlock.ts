// =============================================================================
// src/hooks/use-audio-unlock.ts — Audio unlock listener (3.3.1)
// =============================================================================
// Listens for the `quems:audio-unlocked` CustomEvent dispatched by the audio
// unlock overlay (3.2.1) when the operator clicks to enable audio.
// =============================================================================

'use client';

import { useEffect, useState } from 'react';

/**
 * Returns `{ isAudioUnlocked: boolean }` — starts `false`, flips to `true`
 * once the operator dismisses the audio unlock overlay.
 */
export function useAudioUnlock(): { isAudioUnlocked: boolean } {
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  useEffect(() => {
    const handler = () => {
      setIsAudioUnlocked(true);
    };

    window.addEventListener('quems:audio-unlocked', handler);

    return () => {
      window.removeEventListener('quems:audio-unlocked', handler);
    };
  }, []);

  return { isAudioUnlocked };
}
