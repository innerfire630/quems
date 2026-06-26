import { redirect } from 'next/navigation';

/**
 * Root `/` route redirects to the dashboard overview.
 * The proxy.ts already handles auth gating for unauthenticated users
 * (redirects to /login). This page is only reached by authenticated users.
 */
export default function RootFallback() {
  redirect('/overview');
}
