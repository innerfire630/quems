// =============================================================================
// src/components/display/display-page-client.tsx — Client wrapper (3.2.1 / 3.3.x)
// =============================================================================
// Top-level client component that holds the SSE subscription, the display
// state, the audio context lifecycle, and the announcement hook.
// =============================================================================

'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSSE } from '@/hooks/use-sse';
import { applyEvent } from '@/lib/display-state';
import { loadBellBuffer, getCachedBellBuffer } from '@/lib/audio-bell';
import { useAudioUnlock } from '@/hooks/use-audio-unlock';
import { useAnnouncement } from '@/hooks/use-announcement';
import { AudioUnlockOverlay } from './audio-unlock-overlay';
import { DisplayClock } from './display-clock';
import { NowServingHero } from './now-serving-hero';
import { RecentCallsList } from './recent-calls-list';
import { MarqueeMessage } from './marquee-message';
import { BroadcastBanner } from './broadcast-banner';
import type { DisplaySnapshot, DisplayState, TicketDisplayData } from '@/types/display.types';

interface DisplayPageClientProps {
  initialSnapshot: DisplaySnapshot;
  boardId: string | null;
  systemName?: string;
  brandLogo?: string | null;
  displayTheme?: string;
  marqueeMessage?: string | null;
}

function buildInitialState(snapshot: DisplaySnapshot): DisplayState {
  const counters: DisplayState['counters'] = {};
  const counterStatus: DisplayState['counterStatus'] = {};
  const counterCloseReasons: DisplayState['counterCloseReasons'] = {};
  const nowServing: DisplayState['nowServing'] = {};
  const recentByCounter: DisplayState['recentByCounter'] = {};

  for (const c of snapshot.counters) {
    counters[c.id] = c;
    // Use real closed status from snapshot instead of hardcoding 'open'
    const closedInfo = snapshot.counterClosedStatus[c.id];
    counterStatus[c.id] = closedInfo?.closed ? 'closed' : 'open';
    if (closedInfo?.closed && closedInfo.reason) {
      counterCloseReasons[c.id] = closedInfo.reason;
    }
    nowServing[c.id] = snapshot.servingTickets[c.id] ?? null;
    recentByCounter[c.id] = snapshot.recentTickets[c.id] ?? [];
  }

  return {
    board: snapshot.board,
    counters,
    nowServing,
    recentByCounter,
    counterStatus,
    counterCloseReasons,
    broadcastMessage: null,
  };
}

