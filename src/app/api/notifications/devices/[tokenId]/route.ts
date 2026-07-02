// =============================================================================
// src/app/api/notifications/devices/[tokenId]/route.ts
// DELETE /api/notifications/devices/[tokenId] (4.1.2)
// =============================================================================
// Removes a registered device token. Ownership-checked — officers can only
// remove their own tokens.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { removeToken, DeviceTokenOwnershipError } from '@/lib/device-token';
import { writeAuditLog } from '@/lib/audit-log';
import { deviceTokenIdParamSchema } from '@/schemas/notification.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ tokenId: string }> },
): Promise<Response> {
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

  // Validate URL param
  const { tokenId } = await params;
  const parsed = deviceTokenIdParamSchema.safeParse({ tokenId });
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid token ID.',
          details: parsed.error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  try {
    await removeToken(tokenId, session.user.userId);
  } catch (error) {
    if (error instanceof DeviceTokenOwnershipError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: error.message },
        },
        { status: 403 },
      );
    }
    console.error('[api/notifications/devices/[tokenId]]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }

  // Audit log — best-effort
  try {
    await writeAuditLog({
      action: 'DEVICE_TOKEN_REMOVED',
      actorId: session.user.userId,
      actorName: session.user.name ?? undefined,
      entity: 'Notification',
      description: `Device token removed by officer ${session.user.name ?? session.user.userId}`,
      metadata: { tokenId },
    });
  } catch {
    // Best-effort — log swallowed
  }

  return new Response(null, { status: 204 });
}
