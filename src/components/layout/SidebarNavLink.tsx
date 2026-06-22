'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon?: ReactNode;
}

export function SidebarNavLink({ href, label, icon }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 border-l-2 px-4 py-2 text-sm transition-colors',
        isActive
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'border-transparent text-muted-foreground hover:bg-background hover:text-foreground',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon ? <span className="flex size-4 items-center justify-center">{icon}</span> : null}
      <span>{label}</span>
    </Link>
  );
}
