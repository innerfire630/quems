// =============================================================================
// src/app/api/display-boards/route.ts — List & Create endpoints (3.2.3)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';
import { displayBoardCreateSchema } from '@/schemas/display-board.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET — List all display boards
// ---------------------------------------------------------------------------

export const GET = withPermission(async (_req, _ctx) => {
  const boards = await prisma.displayBoard.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ success: true, data: boards });
}, PERMISSION_SYSTEM_CONFIGURE);

// ---------------------------------------------------------------------------
// POST — Create a new display board
// ---------------------------------------------------------------------------

export const POST = withPermission(async (req, _ctx) => {
  const session = await auth();
  const actorId = session?.user?.userId ?? 'unknown';

  const body = await req.json();
  const parsed = displayBoardCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid display board data.',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Enforce isDefault invariant in a transaction
  const board = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.displayBoard.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.displayBoard.create({
      data: {
        name: data.name,
        isDefault: data.isDefault,
        maxDisplayedTickets: data.maxDisplayedTickets,
        announcementEnabled: data.announcementEnabled,
        bellEnabled: data.bellEnabled,
        ttsEnabled: data.ttsEnabled,
        ttsLanguage: data.ttsLanguage,
        ttsRate: data.ttsRate,
        ttsPitch: data.ttsPitch,
        ttsVolume: data.ttsVolume,
        announcementTemplate: data.announcementTemplate,
        themeColor: data.themeColor ?? null,
        displayTheme: data.displayTheme ?? 'dark',
        logoUrl: data.logoUrl || null,
        customMessage: data.customMessage ?? null,
      },
    });
  });

  // Audit log (best-effort, after transaction)
  await writeAuditLog({
    action: 'DISPLAY_BOARD_CREATED',
    actorId,
    entity: 'DisplayBoard',
    description: `Created display board "${board.name}"`,
    metadata: { boardId: board.id, isDefault: board.isDefault },
  });

  if (data.isDefault) {
    await writeAuditLog({
      action: 'DISPLAY_BOARD_DEFAULT_CHANGED',
      actorId,
      entity: 'DisplayBoard',
      description: `Set "${board.name}" as the default display board`,
      metadata: { newDefaultId: board.id },
    });
  }

  return NextResponse.json({ success: true, data: board }, { status: 201 });
}, PERMISSION_SYSTEM_CONFIGURE);
