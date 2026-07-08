// =============================================================================
// src/components/counter/notification-toggle.tsx — Notification toggle (4.2.2)
// =============================================================================
// Client component for enabling/disabling push notifications per counter.
// Uses optimistic update with revert-on-error.
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';

interface NotificationToggleProps {
  counterId: string;
  counterName: string;
  counterNumber: number;
  initialEnabled: boolean;
  onToggle: (newValue: boolean) => void;
  disabled?: boolean;
}

export default function NotificationToggle({
  counterId,
  counterName,
  counterNumber,
  initialEnabled,
  onToggle,
  disabled = false,
}: NotificationToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (disabled || loading) return;

      // Optimistic update
      const previousValue = enabled;
      setEnabled(checked);
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/officers/me/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ counterId, notificationsEnabled: checked }),
        });
        const json = await res.json();
        if (!res.ok) {
          // Revert on error
          setEnabled(previousValue);
          setError(json.error?.message || 'Failed to update notification preference.');
          return;
        }
        onToggle(checked);
      } catch {
        // Revert on network error
        setEnabled(previousValue);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [counterId, enabled, onToggle, disabled, loading],
  );

  return (
    <div className="rounded-md border-2 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`notification-toggle-${counterId}`}
              className="text-sm font-medium cursor-pointer"
            >
              Push Notifications
            </Label>
            <Badge variant={enabled ? 'default' : 'secondary'} className="text-xs">
              {enabled ? 'On' : 'Off'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {counterName} (Counter {counterNumber})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            id={`notification-toggle-${counterId}`}
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={disabled || loading}
            aria-label={
              enabled
                ? `Toggle push notifications for ${counterName}, currently enabled`
                : `Toggle push notifications for ${counterName}, currently disabled`
            }
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
