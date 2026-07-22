// =============================================================================
// src/schemas/ticket.schema.ts — Ticket validation schemas (2.2.1)
// =============================================================================
import { z } from 'zod';

/** Ticket status enum values for query filtering. */
const TICKET_STATUS_VALUES = [
  'WAITING',
  'CALLED',
  'RECALLED',
  'SERVING',
  'COMPLETED',
  'NO_SHOW',
  'TRANSFERRED',
  'CANCELLED',
] as const;

// ---------------------------------------------------------------------------
// POST /api/tickets/issue — request body
// ---------------------------------------------------------------------------

export const issueTicketSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required.'),
  priority: z.number().int().min(0).max(100).default(0),
  customerName: z.string().max(100).optional(),
  customerIdNumber: z.string().max(50).optional(),
  customerPhone: z
    .string()
    .max(20)
    .regex(/^0\d{9}$/, 'Phone number must be 10 digits starting with 0 (e.g. 07########).')
    .optional(),
});

export type IssueTicketInput = z.infer<typeof issueTicketSchema>;

// ---------------------------------------------------------------------------
// GET /api/tickets — query parameters
// ---------------------------------------------------------------------------

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  serviceId: z.string().optional(),
  counterId: z.string().optional(),
  status: z.enum(TICKET_STATUS_VALUES).optional(),
  businessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'businessDate must be YYYY-MM-DD.')
    .optional(),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

// ---------------------------------------------------------------------------
// GET /api/tickets/[ticketId] — route params
// ---------------------------------------------------------------------------

export const getTicketByIdParamsSchema = z.object({
  ticketId: z.string().min(1, 'Ticket ID is required.'),
});

export type GetTicketByIdParams = z.infer<typeof getTicketByIdParamsSchema>;

// ---------------------------------------------------------------------------
// Shared body for ticket action endpoints (call, recall, no-show) — 2.3.1
// ---------------------------------------------------------------------------

export const ticketActionBodySchema = z.object({
  counterId: z.string().min(1, 'Counter ID is required.'),
});

export type TicketActionBody = z.infer<typeof ticketActionBodySchema>;

// ---------------------------------------------------------------------------
// POST /api/tickets/[ticketId]/call — 2.3.1
// ---------------------------------------------------------------------------

export const callTicketSchema = ticketActionBodySchema;

export type CallTicketInput = z.infer<typeof callTicketSchema>;

// ---------------------------------------------------------------------------
// POST /api/tickets/[ticketId]/recall — 2.3.1
// ---------------------------------------------------------------------------

export const recallTicketSchema = ticketActionBodySchema;

export type RecallTicketInput = z.infer<typeof recallTicketSchema>;

// ---------------------------------------------------------------------------
// POST /api/tickets/[ticketId]/no-show — 2.3.2
// ---------------------------------------------------------------------------

export const noShowTicketSchema = ticketActionBodySchema;

export type NoShowTicketInput = z.infer<typeof noShowTicketSchema>;

// ---------------------------------------------------------------------------
// POST /api/tickets/[ticketId]/serve — Served
// ---------------------------------------------------------------------------

export const serveTicketSchema = ticketActionBodySchema;

export type ServeTicketInput = z.infer<typeof serveTicketSchema>;

// ---------------------------------------------------------------------------
// POST /api/tickets/call-next — 2.3.2
// ---------------------------------------------------------------------------

export const callNextTicketSchema = z.object({
  counterId: z.string().min(1, 'Counter ID is required.'),
  serviceId: z.string().optional(),
});

export type CallNextTicketInput = z.infer<typeof callNextTicketSchema>;
