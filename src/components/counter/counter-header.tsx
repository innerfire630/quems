// =============================================================================
// src/components/counter/counter-header.tsx — Counter header (4.2.3)
// =============================================================================
import { Badge } from '@/components/ui/badge';

interface CounterHeaderProps {
  counter: {
    name: string;
    number: number;
    displayLabel: string | null;
    isActive: boolean;
  };
  currentStatus: 'OPENED' | 'CLOSED';
  reason: string | null;
}

export default function CounterHeader({ counter, currentStatus, reason }: CounterHeaderProps) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-zinc-800 px-4 py-4 sm:px-6">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          {counter.name || `Counter ${counter.number}`}
        </h1>
        <p className="mt-1 text-xs text-zinc-300 sm:text-sm">
          {counter.displayLabel && counter.displayLabel !== counter.name
            ? counter.displayLabel
            : `Counter ${counter.number}`}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge
          variant={currentStatus === 'OPENED' ? 'default' : 'secondary'}
          className={
            currentStatus === 'OPENED'
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : ''
          }
        >
          {currentStatus === 'OPENED' ? 'Open' : 'Temporarily Closed'}
        </Badge>
        {currentStatus === 'CLOSED' && reason && (
          <span className="text-xs text-zinc-400">{reason}</span>
        )}
      </div>
    </div>
  );
}
