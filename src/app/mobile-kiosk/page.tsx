// =============================================================================
// src/app/mobile-kiosk/page.tsx — Mobile Kiosk home page
// =============================================================================
// Server component that loads active services and renders the mobile kiosk
// form. Includes session recovery functionality.
// =============================================================================

import { getActiveServicesForKiosk, loadKioskConfig } from '@/lib/kiosk-config';
import { getSystemBrand, getSystemSettings } from '@/lib/cached-data';
import { prisma } from '@/lib/db';
import { MobileKioskClient } from './_components/mobile-kiosk-client';

export default async function MobileKioskPage() {
  const kioskConfig = await loadKioskConfig(null);

  // If no kiosk config exists, load all active services directly
  const services = kioskConfig
    ? await getActiveServicesForKiosk(kioskConfig)
    : await prisma.service.findMany({
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

  const [brand, settings] = await Promise.all([
    getSystemBrand(),
    getSystemSettings(['kiosk.require_customer_info', 'kiosk.customer_info_fields']),
  ]);

  const requireCustomerInfo = settings['kiosk.require_customer_info'] !== 'false';
  const rawFields = settings['kiosk.customer_info_fields'];
  let customerInfoFields = { nameOrId: 'name' as const, requireContact: true };
  if (rawFields) {
    try {
      const parsed = JSON.parse(rawFields);
      customerInfoFields = {
        nameOrId: parsed.nameOrId ?? 'name',
        requireContact: parsed.requireContact !== false,
      };
    } catch {
      // use defaults
    }
  }

  return (
    <MobileKioskClient
      services={services}
      brandName={brand.name}
      brandLogo={brand.logoUrl}
      requireCustomerInfo={requireCustomerInfo}
      customerInfoFields={customerInfoFields}
    />
  );
}
