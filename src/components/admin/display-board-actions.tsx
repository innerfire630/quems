// =============================================================================
// src/components/admin/display-board-actions.tsx — Action buttons (3.2.3)
// =============================================================================

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DisplayBoardActionsProps {
  boardId: string;
  boardName: string;
  isDefault: boolean;
}

export function DisplayBoardActions({ boardId, boardName, isDefault }: DisplayBoardActionsProps) {
  const router = useRouter();

  const handleSetDefault = async () => {
    try {
      const res = await fetch(`/api/display-boards/${boardId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to set as default.');
        return;
      }
      toast.success(`"${boardName}" is now the default display board.`);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${boardName}"? This action cannot be undone. If this is the default board, the display will fall back to "no configuration" until a new default is set.`,
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/display-boards/${boardId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to delete board.');
        return;
      }
      toast.success(`"${boardName}" has been deleted.`);
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => router.push(`/settings/display/${boardId}`)}
      >
        Edit
      </Button>
      {!isDefault && (
        <Button variant="outline" size="sm" onClick={handleSetDefault}>
          Set as Default
        </Button>
      )}
      <Button variant="destructive" size="sm" onClick={handleDelete}>
        Delete
      </Button>
    </div>
  );
}
