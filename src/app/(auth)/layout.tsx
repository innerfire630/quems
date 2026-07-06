// =============================================================================
// src/app/(auth)/layout.tsx — Auth route group layout
// =============================================================================
// Centered card layout for unauthenticated pages (login).
// Redirects already-authenticated users away from the login page.
// =============================================================================

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerSession } from '@/lib/auth';
import { getSystemBrand } from '@/lib/cached-data';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // If already authenticated, redirect to dashboard
  const session = await getServerSession();
  if (session) {
    redirect('/');
  }

  const brand = await getSystemBrand();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center gap-2">
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-12 w-12 object-contain"
              />
            ) : null}
            <CardTitle className="text-2xl font-bold">{brand.name}</CardTitle>
          </div>
          <CardDescription>Sign in to access the queue control panel</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
