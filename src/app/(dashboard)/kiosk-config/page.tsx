// =============================================================================
// /kiosk-config — Kiosk configuration listing
// =============================================================================
// Lists all KioskConfig records with inline editing.
// ADMIN only (system:configure).
// =============================================================================

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { KioskConfigForm } from './_components/kiosk-config-form';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

export default async function KioskConfigPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_CONFIGURE)) {
    redirect('/?error=forbidden');
  }

  const configs = await prisma.kioskConfig.findMany({
    orderBy: { name: 'asc' },
  });

  if (configs.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Kiosk Configuration" description="Manage self-service kiosk instances." />
        <p className="py-12 text-center text-muted-foreground">
          No kiosk configurations found. Run the seed script or create one via the database.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Kiosk Configuration" description="Manage self-service kiosk instances. Each kiosk can have its own welcome message, auto-reset timeout, restricted services, and printer settings." />

      {configs.map((config) => (
        <KioskConfigForm key={config.id} config={config} />
      ))}
    </div>
  );
}
