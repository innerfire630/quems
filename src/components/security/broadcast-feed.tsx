// =============================================================================
// src/components/security/broadcast-feed.tsx — Chronological broadcast list (4.3.3)
// =============================================================================

'use client';

import { useCallback } from 'react';
import { MessageSquare, Inbox } from 'lucide-react';
import type { BroadcastEntry } from '@/types/security-dashboard.types';

interface BroadcastFeedProps {
  entries: BroadcastEntry[];
  onMarkRead: (broadcastId: string) => void;
}

function formatRelativeTime(isoString: string): string {
  const seconds = Math.floor((new Date(isoString).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(seconds) < 60) return rtf.format(seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  const days = Math.floor(hours / 24);
  return rtf.format(days, 'day');
}

export function BroadcastFeed({ entries, onMarkRead }: BroadcastFeedProps) {
  const handleClick = useCallback(
    (entry: BroadcastEntry) => {
      if (entry.type === 'BROADCAST' && !entry.isRead) {
        onMarkRead(entry.broadcastId);
      }
    },
    [onMarkRead],
  );

  // Empty state
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
        <Inbox className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg">No broadcasts yet</p>
        <p className="text-sm mt-1">Waiting for officer broadcasts...</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-5rem)] px-4 py-2"
      role="feed"
      aria-live="polite"
    >
      {entries.map((entry) => {
        const key =
          entry.type === 'BROADCAST' ? `bcast-${entry.broadcastId}` : `reply-${entry.replyId}`;

        if (entry.type === 'OFFICER_REPLY') {
          return (
            <article
              key={key}
              role="article"
              className="flex items-center gap-3 px-4 py-2 rounded-lg bg-zinc-900/50 text-zinc-400 text-sm"
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>
                Officer <strong className="text-zinc-300">{entry.repliedByOfficerName}</strong> just
                replied
              </span>
              <span className="ml-auto text-xs text-zinc-500 tabular-nums">
                {formatRelativeTime(entry.repliedAt)}
              </span>
            </article>
          );
        }

        // BROADCAST entry
        const isUnread = !entry.isRead;

        return (
          <article
            key={key}
            role="article"
            onClick={() => handleClick(entry)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleClick(entry);
            }}
            tabIndex={0}
            className={`relative flex flex-col gap-1 px-4 py-3 rounded-lg border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 ${
              isUnread ? 'border-primary/30 bg-primary/5' : 'border-zinc-800 bg-zinc-900/30'
            }`}
            aria-label={`Broadcast from ${entry.senderName} at ${entry.createdAt}`}
          >
            {/* Unread dot */}
            {isUnread && (
              <span className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-primary" />
            )}

            {/* Sender + time */}
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <strong className="text-zinc-200">{entry.senderName}</strong>
              <span className="text-xs tabular-nums">{formatRelativeTime(entry.createdAt)}</span>
            </div>

            {/* Message */}
            <p className="text-lg text-zinc-100">{entry.message}</p>
          </article>
        );
      })}
    </div>
  );
}
