// =============================================================================
// src/lib/route-permissions.ts — Route prefix → permission mapping (1.3.2)
// =============================================================================
// Central registry mapping URL prefixes to the permission required to access
// them. Consumed by proxy.ts (middleware) for edge-level route protection.
// Add new prefixes here as protected routes are created in later phases.
// =============================================================================

import {
  PERMISSION_USER_MANAGE,
  PERMISSION_SYSTEM_CONFIGURE,
  PERMISSION_SYSTEM_AUDIT,
} from '@/lib/permissions';
import type { Permission } from '@/lib/permissions';

/**
 * Route prefix → required permission.
 * The middleware checks: does the user's session token contain this permission?
 * NOTE: This is the FIRST line of defence. The `withPermission` guard in
 * API handlers is the authoritative check. Never rely solely on middleware.
 */
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  '/users': PERMISSION_USER_MANAGE,
  '/settings': PERMISSION_SYSTEM_CONFIGURE,
  '/audit-log': PERMISSION_SYSTEM_AUDIT,
};
