'use client';

import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import type { Session } from 'next-auth';
import { ProfileDropdown } from './profile-dropdown';

interface MobileShellProps {
  brandName?: string;
  brandLogo?: string | null;
  session: Session;
  children: React.ReactNode;
}

export function MobileShell({ brandName, brandLogo, session, children }: MobileShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <AppSidebar brandName={brandName} brandLogo={brandLogo} className="hidden md:flex" />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden
        />
      )}

      {/* Mobile sidebar drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-200 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AppSidebar
          brandName={brandName}
          brandLogo={brandLogo}
          className="flex h-full"
          onClose={closeSidebar}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar with hamburger */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b-2 border-border bg-card px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="text-sm font-medium text-muted-foreground flex-1">
            {session.user.name ?? 'User'}
          </span>
          <div className="flex items-center gap-4">
            <ProfileDropdown
              userName={session.user.name ?? 'User'}
              userEmail={session.user.email ?? undefined}
              roles={(session.user.roles as string[]) ?? []}
            />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 min-w-0">{children}</main>
      </div>
    </div>
  );
}
