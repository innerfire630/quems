'use client';

import {
  LayoutDashboard,
  Users,
  Monitor,
  Briefcase,
  BarChart3,
  FileText,
  Settings,
  SlidersHorizontal,
  Tablet,
  X,
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
  { href: '/overview', label: 'Overview', icon: LayoutDashboard, permission: undefined },
  { href: '/users', label: 'Users', icon: Users, permission: PERMISSION_USER_MANAGE },
  { href: '/services', label: 'Services', icon: Briefcase, permission: PERMISSION_SERVICE_READ },
  { href: '/counters', label: 'Counters', icon: Monitor, permission: PERMISSION_COUNTER_READ },
  { href: '/reports', label: 'Reports', icon: BarChart3, permission: PERMISSION_REPORT_VIEW },
  { href: '/audit-log', label: 'Audit Log', icon: FileText, permission: PERMISSION_SYSTEM_AUDIT },
  {
    href: '/kiosk-config',
    label: 'Kiosk Config',
    icon: Tablet,
    permission: PERMISSION_SYSTEM_CONFIGURE,
  },
  {
    href: '/counter-config',
    label: 'Counter Config',
    icon: SlidersHorizontal,
    permission: PERMISSION_SYSTEM_CONFIGURE,
  },
  { href: '/settings', label: 'Settings', icon: Settings, permission: PERMISSION_SYSTEM_CONFIGURE },
] as const;

interface AppSidebarProps {
  brandName?: string;
  brandLogo?: string | null;
  className?: string;
  onClose?: () => void;
}

export function AppSidebar({ brandName, brandLogo, className, onClose }: AppSidebarProps) {
  return (
    <aside
      className={`h-screen w-60 flex-col border-r-2 border-zinc-700 bg-zinc-800 shrink-0 sticky top-0 ${className ?? 'hidden md:flex'}`}
    >
      <div className="flex items-center">
        <div className="flex-1">
          <SidebarBrand name={brandName} logoUrl={brandLogo} />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mr-2 flex size-8 items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 md:hidden"
            aria-label="Close navigation menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>
      <nav className="flex flex-col gap-0.5 py-2" aria-label="Primary">
        {NAV_ITEMS.map((item) =>
          item.permission ? (
            <Can key={item.href} permission={item.permission}>
              <SidebarNavLink
                href={item.href}
                label={item.label}
                icon={<item.icon className="size-4" aria-hidden />}
              />
            </Can>
          ) : (
            <SidebarNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={<item.icon className="size-4" aria-hidden />}
            />
          ),
        )}
      </nav>
      <div className="flex-1" />
    </aside>
  );
}
