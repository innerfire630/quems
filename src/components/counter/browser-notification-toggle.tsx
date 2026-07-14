// =============================================================================
// src/components/counter/browser-notification-toggle.tsx — Browser notif toggle
// =============================================================================
// Toggle control for browser (desktop) notifications + sound alerts for
// new ticket events. Separate from the FCM push notification toggle.
// =============================================================================
'use client';

import { useCallback, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Volume2 } from 'lucide-react';
import { useBrowserNotifications } from '@/hooks/use-browser-notifications';

interface BrowserNotificationToggleProps {
  soundFile?: string;
}

export default function BrowserNotificationToggle({ soundFile }: BrowserNotificationToggleProps) {
  const { isEnabled, toggle, permission, requestPermission } = useBrowserNotifications({
    enabled: true,
    soundFile,
  });

  // Auto-request permission when first enabled
  useEffect(() => {
    if (isEnabled && permission === 'default') {
      requestPermission();
    }
  }, [isEnabled, permission, requestPermission]);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (checked && permission !== 'granted') {
        const result = await requestPermission();
        if (result === 'denied') {
          // User denied — don't toggle on
          return;
        }
      }
      toggle();
    },
    [permission, requestPermission, toggle],
  );

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Bell className="h-4 w-4 text-primary" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="browser-notif-toggle" className="cursor-pointer text-sm font-medium">
            Browser Alerts
          </Label>
          {soundFile && <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
        <Switch id="browser-notif-toggle" checked={isEnabled} onCheckedChange={handleToggle} />
      </div>
      {permission === 'denied' && (
        <p className="mt-1 text-xs text-destructive">
          Browser notifications are blocked. Please enable them in your browser settings.
        </p>
      )}
      {isEnabled && permission === 'granted' && (
        <p className="mt-1 text-xs text-muted-foreground">
          You&apos;ll receive desktop alerts for new tickets.
        </p>
      )}
    </div>
  );
}
