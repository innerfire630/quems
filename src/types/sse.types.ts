// =============================================================================
// src/types/sse.types.ts — SSE event type definitions (Phase 2.1.1 seam)
// =============================================================================
// Defines the TypeScript types for all SSE event payloads that Phase 2 will
// emit and Phase 3 will deliver. This type registry is the contract between
// Phase 2 (producers) and Phase 3 (consumers).
//
// References: Master Plan §11.1 (SSE channels), §11.2 (event envelope)
// =============================================================================

// ---------------------------------------------------------------------------
// Channel identifiers
// ---------------------------------------------------------------------------

/**
 * SSE Channel identifier.
 * - 'global' — public display board, kiosk, unauthenticated viewers
 * - `counter:${string}` — per-counter officer channel (e.g. 'counter:abc123')
 */
export type SseChannel = 'global' | `counter:${string}`;

// ---------------------------------------------------------------------------
// Event type registry
// ---------------------------------------------------------------------------

export type SseEventType =
  | 'TICKET_ISSUED'
  | 'TICKET_CALLED'
  | 'TICKET_RECALLED'
  | 'TICKET_NO_SHOW'
  | 'TICKET_SERVED'
  | 'TICKET_COMPLETED'
  | 'BROADCAST_MESSAGE'
  | 'DAILY_RESET'
  | 'COUNTER_OPENED'
  | 'COUNTER_CLOSED'
  | 'QUEUE_UPDATED'
  | 'NOTIFICATION_RECEIVED'
  | 'OFFICER_REPLY';

// ---------------------------------------------------------------------------
// Per-event payload types (filled in by the document that introduces each event)
// ---------------------------------------------------------------------------

/**
 * TICKET_ISSUED — emitted by 2.2.1 when a kiosk issues a new ticket.
 * This variant was added in 2.2.1 as part of the issuance endpoint.
 * Consumers (Phase 3 display, Phase 4 notifications) can rely on this shape.
 */
export interface TicketIssuedPayload {
  ticketId: string;
  ticketNumber: string;
  displayNumber: number;
  serviceId: string;
  serviceName: string;
  serviceCode: string;
  priority: number;
  waitPosition: number;
  estimatedWaitMinutes: number | null;
  businessDate: string;
  issuedAt: string;
}

/** TICKET_CALLED — emitted by 2.3.1 when an officer calls a ticket. */
export interface TicketCalledPayload {
  ticketId: string;
  ticketNumber: string;
  serviceId: string;
  serviceName: string;
  counterId: string;
  counterName: string;
  counterNumber: number;
  calledByOfficerId: string;
  calledByOfficerName: string;
  calledAt: string;
  previousStatus: string;
}

/** TICKET_RECALLED — emitted by 2.3.1 when an officer recalls a ticket. */
export interface TicketRecalledPayload extends TicketCalledPayload {
  recalledAt: string;
  recallCount: number;
}

/** TICKET_NO_SHOW — emitted by 2.3.2 when a ticket is marked as no-show. */
export interface TicketNoShowPayload {
  ticketId: string;
  ticketNumber: string;
  serviceId: string;
  serviceName: string;
  counterId: string;
  counterNumber: number;
  calledByOfficerId: string;
  calledByOfficerName: string;
  noShowAt: string;
  gracePeriodSeconds: number;
  elapsedSeconds: number;
  autoAdvanced: boolean;
  autoAdvancedTicketNumber: string | null;
}

/** TICKET_SERVED — emitted when a ticket is marked as served (Phase 3+). */
export interface TicketServedPayload {
  ticketId: string;
  ticketNumber: string;
  counterId: string;
}

/** TICKET_COMPLETED — emitted when a ticket is marked as completed (Phase 3+). */
export interface TicketCompletedPayload {
  ticketId: string;
  ticketNumber: string;
  counterId: string;
}

/** BROADCAST_MESSAGE — emitted by 4.3.2 when a reply is broadcast to display + security. */
export interface BroadcastMessagePayload {
  broadcastId: string;
  message: string;
  senderName: string;
  displaySeconds: number;
}

/** DAILY_RESET — emitted by 2.3.3 when the system performs a daily reset. */
export interface DailyResetPayload {
  resetAt: string;
  previousBusinessDate: string;
  trigger: 'SCHEDULED' | 'MANUAL';
  triggeredByUserId: string | null;
  affectedServiceIds: string[];
  totalSnapshotsUpserted: number;
  totalCountersReset: number;
  errors: { serviceId: string; message: string }[];
}

/** COUNTER_OPENED — emitted by 4.2.1 when an officer opens their counter. */
export interface CounterOpenedPayload {
  counterId: string;
  counterNumber: number;
  counterName: string;
  changedByOfficerId: string;
  changedByOfficerName: string;
  changedAt: string;
}

/** COUNTER_CLOSED — emitted by 4.2.1 when an officer closes their counter. */
export interface CounterClosedPayload {
  counterId: string;
  counterNumber: number;
  counterName: string;
  changedByOfficerId: string;
  changedByOfficerName: string;
  changedAt: string;
  reason: string | null;
}

