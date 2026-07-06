import type { ReactNode } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { TopBar } from '@/components/layout/TopBar';
import { getSystemBrand } from '@/lib/cached-data';

export default async function OfficerLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }

  const brand = await getSystemBrand();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopBar
        userName={session.user.name}
        userEmail={session.user.email ?? undefined}
        logoUrl={brand.logoUrl}
        title={brand.name}
        roles={(session.user.roles as string[]) ?? []}
        variant="dark"
      />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
