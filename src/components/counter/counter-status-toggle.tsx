// =============================================================================
// src/components/counter/counter-status-toggle.tsx — Counter status toggle (4.2.1)
// =============================================================================
// Client component for opening/closing the counter with optional reason input.
// =============================================================================

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';

interface CounterStatusToggleProps {
  counterId: string;
  counterName: string;
  currentStatus: 'OPENED' | 'CLOSED';
  currentReason: string | null;
  onStatusChange: (newStatus: 'OPENED' | 'CLOSED', reason: string | null) => void;
  disabled?: boolean;
}

export default function CounterStatusToggle({
  counterId,
  counterName,
  currentStatus,
  currentReason,
  onStatusChange,
  disabled = false,
}: CounterStatusToggleProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reason, setReason] = useState('');

  const isOpen = currentStatus === 'OPENED';

  const handleToggle = useCallback(() => {
    if (isOpen) {
      // Opening close dialog
      setReason('');
      setShowCloseDialog(true);
    } else {
      // Opening reopen confirmation
      setShowReopenDialog(true);
    }
  }, [isOpen]);

  const handleClose = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/counters/${encodeURIComponent(counterId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED', reason: reason.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'Failed to close counter.');
        return;
      }
      setShowCloseDialog(false);
      onStatusChange('CLOSED', reason.trim() || null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [counterId, reason, onStatusChange]);

  const handleReopen = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/counters/${encodeURIComponent(counterId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OPENED' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message || 'Failed to reopen counter.');
        return;
      }
      setShowReopenDialog(false);
      onStatusChange('OPENED', null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [counterId, onStatusChange]);

  return (
    <>
      <div className="flex items-center justify-between rounded-md border-2 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Counter Status</span>
          <Badge variant={isOpen ? 'default' : 'secondary'} className="text-[10px]">
            {isOpen ? 'Open' : 'Closed'}
          </Badge>
          {currentReason && !isOpen && (
            <span className="text-xs text-muted-foreground">— {currentReason}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={isOpen}
            onCheckedChange={handleToggle}
            disabled={disabled || loading}
            aria-label={
              isOpen
                ? `Counter status toggle, currently open. Click to close.`
                : `Counter status toggle, currently closed. Click to reopen.`
            }
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Close Dialog with reason input */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Counter — {counterName}</DialogTitle>
            <DialogDescription>
              Select a reason or type a custom one. Customers will see this on the display.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {['On break', 'In a meeting', 'Lunch break', 'Shift change'].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={reason === preset ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setReason(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="closure-reason" className="text-xs">
                Or type a custom reason
              </Label>
              <Textarea
                id="closure-reason"
                placeholder="e.g., Back in 10 minutes"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={200}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">{reason.length}/200</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClose} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Counter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Confirmation Dialog */}
      <Dialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen Counter — {counterName}</DialogTitle>
            <DialogDescription>
              Waiting customers will resume normal service. Are you sure you want to reopen?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReopenDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleReopen} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reopen Counter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
