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

interface KioskPageProps {
  searchParams: Promise<{ kioskId?: string }>;
}

export default async function KioskPage({ searchParams }: KioskPageProps) {
  const { kioskId } = await searchParams;
  const kioskConfig = await loadKioskConfig(kioskId ?? null);

  if (!kioskConfig) {
    return <KioskNoConfig />;
  }

  const services = await getActiveServicesForKiosk(kioskConfig);

  return (
    <>
      <KioskHeader welcomeMessage={kioskConfig.welcomeMessage ?? 'Welcome!'} />
      <KioskHome services={services} kioskConfig={kioskConfig} />
    </>
  );
}
