'use client';

import { Monitor, MessageCircle, X } from 'lucide-react';
import { SidebarBrand } from './SidebarBrand';
import { SidebarNavLink } from './SidebarNavLink';
import { useChatUnread } from '@/hooks/use-chat-unread';

interface OfficerSidebarProps {
  primaryCounterId?: string | null;
  brandName?: string;
  brandLogo?: string | null;
  className?: string;
  onClose?: () => void;
}

export function OfficerSidebar({
  primaryCounterId,
  brandName,
  brandLogo,
  className,
  onClose,
}: OfficerSidebarProps) {
  const dashboardHref = primaryCounterId ? `/counter/${primaryCounterId}` : '/counter';
  const { totalUnread } = useChatUnread();

  return (
    <aside
      className={`h-screen w-60 flex-col border-r-2 border-zinc-700 bg-zinc-800 shrink-0 sticky top-0 ${className ?? 'hidden md:flex'}`}
    >
      <div className="flex items-center">
        <div className="flex-1">
          <SidebarBrand name={brandName} logoUrl={brandLogo} />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="mr-2 flex size-8 items-center justify-center rounded-md text-zinc-400 hover:text-white hover:bg-white/10 md:hidden"
            aria-label="Close navigation menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <nav className="flex flex-col gap-0.5 py-2" aria-label="Counter">
        <SidebarNavLink
          href={dashboardHref}
          label="Counter Dashboard"
          icon={<Monitor className="size-4" aria-hidden />}
        />
        <SidebarNavLink
          href="/counter/chats"
          label="Chats"
          icon={<MessageCircle className="size-4" aria-hidden />}
          badge={totalUnread}
        />
      </nav>
      <div className="flex-1" />
    </aside>
  );
}
