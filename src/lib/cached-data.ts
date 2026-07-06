// =============================================================================
// src/lib/cached-data.ts — Cached query functions (5.2.2)
// =============================================================================
// Wraps slowly-changing data queries with Next.js unstable_cache. Each cached
// function has tags so mutations can invalidate precisely. The cache is
// per-process (not per-user) — only data that is the SAME for all users is
// cached here (services, counters, settings, display boards).
//
// References: 5.2.0 §4.2, Next.js unstable_cache docs
// =============================================================================

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/db';
import {
  SERVICES_TAG,
  COUNTERS_TAG,
  DISPLAY_BOARDS_TAG,
  SETTINGS_TAG,
  USERS_TAG,
  ROLE_PERMISSIONS_TAG,
} from '@/lib/cache-tags';

// ---------------------------------------------------------------------------
// Active services (ordered by sortOrder, then code)
// ---------------------------------------------------------------------------

export const getActiveServices = unstable_cache(
  async () => {
    return prisma.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' as const }, { code: 'asc' as const }],
    });
  },
  ['active-services'],
  { tags: [SERVICES_TAG], revalidate: 3600 },
);

// ---------------------------------------------------------------------------
// Active counters (with assigned services joined)
// ---------------------------------------------------------------------------

export const getActiveCounters = unstable_cache(
  async () => {
    return prisma.counter.findMany({
      where: { isActive: true },
      include: {
        services: {
          include: { service: true },
        },
      },
      orderBy: { name: 'asc' as const },
    });
  },
  ['active-counters'],
  { tags: [COUNTERS_TAG], revalidate: 3600 },
);

// ---------------------------------------------------------------------------
// Display board configurations
// ---------------------------------------------------------------------------

export const getDisplayBoardConfigurations = unstable_cache(
  async () => {
    return prisma.displayBoard.findMany({
      orderBy: { name: 'asc' as const },
    });
  },
  ['display-boards'],
  { tags: [DISPLAY_BOARDS_TAG], revalidate: 3600 },
);

// ---------------------------------------------------------------------------
// System name (from system.name setting)
// ---------------------------------------------------------------------------

export const SYSTEM_NAME_TAG = 'system-name';

export const getSystemName = unstable_cache(
  async (): Promise<string> => {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'system.name' },
      select: { value: true },
    });
    return setting?.value ?? 'QUEMS';
  },
  ['system-name'],
  { tags: [SYSTEM_NAME_TAG, SETTINGS_TAG], revalidate: 3600 },
);

export interface SystemBrand {
  name: string;
  logoUrl: string | null;
}

export const getSystemBrand = unstable_cache(
  async (): Promise<SystemBrand> => {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['system.name', 'system.logo_url'] } },
      select: { key: true, value: true },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));
    return {
      name: map.get('system.name') ?? 'QUEMS',
      logoUrl: map.get('system.logo_url') || null,
    };
  },
  ['system-brand'],
  { tags: [SYSTEM_NAME_TAG, SETTINGS_TAG], revalidate: 3600 },
);

// ---------------------------------------------------------------------------
// System setting (single key)
// ---------------------------------------------------------------------------

export const getSystemSetting = unstable_cache(
  async (key: string) => {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  },
  ['system-setting'],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

// ---------------------------------------------------------------------------
// System settings (bulk — avoids N+1 in callers)
// ---------------------------------------------------------------------------

export const getSystemSettings = unstable_cache(
  async (keys: string[]) => {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: keys } },
    });
    const map: Record<string, string | null> = {};
    for (const key of keys) {
      const setting = settings.find((s) => s.key === key);
      map[key] = setting?.value ?? null;
    }
    return map;
  },
  ['system-settings'],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

// ---------------------------------------------------------------------------
// User role permissions (resolved through role-permission mapping)
// ---------------------------------------------------------------------------

export const getUserRolePermissions = unstable_cache(
  async (userId: string) => {
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userWithRoles?.roles) return [];

    const permissionNames = new Set<string>();
    for (const userRole of userWithRoles.roles) {
      for (const rp of userRole.role.permissions) {
        permissionNames.add(rp.permission.name);
      }
    }
    return [...permissionNames];
  },
  ['user-role-permissions'],
  { tags: [USERS_TAG, ROLE_PERMISSIONS_TAG], revalidate: 3600 },
);
