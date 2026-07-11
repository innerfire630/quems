// =============================================================================
// src/app/api/auth/mobile/login/route.ts — Mobile credential login endpoint
// =============================================================================
// Accepts { username, password } in the JSON body, verifies credentials, and
// returns access + refresh tokens in the response body. Does NOT set cookies
// — mobile clients store tokens in their platform's secure storage.
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma as db } from '@/lib/db';
import {
  verifyCredentials,
  fetchUserRolesAndPermissions,
  issueAccessToken,
  createRefreshTokenForUser,
  type UserWithRoles,
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

    const { username, password } = parsed.data;

    // 2. Verify credentials
    const result = await verifyCredentials(username, password);
    if (!result.ok) {
      const messages: Record<string, string> = {
        invalid: 'Invalid username or password',
        deactivated: 'Your account has been deactivated. Contact an administrator for assistance.',
        suspended: 'Your account has been suspended. Contact an administrator for assistance.',
      };
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: messages[result.reason] ?? messages.invalid },
        },
        { status: 401 },
      );
    }

    const user = result.user;

    // 3. Load roles and permissions
    const { roles, permissions } = await fetchUserRolesAndPermissions(user.id);

    const enrichedUser: UserWithRoles = { ...user, email: user.email ?? '', roles, permissions };

    // 4. Issue tokens
    const { accessToken, expiresIn } = await issueAccessToken(enrichedUser);
    const { token: refreshToken } = await createRefreshTokenForUser(user.id);

    // 5. Load officer profile (Phase 4.1.2)
    let officer = null;
    try {
      const officerProfile = await db.counterOfficer.findFirst({
        where: { userId: user.id },
        include: {
          counter: true,
          user: {
            include: {
              roles: {
                include: { role: { include: { permissions: { include: { permission: true } } } } },
              },
            },
          },
        },
      });

      if (officerProfile) {
        const flatPermissions = Array.from(
          new Set(
            officerProfile.user.roles.flatMap((ur) =>
              ur.role.permissions.map((rp) => rp.permission.name),
            ),
          ),
        );

        officer = {
          id: officerProfile.id,
          userId: officerProfile.userId,
          name: officerProfile.user.name,
          email: officerProfile.user.email,
          counter: officerProfile.counter
            ? {
                id: officerProfile.counter.id,
                name: officerProfile.counter.name,
                number: officerProfile.counter.number,
                displayLabel: officerProfile.counter.displayLabel,
              }
            : null,
          notificationsEnabled: officerProfile.notificationsEnabled,
          currentStatus: officerProfile.currentStatus,
          roles: officerProfile.user.roles.map((ur) => ur.role.name),
          permissions: flatPermissions,
        };
      }
    } catch (profileError) {
      // Best-effort — if profile fetch fails, return tokens without officer data
      if (process.env['NODE_ENV'] === 'development') {
        console.error('[POST /api/auth/mobile/login] Officer profile fetch failed:', profileError);
      }
    }

    // 6. Return tokens + officer profile (no cookies — mobile stores them in secure storage)
    return NextResponse.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn,
        mustChangePassword: user.mustChangePassword,
        officer,
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
