'use client';

import { useState, useCallback, useEffect } from 'react';
import { Menu, Bell, BellOff } from 'lucide-react';
import { OfficerSidebar } from './OfficerSidebar';
import { ProfileDropdown } from './profile-dropdown';
import { ChatUnreadProvider } from '@/hooks/use-chat-unread';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';
import { useDelayedReminder } from '@/hooks/use-delayed-reminder';
import { useSSE } from '@/hooks/use-sse';
import type { SseEventType } from '@/types/sse.types';

interface OfficerMobileShellProps {
  brandName?: string;
  brandLogo?: string | null;
  primaryCounterId?: string | null;
  userName?: string | null;
  userEmail?: string;
  roles?: string[];
  children: React.ReactNode;
}

export function OfficerMobileShell({
  brandName,
  brandLogo,
  primaryCounterId,
  userName,
  userEmail,
  roles,
  children,
}: OfficerMobileShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Browser notification + sound for new tickets (works on ALL officer pages)
  const { notifyNewTicket } = useBrowserNotifications({ enabled: true });

  // Delayed reminder alert (works on ALL officer pages)
  useDelayedReminder(primaryCounterId);

  // Subscribe to counter SSE channel for new ticket alerts
  // This ensures sounds play on dashboard, chats, and any other officer page
  useSSE(primaryCounterId ? `counter:${primaryCounterId}` : 'global', {
    filter: ['TICKET_ISSUED'] as readonly SseEventType[],
    onEvent: useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (envelope: any) => {
        const p = envelope.payload;
        if (p?.ticketNumber) {
          notifyNewTicket(
            p.ticketNumber as string,
            (p.customerName as string) ?? null,
            (p.serviceName as string) ?? 'Unknown',
          );
        }
      },
      [notifyNewTicket],
    ),
  });

  // Notification permission state — always start as 'default' to match SSR,
  // then sync the real browser value in an effect to avoid hydration mismatch.
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (!('Notification' in window)) {
      return;
    }

    // Sync actual permission immediately
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing browser permission
    setNotifPermission(Notification.permission);

    const sync = () => setNotifPermission(Notification.permission);

    // Auto-request on mount if default
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }

    // Poll for permission changes
    const interval = setInterval(sync, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const p = await Notification.requestPermission();
      setNotifPermission(p);
    }
  }, []);

  return (
    <ChatUnreadProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop sidebar */}
        <OfficerSidebar
          primaryCounterId={primaryCounterId}
          brandName={brandName}
          brandLogo={brandLogo}
          className="hidden md:flex"
        />

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
          <OfficerSidebar
            primaryCounterId={primaryCounterId}
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
              Counter Dashboard
            </span>
            <div className="flex items-center gap-4">
              {/* Notification status indicator */}
              <button
                type="button"
                onClick={handleRequestPermission}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                title={
                  notifPermission === 'granted'
                    ? 'Notifications active'
                    : notifPermission === 'denied'
                      ? 'Notifications blocked — click to retry'
                      : 'Click to enable notifications'
                }
              >
                {notifPermission === 'granted' ? (
                  <>
                    <Bell className="size-4 text-green-500" />
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      Alerts Active
                    </span>
                  </>
                ) : notifPermission === 'denied' ? (
                  <>
                    <BellOff className="size-4 text-orange-500" />
                    <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                      Alerts Blocked
                    </span>
                  </>
                ) : (
                  <>
                    <Bell className="size-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Enable Alerts</span>
                  </>
                )}
              </button>
              <ProfileDropdown
                userName={userName ?? 'Officer'}
                userEmail={userEmail}
                roles={roles ?? []}
              />
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 min-w-0">{children}</main>
        </div>
      </div>
    </ChatUnreadProvider>
  );
}
