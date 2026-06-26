// =============================================================================
// src/schemas/notification-reply.schema.ts — Reply validation schemas (4.3.1)
// =============================================================================

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Reply request body schema
// ---------------------------------------------------------------------------

export const notificationReplyCreateSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message must not exceed 500 characters'),
});

export type NotificationReplyCreateInput = z.infer<typeof notificationReplyCreateSchema>;

// ---------------------------------------------------------------------------
// URL parameter schema
// ---------------------------------------------------------------------------

export const notificationIdParamSchema = z.object({
  notificationId: z.string().cuid('Invalid notification ID'),
});

export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
