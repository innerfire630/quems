// =============================================================================
// src/components/admin/display-board-form.tsx — Display board form (3.2.3)
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { DisplayBoardConfig } from '@/types/display.types';

interface DisplayBoardFormProps {
  mode: 'create' | 'edit';
  initialValues?: DisplayBoardConfig;
  boardId?: string;
}

const DEFAULT_VALUES = {
  name: '',
  isDefault: false,
  maxDisplayedTickets: 10,
  announcementEnabled: true,
  bellEnabled: true,
  ttsEnabled: true,
  ttsLanguage: 'en-US',
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVolume: 1.0,
  announcementTemplate: 'Now serving ticket {number} at {counter}',
  themeColor: '',
  logoUrl: '',
  customMessage: '',
};

const TTS_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
];

export function DisplayBoardForm({ mode, initialValues, boardId }: DisplayBoardFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => {
    if (mode === 'edit' && initialValues) {
      return {
        name: initialValues.name,
        isDefault: initialValues.isDefault,
        maxDisplayedTickets: initialValues.maxDisplayedTickets,
        announcementEnabled: initialValues.announcementEnabled,
        bellEnabled: initialValues.bellEnabled,
        ttsEnabled: initialValues.ttsEnabled,
        ttsLanguage: initialValues.ttsLanguage,
        ttsRate: initialValues.ttsRate,
        ttsPitch: initialValues.ttsPitch,
        ttsVolume: initialValues.ttsVolume,
        announcementTemplate: initialValues.announcementTemplate,
        themeColor: initialValues.themeColor ?? '',
        logoUrl: initialValues.logoUrl ?? '',
        customMessage: initialValues.customMessage ?? '',
      };
    }
    return DEFAULT_VALUES;
  });

  const update = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      themeColor: form.themeColor || null,
      logoUrl: form.logoUrl || null,
      customMessage: form.customMessage || null,
    };

    try {
      const url = mode === 'create' ? '/api/display-boards' : `/api/display-boards/${boardId}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to save display board.');
        return;
      }

      toast.success('Display board saved.');
      router.push('/settings/display');
      router.refresh();
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
      {/* Basic info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Information</h3>

        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            maxLength={100}
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch
            id="isDefault"
            checked={form.isDefault}
            onCheckedChange={(v) => update('isDefault', v)}
          />
          <Label htmlFor="isDefault" className="cursor-pointer">
            Set as default display board
          </Label>
        </div>
        {form.isDefault && (
          <p className="text-sm text-muted-foreground">
            This will unmark the current default board.
          </p>
        )}

        <div className="grid gap-2">
          <Label htmlFor="maxDisplayedTickets">Max Displayed Tickets</Label>
          <Input
            id="maxDisplayedTickets"
            type="number"
            min={1}
            max={50}
            value={form.maxDisplayedTickets}
            onChange={(e) => update('maxDisplayedTickets', Number(e.target.value))}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="themeColor">Theme Color</Label>
          <div className="flex items-center gap-2">
            <input
              id="themeColor"
              type="color"
              value={form.themeColor || '#3B82F6'}
              onChange={(e) => update('themeColor', e.target.value)}
              className="h-10 w-16 rounded border cursor-pointer"
            />
            <Input
              value={form.themeColor}
              onChange={(e) => update('themeColor', e.target.value)}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input
            id="logoUrl"
            value={form.logoUrl}
            onChange={(e) => update('logoUrl', e.target.value)}
            placeholder="https://example.com/logo.png"
          />
        </div>
      </div>

      {/* TTS Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Text-to-Speech Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Switch
              id="ttsEnabled"
              checked={form.ttsEnabled}
              onCheckedChange={(v) => update('ttsEnabled', v)}
            />
            <Label htmlFor="ttsEnabled" className="cursor-pointer">
              Enable TTS
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="bellEnabled"
              checked={form.bellEnabled}
              onCheckedChange={(v) => update('bellEnabled', v)}
            />
            <Label htmlFor="bellEnabled" className="cursor-pointer">
              Enable Bell
            </Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="announcementEnabled"
              checked={form.announcementEnabled}
              onCheckedChange={(v) => update('announcementEnabled', v)}
            />
            <Label htmlFor="announcementEnabled" className="cursor-pointer">
              Enable Announcements
            </Label>
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ttsLanguage">TTS Language</Label>
          <select
            id="ttsLanguage"
            value={form.ttsLanguage}
            onChange={(e) => update('ttsLanguage', e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TTS_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ttsRate">TTS Rate (0.1-10)</Label>
            <Input
              id="ttsRate"
              type="number"
              step={0.1}
              min={0.1}
              max={10}
              value={form.ttsRate}
              onChange={(e) => update('ttsRate', Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ttsPitch">TTS Pitch (0-2)</Label>
            <Input
              id="ttsPitch"
              type="number"
              step={0.1}
              min={0}
              max={2}
              value={form.ttsPitch}
              onChange={(e) => update('ttsPitch', Number(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ttsVolume">TTS Volume (0-1)</Label>
            <Input
              id="ttsVolume"
              type="number"
              step={0.1}
              min={0}
              max={1}
              value={form.ttsVolume}
              onChange={(e) => update('ttsVolume', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="announcementTemplate">
            Announcement Template
            <span className="text-xs text-muted-foreground ml-2">
              Available placeholders: {'{number}'}, {'{counter}'}, {'{service}'}
            </span>
          </Label>
          <Textarea
            id="announcementTemplate"
            value={form.announcementTemplate}
            onChange={(e) => update('announcementTemplate', e.target.value)}
            rows={2}
            maxLength={500}
          />
        </div>
      </div>

      {/* Custom Message */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Display Content</h3>

        <div className="grid gap-2">
          <Label htmlFor="customMessage">Custom Marquee Message (optional)</Label>
          <Textarea
            id="customMessage"
            value={form.customMessage}
            onChange={(e) => update('customMessage', e.target.value)}
            placeholder="Welcome to our service center!"
            rows={2}
            maxLength={500}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : mode === 'create' ? 'Create Display Board' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/settings/display')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
