// =============================================================================
// src/app/(dashboard)/audit-log/page.tsx — Audit log viewer page (5.2.3)
// =============================================================================
// Server component. Guards: auth + system:audit permission.
// Loads initial data for the page client component.
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { queryAuditLogs } from '@/lib/audit-log-queries';
import { AuditLogPageClient } from '@/components/admin/audit-log-page-client';
import { PERMISSION_SYSTEM_AUDIT } from '@/lib/permissions';
import { PageHeader } from '@/components/layout/page-header';
import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Audit Log — QUEMS',
};

export default async function AuditLogPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SYSTEM_AUDIT)) {
    redirect('/?error=forbidden');
  }

  const initialData = await queryAuditLogs({}, { page: 1, pageSize: 25 });

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <PageHeader title="Audit Log" description="System audit trail for all administrative actions." />
        <p className="text-sm text-muted-foreground">
          Every administrative action in the system is recorded here.
        </p>
      </div>
      <AuditLogPageClient initialData={initialData} />
    </div>
  );
}
