// =============================================================================
// POST /api/auth/force-change-password — Forced password change
// =============================================================================
// Used when mustChangePassword is true (admin reset a password).
// Does NOT require the current password — only the new password.
// Clears the mustChangePassword flag on success.
// =============================================================================

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit-log';

const forceChangePasswordSchema = z
  .object({
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

    // Verify the user actually needs a password change
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, mustChangePassword: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      );
    }

    if (!user.mustChangePassword) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'Password change is not required.' },
        },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = forceChangePasswordSchema.safeParse(body);

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

    const { newPassword } = parsed.data;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: false },
    });

    void writeAuditLog({
      action: 'PASSWORD_CHANGED',
      actorId: userId,
      actorName: user.name,
      entity: 'User',
      description: `User ${user.email} changed their password after admin reset.`,
      metadata: { email: user.email, forced: true },
    });

    return NextResponse.json({ success: true, data: { message: 'Password updated.' } });
  } catch (error) {
    console.error('[POST /api/auth/force-change-password]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' },
      },
      { status: 500 },
    );
  }
}
