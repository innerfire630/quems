'use client';

import {
  LayoutDashboard,
  Users,
  Monitor,
  Briefcase,
  BarChart3,
  FileText,
  Settings,
} from 'lucide-react';
import { SidebarBrand } from './SidebarBrand';
import { SidebarNavLink } from './SidebarNavLink';
import { SidebarFooter } from './SidebarFooter';

const NAV_ITEMS = [
  { href: '/overview', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Users', icon: Users },
  { href: '/counters', label: 'Counters', icon: Monitor },
  { href: '/services', label: 'Services', icon: Briefcase },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/audit-log', label: 'Audit Log', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <SidebarBrand />
      <nav className="flex flex-col gap-0.5 py-2" aria-label="Primary">
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
      <SidebarFooter />
    </aside>
  );
}
