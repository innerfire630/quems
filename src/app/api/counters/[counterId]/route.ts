// =============================================================================
// src/app/api/counters/[counterId]/route.ts — Counter get/update/deactivate (2.1.2)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit-log';
import { withPermission } from '@/lib/guards';
import {
  PERMISSION_COUNTER_READ,
  PERMISSION_COUNTER_UPDATE,
  PERMISSION_COUNTER_DELETE,
} from '@/lib/permissions';
import { updateCounterSchema } from '@/schemas/counter.schema';
import type { CounterListItem, CounterDetail, OperationalStatus } from '@/types/counter.types';

function mapToCounterListItem(c: {
  id: string;
  name: string;
  number: number;
  description: string | null;
  displayLabel: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  services?: { service: { id: string } }[];
  officers?: { currentStatus: string }[];
}): CounterListItem {
  const services = c.services ?? [];
  const officers = c.officers ?? [];
  let status: OperationalStatus = 'NO_OFFICER_ON_DUTY';
  if (officers.length > 0) {
    if (officers.some((o) => o.currentStatus === 'AVAILABLE' || o.currentStatus === 'SERVING'))
      status = 'OPEN';
    else if (officers.some((o) => o.currentStatus === 'CLOSED')) status = 'CLOSED';
    else if (officers.some((o) => o.currentStatus === 'OFFLINE')) status = 'OFFLINE';
  }

  return {
    id: c.id,
    name: c.name,
    number: c.number,
    description: c.description,
    displayLabel: c.displayLabel,
    isActive: c.isActive,
    assignedServicesCount: services.length,
    operationalStatus: status,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// GET /api/counters/[counterId] — detail with assigned services
// ---------------------------------------------------------------------------

export const GET = withPermission(
  async (req, ctx, context?: { params?: Promise<{ counterId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { counterId: '' };
      const counterId = params.counterId;

      const counter = await prisma.counter.findUnique({
        where: { id: counterId },
        include: {
          services: {
            include: {
              service: {
                select: { id: true, name: true, code: true, ticketPrefix: true, isActive: true },
              },
            },
          },
          officers: {
            where: { isOnDuty: true },
            select: { currentStatus: true },
          },
        },
      });

      if (!counter) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Counter not found' } },
          { status: 404 },
        );
      }

      const base = mapToCounterListItem(counter);
      const data: CounterDetail = {
        ...base,
        services: counter.services.map((cs) => cs.service),
      };

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[GET /api/counters/[counterId]]', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch counter' } },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_READ,
);

// ---------------------------------------------------------------------------
// PATCH /api/counters/[counterId] — update
// ---------------------------------------------------------------------------

export const PATCH = withPermission(
  async (req, ctx, context?: { params?: Promise<{ counterId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { counterId: '' };
      const counterId = params.counterId;

      const existing = await prisma.counter.findUnique({
        where: { id: counterId },
        include: { services: { select: { service: { select: { id: true } } } } },
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Counter not found' } },
          { status: 404 },
        );
      }

      const body = await req.json();
      const parsed = updateCounterSchema.safeParse(body);

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

      // Check for number conflict if being changed (only active counters)
      if (input.number !== undefined && input.number !== existing.number) {
        const conflict = await prisma.counter.findFirst({
          where: { number: input.number, isActive: true },
        });
        if (conflict) {
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
      }

      const wasActive = existing.isActive;
      const before = mapToCounterListItem(existing);

      const counter = await prisma.counter.update({
        where: { id: counterId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.number !== undefined && { number: input.number }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.displayLabel !== undefined && { displayLabel: input.displayLabel }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
        include: { services: { select: { service: { select: { id: true } } } } },
      });

      const after = mapToCounterListItem(counter);

      if (wasActive && !counter.isActive) {
        void writeAuditLog({
          action: 'COUNTER_DEACTIVATED',
          actorId: ctx.session.user.userId,
          entity: 'Counter',
          targetUserId: counterId,
          description: `Deactivated counter "${counter.name}" (#${counter.number}).`,
          metadata: { name: counter.name, number: counter.number },
        });
      } else {
        void writeAuditLog({
          action: 'COUNTER_UPDATED',
          actorId: ctx.session.user.userId,
          entity: 'Counter',
          targetUserId: counterId,
          description: `Updated counter "${counter.name}".`,
          metadata: { before, after },
        });
      }

      return NextResponse.json({ success: true, data: after });
    } catch (error) {
      console.error('[PATCH /api/counters/[counterId]]', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update counter' } },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_UPDATE,
);

// ---------------------------------------------------------------------------
// DELETE /api/counters/[counterId] — soft-delete (deactivate)
// ---------------------------------------------------------------------------

export const DELETE = withPermission(
  async (req, ctx, context?: { params?: Promise<{ counterId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { counterId: '' };
      const counterId = params.counterId;

      const existing = await prisma.counter.findUnique({ where: { id: counterId } });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Counter not found' } },
          { status: 404 },
        );
      }

      // Hard delete — cascade removes CounterService, CounterOfficer, CounterStatusEvent.
      // Ticket.counterId is set to null (optional relation).
      await prisma.counter.delete({ where: { id: counterId } });

      void writeAuditLog({
        action: 'COUNTER_DEACTIVATED',
        actorId: ctx.session.user.userId,
        targetUserId: counterId,
        description: `Deleted counter "${existing.name}" (#${existing.number}).`,
        metadata: { name: existing.name, number: existing.number },
      });

      return NextResponse.json({ success: true, data: { message: 'Counter deleted.' } });
    } catch (error) {
      console.error('[DELETE /api/counters/[counterId]]', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to delete counter' },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_DELETE,
);
