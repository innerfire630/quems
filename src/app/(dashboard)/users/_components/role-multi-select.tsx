// =============================================================================
// src/app/(dashboard)/users/_components/role-multi-select.tsx — Role picker (1.3.3)
// =============================================================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';

interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

interface RoleMultiSelectProps {
  roles: RoleOption[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

export function RoleMultiSelect({ roles, value, onChange, disabled }: RoleMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggle(roleId: string) {
    if (value.includes(roleId)) {
      onChange(value.filter((id) => id !== roleId));
    } else {
      onChange([...value, roleId]);
    }
  }

  const selectedRoles = roles.filter((r) => value.includes(r.id));

  return (
    <div ref={ref} className="relative">
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="w-full justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className="flex flex-wrap gap-1">
          {selectedRoles.length === 0 ? (
            <span className="text-muted-foreground">No roles assigned</span>
          ) : (
            selectedRoles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.name}
                {role.isSystem && <span className="ml-1 text-[10px] opacity-60">(system)</span>}
              </Badge>
            ))
          )}
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
          {roles.map((role) => {
            const isSelected = value.includes(role.id);
            return (
              <button
                key={role.id}
                type="button"
                className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => toggle(role.id)}
              >
                <span
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input'
                  }`}
                >
                  {isSelected && <Check className="size-3" />}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{role.name}</span>
                    {role.isSystem && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        system
                      </Badge>
                    )}
                  </div>
                  {role.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                  )}
                </div>
              </button>
            );
          })}
          {roles.length === 0 && (
            <p className="px-2 py-3 text-sm text-muted-foreground">No roles available.</p>
          )}
        </div>
      )}
    </div>
  );
}
