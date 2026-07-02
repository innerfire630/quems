'use client';

// =============================================================================
// ResetQueueButton — manual queue reset trigger for the settings page
// =============================================================================

import { useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export function ResetQueueButton() {
  const [isResetting, setIsResetting] = useState(false);

  async function handleReset() {
    setIsResetting(true);
    try {
      const res = await fetch('/api/admin/reset-queue?confirm=RESET_TODAY', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to reset queue.');
        return;
      }

      const data = json.data;
      toast.success(
        `Queue reset complete. ${data.totalCountersReset ?? 0} counter(s) reset, ${data.totalSnapshotsUpserted ?? 0} snapshot(s) saved.`,
      );
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={isResetting}
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:pointer-events-none disabled:opacity-50"
    >
      {isResetting ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
      Reset Now
    </button>
  );
}
