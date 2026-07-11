// =============================================================================
// src/app/(dashboard)/counters/new/page.tsx — Create counter page (2.1.2)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
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
      <div className="flex items-center gap-3">
        <Link
          href="/counters"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <PageHeader
          title="Create Counter"
          description="Add a new serving counter to the queue system."
          className="flex-1"
        />
      </div>
      <CounterForm mode="create" />
    </div>
  );
}
