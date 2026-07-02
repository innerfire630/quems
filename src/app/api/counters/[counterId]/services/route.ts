// =============================================================================
// src/app/api/counters/[counterId]/services/route.ts — List & assign (2.1.3)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit-log';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_READ, PERMISSION_COUNTER_MANAGE } from '@/lib/permissions';
import { assignServiceSchema } from '@/schemas/counter-service.schema';

// ---------------------------------------------------------------------------
// GET /api/counters/[counterId]/services — list assigned services
// ---------------------------------------------------------------------------

export const GET = withPermission(
  async (req, ctx, context?: { params?: Promise<{ counterId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { counterId: '' };
      const counterId = params.counterId;

      const counter = await prisma.counter.findUnique({ where: { id: counterId } });
      if (!counter) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Counter not found' } },
          { status: 404 },
        );
      }

      const assignments = await prisma.counterService.findMany({
        where: { counterId },
        include: {
          service: {
            select: { id: true, name: true, code: true, ticketPrefix: true, isActive: true },
          },
        },
      });

      const data = assignments.map((a) => ({
        id: a.id,
        serviceId: a.serviceId,
        service: a.service,
      }));

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[GET /api/counters/[counterId]/services]', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to list assigned services' },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_READ,
);

// ---------------------------------------------------------------------------
// POST /api/counters/[counterId]/services — assign a service
// ---------------------------------------------------------------------------

export const POST = withPermission(
  async (req, ctx, context?: { params?: Promise<{ counterId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { counterId: '' };
      const counterId = params.counterId;

      const counter = await prisma.counter.findUnique({ where: { id: counterId } });
      if (!counter) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Counter not found' } },
          { status: 404 },
        );
      }

      const body = await req.json();
      const parsed = assignServiceSchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request',
              details: parsed.error.flatten(),
            },
          },
          { status: 422 },
        );
      }

      const { serviceId } = parsed.data;

      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Service not found' } },
          { status: 404 },
        );
      }

      // Check for duplicate
      const existing = await prisma.counterService.findUnique({
        where: { counterId_serviceId: { counterId, serviceId } },
      });
      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'CONFLICT', message: 'Service is already assigned to this counter.' },
          },
          { status: 409 },
        );
      }

      const assignment = await prisma.counterService.create({
        data: { counterId, serviceId },
        include: {
          service: {
            select: { id: true, name: true, code: true, ticketPrefix: true, isActive: true },
          },
        },
      });

      void writeAuditLog({
        action: 'SERVICE_ASSIGNED_TO_COUNTER',
        actorId: ctx.session.user.userId,
        entity: 'Counter',
        targetUserId: counterId,
        description: `Assigned service "${service.name}" to counter "${counter.name}".`,
        metadata: { counterId, counterName: counter.name, serviceId, serviceName: service.name },
      });

      const data = {
        id: assignment.id,
        serviceId: assignment.serviceId,
        service: assignment.service,
      };

      return NextResponse.json({ success: true, data }, { status: 201 });
    } catch (error) {
      console.error('[POST /api/counters/[counterId]/services]', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to assign service' } },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_MANAGE,
);
