// =============================================================================
// src/app/api/auth/change-password/route.ts — Self-service password change
// =============================================================================
// POST /api/auth/change-password
// Authenticated user changes their own password by providing their current
// password and a new password.
// =============================================================================

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .regex(/[a-zA-Z]/, 'New password must contain at least one letter.')
      .regex(/[0-9]/, 'New password must contain at least one number.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password.',
    path: ['newPassword'],
  });

export async function POST(req: Request): Promise<Response> {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
      { status: 401 },
    );
  }

  try {
    const userId = session.user.userId as string;

    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request.',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, password: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Current password is incorrect.' },
        },
        { status: 422 },
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    void writeAuditLog({
      action: 'PASSWORD_CHANGED',
      actorId: userId,
      actorName: user.name,
      entity: 'User',
      description: `User ${user.email} changed their own password.`,
      metadata: { email: user.email },
    });

    return NextResponse.json({ success: true, data: { message: 'Password updated.' } });
  } catch (error) {
    console.error('[POST /api/auth/change-password]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to change password.' },
      },
      { status: 500 },
    );
  }
}
