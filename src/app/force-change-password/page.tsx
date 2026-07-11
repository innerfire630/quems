// =============================================================================
// /force-change-password — Forced password change page
// =============================================================================
// Shown when mustChangePassword is true (admin reset password).
// User must set a new password before accessing the dashboard.
//
// NOTE: This page intentionally does NOT redirect on the server side when
// mustChangePassword is false. The proxy may have a stale JWT that still
// has the flag set. Instead, the client component refreshes the JWT token
// first, then redirects — breaking the redirect loop.
// =============================================================================

import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ForceChangePasswordForm } from './_components/force-change-password-form';
import { ForceChangeRedirect } from './_components/force-change-redirect';
import { getSystemBrand } from '@/lib/cached-data';
import { AuthProvider } from '@/components/layout/AuthProvider';

export const dynamic = 'force-dynamic';

export default async function ForceChangePasswordPage() {
  const session = await getServerSession();
  if (!session) redirect('/login');

  // Check the DB directly (not the JWT, which may be stale)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.userId },
    select: { mustChangePassword: true },
  });

  const brand = await getSystemBrand();

  // If password change is NOT required, render a client component that
  // refreshes the JWT token and then redirects. This prevents a redirect
  // loop where the stale JWT keeps sending the user back here.
  if (!dbUser?.mustChangePassword) {
    return (
      <AuthProvider>
        <ForceChangeRedirect />
      </AuthProvider>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          {brand.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.name ?? 'Logo'}
              className="mx-auto mb-4 h-16 w-auto"
            />
          )}
          <h1 className="text-2xl font-bold">Change Your Password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your password was reset by an administrator. Please set a new password to continue.
          </p>
        </div>
        <AuthProvider>
          <ForceChangePasswordForm />
        </AuthProvider>
      </div>
    </div>
  );
}
