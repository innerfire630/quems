'use client';

import { Bell, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="relative w-full max-w-sm">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input type="search" placeholder="Search..." className="pl-8" aria-label="Search" />
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label="Notifications"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4" aria-hidden />
        </button>
        <div
          aria-label="User avatar"
          className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          SA
        </div>
      </div>
    </header>
  );
}
