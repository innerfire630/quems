// =============================================================================
// src/components/display/audio-unlock-overlay.tsx — Audio context unlock (3.2.1)
// =============================================================================

'use client';

import { useRef, useCallback } from 'react';
import Image from 'next/image';

interface AudioUnlockOverlayProps {
  onUnlock: () => void;
  logoUrl?: string | null;
}

export function AudioUnlockOverlay({ onUnlock, logoUrl }: AudioUnlockOverlayProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const handleClick = useCallback(async () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      window.dispatchEvent(new CustomEvent('quems:audio-unlocked'));
      console.debug('Audio context unlocked');
    } catch {
      // AudioContext may not be supported — unlock anyway so the display is visible
    }
    onUnlock();
  }, [onUnlock]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-display-bg flex items-center justify-center cursor-pointer select-none"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <div className="flex flex-col items-center gap-8 text-center px-8">
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Logo"
            width={96}
            height={96}
            className="max-h-24 object-contain"
            priority
          />
        )}
        <div className="animate-pulse">
          <svg className="w-20 h-20 text-display-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-display-text">Click anywhere to enable audio</h1>
        <p className="text-lg text-slate-400">
          Audio announcements will play when tickets are called
        </p>
      </div>
    </div>
  );
}
