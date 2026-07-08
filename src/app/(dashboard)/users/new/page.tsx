// =============================================================================
// src/app/(dashboard)/users/new/page.tsx — Create user page (1.3.3)
// =============================================================================

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { UserForm } from '@/app/(dashboard)/users/_components/user-form';

export const dynamic = 'force-dynamic';

export default async function NewUserPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  if (!session.user.permissions.includes('user:create')) {
    redirect('/?error=forbidden');
  }

  const roles = await prisma.role.findMany({
    where: {},
    select: { id: true, name: true, displayName: true, description: true, isSystem: true },
  });

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <Link
          href="/users"
          className="inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <PageHeader title="Create User Form" />
      </div>
      <UserForm mode="create" roles={roles} />
    </div>
  );
}
