// =============================================================================
// src/types/ticket.types.ts — Ticket API types (2.2.1)
// =============================================================================

// ---------------------------------------------------------------------------
// Shared / re-exported
// ---------------------------------------------------------------------------

export type { IssueTicketInput } from '@/schemas/ticket.schema';

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
  businessDate: string;
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
