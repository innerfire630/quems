'use client';

// =============================================================================
// src/components/admin/audit-log-page-client.tsx — Audit log page client (5.2.3)
// =============================================================================
// Client-side wrapper that owns filter state, fetches on filter change,
// and renders the filters, table, and pagination controls.
// =============================================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { AuditLogTable } from '@/components/admin/audit-log-table';
import { AuditLogFilters } from '@/components/admin/audit-log-filters';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import type {
  AuditLogPageResult,
  AuditLogFilters as TAuditLogFilters,
} from '@/types/audit-log.types';

interface AuditLogPageClientProps {
  initialData: AuditLogPageResult;
}

export function AuditLogPageClient({ initialData }: AuditLogPageClientProps) {
  const [data, setData] = useState<AuditLogPageResult>(initialData);
  const [filters, setFilters] = useState<TAuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (f: TAuditLogFilters, p: number) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (f.userId) params.set('userId', f.userId);
      if (f.action) params.set('action', f.action);
      if (f.entity) params.set('entity', f.entity);
      if (f.entityId) params.set('entityId', f.entityId);
      if (f.startDate) params.set('startDate', new Date(f.startDate).toISOString());
      if (f.endDate) params.set('endDate', new Date(f.endDate).toISOString());
      params.set('page', String(p));
      params.set('pageSize', '25');

      const res = await fetch(`/api/audit-log?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData(filters, page);
    }, 0);
    return () => clearTimeout(timer);
  }, [filters, page, fetchData]);

  const handleFilterChange = useCallback((newFilters: TAuditLogFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  return (
    <div className="space-y-6">
      <AuditLogFilters filters={filters} onChange={handleFilterChange} />

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          {error}
          <Button variant="ghost" size="sm" onClick={() => fetchData(filters, page)}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <AuditLogTable entries={data.entries} />
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * data.pageSize + 1}–{Math.min(page * data.pageSize, data.total)} of{' '}
            {data.total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="mr-1 size-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
