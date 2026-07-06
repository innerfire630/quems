// =============================================================================
// src/app/(dashboard)/settings/display/[boardId]/page.tsx — Edit board (3.2.3)
// =============================================================================

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DisplayBoardForm } from '@/components/admin/display-board-form';
import type { DisplayBoardConfig } from '@/types/display.types';

interface EditDisplayBoardPageProps {
  params: Promise<{ boardId: string }>;
}

export default async function EditDisplayBoardPage({ params }: EditDisplayBoardPageProps) {
  const { boardId } = await params;

  const board = await prisma.displayBoard.findUnique({ where: { id: boardId } });

  if (!board) {
    notFound();
  }

  const config: DisplayBoardConfig = {
    id: board.id,
    name: board.name,
    isDefault: board.isDefault,
    maxDisplayedTickets: board.maxDisplayedTickets,
    announcementEnabled: board.announcementEnabled,
    bellEnabled: board.bellEnabled,
    ttsEnabled: board.ttsEnabled,
    ttsLanguage: board.ttsLanguage,
    ttsRate: board.ttsRate,
    ttsPitch: board.ttsPitch,
    ttsVolume: board.ttsVolume,
    announcementTemplate: board.announcementTemplate,
    themeColor: board.themeColor,
    displayTheme: board.displayTheme,
    logoUrl: board.logoUrl,
    customMessage: board.customMessage,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/settings/display"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <PageHeader title={`Edit Display Board: ${board.name}`} />
      </div>
      <DisplayBoardForm mode="edit" initialValues={config} boardId={boardId} />
    </div>
  );
}
