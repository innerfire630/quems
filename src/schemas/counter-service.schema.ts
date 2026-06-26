// =============================================================================
// src/schemas/counter-service.schema.ts — Zod schemas for service assignment (2.1.3)
// =============================================================================

import { z } from 'zod';

export const assignServiceSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
});

export type AssignServiceInput = z.infer<typeof assignServiceSchema>;
