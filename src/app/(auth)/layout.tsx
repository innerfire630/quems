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

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // If already authenticated, redirect to dashboard
  const session = await getServerSession();
  if (session) {
    redirect('/');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Smart Queue Management System</CardTitle>
          <CardDescription>Sign in to access the queue control panel</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
