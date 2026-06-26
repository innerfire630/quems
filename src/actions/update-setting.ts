'use server';

// =============================================================================
// src/actions/update-setting.ts — Server Action for updating system settings
// =============================================================================

import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { revalidateTag } from 'next/cache';
import { SETTINGS_TAG } from '@/lib/cache-tags';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';

export async function updateSetting(settingId: string, value: string) {
  const session = await getServerSession();
  if (!session) throw new Error('Not authenticated');

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_CONFIGURE)) {
    throw new Error('Forbidden');
  }

  const setting = await prisma.systemSetting.update({
    where: { id: settingId },
    data: {
      value,
      updatedById: session.user.userId,
    },
  });

  // Write audit log — best effort
  try {
    await prisma.auditLog.create({
      data: {
        userId: session.user.userId,
        userDisplayName: session.user.name ?? null,
        action: 'SYSTEM_SETTING_CHANGED',
        entity: 'SYSTEM_SETTING',
        entityId: setting.id,
        after: {
          key: setting.key,
          value: setting.value,
          type: setting.type,
        },
      },
    });
  } catch {
    // Best-effort audit log
  }

  revalidateTag(SETTINGS_TAG, 'max');

  return setting;
}
