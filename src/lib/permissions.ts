// =============================================================================
// src/lib/permissions.ts — RBAC permission & role catalogue (1.3.1)
// =============================================================================
// Single source of truth for every permission string, role name, and the
// role-to-permission mapping. Imported by the seed script, guard functions,
// client hooks, <Can> component, middleware, and every protected route.
//
// References: Master Plan §10.4 (RBAC Permission List)
// =============================================================================

// ---------------------------------------------------------------------------
// Permission string constants — grouped by module (Master Plan §10.4)
// ---------------------------------------------------------------------------

// Module: USER
export const PERMISSION_USER_READ = 'user:read' as const;
export const PERMISSION_USER_CREATE = 'user:create' as const;
export const PERMISSION_USER_UPDATE = 'user:update' as const;
export const PERMISSION_USER_DELETE = 'user:delete' as const;
export const PERMISSION_USER_MANAGE = 'user:manage' as const;

// Module: COUNTER
export const PERMISSION_COUNTER_READ = 'counter:read' as const;
export const PERMISSION_COUNTER_CREATE = 'counter:create' as const;
export const PERMISSION_COUNTER_UPDATE = 'counter:update' as const;
export const PERMISSION_COUNTER_DELETE = 'counter:delete' as const;
export const PERMISSION_COUNTER_MANAGE = 'counter:manage' as const;
export const PERMISSION_COUNTER_CALL = 'counter:call' as const;
export const PERMISSION_COUNTER_CLOSE = 'counter:close' as const;

// Module: SERVICE
export const PERMISSION_SERVICE_READ = 'service:read' as const;
export const PERMISSION_SERVICE_CREATE = 'service:create' as const;
export const PERMISSION_SERVICE_UPDATE = 'service:update' as const;
export const PERMISSION_SERVICE_DELETE = 'service:delete' as const;
export const PERMISSION_SERVICE_MANAGE = 'service:manage' as const;

// Module: TICKET
export const PERMISSION_TICKET_ISSUE = 'ticket:issue' as const;
export const PERMISSION_TICKET_VIEW = 'ticket:view' as const;
export const PERMISSION_TICKET_MANAGE = 'ticket:manage' as const;

// Module: NOTIFICATION
export const PERMISSION_NOTIFICATION_TOGGLE = 'notification:toggle' as const;
export const PERMISSION_NOTIFICATION_REPLY = 'notification:reply' as const;
export const PERMISSION_NOTIFICATION_BROADCAST = 'notification:broadcast' as const;

// Module: REPORT
export const PERMISSION_REPORT_VIEW = 'report:view' as const;
export const PERMISSION_REPORT_EXPORT = 'report:export' as const;

// Module: SYSTEM
export const PERMISSION_SYSTEM_CONFIGURE = 'system:configure' as const;
export const PERMISSION_SYSTEM_AUDIT = 'system:audit' as const;

// Module: CHAT
export const PERMISSION_CHAT_READ = 'chat:read' as const;
export const PERMISSION_CHAT_SEND = 'chat:send' as const;
export const PERMISSION_CHAT_MANAGE = 'chat:manage' as const;

// ---------------------------------------------------------------------------
// Role name constants
// ---------------------------------------------------------------------------

export const ROLE_ADMIN = 'ADMIN' as const;
export const ROLE_COUNTER_OFFICER = 'COUNTER_OFFICER' as const;

/** Object form for iteration. */
export const ROLE = {
  ADMIN: ROLE_ADMIN,
  COUNTER_OFFICER: ROLE_COUNTER_OFFICER,
} as const;

// ---------------------------------------------------------------------------
// TypeScript types derived from the constants
// ---------------------------------------------------------------------------

