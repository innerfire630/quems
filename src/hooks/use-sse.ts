// =============================================================================
// src/hooks/use-sse.ts — Client SSE subscription hook (3.1.2)
// =============================================================================
// Single entry point for subscribing to server-sent events from any client
// component. Delegates to the shared connection pool (sse-connection-manager)
// so that multiple components on the same channel share one EventSource,
// staying well under the browser's 6-connection-per-domain limit.
//
// Reconnection is handled by the shared connection, not per-hook.
//
// References: Master Plan §11.2 (envelope), §11.5 (reconnection)
// =============================================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import type { SseEventType, SseEnvelope, SseInternalEnvelope } from '@/types/sse.types';
import { subscribeToChannel } from '@/lib/sse-connection-manager';
import type { SseConnectionStatus } from '@/lib/sse-connection-manager';

// Re-export for consumers that import the type from this module
export type { SseConnectionStatus };

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
    const unsubscribe = subscribeToChannel<T>(
      channel,
      {
        onEvent: (envelope) => {
          onEventRef.current?.(envelope);
          setLastEventAt(new Date());
          setTotalEventsReceived((prev) => prev + 1);
        },
        onInternalEvent: (envelope) => {
          onInternalEventRef.current?.(envelope);
        },
        filter: options?.filter,
      },
      (newStatus) => {
        setStatus(newStatus);
        if (newStatus === 'reconnecting') {
          setReconnectAttempts((prev) => prev + 1);
        } else if (newStatus === 'open') {
          setReconnectAttempts(0);
        }
      },
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, filterKey]);

  return { status, reconnectAttempts, lastEventAt, totalEventsReceived };
}
