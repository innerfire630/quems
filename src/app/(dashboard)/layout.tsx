// =============================================================================
// src/app/(dashboard)/layout.tsx — Dashboard route group layout
// =============================================================================
// Server-side session check as defence-in-depth. If no session, redirects to
// login. Renders sidebar + top bar + main content area.
// =============================================================================

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardTopBar } from '@/app/(dashboard)/_components/dashboard-top-bar';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Role-based routing: these roles should never see the admin dashboard
  const roles = (session.user.roles as string[] | undefined) ?? [];

  // Kiosk → self-service ticket issuance
  if (roles.includes('KIOSK')) {
    redirect('/kiosk');
  }

  // Security officer → broadcast & queue monitoring
  if (roles.includes('SECURITY_OFFICER')) {
    redirect('/security');
  }

  // Counter officer → assigned counter dashboard
  if (roles.includes('COUNTER_OFFICER')) {
    const officer = await prisma.counterOfficer.findFirst({
      where: { userId: session.user.userId as string },
      select: { counterId: true },
      orderBy: { counter: { number: 'asc' } },
    });
    if (officer) {
      redirect(`/counter/${officer.counterId}`);
    }
  }

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <DashboardTopBar session={session} />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
