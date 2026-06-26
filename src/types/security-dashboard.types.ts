// =============================================================================
// src/types/security-dashboard.types.ts — Security screen types (4.3.3)
// =============================================================================

// ---------------------------------------------------------------------------
// Event filter — the security screen only cares about broadcasts and replies
// ---------------------------------------------------------------------------

export const SECURITY_EVENT_FILTER = ['BROADCAST_MESSAGE', 'OFFICER_REPLY'] as const;

// ---------------------------------------------------------------------------
// localStorage key for read state persistence
// ---------------------------------------------------------------------------

export const READ_STATE_STORAGE_KEY = 'quems:security:broadcasts:read';

// ---------------------------------------------------------------------------
// Feed entry discriminated union
// ---------------------------------------------------------------------------

export interface BroadcastFeedEntry {
  type: 'BROADCAST';
  broadcastId: string;
  message: string;
  senderName: string;
  createdAt: string;
  expiresAt: string | null;
  isRead: boolean;
}

export interface OfficerReplyFeedEntry {
  type: 'OFFICER_REPLY';
  notificationId: string;
  replyId: string;
  repliedByOfficerName: string;
  repliedAt: string;
  isRead: boolean;
}

export type BroadcastEntry = BroadcastFeedEntry | OfficerReplyFeedEntry;

// ---------------------------------------------------------------------------
// Full dashboard data shape (returned by the server-side loader)
// ---------------------------------------------------------------------------

export interface SecurityDashboardData {
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  recentBroadcasts: BroadcastEntry[];
  /** The server doesn't track read state — client hydrates from localStorage. */
  initialReadBroadcastIds: string[];
}
