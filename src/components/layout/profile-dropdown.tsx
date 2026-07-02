'use client';

// =============================================================================
// ProfileDropdown — user avatar with dropdown for profile info & password change
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, Lock, Loader2, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChangePasswordDialog } from '@/app/(dashboard)/_components/change-password-dialog';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface ProfileDropdownProps {
  userName: string;
  userEmail?: string;
  roles?: string[];
}

export function ProfileDropdown({ userName, userEmail, roles }: ProfileDropdownProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex items-center gap-2 rounded-md p-1 hover:bg-accent transition-colors outline-none"
          aria-label="User menu"
        >
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {getInitials(userName)}
          </div>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" sideOffset={8} className="w-64">
          {/* Profile info */}
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <div className="flex items-center gap-3 py-1">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {getInitials(userName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{userName}</p>
                  {userEmail && (
                    <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                  )}
                </div>
              </div>
              {roles && roles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-[10px] font-normal">
                      {role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </Badge>
                  ))}
                </div>
              )}
            </DropdownMenuLabel>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* Change Password */}
          <DropdownMenuItem onClick={() => setChangePasswordOpen(true)}>
            <Lock className="mr-2 size-4" />
            Change Password
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Sign out */}
          <DropdownMenuItem variant="destructive" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <LogOut className="mr-2 size-4" />
            )}
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </>
  );
}
