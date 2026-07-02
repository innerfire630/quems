// =============================================================================
// GET /api/reports — Queue analytics endpoint (5.1.1)
// =============================================================================
import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_REPORT_VIEW } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';
import { getReportData } from '@/lib/analytics-service';
import { reportsQuerySchema } from '@/schemas/report.schema';
import type { GuardedContext } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = async (request: Request, { session }: GuardedContext): Promise<Response> => {
  // Parse and validate query parameters
  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());

  const parsed = reportsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters.',
          details: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 422 },
    );
  }

  const query = parsed.data;
  const startDate = new Date(query.startDate + 'T00:00:00.000Z');
  const endDate = new Date(query.endDate + 'T23:59:59.999Z');

  // Fetch report data
  const startTime = Date.now();
  const data = await getReportData(startDate, endDate, query.serviceId, query.counterId);
  const durationMs = Date.now() - startTime;

  // Audit log (best-effort)
  try {
    await writeAuditLog({
      action: 'REPORT_GENERATED',
      actorId: session.user.userId,
      actorName: session.user.name ?? undefined,
      entity: 'Report',
      description: 'Report generated',
      metadata: {
        startDate: query.startDate,
        endDate: query.endDate,
        serviceId: query.serviceId ?? null,
        counterId: query.counterId ?? null,
        resultSize: {
          services: data.services.length,
          counters: data.counters.length,
          tickets: data.kpi.totalTickets,
        },
        durationMs,
      },
    });
  } catch (error) {
    console.error(
      '[api/reports] Failed to write audit log:',
      error instanceof Error ? error.message : error,
    );
  }

  return NextResponse.json({ success: true, data });
};

export const GET = withPermission(handler, PERMISSION_REPORT_VIEW);
