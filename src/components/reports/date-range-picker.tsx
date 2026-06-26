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
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
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
        onClick={() => onChange({ startDate: today, endDate: today })}
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
