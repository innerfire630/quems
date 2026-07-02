'use client';

// =============================================================================
// ChangePasswordDialog — self-service password change dialog
// =============================================================================

import { useState } from 'react';
import { Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type State =
  | { step: 'form' }
  | { step: 'loading' }
  | { step: 'success' }
  | { step: 'error'; message: string };

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [state, setState] = useState<State>({ step: 'form' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  function reset() {
    setState({ step: 'form' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrors({});
    setShowCurrent(false);
    setShowNew(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
    const fieldErrors: Record<string, string> = {};
    if (!currentPassword) fieldErrors.currentPassword = 'Current password is required.';
    if (!newPassword) {
      fieldErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      fieldErrors.newPassword = 'Must be at least 8 characters.';
    } else if (!/[a-zA-Z]/.test(newPassword)) {
      fieldErrors.newPassword = 'Must contain at least one letter.';
    } else if (!/[0-9]/.test(newPassword)) {
      fieldErrors.newPassword = 'Must contain at least one number.';
    }
    if (!confirmPassword) {
      fieldErrors.confirmPassword = 'Please confirm your new password.';
    } else if (newPassword !== confirmPassword) {
      fieldErrors.confirmPassword = 'Passwords do not match.';
    }
    if (currentPassword === newPassword) {
      fieldErrors.newPassword = 'New password must be different from the current password.';
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setState({ step: 'loading' });

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const json = await res.json();

      if (!res.ok) {
        const message = json.error?.message ?? 'Failed to change password.';
        // Map server field errors
        const details = json.error?.details;
        if (details?.fieldErrors) {
          const serverErrors: Record<string, string> = {};
          for (const [key, msgs] of Object.entries(details.fieldErrors)) {
            if (Array.isArray(msgs) && msgs.length > 0) {
              serverErrors[key] = msgs[0] as string;
            }
          }
          setErrors(serverErrors);
          setState({ step: 'form' });
          return;
        }
        setState({ step: 'error', message });
        return;
      }

      setState({ step: 'success' });
      toast.success('Password changed successfully.');
    } catch {
      setState({ step: 'error', message: 'Network error. Please try again.' });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>
            Enter your current password and a new password below.
          </DialogDescription>
        </DialogHeader>

        {state.step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters with at least one letter and one number.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Change Password</Button>
            </DialogFooter>
          </form>
        )}

        {state.step === 'loading' && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.step === 'success' && (
          <div className="space-y-4 py-4 text-center">
            <Lock className="mx-auto size-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              Your password has been changed successfully.
            </p>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}

        {state.step === 'error' && (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-destructive">{state.message}</p>
            <Button variant="outline" onClick={() => setState({ step: 'form' })}>
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
