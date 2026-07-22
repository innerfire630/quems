// =============================================================================
// src/app/(dashboard)/layout.tsx — Dashboard route group layout
// =============================================================================
// Server-side session check as defence-in-depth. If no session, redirects to
// login. Renders sidebar + top bar + main content area.
// =============================================================================

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { MobileShell } from '@/components/layout/mobile-shell';
import { AuthProvider } from '@/components/layout/AuthProvider';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getSystemBrand } from '@/lib/cached-data';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Wrap in try-catch: a corrupted/expired JWT causes NextAuth to throw
  // JWTSessionError instead of returning null — treat as unauthenticated.
  let session = null;
  try {
    session = await getServerSession();
  } catch {
    // Invalid JWT cookie — redirect to login
  }

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
      <MobileShell brandName={brand.name} brandLogo={brand.logoUrl} session={session}>
        {children}
      </MobileShell>
    </AuthProvider>
  );
}
