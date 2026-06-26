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

  function handleResetPassword(userId: string) {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setResetDialog({ userId: user.id, email: user.email });
    }
  }

  return (
    <>
      <UserTable
        users={users}
        onEdit={handleEdit}
        onDeactivate={handleDeactivate}
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
    </>
  );
}
