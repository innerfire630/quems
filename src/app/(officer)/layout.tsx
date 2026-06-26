import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma as db } from '@/lib/db';
import { OfficerSidebar } from '@/components/layout/OfficerSidebar';
import { TopBar } from '@/components/layout/TopBar';

export default async function OfficerLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  // Find primary counter for the dashboard link
  let primaryCounterId: string | null = null;
  try {
    const primaryOfficer = await db.counterOfficer.findFirst({
      where: { userId: session.user.userId as string },
      orderBy: { counter: { number: 'asc' } },
      select: { counterId: true },
    });
    primaryCounterId = primaryOfficer?.counterId ?? null;
  } catch {
    // Best-effort
  }

  return (
    <div className="flex min-h-screen bg-background">
      <OfficerSidebar
        userName={session.user.name}
        userEmail={session.user.email ?? undefined}
        primaryCounterId={primaryCounterId}
      />
      <div className="flex flex-1 flex-col">
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
