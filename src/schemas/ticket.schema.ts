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
  customerPhone: z
    .string()
    .max(20)
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164).')
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
