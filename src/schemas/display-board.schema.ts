// =============================================================================
// src/schemas/display-board.schema.ts — DisplayBoard validation schemas (3.2.3)
// =============================================================================

import { z } from 'zod';

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
const bcp47Regex = /^[a-z]{2}(-[A-Z]{2})?$/;

export const displayBoardCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  isDefault: z.boolean().optional().default(false),
  maxDisplayedTickets: z.number().int().min(1).max(50).default(10),
  announcementEnabled: z.boolean().optional().default(true),
  bellEnabled: z.boolean().optional().default(true),
  ttsEnabled: z.boolean().optional().default(true),
  ttsLanguage: z
    .string()
    .regex(bcp47Regex, 'Must be a valid BCP-47 language tag (e.g. en-US)')
    .default('en-US'),
  ttsRate: z.number().min(0.1).max(10).default(1.0),
  ttsPitch: z.number().min(0).max(2).default(1.0),
  ttsVolume: z.number().min(0).max(1).default(1.0),
  announcementTemplate: z
    .string()
    .min(1, 'Announcement template is required')
    .max(500, 'Template must be 500 characters or less')
    .default('Ticket {number}, please proceed to {counter}'),
  themeColor: z
    .string()
    .regex(hexColorRegex, 'Must be a valid hex color (e.g. #3B82F6)')
    .optional()
    .nullable(),
  displayTheme: z.enum(['dark', 'light']).optional().nullable(),
  logoUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  customMessage: z.string().max(500).optional().nullable(),
});

export const displayBoardUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    isDefault: z.boolean().optional(),
    maxDisplayedTickets: z.number().int().min(1).max(50).optional(),
    announcementEnabled: z.boolean().optional(),
    bellEnabled: z.boolean().optional(),
    ttsEnabled: z.boolean().optional(),
    ttsLanguage: z.string().regex(bcp47Regex, 'Must be a valid BCP-47 language tag').optional(),
    ttsRate: z.number().min(0.1).max(10).optional(),
    ttsPitch: z.number().min(0).max(2).optional(),
    ttsVolume: z.number().min(0).max(1).optional(),
    announcementTemplate: z.string().min(1).max(500).optional(),
    themeColor: z.string().regex(hexColorRegex, 'Must be a valid hex color').optional().nullable(),
    displayTheme: z.enum(['dark', 'light']).optional().nullable(),
    logoUrl: z.string().url().optional().nullable().or(z.literal('')),
    customMessage: z.string().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update.',
  });

export type DisplayBoardCreateInput = z.infer<typeof displayBoardCreateSchema>;
export type DisplayBoardUpdateInput = z.infer<typeof displayBoardUpdateSchema>;
