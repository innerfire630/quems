'use client';

// =============================================================================
// settings-client.tsx — System settings editor with card-based layout
// =============================================================================
// Renders all system settings grouped by category. Each setting is a card
// with inline editing. Changes are persisted via the server action.
// =============================================================================

import { useState, useTransition } from 'react';
import { updateSetting } from '@/actions/update-setting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Loader2, Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ResetQueueButton } from '@/app/(dashboard)/settings/_components/reset-queue-button';

// ---------------------------------------------------------------------------
// TimePicker — custom hour/minute selector for the daily reset time setting
// ---------------------------------------------------------------------------

function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [hh = '00', mm = '00'] = value.split(':');

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

  return (
    <div className="flex items-center gap-1">
      <select
        value={hh}
        onChange={(e) => onChange(`${e.target.value}:${mm}`)}
        className="h-8 w-14 rounded-md border border-input bg-background px-1.5 text-center text-xs font-mono focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
      >
        {hours.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted-foreground">:</span>
      <select
        value={mm}
        onChange={(e) => onChange(`${hh}:${e.target.value}`)}
        className="h-8 w-14 rounded-md border border-input bg-background px-1.5 text-center text-xs font-mono focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}

interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: Date;
}

// Human-friendly labels for known setting keys
const KEY_LABELS: Record<string, string> = {
  'queue.daily_reset_time': 'Daily Reset Time',
  'queue.no_show_grace_period_seconds': 'No-Show Grace Period',
  'queue.default_average_service_time_minutes': 'Default Avg Service Time',
};

// Group labels for dotted key prefixes
const GROUP_LABELS: Record<string, string> = {
  queue: 'Queue Management',
  email: 'Email',
  report: 'Reports',
  display: 'Display Board',
  security: 'Security',
  general: 'General',
};

function formatKeyLabel(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  return key
    .split('.')
    .map((part) => part.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' › ');
}

function formatGroup(key: string): string {
  const prefix = key.split('.')[0];
  return GROUP_LABELS[prefix] ?? prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function SettingCard({ setting }: { setting: SystemSetting }) {
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
    <Card>
      <CardContent className="flex items-start justify-between gap-4 py-4">
        {/* Left: label + description */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{formatKeyLabel(setting.key)}</p>
          {setting.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
          )}
        </div>

        {/* Right: value editor + save */}
        <div className="flex shrink-0 items-center gap-3">
          {setting.type === 'BOOLEAN' ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={value === 'true'}
                onCheckedChange={(checked) => setValue(checked ? 'true' : 'false')}
              />
              <Label className="min-w-[60px] text-xs text-muted-foreground">
                {value === 'true' ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          ) : setting.key === 'queue.daily_reset_time' ? (
            <TimePicker value={value} onChange={setValue} />
          ) : setting.type === 'INTEGER' ? (
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 w-28 font-mono text-xs"
            />
          ) : setting.type === 'JSON' ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={2}
              className="w-56 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs resize-y"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 w-40 text-xs"
            />
          )}
          <Button
            size="sm"
            variant={saved ? 'outline' : 'default'}
            disabled={!dirty || isPending}
            onClick={handleSave}
            className="h-8 gap-1.5 text-xs"
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
          {setting.key === 'queue.daily_reset_time' && <ResetQueueButton />}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsClient({ settings }: { settings: SystemSetting[] }) {
  // Group settings by prefix
  const groups = new Map<string, SystemSetting[]>();
  for (const s of settings) {
    const group = formatGroup(s.key);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(s);
  }

  return (
    <div className="mt-6 space-y-8">
      {[...groups.entries()].map(([group, items]) => (
        <div key={group}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">{group}</h3>
          <div className="space-y-2">
            {items.map((s) => (
              <SettingCard key={s.id} setting={s} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
