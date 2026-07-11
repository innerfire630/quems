// =============================================================================
// src/app/(dashboard)/counters/[counterId]/page.tsx — Edit counter page (2.1.2)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSION_COUNTER_MANAGE } from '@/lib/permissions';
import { CounterForm } from '@/app/(dashboard)/counters/_components/counter-form';
import { OfficerAssignment } from '@/app/(dashboard)/counters/_components/officer-assignment';
import { ServiceAssignment } from '@/app/(dashboard)/counters/_components/service-assignment';

interface EditCounterPageProps {
  params: Promise<{ counterId: string }>;
}

export default async function EditCounterPage({ params }: EditCounterPageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_COUNTER_MANAGE)) redirect('/?error=forbidden');

  const { counterId } = await params;

  const counter = await prisma.counter.findUnique({
    where: { id: counterId },
    include: {
      services: {
        include: {
          service: {
            select: { id: true, name: true, code: true, ticketPrefix: true, isActive: true },
          },
        },
      },
    },
  });

  if (!counter) redirect('/counters?error=not-found');

  const allServices = await prisma.service.findMany({
    select: { id: true, name: true, code: true, ticketPrefix: true, isActive: true },
    orderBy: { name: 'asc' },
  });

  const assignedServices = counter.services.map((cs) => ({
    id: cs.id,
    serviceId: cs.serviceId,
    service: cs.service,
  }));

  const initialValues = {
    id: counter.id,
    name: counter.name,
    number: counter.number,
    description: counter.description,
    displayLabel: counter.displayLabel,
    isActive: counter.isActive,
    createdAt: counter.createdAt.toISOString(),
    updatedAt: counter.updatedAt.toISOString(),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/counters"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <PageHeader title="Edit Counter" description={counter.name} className="flex-1" />
      </div>

      <CounterForm mode="edit" initialValues={initialValues} counterId={counterId} />

      <OfficerAssignment counterId={counterId} />

      <ServiceAssignment
        counterId={counterId}
        initialAssigned={assignedServices}
        availableServices={allServices}
      />
    </div>
  );
}
