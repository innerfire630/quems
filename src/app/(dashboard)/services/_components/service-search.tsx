// =============================================================================
// src/app/(dashboard)/services/_components/service-search.tsx — Search & filter (2.1.1)
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

interface ServiceSearchProps {
  defaultValue?: string;
  activeFilter?: string;
}

export function ServiceSearch({ defaultValue, activeFilter }: ServiceSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    router.push(`/services?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          defaultValue={defaultValue}
          className="pl-9"
          onChange={(e) => {
            const timer = setTimeout(() => {
              updateParams('search', e.target.value);
            }, 300);
            return () => clearTimeout(timer);
          }}
        />
      </div>
      <Select
        value={activeFilter ?? ''}
        onValueChange={(val) => updateParams('isActive', val ?? '')}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All</SelectItem>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>
      {(defaultValue || activeFilter) && (
        <Button variant="ghost" size="icon" onClick={() => router.push('/services')}>
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
