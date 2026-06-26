// =============================================================================
// src/app/(dashboard)/counters/new/page.tsx — Create counter page (2.1.2)
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { PERMISSION_COUNTER_CREATE } from '@/lib/permissions';
import { CounterForm } from '@/app/(dashboard)/counters/_components/counter-form';

export default async function NewCounterPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_COUNTER_CREATE)) redirect('/?error=forbidden');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create Counter</h1>
        <p className="text-sm text-muted-foreground">
          Add a new serving counter to the queue system.
        </p>
      </div>
      <CounterForm mode="create" />
    </div>
  );
}
