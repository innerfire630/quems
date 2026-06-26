// =============================================================================
// src/app/security/page.tsx — Security officer screen (4.3.3)
// =============================================================================

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import {
  getSecurityDashboardData,
  UnauthorizedSecurityAccessError,
} from '@/lib/security-dashboard';
import { SecurityScreenClient } from '@/components/security/security-screen-client';

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SecurityPage() {
  // Step 1: Authentication
  const session = await auth();
  if (!session?.user?.userId) {
    redirect('/login');
  }

  // Step 2: Role check
  const userRoles: string[] = (session.user as { roles?: string[] }).roles ?? [];
  if (!userRoles.includes('SECURITY_OFFICER')) {
    redirect('/?error=forbidden');
  }

  // Step 3: Load initial data
  let initialData;
  try {
    initialData = await getSecurityDashboardData(session.user.userId, userRoles);
  } catch (error) {
    if (error instanceof UnauthorizedSecurityAccessError) {
      redirect('/?error=forbidden');
    }
    console.error('[security-page] Failed to load initial data:', error);
    // Fallback: render with minimal data
    initialData = {
      user: {
        id: session.user.userId,
        name: (session.user as { name?: string }).name ?? null,
        email: (session.user as { email?: string }).email ?? null,
      },
      recentBroadcasts: [],
      initialReadBroadcastIds: [],
    };
  }

  // Step 4: Render client component
  return <SecurityScreenClient initialData={initialData} />;
}
