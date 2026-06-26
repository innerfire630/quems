// =============================================================================
// src/app/(dashboard)/users/_components/user-form.tsx — Create/edit form (1.3.3)
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoleMultiSelect } from './role-multi-select';
import { createUserSchema, updateUserSchema } from '@/schemas/user.schema';
import type { UserListItem } from '@/types/user.types';
import { toast } from 'sonner';

interface RoleOption {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
}

interface UserFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<UserListItem> & { roleIds?: string[] };
  userId?: string;
  roles: RoleOption[];
}

export function UserForm({ mode, initialValues, userId, roles }: UserFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialValues?.name ?? '');
  const [email, setEmail] = useState(initialValues?.email ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState(initialValues?.status ?? 'ACTIVE');
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(initialValues?.roleIds ?? []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSubmitError(null);

    // Client-side validation
    if (mode === 'create') {
      const parsed = createUserSchema.safeParse({
        name,
        email,
        password,
        status,
        roleIds: selectedRoleIds,
      });
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
          if (messages && messages.length > 0) fieldErrors[key] = messages[0]!;
        }
        setErrors(fieldErrors);
        return;
      }
    } else {
      const parsed = updateUserSchema.safeParse({
        name: name || undefined,
        email: email || undefined,
        status,
        roleIds: selectedRoleIds,
      });
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
          if (messages && messages.length > 0) fieldErrors[key] = messages[0]!;
        }
        setErrors(fieldErrors);
        return;
      }
    }

    setLoading(true);

    try {
      const url = mode === 'create' ? '/api/users' : `/api/users/${userId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const body: Record<string, unknown> = { name, email, status, roleIds: selectedRoleIds };
      if (mode === 'create') body.password = password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 422 && json.error?.details) {
          const fieldErrors: Record<string, string> = {};
          const fieldErrs = json.error.details?.fieldErrors ?? {};
          for (const [key, messages] of Object.entries(fieldErrs)) {
            if (Array.isArray(messages) && messages.length > 0)
              fieldErrors[key] = messages[0] as string;
          }
          setErrors(fieldErrors);
          return;
        }
        if (res.status === 403) {
          toast.error('You do not have permission to perform this action.');
          return;
        }
        setSubmitError(json.error?.message ?? 'An unexpected error occurred.');
        return;
      }

      toast.success(mode === 'create' ? 'User created.' : 'User updated.');
      router.push('/users');
      router.refresh();
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const title = mode === 'create' ? 'Create User' : 'Edit User';

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {mode === 'create'
            ? 'Add a new user account with role assignments.'
            : `Editing user: ${initialValues?.email ?? ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-visible">
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <Alert variant="destructive">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(val) => val && setStatus(val)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-destructive">{errors.status}</p>}
          </div>

          <div className="space-y-2 overflow-visible">
            <Label>Roles</Label>
            <RoleMultiSelect
              roles={roles.map((r) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                isSystem: r.isSystem,
              }))}
              value={selectedRoleIds}
              onChange={setSelectedRoleIds}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : mode === 'create' ? 'Create User' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
