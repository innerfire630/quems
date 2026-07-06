// =============================================================================
// src/components/display/audio-unlock-overlay.tsx — Audio context unlock (3.2.1)
// =============================================================================

'use client';

import { useCallback, type MutableRefObject } from 'react';
import Image from 'next/image';

interface AudioUnlockOverlayProps {
  onUnlock: () => void;
  logoUrl?: string | null;
  /**
   * Optional external AudioContext ref. When provided, the overlay uses this
   * instead of creating its own, so the caller (DisplayPageClient) can share
   * the context with the bell/TTS system.
   */
  audioCtxRef?: MutableRefObject<AudioContext | null>;
}

export function AudioUnlockOverlay({ onUnlock, logoUrl, audioCtxRef }: AudioUnlockOverlayProps) {
  const handleClick = useCallback(async () => {
    try {
      // Use external ref if provided, otherwise create inline
      const ctx = audioCtxRef
        ? (audioCtxRef.current ?? (audioCtxRef.current = new AudioContext()))
        : new AudioContext();

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      window.dispatchEvent(new CustomEvent('quems:audio-unlocked'));
      console.debug('Audio context unlocked');
    } catch {
      // AudioContext may not be supported — unlock anyway so the display is visible
    }
    onUnlock();
  }, [onUnlock, audioCtxRef]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer select-none"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <div className="flex flex-col items-center text-center" style={{ gap: 'clamp(1.5rem, 4vh, 3rem)', padding: '0 clamp(1.5rem, 4vw, 4rem)' }}>
        {logoUrl && (
          <Image
            src={logoUrl}
            alt="Logo"
            width={96}
            height={96}
            className="object-contain"
            style={{ maxHeight: 'clamp(3rem, 8vh, 6rem)', width: 'auto' }}
            priority
          />
        )}
        <div className="animate-pulse">
          <svg className="text-blue-600" style={{ width: 'clamp(2.5rem, 5vw, 5rem)', height: 'clamp(2.5rem, 5vw, 5rem)' }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
        </div>
        <h1 className="font-bold" style={{ fontSize: 'clamp(1.2rem, 3vw, 2.5rem)', color: 'var(--db-text)' }}>Click anywhere to enable audio</h1>
        <p style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1.5rem)', color: 'var(--db-text-muted)' }}>
          Audio announcements will play when tickets are called
        </p>
      </div>
    </div>
  );
}
