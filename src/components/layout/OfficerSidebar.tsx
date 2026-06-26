'use client';

import { signOut } from 'next-auth/react';
import { LogOut, Monitor, Settings } from 'lucide-react';
import { SidebarBrand } from './SidebarBrand';
import { SidebarNavLink } from './SidebarNavLink';
import { Button } from '@/components/ui/button';

interface OfficerSidebarProps {
  userName?: string | null;
  userEmail?: string;
  primaryCounterId?: string | null;
}

export function OfficerSidebar({ userName, userEmail, primaryCounterId }: OfficerSidebarProps) {
  const dashboardHref = primaryCounterId ? `/counter/${primaryCounterId}` : '/counter';

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-card">
      <SidebarBrand />

      {/* User info */}
      {userName && (
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-medium truncate">{userName}</p>
          {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
        </div>
      )}

      <nav className="flex flex-col gap-0.5 py-2" aria-label="Officer">
        <SidebarNavLink
          href={dashboardHref}
          label="Dashboard"
          icon={<Monitor className="size-4" aria-hidden />}
        />
        <SidebarNavLink
          href="#"
          label="Settings"
          icon={<Settings className="size-4" aria-hidden />}
        />
      </nav>
      <div className="flex-1" />
      <div className="border-t border-border p-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3"
          aria-label="Sign out"
          onClick={handleLogout}
        >
          <LogOut className="size-4" aria-hidden />
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
