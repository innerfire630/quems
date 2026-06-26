// =============================================================================
// src/app/api/display-boards/[boardId]/route.ts — Detail, Update, Delete (3.2.3)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { withPermission } from '@/lib/guards';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';
import { displayBoardUpdateSchema } from '@/schemas/display-board.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET — Get a specific display board
// ---------------------------------------------------------------------------

export const GET = withPermission(
  async (_req, _ctx, { params }: { params: Promise<{ boardId: string }> }) => {
    const { boardId } = await params;

    const board = await prisma.displayBoard.findUnique({ where: { id: boardId } });

    if (!board) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Display board not found.' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: board });
  },
  PERMISSION_SYSTEM_CONFIGURE,
);

// ---------------------------------------------------------------------------
// PATCH — Update a display board
// ---------------------------------------------------------------------------

export const PATCH = withPermission(
  async (req, _ctx, { params }: { params: Promise<{ boardId: string }> }) => {
    const { boardId } = await params;
    const session = await auth();
    const actorId = session?.user?.userId ?? 'unknown';

    // Verify existence
    const existing = await prisma.displayBoard.findUnique({ where: { id: boardId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Display board not found.' } },
        { status: 404 },
      );
    }

    const body = await req.json();
    const parsed = displayBoardUpdateSchema.safeParse(body);

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
    const prevWasDefault = existing.isDefault;
    const newIsDefault = data.isDefault ?? existing.isDefault;

    // Compute diff for audit
    const changedFields: string[] = [];
    for (const key of Object.keys(data) as Array<keyof typeof data>) {
      if (data[key] !== undefined && data[key] !== (existing as Record<string, unknown>)[key]) {
        changedFields.push(key);
      }
    }

    // Enforce isDefault invariant in a transaction
    const board = await prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        await tx.displayBoard.updateMany({
          where: { isDefault: true, NOT: { id: boardId } },
          data: { isDefault: false },
        });
      }

      return tx.displayBoard.update({
        where: { id: boardId },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
          ...(data.maxDisplayedTickets !== undefined && {
            maxDisplayedTickets: data.maxDisplayedTickets,
          }),
          ...(data.announcementEnabled !== undefined && {
            announcementEnabled: data.announcementEnabled,
          }),
          ...(data.bellEnabled !== undefined && { bellEnabled: data.bellEnabled }),
          ...(data.ttsEnabled !== undefined && { ttsEnabled: data.ttsEnabled }),
          ...(data.ttsLanguage !== undefined && { ttsLanguage: data.ttsLanguage }),
          ...(data.ttsRate !== undefined && { ttsRate: data.ttsRate }),
          ...(data.ttsPitch !== undefined && { ttsPitch: data.ttsPitch }),
          ...(data.ttsVolume !== undefined && { ttsVolume: data.ttsVolume }),
          ...(data.announcementTemplate !== undefined && {
            announcementTemplate: data.announcementTemplate,
          }),
          ...(data.themeColor !== undefined && { themeColor: data.themeColor }),
          ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl || null }),
          ...(data.customMessage !== undefined && { customMessage: data.customMessage }),
        },
      });
    });

    // Audit log (best-effort)
    if (changedFields.length > 0) {
      await writeAuditLog({
        action: 'DISPLAY_BOARD_UPDATED',
        actorId,
        description: `Updated display board "${board.name}"`,
        metadata: { boardId, changedFields },
      });
    }

    if (!prevWasDefault && newIsDefault) {
      await writeAuditLog({
        action: 'DISPLAY_BOARD_DEFAULT_CHANGED',
        actorId,
        description: `Set "${board.name}" as the default display board`,
        metadata: { newDefaultId: boardId },
      });
    }

    return NextResponse.json({ success: true, data: board });
  },
  PERMISSION_SYSTEM_CONFIGURE,
);

// ---------------------------------------------------------------------------
// DELETE — Delete a display board (hard delete)
// ---------------------------------------------------------------------------

export const DELETE = withPermission(
  async (_req, _ctx, { params }: { params: Promise<{ boardId: string }> }) => {
    const { boardId } = await params;
    const session = await auth();
    const actorId = session?.user?.userId ?? 'unknown';

    const existing = await prisma.displayBoard.findUnique({ where: { id: boardId } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Display board not found.' } },
        { status: 404 },
      );
    }

    const wasDefault = existing.isDefault;
    await prisma.displayBoard.delete({ where: { id: boardId } });

    // Audit log
    await writeAuditLog({
      action: 'DISPLAY_BOARD_DELETED',
      actorId,
      description: `Deleted display board "${existing.name}"`,
      metadata: { boardId, boardName: existing.name, wasDefault },
    });

    if (wasDefault) {
      await writeAuditLog({
        action: 'DISPLAY_BOARD_DEFAULT_CHANGED',
        actorId,
        description: `Default display board "${existing.name}" was deleted — no default now exists`,
        metadata: { previousDefaultId: boardId, newDefaultId: null },
      });
    }

    return NextResponse.json({ success: true, data: null });
  },
  PERMISSION_SYSTEM_CONFIGURE,
);
