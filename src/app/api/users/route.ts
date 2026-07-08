// =============================================================================
// src/app/api/users/route.ts — User list & create endpoints (1.3.3)
// =============================================================================
// GET  /api/users — list users (paginated, searchable)
// POST /api/users — create a new user with role assignment
// =============================================================================

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { withPermission, type GuardedContext } from '@/lib/guards';
import { PERMISSION_USER_READ, PERMISSION_USER_CREATE } from '@/lib/permissions';
import { createUserSchema, listUsersQuerySchema } from '@/schemas/user.schema';
import { writeAuditLog } from '@/lib/audit-log';
import type { UserListItem } from '@/types/user.types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapUserToListRow(user: {
  id: string;
  username: string;
  name: string;
  email: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  roles: {
    id: string;
    role: { id: string; name: string; displayName: string; description: string | null };
  }[];
}): UserListItem {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email,
    status: user.status,
    roles: user.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// GET /api/users — List users
// ---------------------------------------------------------------------------

const getHandler = withPermission(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const parsed = listUsersQuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters.',
          details: parsed.error.flatten(),
        },
      },
      { status: 422 },
    );
  }

  const { page, limit, search } = parsed.data;
  const skip = (page - 1) * limit;

  const where = search
    ? { OR: [{ name: { contains: search } }, { username: { contains: search } }, { email: { contains: search } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
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
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: users.map(mapUserToListRow),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}, PERMISSION_USER_READ);

// ---------------------------------------------------------------------------
// POST /api/users — Create user
// ---------------------------------------------------------------------------

const postHandler = withPermission(
  async (req: Request, { session }: GuardedContext): Promise<Response> => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body.' } },
        { status: 422 },
      );
    }

    const parsed = createUserSchema.safeParse(body);
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

    const { username, name, email, password, status, roleId } = parsed.data;

    // Check for duplicate username
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'CONFLICT', message: 'A user with this username already exists.' },
        },
        { status: 409 },
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with role in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          name,
          email: email || null,
          password: hashedPassword,
          status: status ?? 'ACTIVE',
        },
        select: {
          id: true,
          username: true,
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

      // Assign single role
      if (roleId) {
        await tx.userRole.create({
          data: {
            userId: created.id,
            roleId,
            assignedById: session.user.userId,
          },
        });
      }

      return created;
    });

    // Audit log
    await writeAuditLog({
      action: 'USER_CREATED',
      actorId: session.user.userId,
      actorName: session.user.name,
      entity: 'User',
      targetUserId: user.id,
      targetUserName: user.name,
      description: `Created user ${username}.`,
      metadata: { username, email: email || null, name, roleId: roleId ?? null, status: status ?? 'ACTIVE' },
    });

    // Re-fetch with roles for the response
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
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

    return NextResponse.json(
      { success: true, data: mapUserToListRow(userWithRoles!) },
      { status: 201 },
    );
  },
  PERMISSION_USER_CREATE,
);

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export const GET = getHandler;
export const POST = postHandler;
