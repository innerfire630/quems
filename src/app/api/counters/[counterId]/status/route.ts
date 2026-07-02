// =============================================================================
// PATCH /api/counters/[counterId]/status — Counter status endpoint (4.2.1)
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_CLOSE } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';
import { broadcastRoutedEvent } from '@/lib/events';
import { counterStatusChangeSchema } from '@/schemas/counter-status.schema';
import { setCounterStatus, getCurrentStatus } from '@/lib/counter-status';
import type { CounterOpenedPayload, CounterClosedPayload } from '@/types/sse.types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PATCH = withPermission(async (req: Request) => {
  try {
    // Parse route params
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const counterIdx = segments.indexOf('counters');
    const counterId = segments[counterIdx + 1];

    if (!counterId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing counter ID.' } },
        { status: 400 },
      );
    }

    // Authenticate
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }

    // Parse & validate body
    const body = await req.json().catch(() => ({}));
    const bodyResult = counterStatusChangeSchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body.',
            details: bodyResult.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const { status: apiStatus, reason } = bodyResult.data;

    // Map API status to DB status
    const dbStatus = apiStatus === 'OPENED' ? ('AVAILABLE' as const) : ('CLOSED' as const);

    // Get the current status before the change (for audit log)
    const previousStatus = await getCurrentStatus(counterId);

    // Execute the status change
    const event = await setCounterStatus({
      counterId,
      officerId: session.user.userId,
      newStatus: dbStatus,
      reason: reason ?? null,
    });

    // Build SSE event payload
    const counter = await import('@/lib/db').then((m) =>
      m.prisma.counter.findUnique({
        where: { id: counterId },
        select: { name: true, number: true },
      }),
    );

    if (apiStatus === 'CLOSED') {
      const payload: CounterClosedPayload = {
        counterId,
        counterNumber: counter?.number ?? 0,
        counterName: counter?.name ?? `Counter ${counter?.number ?? ''}`,
        changedByOfficerId: session.user.userId,
        changedByOfficerName: session.user.name ?? 'Unknown',
        changedAt: event.createdAt.toISOString(),
        reason: reason ?? null,
      };
      broadcastRoutedEvent('COUNTER_CLOSED', payload, { counterId });
    } else {
      const payload: CounterOpenedPayload = {
        counterId,
        counterNumber: counter?.number ?? 0,
        counterName: counter?.name ?? `Counter ${counter?.number ?? ''}`,
        changedByOfficerId: session.user.userId,
        changedByOfficerName: session.user.name ?? 'Unknown',
        changedAt: event.createdAt.toISOString(),
      };
      broadcastRoutedEvent('COUNTER_OPENED', payload, { counterId });
    }

    // Write audit log (best-effort, after commit)
    try {
      await writeAuditLog({
        action: 'COUNTER_STATUS_CHANGED',
        actorId: session.user.userId,
        actorName: session.user.name ?? undefined,
        entity: 'Counter',
        description: `Counter status changed to ${apiStatus.toLowerCase()}`,
        metadata: {
          counterId,
          oldStatus: previousStatus?.status ?? 'unknown',
          newStatus: apiStatus,
          reason: reason ?? null,
          counterStatusEventId: event.id,
        },
      });
    } catch {
      // Best-effort: audit log failures do not fail the API response
    }

    return NextResponse.json({ success: true, data: event }, { status: 200 });
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };

    if (err.name === 'InvalidCounterStatusTransitionError') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: err.message },
        },
        { status: 422 },
      );
    }

    if (err.name === 'OfficerNotAssignedToCounterError') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: err.message },
        },
        { status: 403 },
      );
    }

    console.error('[counter-status] Unexpected error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}, PERMISSION_COUNTER_CLOSE);
