'use client';

// Wraps CounterTable with navigation handlers for the Edit / Manage Services dropdown.

import { useRouter } from 'next/navigation';
import { CounterTable } from './counter-table';
import type { CounterListItem } from '@/types/counter.types';

interface CounterTableWrapperProps {
  counters: CounterListItem[];
  isLoading?: boolean;
  error?: string | null;
}

export function CounterTableWrapper({ counters, isLoading, error }: CounterTableWrapperProps) {
  const router = useRouter();

  return (
    <CounterTable
      counters={counters}
      isLoading={isLoading}
      error={error}
      onEdit={(counterId) => router.push(`/counters/${counterId}`)}
    />
  );
}
