import { LayoutDashboard } from 'lucide-react';

export function SidebarBrand() {
  return (
    <div className="flex items-center gap-2 border-b border-border px-4 py-4">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <LayoutDashboard className="size-4" aria-hidden />
      </span>
      <span className="text-base font-semibold text-foreground">Smart Queue</span>
    </div>
  );
}
