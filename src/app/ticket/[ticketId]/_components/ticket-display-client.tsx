// =============================================================================
// src/app/ticket/[ticketId]/_components/ticket-display-client.tsx
// =============================================================================
// Client component for mobile ticket display with live chat widget.
// Shows real-time ticket status and allows text-only chat.
// Chat is disabled when ticket status is SERVED/COMPLETED/etc.
// =============================================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { MessageCircle, Send, Clock, Ticket, Hash, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TicketData {
  id: string;
  ticketNumber: string;
  displayNumber: number;
  status: string;
  customerName: string | null;
  serviceName: string;
  serviceCode: string;
  counterName: string | null;
  counterNumber: number | null;
  waitPosition: number;
  estimatedWaitMinutes: number | null;
  issuedAt: string;
  calledAt: string | null;
}

interface ChatMessage {
  id: string;
  senderType: 'CUSTOMER' | 'STAFF';
  message: string;
  createdAt: string;
}

interface TicketDisplayClientProps {
  ticket: TicketData;
  ticketsAhead: number;
  brandName?: string;
}

const ACTIVE_STATUSES = ['WAITING', 'CALLED'];

function getStatusBadge(status: string) {
  switch (status) {
    case 'WAITING':
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          Waiting
        </Badge>
      );
    case 'CALLED':
      return <Badge className="bg-green-100 text-green-800">Called</Badge>;
    case 'SERVING':
      return <Badge className="bg-blue-100 text-blue-800">Being Served</Badge>;
    case 'COMPLETED':
      return <Badge variant="outline">Completed</Badge>;
    case 'NO_SHOW':
      return <Badge variant="destructive">No Show</Badge>;
    case 'CANCELLED':
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function TicketDisplayClient({ ticket, ticketsAhead, brandName }: TicketDisplayClientProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(ticket.status);
  const mounted = true;
  const [unreadCount, setUnreadCount] = useState(0);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isChatActive = ACTIVE_STATUSES.includes(currentStatus);

  // Poll for ticket status and chat messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/messages/${ticket.id}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        const newMessages = json.data.messages as ChatMessage[];

        // Detect new staff messages by comparing against known IDs
        if (!chatOpen) {
          let newCount = 0;
          for (const m of newMessages) {
            if (m.senderType === 'STAFF' && !knownIdsRef.current.has(m.id)) {
              newCount++;
            }
          }
          if (newCount > 0) {
            setUnreadCount((c) => c + newCount);
          }
        }

        // Update known IDs with ALL messages (so they're never counted again)
        for (const m of newMessages) {
          knownIdsRef.current.add(m.id);
        }

        setMessages(newMessages);
        setCurrentStatus(json.data.ticketStatus);
      }
    } catch {
      // Best-effort polling
    }
  }, [ticket.id, chatOpen]);

  useEffect(() => {
    // Initial fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect -- polling external API
    void fetchMessages();

    // Poll every 3 seconds for updates
    pollRef.current = setInterval(fetchMessages, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Stop polling when ticket is no longer active
  useEffect(() => {
    if (!isChatActive && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [isChatActive]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !isChatActive) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, message: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage('');
        // Immediately fetch updated messages
        await fetchMessages();
      }
    } catch {
      // Silently fail
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-12">
      {/* Header */}
      <div className="border-b bg-zinc-800 px-4 py-2 text-center">
        <h1 className="text-sm font-medium text-white">{ticket.serviceName}</h1>
      </div>

      {/* Ticket Info — shrinks when chat is open */}
      <div
        className={`flex flex-col px-4 mx-auto w-full max-w-md transition-all duration-300 ${chatOpen ? 'pt-2 pb-1' : 'pt-4 pb-3'}`}
      >
        <Card
          className={`w-full relative overflow-hidden transition-all duration-300 ${chatOpen ? 'py-0' : ''}`}
        >
          {/* Subtle background icon — top right (hidden when compact) */}
          {!chatOpen && (
            <Ticket
              className="pointer-events-none absolute -top-6 -right-4 size-40 text-primary"
              style={{ opacity: 0.06 }}
              aria-hidden
            />
          )}

          {/* Compact view when chat is open */}
          {chatOpen ? (
            <CardContent className="flex items-center justify-between py-2 px-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">{ticket.ticketNumber}</span>
                {ticket.customerName && (
                  <span className="text-sm text-muted-foreground">{ticket.customerName}</span>
                )}
              </div>
              <div className="flex items-center gap-2">{getStatusBadge(currentStatus)}</div>
            </CardContent>
          ) : (
            /* Full view when chat is closed */
            <>
              <CardHeader className="text-center py-4">
                <CardTitle className="text-muted-foreground text-sm font-normal">
                  Your Ticket
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center px-6">
                {/* Ticket number */}
                <div className="flex justify-center">
                  <span className="text-7xl font-bold text-primary">{ticket.ticketNumber}</span>
                </div>

                {/* Customer name */}
                {ticket.customerName && (
                  <p className="text-lg text-foreground">{ticket.customerName}</p>
                )}

                {/* Status */}
                <div className="flex justify-center">{getStatusBadge(currentStatus)}</div>

                {/* Called to counter */}
                {currentStatus === 'CALLED' && ticket.counterName && (
                  <div className="rounded-lg bg-green-50 p-3 text-green-800">
                    <p className="font-semibold">Please proceed to:</p>
                    <p className="text-xl font-bold">
                      Counter {ticket.counterNumber ?? ''} — {ticket.counterName}
                    </p>
                  </div>
                )}

                {/* Queue info (only for WAITING) */}
                {currentStatus === 'WAITING' && (
                  <div className="space-y-2 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Hash className="size-4" />
                      <span>
                        {ticketsAhead === 0
                          ? 'You are next!'
                          : `${ticketsAhead} ticket${ticketsAhead !== 1 ? 's' : ''} ahead`}
                      </span>
                    </div>
                    {ticket.estimatedWaitMinutes !== null && (
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="size-4" />
                        <span>~{ticket.estimatedWaitMinutes} min estimated wait</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Served notice */}
                {!isChatActive && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="size-4" />
                    <span className="text-sm">
                      {currentStatus === 'SERVING'
                        ? 'Your ticket is being served'
                        : currentStatus === 'COMPLETED'
                          ? 'Service completed. Thank you!'
                          : `Ticket ${currentStatus.toLowerCase()}`}
                    </span>
                  </div>
                )}

                {/* Dynamic QR (client-only to avoid SSR hydration mismatch) */}
                {mounted && (
                  <div className="pt-2">
                    <QRCodeSVG
                      value={`${window.location.origin}/ticket/${ticket.id}`}
                      size={130}
                      level="M"
                      className="mx-auto"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Scan to track & chat</p>
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>

        {/* Chat Button — directly under the ticket card */}
        <div className="w-full mt-3">
          <button
            type="button"
            onClick={() => {
              const opening = !chatOpen;
              setChatOpen(opening);
              if (opening) {
                setUnreadCount(0);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium text-card-foreground shadow-sm transition-colors hover:bg-accent active:scale-[0.98]"
          >
            <MessageCircle className="size-4" />
            Chat with Staff
            {unreadCount > 0 && !chatOpen && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white animate-pulse">
                {unreadCount}
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{chatOpen ? '▲' : '▼'}</span>
          </button>

          {/* Chat panel — fills remaining screen when open */}
          {chatOpen && (
            <Card className="mt-2">
              <div
                className="flex flex-col"
                style={{ height: 'calc(100vh - 180px)', maxHeight: '500px' }}
              >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No messages yet. Start a conversation!
                    </p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'CUSTOMER' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.senderType === 'CUSTOMER'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p
                          className={`mt-1 text-xs ${
                            msg.senderType === 'CUSTOMER'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground/70'
                          }`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="border-t p-3">
                  {isChatActive ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value.slice(0, 500))}
                        maxLength={500}
                        disabled={isSending}
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
                        <Send className="size-4" />
                      </Button>
                    </form>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      Ticket {currentStatus.toLowerCase()} — Chat ended
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Brand footer — fixed at bottom */}
      {brandName && (
        <div className="fixed bottom-0 inset-x-0 border-t bg-zinc-800 px-4 py-2.5 text-center z-50">
          <p className="text-sm font-medium text-white tracking-wide">{brandName}</p>
        </div>
      )}
    </div>
  );
}
