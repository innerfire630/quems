// =============================================================================
// src/app/(dashboard)/settings/display/new/page.tsx — Create board (3.2.3)
// =============================================================================

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DisplayBoardForm } from '@/components/admin/display-board-form';

export default function CreateDisplayBoardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings/display"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Create Display Board</h1>
      </div>
      <DisplayBoardForm mode="create" />
    </div>
  );
}
