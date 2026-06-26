// =============================================================================
// src/components/can.tsx — Declarative permission-gated rendering (1.3.2)
// =============================================================================
// <Can permission="user:manage">...</Can> — renders children only when the
// current user has the required permission. Provides a `fallback` prop for
// unauthorised or loading states.
// =============================================================================

'use client';

import type { ReactNode } from 'react';
import { usePermission, useRole } from '@/hooks/usePermission';
import type { Permission, Role } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// <Can>
// ---------------------------------------------------------------------------

interface CanProps {
  /** Single permission (string → "has this"), or array (→ "has any of these"). */
  permission?: Permission | Permission[];
  /** Alternative: render children only if user has ANY of these. */
  any?: Permission[];
  /** Alternative: render children only if user has ALL of these. */
  all?: Permission[];
  /** Content rendered when the check fails or the session is loading. */
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ permission, any, all, fallback = null, children }: CanProps) {
  const { can, canAny, canAll, isLoading } = usePermission();

  // Loading — render nothing (or the fallback, if provided)
  if (isLoading) return fallback;

  // Determine which check to run
  if (all) {
    return canAll(all) ? children : fallback;
  }

  if (any) {
    return canAny(any) ? children : fallback;
  }

  if (permission) {
    if (Array.isArray(permission)) {
      return canAny(permission) ? children : fallback;
    }
    return can(permission) ? children : fallback;
  }

  // No permission specified → render children (no restriction)
  return children;
}

// ---------------------------------------------------------------------------
// <CanRole>
// ---------------------------------------------------------------------------

interface CanRoleProps {
  /** Single role or array of roles (array means "has any of these"). */
  role: Role | Role[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function CanRole({ role, fallback = null, children }: CanRoleProps) {
  const { hasRole, isLoading } = useRole();

  if (isLoading) return fallback;

  const roles = Array.isArray(role) ? role : [role];
  const pass = roles.some((r) => hasRole(r));

  return pass ? children : fallback;
}
