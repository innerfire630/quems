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
import type { CounterPerformanceRow } from '@/types/report.types';

interface CounterPerformanceTableProps {
  rows: CounterPerformanceRow[];
}

type SortKey = keyof CounterPerformanceRow;
type SortDir = 'asc' | 'desc';

export function CounterPerformanceTable({ rows }: CounterPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('totalServed');
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
        <p className="text-sm">No counters match the filter</p>
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
              onClick={() => handleSort('counterNumber')}
            >
              Counter{sortIndicator('counterNumber')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('totalServed')}
            >
              Served{sortIndicator('totalServed')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('totalNoShow')}
            >
              No-Shows{sortIndicator('totalNoShow')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('averageServiceMinutes')}
            >
              Avg Service{sortIndicator('averageServiceMinutes')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort('closureEvents')}
            >
              Closures{sortIndicator('closureEvents')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.counterId}>
              <TableCell className="font-medium">
                Counter {row.counterNumber} — {row.counterName}
              </TableCell>
              <TableCell className="text-right">{row.totalServed}</TableCell>
              <TableCell className="text-right">{row.totalNoShow}</TableCell>
              <TableCell className="text-right">
                {row.averageServiceMinutes !== null
                  ? `${row.averageServiceMinutes.toFixed(1)} min`
                  : '—'}
              </TableCell>
              <TableCell className="text-right">{row.closureEvents}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
