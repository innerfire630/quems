'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SidebarNavLinkProps {
  href: string;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

export function SidebarNavLink({ href, label, icon, badge }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 border-l-2 px-4 py-2 text-sm transition-colors',
        isActive
          ? 'border-white bg-white/10 font-medium text-white'
          : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-white',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon ? <span className="flex size-4 items-center justify-center">{icon}</span> : null}
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}
