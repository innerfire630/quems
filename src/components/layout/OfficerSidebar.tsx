'use client';

import { LogOut, Monitor } from 'lucide-react';
import { SidebarBrand } from './SidebarBrand';
import { SidebarNavLink } from './SidebarNavLink';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [{ href: '/counter', label: 'Counter', icon: Monitor }] as const;

export function OfficerSidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <SidebarBrand />
      <nav className="flex flex-col gap-0.5 py-2" aria-label="Officer">
        {NAV_ITEMS.map((item) => (
          <SidebarNavLink
            key={item.href}
            href={item.href}
            label={item.label}
            icon={<item.icon className="size-4" aria-hidden />}
          />
        ))}
      </nav>
      <div className="flex-1" />
      <div className="border-t border-border p-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3"
          aria-label="Sign out"
        >
          <LogOut className="size-4" aria-hidden />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
