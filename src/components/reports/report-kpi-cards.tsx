import { Ticket, Clock, UserX, TrendingUp } from 'lucide-react';
import type { ReportKpiSummary } from '@/types/report.types';

interface ReportKPICardsProps {
  summary: ReportKpiSummary;
}

export function ReportKPICards({ summary }: ReportKPICardsProps) {
  const kpis = [
    {
      label: 'Total tickets',
      value: summary.totalTickets.toLocaleString(),
      icon: Ticket,
    },
    {
      label: 'Avg wait time',
      value:
        summary.averageWaitMinutes !== null ? `${summary.averageWaitMinutes.toFixed(1)} min` : '—',
      icon: Clock,
    },
    {
      label: 'No-show rate',
      value: `${(summary.noShowRate * 100).toFixed(1)}%`,
      icon: UserX,
    },
    {
      label: 'Busiest hour',
      value:
        summary.busiestHour !== null
          ? `${String(summary.busiestHour).padStart(2, '0')}:00 - ${String(summary.busiestHour).padStart(2, '0')}:59`
          : '—',
      icon: TrendingUp,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-colors hover:bg-accent/50"
        >
          {/* Subtle background icon */}
          <kpi.icon
            className="pointer-events-none absolute -bottom-4 -right-2 size-28 text-foreground"
            style={{ opacity: 0.08 }}
            aria-hidden
          />

          <div className="relative">
            <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
          </div>
          <p className="relative mt-3 text-3xl font-semibold text-foreground">{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
