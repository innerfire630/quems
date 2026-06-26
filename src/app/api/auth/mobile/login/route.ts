// =============================================================================
// src/app/api/auth/mobile/login/route.ts — Mobile credential login endpoint
// =============================================================================
// Accepts { email, password } in the JSON body, verifies credentials, and
// returns access + refresh tokens in the response body. Does NOT set cookies
// — mobile clients store tokens in their platform's secure storage.
// =============================================================================

import { NextResponse } from 'next/server';
import {
  verifyCredentials,
  fetchUserRolesAndPermissions,
  issueAccessToken,
  createRefreshTokenForUser,
} from '@/lib/auth-utils';
import { loginSchema } from '@/schemas/auth.schema';

export async function POST(request: Request) {
  try {
    // 1. Parse and validate the request body
    const body: unknown = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const { email, password } = parsed.data;

    // 2. Verify credentials
    const user = await verifyCredentials(email, password);
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' },
        },
        { status: 401 },
      );
    }

    // 3. Load roles and permissions
    const { roles, permissions } = await fetchUserRolesAndPermissions(user.id);

    const enrichedUser = { ...user, roles, permissions };

    // 4. Issue tokens
    const { accessToken, expiresIn } = await issueAccessToken(enrichedUser);
    const { token: refreshToken } = await createRefreshTokenForUser(user.id);

    // 5. Return tokens (no cookies — mobile stores them in secure storage)
    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn,
      },
    });
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
      console.error('[POST /api/auth/mobile/login]', error);
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      },
      { status: 500 },
    );
  }
}
