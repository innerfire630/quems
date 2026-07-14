// =============================================================================
// src/app/kiosk/page.tsx — Kiosk home page (2.2.2)
// =============================================================================
// Server component that loads the kiosk configuration and active services,
// then delegates to client components for interactivity.
// =============================================================================

import { loadKioskConfig, getActiveServicesForKiosk } from '@/lib/kiosk-config';
import { KioskHeader } from './_components/kiosk-header';
import { KioskHome } from './_components/kiosk-home';
import { KioskNoConfig } from './_components/kiosk-no-config';
import { getSystemBrand, getSystemSettings } from '@/lib/cached-data';

interface KioskPageProps {
  searchParams: Promise<{ kioskId?: string }>;
}

export default async function KioskPage({ searchParams }: KioskPageProps) {
  const { kioskId } = await searchParams;
  const kioskConfig = await loadKioskConfig(kioskId ?? null);

  if (!kioskConfig) {
    return <KioskNoConfig />;
  }

  const [services, brand, settings] = await Promise.all([
    getActiveServicesForKiosk(kioskConfig),
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
    <>
      <KioskHeader brandName={brand.name} brandLogo={brand.logoUrl} />
      <div className="kiosk-scrollable flex flex-1 flex-col items-center justify-center overflow-y-auto px-8 py-6">
        <h1 className="mb-6 text-center text-3xl font-bold text-foreground">
          {kioskConfig.welcomeMessage ?? 'Welcome!'}
        </h1>
        <div className="w-full max-w-6xl">
          <KioskHome
            services={services}
            kioskConfig={kioskConfig}
            requireCustomerInfo={requireCustomerInfo}
            customerInfoFields={customerInfoFields}
          />
        </div>
      </div>
    </>
  );
}
