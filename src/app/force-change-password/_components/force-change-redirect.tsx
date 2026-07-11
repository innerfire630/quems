'use client';

// =============================================================================
// ForceChangeRedirect — Breaks the stale-JWT redirect loop
// =============================================================================
// When mustChangePassword is false in the DB but the JWT still has it as true,
// this component refreshes the JWT token (via session.update()) and then
// redirects to the dashboard. Rendered from the server page when DB says false.
// =============================================================================

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export function ForceChangeRedirect() {
  const { update } = useSession();

  useEffect(() => {
    async function refreshAndRedirect() {
      // Refresh the JWT so mustChangePassword is re-read from DB
      await update();
      // Now redirect to dashboard — the proxy will see the updated JWT
      window.location.href = '/';
    }
    refreshAndRedirect();
  }, [update]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Updating session…</p>
      </div>
    </div>
  );
}
