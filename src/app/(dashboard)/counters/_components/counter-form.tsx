// =============================================================================
// src/app/(dashboard)/counters/_components/counter-form.tsx — Counter create/edit form (2.1.2)
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createCounterSchema, updateCounterSchema } from '@/schemas/counter.schema';
import type { CounterListItem } from '@/types/counter.types';

interface CounterFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<CounterListItem>;
  counterId?: string;
}

export function CounterForm({ mode, initialValues, counterId }: CounterFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [name, setName] = useState(initialValues?.name ?? '');
  const [number, setNumber] = useState(initialValues?.number?.toString() ?? '');
  const [displayLabel, setDisplayLabel] = useState(initialValues?.displayLabel ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    const payload = {
      name: name || undefined,
      number: number ? Number(number) : undefined,
      displayLabel: displayLabel || undefined,
      description: description || undefined,
      isActive,
    };

    const schema = mode === 'create' ? createCounterSchema : updateCounterSchema;
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
      const url = mode === 'create' ? '/api/counters' : `/api/counters/${counterId}`;
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

      // After creation, redirect to the edit page so user can assign officers/services
      if (mode === 'create' && json.data?.id) {
        toast.success('Counter created! You can now assign officers and services.');
        router.push(`/counters/${json.data.id}`);
      } else {
        toast.success('Counter updated.');
        router.push('/counters');
      }
      router.refresh();
    } catch {
      setErrors({ _form: 'Network error. Please try again.' });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{mode === 'create' ? 'Create Counter' : 'Edit Counter'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors._form && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errors._form}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="number">Counter Number *</Label>
              <Input
                id="number"
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="1"
                min={1}
                required
              />
              {errors.number && <p className="text-xs text-destructive">{errors.number}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Counter 1"
                required
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayLabel">Display Label</Label>
              <Input
                id="displayLabel"
                value={displayLabel}
                onChange={(e) => setDisplayLabel(e.target.value)}
                placeholder="e.g. Information Desk"
              />
              <p className="text-xs text-muted-foreground">
                Shown on the display board. Defaults to Name if blank.
              </p>
              {errors.displayLabel && (
                <p className="text-xs text-destructive">{errors.displayLabel}</p>
              )}
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
              {mode === 'create' ? 'Create Counter' : 'Save Changes'}
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
