'use client';

// =============================================================================
// OfficerAssignment — client component to assign/unassign officers to a counter
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { UserPlus, UserX, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface AssignedOfficer {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userStatus: string;
  isOnDuty: boolean;
  currentStatus: string;
  notificationsEnabled: boolean;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
}

interface OfficerAssignmentProps {
  counterId: string;
}

export function OfficerAssignment({ counterId }: OfficerAssignmentProps) {
  const [officers, setOfficers] = useState<AssignedOfficer[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const fetchOfficers = useCallback(async () => {
    try {
      const res = await fetch(`/api/counters/${counterId}/officers`);
      if (!res.ok) throw new Error('Failed to load officers');
      const json = await res.json();
      setOfficers(json.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [counterId]);

  const fetchAvailableUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/counters/available-officers');
      if (res.ok) {
        const json = await res.json();
        setAvailableUsers(json.data ?? []);
      }
    } catch {
      // Non-critical - the select just won't have options preloaded
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchOfficers(), fetchAvailableUsers()]);
      setLoading(false);
    }
    load();
  }, [fetchOfficers, fetchAvailableUsers]);

  async function handleAssign() {
    if (!selectedUserId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/counters/${counterId}/officers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to assign officer');
        return;
      }
      toast.success('Officer assigned.');
      setSelectedUserId('');
      await fetchOfficers();
      await fetchAvailableUsers();
    } catch {
      toast.error('Network error.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(userId: string, userName: string) {
    try {
      const res = await fetch(
        `/api/counters/${counterId}/officers?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to unassign officer');
        return;
      }
      toast.success(`${userName} unassigned.`);
      await fetchOfficers();
      await fetchAvailableUsers();
    } catch {
      toast.error('Network error.');
    }
  }

  // Filter available users to those not already assigned
  const assignedUserIds = new Set(officers.map((o) => o.userId));
  const unassignedUsers = availableUsers.filter((u) => !assignedUserIds.has(u.id));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assigned Officers</CardTitle>
          <CardDescription>Loading…</CardDescription>
        </CardHeader>
        <CardContent>
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Officers</CardTitle>
        <CardDescription>
          Assign COUNTER_OFFICER users to this counter so they can serve tickets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </div>
        )}

        {/* Assign new officer */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Select value={selectedUserId} onValueChange={(v) => setSelectedUserId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Select an officer…" />
              </SelectTrigger>
              <SelectContent>
                {unassignedUsers.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    {availableUsers.length === 0
                      ? 'No COUNTER_OFFICER users available. Create a user with the COUNTER_OFFICER role first.'
                      : 'All COUNTER_OFFICER users are already assigned.'}
                  </div>
                )}
                {unassignedUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedUserId || assigning}
            size="sm"
          >
            {assigning ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UserPlus className="size-4" />
            )}
            <span className="ml-1.5">Assign</span>
          </Button>
        </div>

        {/* Assigned officers list */}
        {officers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No officers assigned yet. Assign one above.
          </p>
        ) : (
          <div className="space-y-2">
            {officers.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{o.userName}</p>
                  <p className="text-xs text-muted-foreground">{o.userEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.isOnDuty ? 'default' : 'secondary'}>
                    {o.isOnDuty ? 'On Duty' : 'Off Duty'}
                  </Badge>
                  <Badge variant="outline">{o.currentStatus}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(o.userId, o.userName)}
                  >
                    <UserX className="size-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
