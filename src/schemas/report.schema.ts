// =============================================================================
// src/schemas/report.schema.ts — Report query Zod schemas (5.1.1)
// =============================================================================
import { z } from 'zod';
import { BUSINESS_DATE_RANGE_MAX_DAYS } from '@/types/report.types';

// ---------------------------------------------------------------------------
// reportsQuerySchema — validates GET /api/reports query parameters
// ---------------------------------------------------------------------------

export const reportsQuerySchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    serviceId: z.string().cuid().optional(),
    counterId: z.string().cuid().optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  })
  .refine(
    (data) =>
      (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) /
        (1000 * 60 * 60 * 24) <=
      BUSINESS_DATE_RANGE_MAX_DAYS,
    {
      message: `Date range cannot exceed ${BUSINESS_DATE_RANGE_MAX_DAYS} days`,
      path: ['endDate'],
    },
  );

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

// ---------------------------------------------------------------------------
// reportDateRangeSchema — validates the date-range-picker form values
// ---------------------------------------------------------------------------

export const reportDateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type ReportDateRange = z.infer<typeof reportDateRangeSchema>;

// ---------------------------------------------------------------------------
// reportExportQuerySchema — validates GET /api/reports/export query params
// ---------------------------------------------------------------------------

export const reportExportQuerySchema = reportsQuerySchema.extend({
  format: z.enum(['csv']).default('csv'),
});

export type ReportExportQuery = z.infer<typeof reportExportQuerySchema>;
