// =============================================================================
// _components/user-search-bar.tsx — Search bar with clear button
// =============================================================================
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface UserSearchBarProps {
  defaultValue: string;
}

export function UserSearchBar({ defaultValue }: UserSearchBarProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      router.push(`/users?search=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/users');
    }
  }

  function handleClear() {
    setValue('');
    inputRef.current?.focus();
    router.push('/users');
  }

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          name="search"
          placeholder="Search by name or email..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}
