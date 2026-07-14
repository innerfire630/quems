// =============================================================================
// src/components/counter/waiting-tickets-list.tsx — Waiting tickets list
// =============================================================================
// Displays all WAITING tickets for the counter's services, sorted oldest-first.
// Features:
// - Real-time waiting duration display
// - Color-coded times (green/yellow/red based on admin-configurable thresholds)
// - Blinking animation for overdue tickets
// - Customer name + ticket number
// - Call specific ticket from the list
// - SSE subscription for live updates
// =============================================================================
'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TicketBadge } from '@/components/shared/ticket-badge';
import { useSSE } from '@/hooks/use-sse';
import { Users, Phone, Clock } from 'lucide-react';
import type { TicketListItem } from '@/types/ticket.types';
import type { SseEventType } from '@/types/sse.types';
import { playSound, unlockAudio } from '@/lib/notification-audio';

// ---------------------------------------------------------------------------
// Color config type (matches the SystemSetting JSON shape)
// ---------------------------------------------------------------------------

export interface WaitingTimeColorConfig {
  green_max_minutes: number;
  yellow_max_minutes: number;
  green_color: string;
  yellow_color: string;
  red_color: string;
}

interface WaitingTicketsListProps {
  counterId: string;
  initialTickets: TicketListItem[];
  colorConfig: WaitingTimeColorConfig;
  reminderThresholdMinutes: number;
  reminderBlinkIntervalSeconds: number;
  reminderSoundFile: string;
  reminderSoundRepeatCount: number;
  reminderIntervalMinutes: number;
  isCounterBusy: boolean;
  isOffDuty: boolean;
  onTicketCalled?: () => void;
  onReminderTrigger?: (ticketNumbers: string[]) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWaitMinutes(issuedAt: string): number {
  return Math.floor((Date.now() - new Date(issuedAt).getTime()) / 60_000);
}

function getWaitColor(minutes: number, cfg: WaitingTimeColorConfig): string {
  if (minutes < cfg.green_max_minutes) return cfg.green_color;
  if (minutes < cfg.yellow_max_minutes) return cfg.yellow_color;
  return cfg.red_color;
}

function formatWaitLabel(minutes: number): string {
  if (minutes < 1) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hLabel = hours === 1 ? '1 hour' : `${hours} hours`;
  if (mins === 0) return `${hLabel} ago`;
  const mLabel = mins === 1 ? '1 min' : `${mins} mins`;
  return `${hLabel} ${mLabel} ago`;
}

function getCustomerDisplayName(ticket: TicketListItem): string {
  if (ticket.customerName) return ticket.customerName;
  if (ticket.customerIdNumber) return `ID: ${ticket.customerIdNumber}`;
  return '—';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WaitingTicketsList({
  counterId,
  initialTickets,
  colorConfig,
  reminderThresholdMinutes,
  reminderBlinkIntervalSeconds: _reminderBlinkIntervalSeconds,
  reminderSoundFile,
  reminderSoundRepeatCount,
  reminderIntervalMinutes,
  isCounterBusy,
  isOffDuty,
  onTicketCalled,
  onReminderTrigger,
}: WaitingTicketsListProps) {
  const [tickets, setTickets] = useState<TicketListItem[]>(initialTickets);
  const [now, setNow] = useState(() => Date.now()); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [callingTicketId, setCallingTicketId] = useState<string | null>(null);
  const reminderPlayedRef = useRef(false);
  const reminderUnlocked = useRef(false);

  // Unlock reminder sound on first user interaction
  useEffect(() => {
    if (!reminderSoundFile || reminderUnlocked.current) return;
    function unlock() {
      if (reminderUnlocked.current) return;
      reminderUnlocked.current = true;
      unlockAudio([`/uploads/sounds/${reminderSoundFile}`]);
    }
    document.addEventListener('click', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [reminderSoundFile]);

  // Tick every second to update wait durations
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Refresh the full waiting list from the API
  const refreshList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/officers/me/dashboard/${encodeURIComponent(counterId)}/waiting-tickets`,
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setTickets(json.data as TicketListItem[]);
        }
      }
    } catch {
      // Silent — next SSE event will re-trigger
    }
  }, [counterId]);
  // Fallback: refresh list every 30s in case SSE events are missed
  useEffect(() => {
    const interval = setInterval(() => {
      refreshList();
    }, 30_000);
    return () => clearInterval(interval);
  }, [refreshList]);
  // SSE subscription
  useSSE(`counter:${counterId}`, {
    filter: [
      'TICKET_ISSUED',
      'TICKET_CALLED',
      'QUEUE_UPDATED',
      'TICKET_NO_SHOW',
      'TICKET_SERVED',
      'TICKET_RECALLED',
    ] as readonly SseEventType[],
    onEvent: () => {
      refreshList();
    },
  });

  // Dedicated reminder check — runs independently of `now` state to ensure
  // real-time detection without depending on re-render timing
  useEffect(() => {
    if (!onReminderTrigger) return;

    function checkOverdue() {
      const overdueNow = tickets.filter((t) => {
        const mins = getWaitMinutes(t.issuedAt);
        if (mins < reminderThresholdMinutes) return false;
        const minsSinceThreshold = mins - reminderThresholdMinutes;
        return minsSinceThreshold % reminderIntervalMinutes < 1;
      });

      if (overdueNow.length === 0) {
        reminderPlayedRef.current = false;
        return;
      }

      if (reminderPlayedRef.current) return;
      reminderPlayedRef.current = true;

      onReminderTrigger(overdueNow.map((t) => t.ticketNumber));

      // Play sound N times if configured
      if (reminderSoundFile) {
        const repeatCount = Math.min(10, Math.max(1, reminderSoundRepeatCount));
        const src = `/uploads/sounds/${reminderSoundFile}`;
        let played = 0;
        function playNext() {
          if (played >= repeatCount) return;
          played++;
          playSound(src);
        }
        playNext();
        if (repeatCount > 1) {
          const timer = setInterval(() => {
            if (played >= repeatCount) {
              clearInterval(timer);
              return;
            }
            playNext();
          }, 600);
        }
      }
    }

    // Check immediately and every second
    checkOverdue();
    const interval = setInterval(checkOverdue, 1000);
    return () => clearInterval(interval);
  }, [
    tickets,
    reminderThresholdMinutes,
    reminderIntervalMinutes,
    reminderSoundFile,
    reminderSoundRepeatCount,
    onReminderTrigger,
  ]);

  // Call a specific ticket from the waiting list
  const handleCallTicket = useCallback(
    async (ticketId: string) => {
      setCallingTicketId(ticketId);
      try {
        const res = await fetch(`/api/tickets/${ticketId}/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ counterId }),
        });

