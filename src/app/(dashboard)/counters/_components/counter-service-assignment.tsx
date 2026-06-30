// =============================================================================
// src/app/(dashboard)/counters/_components/counter-service-assignment.tsx — Assignment widget (2.1.3)
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

interface CounterServiceAssignmentProps {
  counterId: string;
  assignedServices: AssignedService[];
  availableServices: AvailableService[];
}

export function CounterServiceAssignment({
  counterId,
  assignedServices,
  availableServices,
}: CounterServiceAssignmentProps) {
  const router = useRouter();
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter out already-assigned services from the add dropdown
  const assignedIds = new Set(assignedServices.map((a) => a.serviceId));
  const unassignedServices = availableServices.filter((s) => !assignedIds.has(s.id));

  async function handleAdd() {
    if (!selectedServiceId) return;
    setIsAdding(true);
    setError(null);

    try {
      const res = await fetch(`/api/counters/${counterId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: selectedServiceId }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to assign service.');
        return;
      }

      setSelectedServiceId('');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(serviceId: string) {
    setRemovingId(serviceId);
    setError(null);

    try {
      const res = await fetch(`/api/counters/${counterId}/services/${serviceId}`, {
        method: 'DELETE',
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to remove service.');
        return;
      }

      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Assigned services list */}
      {assignedServices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No services assigned yet.</p>
      ) : (
        <div className="grid gap-2">
          {assignedServices.map((assignment) => (
            <Card key={assignment.id}>
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="font-medium">{assignment.service.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">
                      {assignment.service.code}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    Prefix: {assignment.service.ticketPrefix}
                  </span>
                  <Badge variant={assignment.service.isActive ? 'default' : 'secondary'}>
                    {assignment.service.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                    disabled={removingId === assignment.serviceId}
                    aria-label={`Remove ${assignment.service.name}`}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Service</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove &quot;{assignment.service.name}&quot; from this counter? This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRemove(assignment.serviceId)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add service affordance */}
      <div className="flex items-end gap-3 rounded-lg border p-4">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Add Service</label>
          <Select
            value={selectedServiceId}
            onValueChange={(val) => setSelectedServiceId(val ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a service to add..." />
            </SelectTrigger>
            <SelectContent>
              {unassignedServices.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                  All services are already assigned.
                </p>
              ) : (
                unassignedServices.map((svc) => (
                  <SelectItem key={svc.id} value={svc.id}>
                    <span className="flex items-center gap-2">
                      {svc.name}
                      <span className="font-mono text-xs text-muted-foreground">({svc.code})</span>
                      {!svc.isActive && (
                        <Badge variant="secondary" className="ml-1 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {selectedServiceId &&
            !unassignedServices.find((s) => s.id === selectedServiceId)?.isActive && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertTriangle className="size-3" />
                This service is currently inactive. It will appear on the kiosk only when
                reactivated.
              </p>
            )}
        </div>
        <Button onClick={handleAdd} disabled={!selectedServiceId || isAdding}>
          <Plus className="mr-1 size-4" />
          {isAdding ? 'Adding...' : 'Add'}
        </Button>
      </div>
    </div>
  );
}
