// =============================================================================
// src/components/security/security-screen-client.tsx — Client wrapper (4.3.3)
// =============================================================================
// Owns the SSE subscription to the 'security' channel, manages the broadcast
// feed state, hydrates read state from localStorage, and renders the header,
// unread badge, and broadcast feed.
// =============================================================================

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, Shield } from 'lucide-react';
import { useSSE } from '@/hooks/use-sse';
import { UnreadIndicator } from './unread-indicator';
import { BroadcastFeed } from './broadcast-feed';
import { SECURITY_EVENT_FILTER, READ_STATE_STORAGE_KEY } from '@/types/security-dashboard.types';
import type { SecurityDashboardData, BroadcastEntry } from '@/types/security-dashboard.types';
import type { SseEventPayload } from '@/types/sse.types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SecurityScreenClientProps {
  initialData: SecurityDashboardData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadReadState(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(READ_STATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
}

function saveReadState(state: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(READ_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

// ---------------------------------------------------------------------------
// Clock sub-component
// ---------------------------------------------------------------------------

function SecurityClock() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span className="tabular-nums text-zinc-400 text-sm">{time}</span>;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SecurityScreenClient({ initialData }: SecurityScreenClientProps) {
  // Feed entries state — hydrate read state from localStorage on init
  const [entries, setEntries] = useState<BroadcastEntry[]>(() => {
    const saved = loadReadState();
    const hasSaved = Object.keys(saved).length > 0;
    return initialData.recentBroadcasts.map((e) => {
      if (hasSaved && e.type === 'BROADCAST' && saved[e.broadcastId]) {
        return { ...e, isRead: true };
      }
      return e;
    });
  });

  // Read state ref (broadcastId → readTimestamp)
  const readStateRef = useRef<Record<string, number>>(loadReadState());

  // Last localStorage write timestamp (for throttling)
  const lastWriteRef = useRef<number>(0);

  // Persist read state to localStorage (throttled to 1 write/sec)
  const persistReadState = useCallback((newState: Record<string, number>) => {
    const now = Date.now();
    if (now - lastWriteRef.current < 1000) {
      // Schedule a delayed write
      setTimeout(() => saveReadState(newState), 1000 - (now - lastWriteRef.current));
    } else {
      saveReadState(newState);
      lastWriteRef.current = now;
    }
  }, []);

  // Mark a broadcast as read
  const markAsRead = useCallback(
    (broadcastId: string) => {
      const updated = { ...readStateRef.current, [broadcastId]: Date.now() };
      readStateRef.current = updated;
      persistReadState(updated);
      setEntries((prev) =>
        prev.map((e) =>
          e.type === 'BROADCAST' && e.broadcastId === broadcastId ? { ...e, isRead: true } : e,
        ),
      );
    },
    [persistReadState],
  );

  // SSE subscription to the security channel
  useSSE('security', {
    filter: SECURITY_EVENT_FILTER,
    onEvent: useCallback((envelope: SseEventPayload) => {
      if (envelope.type === 'BROADCAST_MESSAGE') {
        const p = envelope.payload as {
          broadcastId: string;
          message: string;
          senderName: string;
          displaySeconds: number;
        };
        const createdAt = envelope.timestamp;
        const expiresAt = new Date(
          new Date(createdAt).getTime() + p.displaySeconds * 1000,
        ).toISOString();

        const newEntry: BroadcastEntry = {
          type: 'BROADCAST',
          broadcastId: p.broadcastId,
          message: p.message,
          senderName: p.senderName,
          createdAt,
          expiresAt,
          isRead: false,
        };

        setEntries((prev) => {
          const updated = [newEntry, ...prev];
          // Maintain max 50 entries
          if (updated.length > 50) updated.length = 50;
          return updated;
        });
      } else if (envelope.type === 'OFFICER_REPLY') {
        const p = envelope.payload as {
          notificationId: string;
          replyId: string;
          repliedByOfficerName: string;
          repliedAt: string;
        };

        const newEntry: BroadcastEntry = {
          type: 'OFFICER_REPLY',
          notificationId: p.notificationId,
          replyId: p.replyId,
          repliedByOfficerName: p.repliedByOfficerName,
          repliedAt: p.repliedAt,
          isRead: false,
        };

        setEntries((prev) => {
          const updated = [newEntry, ...prev];
          if (updated.length > 50) updated.length = 50;
          return updated;
        });
      }
    }, []),
  });

  // Compute unread count
  const unreadCount = entries.filter((e) => !e.isRead).length;

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex h-16 items-center justify-between px-6 border-b-2 border-zinc-700 bg-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-semibold text-lg">Security Officer</span>
          <UnreadIndicator count={unreadCount} />
        </div>

        <div className="flex items-center gap-4">
          {initialData.user.name && (
            <span className="text-sm text-zinc-400">{initialData.user.name}</span>
          )}
          <SecurityClock />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Broadcast feed */}
      <main className="flex-1 overflow-hidden">
        <BroadcastFeed entries={entries} onMarkRead={markAsRead} />
      </main>
    </div>
  );
}
