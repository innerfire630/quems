// =============================================================================
// src/hooks/use-sse.ts — Client SSE subscription hook (3.1.2)
// =============================================================================
// Single entry point for subscribing to server-sent events from any client
// component. Opens an EventSource, parses incoming events into the typed
// envelope, invokes a caller-provided callback, and reconnects automatically
// with exponential backoff when the connection drops.
//
// Reconnection schedule: 1s, 2s, 4s, 8s, clamped at 30s max.
//
// References: Master Plan §11.2 (envelope), §11.5 (reconnection)
// =============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  SseEventType,
  SseEnvelope,
  SseInternalEnvelope,
  SseInternalEventType,
} from '@/types/sse.types';
import { SSE_INTERNAL_EVENTS } from '@/types/sse.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SseConnectionStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface UseSSEOptions<T extends SseEventType = SseEventType> {
  /** Called for each non-internal event matching the filter. */
  onEvent?: (envelope: SseEnvelope<T>) => void;
  /** Called for internal events (CONNECTED, etc.). */
  onInternalEvent?: (envelope: SseInternalEnvelope) => void;
  /** Filter to a specific event type or types. Narrows the payload type for onEvent. */
  filter?: T | readonly T[];
}

export interface UseSSEResult {
  status: SseConnectionStatus;
  reconnectAttempts: number;
  lastEventAt: Date | null;
  totalEventsReceived: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECONNECT_SCHEDULE: readonly number[] = [1000, 2000, 4000, 8000];
const MAX_RECONNECT_DELAY_MS = 30_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getReconnectDelay(attempt: number): number {
  const idx = Math.min(attempt, RECONNECT_SCHEDULE.length - 1);
  return RECONNECT_SCHEDULE[idx] ?? MAX_RECONNECT_DELAY_MS;
}

function isInternalEvent(type: string): type is SseInternalEventType {
  return (SSE_INTERNAL_EVENTS as readonly string[]).includes(type);
}

// ---------------------------------------------------------------------------
// useSSE hook
// ---------------------------------------------------------------------------

export function useSSE<T extends SseEventType = SseEventType>(
  channel: string,
  options?: UseSSEOptions<T>,
): UseSSEResult {
  const [status, setStatus] = useState<SseConnectionStatus>('idle');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<Date | null>(null);
  const [totalEventsReceived, setTotalEventsReceived] = useState(0);

  // Refs for values accessed inside the reconnection setTimeout closure
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUnmountedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  // Stable refs for callbacks so the effect doesn't re-run when callbacks change
  const onEventRef = useRef(options?.onEvent);
  const onInternalEventRef = useRef(options?.onInternalEvent);

  // Sync callback refs in an effect to avoid refs-during-render lint violation
  useEffect(() => {
    onEventRef.current = options?.onEvent;
    onInternalEventRef.current = options?.onInternalEvent;
  });

  // Serialize filter for stable dependency comparison
  const filterKey = options?.filter
    ? typeof options.filter === 'string'
      ? options.filter
      : JSON.stringify(options.filter)
    : undefined;

  useEffect(() => {
    isUnmountedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialising external EventSource connection
    setStatus('connecting');

    // Convert colon channel format to URL-safe dash format
    const urlChannel = channel.replace(/:/g, '-');
    const url = `${window.location.origin}/api/sse/${urlChannel}`;

    function connect(): void {
      if (isUnmountedRef.current) return;

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        if (isUnmountedRef.current) return;
        setStatus('open');
        setReconnectAttempts(0);
        reconnectAttemptsRef.current = 0;
      };

      es.onmessage = (event: MessageEvent) => {
        if (isUnmountedRef.current) return;

        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          console.warn(
            '[useSSE] Failed to parse event data:',
            (event.data as string).slice(0, 100),
          );
          return;
        }

        const type = data.type as string;

        // Internal events (CONNECTED) — route to onInternalEvent
        if (isInternalEvent(type)) {
          const internalEnvelope: SseInternalEnvelope = {
            type: type as SseInternalEventType,
            id: data.id as string,
            timestamp: data.timestamp as string,
            payload: data.payload as { clientId: string; channel: string },
          };
          onInternalEventRef.current?.(internalEnvelope);
          return;
        }

        // Apply filter
        const filter = options?.filter;
        if (filter) {
          if (typeof filter === 'string') {
            if (type !== filter) return;
          } else {
            if (!(filter as readonly string[]).includes(type)) return;
          }
        }

        // Update state
        setLastEventAt(new Date());
        setTotalEventsReceived((prev) => prev + 1);

        // Invoke callback — cast is safe because the filter narrows the type
        onEventRef.current?.(data as unknown as SseEnvelope<T>);
      };

      es.onerror = () => {
        if (isUnmountedRef.current) return;

        // Close the errored connection
        es.close();
        eventSourceRef.current = null;

        // Schedule reconnection
        setStatus('reconnecting');
        reconnectAttemptsRef.current += 1;
        setReconnectAttempts(reconnectAttemptsRef.current);

        const delay = getReconnectDelay(reconnectAttemptsRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    }

    connect();

    // Cleanup on unmount or dependency change
    return () => {
      isUnmountedRef.current = true;

      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      if (eventSourceRef.current !== null) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, filterKey]);

  return { status, reconnectAttempts, lastEventAt, totalEventsReceived };
}
