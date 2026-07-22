// =============================================================================
// src/lib/events.ts — Event broadcasting system (Phase 2.1.1 seam → 3.1.3 real)
// =============================================================================
// The broadcastEvent() function is the single call site for delivering SSE
// events to connected clients. Its signature was LOCKED in Phase 2.1.1 and
// MUST NOT change. Phase 2 call sites are unchanged — this document provides
// the real body.
//
// EVENT_ROUTING is the data structure declaring which event types go to which
// channels. It covers every SseEventType value (enforced by TypeScript).
// Entries for events not yet emitted are documented with forward-seam comments
// indicating the future sub-phase that will be the first to emit each type.
//
// broadcastRoutedEvent() is a convenience wrapper that resolves dynamic channel
// references (e.g., counter:<counterId>) from the routing table.
//
// Best-effort guarantee: failures are logged via console.error and silently
// swallowed. Event publishing must never throw — the calling business logic
// (ticket call, recall, no-show, etc.) must succeed regardless.
// =============================================================================

import { randomUUID } from 'node:crypto';
import type { SseChannel, SseEventType } from '@/types/sse.types';
import { sseManager } from '@/lib/sse-manager';
import type { SSEEnvelope } from '@/lib/sse-client';

// ---------------------------------------------------------------------------
// Types (local to this module)
// ---------------------------------------------------------------------------

/** Supported channel pattern types for the routing table. */
type SseChannelPattern = 'global' | `counter:${string}`;

/**
 * A route template string that may contain a `<counterId>` placeholder.
 * At broadcast time, placeholders are substituted with actual values.
 */
type RouteTemplate = SseChannelPattern;

/** Context for resolving dynamic channel references. */
export interface BroadcastContext {
  counterId?: string;
}

// ---------------------------------------------------------------------------
// Event Routing Table
// =============================================================================
// SINGLE SOURCE OF TRUTH for which event types go to which channels.
// Every SseEventType MUST have an entry (TypeScript enforces this via the
// Record<SseEventType, ...> type). Entries for future events are documented
// with forward-seam comments.
// ---------------------------------------------------------------------------

export const EVENT_ROUTING: Record<SseEventType, readonly RouteTemplate[]> = {
  // Phase 2.2.1 — ticket issuance
  TICKET_ISSUED: ['global'],

  // Phase 2.3.1 — call / recall
  TICKET_CALLED: ['global'],
  TICKET_RECALLED: ['global'],

  // Phase 2.3.2 — no-show
  TICKET_NO_SHOW: ['global'],

  // Phase 2.3.3 — daily reset
  DAILY_RESET: ['global'],

  // Phase 3.3+ — ticket served (forward seam: no source emits this yet)
  TICKET_SERVED: ['global'],

  // Phase 4.2.3 — ticket completed (forward seam)
  TICKET_COMPLETED: ['global'],

  // Phase 4.3 — broadcast message (forward seam)
  BROADCAST_MESSAGE: ['global'],

  // Phase 4.2.1 — counter open/close (emitted by PATCH /api/counters/[counterId]/status)
  COUNTER_OPENED: ['global', 'counter:<counterId>'],
  COUNTER_CLOSED: ['global', 'counter:<counterId>'],

  // Phase 4.2.3 — queue updated (per-counter) (forward seam)
  QUEUE_UPDATED: ['counter:<counterId>'],

  // Phase 4.1 — notification received (per-counter) (forward seam)
  NOTIFICATION_RECEIVED: ['counter:<counterId>'],

  // Phase 4.3 — officer reply to broadcast (forward seam)
  OFFICER_REPLY: ['global'],

  // Chat events — live customer-staff chat
  CUSTOMER_CHAT_MESSAGE: ['global'],
  STAFF_CHAT_MESSAGE: ['global'],
};

// ---------------------------------------------------------------------------
// Envelope builder (private)
// ---------------------------------------------------------------------------

/**
 * Builds the canonical SSE envelope (Master Plan §11.2).
 * @returns { type, id, timestamp, payload }
 */
function buildEnvelope(eventType: SseEventType, payload: Record<string, unknown>): SSEEnvelope {
  return {
    type: eventType,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    payload,
  };
}

