// =============================================================================
// src/app/kiosk/_components/kiosk-service-grid.tsx — Service grid wrapper (2.2.2)
// =============================================================================
// Responsive grid of ServiceCards. Handles loading and empty states.
// =============================================================================
'use client';

import { ServiceCard } from './service-card';
import type { ServiceForKiosk } from '@/lib/kiosk-config';

interface KioskServiceGridProps {
  services: ServiceForKiosk[];
  onSelect: (serviceId: string) => void;
  isLoading?: boolean;
}

export function KioskServiceGrid({ services, onSelect, isLoading = false }: KioskServiceGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 place-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[140px] animate-pulse rounded-xl border border-border bg-muted p-6"
          />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg text-muted-foreground">
          No services are currently available. Please ask staff for assistance.
        </p>
      </div>
    );
  }

  return (
    <div className="grid w-full grid-cols-1 place-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((service) => (
        <ServiceCard key={service.id} service={service} onSelect={onSelect} />
      ))}
    </div>
  );
}
