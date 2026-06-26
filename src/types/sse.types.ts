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

export type SseChannel = 'global' | 'counter' | 'security';

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

/** BROADCAST_MESSAGE — emitted by Phase 4 when an officer sends a broadcast. */
export interface BroadcastMessagePayload {
  messageId: string;
  text: string;
  senderId: string;
  senderName: string;
  counterId: string;
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

/** COUNTER_OPENED — emitted by Phase 4 when an officer opens their counter. */
export interface CounterOpenedPayload {
  counterId: string;
  counterNumber: number;
  officerId: string;
  officerName: string;
}

/** COUNTER_CLOSED — emitted by Phase 4 when an officer closes their counter. */
export interface CounterClosedPayload {
  counterId: string;
  counterNumber: number;
  officerId: string;
  officerName: string;
  reason?: string;
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

/** OFFICER_REPLY — emitted when an officer replies to a notification (Phase 4+). */
export interface OfficerReplyPayload {
  replyId: string;
  notificationId: string;
  officerId: string;
  officerName: string;
  message: string;
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
