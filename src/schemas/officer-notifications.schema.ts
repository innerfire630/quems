// =============================================================================
// src/schemas/officer-notifications.schema.ts — Notification toggle schemas (4.2.2)
// =============================================================================
// Zod validation schemas for the PATCH /api/officers/me/notifications endpoint.
//
// References: Master Plan §9.3
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request body schema (PATCH)
// ---------------------------------------------------------------------------

/**
 * Validates the PATCH /api/officers/me/notifications request body.
 * - `counterId`: CUID string for the counter.
 * - `notificationsEnabled`: boolean to enable/disable notifications.
 */
export const officerNotificationsUpdateSchema = z.object({
  counterId: z.string().regex(/^c[a-z0-9]{20,}$/, 'Invalid counter ID format'),
  notificationsEnabled: z.boolean(),
});

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

/** A single entry in the notification state array. */
export const officerNotificationsStateEntrySchema = z.object({
  counterOfficerId: z.string(),
  counterId: z.string(),
  counterName: z.string(),
  counterNumber: z.number(),
  notificationsEnabled: z.boolean(),
});

/** GET response: array of state entries. */
export const officerNotificationsStateSchema = z.array(officerNotificationsStateEntrySchema);

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type OfficerNotificationsUpdateInput = z.infer<typeof officerNotificationsUpdateSchema>;
export type OfficerNotificationsStateEntry = z.infer<typeof officerNotificationsStateEntrySchema>;
export type OfficerNotificationsUpdateResponse = {
  counterId: string;
  notificationsEnabled: boolean;
};
