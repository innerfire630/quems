// =============================================================================
// src/schemas/counter-status.schema.ts — Counter status Zod schemas (4.2.1)
// =============================================================================
// Zod validation schemas for the PATCH /api/counters/[counterId]/status endpoint.
//
// API boundary mapping:
//   API status 'OPENED'  → DB enum 'AVAILABLE'
//   API status 'CLOSED'  → DB enum 'CLOSED'
//
// References: Master Plan §9.3
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

/**
 * Validates the PATCH /api/counters/[counterId]/status request body.
 * - `status`: must be 'OPENED' or 'CLOSED'.
 * - `reason`: optional string, max 200 chars. Required when status is 'CLOSED'.
 */
export const counterStatusChangeSchema = z
  .object({
    status: z.enum(['OPENED', 'CLOSED']),
    reason: z.string().trim().max(200).optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'CLOSED' && (!data.reason || data.reason.trim().length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Reason is required when closing the counter.',
      path: ['reason'],
    },
  );

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

/** Re-export of the CounterOfficerStatus enum from @prisma/client. */
export { CounterOfficerStatus as counterStatusEnum } from '@prisma/client';

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type CounterStatusChangeInput = z.infer<typeof counterStatusChangeSchema>;

export interface CounterStatusChangeResponse {
  id: string;
  counterId: string;
  counterOfficerId: string;
  status: string;
  reason: string | null;
  createdAt: Date;
  changedByOfficerName: string;
}
