// =============================================================================
// src/types/ticket.types.ts — Ticket API types (2.2.1, extended in 2.3.1, 2.3.2)
// =============================================================================

// ---------------------------------------------------------------------------
// Shared / re-exported
// ---------------------------------------------------------------------------

export type { IssueTicketInput } from '@/schemas/ticket.schema';
import type { TicketStatus } from '@prisma/client';

// ---------------------------------------------------------------------------
// Ticket event log entry
// ---------------------------------------------------------------------------

export interface TicketEventLogEntry {
  id: string;
  eventType: string;
  counterId: string | null;
  counterName: string | null;
  officerId: string | null;
  officerName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Ticket list item (GET /api/tickets)
// ---------------------------------------------------------------------------

export interface TicketListItem {
  id: string;
  ticketNumber: string;
  displayNumber: number;
  serviceId: string;
  serviceName: string;
  counterId: string | null;
  counterName: string | null;
  status: string;
  priority: number;
  waitPosition: number;
  estimatedWaitMinutes: number | null;
  issuedAt: string;
  calledAt: string | null;
  businessDate: string;
  customerName: string | null;
  customerIdNumber: string | null;
  customerPhone: string | null;
}

// ---------------------------------------------------------------------------
// Ticket detail (GET /api/tickets/[ticketId])
// ---------------------------------------------------------------------------

export interface TicketDetail extends TicketListItem {
  events: TicketEventLogEntry[];
  calledByOfficer: { id: string; name: string } | null;
}

// ---------------------------------------------------------------------------
// Ticket issuance response (POST /api/tickets/issue)
// ---------------------------------------------------------------------------

export interface IssuedTicketResponse extends TicketDetail {
  sseEventId: string;
}

// ---------------------------------------------------------------------------
// Pagination metadata
// ---------------------------------------------------------------------------

export interface TicketListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// =============================================================================
// Ticket action types (2.3.1 — Call / Recall)
// =============================================================================

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface TicketCallInput {
  ticketId: string;
  counterId: string;
}

export interface TicketRecallInput {
  ticketId: string;
  counterId: string;
}

export interface TicketServeInput {
  ticketId: string;
  counterId: string;
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface TicketCallResponse extends TicketDetail {
  sseEventId: string;
  previousStatus: string;
}

export interface TicketRecallResponse extends TicketCallResponse {
  recallCount: number;
}

// ---------------------------------------------------------------------------
// Discriminated union for generic action surfaces
// ---------------------------------------------------------------------------

export type TicketActionResult =
  { kind: 'CALLED'; data: TicketCallResponse } | { kind: 'RECALLED'; data: TicketRecallResponse };

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export interface OfficerNotOnDutyError {
  kind: 'OFFICER_NOT_ON_DUTY';
  message: string;
}

export interface CounterInactiveError {
  kind: 'COUNTER_INACTIVE';
  message: string;
}

export interface ServiceNotAssignedToCounterError {
  kind: 'SERVICE_NOT_ASSIGNED_TO_COUNTER';
  message: string;
}

export interface InvalidTicketTransitionError {
  kind: 'INVALID_TRANSITION';
  message: string;
}

export type ActionErrorKind =
  | 'OFFICER_NOT_ON_DUTY'
  | 'OFFICER_NOT_ASSIGNED'
  | 'COUNTER_INACTIVE'
  | 'SERVICE_NOT_ASSIGNED_TO_COUNTER'
  | 'INVALID_TRANSITION'
  | 'GRACE_PERIOD_NOT_ELAPSED'
  | 'INTERNAL_ERROR';

// =============================================================================
// No-Show types (2.3.2)
// =============================================================================

export interface TicketNoShowInput {
  ticketId: string;
  counterId: string;
}

export interface TicketNoShowResponse extends TicketDetail {
  sseEventId: string;
  previousStatus: TicketStatus;
  gracePeriodSeconds: number;
  elapsedSeconds: number;
  autoAdvanced: boolean;
  autoAdvancedTicket: TicketListItem | null;
}

// =============================================================================
// No-Show Recall types (recall from no-show list → serving)
// =============================================================================

export interface TicketNoShowRecallInput {
  ticketId: string;
  counterId: string;
}

export interface TicketNoShowRecallResponse extends TicketDetail {
  sseEventId: string;
  previousStatus: string;
}

export interface TicketServeInput {
  ticketId: string;
  counterId: string;
}

export interface TicketServeResponse extends TicketDetail {
  sseEventId: string;
  previousStatus: string;
}

export interface NoShowValidationError {
  kind: 'GRACE_PERIOD_NOT_ELAPSED';
  elapsedSeconds: number;
  requiredSeconds: number;
  message: string;
}
