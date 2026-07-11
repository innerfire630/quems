// =============================================================================
// src/schemas/service.schema.ts — Zod schemas for Service CRUD (2.1.1)
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long').trim(),
  code: z
    .string()
    .min(3, 'Code must be 3-10 characters')
    .max(10, 'Code must be 3-10 characters')
    .regex(/^[A-Z0-9]{3,10}$/, 'Code must be 3-10 uppercase letters or digits')
    .trim(),
  ticketPrefix: z
    .string()
    .min(1, 'Ticket prefix must be 1-2 characters')
    .max(2, 'Ticket prefix must be 1-2 characters')
    .regex(/^[A-Z]{1,2}$/, 'Ticket prefix must be 1-2 uppercase letters A-Z'),
  description: z.string().max(500, 'Description is too long').optional(),
  iconName: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex code like #3B82F6')
    .optional(),
  isActive: z.boolean().optional().default(true),
  currentTicketNumber: z.number().int().min(0).optional().default(0),
  averageServiceTime: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1 minute')
    .max(120, 'Must be at most 120 minutes')
    .optional(),
  sortOrder: z.number().int().optional().default(0),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

// ---------------------------------------------------------------------------
// Update (partial — at least one field required)
// ---------------------------------------------------------------------------

export const updateServiceSchema = z
  .object({
    name: z.string().min(1).max(100).trim().optional(),
    code: z
      .string()
      .min(3)
      .max(10)
      .regex(/^[A-Z0-9]{3,10}$/, 'Code must be 3-10 uppercase letters or digits')
      .trim()
      .optional(),
    ticketPrefix: z
      .string()
      .min(1, 'Ticket prefix must be 1-2 characters')
      .max(2, 'Ticket prefix must be 1-2 characters')
      .regex(/^[A-Z]{1,2}$/, 'Ticket prefix must be 1-2 uppercase letters A-Z')
      .optional(),
    description: z.string().max(500).optional(),
    iconName: z.string().max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex code like #3B82F6')
      .optional(),
    isActive: z.boolean().optional(),
    currentTicketNumber: z.number().int().min(0).optional(),
    averageServiceTime: z.number().int().min(1).max(120).optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

// ---------------------------------------------------------------------------
// List query
// ---------------------------------------------------------------------------

export const listServicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(100).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type ListServicesQuery = z.infer<typeof listServicesQuerySchema>;
