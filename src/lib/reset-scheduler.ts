// =============================================================================
// src/lib/reset-scheduler.ts — In-process daily reset scheduler (2.3.3)
// =============================================================================
// Schedules the daily reset to run at the configured time (default "00:00" in
// APP_TIMEZONE). Uses setInterval-based approach that re-schedules itself after
// each fire. This is a simple in-process scheduler — multi-server deployments
// will need a distributed scheduler (future concern).
// =============================================================================

import 'server-only';
import { prisma as db } from '@/lib/db';
import { runDailyReset } from '@/lib/queue-reset';

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let currentTimer: NodeJS.Timeout | null = null;
let isRunning = false;

// ---------------------------------------------------------------------------
// getDailyResetTimeToday
// ---------------------------------------------------------------------------

/**
 * Reads the configured daily reset time and computes the next fire time.
 */
async function getDailyResetTimeToday(now: Date): Promise<Date> {
  const setting = await db.systemSetting.findUnique({
    where: { key: 'queue.daily_reset_time' },
  });
  const timeStr = setting?.value?.trim() || '00:00';

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
    // Invalid format — default to midnight
    return new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0, 0));
  }

  // Construct a UTC Date representing this time today in APP_TIMEZONE
  // We create a local date and use offset calculation
  const localMidnight = new Date(y, m - 1, d, 0, 0, 0, 0);
  const localResetTime = new Date(y, m - 1, d, hours, minutes, 0, 0);

  // Convert to UTC
  const tzOffset = localMidnight.getTime() - Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  let utcResetTime = new Date(localResetTime.getTime() - tzOffset);

  // If the reset time is in the past, schedule for tomorrow
  if (utcResetTime.getTime() <= now.getTime()) {
    utcResetTime = new Date(utcResetTime.getTime() + 24 * 60 * 60 * 1000);
  }

  return utcResetTime;
}

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
// computePreviousBusinessDate
// ---------------------------------------------------------------------------

function computePreviousBusinessDate(): Date {
  const tz = getAppTimezone();
  const nowStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [y, m, d] = nowStr.split('-').map(Number);
  // Yesterday in UTC (start of day)
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 24 * 60 * 60 * 1000);
}

// ---------------------------------------------------------------------------
// scheduleNextReset
// ---------------------------------------------------------------------------

async function scheduleNextReset(): Promise<void> {
  if (isRunning) return;

  const now = new Date();
  const nextResetTime = await getDailyResetTimeToday(now);
  const msUntilReset = nextResetTime.getTime() - now.getTime();

  if (msUntilReset <= 0) {
    // Shouldn't happen, but handle defensively: schedule for 24h from now
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[reset-scheduler] Computed reset time is in the past — rescheduling for 24h from now.',
      );
    }
    currentTimer = setTimeout(() => scheduleNextReset(), 24 * 60 * 60 * 1000);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(
      `[reset-scheduler] Next daily reset scheduled for ${nextResetTime.toISOString()} (in ${Math.round(msUntilReset / 60000)} minutes).`,
    );
  }

  currentTimer = setTimeout(async () => {
    try {
      isRunning = true;
      const previousBusinessDate = computePreviousBusinessDate();
      await runDailyReset({
        previousBusinessDate,
        now: new Date(),
        trigger: 'SCHEDULED',
        triggeredByUserId: null,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[reset-scheduler] Scheduled reset failed:', error);
      }
    } finally {
      isRunning = false;
      // Re-schedule for the next day
      void scheduleNextReset();
    }
  }, msUntilReset);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Starts the reset scheduler. Called once from instrumentation.ts on app boot.
 */
export function startResetScheduler(): void {
  if (process.env.NODE_ENV !== 'production') {
    console.info('[reset-scheduler] Daily reset scheduler starting...');
  }
  void scheduleNextReset();
}

/**
 * Stops the reset scheduler. Called on graceful shutdown (best-effort).
 */
export function stopResetScheduler(): void {
  if (currentTimer) {
    clearTimeout(currentTimer);
    currentTimer = null;
  }
}
