// =============================================================================
// src/app/(dashboard)/services/new/page.tsx — Create service page (2.1.1)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
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
      <div className="flex items-center gap-3">
        <Link
          href="/services"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <PageHeader
          title="Create Service"
          description="Add a new service category for the queue system."
          className="flex-1"
        />
      </div>
      <ServiceForm mode="create" />
    </div>
  );
}
