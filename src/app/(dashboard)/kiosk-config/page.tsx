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
import { KioskConfigCard } from './_components/kiosk-config-card';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Kiosk Configuration</h1>
        <p className="mt-2 text-muted-foreground">
          Manage self-service kiosk instances. Each kiosk can have its own welcome message,
          auto-reset timeout, restricted services, and printer settings.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {configs.map((config) => (
          <KioskConfigCard key={config.id} config={config} />
        ))}

        {configs.length === 0 && (
          <p className="col-span-2 py-12 text-center text-muted-foreground">
            No kiosk configurations found. Run the seed script or create one via the database.
          </p>
        )}
      </div>
    </div>
  );
}
