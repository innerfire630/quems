// =============================================================================
// src/lib/sse-auth.ts — SSE channel-level authorisation helper (3.1.1)
// =============================================================================
// Single entry point for checking whether a connection on a given channel is
// allowed. Called by the SSE route handler before opening the stream.
//
// Channel rules:
//   global          — public, always authorised (no session required)
//   counter:<id>    — requires the session user to be assigned to that counter
//   everything else — rejected (defensive default)
//
// Note: The proxy.ts already excludes /api/sse/* from authentication, so
// unauthenticated requests reach this handler. Channel-level auth is the
// authoritative gate.
// =============================================================================

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChannelAuthResult {
  authorized: boolean;
  /** Reason for rejection (for logging only — never exposed to the client). */
  reason?: string;
  /** Session user ID, or null for anonymous (global) connections. */
  userId?: string | null;
}

// ---------------------------------------------------------------------------
// Channel name validation
// ---------------------------------------------------------------------------

/** Regex: lowercase letters for kind, optional colon-separated ID. */
const CHANNEL_REGEX = /^[a-z]+(:[a-zA-Z0-9_-]+)?$/;

// ---------------------------------------------------------------------------
// Authorisation
// ---------------------------------------------------------------------------

/**
 * Checks whether a request is authorised for a given SSE channel.
 *
 * @param channel — The channel name from the URL (dashes in URL are converted
 *   to colons by the route handler before calling this function).
 * @param request — The incoming NextRequest (for session resolution).
 */
export async function authorizeSseChannel(
  channel: string,
  _request: NextRequest,
): Promise<ChannelAuthResult> {
  // 1. Validate channel name format
  if (!CHANNEL_REGEX.test(channel)) {
    return { authorized: false, reason: 'Invalid channel name' };
  }

  // 2. Parse channel kind
  const colonIdx = channel.indexOf(':');
  const kind = colonIdx === -1 ? channel : channel.substring(0, colonIdx);
  const channelId = colonIdx === -1 ? null : channel.substring(colonIdx + 1);

  // 3. global — public access
  if (kind === 'global') {
    return { authorized: true, userId: null };
  }

  // 4. counter:<counterId> — requires the session user to be the assigned officer
  if (kind === 'counter') {
    if (!channelId) {
      return { authorized: false, reason: 'Missing counter ID in channel' };
    }
    const session = await auth();
    if (!session?.user) {
      return { authorized: false, reason: 'No active session' };
    }
    const userId = session.user.userId;

    // Check CounterOfficer assignment (isOnDuty NOT checked — officers may
    // want live updates even when off duty for diagnostic purposes)
    const assignment = await prisma.counterOfficer.findFirst({
      where: { userId, counterId: channelId },
      select: { id: true },
    });

    if (!assignment) {
      return { authorized: false, reason: 'Not assigned to counter' };
    }
    return { authorized: true, userId };
  }

  // 6. Unknown channel pattern — defensive default
  return { authorized: false, reason: 'Unknown channel pattern' };
}
