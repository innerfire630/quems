'use client';

import { ProfileDropdown } from '@/components/layout/profile-dropdown';

interface TopBarProps {
  userName?: string | null;
  userEmail?: string;
  logoUrl?: string | null;
  title?: string;
  roles?: string[];
  variant?: 'light' | 'dark';
}

export function TopBar({ userName, userEmail, logoUrl, title, roles, variant = 'light' }: TopBarProps) {
  const isDark = variant === 'dark';

  return (
    <header className={`flex h-16 items-center justify-between border-b-2 px-6 ${
      isDark
        ? 'bg-zinc-800 border-zinc-700'
        : 'bg-card border-border'
    }`}>
      <div className="flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={title ?? 'Logo'}
            className="h-8 w-8 shrink-0 object-contain"
          />
        ) : null}
        {title ? <span className={`text-lg font-semibold ${isDark ? 'text-zinc-100' : 'text-foreground'}`}>{title}</span> : null}
        {userName ? (
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-400' : 'text-muted-foreground'}`}>
            — {userName}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-4">
        {userName ? (
          <ProfileDropdown userName={userName} userEmail={userEmail} roles={roles} />
        ) : null}
      </div>
    </header>
  );
}
