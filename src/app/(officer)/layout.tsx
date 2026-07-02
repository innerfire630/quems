import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { TopBar } from '@/components/layout/TopBar';

export default async function OfficerLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Fetch default display board for logo/title
  const board = await prisma.displayBoard.findFirst({
    where: { isDefault: true },
    select: { name: true, logoUrl: true },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar
        userName={session.user.name}
        userEmail={session.user.email ?? undefined}
        logoUrl={board?.logoUrl}
        title={board?.name}
        roles={(session.user.roles as string[]) ?? []}
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
