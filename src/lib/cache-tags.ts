// =============================================================================
// src/lib/cache-tags.ts — Cache tag constants for unstable_cache (5.2.2)
// =============================================================================
// Every tag maps to a data domain. Mutations call revalidateTag(tag) to
// invalidate the cache precisely when underlying data changes.
//
// References: 5.2.0 §6.5 (Cache Invalidation Discipline)
// =============================================================================

export const SERVICES_TAG = 'services' as const;
export const COUNTERS_TAG = 'counters' as const;
export const DISPLAY_BOARDS_TAG = 'display-boards' as const;
export const SETTINGS_TAG = 'settings' as const;
export const USERS_TAG = 'users' as const;
export const ROLE_PERMISSIONS_TAG = 'role-permissions' as const;
export const OFFICERS_TAG = 'officers' as const;
export const QUEUE_SNAPSHOTS_TAG = 'queue-snapshots' as const;

export const CACHE_TAGS = {
  SERVICES_TAG,
  COUNTERS_TAG,
  DISPLAY_BOARDS_TAG,
  SETTINGS_TAG,
  USERS_TAG,
  ROLE_PERMISSIONS_TAG,
  OFFICERS_TAG,
  QUEUE_SNAPSHOTS_TAG,
} as const;
