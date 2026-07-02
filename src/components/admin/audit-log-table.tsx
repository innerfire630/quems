'use client';

// =============================================================================
// src/components/admin/audit-log-table.tsx — Audit log entries table (5.2.3)
// =============================================================================

import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AuditLogEntry } from '@/types/audit-log.types';

interface AuditLogTableProps {
  entries: AuditLogEntry[];
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(date));
}

function truncateCuid(cuid: string): string {
  return cuid.slice(0, 8) + '...';
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Silently fail
  }
}

function MetadataViewer({ metadata }: { metadata: unknown }) {
  const [expanded, setExpanded] = useState(false);

  if (!metadata) return <span className="text-muted-foreground">—</span>;

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronUp className="mr-1 size-3" /> : <ChevronDown className="mr-1 size-3" />}
        {expanded ? 'Hide' : 'Show'} details
      </Button>
      {expanded && (
        <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    USER_CREATED: 'bg-green-500/10 text-green-600',
    USER_UPDATED: 'bg-blue-500/10 text-blue-600',
    USER_DEACTIVATED: 'bg-red-500/10 text-red-600',
    USER_REACTIVATED: 'bg-green-500/10 text-green-600',
    PASSWORD_RESET_BY_ADMIN: 'bg-orange-500/10 text-orange-600',
    PASSWORD_CHANGED: 'bg-orange-500/10 text-orange-600',
    ROLE_ASSIGNED: 'bg-blue-500/10 text-blue-600',
    ROLE_REMOVED: 'bg-red-500/10 text-red-600',
    SERVICE_CREATED: 'bg-green-500/10 text-green-600',
    SERVICE_UPDATED: 'bg-blue-500/10 text-blue-600',
    SERVICE_DEACTIVATED: 'bg-red-500/10 text-red-600',
    COUNTER_CREATED: 'bg-green-500/10 text-green-600',
    COUNTER_UPDATED: 'bg-blue-500/10 text-blue-600',
    COUNTER_DEACTIVATED: 'bg-red-500/10 text-red-600',
    COUNTER_STATUS_CHANGED: 'bg-amber-500/10 text-amber-600',
    OFFICER_ASSIGNED_TO_COUNTER: 'bg-blue-500/10 text-blue-600',
    OFFICER_UNASSIGNED_FROM_COUNTER: 'bg-red-500/10 text-red-600',
    SERVICE_ASSIGNED_TO_COUNTER: 'bg-blue-500/10 text-blue-600',
    SERVICE_UNASSIGNED_FROM_COUNTER: 'bg-red-500/10 text-red-600',
    DISPLAY_BOARD_CREATED: 'bg-green-500/10 text-green-600',
    DISPLAY_BOARD_UPDATED: 'bg-blue-500/10 text-blue-600',
    DISPLAY_BOARD_DELETED: 'bg-red-500/10 text-red-600',
    REPORT_GENERATED: 'bg-purple-500/10 text-purple-600',
    REPORT_EXPORTED: 'bg-purple-500/10 text-purple-600',
    SYSTEM_SETTING_CHANGED: 'bg-amber-500/10 text-amber-600',
    NOTIFICATION_DISPATCHED: 'bg-blue-500/10 text-blue-600',
    NOTIFICATION_FAILED: 'bg-red-500/10 text-red-600',
    BROADCAST_MESSAGE_SENT: 'bg-purple-500/10 text-purple-600',
    DEVICE_TOKEN_REGISTERED: 'bg-green-500/10 text-green-600',
    DEVICE_TOKEN_REMOVED: 'bg-red-500/10 text-red-600',
  };

  const colorClass = colors[action] ?? 'bg-secondary text-secondary-foreground';

  return (
    <Badge variant="outline" className={`text-xs font-mono ${colorClass}`}>
      {action}
    </Badge>
  );
}

export function AuditLogTable({ entries }: AuditLogTableProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-muted-foreground">
        No audit log entries match the filters.
      </div>
    );
  }

  return (
    <>
      {/* Card layout — visible on small screens */}
      <div className="space-y-2 md:hidden">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <ActionBadge action={entry.action} />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {formatTimestamp(entry.createdAt)}
              </span>
            </div>
            {entry.userName ? (
              <div>
                <p className="text-sm font-medium">{entry.userName}</p>
                {entry.userEmail && (
                  <p className="text-xs text-muted-foreground">{entry.userEmail}</p>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">System</span>
            )}
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">{entry.entity}</span>
              {entry.entityId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1"
                  onClick={() => copyToClipboard(entry.entityId!)}
                  title="Copy entity ID"
                >
                  <span className="font-mono text-muted-foreground">
                    {truncateCuid(entry.entityId)}
                  </span>
                  <Copy className="ml-1 size-3 text-muted-foreground" />
                </Button>
              )}
            </div>
            <MetadataViewer metadata={entry.metadata} />
          </div>
        ))}
      </div>

      {/* Table layout — visible on md+ screens */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(entry.createdAt)}
                </TableCell>
                <TableCell>
                  {entry.userName ? (
                    <div>
                      <p className="text-sm font-medium">{entry.userName}</p>
                      {entry.userEmail && (
                        <p className="text-xs text-muted-foreground">{entry.userEmail}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">System</span>
                  )}
                </TableCell>
                <TableCell>
                  <ActionBadge action={entry.action} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{entry.entity}</span>
                    {entry.entityId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1"
                        onClick={() => copyToClipboard(entry.entityId!)}
                        title="Copy entity ID"
                      >
                        <span className="text-xs text-muted-foreground font-mono">
                          {truncateCuid(entry.entityId)}
                        </span>
                        <Copy className="ml-1 size-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <MetadataViewer metadata={entry.metadata} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
