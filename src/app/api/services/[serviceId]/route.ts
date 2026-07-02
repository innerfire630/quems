// =============================================================================
// src/app/api/services/[serviceId]/route.ts — Service get/update/deactivate (2.1.1)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit-log';
import { withPermission } from '@/lib/guards';
import {
  PERMISSION_SERVICE_READ,
  PERMISSION_SERVICE_UPDATE,
  PERMISSION_SERVICE_DELETE,
} from '@/lib/permissions';
import { updateServiceSchema } from '@/schemas/service.schema';
import type { ServiceListItem, ServiceDetail } from '@/types/service.types';

function mapToServiceListItem(s: {
  id: string;
  name: string;
  code: string;
  ticketPrefix: string;
  description: string | null;
  iconName: string | null;
  color: string | null;
  isActive: boolean;
  currentTicketNumber: number;
  averageServiceTime: number | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): ServiceListItem {
  return {
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
  };
}

// ---------------------------------------------------------------------------
// GET /api/services/[serviceId] — detail with assigned counters
// ---------------------------------------------------------------------------

export const GET = withPermission(
  async (req, ctx, context?: { params?: Promise<{ serviceId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { serviceId: '' };
      const serviceId = params.serviceId;

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        include: {
          counters: {
            include: {
              counter: true,
            },
          },
        },
      });

      if (!service) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Service not found' } },
          { status: 404 },
        );
      }

      const data: ServiceDetail = {
        ...mapToServiceListItem(service),
        counters: service.counters.map((cs) => ({
          id: cs.counter.id,
          name: cs.counter.name,
          number: cs.counter.number,
          displayLabel: cs.counter.displayLabel,
          isActive: cs.counter.isActive,
        })),
      };

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[GET /api/services/[serviceId]]', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch service' } },
        { status: 500 },
      );
    }
  },
  PERMISSION_SERVICE_READ,
);

// ---------------------------------------------------------------------------
// PATCH /api/services/[serviceId] — update
// ---------------------------------------------------------------------------

export const PATCH = withPermission(
  async (req, ctx, context?: { params?: Promise<{ serviceId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { serviceId: '' };
      const serviceId = params.serviceId;

      const existing = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Service not found' } },
          { status: 404 },
        );
      }

      const body = await req.json();
      const parsed = updateServiceSchema.safeParse(body);

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

      // Check for code/ticketPrefix conflicts if they're being changed
      if (input.code && input.code !== existing.code) {
        const conflict = await prisma.service.findUnique({ where: { code: input.code } });
        if (conflict) {
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
      }
      if (input.ticketPrefix && input.ticketPrefix !== existing.ticketPrefix) {
        const conflict = await prisma.service.findUnique({
          where: { ticketPrefix: input.ticketPrefix },
        });
        if (conflict) {
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
      }

      const before = mapToServiceListItem(existing);
      const wasActive = existing.isActive;

      const service = await prisma.service.update({
        where: { id: serviceId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.code !== undefined && { code: input.code }),
          ...(input.ticketPrefix !== undefined && { ticketPrefix: input.ticketPrefix }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.iconName !== undefined && { iconName: input.iconName }),
          ...(input.color !== undefined && { color: input.color }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
          ...(input.currentTicketNumber !== undefined && {
            currentTicketNumber: input.currentTicketNumber,
          }),
          ...(input.averageServiceTime !== undefined && {
            averageServiceTime: input.averageServiceTime,
          }),
          ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
        },
      });

      const after = mapToServiceListItem(service);

      // Audit log — differentiate deactivation from general update
      if (wasActive && !service.isActive) {
        void writeAuditLog({
          action: 'SERVICE_DEACTIVATED',
          actorId: ctx.session.user.userId,
          entity: 'Service',
          targetUserId: serviceId,
          description: `Deactivated service "${service.name}" (${service.code}).`,
          metadata: { name: service.name, code: service.code },
        });
      } else {
        void writeAuditLog({
          action: 'SERVICE_UPDATED',
          actorId: ctx.session.user.userId,
          entity: 'Service',
          targetUserId: serviceId,
          description: `Updated service "${service.name}".`,
          metadata: { before, after },
        });
      }

      return NextResponse.json({ success: true, data: after });
    } catch (error) {
      console.error('[PATCH /api/services/[serviceId]]', error);
      return NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update service' } },
        { status: 500 },
      );
    }
  },
  PERMISSION_SERVICE_UPDATE,
);

// ---------------------------------------------------------------------------
// DELETE /api/services/[serviceId] — soft-delete (deactivate)
// ---------------------------------------------------------------------------

export const DELETE = withPermission(
  async (req, ctx, context?: { params?: Promise<{ serviceId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { serviceId: '' };
      const serviceId = params.serviceId;

      const existing = await prisma.service.findUnique({ where: { id: serviceId } });
      if (!existing) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Service not found' } },
          { status: 404 },
        );
      }

      // Defensive: check for tickets referencing this service
      const ticketCount = await prisma.ticket.count({ where: { serviceId } });
      if (ticketCount > 0) {
        console.warn(
          `[DELETE /api/services/${serviceId}] Soft-deleting service "${existing.name}" with ${ticketCount} existing tickets.`,
        );
      }

      await prisma.service.update({
        where: { id: serviceId },
        data: { isActive: false },
      });

      void writeAuditLog({
        action: 'SERVICE_DEACTIVATED',
        actorId: ctx.session.user.userId,
        entity: 'Service',
        targetUserId: serviceId,
        description: `Deactivated service "${existing.name}" (${existing.code}).`,
        metadata: { name: existing.name, code: existing.code },
      });

      return NextResponse.json({ success: true, data: { message: 'Service deactivated.' } });
    } catch (error) {
      console.error('[DELETE /api/services/[serviceId]]', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to deactivate service' },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_SERVICE_DELETE,
);