/** QUEUE_UPDATED — emitted when queue state changes (Phase 3+). */
export interface QueueUpdatedPayload {
  serviceId: string;
  waitingCount: number;
  servingCount: number;
  completedCount: number;
}

/** NOTIFICATION_RECEIVED — emitted when an officer receives a notification (Phase 4+). */
export interface NotificationReceivedPayload {
  notificationId: string;
  ticketId: string;
  ticketNumber: string;
  counterId: string;
}

/** OFFICER_REPLY — emitted by 4.3.1 when an officer replies to a notification. */
export interface OfficerReplyPayload {
  notificationId: string;
  replyId: string;
  repliedByOfficerName: string;
  repliedAt: string;
}

// ---------------------------------------------------------------------------
// Discriminated union — one variant per event type
// ---------------------------------------------------------------------------

export type SseEventPayload =
  | { type: 'TICKET_ISSUED'; id: string; timestamp: string; payload: TicketIssuedPayload }
  | { type: 'TICKET_CALLED'; id: string; timestamp: string; payload: TicketCalledPayload }
  | { type: 'TICKET_RECALLED'; id: string; timestamp: string; payload: TicketRecalledPayload }
  | { type: 'TICKET_NO_SHOW'; id: string; timestamp: string; payload: TicketNoShowPayload }
  | { type: 'TICKET_SERVED'; id: string; timestamp: string; payload: TicketServedPayload }
  | { type: 'TICKET_COMPLETED'; id: string; timestamp: string; payload: TicketCompletedPayload }
  | { type: 'BROADCAST_MESSAGE'; id: string; timestamp: string; payload: BroadcastMessagePayload }
  | { type: 'DAILY_RESET'; id: string; timestamp: string; payload: DailyResetPayload }
  | { type: 'COUNTER_OPENED'; id: string; timestamp: string; payload: CounterOpenedPayload }
  | { type: 'COUNTER_CLOSED'; id: string; timestamp: string; payload: CounterClosedPayload }
  | { type: 'QUEUE_UPDATED'; id: string; timestamp: string; payload: QueueUpdatedPayload }
  | {
      type: 'NOTIFICATION_RECEIVED';
      id: string;
      timestamp: string;
      payload: NotificationReceivedPayload;
    }
  | { type: 'OFFICER_REPLY'; id: string; timestamp: string; payload: OfficerReplyPayload };

// ---------------------------------------------------------------------------
// Full SSE event (channel + envelope) — the shape passed to broadcastEvent()
// ---------------------------------------------------------------------------

export interface SseEvent {
  channel: SseChannel;
  envelope: SseEventPayload;
}

// =============================================================================
// 3.1.2 — Client-side typed envelope & internal events
// =============================================================================

/**
 * Typed SSE envelope for a specific event type T.
 * Extracts the exact variant from SseEventPayload whose `type` matches T.
 *
 * Usage:
 *   useSSE<'TICKET_CALLED'>('global', {
 *     filter: 'TICKET_CALLED',
 *     onEvent: (envelope) => {
 *       // envelope.payload.ticketNumber is typed as string
 *     }
 *   });
 */
export type SseEnvelope<T extends SseEventType> = Extract<SseEventPayload, { type: T }>;

/**
 * Type-level mapping from event type to its payload type.
 * For type inference only — do NOT use the runtime values.
 */
export const SSE_EVENT_TYPE_MAP = {
  TICKET_ISSUED: null as unknown as TicketIssuedPayload,
  TICKET_CALLED: null as unknown as TicketCalledPayload,
  TICKET_RECALLED: null as unknown as TicketRecalledPayload,
  TICKET_NO_SHOW: null as unknown as TicketNoShowPayload,
  TICKET_SERVED: null as unknown as TicketServedPayload,
  TICKET_COMPLETED: null as unknown as TicketCompletedPayload,
  BROADCAST_MESSAGE: null as unknown as BroadcastMessagePayload,
  DAILY_RESET: null as unknown as DailyResetPayload,
  COUNTER_OPENED: null as unknown as CounterOpenedPayload,
  COUNTER_CLOSED: null as unknown as CounterClosedPayload,
  QUEUE_UPDATED: null as unknown as QueueUpdatedPayload,
  NOTIFICATION_RECEIVED: null as unknown as NotificationReceivedPayload,
  OFFICER_REPLY: null as unknown as OfficerReplyPayload,
} as const satisfies Record<SseEventType, unknown>;

/** Payload type extracted from the map for a given event type. */
export type SsePayloadFor<T extends SseEventType> = (typeof SSE_EVENT_TYPE_MAP)[T];

// ---------------------------------------------------------------------------
// Internal connection events (emitted by the SSE route handler, NOT via broadcastEvent)
// ---------------------------------------------------------------------------

/** Internal event types emitted by the SSE infrastructure. */
export const SSE_INTERNAL_EVENTS = ['CONNECTED'] as const;
export type SseInternalEventType = (typeof SSE_INTERNAL_EVENTS)[number];

/** Envelope shape for internal connection events. */
export interface SseInternalEnvelope {
  type: SseInternalEventType;
  id: string;
  timestamp: string;
  payload: { clientId: string; channel: string };
}
