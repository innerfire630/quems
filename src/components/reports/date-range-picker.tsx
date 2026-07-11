'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  /** Get today's date in local timezone as YYYY-MM-DD */
  function localDateStr(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const today = useMemo(() => localDateStr(new Date()), []);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return localDateStr(d);
  }, []);

  const handleStartChange = (value: string) => {
    if (value <= endDate) {
      onChange({ startDate: value, endDate });
    }
  };

  const handleEndChange = (value: string) => {
    if (value >= startDate) {
      onChange({ startDate, endDate: value });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <label className="text-sm text-muted-foreground">From</label>
        <Input
          type="date"
          value={startDate}
          max={today}
          onChange={(e) => handleStartChange(e.target.value)}
          className="w-40"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <label className="text-sm text-muted-foreground">To</label>
        <Input
          type="date"
          value={endDate}
          min={startDate}
          max={today}
          onChange={(e) => handleEndChange(e.target.value)}
          className="w-40"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({ startDate: localDateStr(new Date()), endDate: localDateStr(new Date()) })
        }
      >
        Today
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange({ startDate: sevenDaysAgo, endDate: today })}
      >
        Last 7 days
      </Button>
    </div>
  );
}
