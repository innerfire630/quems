// =============================================================================
// src/lib/chat-cleanup.ts — Automated chat retention cleanup job
// =============================================================================
// Runs once per day (default 03:00 in APP_TIMEZONE) and permanently deletes
// ChatMessage records older than the configured retention period.
//
// The retention period is read from the `chat.retention_days` SystemSetting
// (default 7 days). The cleanup time is read from the `chat.cleanup_time`
// SystemSetting (default "03:00").
//
// Started from src/instrumentation.ts on app boot (Node.js runtime only).
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let currentTimer: NodeJS.Timeout | null = null;
let isRunning = false;

// ---------------------------------------------------------------------------
// Timezone helper
// ---------------------------------------------------------------------------

function getAppTimezone(): string {
  const configured = process.env.APP_TIMEZONE?.trim();
  if (!configured) return Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    new Intl.DateTimeFormat('en', { timeZone: configured }).format(new Date());
    return configured;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
}

// ---------------------------------------------------------------------------
// getCleanupTimeToday
// ---------------------------------------------------------------------------

/**
 * Reads the configured cleanup time and computes the next fire time.
 * Setting key: `chat.cleanup_time` (default "03:00").
 */
async function getCleanupTimeToday(now: Date): Promise<Date> {
  const setting = await db.systemSetting.findUnique({
    where: { key: 'chat.cleanup_time' },
  });
  const timeStr = setting?.value?.trim() || '03:00';

  const tz = getAppTimezone();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const y = +parts.find((p) => p.type === 'year')!.value;
  const m = +parts.find((p) => p.type === 'month')!.value;
  const d = +parts.find((p) => p.type === 'day')!.value;

  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) {
    // Invalid format — default to 03:00
    return new Date(Date.UTC(y, m - 1, d + 1, 3, 0, 0, 0));
  }

  const localMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);
  const localCleanupTime = new Date(y, m - 1, d, hours, minutes, 0, 0);

  const tzOffset = localMidnight.getTime() - Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  let utcCleanupTime = new Date(localCleanupTime.getTime() - tzOffset);

  // If the cleanup time is in the past, schedule for tomorrow
  if (utcCleanupTime.getTime() <= now.getTime()) {
    utcCleanupTime = new Date(utcCleanupTime.getTime() + 24 * 60 * 60 * 1000);
  }

  return utcCleanupTime;
}

// ---------------------------------------------------------------------------
// runChatCleanup
// ---------------------------------------------------------------------------

/**
 * Deletes all ChatMessage records older than the configured retention period.
 * Returns the number of deleted messages.
 */
export async function runChatCleanup(): Promise<number> {
  // Read retention setting
  const setting = await db.systemSetting.findUnique({
    where: { key: 'chat.retention_days' },
  });

  const retentionDays = setting ? parseInt(setting.value, 10) : 7;
  if (isNaN(retentionDays) || retentionDays < 1) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[chat-cleanup] Invalid chat.retention_days value "${setting?.value}" — using default 7.`,
      );
    }
  }

  const days = isNaN(retentionDays) || retentionDays < 1 ? 7 : retentionDays;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[chat-cleanup] Deleting ChatMessage records older than ${days} days (before ${cutoffDate.toISOString()}).`,
    );
  }

  const result = await db.chatMessage.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[chat-cleanup] Deleted ${result.count} expired chat message(s).`);
  }

  return result.count;
}

// ---------------------------------------------------------------------------
// scheduleNextCleanup
// ---------------------------------------------------------------------------

async function scheduleNextCleanup(): Promise<void> {
  if (isRunning) return;

  const now = new Date();
  const nextCleanupTime = await getCleanupTimeToday(now);
  const msUntilCleanup = nextCleanupTime.getTime() - now.getTime();

  if (msUntilCleanup <= 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[chat-cleanup] Computed cleanup time is in the past — rescheduling for 24h from now.',
      );
    }
    currentTimer = setTimeout(() => scheduleNextCleanup(), 24 * 60 * 60 * 1000);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[chat-cleanup] Next chat cleanup scheduled for ${nextCleanupTime.toISOString()} (in ${Math.round(msUntilCleanup / 60000)} minutes).`,
    );
  }

  currentTimer = setTimeout(async () => {
    try {
      isRunning = true;
      await runChatCleanup();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[chat-cleanup] Scheduled cleanup failed:', error);
      }
    } finally {
      isRunning = false;
      // Re-schedule for the next day
      void scheduleNextCleanup();
    }
  }, msUntilCleanup);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts the chat cleanup scheduler. Called once from instrumentation.ts on app boot.
 */
export function startChatCleanupScheduler(): void {
  if (process.env.NODE_ENV !== 'production') {
    console.info('[chat-cleanup] Chat cleanup scheduler starting...');
  }
  void scheduleNextCleanup();
}

/**
 * Stops the chat cleanup scheduler. Called on graceful shutdown (best-effort).
 */
export function stopChatCleanupScheduler(): void {
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
}
