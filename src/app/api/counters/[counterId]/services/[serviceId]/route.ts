// =============================================================================
// src/app/api/counters/[counterId]/services/[serviceId]/route.ts — Unassign (2.1.3)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit-log';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_MANAGE } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// DELETE /api/counters/[counterId]/services/[serviceId] — unassign
// ---------------------------------------------------------------------------

export const DELETE = withPermission(
  async (req, ctx, context?: { params?: Promise<{ counterId: string; serviceId: string }> }) => {
    try {
      const params = context?.params ? await context.params : { counterId: '', serviceId: '' };
      const { counterId, serviceId } = params;

      const counter = await prisma.counter.findUnique({ where: { id: counterId } });
      if (!counter) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Counter not found' } },
          { status: 404 },
        );
      }

      // Verify assignment exists
      const existing = await prisma.counterService.findUnique({
        where: { counterId_serviceId: { counterId, serviceId } },
      });
      if (!existing) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Service is not assigned to this counter.' },
          },
          { status: 404 },
        );
      }

      // Enforce "at least one service per counter" rule
      const count = await prisma.counterService.count({ where: { counterId } });
      if (count <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message:
                'Cannot remove the last service from a counter. A counter must have at least one assigned service.',
            },
          },
          { status: 422 },
        );
      }

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: { name: true },
      });

      await prisma.counterService.delete({
        where: { counterId_serviceId: { counterId, serviceId } },
      });

      void writeAuditLog({
        action: 'SERVICE_UNASSIGNED_FROM_COUNTER',
        actorId: ctx.session.user.userId,
        entity: 'Counter',
        targetUserId: counterId,
        description: `Removed service "${service?.name ?? serviceId}" from counter "${counter.name}".`,
        metadata: {
          counterId,
          counterName: counter.name,
          serviceId,
          serviceName: service?.name ?? 'Unknown',
        },
      });

      return NextResponse.json({ success: true, data: { message: 'Service unassigned.' } });
    } catch (error) {
      console.error('[DELETE /api/counters/[counterId]/services/[serviceId]]', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to unassign service' },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_MANAGE,
);
