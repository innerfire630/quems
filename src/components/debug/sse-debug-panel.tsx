'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSSE } from '@/hooks/use-sse';
import type { SseEventType, SseEnvelope, SseInternalEnvelope } from '@/types/sse.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SseDebugPanelProps {
  channel?: string;
}

interface LogEntry {
  receivedAt: Date;
  envelope: SseEnvelope<SseEventType> | SseInternalEnvelope;
}

// ---------------------------------------------------------------------------
// Status → badge variant mapping
// ---------------------------------------------------------------------------

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'open':
      return 'default'; // green-ish in most themes
    case 'connecting':
    case 'reconnecting':
      return 'secondary';
    case 'closed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SseDebugPanel({ channel = 'global' }: SseDebugPanelProps) {
  const [eventLog, setEventLog] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const onEvent = useCallback((envelope: SseEnvelope<SseEventType>) => {
    setEventLog((prev) => {
      const next = [{ receivedAt: new Date(), envelope }, ...prev];
      return next.slice(0, 20);
    });
  }, []);

  const onInternalEvent = useCallback((envelope: SseInternalEnvelope) => {
    setEventLog((prev) => {
      const next = [{ receivedAt: new Date(), envelope }, ...prev];
      return next.slice(0, 20);
    });
  }, []);

  const { status, reconnectAttempts, lastEventAt, totalEventsReceived } = useSSE<SseEventType>(
    channel,
    { onEvent, onInternalEvent },
  );

  // Auto-scroll to bottom of the event log when the logEndRef is triggered
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog.length]);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          SSE Debug Panel
          <Badge variant={statusVariant(status)}>{status}</Badge>
        </CardTitle>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            Channel: <code className="text-xs bg-muted px-1 rounded">{channel}</code>
          </span>
          {reconnectAttempts > 0 && <span>Reconnect attempts: {reconnectAttempts}</span>}
          <span>Total events: {totalEventsReceived}</span>
          {lastEventAt && <span>Last event: {timeAgo(lastEventAt)}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto space-y-1 border rounded-md p-2 bg-muted/30">
          {eventLog.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Waiting for events...</p>
          )}
          {eventLog.map((entry) => {
            const isExpanded = expandedId === entry.envelope.id;
            return (
              <div
                key={entry.envelope.id}
                className="text-xs border-b border-border/50 pb-1 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono">
                    {entry.receivedAt.toISOString().slice(11, 23)}
                  </span>
                  <Badge variant="outline" className="text-xs px-1 py-0">
                    {entry.envelope.type}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1 text-xs"
                    onClick={() => setExpandedId(isExpanded ? null : entry.envelope.id)}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </Button>
                </div>
                {isExpanded && (
                  <pre className="mt-1 text-xs bg-muted p-1 rounded overflow-x-auto max-h-32">
                    {JSON.stringify(entry.envelope, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
          <div ref={logEndRef} />
        </div>
      </CardContent>
    </Card>
  );
}
