'use client';

// =============================================================================
// settings-client.tsx — System settings editor with card-based layout
// =============================================================================
// Renders all system settings grouped by category. Each setting is a card
// with inline editing. Changes are persisted via the server action.
// =============================================================================

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateSetting } from '@/actions/update-setting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Loader2, Check, Upload, X, Volume2 } from 'lucide-react';
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
  'system.name': 'System Name',
  'system.logo_url': 'Company Logo',
  'queue.daily_reset_time': 'Daily Reset Time',
  'queue.no_show_grace_period_seconds': 'No-Show Grace Period',
  'queue.default_average_service_time_minutes': 'Default Service Time',
  'display.theme': 'TV Display Theme',
  'display.marquee_message': 'Marquee Message',
  'kiosk.require_customer_info': 'Collect Customer Info on Kiosk',
  'kiosk.customer_info_fields': 'Customer Info Fields',
  'waiting_time.color_config': 'Waiting Time Color Thresholds',
  'reminder.delayed_threshold_minutes': 'Delayed Reminder Threshold (min)',
  'reminder.interval_minutes': 'Reminder Repeat Interval (min)',
  // 'reminder.blink_interval_seconds' — hidden, handled automatically
  'reminder.sound_file': 'Delayed Reminder Sound',
  'reminder.sound_repeat_count': 'Reminder Sound Repeat Count',
  'notification.new_ticket_sound': 'New Ticket Issued Sound',
  'chat.retention_days': 'Chat Retention Period (days)',
  'chat.cleanup_time': 'Chat Cleanup Time',
};

// Group labels for dotted key prefixes
const GROUP_LABELS: Record<string, string> = {
  system: 'System',
  queue: 'Queue Management',
  email: 'Email',
  report: 'Reports',
  display: 'Display Board',
  security: 'Security',
  general: 'General',
  kiosk: 'Kiosk Settings',
  waiting_time: 'Ticket Waiting Time Colour',
  reminder: 'Ticket Reminder Alerts',
  notification: 'Notification Sounds',
  chat: 'Live Chat',
};

function formatKeyLabel(key: string): string {
  if (KEY_LABELS[key]) return KEY_LABELS[key];
  return key
    .split('.')
    .map((part) => part.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' › ');
}

