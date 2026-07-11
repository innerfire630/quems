'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox } from 'lucide-react';
import { DateRangePicker } from './date-range-picker';
import { ReportFilters } from './report-filters';
import { ExportCsvButton } from './export-csv-button';
import { ReportKPICards } from './report-kpi-cards';
import { TicketsByHourChart } from './tickets-by-hour-chart';
import { ServicePerformanceTable } from './service-performance-table';
import { CounterPerformanceTable } from './counter-performance-table';
import type { ReportData } from '@/types/report.types';

interface ReportsDashboardClientProps {
  initialData: ReportData;
  services: Array<{ id: string; code: string; name: string }>;
  counters: Array<{ id: string; name: string; number: number }>;
}

export function ReportsDashboardClient({
  initialData,
  services,
  counters,
}: ReportsDashboardClientProps) {
  const [startDate, setStartDate] = useState<string>(initialData.startDate);
  const [endDate, setEndDate] = useState<string>(initialData.endDate);
  const [serviceId, setServiceId] = useState<string | null>(initialData.serviceId);
  const [counterId, setCounterId] = useState<string | null>(initialData.counterId);
  const [reportData, setReportData] = useState<ReportData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (serviceId) params.set('serviceId', serviceId);
      if (counterId) params.set('counterId', counterId);

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        setError(json.error?.message ?? 'Failed to load report data');
        return;
      }

      setReportData(json.data as ReportData);
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, serviceId, counterId]);

  // Debounced refetch on filter change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(refetch, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [refetch]);

  const handleDateChange = (range: { startDate: string; endDate: string }) => {
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  const handleFilterChange = (filters: { serviceId: string | null; counterId: string | null }) => {
    setServiceId(filters.serviceId);
    setCounterId(filters.counterId);
  };

  const isEmpty = reportData.kpi.totalTickets === 0 && reportData.services.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-zinc-300">
            Showing data from {startDate} to {endDate}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <DateRangePicker startDate={startDate} endDate={endDate} onChange={handleDateChange} />
        <ReportFilters
          serviceId={serviceId}
          counterId={counterId}
          services={services}
          counters={counters}
          onChange={handleFilterChange}
        />
        <div className="ml-auto">
          <ExportCsvButton
            startDate={startDate}
            endDate={endDate}
            serviceId={serviceId}
            counterId={counterId}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
          <button type="button" onClick={refetch} className="ml-3 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isEmpty ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox className="mb-3 size-12" aria-hidden />
          <p className="text-lg font-medium">No data for the selected period</p>
          <p className="text-sm">Try adjusting the date range or filters.</p>
        </div>
      ) : (
        /* Data */
        <div className="space-y-8">
          <ReportKPICards summary={reportData.kpi} />

          <div>
            <h2 className="mb-3 text-lg font-semibold">Tickets by Hour</h2>
            <div className="rounded-lg border bg-card p-4">
              <TicketsByHourChart data={reportData.hourly} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Per-Service Performance</h2>
            <div className="rounded-lg border bg-card">
              <ServicePerformanceTable rows={reportData.services} />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold">Per-Counter Performance</h2>
            <div className="rounded-lg border bg-card">
              <CounterPerformanceTable rows={reportData.counters} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
