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

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" description="Global system configuration values. Changes take effect immediately." />
      <SettingsClient settings={settings} />
    </div>
  );
}
