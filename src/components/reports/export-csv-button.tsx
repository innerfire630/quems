'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportCsvButtonProps {
  startDate: string;
  endDate: string;
  serviceId?: string | null;
  counterId?: string | null;
  disabled?: boolean;
}

export function ExportCsvButton({
  startDate,
  endDate,
  serviceId,
  counterId,
  disabled,
}: ExportCsvButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      params.set('format', 'csv');
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (serviceId) params.set('serviceId', serviceId);
      if (counterId) params.set('counterId', counterId);

      const url = `/api/reports/export?${params.toString()}`;

      // Create a temporary anchor to trigger download
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = '';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch {
      // Silently fail — the browser download handles errors
    } finally {
      // Brief "exporting" state for visual feedback
      setTimeout(() => setIsExporting(false), 800);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting}
      variant="outline"
      aria-label="Export CSV"
    >
      <Download className="mr-2 size-4" aria-hidden />
      {isExporting ? 'Exporting...' : 'Export CSV'}
    </Button>
  );
}
