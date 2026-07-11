// =============================================================================
// src/lib/auth.ts — NextAuth.js v5 configuration
// =============================================================================
// Central authentication module. Configures:
// - Prisma adapter (database-backed user/session lookup)
// - Credentials provider (email + password → bcrypt verify)
// - JWT session strategy (15-minute access tokens, not DB sessions)
// - Token enrichment (userId, roles, permissions injected into the JWT)
// - Refresh-token creation on sign-in (cookie set happens in server action)
// =============================================================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/db';
import { verifyCredentials, fetchUserRolesAndPermissions } from '@/lib/auth-utils';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours — matches a full work shift
  },

  jwt: {
    maxAge: 8 * 60 * 60,
  },

  secret: process.env['NEXTAUTH_SECRET'],

  pages: {
    signIn: '/login',
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username || !password) return null;

        const result = await verifyCredentials(username, password);
        if (!result.ok) {
          if (result.reason === 'deactivated') {
            throw new Error('AccountDeactivated');
          }
          if (result.reason === 'suspended') {
            throw new Error('AccountSuspended');
          }
          return null;
        }

        // Return user for NextAuth — the jwt callback will enrich with roles/permissions
        return {
          id: result.user.id,
          email: result.user.email ?? undefined,
          name: result.user.name,
          image: result.user.avatar,
        };
      },
    }),
  ],

  callbacks: {
    /**
     * signIn callback — fires after successful credential verification.
     * Does NOT set the refresh-token cookie here (NextAuth callback context
     * is limited). Instead, the login server action (1.2.3) calls
     * createRefreshTokenForUser and sets the cookie.
     */
    async signIn() {
      return true;
    },

    /**
     * JWT callback — enriches the token with userId, roles, permissions.
     * On initial sign-in: fetches from DB via join tables.
     * On subsequent calls: returns token unchanged (no extra DB hit).
     */
    async jwt({ token, user, trigger: _trigger }) {
      // Initial sign-in — fetch roles & permissions from DB
      if (user && token.userId === undefined) {
        const userId = user.id ?? token.sub;
        if (!userId) return token;

        const { roles, permissions } = await fetchUserRolesAndPermissions(userId);

        // Check if user must change password (admin reset)
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { mustChangePassword: true, status: true },
        });

        token.userId = userId;
        token.email = user.email ?? token.email ?? '';
        token.name = user.name ?? token.name ?? '';
        token.roles = roles;
        token.permissions = permissions;
        token.mustChangePassword = dbUser?.mustChangePassword ?? false;
        token.status = dbUser?.status ?? 'ACTIVE';
      }

      // Re-check mustChangePassword when it's true (to clear it after password change).
      // Avoids a DB hit on every request once the flag is false.
      if (token.userId && !user && token.mustChangePassword) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.userId as string },
          select: { mustChangePassword: true },
        });
        token.mustChangePassword = dbUser?.mustChangePassword ?? false;
      }

      return token;
    },

    /**
     * Session callback — exposes enriched fields to the client.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? token.sub ?? '';
        session.user.userId = token.userId ?? token.sub ?? '';
        session.user.email = token.email ?? session.user.email ?? '';
        session.user.name = token.name ?? session.user.name ?? '';
        session.user.roles = token.roles ?? [];
        session.user.permissions = token.permissions ?? [];
        session.user.mustChangePassword = token.mustChangePassword ?? false;
        session.user.status = token.status ?? 'ACTIVE';
      }
      return session;
    },
  },
});

/**
 * Typed server-side session getter.
 * Use in server components, API routes, and middleware:
 *   const session = await getServerSession();
 */
export const getServerSession = auth;
