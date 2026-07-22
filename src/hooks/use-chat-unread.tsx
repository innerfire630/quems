// =============================================================================
// src/hooks/use-chat-unread.tsx — Chat unread tracking context
// =============================================================================
// Tracks which chats have unread customer messages.  Uses localStorage to
// persist the "last seen" message count per ticket across page navigations.
//
// Used by:
//   - OfficerSidebar: shows total unread badge
//   - ChatsDashboardClient: calls markAsRead() when conversation is opened
// =============================================================================

'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'quems_chat_last_seen';

interface LastSeenMap {
  [ticketId: string]: number; // last seen message count
}

interface ChatUnreadContextValue {
  /** Total number of chats with unread customer messages */
  totalUnread: number;
  /** Per-ticket unread count (number of new customer messages since last viewed) */
  unreadByTicket: Record<string, number>;
  /** Mark a specific chat as read (call when officer opens the conversation) */
  markAsRead: (ticketId: string, messageCount: number) => void;
  /** Mark all chats as read (call when officer visits the chat inbox page) */
  markAllAsRead: () => void;
}

const ChatUnreadContext = createContext<ChatUnreadContextValue>({
  totalUnread: 0,
  unreadByTicket: {},
  markAsRead: () => {},
  markAllAsRead: () => {},
});

export function ChatUnreadProvider({ children }: { children: ReactNode }) {
  const [totalUnread, setTotalUnread] = useState(0);
  const [unreadByTicket, setUnreadByTicket] = useState<Record<string, number>>({});
  const lastSeenRef = useRef<LastSeenMap>({});

  // Load last-seen map from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        lastSeenRef.current = JSON.parse(stored) as LastSeenMap;
      }
    } catch {
      // Corrupted storage — start fresh
    }
  }, []);

  // Poll active chats and compute unread count
  useEffect(() => {
    let cancelled = false;

    async function checkUnread() {
      try {
        const res = await fetch('/api/chat/active');
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || !json.success || !Array.isArray(json.data)) return;

        const chats = json.data as Array<{
          ticketId: string;
          messageCount: number;
          lastMessage: { senderType: string } | null;
        }>;

        let unread = 0;
        const byTicket: Record<string, number> = {};
        for (const chat of chats) {
          const lastSeen = lastSeenRef.current[chat.ticketId] ?? 0;
          const diff = chat.messageCount - lastSeen;
          // Chat is unread if there are new messages and latest is from customer
          if (diff > 0 && chat.lastMessage?.senderType === 'CUSTOMER') {
            unread++;
            byTicket[chat.ticketId] = diff;
          }
        }

        setTotalUnread(unread);
        setUnreadByTicket(byTicket);
      } catch {
        // Best-effort
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const markAsRead = useCallback((ticketId: string, messageCount: number) => {
    lastSeenRef.current[ticketId] = messageCount;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lastSeenRef.current));
    } catch {
      // localStorage full — ignore
    }

    // Optimistic update — clear this ticket's unread
    setTotalUnread((prev) => Math.max(0, prev - 1));
    setUnreadByTicket((prev) => {
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    // Clear all unread — the officer is viewing the inbox
    setTotalUnread(0);
    setUnreadByTicket({});
  }, []);

  return (
    <ChatUnreadContext.Provider value={{ totalUnread, unreadByTicket, markAsRead, markAllAsRead }}>
      {children}
    </ChatUnreadContext.Provider>
  );
}

export function useChatUnread(): ChatUnreadContextValue {
  return useContext(ChatUnreadContext);
}
