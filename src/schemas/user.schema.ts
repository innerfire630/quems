// =============================================================================
// src/schemas/user.schema.ts — User management Zod schemas (1.3.3)
// =============================================================================
// Shared validation schemas for create, update, password-reset, and listing
// operations. Used on both client (form validation) and server (API input).
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Create user
// ---------------------------------------------------------------------------

export const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100, 'Name must be 100 characters or less.'),
  email: z
    .string()
    .email('Invalid email address.')
    .max(255, 'Email must be 255 characters or less.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be 128 characters or less.'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  roleId: z.string().min(1, 'Role is required.').optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

// ---------------------------------------------------------------------------
// Update user (PATCH — all fields optional, at least one required)
// ---------------------------------------------------------------------------

export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().max(255).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
    roleId: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ---------------------------------------------------------------------------
// Admin password reset
// ---------------------------------------------------------------------------

export const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be 128 characters or less.')
    .optional(),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ---------------------------------------------------------------------------
// List users query parameters
// ---------------------------------------------------------------------------

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  search: z.string().max(100).optional(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
