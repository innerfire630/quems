// =============================================================================
// /counter-config — Counter Dashboard Configuration
// =============================================================================
// Manages settings related to the counter officer dashboard:
// waiting time display, reminder alerts, and notification sounds.
// ADMIN only (system:configure).
// =============================================================================

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { SettingsClient } from '@/components/admin/settings-client';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

const COUNTER_CONFIG_PREFIXES = ['waiting_time.', 'reminder.', 'notification.'];

export default async function CounterConfigPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_CONFIGURE)) {
    redirect('/?error=forbidden');
  }

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
  });

  const counterSettings = settings.filter((s) =>
    COUNTER_CONFIG_PREFIXES.some((p) => s.key.startsWith(p)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Counter Configuration"
        description="Configure waiting time display, reminder alerts, and notification sounds for counter officer dashboards."
      />
      <SettingsClient settings={counterSettings} />
    </div>
  );
}