export type Permission =
  | typeof PERMISSION_USER_READ
  | typeof PERMISSION_USER_CREATE
  | typeof PERMISSION_USER_UPDATE
  | typeof PERMISSION_USER_DELETE
  | typeof PERMISSION_USER_MANAGE
  | typeof PERMISSION_COUNTER_READ
  | typeof PERMISSION_COUNTER_CREATE
  | typeof PERMISSION_COUNTER_UPDATE
  | typeof PERMISSION_COUNTER_DELETE
  | typeof PERMISSION_COUNTER_MANAGE
  | typeof PERMISSION_COUNTER_CALL
  | typeof PERMISSION_COUNTER_CLOSE
  | typeof PERMISSION_SERVICE_READ
  | typeof PERMISSION_SERVICE_CREATE
  | typeof PERMISSION_SERVICE_UPDATE
  | typeof PERMISSION_SERVICE_DELETE
  | typeof PERMISSION_SERVICE_MANAGE
  | typeof PERMISSION_TICKET_ISSUE
  | typeof PERMISSION_TICKET_VIEW
  | typeof PERMISSION_TICKET_MANAGE
  | typeof PERMISSION_NOTIFICATION_TOGGLE
  | typeof PERMISSION_NOTIFICATION_REPLY
  | typeof PERMISSION_NOTIFICATION_BROADCAST
  | typeof PERMISSION_REPORT_VIEW
  | typeof PERMISSION_REPORT_EXPORT
  | typeof PERMISSION_SYSTEM_CONFIGURE
  | typeof PERMISSION_SYSTEM_AUDIT
  | typeof PERMISSION_CHAT_READ
  | typeof PERMISSION_CHAT_SEND
  | typeof PERMISSION_CHAT_MANAGE;

export type Role = typeof ROLE_ADMIN | typeof ROLE_COUNTER_OFFICER;

// ---------------------------------------------------------------------------
// Helper arrays (for iteration in seed / UI)
// ---------------------------------------------------------------------------

/** Every permission string in the system. */
export const ALL_PERMISSIONS: Permission[] = [
  PERMISSION_USER_READ,
  PERMISSION_USER_CREATE,
  PERMISSION_USER_UPDATE,
  PERMISSION_USER_DELETE,
  PERMISSION_USER_MANAGE,
  PERMISSION_COUNTER_READ,
  PERMISSION_COUNTER_CREATE,
  PERMISSION_COUNTER_UPDATE,
  PERMISSION_COUNTER_DELETE,
  PERMISSION_COUNTER_MANAGE,
  PERMISSION_COUNTER_CALL,
  PERMISSION_COUNTER_CLOSE,
  PERMISSION_SERVICE_READ,
  PERMISSION_SERVICE_CREATE,
  PERMISSION_SERVICE_UPDATE,
  PERMISSION_SERVICE_DELETE,
  PERMISSION_SERVICE_MANAGE,
  PERMISSION_TICKET_ISSUE,
  PERMISSION_TICKET_VIEW,
  PERMISSION_TICKET_MANAGE,
  PERMISSION_NOTIFICATION_TOGGLE,
  PERMISSION_NOTIFICATION_REPLY,
  PERMISSION_NOTIFICATION_BROADCAST,
  PERMISSION_REPORT_VIEW,
  PERMISSION_REPORT_EXPORT,
  PERMISSION_SYSTEM_CONFIGURE,
  PERMISSION_SYSTEM_AUDIT,
  PERMISSION_CHAT_READ,
  PERMISSION_CHAT_SEND,
  PERMISSION_CHAT_MANAGE,
];

/** Every role name in the system. */
export const ALL_ROLES: Role[] = [ROLE_ADMIN, ROLE_COUNTER_OFFICER];

// ---------------------------------------------------------------------------
// Role-to-permission mapping (Master Plan §10.4)
// ---------------------------------------------------------------------------

