// =============================================================================
// /reports — Reports dashboard page (5.1.2)
// =============================================================================
import { redirect } from 'next/navigation';
import { prisma as db } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { getReportData } from '@/lib/analytics-service';
import { ReportsDashboardClient } from '@/components/reports/reports-dashboard-client';
import { ExportCsvButton } from '@/components/reports/export-csv-button';
import type { Metadata } from 'next';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  const hasPermission = session.user.permissions?.includes('report:view');
  if (!hasPermission) {
    redirect('/?error=forbidden');
  }

  // Load filter options
  const [services, counters] = await Promise.all([
    db.service.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { code: 'asc' },
    }),
    db.counter.findMany({
      where: { isActive: true },
      select: { id: true, name: true, number: true },
      orderBy: { number: 'asc' },
    }),
  ]);

  // Load initial report data for today
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const initialData = await getReportData(
    new Date(todayStr + 'T00:00:00.000Z'),
    new Date(todayStr + 'T23:59:59.999Z'),
  );

  return (
    <ReportsDashboardClient
      initialData={initialData}
      services={services}
      counters={counters}
      exportButtonSlot={<ExportCsvButton startDate={todayStr} endDate={todayStr} />}
    />
  );
}
