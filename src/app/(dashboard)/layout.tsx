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
import { getServerSession } from '@/lib/auth';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardTopBar session={session} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
