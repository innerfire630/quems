// =============================================================================
// src/app/(dashboard)/services/page.tsx — Service listing page (2.1.1)
// =============================================================================

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSION_SERVICE_READ } from '@/lib/permissions';
import { ServiceTableWrapper } from './_components/service-table-wrapper';
import { ServiceSearch } from './_components/service-search';
import { ServicePagination } from './_components/service-pagination';

interface ServicesPageProps {
  searchParams: Promise<{ page?: string; limit?: string; search?: string; isActive?: string }>;
}

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SERVICE_READ)) redirect('/?error=forbidden');

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.limit) || 20));
  const search = sp.search || undefined;
  const isActive = sp.isActive || undefined;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (isActive) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [services, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.service.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  const mapped = services.map((s) => ({
    id: s.id,
    name: s.name,
    code: s.code,
    ticketPrefix: s.ticketPrefix,
    description: s.description,
    iconName: s.iconName,
    color: s.color,
    isActive: s.isActive,
    currentTicketNumber: s.currentTicketNumber,
    averageServiceTime: s.averageServiceTime,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const hasCreate = permissions.includes('service:create' as never);

  return (
    <div className="space-y-6">
      <PageHeader title="Services" description="Manage the services offered at your queue counters.">
        {hasCreate && (
          <Link
            href="/services/new"
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 h-9 px-4 py-2"
          >
            <Plus className="mr-2 size-4" />
            Create Service
          </Link>
        )}
      </PageHeader>

      <Suspense>
        <ServiceSearch defaultValue={search} activeFilter={isActive} />
      </Suspense>

      <Suspense fallback={<ServiceTableWrapper services={[]} isLoading />}>
        <ServiceTableWrapper services={mapped} />
        <ServicePagination
          page={page}
          totalPages={totalPages}
          search={search}
          isActive={isActive}
        />
      </Suspense>
    </div>
  );
}
