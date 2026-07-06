// =============================================================================
// src/app/(dashboard)/settings/display/page.tsx — Display boards list (3.2.3)
// =============================================================================

import Link from 'next/link';
import { prisma } from '@/lib/db';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DisplayBoardActions } from '@/components/admin/display-board-actions';

export default async function DisplayBoardsListPage() {
  const boards = await prisma.displayBoard.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Display Board Configuration">
        <Link
          href="/settings/display/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Create Display Board
        </Link>
      </PageHeader>

      {boards.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-semibold">No display boards configured</h3>
          <p className="mt-1 text-muted-foreground">
            Create your first board to enable the display.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Default?</TableHead>
              <TableHead>Max Tickets</TableHead>
              <TableHead>TTS Language</TableHead>
              <TableHead>Theme Color</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {boards.map((board) => (
              <TableRow key={board.id}>
                <TableCell className="font-medium">{board.name}</TableCell>
                <TableCell>{board.isDefault ? <Badge>Default</Badge> : null}</TableCell>
                <TableCell>{board.maxDisplayedTickets}</TableCell>
                <TableCell>{board.ttsLanguage}</TableCell>
                <TableCell>
                  {board.themeColor ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded border"
                        style={{ backgroundColor: board.themeColor }}
                      />
                      {board.themeColor}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Default</span>
                  )}
                </TableCell>
                <TableCell>
                  <DisplayBoardActions
                    boardId={board.id}
                    boardName={board.name}
                    isDefault={board.isDefault}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
