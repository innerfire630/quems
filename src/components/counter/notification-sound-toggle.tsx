// =============================================================================
// src/components/counter/notification-sound-toggle.tsx — Sound on/off toggle
// =============================================================================
// Simple toggle for counter officers to enable/disable the new-ticket
// notification sound independently of browser desktop notifications.
// =============================================================================
'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Volume2, VolumeX } from 'lucide-react';

interface NotificationSoundToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export default function NotificationSoundToggle({
  isEnabled = true,
  onToggle,
}: NotificationSoundToggleProps) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <Volume2 className="h-4 w-4 text-primary" />
          ) : (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          )}
          <Label htmlFor="notification-sound-toggle" className="cursor-pointer text-sm font-medium">
            New Ticket Alert
          </Label>
        </div>
        <Switch id="notification-sound-toggle" checked={isEnabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}
