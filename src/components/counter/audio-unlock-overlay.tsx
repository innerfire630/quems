'use client';

// =============================================================================
// src/components/counter/audio-unlock-overlay.tsx — Audio unlock for counter
// =============================================================================
// Full-screen overlay that prompts the officer to click to enable audio.
// Appears on page load/refresh. Disappears after click. Similar to the
// TV display's AudioUnlockOverlay but styled for the counter dashboard.
// =============================================================================

import { useCallback } from 'react';
import { Bell, Volume2 } from 'lucide-react';

interface Props {
  onUnlock: () => void;
}

export function CounterAudioUnlockOverlay({ onUnlock }: Props) {
  const handleClick = useCallback(async () => {
    // Dispatch unlock event for any listeners
    window.dispatchEvent(new CustomEvent('quems:audio-unlocked'));
    onUnlock();
  }, [onUnlock]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer select-none bg-background/95 backdrop-blur-sm"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
    >
      <div className="flex flex-col items-center gap-6 text-center px-6">
        <div className="animate-pulse">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <Volume2 className="size-10 text-primary" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Click anywhere to enable alerts</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Enable audio notifications for new tickets and delayed reminders. Your browser requires
            a click to allow sound playback.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bell className="size-4" />
          <span>New ticket alerts &amp; delayed reminder sounds</span>
        </div>
      </div>
    </div>
  );
}
