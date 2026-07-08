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
import { getSystemBrand } from '@/lib/cached-data';

interface KioskPageProps {
  searchParams: Promise<{ kioskId?: string }>;
}

export default async function KioskPage({ searchParams }: KioskPageProps) {
  const { kioskId } = await searchParams;
  const kioskConfig = await loadKioskConfig(kioskId ?? null);

  if (!kioskConfig) {
    return <KioskNoConfig />;
  }

  const [services, brand] = await Promise.all([
    getActiveServicesForKiosk(kioskConfig),
    getSystemBrand(),
  ]);

  return (
    <>
      <KioskHeader brandName={brand.name} brandLogo={brand.logoUrl} />
      <div className="flex flex-1 flex-col items-center justify-center overflow-hidden px-8">
        <h1 className="mb-6 text-center text-3xl font-bold text-foreground">
          {kioskConfig.welcomeMessage ?? 'Welcome!'}
        </h1>
        <div className="w-full max-w-6xl">
          <KioskHome services={services} kioskConfig={kioskConfig} />
        </div>
      </div>
    </>
  );
}
