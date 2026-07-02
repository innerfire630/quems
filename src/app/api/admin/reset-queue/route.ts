// =============================================================================
// POST /api/admin/reset-queue — Manual reset endpoint (2.3.3)
// =============================================================================
// Super-admin only. Requires ?confirm=RESET_TODAY to prevent accidental resets.
// Writes an AuditLog row for traceability.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';
import { runDailyReset } from '@/lib/queue-reset';
import { manualResetQuerySchema, manualResetBodySchema } from '@/schemas/queue-reset.schema';
import type { ResetApiResponse } from '@/types/queue-reset.types';

export const POST = withPermission(async (req: Request) => {
  try {
    // Parse query parameters
    const url = new URL(req.url);
    const confirm = url.searchParams.get('confirm');
    const queryResult = manualResetQuerySchema.safeParse({ confirm });
    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Confirmation parameter missing — pass `?confirm=RESET_TODAY` to confirm this destructive action.',
          },
        },
        { status: 422 },
      );
    }

    // Parse optional body
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is fine
    }
    const bodyResult = manualResetBodySchema.safeParse(body);

    const session = await auth();

    // Determine previousBusinessDate
    let previousBusinessDate: Date;
    if (bodyResult.success && bodyResult.data.previousBusinessDate) {
      previousBusinessDate = new Date(bodyResult.data.previousBusinessDate + 'T00:00:00.000Z');
    } else {
      // Yesterday in APP_TIMEZONE
      const tz =
        process.env.APP_TIMEZONE?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const nowStr = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());
      const [y, m, d] = nowStr.split('-').map(Number);
      previousBusinessDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - 24 * 60 * 60 * 1000);
    }

    const now =
      bodyResult.success && bodyResult.data.now ? new Date(bodyResult.data.now) : new Date();

    // Run the reset
    const result = await runDailyReset({
      previousBusinessDate,
      now,
      trigger: 'MANUAL',
      triggeredByUserId: session?.user?.userId ?? null,
    });

    // Write an AuditLog row
    await writeAuditLog({
      action: 'DAILY_RESET_MANUAL',
      actorId: session?.user?.userId ?? 'unknown',
      actorName: session?.user?.name ?? undefined,
      entity: 'SystemSetting',
      description: `Manually triggered daily reset for business date ${previousBusinessDate.toISOString()}.`,
      metadata: {
        affectedServiceIds: result.affectedServices
          .filter((s) => s.counterReset)
          .map((s) => s.serviceId),
        totalSnapshotsUpserted: result.totalSnapshotsUpserted,
        totalCountersReset: result.totalCountersReset,
        errors: result.errors,
      },
    });

    // Map to API response shape
    const apiResponse: ResetApiResponse = {
      previousBusinessDate: previousBusinessDate.toISOString(),
      resetAt: now.toISOString(),
      trigger: 'MANUAL',
      triggeredByUserId: session?.user?.userId ?? null,
      affectedServices: result.affectedServices.map((s) => ({
        serviceId: s.serviceId,
        serviceName: s.serviceName,
        snapshotUpserted: s.snapshotUpserted,
        counterReset: s.counterReset,
        error: s.error,
      })),
      totalSnapshotsUpserted: result.totalSnapshotsUpserted,
      totalCountersReset: result.totalCountersReset,
      errors: result.errors,
    };

    return NextResponse.json({ success: true, data: apiResponse }, { status: 200 });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[admin/reset-queue] Unhandled error:', error);
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}, PERMISSION_SYSTEM_CONFIGURE);
