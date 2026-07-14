// =============================================================================
// src/lib/settings-seed.ts — Queue default settings seeder (2.3.3)
// =============================================================================
// Ensures the four queue-related SystemSetting defaults exist in the database.
// Called once on app boot via src/instrumentation.ts. Uses upsert so it is
// idempotent and safe to call on every boot.
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import type { SettingType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const QUEUE_DEFAULT_SETTINGS: {
  key: string;
  value: string;
  type: SettingType;
  description: string;
}[] = [
  {
    key: 'system.name',
    value: 'QUEMS',
    type: 'STRING',
    description:
      'Display name of the system shown in sidebars, login page, kiosk header, and page titles.',
  },
  {
    key: 'system.logo_url',
    value: '',
    type: 'STRING',
    description:
      'URL of the company logo image. Shown next to the system name in sidebars, headers, and the login page.',
  },
  {
    key: 'queue.daily_reset_time',
    value: '00:00',
    type: 'STRING',
    description: 'Time of day (HH:MM in APP_TIMEZONE) when the daily queue reset runs.',
  },
  {
    key: 'queue.no_show_grace_period_seconds',
    value: '60',
    type: 'INTEGER',
    description: 'Minimum seconds after calledAt before a ticket can be marked no-show.',
  },
  {
    key: 'queue.default_average_service_time_minutes',
    value: '5',
    type: 'INTEGER',
    description:
      'Fallback average service time (minutes) when a Service.averageServiceTime is null.',
  },
  {
    key: 'display.theme',
    value: 'dark',
    type: 'STRING',
    description:
      'TV display theme. Use "dark" for dark background or "light" for white background.',
  },
  {
    key: 'display.marquee_message',
    value: '',
    type: 'STRING',
    description:
      'Scrolling marquee text shown at the bottom of the TV display. Leave empty for default message.',
  },
  // --- Kiosk customer info collection ---
  {
    key: 'kiosk.require_customer_info',
    value: 'true',
    type: 'BOOLEAN',
    description:
      'When enabled, the kiosk prompts for customer name/ID and contact number before issuing a ticket.',
  },
  {
    key: 'kiosk.customer_info_fields',
    value: JSON.stringify({ nameOrId: 'name', requireContact: true }),
    type: 'JSON',
    description:
      'Configures which customer fields the kiosk collects. nameOrId: "name" | "idNumber" | "both". requireContact: boolean.',
  },
  // --- Waiting time color configuration ---
  {
    key: 'waiting_time.color_config',
    value: JSON.stringify({
      green_max_minutes: 15,
      yellow_max_minutes: 30,
      green_color: '#22c55e',
      yellow_color: '#eab308',
      red_color: '#ef4444',
    }),
    type: 'JSON',
    description:
      'Thresholds (minutes) and hex colors for the waiting-time indicator on the counter dashboard.',
  },
  // --- Delayed reminder configuration ---
  {
    key: 'reminder.delayed_threshold_minutes',
    value: '30',
    type: 'INTEGER',
    description: 'Minutes after which a waiting ticket triggers the delayed-reminder alert (min).',
  },
  {
    key: 'reminder.interval_minutes',
    value: '5',
    type: 'INTEGER',
    description: 'Interval between repeated delayed-reminder alerts (min).',
  },
  {
    key: 'reminder.blink_interval_seconds',
    value: '2',
    type: 'INTEGER',
    description: 'Blink animation interval in seconds for overdue tickets.',
  },
  {
    key: 'reminder.sound_file',
    value: '',
    type: 'STRING',
    description:
      'Path to the delayed-reminder sound file relative to /uploads/sounds/. Empty = no sound.',
  },
  {
    key: 'reminder.sound_repeat_count',
    value: '2',
    type: 'INTEGER',
    description: 'Number of times the delayed-reminder sound plays per alert cycle (1–10).',
  },
  // --- New-ticket notification sound ---
  {
    key: 'notification.new_ticket_sound',
    value: '',
    type: 'STRING',
    description:
      'Sound played on the counter dashboard when a new ticket arrives. Path relative to /uploads/sounds/. Empty = built-in bell.',
  },
];

// ---------------------------------------------------------------------------
// seedQueueDefaultSettings
// ---------------------------------------------------------------------------

export async function seedQueueDefaultSettings(): Promise<{ seeded: number; skipped: number }> {
  let seeded = 0;
  let skipped = 0;

  for (const setting of QUEUE_DEFAULT_SETTINGS) {
    const existing = await db.systemSetting.findUnique({
      where: { key: setting.key },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.systemSetting.create({
      data: {
        key: setting.key,
        value: setting.value,
        type: setting.type,
        description: setting.description,
      },
    });
    seeded++;
  }

  if (process.env.NODE_ENV !== 'production') {
    if (seeded > 0) {
      console.info(`[settings-seed] Seeded ${seeded} queue default settings.`);
    }
    if (skipped > 0) {
      console.info(`[settings-seed] ${skipped} queue default settings already present.`);
    }
  }

  return { seeded, skipped };
}