        if (res.ok) {
          refreshList();
          onTicketCalled?.();
        }
      } catch {
        // Silent
      } finally {
        setCallingTicketId(null);
      }
    },
    [counterId, refreshList, onTicketCalled],
  );

  // Sort: oldest first (by issuedAt)
  const sortedTickets = [...tickets].sort(
    (a, b) => new Date(a.issuedAt).getTime() - new Date(b.issuedAt).getTime(),
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Waiting Tickets</CardTitle>
          <Badge variant="outline" className="text-xs">
            {sortedTickets.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTickets.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <Users className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No tickets waiting</p>
          </div>
        ) : (
          <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
            {sortedTickets.map((ticket) => {
              const waitMinutes = getWaitMinutes(ticket.issuedAt);
              const waitColor = getWaitColor(waitMinutes, colorConfig);
              const isOverdue = waitMinutes >= reminderThresholdMinutes;
              const customerName = getCustomerDisplayName(ticket);

              return (
                <div
                  key={ticket.id}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                    isOverdue ? '' : 'bg-card'
                  }`}
                  style={
                    isOverdue
                      ? { borderColor: `${waitColor}60`, backgroundColor: `${waitColor}08` }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <TicketBadge ticketNumber={ticket.ticketNumber} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{customerName}</p>
                      <p className="text-xs text-muted-foreground">{ticket.serviceName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Wait time indicator */}
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" style={{ color: waitColor }} />
                      <span
                        className="text-xs font-semibold tabular-nums"
                        style={{ color: waitColor }}
                        suppressHydrationWarning
                      >
                        {formatWaitLabel(waitMinutes)}
                      </span>
                    </div>

                    {/* Call button */}
                    <button
                      type="button"
                      disabled={isCounterBusy || isOffDuty || callingTicketId === ticket.id}
                      onClick={() => handleCallTicket(ticket.id)}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {callingTicketId === ticket.id ? 'Calling...' : 'Call'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