// ---------------------------------------------------------------------------
// broadcastEvent() — THE SEAM FUNCTION
// =============================================================================
// SIGNATURE LOCKED by Phase 2.1.1 — DO NOT MODIFY the parameter order,
// parameter types, return type, or export shape. Phase 2 call sites in
// src/lib/ticket-service.ts and src/lib/queue-reset.ts are unchanged.
//
// This function is synchronous-best-effort: wrapped in try/catch, never throws.
// Failures are logged to console.error and swallowed.
// ---------------------------------------------------------------------------

/**
 * Broadcasts an SSE event to one or more channels.
 *
 * @param channel  - The SSE channel to broadcast to.
 * @param eventType - The event type (e.g. 'TICKET_ISSUED').
 * @param payload   - The event-specific payload.
 */
export async function broadcastEvent(
  channel: SseChannel,
  eventType: SseEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
): Promise<void> {
  try {
    const envelope = buildEnvelope(eventType, payload as Record<string, unknown>);
    sseManager.sendToChannel(channel, envelope);

    console.debug(
      `[broadcastEvent] id=${envelope.id} type=${envelope.type} channel=${channel} clients=${sseManager.getChannelClientCount(channel)}`,
    );
  } catch (error) {
    // Best-effort: never let a broadcast failure crash the calling business logic
    console.error('[broadcastEvent] Failed to deliver event:', error);
  }
}

// ---------------------------------------------------------------------------
// Channel template resolver (private)
// ---------------------------------------------------------------------------

/**
 * Resolves a route template to a concrete channel name.
 * Returns null if the template cannot be resolved (e.g., counter:<counterId>
 * without a counterId in context).
 */
function resolveChannelTemplate(
  template: RouteTemplate,
  context?: BroadcastContext,
): string | null {
  // Static channels
  if (template === 'global') return 'global';

  // Dynamic channel: counter:<counterId>
  if (template.startsWith('counter:')) {
    if (!context?.counterId) {
      console.warn(
        '[broadcastRoutedEvent] counter channel template requires counterId in context, skipping',
      );
      return null;
    }
    return `counter:${context.counterId}`;
  }

  console.warn(`[broadcastRoutedEvent] Unknown channel template: ${template}`);
  return null;
}

// ---------------------------------------------------------------------------
// broadcastRoutedEvent() — Convenience wrapper
// =============================================================================
// Higher-level helper that looks up the routing table and resolves dynamic
// channel references. Future sub-phases (Phase 4) should use this for events
// that need per-counter routing rather than calling broadcastEvent directly.
// Phase 2 call sites continue to call broadcastEvent() directly.
// ---------------------------------------------------------------------------

/**
 * Broadcasts an event using the routing table to determine channels.
 *
 * @param eventType - The event type (looked up in EVENT_ROUTING).
 * @param payload   - The event-specific payload.
 * @param context   - Optional context for dynamic channel resolution (e.g., counterId).
 */
export function broadcastRoutedEvent(
  eventType: SseEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
  context?: BroadcastContext,
): void {
  try {
    const templates = EVENT_ROUTING[eventType];
    if (!templates || templates.length === 0) {
      console.warn(`[broadcastRoutedEvent] No routes defined for event type: ${eventType}`);
      return;
    }

    const channels: string[] = [];
    for (const template of templates) {
      const resolved = resolveChannelTemplate(template, context);
      if (resolved !== null) {
        channels.push(resolved);
      }
    }

    if (channels.length === 0) return;

    const envelope = buildEnvelope(eventType, payload as Record<string, unknown>);

    for (const ch of channels) {
      sseManager.sendToChannel(ch, envelope);
    }

    const totalClients = channels.reduce(
      (sum, ch) => sum + sseManager.getChannelClientCount(ch),
      0,
    );

    console.debug(
      `[broadcastRoutedEvent] id=${envelope.id} type=${envelope.type} channels=[${channels.join(', ')}] totalClients=${totalClients}`,
    );
  } catch (error) {
    console.error('[broadcastRoutedEvent] Failed to deliver event:', error);
  }
}
