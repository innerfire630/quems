// =============================================================================
// src/app/(dashboard)/_actions/logout-action.ts — Server-side logout action
// =============================================================================
// Called by forms or buttons that prefer server actions over client-side
// signOut(). Calls NextAuth's server-side signOut and redirects to /login.
// =============================================================================

'use server';

import { redirect } from 'next/navigation';
import { signOut } from '@/lib/auth';

export async function logoutAction() {
  await signOut({ redirect: false });
  redirect('/login');
}
