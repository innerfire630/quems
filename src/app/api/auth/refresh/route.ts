// =============================================================================
// src/app/api/auth/refresh/route.ts — Refresh-token rotation endpoint
// =============================================================================
// Dual-mode (web + mobile):
// - Web:   reads the refresh token from the HttpOnly cookie.
// - Mobile: reads the refresh token from the JSON request body.
//
// On success: rotates the token, issues a new access token, sets a new
// refresh cookie (web only), and returns the tokens in the master plan's
// standard response envelope.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  rotateRefreshToken,
  issueAccessToken,
  getRefreshTokenCookieName,
  getRefreshTokenCookieOptions,
} from '@/lib/auth-utils';
import { refreshTokenSchema } from '@/schemas/auth.schema';

export async function POST(request: NextRequest) {
  try {
    let plaintextToken: string | null = null;
    let isWebFlow = false;

    // 1. Determine the source of the refresh token
    const contentType = request.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      // Mobile flow — token is in the request body
      const body: unknown = await request.json().catch(() => null);
      const parsed = refreshTokenSchema.safeParse(body);

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

      plaintextToken = parsed.data.refreshToken;
    } else {
      // Web flow — token is in the cookie
      const cookieStore = await cookies();
      const cookieName = getRefreshTokenCookieName();
      plaintextToken = cookieStore.get(cookieName)?.value ?? null;
      isWebFlow = true;
    }

    if (!plaintextToken) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No refresh token provided' },
        },
        { status: 401 },
      );
    }

    // 2. Rotate the token (validate, create new, revoke old)
    const result = await rotateRefreshToken(plaintextToken);
    if (!result) {
      const response = NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
        },
        { status: 401 },
      );

      if (isWebFlow) {
        const cookieStore = await cookies();
        cookieStore.delete(getRefreshTokenCookieName());
      }

      return response;
    }

    const { newToken, newExpiresAt, user } = result;

    // 3. Issue a new access token
    const { accessToken, expiresIn } = await issueAccessToken(user);

    // 4. Build the response
    const responsePayload: Record<string, unknown> = {
      accessToken,
      expiresIn,
    };

    if (!isWebFlow) {
      // Mobile flow — include the new refresh token in the body
      responsePayload.refreshToken = newToken;
    }

    const response = NextResponse.json({
      success: true,
      data: responsePayload,
    });

    // 5. Set the new refresh cookie (web flow only)
    if (isWebFlow) {
      const cookieOptions = getRefreshTokenCookieOptions();
      response.cookies.set(getRefreshTokenCookieName(), newToken, {
        ...cookieOptions,
        expires: newExpiresAt,
      });
    }

    return response;
  } catch (error) {
    if (process.env['NODE_ENV'] === 'development') {
      console.error('[POST /api/auth/refresh]', error);
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