function formatGroup(key: string): string {
  // Move "Delayed Reminder Sound" to Notification Sounds group
  if (key === 'reminder.sound_file') return 'Notification Sounds';
  const prefix = key.split('.')[0];
  return GROUP_LABELS[prefix] ?? prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function LogoUpload({
  setting,
  onUploaded,
}: {
  setting: SystemSetting;
  onUploaded?: (url: string) => void;
}) {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(setting.value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Upload failed');
        return;
      }

      setPreviewUrl(json.data.url);
      onUploaded?.(json.data.url);
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove() {
    setUploading(true);
    try {
      await updateSetting(setting.id, '');
      setPreviewUrl(null);
      onUploaded?.('');
      router.refresh();
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {previewUrl ? (
        <div className="relative h-12 w-12 shrink-0 rounded-md border border-border bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Logo" className="h-full w-full object-contain p-1" />
        </div>
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted">
          <Upload className="size-5 text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
            id="logo-upload"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="h-7 gap-1.5 text-xs"
          >
            {uploading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Upload className="size-3" />
            )}
            {previewUrl ? 'Change' : 'Upload'}
          </Button>
          {previewUrl && (
            <Button
              size="sm"
              variant="ghost"
              disabled={uploading}
              onClick={handleRemove}
              className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
            >
              <X className="size-3" />
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">PNG, JPEG, SVG, WebP or GIF · Max 2 MB</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColorConfigEditor — structured editor for waiting_time.color_config JSON
// ---------------------------------------------------------------------------

interface ColorConfig {
  green_max_minutes: number;
  yellow_max_minutes: number;
  green_color: string;
  yellow_color: string;
  red_color: string;
}

function ColorConfigEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let config: ColorConfig;
  try {
    config = JSON.parse(value);
  } catch {
    config = {
      green_max_minutes: 15,
      yellow_max_minutes: 30,
      green_color: '#22c55e',
      yellow_color: '#eab308',
      red_color: '#ef4444',
    };
  }

  function update(partial: Partial<ColorConfig>) {
    onChange(JSON.stringify({ ...config, ...partial }, null, 2));
  }

  return (
    <div className="w-full max-w-80 space-y-3 rounded-md border border-border bg-muted/30 p-4">
      {/* Green */}
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer">
          <div
            className="size-8 rounded-full border-2 border-border shadow-sm"
            style={{ backgroundColor: config.green_color }}
          />
          <input
            type="color"
            value={config.green_color}
            onChange={(e) => update({ green_color: e.target.value })}
            className="absolute inset-0 size-0 opacity-0"
          />
        </label>
        <div className="flex flex-1 items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">Green</span>
          <span className="text-xs text-muted-foreground">(0 –</span>
          <Input
            type="number"
            value={config.green_max_minutes}
            onChange={(e) => update({ green_max_minutes: Number(e.target.value) })}
            className="h-7 w-16 text-xs"
            min={1}
          />
          <span className="text-xs text-muted-foreground">min)</span>
        </div>
      </div>
      {/* Yellow */}
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer">
          <div
            className="size-8 rounded-full border-2 border-border shadow-sm"
            style={{ backgroundColor: config.yellow_color }}
          />
          <input
            type="color"
            value={config.yellow_color}
            onChange={(e) => update({ yellow_color: e.target.value })}
            className="absolute inset-0 size-0 opacity-0"
          />
        </label>
        <div className="flex flex-1 items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">Yellow</span>
          <span className="text-xs text-muted-foreground">(… –</span>
          <Input
            type="number"
            value={config.yellow_max_minutes}
            onChange={(e) => update({ yellow_max_minutes: Number(e.target.value) })}
            className="h-7 w-16 text-xs"
            min={1}
          />
          <span className="text-xs text-muted-foreground">min)</span>
        </div>
      </div>
      {/* Red */}
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer">
          <div
            className="size-8 rounded-full border-2 border-border shadow-sm"
            style={{ backgroundColor: config.red_color }}
          />
          <input
            type="color"
            value={config.red_color}
            onChange={(e) => update({ red_color: e.target.value })}
            className="absolute inset-0 size-0 opacity-0"
          />
        </label>
        <div className="flex flex-1 items-center gap-1.5">
          <span className="text-xs font-medium text-foreground">Red</span>
          <span className="text-xs text-muted-foreground">(above)</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SoundFileSelector — select or upload a sound file
// ---------------------------------------------------------------------------

function SoundFileSelector({
  setting,
  value,
  onChange,
}: {
  setting: SystemSetting;
  value: string;
  onChange: (v: string) => void;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload-sound', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message ?? 'Upload failed');
        return;
      }

      onChange(json.data.filename);
      router.refresh();
    } catch {
      setError('Network error.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <div className="w-full max-w-80 space-y-3">
      {/* File name display + actions */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Volume2 className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="No sound file configured"
            className="h-9 pl-8 pr-8 text-xs"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/mpeg,audio/wav,audio/ogg,audio/mp3"
          onChange={handleUpload}
          className="hidden"
          id={`sound-upload-${setting.id}`}
        />
        <Button
          size="sm"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 gap-1.5 text-xs"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          Upload
        </Button>
      </div>

      {/* Audio preview */}
      {value && (
        <div className="rounded-md border border-border bg-muted/30 p-2">
          <audio controls src={`/uploads/sounds/${value}`} className="h-8 w-full" />
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Help text */}
      <p className="text-xs text-muted-foreground">Supported: MP3, WAV, OGG · Max 5 MB</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CustomerInfoFieldsEditor — structured editor for kiosk.customer_info_fields
// ---------------------------------------------------------------------------

interface CustomerInfoFieldsConfig {
  nameOrId: 'name' | 'idNumber' | 'both';
  requireContact: boolean;
}

export function CustomerInfoFieldsEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  let config: CustomerInfoFieldsConfig;
  try {
    config = JSON.parse(value);
  } catch {
    config = { nameOrId: 'name', requireContact: true };
  }

  function update(partial: Partial<CustomerInfoFieldsConfig>) {
    onChange(JSON.stringify({ ...config, ...partial }));
  }

  return (
    <div className="w-full max-w-56 space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <div>
        <Label className="text-xs text-muted-foreground">Collect from customer</Label>
        <select
          value={config.nameOrId}
          onChange={(e) =>
            update({ nameOrId: e.target.value as CustomerInfoFieldsConfig['nameOrId'] })
          }
          className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="name">Name only</option>
          <option value="idNumber">ID Number only</option>
          <option value="both">Name or ID Number</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={config.requireContact}
          onCheckedChange={(checked) => update({ requireContact: checked })}
        />
        <Label className="text-xs">Require contact number</Label>
      </div>
    </div>
  );
}

function SettingCard({ setting }: { setting: SystemSetting }) {
  const router = useRouter();
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
        router.refresh();
      } catch {
        setValue(setting.value);
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
        {/* Left: label + description */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{formatKeyLabel(setting.key)}</p>
          {setting.description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
          )}
        </div>

        {/* Right: value editor + save */}
        <div className="flex flex-wrap items-center gap-3">
          {setting.key === 'system.logo_url' ? (
            <LogoUpload
              setting={setting}
              onUploaded={(url) => {
                setValue(url);
                router.refresh();
              }}
            />
          ) : setting.key === 'display.theme' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setValue('dark')}
                className={`rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  value === 'dark'
                    ? 'bg-zinc-900 text-white border-amber-500'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:border-zinc-400'
                }`}
              >
                🌙 Dark
              </button>
              <button
                type="button"
                onClick={() => setValue('light')}
                className={`rounded-md border-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  value === 'light'
                    ? 'bg-white text-zinc-900 border-amber-500'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-300 hover:border-zinc-400'
                }`}
              >
                ☀️ Light
              </button>
            </div>
          ) : setting.type === 'BOOLEAN' ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={value === 'true'}
                onCheckedChange={(checked) => setValue(checked ? 'true' : 'false')}
              />
              <Label className="min-w-[60px] text-xs text-muted-foreground">
                {value === 'true' ? 'Enabled' : 'Disabled'}
              </Label>
            </div>
          ) : setting.key === 'queue.daily_reset_time' || setting.key === 'chat.cleanup_time' ? (
            <TimePicker value={value} onChange={setValue} />
          ) : setting.type === 'INTEGER' ? (
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 w-28 font-mono text-xs"
            />
          ) : setting.key === 'display.marquee_message' ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={2}
              placeholder="Leave empty for default message"
              className="w-full max-w-64 rounded-md border border-input bg-background px-3 py-1.5 text-xs resize-y"
            />
          ) : setting.key === 'waiting_time.color_config' ? (
            <ColorConfigEditor value={value} onChange={setValue} />
          ) : setting.key === 'kiosk.customer_info_fields' ? (
            <CustomerInfoFieldsEditor value={value} onChange={setValue} />
          ) : setting.key === 'reminder.sound_file' ||
            setting.key === 'notification.new_ticket_sound' ? (
            <SoundFileSelector setting={setting} value={value} onChange={setValue} />
          ) : setting.type === 'JSON' ? (
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={2}
              className="w-full max-w-56 rounded-md border border-input bg-background px-3 py-1.5 font-mono text-xs resize-y"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-8 w-full max-w-40 text-xs"
            />
          )}
          {setting.key !== 'system.logo_url' && (
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
          )}
          {setting.key === 'queue.daily_reset_time' && <ResetQueueButton />}
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsClient({ settings }: { settings: SystemSetting[] }) {
  // Keys hidden from the UI (managed internally)
  const HIDDEN_KEYS = new Set(['reminder.blink_interval_seconds']);

  // Group settings by prefix
  const groups = new Map<string, SystemSetting[]>();
  for (const s of settings) {
    if (HIDDEN_KEYS.has(s.key)) continue;
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
