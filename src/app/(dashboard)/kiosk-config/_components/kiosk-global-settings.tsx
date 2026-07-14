'use client';

// =============================================================================
// KioskGlobalSettings — Global kiosk behaviour settings
// =============================================================================
// Shown on the /kiosk-config page above per-kiosk configs.
// Manages SystemSetting rows with kiosk.* keys (customer info collection).
// =============================================================================

import { useState, useTransition } from 'react';
import { Loader2, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { updateSetting } from '@/actions/update-setting';
import { CustomerInfoFieldsEditor } from '@/components/admin/settings-client';

interface KioskSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

interface Props {
  requireCustomerInfo: KioskSetting;
  customerInfoFields: KioskSetting;
}

export function KioskGlobalSettings({ requireCustomerInfo, customerInfoFields }: Props) {
  return (
    <div className="space-y-8 rounded-lg border border-border p-6">
      <div>
        <h2 className="text-lg font-semibold">Customer Information Collection</h2>
        <p className="text-xs text-muted-foreground">
          Global settings for all kiosks. Controls whether the kiosk collects customer details
          before issuing a ticket.
        </p>
      </div>

      <div className="space-y-6">
        <BooleanSetting setting={requireCustomerInfo} />
        <JsonSetting setting={customerInfoFields} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Boolean toggle (require_customer_info)
// ---------------------------------------------------------------------------

function BooleanSetting({ setting }: { setting: KioskSetting }) {
  const [value, setValue] = useState(setting.value);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dirty = value !== setting.value;

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSetting(setting.id, value);
        setSaved(true);
        toast.success('Setting updated.');
        setTimeout(() => setSaved(false), 2000);
      } catch {
        toast.error('Failed to update setting.');
        setValue(setting.value);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Switch
          checked={value === 'true'}
          onCheckedChange={(checked) => setValue(checked ? 'true' : 'false')}
        />
        <div className="space-y-0.5">
          <Label>Collect Customer Info on Kiosk</Label>
          {setting.description && (
            <p className="text-xs text-muted-foreground">{setting.description}</p>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!dirty || isPending}
        onClick={handleSave}
        className="gap-1.5 shrink-0"
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// JSON editor (customer_info_fields)
// ---------------------------------------------------------------------------

function JsonSetting({ setting }: { setting: KioskSetting }) {
  const [value, setValue] = useState(setting.value);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dirty = value !== setting.value;

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSetting(setting.id, value);
        setSaved(true);
        toast.success('Setting updated.');
        setTimeout(() => setSaved(false), 2000);
      } catch {
        toast.error('Failed to update setting.');
        setValue(setting.value);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label>Customer Info Fields</Label>
          {setting.description && (
            <p className="text-xs text-muted-foreground">{setting.description}</p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={!dirty || isPending}
          onClick={handleSave}
          className="gap-1.5 shrink-0"
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
      </div>
      <CustomerInfoFieldsEditor value={value} onChange={setValue} />
    </div>
  );
}
