// =============================================================================
// GET /api/reports/export — CSV export endpoint (5.1.3)
// =============================================================================
import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/guards';
import { PERMISSION_REPORT_EXPORT } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit-log';
import { getReportData } from '@/lib/analytics-service';
import { generateReportCsv, formatReportFilename } from '@/lib/report-export';
import { reportExportQuerySchema } from '@/schemas/report.schema';
import type { GuardedContext } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = async (request: Request, { session }: GuardedContext): Promise<Response> => {
  // Parse and validate query parameters
  const url = new URL(request.url);
  const rawQuery = Object.fromEntries(url.searchParams.entries());

  const parsed = reportExportQuerySchema.safeParse(rawQuery);
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

  // Only CSV format is supported in 5.1.3
  if (query.format !== 'csv') {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNSUPPORTED_FORMAT',
          message: `Format "${query.format}" is not supported. Only "csv" is available.`,
        },
      },
      { status: 422 },
    );
  }

  const startDate = new Date(query.startDate + 'T00:00:00.000Z');
  const endDate = new Date(query.endDate + 'T23:59:59.999Z');

  // Fetch report data with per-day granularity for CSV
  const startTime = Date.now();
  const data = await getReportData(startDate, endDate, query.serviceId, query.counterId, {
    byDay: true,
  });
  const durationMs = Date.now() - startTime;

  // Generate CSV
  const csv = generateReportCsv(data);
  const filename = formatReportFilename(query.startDate, query.endDate);

  // Count data rows (exclude header)
  const rowCount = data.services.length;

  // Audit log (best-effort)
  try {
    await writeAuditLog({
      action: 'REPORT_EXPORTED',
      actorId: session.user.userId,
      actorName: session.user.name ?? undefined,
      description: 'Report exported as CSV',
      metadata: {
        startDate: query.startDate,
        endDate: query.endDate,
        serviceId: query.serviceId ?? null,
        counterId: query.counterId ?? null,
        format: query.format,
        rowCount,
        fileSizeBytes: Buffer.byteLength(csv, 'utf8'),
        durationMs,
      },
    });
  } catch (error) {
    console.error(
      '[api/reports/export] Failed to write audit log:',
      error instanceof Error ? error.message : error,
    );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
};

export const GET = withPermission(handler, PERMISSION_REPORT_EXPORT);
