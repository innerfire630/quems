// =============================================================================
// src/app/(dashboard)/services/_components/service-pagination.tsx — Pagination (2.1.1)
// =============================================================================

'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const btnBase =
  'inline-flex items-center gap-1 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:opacity-50 disabled:pointer-events-none';

interface ServicePaginationProps {
  page: number;
  totalPages: number;
  search?: string;
  isActive?: string;
}

export function ServicePagination({ page, totalPages, search, isActive }: ServicePaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(p: number) {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    if (search) params.set('search', search);
    if (isActive) params.set('isActive', isActive);
    const qs = params.toString();
    return `/services${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildUrl(page - 1)} className={btnBase}>
            <ChevronLeft className="mr-1 size-4" />
            Previous
          </Link>
        ) : (
          <span className={btnBase}>
            <ChevronLeft className="mr-1 size-4" />
            Previous
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {page < totalPages ? (
          <Link href={buildUrl(page + 1)} className={btnBase}>
            Next
            <ChevronRight className="ml-1 size-4" />
          </Link>
        ) : (
          <span className={btnBase}>
            Next
            <ChevronRight className="ml-1 size-4" />
          </span>
        )}
      </div>
    </div>
  );
}
