'use client';

// =============================================================================
// src/components/admin/audit-log-filters.tsx — Audit log filter controls (5.2.3)
// =============================================================================

import { useEffect, useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import type { AuditLogFilters } from '@/types/audit-log.types';

interface AuditLogFiltersProps {
  filters: AuditLogFilters;
  onChange: (filters: AuditLogFilters) => void;
}

const ENTITY_OPTIONS = ['User', 'Service', 'Counter', 'DisplayBoard', 'SystemSetting', 'Ticket'];
const ACTION_OPTIONS = [
  {
    label: 'User Actions',
    options: [
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DEACTIVATED',
      'USER_REACTIVATED',
      'PASSWORD_RESET_BY_ADMIN',
      'ROLE_ASSIGNED',
      'ROLE_REMOVED',
    ],
  },
  {
    label: 'Service Actions',
    options: ['SERVICE_CREATED', 'SERVICE_UPDATED', 'SERVICE_DEACTIVATED'],
  },
  {
    label: 'Counter Actions',
    options: [
      'COUNTER_CREATED',
      'COUNTER_UPDATED',
      'COUNTER_DEACTIVATED',
      'COUNTER_STATUS_CHANGED',
    ],
  },
  {
    label: 'Assignment Actions',
    options: ['SERVICE_ASSIGNED_TO_COUNTER', 'SERVICE_UNASSIGNED_FROM_COUNTER'],
  },
  {
    label: 'Display Board',
    options: [
      'DISPLAY_BOARD_CREATED',
      'DISPLAY_BOARD_UPDATED',
      'DISPLAY_BOARD_DELETED',
      'DISPLAY_BOARD_DEFAULT_CHANGED',
    ],
  },
  { label: 'Reports', options: ['REPORT_GENERATED', 'REPORT_EXPORTED'] },
  { label: 'Security', options: ['AUDIT_LOG_VIEWED', 'SYSTEM_SETTING_CHANGED'] },
  {
    label: 'Notifications',
    options: [
      'DEVICE_TOKEN_REGISTERED',
      'DEVICE_TOKEN_REMOVED',
      'NOTIFICATION_DISPATCHED',
      'NOTIFICATION_FAILED',
      'NOTIFICATIONS_TOGGLED',
      'NOTIFICATION_REPLIED',
      'BROADCAST_MESSAGE_SENT',
    ],
  },
];

export function AuditLogFilters({ filters, onChange }: AuditLogFiltersProps) {
  const [localStartDate, setLocalStartDate] = useState(
    filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : '',
  );
  const [localEndDate, setLocalEndDate] = useState(
    filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : '',
  );

  // Debounce date changes by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({
        ...filters,
        startDate: localStartDate ? new Date(localStartDate) : undefined,
        endDate: localEndDate ? new Date(localEndDate) : undefined,
      });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localStartDate, localEndDate]);

  const handleReset = useCallback(() => {
    setLocalStartDate('');
    setLocalEndDate('');
    onChange({});
  }, [onChange]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Action</label>
        <Select
          value={filters.action ?? 'all'}
          onValueChange={(v) =>
            onChange({
              ...filters,
              action: v === 'all' ? undefined : (v as AuditLogFilters['action']),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {ACTION_OPTIONS.map((group) => (
              <div key={group.label}>
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </div>
                {group.options.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Entity</label>
        <Select
          value={filters.entity ?? 'all'}
          onValueChange={(v) =>
            onChange({ ...filters, entity: v === 'all' ? undefined : v || undefined })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {ENTITY_OPTIONS.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">Start Date</label>
        <Input
          type="date"
          className="w-[160px]"
          value={localStartDate}
          onChange={(e) => setLocalStartDate(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-muted-foreground">End Date</label>
        <Input
          type="date"
          className="w-[160px]"
          value={localEndDate}
          onChange={(e) => setLocalEndDate(e.target.value)}
        />
      </div>

      <Button variant="ghost" size="sm" onClick={handleReset} className="h-9">
        <RotateCcw className="mr-1 size-3" />
        Reset
      </Button>
    </div>
  );
}
