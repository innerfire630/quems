// =============================================================================
// /settings — System Settings page
// =============================================================================
// Displays all system settings with inline editing. Protected by the
// auth guard in the dashboard layout; ADMIN-only via `system:configure`.
// =============================================================================

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { SettingsClient } from '@/components/admin/settings-client';
import { PageHeader } from '@/components/layout/page-header';
import { StaticQrGenerator } from './_components/static-qr-generator';

export const dynamic = 'force-dynamic';

export default async function SystemSettingsPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const permissions: string[] = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_CONFIGURE)) {
    redirect('/?error=forbidden');
  }

  const settings = await prisma.systemSetting.findMany({
    orderBy: { key: 'asc' },
  });

  // Kiosk behaviour settings are managed on the /kiosk-config page
  // Counter dashboard settings (waiting_time, reminder, notification) are on /counter-config
  const EXCLUDED_PREFIXES = ['kiosk.', 'waiting_time.', 'reminder.', 'notification.'];
  const filteredSettings = settings.filter(
    (s) => !EXCLUDED_PREFIXES.some((p) => s.key.startsWith(p)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Global system configuration values. Changes take effect immediately."
      />
      <SettingsClient settings={filteredSettings} />
      <StaticQrGenerator />
    </div>
  );
}
