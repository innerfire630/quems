// =============================================================================
// src/app/api/audit-log/route.ts — Audit log API endpoint (5.2.3)
// =============================================================================
// GET /api/audit-log?userId&action&entity&entityId&startDate&endDate&page&pageSize
// Requires system:audit permission. Returns paginated, filtered audit log entries.
// Writes AUDIT_LOG_VIEWED audit entry on access (best-effort, never fails).
// =============================================================================

import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_SYSTEM_AUDIT } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';
import { queryAuditLogs } from '@/lib/audit-log-queries';
import { auditLogQuerySchema } from '@/schemas/audit-log.schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withPermission(async (req, ctx) => {
  try {
    const { searchParams } = new URL(req.url);
    const rawParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawParams[key] = value;
    });

    // Parse integers from string params
    const parsed = auditLogQuerySchema.safeParse({
      ...rawParams,
      page: rawParams.page ? Number(rawParams.page) : undefined,
      pageSize: rawParams.pageSize ? Number(rawParams.pageSize) : undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: parsed.error.issues,
          },
        },
        { status: 422 },
      );
    }

    const { userId, action, entity, entityId, startDate, endDate, page, pageSize } = parsed.data;

    const startTime = Date.now();
    const result = await queryAuditLogs(
      {
        userId,
        action: action as import('@/lib/audit-log').AuditAction | undefined,
        entity,
        entityId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      },
      { page, pageSize },
    );
    const durationMs = Date.now() - startTime;

    // Best-effort audit log write
    try {
      await writeAuditLog({
        action: 'AUDIT_LOG_VIEWED',
        actorId: ctx.session.user.id,
        actorName: ctx.session.user.name ?? undefined,
        description: `Viewed audit log (${result.total} entries, ${durationMs}ms)`,
        metadata: {
          filters: { userId, action, entity, entityId, startDate, endDate },
          resultCount: result.total,
          durationMs,
        },
      });
    } catch {
      // best-effort
    }

    return NextResponse.json({
      success: true,
      data: result.entries,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error('[audit-log API]', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch audit log entries',
        },
      },
      { status: 500 },
    );
  }
}, PERMISSION_SYSTEM_AUDIT);
