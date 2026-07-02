'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ServiceOption {
  id: string;
  code: string;
  name: string;
}

interface CounterOption {
  id: string;
  name: string;
  number: number;
}

interface ReportFiltersProps {
  serviceId: string | null;
  counterId: string | null;
  services: ServiceOption[];
  counters: CounterOption[];
  onChange: (filters: { serviceId: string | null; counterId: string | null }) => void;
}

export function ReportFilters({
  serviceId,
  counterId,
  services,
  counters,
  onChange,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={serviceId ?? 'all'}
        onValueChange={(value) =>
          onChange({
            serviceId: value === 'all' ? null : value,
            counterId,
          })
        }
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="All services">
            {(val: string) => {
              if (val === 'all') return 'All services';
              const svc = services.find((s) => s.id === val);
              return svc ? `${svc.code} — ${svc.name}` : val;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All services</SelectItem>
          {services.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.code} — {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={counterId ?? 'all'}
        onValueChange={(value) =>
          onChange({
            serviceId,
            counterId: value === 'all' ? null : value,
          })
        }
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="All counters">
            {(val: string) => {
              if (val === 'all') return 'All counters';
              const c = counters.find((c) => c.id === val);
              return c ? c.name : val;
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All counters</SelectItem>
          {counters.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
