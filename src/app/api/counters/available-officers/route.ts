// =============================================================================
// src/app/api/counters/available-officers/route.ts — List COUNTER_OFFICER users
// =============================================================================
// GET /api/counters/available-officers — returns all users with COUNTER_OFFICER
// role that can be assigned to counters.
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_MANAGE } from '@/lib/permissions';

export const runtime = 'nodejs';

export const GET = withPermission(async () => {
  try {
    // Get IDs of users already assigned to a counter
    const assignedOfficers = await prisma.counterOfficer.findMany({
      select: { userId: true },
    });
    const assignedUserIds = new Set(assignedOfficers.map((o) => o.userId));

    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        roles: {
          some: {
            role: { name: 'COUNTER_OFFICER' },
          },
        },
        id: { notIn: Array.from(assignedUserIds) },
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('[GET /api/counters/available-officers]', error);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch available officers' },
      },
      { status: 500 },
    );
  }
}, PERMISSION_COUNTER_MANAGE);
