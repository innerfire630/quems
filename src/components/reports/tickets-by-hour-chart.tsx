'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Inbox } from 'lucide-react';
import type { HourlyTicketCount } from '@/types/report.types';

interface TicketsByHourChartProps {
  data: HourlyTicketCount[];
}

export function TicketsByHourChart({ data }: TicketsByHourChartProps) {
  const isEmpty = data.every((d) => d.count === 0);

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Inbox className="mb-2 size-10" aria-hidden />
        <p className="text-sm">No tickets issued in this period</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    hour: `${String(d.hour).padStart(2, '0')}:00`,
    count: d.count,
  }));

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11 }}
            interval={1}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value) => [`${value} ticket${value !== 1 ? 's' : ''}`, 'Issued']}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
