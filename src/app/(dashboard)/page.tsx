// =============================================================================
// / — Dashboard home page (overview)
// =============================================================================

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX, Users, Layers, Monitor, Ticket, Clock, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';

export const dynamic = 'force-dynamic';

const ROLE_COUNTER_OFFICER = 'COUNTER_OFFICER' as const;

interface DashboardHomePageProps {
  searchParams: Promise<{ error?: string }>;
}

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsers, totalServices, totalCounters, ticketsToday, activeCounters] =
    await Promise.all([
      prisma.user.count(),
      prisma.service.count({ where: { isActive: true } }),
      prisma.counter.count(),
      prisma.ticket.count({
        where: { businessDate: { gte: today } },
      }),
      prisma.counterOfficer.count({
        where: { isOnDuty: true, currentStatus: { notIn: ['CLOSED', 'OFFLINE'] } },
      }),
    ]);

  return { totalUsers, totalServices, totalCounters, ticketsToday, activeCounters };
}

export default async function DashboardHomePage({ searchParams }: DashboardHomePageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // COUNTER_OFFICER users → redirect to their assigned counter, or show message
  const roles = (session.user.roles ?? []) as string[];
  if (roles.includes(ROLE_COUNTER_OFFICER)) {
    const officer = await prisma.counterOfficer.findFirst({
      where: { userId: session.user.userId },
      select: { counterId: true },
      orderBy: { counter: { number: 'asc' } },
    });
    if (officer) {
      redirect(`/counter/${officer.counterId}`);
    }
    // Not assigned — show a clear message instead of admin overview
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Monitor className="size-12 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">No Counter Assigned</h1>
        <p className="mt-2 text-muted-foreground text-center max-w-md">
          You have a COUNTER_OFFICER role but are not yet assigned to a counter. An administrator
          must assign you to a counter before you can serve tickets.
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          Signed in as: <span className="font-medium">{session.user.email}</span>
        </p>
      </div>
    );
  }

  const params = await searchParams;
  const stats = await getDashboardStats();

  const cards = [
    {
      label: 'Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Active Services',
      value: stats.totalServices,
      icon: Layers,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Counters',
      value: stats.totalCounters,
      icon: Monitor,
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      label: 'Tickets Today',
      value: stats.ticketsToday,
      icon: Ticket,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Active Officers',
      value: stats.activeCounters,
      icon: Clock,
      color: 'text-rose-600 dark:text-rose-400',
    },
    {
      label: 'Permissions',
      value: session.user.permissions.length,
      icon: BarChart3,
      color: 'text-indigo-600 dark:text-indigo-400',
    },
  ];

  return (
    <div>
      <PageHeader title={`Welcome, ${session.user.name}`} description="Here&apos;s a quick overview of your queue management system." />

      {params.error === 'forbidden' && (
        <Alert variant="destructive" className="mt-6">
          <ShieldX className="size-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access that page. Contact your administrator if you
            believe this is an error.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
              <card.icon className={`size-4 ${card.color}`} />
            </div>
            <p className="mt-3 text-3xl font-semibold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium text-muted-foreground">Your Roles</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {session.user.roles.length > 0 ? (
            session.user.roles.map((role) => (
              <span
                key={role}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No roles assigned</span>
          )}
        </div>
      </div>
    </div>
  );
}
