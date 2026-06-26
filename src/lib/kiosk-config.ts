// =============================================================================
// src/lib/kiosk-config.ts — Kiosk configuration loader (2.2.2)
// =============================================================================
// Server-side helper that loads the active KioskConfig by ID or falls back
// to the default. Also loads the active services for the kiosk.
// =============================================================================

import { prisma } from '@/lib/db';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LoadedKioskConfig {
  id: string;
  name: string;
  isDefault: boolean;
  welcomeMessage: string | null;
  footerMessage: string | null;
  printerName: string | null;
  autoResetSeconds: number;
  showEstimatedWait: boolean;
  restrictedServiceIds: string[] | null;
  paperWidth: '80MM' | '58MM';
}

export interface ServiceForKiosk {
  id: string;
  name: string;
  code: string;
  description: string | null;
  iconName: string | null;
  color: string | null;
}

// ---------------------------------------------------------------------------
// loadKioskConfig
// ---------------------------------------------------------------------------

export async function loadKioskConfig(kioskId?: string | null): Promise<LoadedKioskConfig | null> {
  let config;

  if (kioskId) {
    config = await prisma.kioskConfig.findFirst({
      where: { id: kioskId, isActive: true },
    });
  } else {
    config = await prisma.kioskConfig.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }

  if (!config) return null;

  const restrictedServiceIds = Array.isArray(config.restrictedServiceIds)
    ? (config.restrictedServiceIds as string[])
    : null;

  return {
    id: config.id,
    name: config.name,
    isDefault: config.isDefault,
    welcomeMessage: config.welcomeMessage,
    footerMessage: config.footerMessage,
    printerName: config.printerName,
    autoResetSeconds: config.autoResetSeconds,
    showEstimatedWait: config.showEstimatedWait,
    restrictedServiceIds,
    paperWidth: '80MM', // future extension point
  };
}

// ---------------------------------------------------------------------------
// getActiveServicesForKiosk
// ---------------------------------------------------------------------------

export async function getActiveServicesForKiosk(
  kiosk: LoadedKioskConfig,
): Promise<ServiceForKiosk[]> {
  let services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      iconName: true,
      color: true,
    },
  });

  if (kiosk.restrictedServiceIds && kiosk.restrictedServiceIds.length > 0) {
    const allowed = new Set(kiosk.restrictedServiceIds);
    services = services.filter((s) => allowed.has(s.id));
  }

  return services;
}
