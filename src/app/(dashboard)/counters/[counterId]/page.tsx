// =============================================================================
// src/app/(dashboard)/counters/[counterId]/page.tsx — Edit counter page (2.1.2)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wrench } from 'lucide-react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { PERMISSION_COUNTER_UPDATE } from '@/lib/permissions';
import { CounterForm } from '@/app/(dashboard)/counters/_components/counter-form';

interface EditCounterPageProps {
  params: Promise<{ counterId: string }>;
}

export default async function EditCounterPage({ params }: EditCounterPageProps) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const permissions = session.user.permissions ?? [];
  if (!permissions.includes(PERMISSION_COUNTER_UPDATE)) redirect('/?error=forbidden');

  const { counterId } = await params;

  const counter = await prisma.counter.findUnique({
    where: { id: counterId },
  });

  if (!counter) redirect('/counters?error=not-found');

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
      <div className="flex items-center justify-between">
        <Link
          href="/counters"
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 -ml-2"
        >
          <ArrowLeft className="mr-1 size-4" />
          Back to Counters
        </Link>
        <Link
          href={`/counters/${counterId}/services`}
          className="inline-flex items-center gap-1 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 px-3"
        >
          <Wrench className="mr-1 size-4" />
          Manage Services
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Counter</h1>
        <p className="text-sm text-muted-foreground">{counter.name}</p>
      </div>

      <CounterForm mode="edit" initialValues={initialValues} counterId={counterId} />
    </div>
  );
}
