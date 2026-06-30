'use client';

// Wraps ServiceTable with navigation handler for the Edit dropdown item.

import { useRouter } from 'next/navigation';
import { ServiceTable } from './service-table';
import type { ServiceListItem } from '@/types/service.types';

interface ServiceTableWrapperProps {
  services: ServiceListItem[];
  isLoading?: boolean;
  error?: string | null;
}

export function ServiceTableWrapper({ services, isLoading, error }: ServiceTableWrapperProps) {
  const router = useRouter();

  return (
    <ServiceTable
      services={services}
      isLoading={isLoading}
      error={error}
      onEdit={(serviceId) => router.push(`/services/${serviceId}`)}
    />
  );
}
