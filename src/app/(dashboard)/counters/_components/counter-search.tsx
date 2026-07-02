// =============================================================================
// src/app/(dashboard)/counters/_components/counter-search.tsx — Search & filter (2.1.2)
// =============================================================================

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CounterSearchProps {
  defaultValue?: string;
  activeFilter?: string;
}

export function CounterSearch({ defaultValue, activeFilter }: CounterSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`/counters?${params.toString()}`);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    updateParams('search', e.target.value);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search counters..."
          defaultValue={defaultValue}
          className="pl-9"
          onBlur={handleSearchChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter')
              handleSearchChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
          }}
        />
      </div>
      <Select
        value={activeFilter ?? ''}
        onValueChange={(val) => updateParams('isActive', val ?? '')}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status">
            {(val: string) => {
              if (val === 'true') return 'Active';
              if (val === 'false') return 'Inactive';
              return 'All';
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All</SelectItem>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>
      {(defaultValue || activeFilter) && (
        <Button variant="ghost" size="icon" onClick={() => router.push('/counters')}>
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
