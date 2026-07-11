// =============================================================================
// src/app/(auth)/layout.tsx — Auth route group layout
// =============================================================================
// Centered card layout for unauthenticated pages (login).
// Redirects already-authenticated users away from the login page.
// =============================================================================

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
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
      <Card className="w-full max-w-5xl overflow-hidden bg-white p-0">
        <div className="flex">
          {/* Left side — hero image */}
          <div className="relative hidden w-[45%] items-center justify-center overflow-hidden bg-zinc-900 md:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/login-hero.jpeg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Right side — login form */}
          <div className="flex w-full flex-col items-center justify-center p-12 md:w-[55%]">
            <div className="w-full max-w-sm">
              <div className="mb-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-12 w-12 object-contain"
                    />
                  ) : null}
                  <h2 className="text-2xl font-bold">{brand.name}</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Sign in to access the queue control panel
                </p>
              </div>
              {children}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
