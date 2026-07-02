// =============================================================================
// src/lib/audit-log-queries.ts — Server-side audit log query helpers (5.2.3)
// =============================================================================

import { prisma } from '@/lib/db';
import type {
  AuditLogFilters,
  Pagination,
  AuditLogPageResult,
  AuditLogEntry,
} from '@/types/audit-log.types';
import type { Prisma } from '@prisma/client';
import type { AuditAction } from '@/lib/audit-log';

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export async function queryAuditLogs(
  filters: AuditLogFilters,
  pagination: Pagination,
): Promise<AuditLogPageResult> {
  const where: Prisma.AuditLogWhereInput = {};

  // Always exclude read-only "viewed" entries
  where.action = { not: 'AUDIT_LOG_VIEWED' };

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action as AuditAction;
  if (filters.entity) {
    // Normalize: match both old and new entity value conventions
    const entityVariants: Record<string, { in: string[] }> = {
      User: { in: ['User', 'USER'] },
      SystemSetting: { in: ['SystemSetting', 'SYSTEM_SETTING'] },
      Report: { in: ['Report', 'REPORT'] },
      Notification: { in: ['Notification', 'NOTIFICATION'] },
    };
    where.entity = entityVariants[filters.entity] ?? filters.entity;
  }
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.startDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) ?? {}),
      gte: filters.startDate,
    };
  }
  if (filters.endDate) {
    where.createdAt = {
      ...((where.createdAt as Prisma.DateTimeFilter) ?? {}),
      lte: filters.endDate,
    };
  }

  const { page, pageSize } = pagination;
  const skip = (page - 1) * pageSize;

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const mappedEntries: AuditLogEntry[] = entries.map((entry) => ({
    id: entry.id,
    createdAt: entry.createdAt,
    userId: entry.user?.id ?? null,
    userName: entry.user?.name ?? null,
    userEmail: entry.user?.email ?? null,
    action: entry.action as AuditAction,
    entity: entry.entity,
    entityId: entry.entityId,
    description: `${entry.action} — ${entry.entity}${entry.entityId ? ` (${entry.entityId.slice(0, 8)})` : ''}`,
    metadata: (entry.after as Prisma.JsonValue) ?? null,
  }));

  return {
    entries: mappedEntries,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ---------------------------------------------------------------------------
// Single entry
// ---------------------------------------------------------------------------

export async function getAuditLogEntry(entryId: string): Promise<AuditLogEntry | null> {
  const entry = await prisma.auditLog.findUnique({
    where: { id: entryId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!entry) return null;

  return {
    id: entry.id,
    createdAt: entry.createdAt,
    userId: entry.user?.id ?? null,
    userName: entry.user?.name ?? null,
    userEmail: entry.user?.email ?? null,
    action: entry.action as AuditAction,
    entity: entry.entity,
    entityId: entry.entityId,
    description: `${entry.action} — ${entry.entity}`,
    metadata: (entry.after as Prisma.JsonValue) ?? null,
  };
}
