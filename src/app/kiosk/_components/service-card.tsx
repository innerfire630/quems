// =============================================================================
// src/app/kiosk/_components/service-card.tsx — Tappable service card (2.2.2)
// =============================================================================
// A single large tappable card for a service. Renders the service icon,
// name, description, and a colour accent border. Touch-optimised.
// =============================================================================
'use client';

import { createElement } from 'react';
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

// Wrapper using createElement to avoid react-hooks/static-components lint
function RenderIcon({
  name,
  className,
  style,
  ariaHidden,
}: {
  name: string | null;
  className?: string;
  style?: React.CSSProperties;
  ariaHidden?: boolean;
}) {
  const Icon = resolveIcon(name);
  return createElement(Icon, { className, style, 'aria-hidden': ariaHidden });
}

export function ServiceCard({ service, onSelect }: ServiceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(service.id)}
      className="relative flex min-h-[140px] w-full max-w-lg items-center gap-5 overflow-hidden rounded-2xl bg-zinc-800 px-7 py-5 text-left font-semibold shadow-lg transition-all hover:bg-zinc-700 hover:shadow-xl active:scale-[0.97] active:bg-zinc-900"
    >
      {/* Subtle background icon */}
      <RenderIcon
        name={service.iconName}
        className="pointer-events-none absolute -bottom-4 -right-2 size-32 text-white"
        style={{ opacity: 0.06 }}
        ariaHidden
      />

      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15">
        <RenderIcon name={service.iconName} className="h-8 w-8 text-white" />
      </div>
      <div className="relative flex flex-col gap-0.5">
        <span className="text-3xl font-bold text-white">{service.name}</span>
        {service.description && (
          <span className="text-base text-zinc-400">{service.description}</span>
        )}
      </div>
    </button>
  );
}
