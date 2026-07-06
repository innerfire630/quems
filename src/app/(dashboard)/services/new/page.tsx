// =============================================================================
// src/app/(dashboard)/services/new/page.tsx — Create service page (2.1.1)
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PERMISSION_SERVICE_CREATE } from '@/lib/permissions';
import { ServiceForm } from '@/app/(dashboard)/services/_components/service-form';
import { PageHeader } from '@/components/layout/page-header';

export default async function NewServicePage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SERVICE_CREATE)) redirect('/?error=forbidden');

  return (
    <div className="space-y-6">
      <PageHeader title="Create Service" description="Add a new service category for the queue system." />
      <ServiceForm mode="create" />
    </div>
  );
}
