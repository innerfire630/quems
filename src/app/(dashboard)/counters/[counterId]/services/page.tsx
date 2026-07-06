// =============================================================================
// src/app/(dashboard)/counters/[counterId]/services/page.tsx — Assignment UI (2.1.3)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSION_COUNTER_MANAGE } from '@/lib/permissions';
import { CounterServiceAssignment } from '@/app/(dashboard)/counters/_components/counter-service-assignment';

interface CounterServicesPageProps {
  params: Promise<{ counterId: string }>;
}

export default async function CounterServicesPage({ params }: CounterServicesPageProps) {
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

  return (
    <div className="space-y-6">
      <Link
        href={`/counters/${counterId}`}
        className="inline-flex items-center gap-1 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 -ml-2"
      >
        <ArrowLeft className="mr-1 size-4" />
        Back to Counter
      </Link>

      <PageHeader title="Manage Counter Services" description={`Counter #${counter.number} — ${counter.name}`} />

      <section className="rounded-lg border p-6">
        <h2 className="mb-1 text-lg font-semibold">Assigned Services</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {assignedServices.length} service{assignedServices.length !== 1 ? 's' : ''} assigned
        </p>

        <CounterServiceAssignment
          counterId={counterId}
          assignedServices={assignedServices}
          availableServices={allServices}
        />
      </section>
    </div>
  );
}
