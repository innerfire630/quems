// =============================================================================
// src/types/counter.types.ts — Counter API request/response types (2.1.2)
// =============================================================================

export type OperationalStatus = 'OPEN' | 'CLOSED' | 'OFFLINE' | 'OFF_DUTY' | 'NO_OFFICER_ON_DUTY';

// ---------------------------------------------------------------------------
// List item (returned by GET /api/counters)
// ---------------------------------------------------------------------------

export interface CounterListItem {
  id: string;
  name: string;
  number: number;
  description: string | null;
  displayLabel: string | null;
  isActive: boolean;
  assignedServicesCount: number;
  operationalStatus: OperationalStatus;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Detail (returned by GET /api/counters/[counterId] — includes assigned services)
// ---------------------------------------------------------------------------

export interface CounterDetailAssignedService {
  id: string;
  name: string;
  code: string;
  ticketPrefix: string;
  isActive: boolean;
}

export interface CounterDetail extends CounterListItem {
  services: CounterDetailAssignedService[];
}

// ---------------------------------------------------------------------------
// Create response
// ---------------------------------------------------------------------------

export type CreateCounterResponse = CounterListItem;

// ---------------------------------------------------------------------------
// List metadata
// ---------------------------------------------------------------------------

export interface CounterListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
