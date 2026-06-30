// =============================================================================
// src/app/(dashboard)/counters/page.tsx — Counter listing page (2.1.2)
// =============================================================================

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSION_COUNTER_READ } from '@/lib/permissions';
import { CounterTableWrapper } from './_components/counter-table-wrapper';
import { CounterSearch } from './_components/counter-search';
import { CounterPagination } from './_components/counter-pagination';
import type { OperationalStatus } from '@/types/counter.types';

interface CountersPageProps {
  searchParams: Promise<{ page?: string; limit?: string; search?: string; isActive?: string }>;
}

export default async function CountersPage({ searchParams }: CountersPageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_COUNTER_READ)) redirect('/?error=forbidden');

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
      { displayLabel: { contains: search } },
      { description: { contains: search } },
    ];
  }

  const [counters, total] = await Promise.all([
    prisma.counter.findMany({
      where,
      orderBy: { number: 'asc' },
      skip,
      take: limit,
      include: {
        services: { select: { service: { select: { id: true } } } },
        officers: {
          where: { isOnDuty: true },
          select: { currentStatus: true },
        },
      },
    }),
    prisma.counter.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function computeStatus(officers: { currentStatus: string }[]): OperationalStatus {
    if (officers.length === 0) return 'NO_OFFICER_ON_DUTY';
    if (officers.some((o) => o.currentStatus === 'OPEN')) return 'OPEN';
    if (officers.some((o) => o.currentStatus === 'CLOSED')) return 'CLOSED';
    if (officers.some((o) => o.currentStatus === 'OFFLINE')) return 'OFFLINE';
    return 'NO_OFFICER_ON_DUTY';
  }

  const mapped = counters.map((c) => ({
    id: c.id,
    name: c.name,
    number: c.number,
    description: c.description,
    displayLabel: c.displayLabel,
    isActive: c.isActive,
    assignedServicesCount: c.services.length,
    operationalStatus: computeStatus(c.officers),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));

  const hasCreate = permissions.includes('counter:create' as never);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Counters</h1>
          <p className="text-sm text-muted-foreground">
            Manage serving counters and their operational status.
          </p>
        </div>
        {hasCreate && (
          <Link
            href="/counters/new"
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 h-9 px-4 py-2"
          >
            <Plus className="mr-2 size-4" />
            Create Counter
          </Link>
        )}
      </div>

      <Suspense>
        <CounterSearch defaultValue={search} activeFilter={isActive} />
      </Suspense>

      <Suspense fallback={<CounterTableWrapper counters={[]} isLoading />}>
        <CounterTableWrapper counters={mapped} />
        <CounterPagination
          page={page}
          totalPages={totalPages}
          search={search}
          isActive={isActive}
        />
      </Suspense>
    </div>
  );
}
