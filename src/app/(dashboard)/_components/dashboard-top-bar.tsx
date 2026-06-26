// =============================================================================
// src/app/(dashboard)/_components/dashboard-top-bar.tsx — Session-aware top bar
// =============================================================================
// Server component: displays the logged-in user's name/email and a logout button.
// =============================================================================

import type { Session } from 'next-auth';
import { LogoutButton } from './logout-button';

interface DashboardTopBarProps {
  session: Session;
}

export function DashboardTopBar({ session }: DashboardTopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <p className="font-medium text-foreground">{session.user.name}</p>
          <p className="text-muted-foreground text-xs">{session.user.email}</p>
        </div>
        <LogoutButton />
      </div>
    </header>
  );
}
