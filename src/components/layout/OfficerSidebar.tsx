'use client';

import { signOut } from 'next-auth/react';
import { LogOut, Monitor } from 'lucide-react';
import { SidebarBrand } from './SidebarBrand';
import { SidebarNavLink } from './SidebarNavLink';
import { Button } from '@/components/ui/button';

interface OfficerSidebarProps {
  userName?: string | null;
  userEmail?: string;
  primaryCounterId?: string | null;
  brandName?: string;
  brandLogo?: string | null;
}

export function OfficerSidebar({ userName, userEmail, primaryCounterId, brandName, brandLogo }: OfficerSidebarProps) {
  const dashboardHref = primaryCounterId ? `/counter/${primaryCounterId}` : '/counter';

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <aside className="flex h-screen w-60 flex-col border-r-2 border-zinc-700 bg-zinc-800">
      <SidebarBrand name={brandName} logoUrl={brandLogo} />

      {/* User info */}
      {userName && (
        <div className="px-4 py-3 border-b border-zinc-700">
          <p className="text-sm font-medium truncate text-white">{userName}</p>
          {userEmail && <p className="text-xs text-zinc-400 truncate">{userEmail}</p>}
        </div>
      )}

      <nav className="flex flex-col gap-0.5 py-2" aria-label="Officer">
        <SidebarNavLink
          href={dashboardHref}
          label="Dashboard"
          icon={<Monitor className="size-4" aria-hidden />}
        />
      </nav>
      <div className="flex-1" />
      <div className="border-t border-zinc-700 p-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 text-zinc-400 hover:text-white hover:bg-white/5"
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
