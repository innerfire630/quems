// =============================================================================
// src/app/(dashboard)/users/_components/reset-password-dialog.tsx — Admin PW reset (1.3.3)
// =============================================================================

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ResetPasswordDialogProps {
  userId: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type State =
  | { step: 'confirm' }
  | { step: 'loading' }
  | { step: 'result'; temporaryPassword: string }
  | { step: 'error'; message: string };

export function ResetPasswordDialog({
  userId,
  userEmail,
  open,
  onOpenChange,
}: ResetPasswordDialogProps) {
  const [state, setState] = useState<State>({ step: 'confirm' });
  const [copied, setCopied] = useState(false);

  function reset() {
    setState({ step: 'confirm' });
    setCopied(false);
  }

  async function handleGenerate() {
    setState({ step: 'loading' });
    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, { method: 'POST' });
      const json = await res.json();

      if (!res.ok) {
        setState({ step: 'error', message: json.error?.message ?? 'Failed to reset password.' });
        return;
      }

      setState({ step: 'result', temporaryPassword: json.data.temporaryPassword as string });
    } catch {
      setState({ step: 'error', message: 'Network error. Please try again.' });
    }
  }

  async function handleCopy() {
    if (state.step !== 'result') return;
    await navigator.clipboard.writeText(state.temporaryPassword);
    setCopied(true);
    toast.success('Password copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogDescription>
            Generate a new temporary password for <span className="font-medium">{userEmail}</span>.
            The password will be shown once and cannot be retrieved later.
          </DialogDescription>
        </DialogHeader>

        {state.step === 'confirm' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This will replace the user&apos;s current password. The user will need the new
              password to log in.
            </p>
          </div>
        )}

        {state.step === 'loading' && (
          <div className="flex items-center justify-center py-4">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {state.step === 'result' && (
          <div className="space-y-3">
            <p className="text-sm font-medium">New temporary password:</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-muted p-3">
              <code className="flex-1 font-mono text-sm">{state.temporaryPassword}</code>
              <Button variant="ghost" size="icon" className="size-8" onClick={handleCopy}>
                {copied ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Alert variant="destructive" className="border-amber-500/30 bg-amber-500/5">
              <AlertDescription className="text-amber-600 dark:text-amber-400">
                This password will not be shown again. Send it to the user through a secure channel.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {state.step === 'error' && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          {state.step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate}>Generate Password</Button>
            </>
          )}
          {state.step === 'result' && <Button onClick={() => onOpenChange(false)}>Done</Button>}
          {state.step === 'error' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
