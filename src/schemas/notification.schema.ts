// =============================================================================
// src/schemas/notification.schema.ts — Zod validation for notification API (4.1.2)
// =============================================================================

import { z } from 'zod';

/** Request body for POST /api/notifications/devices/register */
export const deviceRegisterSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ANDROID', 'IOS', 'WEB']),
  deviceInfo: z.object({}).passthrough().optional(),
});

export type DeviceRegisterInput = z.infer<typeof deviceRegisterSchema>;

/** URL param for DELETE /api/notifications/devices/[tokenId] */
export const deviceTokenIdParamSchema = z.object({
  tokenId: z.string().min(1),
});

/** URL param for future POST /api/notifications/[notificationId]/reply (4.3.1) */
export const notificationIdParamSchema = z.object({
  notificationId: z.string().min(1),
});
