'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Inbox } from 'lucide-react';
import type { ServicePerformanceRow } from '@/types/report.types';

interface ServicePerformanceTableProps {
  rows: ServicePerformanceRow[];
}

type SortKey = keyof ServicePerformanceRow;
type SortDir = 'asc' | 'desc';

export function ServicePerformanceTable({ rows }: ServicePerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalIssued');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sorted = [...rows].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const numA = typeof va === 'number' ? va : 0;
    const numB = typeof vb === 'number' ? vb : 0;
    return sortDir === 'asc' ? numA - numB : numB - numA;
  });

  const sortIndicator = (key: SortKey) => {
    if (key !== sortKey) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <Inbox className="mb-2 size-8" aria-hidden />
        <p className="text-sm">No services match the filter</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('serviceCode')}
            >
              Service{sortIndicator('serviceCode')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('totalIssued')}
            >
              Issued{sortIndicator('totalIssued')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('totalServed')}
            >
              Served{sortIndicator('totalServed')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('noShowRate')}
            >
              No-Show Rate{sortIndicator('noShowRate')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('averageWaitMinutes')}
            >
              Avg Wait{sortIndicator('averageWaitMinutes')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('averageServiceMinutes')}
            >
              Avg Service{sortIndicator('averageServiceMinutes')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('peakHour')}
            >
              Peak Hour{sortIndicator('peakHour')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.serviceId}>
              <TableCell className="font-medium">
                {row.serviceCode} — {row.serviceName}
              </TableCell>
              <TableCell className="text-right">{row.totalIssued}</TableCell>
              <TableCell className="text-right">{row.totalServed}</TableCell>
              <TableCell className="text-right">{(row.noShowRate * 100).toFixed(1)}%</TableCell>
              <TableCell className="text-right">
                {row.averageWaitMinutes !== null ? `${row.averageWaitMinutes.toFixed(1)} min` : '—'}
              </TableCell>
              <TableCell className="text-right">
                {row.averageServiceMinutes !== null
                  ? `${row.averageServiceMinutes.toFixed(1)} min`
                  : '—'}
              </TableCell>
              <TableCell className="text-right">
                {row.peakHour !== null ? `${String(row.peakHour).padStart(2, '0')}:00` : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
