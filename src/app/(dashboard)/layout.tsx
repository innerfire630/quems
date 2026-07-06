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
import { getSystemBrand } from '@/lib/cached-data';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  // Role-based routing: these roles should never see the admin dashboard
  const roles = (session.user.roles as string[] | undefined) ?? [];

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

  const brand = await getSystemBrand();

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar brandName={brand.name} brandLogo={brand.logoUrl} />
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardTopBar session={session} />
          <main className="flex-1 p-4 sm:p-6 min-w-0">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
