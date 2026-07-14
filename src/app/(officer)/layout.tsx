import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { OfficerMobileShell } from '@/components/layout/OfficerMobileShell';
import { getSystemBrand } from '@/lib/cached-data';
import { prisma } from '@/lib/db';

export default async function OfficerLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const brand = await getSystemBrand();

  // Find the officer's primary counter for sidebar navigation
  const officer = await prisma.counterOfficer.findFirst({
    where: { userId: session.user.userId },
    select: { counterId: true },
    orderBy: { createdAt: 'asc' },
  });

  return (
    <OfficerMobileShell
      brandName={brand.name}
      brandLogo={brand.logoUrl}
      primaryCounterId={officer?.counterId ?? null}
      userName={session.user.name}
      userEmail={session.user.email ?? undefined}
      roles={(session.user.roles as string[]) ?? []}
    >
      {children}
    </OfficerMobileShell>
  );
}
