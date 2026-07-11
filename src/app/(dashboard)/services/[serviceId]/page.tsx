// =============================================================================
// src/app/(dashboard)/services/[serviceId]/page.tsx — Edit service page (2.1.1)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Monitor } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSION_SERVICE_UPDATE } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { ServiceForm } from '@/app/(dashboard)/services/_components/service-form';

interface EditServicePageProps {
  params: Promise<{ serviceId: string }>;
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_SERVICE_UPDATE)) redirect('/?error=forbidden');

  const { serviceId } = await params;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      counters: {
        include: {
          counter: true,
        },
      },
    },
  });

  if (!service) redirect('/services?error=not-found');

  const initialValues = {
    id: service.id,
    name: service.name,
    code: service.code,
    ticketPrefix: service.ticketPrefix,
    description: service.description,
    iconName: service.iconName,
    color: service.color,
    isActive: service.isActive,
    currentTicketNumber: service.currentTicketNumber,
    averageServiceTime: service.averageServiceTime,
    sortOrder: service.sortOrder,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };

  const assignedCounters = service.counters.map((cs) => cs.counter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/services"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <PageHeader title="Edit Service" description={service.name} className="flex-1" />
      </div>

      <ServiceForm mode="edit" initialValues={initialValues} serviceId={serviceId} />

      {/* Reverse view: counters handling this service */}
      <section className="rounded-lg border p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Monitor className="size-5" />
          Counters Handling This Service
        </h2>
        {assignedCounters.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No counters are assigned to this service yet. Counter assignment is managed from each
            counter&apos;s detail page.{' '}
            <Link href="/counters" className="underline">
              Browse Counters
            </Link>
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {assignedCounters.map((counter) => (
              <div
                key={counter.id}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium">#{counter.number}</span>
                  <span>{counter.displayLabel ?? counter.name}</span>
                  {!counter.isActive && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <Link href={`/counters/${counter.id}`} className="text-sm text-primary underline">
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
