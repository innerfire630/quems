// =============================================================================
// src/app/api/chat/cleanup/route.ts — POST /api/chat/cleanup
// =============================================================================
// Manually triggers the chat retention cleanup job.
// Requires PERMISSION_CHAT_MANAGE.
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_CHAT_MANAGE } from '@/lib/permissions';
import { runChatCleanup } from '@/lib/chat-cleanup';
import type { GuardedContext } from '@/lib/guards';

export const POST = withPermission(
  async (_req: Request, _ctx: GuardedContext): Promise<Response> => {
    try {
      const deletedCount = await runChatCleanup();

      return NextResponse.json({
        success: true,
        data: {
          deletedCount,
          message: `Deleted ${deletedCount} expired chat message(s).`,
        },
      });
    } catch (error) {
      console.error('[chat-cleanup] Manual cleanup failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CLEANUP_FAILED',
            message: 'Chat cleanup failed. Check server logs for details.',
          },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_CHAT_MANAGE,
);
