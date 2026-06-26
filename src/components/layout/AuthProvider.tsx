'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/**
 * Client wrapper that provides the NextAuth SessionProvider to all
 * child components that use `useSession()`, `usePermission()`, etc.
 *
 * Renders inside a server layout component. The session is fetched
 * automatically by `useSession()` on the client side.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
