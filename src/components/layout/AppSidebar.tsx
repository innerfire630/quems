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
import { Can } from '@/components/can';
import {
  PERMISSION_USER_MANAGE,
  PERMISSION_SYSTEM_CONFIGURE,
  PERMISSION_SYSTEM_AUDIT,
  PERMISSION_COUNTER_READ,
  PERMISSION_SERVICE_READ,
  PERMISSION_REPORT_VIEW,
} from '@/lib/permissions';

const NAV_ITEMS = [
  { href: '/overview', label: 'Dashboard', icon: LayoutDashboard, permission: undefined },
  { href: '/users', label: 'Users', icon: Users, permission: PERMISSION_USER_MANAGE },
  { href: '/counters', label: 'Counters', icon: Monitor, permission: PERMISSION_COUNTER_READ },
  { href: '/services', label: 'Services', icon: Briefcase, permission: PERMISSION_SERVICE_READ },
  { href: '/reports', label: 'Reports', icon: BarChart3, permission: PERMISSION_REPORT_VIEW },
  { href: '/audit-log', label: 'Audit Log', icon: FileText, permission: PERMISSION_SYSTEM_AUDIT },
  { href: '/settings', label: 'Settings', icon: Settings, permission: PERMISSION_SYSTEM_CONFIGURE },
] as const;

export function AppSidebar() {
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <SidebarBrand />
      <nav className="flex flex-col gap-0.5 py-2" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <Can key={item.href} permission={item.permission ?? []}>
            <SidebarNavLink
              href={item.href}
              label={item.label}
              icon={<item.icon className="size-4" aria-hidden />}
            />
          </Can>
        ))}
      </nav>
      <div className="flex-1" />
    </aside>
  );
}
