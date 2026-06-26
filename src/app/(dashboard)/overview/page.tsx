// =============================================================================
// /overview — Dashboard overview with real-time stats
// =============================================================================

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { Users, Layers, Monitor, Ticket, Clock, BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

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

export default async function OverviewPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

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
      <h1 className="text-2xl font-bold text-foreground">Overview</h1>
      <p className="mt-2 text-muted-foreground">High-level system metrics and recent activity.</p>

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
                {role}
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
