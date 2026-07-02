// =============================================================================
// src/app/(dashboard)/users/_components/user-table-client.tsx — Client wrapper (1.3.3)
// =============================================================================
// Thin client wrapper around UserTable that handles interactive actions
// (edit navigation, deactivate, password reset dialog).
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserTable } from './user-table';
import { ResetPasswordDialog } from './reset-password-dialog';
import type { UserListItem, RoleOption } from '@/types/user.types';
import { toast } from 'sonner';

interface UserTableClientProps {
  users: UserListItem[];
  roles: RoleOption[];
}

export function UserTableClient({ users, roles: _roles }: UserTableClientProps) {
  const router = useRouter();
  const [resetDialog, setResetDialog] = useState<{ userId: string; email: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    userId: string;
    email: string;
    name: string;
  } | null>(null);

  function handleEdit(userId: string) {
    router.push(`/users/${userId}`);
  }

  async function handleDeactivate(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to deactivate user.');
        return;
      }
      toast.success('User deactivated.');
      router.refresh();
    } catch {
      toast.error('Network error. Please try again.');
    }
  }

  async function handleDelete(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}/hard-delete`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to delete user.');
        return;
      }
      toast.success('User permanently deleted.');
      setDeleteDialog(null);
      router.refresh();
    } catch {
      toast.error('Network error. Please try again.');
    }
  }

  function handleResetPassword(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setResetDialog({ userId: user.id, email: user.email });
    }
  }

  function handleConfirmDelete(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setDeleteDialog({ userId: user.id, email: user.email, name: user.name ?? user.email });
    }
  }

  return (
    <>
      <UserTable
        users={users}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
        onDelete={handleConfirmDelete}
        onResetPassword={handleResetPassword}
      />
      {resetDialog && (
        <ResetPasswordDialog
          userId={resetDialog.userId}
          userEmail={resetDialog.email}
          open={!!resetDialog}
          onOpenChange={(open) => {
            if (!open) setResetDialog(null);
            router.refresh();
          }}
        />
      )}
      {deleteDialog && (
        <DeleteUserDialog
          userId={deleteDialog.userId}
          userName={deleteDialog.name}
          userEmail={deleteDialog.email}
          open={!!deleteDialog}
          onOpenChange={(open) => {
            if (!open) setDeleteDialog(null);
          }}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// DeleteUserDialog — confirmation dialog for hard delete
// ---------------------------------------------------------------------------

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useCallback } from 'react';

function DeleteUserDialog({
  userId,
  userName,
  userEmail,
  open,
  onOpenChange,
  onConfirm,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    await onConfirm(userId);
    setLoading(false);
  }, [userId, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-destructive" />
            Delete User Permanently
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-foreground">{userName}</span> ({userEmail})? This
            action cannot be undone. All associated data (roles, device tokens, counter assignments)
            will be removed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Permanently'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
