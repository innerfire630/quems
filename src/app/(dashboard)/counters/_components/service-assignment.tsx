'use client';

// =============================================================================
// ServiceAssignment — client component to assign/unassign services to a counter
// Styled to match OfficerAssignment
// =============================================================================

import { useState, useCallback } from 'react';
import { Plus, X, Loader2, AlertTriangle } from 'lucide-react';
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

interface AssignedService {
  id: string;
  serviceId: string;
  service: {
    id: string;
    name: string;
    code: string;
    ticketPrefix: string;
    isActive: boolean;
  };
}

interface AvailableService {
  id: string;
  name: string;
  code: string;
  ticketPrefix: string;
  isActive: boolean;
}

interface ServiceAssignmentProps {
  counterId: string;
  initialAssigned: AssignedService[];
  availableServices: AvailableService[];
}

export function ServiceAssignment({
  counterId,
  initialAssigned,
  availableServices,
}: ServiceAssignmentProps) {
  const [assigned, setAssigned] = useState<AssignedService[]>(initialAssigned);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [lastSelectedId, setLastSelectedId] = useState('');
  const [selectKey, setSelectKey] = useState(0);

  const fetchAssigned = useCallback(async () => {
    try {
      const res = await fetch(`/api/counters/${counterId}/services`);
      if (!res.ok) throw new Error('Failed to load services');
      const json = await res.json();
      setAssigned(json.data ?? []);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [counterId]);

  async function handleAssign() {
    if (!lastSelectedId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/counters/${counterId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: lastSelectedId }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to assign service');
        return;
      }
      toast.success('Service assigned.');
      setLastSelectedId('');
      setSelectKey((k) => k + 1);
      await fetchAssigned();
    } catch {
      toast.error('Network error.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(serviceId: string, serviceName: string) {
    try {
      const res = await fetch(`/api/counters/${counterId}/services/${serviceId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to unassign service');
        return;
      }
      toast.success(`${serviceName} unassigned.`);
      await fetchAssigned();
    } catch {
      toast.error('Network error.');
    }
  }

  const assignedIds = new Set(assigned.map((a) => a.serviceId));
  const unassigned = availableServices.filter((s) => !assignedIds.has(s.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assigned Services</CardTitle>
        <CardDescription>
          Assign services to this counter so tickets can be issued for them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertTriangle className="size-4" />
            {error}
          </div>
        )}

        {/* Assign new service */}
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Select
              key={selectKey}
              items={unassigned.map((s) => ({ value: s.id, label: s.name }))}
              onValueChange={(v) => setLastSelectedId(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a service…" />
              </SelectTrigger>
              <SelectContent>
                {unassigned.length === 0 && (
                  <div className="px-2 py-3 text-sm text-muted-foreground">
                    {availableServices.length === 0
                      ? 'No services available. Create a service first.'
                      : 'All services are already assigned.'}
                  </div>
                )}
                {unassigned.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!lastSelectedId || assigning}
            size="sm"
          >
            {assigning ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            <span className="ml-1.5">Assign</span>
          </Button>
        </div>

        {/* Assigned services list */}
        {assigned.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No services assigned yet. Assign one above.
          </p>
        ) : (
          <div className="space-y-2">
            {assigned.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{a.service.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.service.code} — Prefix: {a.service.ticketPrefix}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={a.service.isActive ? 'default' : 'secondary'}>
                    {a.service.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(a.serviceId, a.service.name)}
                  >
                    <X className="size-4 text-muted-foreground hover:text-destructive" />
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