export function DisplayPageClient({
  initialSnapshot,
  boardId: _boardId,
  systemName = 'QUEMS',
  brandLogo,
  displayTheme = 'dark',
  marqueeMessage: marqueeMessageProp,
}: DisplayPageClientProps) {
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
      'TICKET_SERVED',
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

  // Compute the single most recently called ticket for the hero display
  // Prefer active (CALLED/RECALLED) tickets — when the hero is served,
  // automatically promote the next active ticket from history
  const latestTicket = useMemo(() => {
    const allServing = Object.values(state.nowServing).filter(
      (t): t is TicketDisplayData => t !== null,
    );
    if (allServing.length === 0) return null;

    const sorted = allServing.sort(
      (a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime(),
    );

    // Prefer active tickets (CALLED/RECALLED) over served/no-show
    const active = sorted.filter((t) => t.status === 'CALLED' || t.status === 'RECALLED');
    return active.length > 0 ? active[0]! : sorted[0]!;
  }, [state.nowServing]);

  // Build flat sorted history: displaced serving tickets + recentByCounter, excluding hero
  const historyTickets = useMemo(() => {
    const all: TicketDisplayData[] = [];
    for (const t of Object.values(state.nowServing)) {
      if (t && t.id !== latestTicket?.id) {
        all.push(t);
      }
    }
    for (const tickets of Object.values(state.recentByCounter)) {
      all.push(...tickets);
    }
    const seen = new Set<string>();
    if (latestTicket) seen.add(latestTicket.id);
    const deduped: TicketDisplayData[] = [];
    for (const t of all.sort(
      (a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime(),
    )) {
      if (!seen.has(t.id)) {
        seen.add(t.id);
        deduped.push(t);
      }
    }
    return deduped.sort((a, b) => {
      const aActive = a.status === 'CALLED' || a.status === 'RECALLED' ? 0 : 1;
      const bActive = b.status === 'CALLED' || b.status === 'RECALLED' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime();
    });
  }, [state.nowServing, state.recentByCounter, latestTicket]);

  // Compute counter notices (closed counters with reasons)
  const counterNotices = useMemo(() => {
    const notices: string[] = [];
    for (const [counterId, status] of Object.entries(state.counterStatus)) {
      if (status === 'closed') {
        const counter = state.counters[counterId];
        const counterNum = counter?.number ?? '?';
        const reason = state.counterCloseReasons[counterId];
        notices.push(
          reason
            ? `Counter ${counterNum} : ${reason}`
            : `Counter ${counterNum} : temporarily closed`,
        );
      }
    }
    return notices;
  }, [state.counterStatus, state.counterCloseReasons, state.counters]);

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

  // Theme CSS custom properties — all display components reference these vars
  const isLight = displayTheme === 'light';
  const themeVars = isLight
    ? {
        '--db-bg': '#ffffff',
        '--db-surface': '#f9fafb',
        '--db-surface-2': '#f3f4f6',
        '--db-border': '#e5e7eb',
        '--db-border-light': '#d1d5db',
        '--db-text': '#111827',
        '--db-text-secondary': '#374151',
        '--db-text-muted': '#6b7280',
        '--db-text-dim': '#9ca3af',
        '--db-accent': '#f59e0b',
        '--db-accent-text': '#ffffff',
        '--db-ticket': '#2563eb',
        '--db-ticket-recalled': '#d97706',
        '--db-ticket-served': '#059669',
        '--db-ticket-noshow': '#dc2626',
        '--db-gradient-from': '#f9fafb',
        '--db-gradient-via': '#ffffff',
        '--db-gradient-to': '#f9fafb',
      }
    : {
        '--db-bg': '#09090b',
        '--db-surface': '#18181b',
        '--db-surface-2': '#27272a',
        '--db-border': '#3f3f46',
        '--db-border-light': '#27272a',
        '--db-text': '#fafafa',
        '--db-text-secondary': '#d4d4d8',
        '--db-text-muted': '#a1a1aa',
        '--db-text-dim': '#71717a',
        '--db-accent': '#f59e0b',
        '--db-accent-text': '#09090b',
        '--db-ticket': '#3b82f6',
        '--db-ticket-recalled': '#f59e0b',
        '--db-ticket-served': '#10b981',
        '--db-ticket-noshow': '#ef4444',
        '--db-gradient-from': '#18181b',
        '--db-gradient-via': '#09090b',
        '--db-gradient-to': '#18181b',
      };

  return (
    <div
      className="fixed inset-0 font-sans flex flex-col overflow-hidden"
      style={{ ...themeVars, backgroundColor: 'var(--db-bg)', color: 'var(--db-text)' }}
    >
      {/* Header — 10vh */}
      <header
        className="shrink-0 border-b-2 flex items-center justify-between"
        style={{
          height: 'clamp(2rem, 6vmin, 4rem)',
          padding: '0 clamp(0.8rem, 1.5vmin, 2rem)',
          backgroundColor: 'var(--db-surface)',
          borderColor: 'var(--db-border)',
        }}
      >
        <div className="flex items-center" style={{ gap: 'clamp(0.4rem, 0.8vw, 1rem)' }}>
          {brandLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogo}
              alt={systemName}
              className="object-contain"
              style={{ width: 'clamp(1rem, 2vmin, 2rem)', height: 'clamp(1rem, 2vmin, 2rem)' }}
            />
          ) : null}
          <span
            className="font-black tracking-wider uppercase"
            style={{ fontSize: 'clamp(0.7rem, 1.5vmin, 1.5rem)', color: 'var(--db-text)' }}
          >
            {systemName}
          </span>
        </div>
        <DisplayClock />
      </header>

      {/* Broadcast banner overlay */}
      <BroadcastBanner
        message={state.broadcastMessage}
        onExpire={() => setState((prev) => ({ ...prev, broadcastMessage: null }))}
      />

      {/* Main content — fills remaining space, responsive layout */}
      <main className="flex-1 grid grid-rows-[55%_45%] md:grid-rows-none md:grid-cols-[65%_35%] min-h-0 overflow-hidden">
        <NowServingHero ticket={latestTicket} notices={counterNotices} />
        <RecentCallsList tickets={historyTickets} />
      </main>

      {/* Footer ticker — 5vh */}
      <MarqueeMessage message={marqueeMessageProp ?? state.board?.customMessage ?? null} />
    </div>
  );
}
