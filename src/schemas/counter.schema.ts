// =============================================================================
// src/schemas/counter.schema.ts — Zod schemas for Counter CRUD (2.1.2)
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createCounterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').trim(),
  number: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
    .max(9999, 'Must be at most 9999'),
  description: z.string().max(500, 'Description is too long').optional(),
  displayLabel: z.string().max(100, 'Display label is too long').optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateCounterInput = z.infer<typeof createCounterSchema>;

// ---------------------------------------------------------------------------
// Update (partial — at least one field required)
// ---------------------------------------------------------------------------

export const updateCounterSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    number: z.number().int().min(1).max(9999).optional(),
    description: z.string().max(500).optional(),
    displayLabel: z.string().max(100).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateCounterInput = z.infer<typeof updateCounterSchema>;

// ---------------------------------------------------------------------------
// List query
// ---------------------------------------------------------------------------

export const listCountersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(100).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type ListCountersQuery = z.infer<typeof listCountersQuerySchema>;
