// =============================================================================
// src/app/(dashboard)/users/page.tsx — User listing page (1.3.3)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { Can } from '@/components/can';
import { PERMISSION_USER_CREATE } from '@/lib/permissions';
import { UserPlus } from 'lucide-react';
import { UserTableClient } from './_components/user-table-client';
import { UserSearchBar } from './_components/user-search-bar';
import { PageHeader } from '@/components/layout/page-header';

interface UsersPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Server-side defence-in-depth permission check
  const hasAccess = session.user.permissions.includes('user:read');
  if (!hasAccess) {
    redirect('/?error=forbidden');
  }

  const params = await searchParams;
  const search = params.search ?? '';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = search
    ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
    : {};

  const [users, total, allRoles] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    }),
    prisma.user.count({ where }),
    prisma.role.findMany({
      select: { id: true, name: true, displayName: true, description: true, isSystem: true },
    }),
  ]);

  const mappedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    roles: u.roles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      description: ur.role.description,
    })),
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title="User Management" description={`${total} user${total !== 1 ? 's' : ''} total`}>
        <Can permission={PERMISSION_USER_CREATE}>
          <Link
            href="/users/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="size-4" />
            Create User
          </Link>
        </Can>
      </PageHeader>

      {/* Search */}
      <UserSearchBar defaultValue={search} />

      {/* Table */}
      <UserTableClient users={mappedUsers} roles={allRoles} />
    </div>
  );
}
