// =============================================================================
// src/app/api/users/[userId]/route.ts — Single-user endpoints (1.3.3)
// =============================================================================
// GET    /api/users/[userId] — get user detail
// PATCH  /api/users/[userId] — update user
// DELETE /api/users/[userId] — deactivate user (soft-delete)
// =============================================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withPermission, type GuardedContext } from '@/lib/guards';
import {
  PERMISSION_USER_READ,
  PERMISSION_USER_UPDATE,
  PERMISSION_USER_DELETE,
} from '@/lib/permissions';
import { updateUserSchema } from '@/schemas/user.schema';
import { writeAuditLog } from '@/lib/audit-log';
import type { UserDetail, UserListItem } from '@/types/user.types';

// ---------------------------------------------------------------------------
// GET /api/users/[userId]
// ---------------------------------------------------------------------------

export const GET = withPermission(
  async (
    _req: Request,
    { session: _session }: GuardedContext,
    context?: { params: Promise<{ userId: string }> },
  ): Promise<Response> => {
    const { userId } = await context!.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            id: true,
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true,
                permissions: {
                  select: {
                    permission: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      );
    }

    // Compute flat permissions list from all roles
    const permissionSet = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        permissionSet.add(rp.permission.name);
      }
    }

    const detail: UserDetail = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      permissions: Array.from(permissionSet),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: detail });
  },
  PERMISSION_USER_READ,
);

// ---------------------------------------------------------------------------
// PATCH /api/users/[userId]
// ---------------------------------------------------------------------------

export const PATCH = withPermission(
  async (
    req: Request,
    { session }: GuardedContext,
    context?: { params: Promise<{ userId: string }> },
  ): Promise<Response> => {
    const { userId } = await context!.params;

    // Fetch the user before update (for audit log diff)
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        roles: {
          select: {
            role: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' } },
        { status: 422 },
      );
    }

    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input.',
            details: parsed.error.flatten(),
          },
        },
        { status: 422 },
      );
    }

    const { name, email, status, roleId } = parsed.data;

    // Email conflict check
    if (email && email !== existingUser.email) {
      const conflict = await prisma.user.findUnique({ where: { email } });
      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'CONFLICT', message: 'A user with this email already exists.' },
          },
          { status: 409 },
        );
      }
    }

    // Determine the audit action based on status change
    let auditAction: 'USER_UPDATED' | 'USER_DEACTIVATED' | 'USER_REACTIVATED' = 'USER_UPDATED';
    if (status && status !== existingUser.status) {
      if (status === 'INACTIVE') auditAction = 'USER_DEACTIVATED';
      else if (existingUser.status === 'INACTIVE' && status === 'ACTIVE')
        auditAction = 'USER_REACTIVATED';
    }

    // Update in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(status !== undefined ? { status } : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              id: true,
              role: {
                select: { id: true, name: true, displayName: true, description: true },
              },
            },
          },
        },
      });

      // Handle role reassignment (single role)
      if (roleId !== undefined) {
        // Delete all existing role assignments
        await tx.userRole.deleteMany({ where: { userId } });
        // Create new assignment if a role is provided
        if (roleId) {
          await tx.userRole.create({
            data: {
              userId,
              roleId,
              assignedById: session.user.userId,
            },
          });
        }
      }

      return user;
    });

    // Audit log
    const rolesBefore = existingUser.roles.map((ur) => ur.role.name);

    await writeAuditLog({
      action: auditAction,
      actorId: session.user.userId,
      actorName: session.user.name,
      entity: 'User',
      targetUserId: userId,
      targetUserName: updated.name,
      description: `${auditAction === 'USER_UPDATED' ? 'Updated' : auditAction === 'USER_DEACTIVATED' ? 'Deactivated' : 'Reactivated'} user ${updated.email}.`,
      metadata: {
        email: updated.email,
        before: {
          name: existingUser.name,
          email: existingUser.email,
          status: existingUser.status,
          roles: rolesBefore,
        },
        after: { name: updated.name, email: updated.email, status: updated.status },
        rolesBefore,
        rolesAfter: roleId !== undefined ? 'changed' : rolesBefore,
      },
    });

    const result: UserListItem = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
      roles: updated.roles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
      })),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };

    return NextResponse.json({ success: true, data: result });
  },
  PERMISSION_USER_UPDATE,
);

// ---------------------------------------------------------------------------
// DELETE /api/users/[userId] — Soft-delete (deactivate)
// ---------------------------------------------------------------------------

export const DELETE = withPermission(
  async (
    _req: Request,
    { session }: GuardedContext,
    context?: { params: Promise<{ userId: string }> },
  ): Promise<Response> => {
    const { userId } = await context!.params;

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, name: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } },
        { status: 404 },
      );
    }

    if (existing.username === 'admin') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'The default admin account cannot be deactivated.' } },
        { status: 403 },
      );
    }

    if (existing.status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'User is already deactivated.' } },
        { status: 409 },
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: 'INACTIVE' },
    });

    await writeAuditLog({
      action: 'USER_DEACTIVATED',
      actorId: session.user.userId,
      actorName: session.user.name,
      entity: 'User',
      targetUserId: userId,
      targetUserName: existing.name,
      description: `Deactivated user ${existing.email}.`,
      metadata: { email: existing.email },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'User deactivated successfully.' },
    });
  },
  PERMISSION_USER_DELETE,
);
