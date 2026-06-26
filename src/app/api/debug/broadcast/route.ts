// =============================================================================
// src/app/api/debug/broadcast/route.ts — Debug broadcast trigger (3.1.2)
// =============================================================================
// Temporary endpoint for triggering SSE events from curl/browser during
// development. Requires super-admin session + PERMISSION_SYSTEM_CONFIGURE.
// Returns 404 in production.
//
// REMOVE or restrict in Phase 5.2 (hardening).
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import type { GuardedContext } from '@/lib/guards';
import { PERMISSION_SYSTEM_CONFIGURE } from '@/lib/permissions';
import { broadcastEvent } from '@/lib/events';
import type { SseChannel, SseEventType } from '@/types/sse.types';

export const runtime = 'nodejs';

async function handler(req: Request, _ctx: GuardedContext): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Not available in production.' } },
      { status: 404 },
    );
  }

  let body: { channel?: string; eventType?: string; payload?: unknown };
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' } },
      { status: 400 },
    );
  }

  const { channel = 'global', eventType = 'TICKET_ISSUED', payload = {} } = body;

  if (!channel || !eventType) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'channel and eventType are required.' },
      },
      { status: 400 },
    );
  }

  await broadcastEvent(
    channel as SseChannel,
    eventType as SseEventType,
    payload as Record<string, unknown>,
  );

  return NextResponse.json({ success: true, data: { channel, eventType } });
}

export const POST = withPermission(handler, PERMISSION_SYSTEM_CONFIGURE);
