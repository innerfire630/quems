// =============================================================================
// src/app/(officer)/counter/[counterId]/page.tsx — Full officer dashboard (4.2.3)
// =============================================================================
// Replaces the Phase 2.3.2 temporary stub with the full dashboard composition.
// =============================================================================

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getOfficerDashboardData, OfficerNotAssignedToCounterError } from '@/lib/officer-dashboard';
import OfficerDashboardClient from '@/components/officer/officer-dashboard-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ counterId: string }>;
}

export default async function OfficerCounterPage({ params }: PageProps) {
  const { counterId } = await params;

  // Auth guard
  const session = await auth();
  if (!session?.user?.userId) {
    redirect('/login');
  }

  // Check counter:read permission
  const userPermissions = session.user.permissions as string[] | undefined;
  const hasCounterRead = userPermissions?.includes('counter:read');
  if (!hasCounterRead) {
    redirect('/?error=forbidden');
  }

  // Load dashboard data
  let data;
  try {
    data = await getOfficerDashboardData(counterId, session.user.userId);
  } catch (e: unknown) {
    if (e instanceof OfficerNotAssignedToCounterError) {
      redirect('/?error=forbidden');
    }

    const err = e as Error;
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">Counter Unavailable</h1>
        <p className="text-muted-foreground mt-2">
          {err.message || 'This counter does not exist or is not currently active.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <OfficerDashboardClient initialData={data} />
    </div>
  );
}
