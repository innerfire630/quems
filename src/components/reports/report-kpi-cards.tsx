import { Card, CardContent } from '@/components/ui/card';
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
      color: 'border-t-blue-500',
    },
    {
      label: 'Avg wait time',
      value:
        summary.averageWaitMinutes !== null ? `${summary.averageWaitMinutes.toFixed(1)} min` : '—',
      icon: Clock,
      color: 'border-t-amber-500',
    },
    {
      label: 'No-show rate',
      value: `${(summary.noShowRate * 100).toFixed(1)}%`,
      icon: UserX,
      color: 'border-t-red-500',
    },
    {
      label: 'Busiest hour',
      value:
        summary.busiestHour !== null
          ? `${String(summary.busiestHour).padStart(2, '0')}:00 - ${String(summary.busiestHour).padStart(2, '0')}:59`
          : '—',
      icon: TrendingUp,
      color: 'border-t-emerald-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className={`border-t-2 ${kpi.color}`}>
          <CardContent className="flex items-center gap-3 pt-5">
            <kpi.icon className="size-8 text-muted-foreground" aria-hidden />
            <div>
              <p className="text-3xl font-bold">{kpi.value}</p>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
