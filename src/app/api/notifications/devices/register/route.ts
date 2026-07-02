// =============================================================================
// src/app/api/notifications/devices/register/route.ts
// POST /api/notifications/devices/register (4.1.2)
// =============================================================================
// Idempotent device token registration. Authenticated — any user with a
// CounterOfficer profile can register their device.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma as db } from '@/lib/db';
import { registerToken } from '@/lib/device-token';
import { writeAuditLog } from '@/lib/audit-log';
import { deviceRegisterSchema } from '@/schemas/notification.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  // Auth check
  const session = await auth();
  if (!session?.user?.userId) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required.' },
      },
      { status: 401 },
    );
  }

  // Officer profile lookup
  const officer = await db.counterOfficer.findFirst({
    where: { userId: session.user.userId },
  });

  if (!officer) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only counter officers can register devices.',
        },
      },
      { status: 403 },
    );
  }

  // Parse and validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' },
      },
      { status: 422 },
    );
  }

  const parsed = deviceRegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body.',
          details: parsed.error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  try {
    // Check if token existed previously (for isReactivation tracking)
    const existing = await db.deviceToken.findUnique({
      where: { token: parsed.data.token },
    });
    const isReactivation = existing !== null && !existing.isActive;

    // Register (idempotent)
    const deviceToken = await registerToken({
      counterOfficerId: officer.id,
      token: parsed.data.token,
      platform: parsed.data.platform,
      deviceInfo: parsed.data.deviceInfo as Record<string, unknown> | undefined,
    });

    // Audit log — best-effort
    try {
      await writeAuditLog({
        action: 'DEVICE_TOKEN_REGISTERED',
        actorId: session.user.userId,
        actorName: session.user.name ?? undefined,
        entity: 'Notification',
        description: `Device token registered for officer ${session.user.name ?? session.user.userId}`,
        metadata: {
          platform: parsed.data.platform,
          isReactivation,
        },
      });
    } catch {
      // Best-effort — log swallowed
    }

    return NextResponse.json({ success: true, data: deviceToken }, { status: 200 });
  } catch (error) {
    console.error('[api/notifications/devices/register]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}
