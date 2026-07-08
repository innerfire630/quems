// =============================================================================
// src/components/counter/queue-depth-indicator.tsx — Queue depth (4.2.3)
// =============================================================================
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useSSE } from '@/hooks/use-sse';
import type { SseEventType } from '@/types/sse.types';

interface QueueDepthIndicatorProps {
  initialCount: number;
  counterId: string;
}

function getBadgeVariant(count: number): 'outline' | 'default' | 'secondary' | 'destructive' {
  if (count === 0) return 'outline';
  if (count <= 3) return 'default';
  if (count <= 10) return 'secondary';
  return 'destructive';
}

function getLabel(count: number): string {
  if (count === 0) return 'No tickets waiting';
  return `${count} waiting`;
}

export default function QueueDepthIndicator({ initialCount, counterId }: QueueDepthIndicatorProps) {
  const [count, setCount] = useState(initialCount);

  useSSE(`counter:${counterId}`, {
    filter: ['TICKET_ISSUED', 'TICKET_CALLED', 'QUEUE_UPDATED'] as readonly SseEventType[],
    onEvent: (envelope) => {
      if (envelope.type === 'TICKET_ISSUED') {
        setCount((prev) => prev + 1);
      } else if (envelope.type === 'TICKET_CALLED') {
        setCount((prev) => Math.max(0, prev - 1));
      } else if (envelope.type === 'QUEUE_UPDATED') {
        const payload = envelope.payload as { waitingCount?: number };
        if (typeof payload.waitingCount === 'number') {
          setCount(payload.waitingCount);
        }
      }
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Queue Depth</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-muted-foreground" />
          <Badge variant={getBadgeVariant(count)} className="text-lg px-3 py-1">
            {getLabel(count)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
