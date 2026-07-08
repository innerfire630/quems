'use server';

// =============================================================================
// src/actions/update-kiosk-config.ts — Server Action for updating kiosk config
// =============================================================================

import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';

export async function updateKioskConfig(
  configId: string,
  data: {
    name?: string;
    isActive?: boolean;
    isDefault?: boolean;
    welcomeMessage?: string;
    footerMessage?: string;
    printerName?: string;
    printerSheetSize?: string;
    autoResetSeconds?: number;
    showEstimatedWait?: boolean;
  },
) {
  const session = await getServerSession();
  if (!session) throw new Error('Not authenticated');

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_CONFIGURE)) {
    throw new Error('Forbidden');
  }

  const config = await prisma.kioskConfig.findUnique({ where: { id: configId } });
  if (!config) throw new Error('Kiosk config not found');

  const updated = await prisma.kioskConfig.update({
    where: { id: configId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
      ...(data.welcomeMessage !== undefined && { welcomeMessage: data.welcomeMessage }),
      ...(data.footerMessage !== undefined && { footerMessage: data.footerMessage }),
      ...(data.printerName !== undefined && { printerName: data.printerName || null }),
      ...(data.printerSheetSize !== undefined && { printerSheetSize: data.printerSheetSize || null }),
      ...(data.autoResetSeconds !== undefined && { autoResetSeconds: data.autoResetSeconds }),
      ...(data.showEstimatedWait !== undefined && { showEstimatedWait: data.showEstimatedWait }),
    },
  });

  void writeAuditLog({
    action: 'SYSTEM_SETTING_CHANGED',
    actorId: session.user.userId,
    actorName: session.user.name ?? undefined,
    entity: 'KioskConfig',
    entityId: configId,
    description: `Updated kiosk config "${config.name}"`,
    metadata: { configName: config.name, changes: data },
  });

  revalidatePath('/kiosk-config');

  return { success: true, data: updated };
}
