// =============================================================================
// src/hooks/usePermission.ts — Client-side permission hook (1.3.2)
// =============================================================================
// Provides `usePermission()` and `useRole()` hooks for conditional UI
// rendering. Reads from the NextAuth session and checks against the
// permission/role constants defined in lib/permissions.ts.
// =============================================================================

'use client';

import { useSession } from 'next-auth/react';
import type { Permission, Role } from '@/lib/permissions';

export function usePermission() {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const permissions: string[] = session?.user?.permissions ?? [];

  return {
    /** True while the session is being loaded. */
    isLoading,
    /** The raw session object (may be null). */
    session,
    /** Returns true if the current session has the given permission. */
    can(permission: Permission): boolean {
      if (isLoading || !session) return false;
      return permissions.includes(permission);
    },
    /** Returns true if the session has at least one of the given permissions. */
    canAny(perms: Permission[]): boolean {
      if (isLoading || !session) return false;
      return perms.some((p) => permissions.includes(p));
    },
    /** Returns true if the session has all of the given permissions. */
    canAll(perms: Permission[]): boolean {
      if (isLoading || !session) return false;
      return perms.every((p) => permissions.includes(p));
    },
  };
}

export function useRole() {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const roles: string[] = session?.user?.roles ?? [];

  return {
    isLoading,
    session,
    hasRole(role: Role): boolean {
      if (isLoading || !session) return false;
      return roles.includes(role);
    },
  };
}
