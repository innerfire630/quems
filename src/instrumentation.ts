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

  // Subscribes the FCM invalid-token cleanup. Must run before any FCM
  // dispatch to ensure dead tokens are deactivated. (Phase 4.1.2)
  try {
    await import('@/lib/fcm-cleanup-listener');
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[instrumentation] FCM cleanup listener failed:', error);
    }
  }

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

  try {
    const { startChatCleanupScheduler } = await import('@/lib/chat-cleanup');
    startChatCleanupScheduler();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[instrumentation] Chat cleanup scheduler start failed:', error);
    }
  }
}
