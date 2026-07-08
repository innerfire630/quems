// =============================================================================
// /overview — Dashboard overview with real-time stats
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import {
  Monitor,
  ArrowRight,
  Settings,
  UserPlus,
  Briefcase,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { LiveStats } from './_components/live-stats';
import {
  PERMISSION_USER_MANAGE,
  PERMISSION_SERVICE_MANAGE,
  PERMISSION_SYSTEM_CONFIGURE,
} from '@/lib/permissions';

export const dynamic = 'force-dynamic';

const STATUS_LABELS: Record<string, string> = {
  WAITING: 'Waiting',
  CALLED: 'Called',
  SERVING: 'Serving',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
  CANCELLED: 'Cancelled',
  RECALLED: 'Recalled',
};

const STATUS_COLORS: Record<string, string> = {
  WAITING: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  CALLED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  SERVING: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  COMPLETED: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  NO_SHOW: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  CANCELLED: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400',
  RECALLED: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

async function getDashboardStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    totalServices,
    totalCounters,
    ticketsToday,
    activeCounters,
    recentTickets,
    waitingTickets,
    servingTickets,
    counterStatuses,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.service.count({ where: { isActive: true } }),
    prisma.counter.count(),
    prisma.ticket.count({ where: { businessDate: { gte: today } } }),
    prisma.counterOfficer.count({
      where: { isOnDuty: true, currentStatus: { notIn: ['CLOSED', 'OFFLINE'] } },
    }),
    prisma.ticket.findMany({
      where: { businessDate: { gte: today } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        service: { select: { name: true, code: true } },
        counter: { select: { name: true } },
      },
    }),
    prisma.ticket.count({ where: { businessDate: { gte: today }, status: 'WAITING' } }),
    prisma.ticket.count({ where: { businessDate: { gte: today }, status: 'SERVING' } }),
    prisma.counterOfficer.findMany({
      where: { isOnDuty: true },
      select: {
        currentStatus: true,
        counter: { select: { name: true, number: true } },
        user: { select: { name: true } },
      },
      orderBy: { counter: { number: 'asc' } },
    }),
  ]);

  return {
    totalUsers,
    totalServices,
    totalCounters,
    ticketsToday,
    activeCounters,
    recentTickets,
    waitingTickets,
    servingTickets,
    counterStatuses,
  };
}

export default async function OverviewPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  const stats = await getDashboardStats();
  const permissions = session.user.permissions ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Overview" description="High-level system metrics and recent activity." />

      {/* Live stat cards */}
      <LiveStats
        initialTotalUsers={stats.totalUsers}
        initialTotalServices={stats.totalServices}
        initialTotalCounters={stats.totalCounters}
        initialTicketsToday={stats.ticketsToday}
        initialWaitingTickets={stats.waitingTickets}
        initialServingTickets={stats.servingTickets}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Tickets */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold">Recent Tickets</h3>
            <Link
              href="/reports"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recentTickets.length > 0 ? (
              stats.recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{ticket.displayNumber}</span>
                    <div className="text-xs text-muted-foreground">
                      <span>{ticket.service?.name ?? '—'}</span>
                      {ticket.counter && (
                        <span> · {ticket.counter.name}</span>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${STATUS_COLORS[ticket.status] ?? ''}`}
                  >
                    {STATUS_LABELS[ticket.status] ?? ticket.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No tickets today yet.
              </p>
            )}
          </div>
        </div>

        {/* Counter Status */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-3">
            <h3 className="text-sm font-semibold">Counter Status</h3>
            <Link
              href="/counters"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Manage <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.counterStatuses.length > 0 ? (
              stats.counterStatuses.map((co) => (
                <div key={co.counter.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{co.counter.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {co.user?.name ?? 'Unassigned'}
                    </span>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${
                      co.currentStatus === 'SERVING'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : co.currentStatus === 'AVAILABLE'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {co.currentStatus}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                No officers on duty.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Quick Actions</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {permissions.includes(PERMISSION_USER_MANAGE) && (
              <Link
                href="/users/new"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <UserPlus className="size-4 text-muted-foreground" />
                Create User
              </Link>
            )}
            {permissions.includes(PERMISSION_SERVICE_MANAGE) && (
              <Link
                href="/services"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <Briefcase className="size-4 text-muted-foreground" />
                Manage Services
              </Link>
            )}
            {permissions.includes(PERMISSION_SYSTEM_CONFIGURE) && (
              <Link
                href="/kiosk-config"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <Monitor className="size-4 text-muted-foreground" />
                Kiosk Config
              </Link>
            )}
            {permissions.includes(PERMISSION_SYSTEM_CONFIGURE) && (
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <Settings className="size-4 text-muted-foreground" />
                System Settings
              </Link>
            )}
          </div>
        </div>

        {/* Your Roles */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold">Your Account</h3>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm">{session.user.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm">{session.user.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Roles</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
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
        </div>
      </div>
    </div>
  );
}
