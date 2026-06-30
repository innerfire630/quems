// =============================================================================
// src/app/api/counters/[counterId]/officers/route.ts — Officer assignment (2.1.3+)
// =============================================================================
// GET    — list officers assigned to this counter
// POST   — assign an officer (user with COUNTER_OFFICER role) to this counter
// DELETE — unassign all officers from this counter
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { writeAuditLog } from '@/lib/audit-log';
import { withPermission } from '@/lib/guards';
import { PERMISSION_COUNTER_MANAGE } from '@/lib/permissions';

// ---------------------------------------------------------------------------
// GET /api/counters/[counterId]/officers — list assigned officers
// ---------------------------------------------------------------------------

export const GET = withPermission(
  async (_req, _ctx, context?: { params?: Promise<{ counterId: string }> }) => {
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

      const officers = await prisma.counterOfficer.findMany({
        where: { counterId },
        include: {
          user: {
            select: { id: true, name: true, email: true, status: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      const data = officers.map((o) => ({
        id: o.id,
        userId: o.userId,
        userName: o.user.name,
        userEmail: o.user.email,
        userStatus: o.user.status,
        isOnDuty: o.isOnDuty,
        currentStatus: o.currentStatus,
        notificationsEnabled: o.notificationsEnabled,
      }));

      return NextResponse.json({ success: true, data });
    } catch (error) {
      console.error('[GET /api/counters/[counterId]/officers]', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to list officers' },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_MANAGE,
);

// ---------------------------------------------------------------------------
// POST /api/counters/[counterId]/officers — assign an officer to this counter
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
      const { userId } = body as { userId: string };

      if (!userId || typeof userId !== 'string') {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: 'userId is required' } },
          { status: 422 },
        );
      }

      // Verify user exists and has COUNTER_OFFICER role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: { role: { select: { name: true } } },
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 },
        );
      }

      const hasCounterOfficerRole = user.roles.some((ur) => ur.role.name === 'COUNTER_OFFICER');
      if (!hasCounterOfficerRole) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'User must have the COUNTER_OFFICER role to be assigned to a counter.',
            },
          },
          { status: 422 },
        );
      }

      // Check if already assigned
      const existing = await prisma.counterOfficer.findUnique({
        where: { userId_counterId: { userId, counterId } },
      });

      if (existing) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'CONFLICT', message: 'Officer is already assigned to this counter.' },
          },
          { status: 409 },
        );
      }

      const assignment = await prisma.counterOfficer.create({
        data: { userId, counterId, isOnDuty: false, currentStatus: 'OFFLINE' },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Audit
      try {
        await writeAuditLog({
          action: 'OFFICER_ASSIGNED_TO_COUNTER',
          actorId: ctx.session.user.id,
          actorName: ctx.session.user.name ?? undefined,
          entity: 'CounterOfficer',
          entityId: assignment.id,
          description: `Assigned officer ${assignment.user.name} (${assignment.user.email}) to counter "${counter.name}"`,
        });
      } catch {
        /* best-effort */
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: assignment.id,
            userId: assignment.userId,
            userName: assignment.user.name,
            userEmail: assignment.user.email,
            isOnDuty: assignment.isOnDuty,
            currentStatus: assignment.currentStatus,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      console.error('[POST /api/counters/[counterId]/officers]', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to assign officer' },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_MANAGE,
);

// ---------------------------------------------------------------------------
// DELETE /api/counters/[counterId]/officers?userId=<id> — unassign an officer
// ---------------------------------------------------------------------------

export const DELETE = withPermission(
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

      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'userId query parameter is required' },
          },
          { status: 422 },
        );
      }

      const assignment = await prisma.counterOfficer.findUnique({
        where: { userId_counterId: { userId, counterId } },
        include: { user: { select: { name: true, email: true } } },
      });

      if (!assignment) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'NOT_FOUND', message: 'Officer is not assigned to this counter.' },
          },
          { status: 404 },
        );
      }

      await prisma.counterOfficer.delete({
        where: { id: assignment.id },
      });

      // Audit
      try {
        await writeAuditLog({
          action: 'OFFICER_UNASSIGNED_FROM_COUNTER',
          actorId: ctx.session.user.id,
          actorName: ctx.session.user.name ?? undefined,
          entity: 'CounterOfficer',
          entityId: assignment.id,
          description: `Unassigned officer ${assignment.user.name} (${assignment.user.email}) from counter "${counter.name}"`,
        });
      } catch {
        /* best-effort */
      }

      return NextResponse.json({ success: true, data: null });
    } catch (error) {
      console.error('[DELETE /api/counters/[counterId]/officers]', error);
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to unassign officer' },
        },
        { status: 500 },
      );
    }
  },
  PERMISSION_COUNTER_MANAGE,
);
