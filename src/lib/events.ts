// =============================================================================
// src/lib/events.ts — Broadcast event stub (Phase 2.1.1 seam)
// =============================================================================
// This is a STUB to be replaced in Phase 3.1.3 with the real SSE delivery
// implementation. The function signature is LOCKED per Phase 2 cross-cutting
// standard 8.2. Every Phase 2/3 document that emits events calls this function.
//
// In development, the stub logs to console.debug so call sites are verifiable.
// In production, it is a true no-op.
// =============================================================================

import type { SseChannel, SseEventType } from '@/types/sse.types';

// ---------------------------------------------------------------------------
// broadcastEvent()
// ---------------------------------------------------------------------------

/**
 * Broadcasts an SSE event to a channel. Phase 2 stub — logs in dev, no-op in prod.
 *
 * @param channel  - The SSE channel to broadcast to ('global' | 'counter' | 'security').
 * @param eventType - The event type (e.g. 'TICKET_ISSUED').
 * @param payload   - The event-specific payload.
 */
export async function broadcastEvent(
  channel: SseChannel,
  eventType: SseEventType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any,
): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const summary =
      typeof payload === 'object' && payload !== null
        ? Object.keys(payload as unknown as Record<string, unknown>).join(', ')
        : '(non-object payload)';
    console.debug(
      `[events] broadcast → channel="${channel}" type="${eventType}" keys=[${summary}]`,
    );
  }
  // Phase 3.1.3: replace this no-op with the real SSE delivery implementation.
}
