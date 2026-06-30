// =============================================================================
// src/app/(dashboard)/counters/_components/counter-table.tsx — Counter data table (2.1.2)
// =============================================================================

'use client';

import { MoreHorizontal, Pencil, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CounterListItem } from '@/types/counter.types';

interface CounterTableProps {
  counters: CounterListItem[];
  isLoading?: boolean;
  error?: string | null;
  onEdit?: (counterId: string) => void;
  onManageServices?: (counterId: string) => void;
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OPEN: 'default',
  CLOSED: 'secondary',
  OFFLINE: 'secondary',
  NO_OFFICER_ON_DUTY: 'outline',
};

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-4 w-8 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-8 w-8 animate-pulse rounded bg-muted" />
      </TableCell>
    </TableRow>
  );
}

export function CounterTable({
  counters,
  isLoading,
  error,
  onEdit,
  onManageServices,
}: CounterTableProps) {
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Display Label</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Services</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[60px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          ) : counters.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No counters found.
              </TableCell>
            </TableRow>
          ) : (
            counters.map((counter) => (
              <TableRow key={counter.id}>
                <TableCell className="font-mono font-medium">{counter.number}</TableCell>
                <TableCell>{counter.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {counter.displayLabel ?? '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={counter.isActive ? 'default' : 'secondary'}>
                    {counter.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">{counter.assignedServicesCount}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[counter.operationalStatus] ?? 'outline'}>
                    {counter.operationalStatus.replace(/_/g, ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted hover:text-foreground aria-expanded:bg-muted"
                      aria-label="Actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(counter.id)}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onManageServices?.(counter.id)}>
                        <Wrench className="mr-2 size-4" />
                        Manage Services
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
