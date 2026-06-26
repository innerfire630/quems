// =============================================================================
// src/app/(dashboard)/services/_components/service-form.tsx — Service create/edit form (2.1.1)
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createServiceSchema, updateServiceSchema } from '@/schemas/service.schema';
import type { ServiceListItem } from '@/types/service.types';

interface ServiceFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<ServiceListItem>;
  serviceId?: string;
}

export function ServiceForm({ mode, initialValues, serviceId }: ServiceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initialValues?.name ?? '');
  const [code, setCode] = useState(initialValues?.code ?? '');
  const [ticketPrefix, setTicketPrefix] = useState(initialValues?.ticketPrefix ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [iconName, setIconName] = useState(initialValues?.iconName ?? '');
  const [color, setColor] = useState(initialValues?.color ?? '');
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);
  const [averageServiceTime, setAverageServiceTime] = useState(
    initialValues?.averageServiceTime?.toString() ?? '',
  );
  const [sortOrder, setSortOrder] = useState(initialValues?.sortOrder?.toString() ?? '0');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const payload = {
      name: name || undefined,
      code: code || undefined,
      ticketPrefix: ticketPrefix || undefined,
      description: description || undefined,
      iconName: iconName || undefined,
      color: color || undefined,
      isActive,
      averageServiceTime: averageServiceTime ? Number(averageServiceTime) : undefined,
      sortOrder: sortOrder ? Number(sortOrder) : undefined,
    };

    // Client-side validation
    const schema = mode === 'create' ? createServiceSchema : updateServiceSchema;
    const result = schema.safeParse(payload);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const url = mode === 'create' ? '/api/services' : `/api/services/${serviceId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result.data),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === 'VALIDATION_ERROR') {
          const fieldErrors: Record<string, string> = {};
          const details = json.error.details;
          if (details?.fieldErrors) {
            for (const [key, msgs] of Object.entries(details.fieldErrors)) {
              if (Array.isArray(msgs) && msgs.length > 0) {
                fieldErrors[key] = msgs[0] as string;
              }
            }
          }
          setErrors(fieldErrors);
        } else if (json.error?.code === 'CONFLICT') {
          setErrors({ _form: json.error.message });
        } else {
          setErrors({ _form: json.error?.message ?? 'An unexpected error occurred.' });
        }
        setIsSubmitting(false);
        return;
      }

      router.push('/services');
      router.refresh();
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
      setIsSubmitting(false);
    }
  }

  function handleCodeChange(value: string) {
    setCode(value.toUpperCase());
  }

  function handlePrefixChange(value: string) {
    setTicketPrefix(value.toUpperCase().slice(0, 1));
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create Service' : 'Edit Service'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors._form && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors._form}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General Inquiry"
                required
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="e.g. GEN"
                maxLength={10}
                required
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">3-10 uppercase letters/digits</p>
              {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ticketPrefix">Ticket Prefix *</Label>
              <Input
                id="ticketPrefix"
                value={ticketPrefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                placeholder="A"
                maxLength={1}
                required
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Single letter A-Z</p>
              {errors.ticketPrefix && (
                <p className="text-xs text-destructive">{errors.ticketPrefix}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="iconName">Icon Name</Label>
              <Input
                id="iconName"
                value={iconName}
                onChange={(e) => setIconName(e.target.value)}
                placeholder="e.g. HelpCircle"
              />
              <p className="text-xs text-muted-foreground">Lucide icon name</p>
              {errors.iconName && <p className="text-xs text-destructive">{errors.iconName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="#3B82F6"
              />
              <p className="text-xs text-muted-foreground">Hex color like #3B82F6</p>
              {errors.color && <p className="text-xs text-destructive">{errors.color}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="avgTime">Avg Service Time (min)</Label>
              <Input
                id="avgTime"
                type="number"
                value={averageServiceTime}
                onChange={(e) => setAverageServiceTime(e.target.value)}
                placeholder="5"
                min={1}
                max={120}
              />
              <p className="text-xs text-muted-foreground">Used to estimate wait times</p>
              {errors.averageServiceTime && (
                <p className="text-xs text-destructive">{errors.averageServiceTime}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                placeholder="0"
              />
              {errors.sortOrder && <p className="text-xs text-destructive">{errors.sortOrder}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={3}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="isActive">Active</Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === 'create' ? 'Create Service' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
