'use client';

// =============================================================================
// settings-client.tsx — System settings editor with inline edit controls
// =============================================================================
// Renders a table of all system settings. Each setting has an inline form
// to change its value. Changes are persisted via the server action.
// =============================================================================

import { useState, useTransition } from 'react';
import { updateSetting } from '@/actions/update-setting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Check } from 'lucide-react';

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: Date;
}

function typeBadge(type: string) {
  const colors: Record<string, string> = {
    STRING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    INTEGER: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    BOOLEAN: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    JSON: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  };
  return (
    <Badge variant="outline" className={colors[type] ?? ''}>
      {type}
    </Badge>
  );
}

function SettingRow({ setting }: { setting: SystemSetting }) {
  const [value, setValue] = useState(setting.value);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const dirty = value !== setting.value;

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSetting(setting.id, value);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } catch {
        setValue(setting.value);
      }
    });
  }

  return (
    <TableRow>
      <TableCell className="font-mono text-xs max-w-[220px] truncate" title={setting.key}>
        {setting.key}
      </TableCell>
      <TableCell>{typeBadge(setting.type)}</TableCell>
      <TableCell className="max-w-[200px]">
        {setting.type === 'BOOLEAN' ? (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        ) : (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-8 font-mono text-xs"
          />
        )}
      </TableCell>
      <TableCell>
        <Button
          size="sm"
          variant={saved ? 'outline' : 'default'}
          disabled={!dirty || isPending}
          onClick={handleSave}
          className="h-7 gap-1.5 text-xs"
        >
          {isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : saved ? (
            <Check className="size-3 text-emerald-600" />
          ) : (
            <Save className="size-3" />
          )}
          {saved ? 'Saved' : 'Save'}
        </Button>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
        {setting.description ?? '—'}
      </TableCell>
    </TableRow>
  );
}

export function SettingsClient({ settings }: { settings: SystemSetting[] }) {
  return (
    <div className="mt-6 rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[220px]">Key</TableHead>
            <TableHead className="w-[80px]">Type</TableHead>
            <TableHead className="w-[200px]">Value</TableHead>
            <TableHead className="w-[90px]">Action</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {settings.map((s) => (
            <SettingRow key={s.id} setting={s} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
