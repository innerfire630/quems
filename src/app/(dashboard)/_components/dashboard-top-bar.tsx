// =============================================================================
// src/app/(dashboard)/_components/dashboard-top-bar.tsx — Session-aware top bar
// =============================================================================
// Server component: displays the logged-in user's name/email and a profile
// dropdown with change-password and logout options.
// =============================================================================

import type { Session } from 'next-auth';
import { ProfileDropdown } from '@/components/layout/profile-dropdown';

interface DashboardTopBarProps {
  session: Session;
}

export function DashboardTopBar({ session }: DashboardTopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b-2 border-border bg-card px-4 sm:px-6">
      <span className="text-sm font-medium text-muted-foreground">
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
  );
}
