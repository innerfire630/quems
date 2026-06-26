// =============================================================================
// src/types/audit-log.types.ts — Types for the audit log viewer (5.2.3)
// =============================================================================

import type { AuditAction } from '@/lib/audit-log';
import type { Prisma } from '@prisma/client';

// ---------------------------------------------------------------------------
// Denormalised entry for display
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  createdAt: Date;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: AuditAction;
  entity: string;
  entityId: string | null;
  description: string;
  metadata: Prisma.JsonValue | null;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  entity?: string;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface Pagination {
  page: number;
  pageSize: number;
}

// ---------------------------------------------------------------------------
// Page result
// ---------------------------------------------------------------------------

export interface AuditLogPageResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
