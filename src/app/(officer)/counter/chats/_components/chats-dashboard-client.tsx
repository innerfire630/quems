// =============================================================================
// src/app/(officer)/counter/chats/_components/chats-dashboard-client.tsx
// =============================================================================
// Client component for the Counter Manager's chat dashboard.
// Displays active and archived chats with real-time messaging.
// =============================================================================
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Search, Archive, User, Phone, Hash, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { useAudioUnlock } from '@/hooks/use-audio-unlock';
import { CounterAudioUnlockOverlay } from '@/components/counter/audio-unlock-overlay';
import { useChatUnread } from '@/hooks/use-chat-unread';

interface ChatListItem {
  ticketId: string;
  ticketNumber: string;
  displayNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  serviceName: string;
  lastMessage: {
    message: string;
    senderType: string;
    createdAt: string;
  } | null;
  messageCount: number;
}

interface ChatMessage {
  id: string;
  senderType: 'CUSTOMER' | 'STAFF';
  message: string;
  createdAt: string;
}

type TabType = 'active' | 'archived';

export function ChatsDashboardClient() {
  // Audio unlock overlay — persists across SPA navigation via module-scoped flag
  const { isAudioUnlocked } = useAudioUnlock();
  const { markAsRead, markAllAsRead, unreadByTicket } = useChatUnread();

  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [activeChats, setActiveChats] = useState<ChatListItem[]>([]);
  const [archivedChats, setArchivedChats] = useState<ChatListItem[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<ChatListItem | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear all unread badges when viewing the inbox
  useEffect(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // Fetch active chats
  const fetchActiveChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/active');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setActiveChats(json.data);
    } catch {
      // Best-effort
    }
  }, []);

  // Fetch archived chats
  const fetchArchivedChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/archived');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setArchivedChats(json.data.items);
    } catch {
      // Best-effort
    }
  }, []);

  // Fetch messages for a specific ticket
  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${ticketId}`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) setMessages(json.data.messages);
    } catch {
      // Best-effort
    }
  }, []);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchActiveChats(), fetchArchivedChats()]);
      setLoading(false);
    };
    load();
  }, [fetchActiveChats, fetchArchivedChats]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchActiveChats();
      if (selectedTicketId) fetchMessages(selectedTicketId);
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchActiveChats, fetchMessages, selectedTicketId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Select a chat
  const handleSelectChat = useCallback(
    (chat: ChatListItem) => {
      setSelectedTicketId(chat.ticketId);
      setSelectedTicket(chat);
      fetchMessages(chat.ticketId);
      // Mark this chat as read — removes it from sidebar badge count
      markAsRead(chat.ticketId, chat.messageCount);
    },
    [fetchMessages, markAsRead],
  );

  // Send a message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !selectedTicketId) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/chat/messages/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: selectedTicketId, message: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage('');
        await fetchMessages(selectedTicketId);
      }
    } catch {
      // Silently fail
    } finally {
      setIsSending(false);
    }
  };

  // Filter chats by search query
  const filterChats = (chats: ChatListItem[]) => {
    if (!searchQuery.trim()) return chats;
    const q = searchQuery.toLowerCase();
    return chats.filter(
      (c) =>
        c.ticketNumber.toLowerCase().includes(q) ||
        (c.customerName?.toLowerCase().includes(q) ?? false) ||
        (c.customerPhone?.includes(q) ?? false),
    );
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const currentChats = activeTab === 'active' ? activeChats : archivedChats;
  const filteredChats = filterChats(currentChats).sort((a, b) => {
    // Sort unread chats (with new customer messages) to the top
    const aUnread = unreadByTicket[a.ticketId] ?? 0;
    const bUnread = unreadByTicket[b.ticketId] ?? 0;
    return bUnread - aUnread;
  });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Show audio unlock overlay until user clicks to enable audio
  if (!isAudioUnlocked) {
    return <CounterAudioUnlockOverlay onUnlock={() => {}} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Chats" description="Customer-staff messaging" />
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Chats" description="Customer-staff messaging" />

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Left: Chat list — hidden on mobile when a conversation is open */}
        <div className={`w-full shrink-0 lg:w-80 ${selectedTicketId ? 'hidden lg:block' : ''}`}>
          <Card>
            <CardContent className="p-0">
              {/* Tabs */}
              <div className="flex border-b">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'active'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Active
                  {activeChats.length > 0 && (
                    <Badge variant="secondary" className="ml-1.5 text-xs">
                      {activeChats.length}
                    </Badge>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('archived')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === 'archived'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Archive className="mr-1 inline size-3.5" />
                  Archived
                </button>
              </div>

              {/* Search */}
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by ticket or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              </div>

              {/* Chat list */}
              <div className="max-h-[500px] overflow-y-auto">
                {filteredChats.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    <MessageCircle className="mx-auto mb-2 size-8 opacity-30" />
                    {searchQuery ? 'No chats match your search.' : 'No chats yet.'}
                  </div>
                ) : (
                  filteredChats.map((chat) => (
                    <button
                      key={chat.ticketId}
                      type="button"
                      onClick={() => handleSelectChat(chat)}
                      className={`flex w-full items-start gap-3 border-b p-3 text-left transition-colors hover:bg-accent/50 ${
                        selectedTicketId === chat.ticketId
                          ? 'bg-accent/30'
                          : (unreadByTicket[chat.ticketId] ?? 0) > 0
                            ? 'bg-primary/5 border-l-2 border-l-primary'
                            : ''
                      }`}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Hash className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">#{chat.ticketNumber}</span>
                          <Badge
                            variant={chat.status === 'CALLED' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {chat.status}
                          </Badge>
                        </div>
                        {chat.customerName && (
                          <p className="truncate text-xs text-muted-foreground">
                            {chat.customerName}
                          </p>
                        )}
                        {chat.lastMessage && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {chat.lastMessage.senderType === 'STAFF' ? 'You: ' : ''}
                            {chat.lastMessage.message}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {chat.lastMessage && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(chat.lastMessage.createdAt)}
                          </span>
                        )}
                        {(unreadByTicket[chat.ticketId] ?? 0) > 0 ? (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                            {unreadByTicket[chat.ticketId]}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            {chat.messageCount} msg{chat.messageCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Chat conversation — full width on mobile when selected */}
        <div className={`flex-1 min-w-0 ${selectedTicketId ? '' : 'hidden lg:block'}`}>
          {selectedTicketId && selectedTicket ? (
            <Card>
              <CardHeader className="border-b py-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 lg:hidden"
                    onClick={() => {
                      setSelectedTicketId(null);
                      setSelectedTicket(null);
                      setMessages([]);
                    }}
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">
                      #{selectedTicket.ticketNumber} — {selectedTicket.serviceName}
                    </CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {selectedTicket.customerName && (
                        <span className="flex items-center gap-1">
                          <User className="size-3" />
                          {selectedTicket.customerName}
                        </span>
                      )}
                      {selectedTicket.customerPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" />
                          {selectedTicket.customerPhone}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px]">
                        {selectedTicket.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <div className="flex flex-col" style={{ height: '400px' }}>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      No messages yet.
                    </p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderType === 'STAFF' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                          msg.senderType === 'STAFF'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p
                          className={`mt-1 text-xs ${
                            msg.senderType === 'STAFF'
                              ? 'text-primary-foreground/70'
                              : 'text-muted-foreground/70'
                          }`}
                        >
                          {msg.senderType === 'STAFF' ? 'You' : 'Customer'} ·{' '}
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="border-t p-3">
                  {selectedTicket.status === 'WAITING' || selectedTicket.status === 'CALLED' ? (
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
                      Ticket {selectedTicket.status.toLowerCase()} — Chat is read-only
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <MessageCircle className="mb-4 size-12 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">Select a chat</p>
                <p className="text-sm text-muted-foreground/70">
                  Choose a conversation from the list to view messages
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
