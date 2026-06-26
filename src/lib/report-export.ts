// =============================================================================
// src/lib/report-export.ts — CSV generation & scheduled reports interface (5.1.3)
// =============================================================================
import { prisma as db } from '@/lib/db';
import type {
  ReportData,
  ScheduledReportJobOptions,
  ScheduledReportJob,
} from '@/types/report.types';

// ---------------------------------------------------------------------------
// CSV escaping (RFC 4180)
// ---------------------------------------------------------------------------

/**
 * Escapes a single CSV field value.
 * - Null/undefined → empty string
 * - Numbers → string representation
 * - Strings with commas, double quotes, or newlines → wrapped in double quotes
 * - Internal double quotes are doubled.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';

  const str = String(value);

  // Check if quoting is needed
  const needsQuoting =
    str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r');

  if (!needsQuoting) return str;

  // Wrap in quotes and double internal quotes
  return `"${str.replace(/"/g, '""')}"`;
}

// ---------------------------------------------------------------------------
// CSV generation
// ---------------------------------------------------------------------------

/**
 * Generates the CSV content for a report.
 * One row per service per day in the date range.
 */
export function generateReportCsv(reportData: ReportData): string {
  const lines: string[] = [];

  // Header row
  lines.push(
    [
      'Date',
      'Service Code',
      'Service Name',
      'Total Issued',
      'Total Served',
      'Total No Show',
      'Total Cancelled',
      'Total Waiting',
      'Average Wait (min)',
      'Average Service (min)',
      'Peak Hour',
    ].join(','),
  );

  // Data rows — reportData.services is per-service-per-day when byDay is true
  for (const row of reportData.services) {
    const peakHour = row.peakHour !== null ? `${String(row.peakHour).padStart(2, '0')}:00` : '';

    lines.push(
      [
        escapeCsvField(reportData.startDate),
        escapeCsvField(row.serviceCode),
        escapeCsvField(row.serviceName),
        escapeCsvField(row.totalIssued),
        escapeCsvField(row.totalServed),
        escapeCsvField(row.totalNoShow),
        escapeCsvField(0), // totalCancelled — not tracked per-service in ReportData
        escapeCsvField(''), // totalWaiting — not tracked per-service in ReportData
        escapeCsvField(row.averageWaitMinutes !== null ? row.averageWaitMinutes.toFixed(1) : ''),
        escapeCsvField(
          row.averageServiceMinutes !== null ? row.averageServiceMinutes.toFixed(1) : '',
        ),
        escapeCsvField(peakHour),
      ].join(','),
    );
  }

  // Ensure trailing CRLF
  return lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// Filename formatting
// ---------------------------------------------------------------------------

export function formatReportFilename(startDate: string, endDate: string): string {
  if (startDate === endDate) {
    return `report-${startDate}.csv`;
  }
  return `report-${startDate}-${endDate}.csv`;
}

// ---------------------------------------------------------------------------
// Scheduled reports interface (future — not executed in 5.1.3)
// ---------------------------------------------------------------------------

/**
 * Reads the configured report recipients from SystemSetting.
 * Returns an empty array if the setting is not configured.
 */
export async function getScheduledReportRecipients(): Promise<string[]> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'reports.scheduled_recipients' },
    });

    if (!setting?.value) return [];

    return (setting.value as string)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Reads the configured report frequency from SystemSetting.
 * Returns null if the setting is not configured or invalid.
 */
export async function getScheduledReportFrequency(): Promise<
  'daily' | 'weekly' | 'monthly' | null
> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: 'reports.scheduled_frequency' },
    });

    if (!setting?.value) return null;

    const val = (setting.value as string).trim().toLowerCase();
    if (val === 'daily' || val === 'weekly' || val === 'monthly') return val;

    return null;
  } catch {
    return null;
  }
}

/**
 * Builds a scheduled report job description object.
 * Does NOT execute the job — the scheduler is a future enhancement.
 */
export async function buildScheduledReportJob(
  options: ScheduledReportJobOptions,
): Promise<ScheduledReportJob> {
  const recipients = options.recipients ?? (await getScheduledReportRecipients());
  const frequency = options.frequency ?? (await getScheduledReportFrequency());

  const job: ScheduledReportJob = {
    id: crypto.randomUUID(),
    query: {
      startDate: options.startDate.toISOString().split('T')[0],
      endDate: options.endDate.toISOString().split('T')[0],
      serviceId: options.serviceId ?? null,
      counterId: options.counterId ?? null,
    },
    recipients,
    frequency,
    scheduledAt: new Date().toISOString(),
    status: 'PENDING',
  };

  return job;
}
