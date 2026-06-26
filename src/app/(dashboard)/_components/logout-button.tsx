// =============================================================================
// src/app/(dashboard)/_components/logout-button.tsx — Client-side logout button
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isLoggingOut}
      aria-label="Sign out"
    >
      {isLoggingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      <span className="ml-2 hidden sm:inline">Sign out</span>
    </Button>
  );
}
