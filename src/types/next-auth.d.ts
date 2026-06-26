// =============================================================================
// src/types/next-auth.d.ts — NextAuth v5 TypeScript module augmentation
// =============================================================================
// Augments the Session and JWT interfaces so that session.user.userId,
// session.user.roles, and session.user.permissions are strongly typed
// across the entire application.
//
// Note: The User interface is NOT augmented here because the credentials
// provider's `authorize` function returns the raw DB user (id, email, name).
// Enrichment (roles, permissions) happens in the JWT callback at token time.
// =============================================================================

import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      userId: string;
      email: string;
      name: string;
      image?: string | null;
      roles: string[];
      permissions: string[];
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    userId: string;
    email: string;
    name: string;
    roles: string[];
    permissions: string[];
  }
}
