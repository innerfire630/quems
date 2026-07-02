// =============================================================================
// src/app/api/counters/route.ts — Counter list & create (2.1.2)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit-log';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_READ, PERMISSION_COUNTER_CREATE } from '@/lib/permissions';
import { createCounterSchema, listCountersQuerySchema } from '@/schemas/counter.schema';
import type { CounterListItem, CounterListMeta, OperationalStatus } from '@/types/counter.types';

// ---------------------------------------------------------------------------
// GET /api/counters — paginated, searchable list with operational status
// ---------------------------------------------------------------------------

export const GET = withPermission(async (req) => {
  try {
    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const parsed = listCountersQuerySchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const { page, limit, search, isActive } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { displayLabel: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [counters, total] = await Promise.all([
      prisma.counter.findMany({
        where,
        orderBy: { number: 'asc' },
        skip,
        take: limit,
        include: {
          services: { select: { service: { select: { id: true } } } },
          officers: {
            where: { isOnDuty: true },
            select: { currentStatus: true },
          },
        },
      }),
      prisma.counter.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    function computeStatus(officers: { currentStatus: string }[]): OperationalStatus {
      if (officers.length === 0) return 'NO_OFFICER_ON_DUTY';
      if (officers.some((o) => o.currentStatus === 'AVAILABLE' || o.currentStatus === 'SERVING'))
        return 'OPEN';
      if (officers.some((o) => o.currentStatus === 'CLOSED')) return 'CLOSED';
      if (officers.some((o) => o.currentStatus === 'OFFLINE')) return 'OFFLINE';
      return 'NO_OFFICER_ON_DUTY';
    }

    const data: CounterListItem[] = counters.map((c) => ({
      id: c.id,
      name: c.name,
      number: c.number,
      description: c.description,
      displayLabel: c.displayLabel,
      isActive: c.isActive,
      assignedServicesCount: c.services.length,
      operationalStatus: computeStatus(c.officers),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    const meta: CounterListMeta = { page, limit, total, totalPages };

    return NextResponse.json({ success: true, data, meta });
  } catch (error) {
    console.error('[GET /api/counters]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list counters' } },
      { status: 500 },
    );
  }
}, PERMISSION_COUNTER_READ);

// ---------------------------------------------------------------------------
// POST /api/counters — create a new counter
// ---------------------------------------------------------------------------

export const POST = withPermission(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = createCounterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid counter data',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const input = parsed.data;

    // Check for number conflict
    const existing = await prisma.counter.findUnique({ where: { number: input.number } });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `A counter with number #${input.number} already exists.`,
          },
        },
        { status: 409 },
      );
    }

    const counter = await prisma.counter.create({
      data: {
        name: input.name,
        number: input.number,
        description: input.description ?? null,
        displayLabel: input.displayLabel ?? null,
        isActive: input.isActive ?? true,
      },
    });

    void writeAuditLog({
      action: 'COUNTER_CREATED',
      actorId: ctx.session.user.userId,
      entity: 'Counter',
      targetUserId: counter.id,
      description: `Created counter "${counter.name}" (#${counter.number}).`,
      metadata: { name: counter.name, number: counter.number, isActive: counter.isActive },
    });

    const item: CounterListItem = {
      id: counter.id,
      name: counter.name,
      number: counter.number,
      description: counter.description,
      displayLabel: counter.displayLabel,
      isActive: counter.isActive,
      assignedServicesCount: 0,
      operationalStatus: 'NO_OFFICER_ON_DUTY',
      createdAt: counter.createdAt.toISOString(),
      updatedAt: counter.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/counters]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create counter' } },
      { status: 500 },
    );
  }
}, PERMISSION_COUNTER_CREATE);
