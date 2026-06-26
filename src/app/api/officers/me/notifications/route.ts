// =============================================================================
// PATCH / GET /api/officers/me/notifications — Notification toggle endpoint (4.2.2)
// =============================================================================
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';
import { officerNotificationsUpdateSchema } from '@/schemas/officer-notifications.schema';
import {
  setNotificationsEnabled,
  getNotificationsState,
  findCounterOfficerForUserAndCounter,
} from '@/lib/officer-notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// PATCH — Toggle notifications for a specific counter
// ---------------------------------------------------------------------------

export async function PATCH(req: Request): Promise<Response> {
  try {
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
    const bodyResult = officerNotificationsUpdateSchema.safeParse(body);
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

    const { counterId, notificationsEnabled } = bodyResult.data;

    // Ownership check: the calling user must be assigned to this counter
    const counterOfficer = await findCounterOfficerForUserAndCounter(
      session.user.userId,
      counterId,
    );
    if (!counterOfficer) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not assigned to this counter.',
          },
        },
        { status: 403 },
      );
    }

    // Remember old value for audit log
    const oldValue = counterOfficer.notificationsEnabled;

    // Update the toggle
    await setNotificationsEnabled({
      counterOfficerId: counterOfficer.id,
      enabled: notificationsEnabled,
    });

    // Write audit log (best-effort, after update)
    try {
      await writeAuditLog({
        action: 'NOTIFICATIONS_TOGGLED',
        actorId: session.user.userId,
        actorName: session.user.name ?? undefined,
        description: `Push notifications ${notificationsEnabled ? 'enabled' : 'disabled'} for counter`,
        metadata: {
          counterId,
          counterOfficerId: counterOfficer.id,
          oldValue,
          newValue: notificationsEnabled,
        },
      });
    } catch {
      // Best-effort
    }

    return NextResponse.json(
      { success: true, data: { counterId, notificationsEnabled } },
      { status: 200 },
    );
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string };

    if (err.name === 'CounterOfficerNotFoundError') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: err.message },
        },
        { status: 500 },
      );
    }

    console.error('[officer-notifications] Unexpected error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// GET — Return full notification state across all counter assignments
// ---------------------------------------------------------------------------

export async function GET(): Promise<Response> {
  try {
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }

    const state = await getNotificationsState(session.user.userId);

    return NextResponse.json({ success: true, data: state }, { status: 200 });
  } catch (e: unknown) {
    console.error('[officer-notifications] GET error:', e);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}
