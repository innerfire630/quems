// =============================================================================
// src/app/(dashboard)/settings/display/new/page.tsx — Create board (3.2.3)
// =============================================================================

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DisplayBoardForm } from '@/components/admin/display-board-form';
import { PageHeader } from '@/components/layout/page-header';

export default function CreateDisplayBoardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings/display"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <PageHeader title="Create Display Board" className="flex-1" />
      </div>
      <DisplayBoardForm mode="create" />
    </div>
  );
}
