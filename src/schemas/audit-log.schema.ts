// =============================================================================
// src/schemas/audit-log.schema.ts — Zod schemas for the audit log API (5.2.3)
// =============================================================================

import { z } from 'zod';

export const auditLogQuerySchema = z
  .object({
    userId: z.string().min(1).optional(),
    action: z.string().min(1).optional(),
    entity: z.string().min(1).max(50).optional(),
    entityId: z.string().min(1).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(25),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    { message: 'endDate must be greater than or equal to startDate' },
  );

export type AuditLogQueryInput = z.infer<typeof auditLogQuerySchema>;
