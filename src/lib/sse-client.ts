// =============================================================================
// src/lib/sse-client.ts — SSE connection & envelope type definitions (3.1.1)
// =============================================================================
// Single source of truth for SSE connection records and the on-the-wire
// event envelope shape. Also provides the SSE wire-format serialisation
// helpers consumed by the manager and route handler.
//
// References: Master Plan §11.2 (envelope format), §11.5 (heartbeat)
// =============================================================================

// ---------------------------------------------------------------------------
// SSEClient — connection record held in the manager
// ---------------------------------------------------------------------------

export interface SSEClient {
  /** Unique client ID generated on registration (UUID). */
  id: string;
  /** Channel name the client is subscribed to (e.g. 'global', 'counter:abc123'). */
  channel: string;
  /** Web Streams API controller for pushing bytes to the client. */
  controller: ReadableStreamDefaultController<Uint8Array>;
  /** When the client registered. */
  connectedAt: Date;
  /** Session user ID, or null for anonymous (global) connections. */
  userId: string | null;
}

// ---------------------------------------------------------------------------
// SSEEnvelope — canonical on-the-wire event shape (Master Plan §11.2)
// ---------------------------------------------------------------------------

export interface SSEEnvelope {
  /** Event type (matches an SseEventType value). */
  type: string;
  /** Unique event ID (UUID generated at broadcast time). */
  id: string;
  /** ISO 8601 datetime in UTC. */
  timestamp: string;
  /** Event-specific payload. */
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Convenience type alias
// ---------------------------------------------------------------------------

/** Re-export of the Web Streams controller type under a cleaner name. */
export type SSEController = ReadableStreamDefaultController<Uint8Array>;

// ---------------------------------------------------------------------------
// Wire-format serialisation (SSE spec §9.2)
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

/**
 * Formats an SSEEnvelope to the SSE wire format.
 *
 * Produces (per the SSE spec and Master Plan §11.2):
 *   id: <envelope.id>\n
 *   data: <JSON.stringify(envelope)>\n
 *   \n
 *
 * NOTE: We intentionally omit the `event:` field. Named events
 * require addEventListener() per event type; using the default
 * "message" event (no event: field) lets EventSource.onmessage
 * handle ALL events, routing by the JSON `type` property.
 */
export function formatSSEMessage(envelope: SSEEnvelope): Uint8Array {
  const data = JSON.stringify(envelope);
  const message = `id: ${envelope.id}\ndata: ${data}\n\n`;
  return encoder.encode(message);
}

/**
 * Formats an SSE comment (lines starting with ':' are ignored by EventSource
 * clients but keep the connection alive through proxies and load balancers).
 *
 * Format: `: <comment>\n\n`
 */
export function formatSSEComment(comment: string): Uint8Array {
  return encoder.encode(`: ${comment}\n\n`);
}
