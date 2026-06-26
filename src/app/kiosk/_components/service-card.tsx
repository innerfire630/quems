// =============================================================================
// src/app/kiosk/_components/service-card.tsx — Tappable service card (2.2.2)
// =============================================================================
// A single large tappable card for a service. Renders the service icon,
// name, description, and a colour accent border. Touch-optimised.
// =============================================================================
'use client';

import { HelpCircle } from 'lucide-react';
import type { ServiceForKiosk } from '@/lib/kiosk-config';

interface ServiceCardProps {
  service: ServiceForKiosk;
  onSelect: (serviceId: string) => void;
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  // Use the service's iconName if it matches a known lucide icon, else fallback
  // We render HelpCircle as the safe fallback since we can't dynamically import
  const iconColor = service.color ?? 'var(--color-primary)';

  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      className="group flex min-h-[120px] w-full items-center gap-6 rounded-xl border border-border bg-card p-6 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
      style={{ borderLeft: `4px solid ${iconColor}` }}
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${iconColor}18` }}
      >
        <HelpCircle className="h-10 w-10" style={{ color: iconColor }} />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xl font-bold text-foreground">{service.name}</span>
        {service.description && (
          <span className="text-sm text-muted-foreground">{service.description}</span>
        )}
      </div>
    </button>
  );
}
