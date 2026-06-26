// =============================================================================
// src/components/counter/recent-activity-feed.tsx — Recent activity feed (4.2.3)
// =============================================================================
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, RotateCcw, XCircle, DoorOpen, DoorClosed } from 'lucide-react';
import { useSSE } from '@/hooks/use-sse';
import type { RecentActivityEntry } from '@/types/officer-dashboard.types';
import type { SseEventType } from '@/types/sse.types';

interface RecentActivityFeedProps {
  initialEntries: RecentActivityEntry[];
  counterId: string;
}

const MAX_ENTRIES = 20;

const EVENT_ICONS: Record<
  RecentActivityEntry['type'],
  React.ComponentType<{ className?: string }>
> = {
  TICKET_CALLED: Phone,
  TICKET_RECALLED: RotateCcw,
  TICKET_NO_SHOW: XCircle,
  COUNTER_OPENED: DoorOpen,
  COUNTER_CLOSED: DoorClosed,
};

const EVENT_LABELS: Record<RecentActivityEntry['type'], string> = {
  TICKET_CALLED: 'Called',
  TICKET_RECALLED: 'Recalled',
  TICKET_NO_SHOW: 'No-show',
  COUNTER_OPENED: 'Counter opened',
  COUNTER_CLOSED: 'Counter closed',
};

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

export default function RecentActivityFeed({ initialEntries, counterId }: RecentActivityFeedProps) {
  const [entries, setEntries] = useState<RecentActivityEntry[]>(
    initialEntries.slice(0, MAX_ENTRIES),
  );

  useSSE(`counter:${counterId}`, {
    filter: [
      'TICKET_CALLED',
      'TICKET_RECALLED',
      'TICKET_NO_SHOW',
      'COUNTER_OPENED',
      'COUNTER_CLOSED',
    ] as readonly SseEventType[],
    onEvent: (envelope) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = envelope.payload as any;
      const type = envelope.type as RecentActivityEntry['type'];

      const entry: RecentActivityEntry = {
        id: envelope.id,
        type,
        ticketId: (p['ticketId'] as string) ?? null,
        ticketNumber: (p['ticketNumber'] as string) ?? null,
        counterId: (p['counterId'] as string) ?? counterId,
        counterName: (p['counterName'] as string) ?? '',
        officerName:
          (p['calledByOfficerName'] as string) ??
          (p['changedByOfficerName'] as string) ??
          'Unknown',
        timestamp: new Date(envelope.timestamp),
      };

      setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
    },
  });

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-y-auto space-y-3">
          {entries.map((entry) => {
            const Icon = EVENT_ICONS[entry.type] ?? DoorOpen;
            return (
              <div key={entry.id} className="flex items-start gap-3 text-sm">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    <span className="font-medium">{entry.officerName}</span>{' '}
                    {EVENT_LABELS[entry.type] ?? entry.type}
                    {entry.ticketNumber && (
                      <>
                        {' '}
                        &mdash; <span className="font-mono">{entry.ticketNumber}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{relativeTime(entry.timestamp)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
