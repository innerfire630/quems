// =============================================================================
// src/app/api/users/[userId]/reset-password/route.ts — Admin password reset (1.3.3)
// =============================================================================
// POST /api/users/[userId]/reset-password
// Generates a cryptographically random temporary password, hashes it,
// updates the user, and returns the plaintext password once.
// =============================================================================

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { withPermission, type GuardedContext } from '@/lib/guards';
import { PERMISSION_USER_MANAGE } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';

function generateTemporaryPassword(length = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i]! % charset.length];
  }
  return password;
}

export const POST = withPermission(
  async (
    _req: Request,
    { session }: GuardedContext,
    context?: { params: Promise<{ userId: string }> },
  ): Promise<Response> => {
    const { userId } = await context!.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      );
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: true },
    });

    await writeAuditLog({
      action: 'PASSWORD_RESET_BY_ADMIN',
      actorId: session.user.userId,
      actorName: session.user.name,
      entity: 'User',
      targetUserId: userId,
      targetUserName: user.name,
      description: `Reset password for user ${user.email}.`,
      metadata: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      data: {
        temporaryPassword,
        userId,
        _note:
          'This password is shown only once. Copy it and send it to the user through a secure channel.',
      },
    });
  },
  PERMISSION_USER_MANAGE,
);
