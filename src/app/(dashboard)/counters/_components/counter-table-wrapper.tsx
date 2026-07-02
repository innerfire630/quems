'use client';

// Wraps CounterTable with navigation handlers for the Edit / Manage Services dropdown.

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CounterTable } from './counter-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { CounterListItem } from '@/types/counter.types';

interface CounterTableWrapperProps {
  counters: CounterListItem[];
  isLoading?: boolean;
  error?: string | null;
}

export function CounterTableWrapper({ counters, isLoading, error }: CounterTableWrapperProps) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/counters/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to delete counter');
        return;
      }
      toast.success(`Counter "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      router.refresh();
    } catch {
      toast.error('Network error.');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, router]);

  return (
    <>
      <CounterTable
        counters={counters}
        isLoading={isLoading}
        error={error}
        onEdit={(counterId) => router.push(`/counters/${counterId}`)}
        onDelete={(counterId, counterName) => setDeleteTarget({ id: counterId, name: counterName })}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Counter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will
              deactivate the counter. Active tickets and officer assignments will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
