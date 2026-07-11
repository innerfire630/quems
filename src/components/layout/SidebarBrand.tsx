import { LayoutDashboard } from 'lucide-react';

interface SidebarBrandProps {
  name?: string;
  logoUrl?: string | null;
}

export function SidebarBrand({ name = 'QUEMS', logoUrl }: SidebarBrandProps) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-zinc-700 px-3 py-3">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={name} className="size-8 shrink-0 object-contain" />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4" aria-hidden />
        </span>
      )}
      <span className="min-w-0 break-words text-xs font-semibold text-white leading-snug">
        {name}
      </span>
    </div>
  );
}
