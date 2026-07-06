// =============================================================================
// src/lib/sse-connection-manager.ts — Shared SSE connection pool (3.1.2 fix)
// =============================================================================
// Singleton pool that multiplexes a single EventSource per channel across
// multiple hook subscribers. This solves the browser 6-connection-per-domain
// HTTP/1.1 limit: without sharing, 5 counter-manager components + 1 display
// component = 6 connections, exhausting the pool and blocking page loads.
//
// Architecture:
//   Channel "counter:abc" → one SharedConnection → N subscribers
//   Each subscriber has its own filter + callback.
//   The shared connection auto-reconnects once, not N times.
//   When the last subscriber unsubscribes, the EventSource is closed.
//
// References: Master Plan §11.5 (reconnection)
// =============================================================================

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

export interface SseSubscriberOptions<T extends SseEventType = SseEventType> {
  onEvent?: (envelope: SseEnvelope<T>) => void;
  onInternalEvent?: (envelope: SseInternalEnvelope) => void;
  filter?: T | readonly T[];
}

export interface SseSubscriberState {
  status: SseConnectionStatus;
  reconnectAttempts: number;
  lastEventAt: Date | null;
  totalEventsReceived: number;
}

export type Unsubscribe = () => void;

export type StatusChangeListener = (status: SseConnectionStatus) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RECONNECT_SCHEDULE: readonly number[] = [1000, 2000, 4000, 8000];
const MAX_RECONNECT_DELAY_MS = 30_000;

function getReconnectDelay(attempt: number): number {
  const idx = Math.min(attempt, RECONNECT_SCHEDULE.length - 1);
  return RECONNECT_SCHEDULE[idx] ?? MAX_RECONNECT_DELAY_MS;
}

function isInternalEvent(type: string): type is SseInternalEventType {
  return (SSE_INTERNAL_EVENTS as readonly string[]).includes(type);
}

// ---------------------------------------------------------------------------
// Subscriber record
// ---------------------------------------------------------------------------

interface Subscriber<T extends SseEventType = SseEventType> {
  id: string;
  options: SseSubscriberOptions<T>;
  onStatusChange: StatusChangeListener;
  eventsReceived: number;
}

// ---------------------------------------------------------------------------
// SharedConnection — one EventSource, many subscribers
// ---------------------------------------------------------------------------

class SharedConnection {
  private eventSource: EventSource | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private status: SseConnectionStatus = 'idle';
  private lastEventAt: Date | null = null;

  /** subscriber id → subscriber */
  private subscribers = new Map<string, Subscriber>();

  constructor(
    private readonly channel: string,
    private readonly url: string,
  ) {}

  // ---- Subscriber management ----

