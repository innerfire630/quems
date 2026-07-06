import { LayoutDashboard } from 'lucide-react';

interface SidebarBrandProps {
  name?: string;
  logoUrl?: string | null;
}

export function SidebarBrand({ name = 'QUEMS', logoUrl }: SidebarBrandProps) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-zinc-700 px-4 py-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          className="size-8 shrink-0 object-contain"
        />
      ) : (
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4" aria-hidden />
        </span>
      )}
      <span className="text-base font-semibold text-white truncate">{name}</span>
    </div>
  );
}
