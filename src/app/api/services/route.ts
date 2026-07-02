// =============================================================================
// src/app/api/services/route.ts — Service list & create (2.1.1)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit-log';
import { withPermission } from '@/lib/guards';
import { PERMISSION_SERVICE_READ, PERMISSION_SERVICE_CREATE } from '@/lib/permissions';
import { createServiceSchema, listServicesQuerySchema } from '@/schemas/service.schema';
import type { ServiceListItem, ServiceListMeta } from '@/types/service.types';

// ---------------------------------------------------------------------------
// GET /api/services — paginated, searchable, filterable list
// ---------------------------------------------------------------------------

export const GET = withPermission(async (req) => {
  try {
    const url = new URL(req.url);
    const rawParams = Object.fromEntries(url.searchParams.entries());
    const parsed = listServicesQuerySchema.safeParse(rawParams);

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
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.service.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const data: ServiceListItem[] = services.map((s) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      ticketPrefix: s.ticketPrefix,
      description: s.description,
      iconName: s.iconName,
      color: s.color,
      isActive: s.isActive,
      currentTicketNumber: s.currentTicketNumber,
      averageServiceTime: s.averageServiceTime,
      sortOrder: s.sortOrder,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const meta: ServiceListMeta = { page, limit, total, totalPages };

    return NextResponse.json({ success: true, data, meta });
  } catch (error) {
    console.error('[GET /api/services]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list services' } },
      { status: 500 },
    );
  }
}, PERMISSION_SERVICE_READ);

// ---------------------------------------------------------------------------
// POST /api/services — create a new service
// ---------------------------------------------------------------------------

export const POST = withPermission(async (req, ctx) => {
  try {
    const body = await req.json();
    const parsed = createServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid service data',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const input = parsed.data;

    // Check for code or ticketPrefix conflicts
    const [existingCode, existingPrefix] = await Promise.all([
      prisma.service.findUnique({ where: { code: input.code } }),
      prisma.service.findUnique({ where: { ticketPrefix: input.ticketPrefix } }),
    ]);

    if (existingCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `A service with code "${input.code}" already exists.`,
          },
        },
        { status: 409 },
      );
    }
    if (existingPrefix) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT',
            message: `A service with ticket prefix "${input.ticketPrefix}" already exists.`,
          },
        },
        { status: 409 },
      );
    }

    const service = await prisma.service.create({
      data: {
        name: input.name,
        code: input.code,
        ticketPrefix: input.ticketPrefix,
        description: input.description ?? null,
        iconName: input.iconName ?? null,
        color: input.color ?? null,
        isActive: input.isActive ?? true,
        currentTicketNumber: input.currentTicketNumber ?? 0,
        averageServiceTime: input.averageServiceTime ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
    });

    void writeAuditLog({
      action: 'SERVICE_CREATED',
      actorId: ctx.session.user.userId,
      entity: 'Service',
      targetUserId: service.id,
      description: `Created service "${service.name}" (${service.code}).`,
      metadata: {
        name: service.name,
        code: service.code,
        ticketPrefix: service.ticketPrefix,
        isActive: service.isActive,
      },
    });

    const data: ServiceListItem = {
      id: service.id,
      name: service.name,
      code: service.code,
      ticketPrefix: service.ticketPrefix,
      description: service.description,
      iconName: service.iconName,
      color: service.color,
      isActive: service.isActive,
      currentTicketNumber: service.currentTicketNumber,
      averageServiceTime: service.averageServiceTime,
      sortOrder: service.sortOrder,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/services]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create service' } },
      { status: 500 },
    );
  }
}, PERMISSION_SERVICE_CREATE);