/**
 * The authoritative source for which permissions each role has.
 * Every entry must use only permission constants and role constants defined above.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLE_ADMIN]: ALL_PERMISSIONS,

  [ROLE_COUNTER_OFFICER]: [
    PERMISSION_COUNTER_READ,
    PERMISSION_COUNTER_CALL,
    PERMISSION_COUNTER_CLOSE,
    PERMISSION_TICKET_VIEW,
    PERMISSION_NOTIFICATION_TOGGLE,
    PERMISSION_NOTIFICATION_REPLY,
    PERMISSION_CHAT_READ,
    PERMISSION_CHAT_SEND,
  ],
};

// ---------------------------------------------------------------------------
// Human-readable permission descriptions (used in UI)
// ---------------------------------------------------------------------------

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [PERMISSION_USER_READ]: 'View user list and user details',
  [PERMISSION_USER_CREATE]: 'Create new users',
  [PERMISSION_USER_UPDATE]: 'Edit existing users',
  [PERMISSION_USER_DELETE]: 'Deactivate users',
  [PERMISSION_USER_MANAGE]: 'Full user management including password resets',
  [PERMISSION_COUNTER_READ]: 'View counter list and details',
  [PERMISSION_COUNTER_CREATE]: 'Create new counters',
  [PERMISSION_COUNTER_UPDATE]: 'Edit existing counters',
  [PERMISSION_COUNTER_DELETE]: 'Delete counters',
  [PERMISSION_COUNTER_MANAGE]: 'Full counter management',
  [PERMISSION_COUNTER_CALL]: 'Call tickets at a counter',
  [PERMISSION_COUNTER_CLOSE]: 'Close and reopen a counter',
  [PERMISSION_SERVICE_READ]: 'View service list and details',
  [PERMISSION_SERVICE_CREATE]: 'Create new services',
  [PERMISSION_SERVICE_UPDATE]: 'Edit existing services',
  [PERMISSION_SERVICE_DELETE]: 'Delete services',
  [PERMISSION_SERVICE_MANAGE]: 'Full service management',
  [PERMISSION_TICKET_ISSUE]: 'Issue queue tickets from a kiosk',
  [PERMISSION_TICKET_VIEW]: 'View queue tickets',
  [PERMISSION_TICKET_MANAGE]: 'Manage tickets (transfer, cancel, etc.)',
  [PERMISSION_NOTIFICATION_TOGGLE]: 'Toggle notification preferences',
  [PERMISSION_NOTIFICATION_REPLY]: 'Reply to notifications',
  [PERMISSION_NOTIFICATION_BROADCAST]: 'Send broadcast messages to displays',
  [PERMISSION_REPORT_VIEW]: 'View reports and analytics',
  [PERMISSION_REPORT_EXPORT]: 'Export reports',
  [PERMISSION_SYSTEM_CONFIGURE]: 'Configure system-level settings',
  [PERMISSION_SYSTEM_AUDIT]: 'View audit logs',
  [PERMISSION_CHAT_READ]: 'View chat messages for tickets',
  [PERMISSION_CHAT_SEND]: 'Send chat messages to customers',
  [PERMISSION_CHAT_MANAGE]: 'Manage chat retention and cleanup settings',
};

// ---------------------------------------------------------------------------
// Permissions grouped by module (used for display in UI)
// ---------------------------------------------------------------------------

export const PERMISSION_MODULES: Record<string, Permission[]> = {
  USER: [
    PERMISSION_USER_READ,
    PERMISSION_USER_CREATE,
    PERMISSION_USER_UPDATE,
    PERMISSION_USER_DELETE,
    PERMISSION_USER_MANAGE,
  ],
  COUNTER: [
    PERMISSION_COUNTER_READ,
    PERMISSION_COUNTER_CREATE,
    PERMISSION_COUNTER_UPDATE,
    PERMISSION_COUNTER_DELETE,
    PERMISSION_COUNTER_MANAGE,
    PERMISSION_COUNTER_CALL,
    PERMISSION_COUNTER_CLOSE,
  ],
  SERVICE: [
    PERMISSION_SERVICE_READ,
    PERMISSION_SERVICE_CREATE,
    PERMISSION_SERVICE_UPDATE,
    PERMISSION_SERVICE_DELETE,
    PERMISSION_SERVICE_MANAGE,
  ],
  TICKET: [PERMISSION_TICKET_ISSUE, PERMISSION_TICKET_VIEW, PERMISSION_TICKET_MANAGE],
  NOTIFICATION: [
    PERMISSION_NOTIFICATION_TOGGLE,
    PERMISSION_NOTIFICATION_REPLY,
    PERMISSION_NOTIFICATION_BROADCAST,
  ],
  REPORT: [PERMISSION_REPORT_VIEW, PERMISSION_REPORT_EXPORT],
  SYSTEM: [PERMISSION_SYSTEM_CONFIGURE, PERMISSION_SYSTEM_AUDIT],
  CHAT: [PERMISSION_CHAT_READ, PERMISSION_CHAT_SEND, PERMISSION_CHAT_MANAGE],
};

// ---------------------------------------------------------------------------
// Role descriptions (used in seed and UI)
// ---------------------------------------------------------------------------

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLE_ADMIN]:
    'Full system access. Manages users, services, counters, reports, and system settings.',
  [ROLE_COUNTER_OFFICER]:
    'Operates a counter: calls tickets, closes counters, receives notifications.',
};
