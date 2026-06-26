// =============================================================================
// src/types/service.types.ts — Service API request/response types (2.1.1)
// =============================================================================

// ---------------------------------------------------------------------------
// List item (returned by GET /api/services)
// ---------------------------------------------------------------------------

export interface ServiceListItem {
  id: string;
  name: string;
  code: string;
  ticketPrefix: string;
  description: string | null;
  iconName: string | null;
  color: string | null;
  isActive: boolean;
  currentTicketNumber: number;
  averageServiceTime: number | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Detail (returned by GET /api/services/[serviceId] — includes assigned counters)
// ---------------------------------------------------------------------------

export interface ServiceDetailCounterInfo {
  id: string;
  name: string;
  number: number;
  displayLabel: string | null;
  isActive: boolean;
}

export interface ServiceDetail extends ServiceListItem {
  counters: ServiceDetailCounterInfo[];
}

// ---------------------------------------------------------------------------
// Create response
// ---------------------------------------------------------------------------

export type CreateServiceResponse = ServiceListItem;

// ---------------------------------------------------------------------------
// List metadata
// ---------------------------------------------------------------------------

export interface ServiceListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
