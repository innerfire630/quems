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
  // Wrap in try-catch: a corrupted/expired JWT causes NextAuth to throw
  // JWTSessionError instead of returning null — treat it as "no session".
  let session = null;
  try {
    session = await getServerSession();
  } catch {
    // Invalid JWT cookie — proceed as unauthenticated
  }
  if (session) {
    redirect('/');
  }

  const brand = await getSystemBrand();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-5xl overflow-hidden bg-white p-0">
        <div className="flex flex-col md:flex-row">
          {/* Hero image — banner on mobile, side panel on desktop */}
          <div className="relative h-40 w-full items-center justify-center overflow-hidden bg-zinc-900 md:h-auto md:w-[45%] md:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/login-hero.jpeg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>

          {/* Right side — login form */}
          <div className="flex w-full flex-col items-center justify-center p-6 sm:p-8 md:w-[55%] md:p-12">
            <div className="w-full max-w-sm">
              <div className="mb-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                    />
                  ) : null}
                  <h2 className="text-xl sm:text-2xl font-bold">{brand.name}</h2>
                </div>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
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