  addSubscriber<T extends SseEventType>(
    id: string,
    options: SseSubscriberOptions<T>,
    onStatusChange: StatusChangeListener,
  ): Unsubscribe {
    const subscriber: Subscriber<T> = {
      id,
      options,
      onStatusChange,
      eventsReceived: 0,
    };
    this.subscribers.set(id, subscriber as unknown as Subscriber);

    // If this is the first subscriber, open the connection
    if (this.subscribers.size === 1) {
      this.connect();
    } else {
      // Already connected — push current status to the new subscriber
      onStatusChange(this.status);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /** Snapshot of per-subscriber stats for diagnostics. */
  getStats(): { channel: string; subscribers: number; status: SseConnectionStatus } {
    return { channel: this.channel, subscribers: this.subscribers.size, status: this.status };
  }

  // ---- Connection lifecycle ----

  private connect(): void {
    if (this.eventSource) return; // already open or opening

    this.setStatus('connecting');
    this.doConnect();
  }

  private doConnect(): void {
    const es = new EventSource(this.url);
    this.eventSource = es;

    es.onopen = () => {
      this.setStatus('open');
      this.reconnectAttempts = 0;
    };

    es.onmessage = (event: MessageEvent) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(event.data as string) as Record<string, unknown>;
      } catch {
        console.warn(
          '[sse-manager] Failed to parse event data:',
          (event.data as string).slice(0, 100),
        );
        return;
      }

      const type = data.type as string;

      // Internal events (CONNECTED) — fan out to all subscribers
      if (isInternalEvent(type)) {
        const internalEnvelope: SseInternalEnvelope = {
          type: type as SseInternalEventType,
          id: data.id as string,
          timestamp: data.timestamp as string,
          payload: data.payload as { clientId: string; channel: string },
        };
        for (const sub of this.subscribers.values()) {
          sub.options.onInternalEvent?.(internalEnvelope);
        }
        return;
      }

      // Regular events — fan out with per-subscriber filtering
      this.lastEventAt = new Date();
      for (const sub of this.subscribers.values()) {
        // Apply filter
        const filter = sub.options.filter;
        if (filter) {
          if (typeof filter === 'string') {
            if (type !== filter) continue;
          } else {
            if (!(filter as readonly string[]).includes(type)) continue;
          }
        }

        sub.eventsReceived += 1;
        // Invoke callback with the data as envelope
        sub.options.onEvent?.(data as unknown as SseEnvelope<SseEventType>);
      }
    };

    es.onerror = () => {
      // Close the errored connection
      es.close();
      this.eventSource = null;

      // Schedule reconnection
      this.setStatus('reconnecting');
      this.reconnectAttempts += 1;

      const delay = getReconnectDelay(this.reconnectAttempts);
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[sse-manager] Reconnecting ${this.channel} in`, delay, 'ms');
      }
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        // Only reconnect if there are still subscribers
        if (this.subscribers.size > 0) {
          this.doConnect();
        }
      }, delay);
    };
  }

  private disconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource !== null) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setStatus('closed');
    this.reconnectAttempts = 0;
  }

  private setStatus(newStatus: SseConnectionStatus): void {
    this.status = newStatus;
    // Fan out status change to all subscribers
    for (const sub of this.subscribers.values()) {
      sub.onStatusChange(newStatus);
    }
  }
}

// ---------------------------------------------------------------------------
// Connection pool — singleton per channel
// ---------------------------------------------------------------------------

const pool = new Map<string, SharedConnection>();

function getOrCreateConnection(channel: string): SharedConnection {
  let conn = pool.get(channel);
  if (!conn) {
    const urlChannel = channel.replace(/:/g, '-');
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/sse/${urlChannel}`;
    conn = new SharedConnection(channel, url);
    pool.set(channel, conn);
  }
  return conn;
}

/** Remove a channel from the pool (called when last subscriber leaves). */
function maybeCleanup(channel: string): void {
  const conn = pool.get(channel);
  if (conn && conn.getSubscriberCount() === 0) {
    pool.delete(channel);
  }
}

// ---------------------------------------------------------------------------
// Public API — used by the useSSE hook
// ---------------------------------------------------------------------------

let nextId = 0;

/**
 * Subscribe to a shared SSE channel. Returns an unsubscribe function.
 *
 * The hook calls this on mount and calls the returned function on unmount.
 * Multiple hooks on the same channel share a single EventSource.
 */
export function subscribeToChannel<T extends SseEventType>(
  channel: string,
  options: SseSubscriberOptions<T>,
  onStatusChange: StatusChangeListener,
): Unsubscribe {
  const id = `sub_${++nextId}`;
  const conn = getOrCreateConnection(channel);
  const unsub = conn.addSubscriber(id, options, onStatusChange);
  return () => {
    unsub();
    maybeCleanup(channel);
  };
}

/**
 * Debug helper — returns stats for all active connections.
 * Call from browser console: `__ssePool()`
 */
export function getConnectionPoolStats(): Array<{
  channel: string;
  subscribers: number;
  status: SseConnectionStatus;
}> {
  return Array.from(pool.values()).map((c) => c.getStats());
}

// Expose on globalThis for debugging in dev
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__ssePool = getConnectionPoolStats;
}
