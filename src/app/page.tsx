import { redirect } from 'next/navigation';

/**
 * Root `/` route is handled by (dashboard)/page.tsx which provides
 * the authenticated dashboard layout (sidebar + topbar).
 * This file exists only to prevent a missing route error in case the
 * route group page is ever removed.
 */
export default function RootFallback() {
  redirect('/');
}
