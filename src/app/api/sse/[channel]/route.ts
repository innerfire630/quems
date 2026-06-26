// =============================================================================
// src/app/api/sse/[channel]/route.ts — SSE route handler (3.1.1)
// =============================================================================
// GET handler that opens a Server-Sent Events stream for the requested channel.
// The channel name uses dashes in the URL (e.g. /api/sse/counter-abc123) —
// the handler converts dashes back to the colon format internally
// (e.g. 'counter:abc123').
//
// Lifecycle:
//   1. Validate channel name + check channel-level auth.
//   2. Create a ReadableStream that pushes events to the client.
//   3. Register the client with the SSE manager on stream start.
//   4. Send an initial "connected" event.
//   5. Remove the client on stream cancellation (disconnect).
//   6. Heartbeat is managed by the SSE manager, not this handler.
//
// Route config: nodejs runtime (setInterval + Prisma), force-dynamic (no cache).
// =============================================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { sseManager } from '@/lib/sse-manager';
import { authorizeSseChannel } from '@/lib/sse-auth';
import { formatSSEMessage } from '@/lib/sse-client';
import type { SSEClient, SSEEnvelope } from '@/lib/sse-client';

// ---------------------------------------------------------------------------
// Route segment config
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// GET /api/sse/[channel]
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channel: string }> },
): Promise<Response> {
  // 1. Await params (Next.js 16 pattern)
  const { channel: urlChannel } = await params;

  // 2. Convert URL dashes to colons for the internal channel format
  const channel = urlChannel.includes('-') ? urlChannel.replace(/-/, ':') : urlChannel;

  // 3. Channel-level auth
  const authResult = await authorizeSseChannel(channel, request);
  if (!authResult.authorized) {
    const reason = authResult.reason ?? 'Unknown';

    if (reason === 'Invalid channel name') {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid channel name.' } },
        { status: 400 },
      );
    }
    if (reason === 'No active session') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } },
        { status: 401 },
      );
    }
    if (reason === 'Not a security officer' || reason === 'Not assigned to counter') {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this channel.' },
        },
        { status: 403 },
      );
    }
    // Unknown pattern / other
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Unknown channel.' } },
      { status: 404 },
    );
  }

  // 4. Create the SSE stream
  let client: SSEClient | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const clientId = randomUUID();
      client = {
        id: clientId,
        channel,
        controller,
        connectedAt: new Date(),
        userId: authResult.userId ?? null,
      };

      sseManager.registerClient(channel, client);

      // Send initial "connected" event (internal event — not part of SseEventPayload)
      const connectedEnvelope: SSEEnvelope = {
        type: 'CONNECTED',
        id: randomUUID(),
        timestamp: new Date().toISOString(),
        payload: { clientId, channel },
      };
      try {
        controller.enqueue(formatSSEMessage(connectedEnvelope));
      } catch {
        // Stream already closed — nothing to do
      }
    },

    cancel() {
      if (client) {
        sseManager.removeClient(client);
      }
    },
  });

  // 5. Return the stream with SSE headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
