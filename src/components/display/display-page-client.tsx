// =============================================================================
// src/components/display/display-page-client.tsx — Client wrapper (3.2.1 / 3.3.x)
// =============================================================================
// Top-level client component that holds the SSE subscription, the display
// state, the audio context lifecycle, and the announcement hook.
// =============================================================================

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSSE } from '@/hooks/use-sse';
import { applyEvent } from '@/lib/display-state';
import { loadBellBuffer, getCachedBellBuffer } from '@/lib/audio-bell';
import { useAudioUnlock } from '@/hooks/use-audio-unlock';
import { useAnnouncement } from '@/hooks/use-announcement';
import { AudioUnlockOverlay } from './audio-unlock-overlay';
import { DisplayClock } from './display-clock';
import { DisplayCounterGrid } from './display-counter-grid';
import { MarqueeMessage } from './marquee-message';
import { BroadcastBanner } from './broadcast-banner';
import type { DisplaySnapshot, DisplayState } from '@/types/display.types';

interface DisplayPageClientProps {
  initialSnapshot: DisplaySnapshot;
  boardId: string | null;
}

function buildInitialState(snapshot: DisplaySnapshot): DisplayState {
  const counters: DisplayState['counters'] = {};
  const counterStatus: DisplayState['counterStatus'] = {};
  const nowServing: DisplayState['nowServing'] = {};
  const recentByCounter: DisplayState['recentByCounter'] = {};

  for (const c of snapshot.counters) {
    counters[c.id] = c;
    counterStatus[c.id] = 'open';
    nowServing[c.id] = snapshot.servingTickets[c.id] ?? null;
    recentByCounter[c.id] = snapshot.recentTickets[c.id] ?? [];
  }

  return {
    board: snapshot.board,
    counters,
    nowServing,
    recentByCounter,
    counterStatus,
    broadcastMessage: null,
  };
}

export function DisplayPageClient({ initialSnapshot, boardId: _boardId }: DisplayPageClientProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [state, setState] = useState<DisplayState>(() => buildInitialState(initialSnapshot));
  const broadcastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Audio unlock listener (bridges the overlay's event to a boolean)
  const { isAudioUnlocked } = useAudioUnlock();

  // Sync the AudioContext from the ref into state once created (avoids refs-during-render)
  useEffect(() => {
    if (audioCtxRef.current && !audioContext) {
      setAudioContext(audioCtxRef.current);
    }
  }, [unlocked, audioContext]);

  // Bell buffer preload — start decoding as soon as we have an unlocked AudioContext
  const [bellBuffer, setBellBuffer] = useState<AudioBuffer | null>(getCachedBellBuffer);

  const handleUnlock = useCallback(() => setUnlocked(true), []);

  // Preload the bell buffer once the overlay creates the AudioContext (and we're unlocked)
  useEffect(() => {
    if (!unlocked || !audioCtxRef.current || bellBuffer) return;

    let cancelled = false;
    loadBellBuffer(audioCtxRef.current)
      .then((buf) => {
        if (!cancelled) setBellBuffer(buf);
      })
      .catch((err) => {
        console.warn('Bell buffer preload failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [unlocked, bellBuffer]);

  // Wire the announcement queue (bell + TTS orchestration)
  useAnnouncement({
    displayBoard: state.board,
    audioContext,
    bellBuffer,
    isAudioUnlocked,
  });

  // SSE subscription
  useSSE('global', {
    filter: [
      'TICKET_CALLED',
      'TICKET_RECALLED',
      'TICKET_NO_SHOW',
      'COUNTER_OPENED',
      'COUNTER_CLOSED',
      'DAILY_RESET',
      'BROADCAST_MESSAGE',
    ],
    onEvent: useCallback((envelope: import('@/types/sse.types').SseEventPayload) => {
      setState((prev) => applyEvent(prev, envelope as import('@/types/sse.types').SseEventPayload));
    }, []),
  });

  // Auto-dismiss broadcast message after expiry
  useEffect(() => {
    if (state.broadcastMessage) {
      const remaining = Math.max(0, state.broadcastMessage.expiresAt - Date.now());
      broadcastTimerRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, broadcastMessage: null }));
      }, remaining);
    }
    return () => {
      if (broadcastTimerRef.current) {
        clearTimeout(broadcastTimerRef.current);
      }
    };
  }, [state.broadcastMessage]);

  // Show unlock overlay until dismissed
  if (!unlocked) {
    return (
      <AudioUnlockOverlay
        onUnlock={handleUnlock}
        logoUrl={state.board?.logoUrl}
        audioCtxRef={audioCtxRef}
      />
    );
  }

  const maxDisplayedTickets = state.board?.maxDisplayedTickets ?? 10;
  const countersList = Object.values(state.counters);

  return (
    <div className="fixed inset-0 bg-display-bg overflow-hidden flex flex-col">
      {/* Top bar */}
      <header className="h-12 flex items-center justify-between px-6 border-b border-slate-700 shrink-0">
        <div className="flex items-center gap-3">
          {state.board?.logoUrl && (
            <Image
              src={state.board.logoUrl}
              alt={state.board.name}
              width={120}
              height={32}
              className="h-8 object-contain"
              priority
            />
          )}
          {!state.board?.logoUrl && state.board && (
            <span className="text-display-text font-semibold text-lg">{state.board.name}</span>
          )}
        </div>
        <DisplayClock />
      </header>

      {/* Broadcast banner */}
      <BroadcastBanner
        message={state.broadcastMessage}
        onExpire={() => setState((prev) => ({ ...prev, broadcastMessage: null }))}
      />

      {/* Main counter grid */}
      <DisplayCounterGrid
        counters={countersList}
        nowServing={state.nowServing}
        recentByCounter={state.recentByCounter}
        counterStatus={state.counterStatus}
        maxDisplayedTickets={maxDisplayedTickets}
      />

      {/* Bottom marquee */}
      <MarqueeMessage message={state.board?.customMessage ?? null} />
    </div>
  );
}
