// =============================================================================
// DELETE /api/users/[userId]/hard-delete — Permanent user removal
// =============================================================================
// Hard-deletes a user and all their related records (UserRole, CounterOfficer,
// DeviceToken, RefreshToken). Requires user:manage permission.
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withPermission, type GuardedContext } from '@/lib/guards';
import { PERMISSION_USER_MANAGE } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';

export const DELETE = withPermission(
  async (
    _req: Request,
    { session }: GuardedContext,
    context?: { params: Promise<{ userId: string }> },
  ): Promise<Response> => {
    const { userId } = await context!.params;

    // Prevent self-deletion
    if (userId === session.user.userId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You cannot delete your own account.' },
        },
        { status: 403 },
      );
    }

    // Fetch the user to be deleted (for audit log)
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      );
    }

    // Prevent deleting the default admin account
    if (existing.username === 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'The default admin account cannot be deleted.' },
        },
        { status: 403 },
      );
    }

    // Delete the user — cascading deletes handle UserRole, CounterOfficer,
    // DeviceToken, and RefreshToken via the onDelete: Cascade schema rules.
    await prisma.user.delete({ where: { id: userId } });

    // Audit log
    await writeAuditLog({
      action: 'USER_DELETED',
      actorId: session.user.userId,
      actorName: session.user.name,
      entity: 'User',
      targetUserId: userId,
      targetUserName: existing.name,
      description: `Permanently deleted user ${existing.email}.`,
      metadata: { email: existing.email },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'User permanently deleted.' },
    });
  },
  PERMISSION_USER_MANAGE,
);
