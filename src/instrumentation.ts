// =============================================================================
// src/instrumentation.ts — Next.js instrumentation hook (2.3.3)
// =============================================================================
// Runs once per server process on boot. Seeds queue-related SystemSetting
// defaults and starts the daily reset scheduler. Only runs in the Node.js
// runtime (not edge).
//
// References:
// - https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
// =============================================================================

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    // Dynamic imports to ensure Prisma is only loaded in Node.js runtime
    const { seedQueueDefaultSettings } = await import('@/lib/settings-seed');
    await seedQueueDefaultSettings();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[instrumentation] Settings seeding failed:', error);
    }
    // Do not throw — the app must boot even if seeding fails
  }

  try {
    const { startResetScheduler } = await import('@/lib/reset-scheduler');
    startResetScheduler();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[instrumentation] Scheduler start failed:', error);
    }
  }
}
