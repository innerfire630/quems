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
    key: 'queue.auto_advance_on_no_show',
    value: 'true',
    type: 'BOOLEAN',
    description: 'Whether to automatically call the next waiting ticket after a no-show.',
  },
  {
    key: 'queue.default_average_service_time_minutes',
    value: '5',
    type: 'INTEGER',
    description:
      'Fallback average service time (minutes) when a Service.averageServiceTime is null.',
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
