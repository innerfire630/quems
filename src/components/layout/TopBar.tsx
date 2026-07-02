'use client';

import Image from 'next/image';
import { ProfileDropdown } from '@/components/layout/profile-dropdown';

interface TopBarProps {
  userName?: string | null;
  userEmail?: string;
  logoUrl?: string | null;
  title?: string;
  roles?: string[];
}

export function TopBar({ userName, userEmail, logoUrl, title, roles }: TopBarProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={title ?? 'Logo'}
            width={120}
            height={32}
            className="h-8 w-auto object-contain"
          />
        ) : null}
        {title ? <span className="text-lg font-semibold text-foreground">{title}</span> : null}
      </div>
      <div className="flex items-center gap-4">
        {userName ? (
          <ProfileDropdown userName={userName} userEmail={userEmail} roles={roles} />
        ) : null}
      </div>
    </header>
  );
}
