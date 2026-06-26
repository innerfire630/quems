// =============================================================================
// src/app/(dashboard)/users/[userId]/page.tsx — Edit user page (1.3.3)
// =============================================================================

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import { UserForm } from '@/app/(dashboard)/users/_components/user-form';

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function EditUserPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.user.permissions.includes('user:update')) {
    redirect('/?error=forbidden');
  }

  const { userId } = await params;

  const [user, allRoles] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        roles: {
          select: {
            role: { select: { id: true } },
          },
        },
      },
    }),
    prisma.role.findMany({
      select: { id: true, name: true, displayName: true, description: true, isSystem: true },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const initialValues = {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status as string,
    roleIds: user.roles.map((ur) => ur.role.id),
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link
          href="/users"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit User</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>
      <UserForm mode="edit" initialValues={initialValues} userId={userId} roles={allRoles} />
    </div>
  );
}
