// =============================================================================
// POST /api/auth/check-status — Pre-login account status check
// =============================================================================
// Lightweight endpoint to check if a user account is active before calling
// NextAuth signIn. Returns specific error reasons for deactivated/suspended
// accounts that NextAuth would otherwise swallow.
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const username = body?.username as string | undefined;

    if (!username) {
      return NextResponse.json({ success: true, data: { status: 'unknown' } }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { status: true },
    });

    if (!user) {
      // Don't reveal whether user exists — let signIn handle it
      return NextResponse.json({ success: true, data: { status: 'unknown' } }, { status: 200 });
    }

    if (user.status === 'INACTIVE') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_DEACTIVATED',
            message: 'Your account has been deactivated. Contact an administrator for assistance.',
          },
        },
        { status: 403 },
      );
    }

    if (user.status === 'SUSPENDED') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_DEACTIVATED',
            message: 'Your account has been suspended. Contact an administrator for assistance.',
          },
        },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, data: { status: 'active' } }, { status: 200 });
  } catch {
    return NextResponse.json({ success: true, data: { status: 'unknown' } }, { status: 200 });
  }
}
