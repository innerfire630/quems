// =============================================================================
// src/app/(dashboard)/_components/dashboard-top-bar.tsx — Session-aware top bar
// =============================================================================
// Server component: displays the logged-in user's name/email and a profile
// dropdown with change-password and logout options.
// =============================================================================

import type { Session } from 'next-auth';
import Image from 'next/image';
import { ProfileDropdown } from '@/components/layout/profile-dropdown';

interface DashboardTopBarProps {
  session: Session;
  logoUrl?: string | null;
  title?: string;
}

export function DashboardTopBar({ session, logoUrl, title }: DashboardTopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={title ?? 'Logo'}
            width={120}
            height={32}
            className="h-8 w-auto object-contain shrink-0"
          />
        ) : null}
        {title ? (
          <span className="text-lg font-semibold text-foreground truncate md:hidden">{title}</span>
        ) : null}
      </div>
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
