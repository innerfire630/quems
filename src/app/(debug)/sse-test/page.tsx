'use client';

import { useState } from 'react';
import { SseDebugPanel } from '@/components/debug/sse-debug-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function SseTestPage() {
  const [channel, setChannel] = useState('global');
  const [activeChannel, setActiveChannel] = useState('global');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SSE Test Page</h1>
        <p className="text-muted-foreground mt-1">
          Verifies the SSE infrastructure end-to-end. Subscribe to any channel and observe events in
          real time.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="Channel name (e.g., global, counter-<id>)"
          className="max-w-xs font-mono text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter') setActiveChannel(channel);
          }}
        />
        <Button onClick={() => setActiveChannel(channel)}>Connect</Button>
      </div>

      <SseDebugPanel channel={activeChannel} />
    </div>
  );
}
