// =============================================================================
// src/schemas/queue-reset.schema.ts — Reset endpoint Zod schemas (2.3.3)
// =============================================================================
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Query parameters for POST /api/admin/reset-queue
// ---------------------------------------------------------------------------

export const manualResetQuerySchema = z.object({
  confirm: z.literal('RESET_TODAY'),
});

export type ManualResetQuery = z.infer<typeof manualResetQuerySchema>;

// ---------------------------------------------------------------------------
// Optional body for POST /api/admin/reset-queue
// ---------------------------------------------------------------------------

export const manualResetBodySchema = z.object({
  previousBusinessDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD.')
    .optional(),
  now: z.string().datetime({ offset: true }).optional(),
});

export type ManualResetBody = z.infer<typeof manualResetBodySchema>;
