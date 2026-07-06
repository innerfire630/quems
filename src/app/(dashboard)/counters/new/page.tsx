// =============================================================================
// src/app/(dashboard)/counters/new/page.tsx — Create counter page (2.1.2)
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PERMISSION_COUNTER_CREATE } from '@/lib/permissions';
import { CounterForm } from '@/app/(dashboard)/counters/_components/counter-form';
import { PageHeader } from '@/components/layout/page-header';

export default async function NewCounterPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_COUNTER_CREATE)) redirect('/?error=forbidden');

  return (
    <div className="space-y-6">
      <PageHeader title="Create Counter" description="Add a new serving counter to the queue system." />
      <CounterForm mode="create" />
    </div>
  );
}
