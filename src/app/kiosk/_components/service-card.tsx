// =============================================================================
// src/app/kiosk/_components/service-card.tsx — Tappable service card (2.2.2)
// =============================================================================
// A single large tappable card for a service. Renders the service icon,
// name, description, and a colour accent border. Touch-optimised.
// =============================================================================
'use client';

import { useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import type { ServiceForKiosk } from '@/lib/kiosk-config';

interface ServiceCardProps {
  service: ServiceForKiosk;
  onSelect: (serviceId: string) => void;
}

function resolveIcon(name: string | null): LucideIcon {
  if (!name) return HelpCircle;
  const icon = (LucideIcons as Record<string, unknown>)[name];
  if (icon && (typeof icon === 'function' || typeof icon === 'object')) return icon as LucideIcon;
  return HelpCircle;
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  const iconColor = service.color ?? 'var(--color-primary)';
  const Icon = useMemo(() => resolveIcon(service.iconName), [service.iconName]);

  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      className="flex w-full items-center gap-6 rounded-2xl bg-zinc-800 px-8 py-6 text-left font-semibold shadow-lg transition-all hover:bg-zinc-700 hover:shadow-xl active:scale-[0.97] active:bg-zinc-900"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/15">
        <Icon className="h-9 w-9 text-white" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-4xl font-bold text-white">{service.name}</span>
        {service.description && (
          <span className="text-lg text-zinc-400">{service.description}</span>
        )}
      </div>
    </button>
  );
}
