'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SidebarFooter() {
  const handleStubLogout = () => {
    // Real sign-out wired up in Phase 1.2 / 1.3.
  };

  return (
    <div className="border-t border-border p-2">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-start gap-3"
        onClick={handleStubLogout}
        aria-label="Sign out"
      >
        <LogOut className="size-4" aria-hidden />
        <span>Logout</span>
      </Button>
    </div>
  );
}
