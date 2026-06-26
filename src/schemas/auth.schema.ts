// =============================================================================
// src/schemas/auth.schema.ts — Zod validation schemas for auth request bodies
// =============================================================================
// Used by both the mobile login endpoint (1.2.2) and the login UI form (1.2.3).
// =============================================================================

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Password policy for registration / user creation (used in Phase 1.3 seed).
 * Minimum 8 characters, at least one letter and one number.
 */
export const passwordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters' })
  .regex(/[a-zA-Z]/, { message: 'Password must contain at least one letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' });

export type PasswordInput = z.infer<typeof passwordSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, { message: 'Refresh token is required' }),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
