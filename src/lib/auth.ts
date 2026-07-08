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

        const user = await verifyCredentials(username, password);
        if (!user) return null;

        // Return user for NextAuth — the jwt callback will enrich with roles/permissions
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name,
          image: user.avatar,
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

        token.userId = userId;
        token.email = user.email ?? token.email ?? '';
        token.name = user.name ?? token.name ?? '';
        token.roles = roles;
        token.permissions = permissions;
      }

      // On subsequent calls (token already enriched), return as-is
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
