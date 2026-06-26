// =============================================================================
// src/app/api/notifications/[notificationId]/reply/route.ts — Officer Reply (4.3.1)
// =============================================================================
// POST /api/notifications/[notificationId]/reply
// Authenticated counter officer replies to a push notification they received.
// Creates a NotificationReply, triggers a BroadcastMessage (4.3.2), emits an
// OFFICER_REPLY SSE event, and writes a NOTIFICATION_REPLIED audit log entry.
// =============================================================================

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { withPermission } from '@/lib/guards';
import type { GuardedContext } from '@/lib/guards';
import { broadcastRoutedEvent } from '@/lib/events';
import { writeAuditLog } from '@/lib/audit-log';
import { PERMISSION_NOTIFICATION_REPLY } from '@/lib/permissions';
import {
  notificationReplyCreateSchema,
  notificationIdParamSchema,
} from '@/schemas/notification-reply.schema';
import {
  createReply,
  getNotificationForOfficer,
  NotificationNotFoundError,
  NotAuthorizedToReplyError,
} from '@/lib/notification-reply';

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Core handler
// ---------------------------------------------------------------------------

async function handlePost(req: Request, _ctx: GuardedContext): Promise<Response> {
  // Extract notificationId from URL path segments
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const notificationsIdx = segments.indexOf('notifications');
  const notificationId = segments[notificationsIdx + 1] ?? '';
  const replyIdx = segments.indexOf('reply');

  // Validate the URL structure
  if (!notificationId || replyIdx < 0) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid URL' } },
      { status: 400 },
    );
  }

  try {
    // Step 1: Authentication
    const session = await auth();
    if (!session?.user?.userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
        { status: 401 },
      );
    }

    // Step 2: URL param validation
    const paramResult = notificationIdParamSchema.safeParse({ notificationId });
    if (!paramResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid notification ID',
            details: paramResult.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    // Step 3: Body parsing and validation
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
        { status: 422 },
      );
    }

    const bodyResult = notificationReplyCreateSchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: bodyResult.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    // Step 4: Resolve calling officer's CounterOfficer profile
    const counterOfficer = await prisma.counterOfficer.findFirst({
      where: { userId: session.user.userId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true } } },
    });

    if (!counterOfficer) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'No counter officer profile found' },
        },
        { status: 403 },
      );
    }

    // Step 5: Pre-flight notification check (fast fail)
    const notification = await getNotificationForOfficer(notificationId, counterOfficer.id);
    if (!notification) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Notification not found' } },
        { status: 404 },
      );
    }

    // Step 6: Create the reply (inside transaction)
    const { reply, broadcast } = await createReply({
      notificationId,
      counterOfficerId: counterOfficer.id,
      message: bodyResult.data.message,
    });

    // Step 7: Emit OFFICER_REPLY SSE event (best-effort)
    try {
      broadcastRoutedEvent(
        'OFFICER_REPLY',
        {
          notificationId: reply.notificationId,
          replyId: reply.id,
          repliedByOfficerName: counterOfficer.user.name ?? 'Unknown Officer',
          repliedAt: reply.createdAt.toISOString(),
        },
        {},
      );
    } catch (error) {
      console.error('[notification-reply] Failed to emit OFFICER_REPLY SSE event:', error);
    }

    // Step 8: Write audit log (best-effort)
    try {
      await writeAuditLog({
        action: 'NOTIFICATION_REPLIED',
        actorId: session.user.userId,
        description: 'Officer replied to notification',
        metadata: {
          notificationId,
          replyId: reply.id,
          counterOfficerId: counterOfficer.id,
          messageLength: reply.message.length,
          broadcastId: broadcast?.id ?? null,
          broadcastTriggered: broadcast !== null,
        },
      });
    } catch (error) {
      console.error('[notification-reply] Failed to write audit log:', error);
    }

    // Step 9: Return success (201 Created)
    return NextResponse.json(
      {
        success: true,
        data: {
          reply: {
            id: reply.id,
            notificationId: reply.notificationId,
            counterOfficerId: reply.counterOfficerId,
            message: reply.message,
            isDisplayBroadcast: reply.isDisplayBroadcast,
            isSecurityBroadcast: reply.isSecurityBroadcast,
            broadcastAt: reply.broadcastAt,
            createdAt: reply.createdAt,
            counterOfficer: {
              user: { name: counterOfficer.user.name },
              counter: reply.counterOfficer.counter,
            },
          },
          broadcast: broadcast
            ? {
                id: broadcast.id,
                message: broadcast.message,
                senderDisplayName: broadcast.senderDisplayName,
                displayDurationSeconds: broadcast.displayDurationSeconds,
                expiresAt: broadcast.expiresAt,
                isActive: broadcast.isActive,
                createdAt: broadcast.createdAt,
              }
            : null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof NotificationNotFoundError) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: error.message } },
        { status: 404 },
      );
    }
    if (error instanceof NotAuthorizedToReplyError) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: error.message } },
        { status: 403 },
      );
    }

    console.error('[notification-reply] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      },
      { status: 500 },
    );
  }
}

export const POST = withPermission(handlePost, PERMISSION_NOTIFICATION_REPLY);
