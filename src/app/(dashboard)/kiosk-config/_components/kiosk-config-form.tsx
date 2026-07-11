'use client';

// =============================================================================
// KioskConfigForm — Full-page kiosk configuration form
// =============================================================================

import { useState, useTransition } from 'react';
import { Loader2, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { updateKioskConfig } from '@/actions/update-kiosk-config';

interface KioskConfigData {
  id: string;
  name: string;
  isDefault: boolean;
  welcomeMessage: string | null;
  footerMessage: string | null;
  printerName: string | null;
  printerSheetSize: string | null;
  autoResetSeconds: number;
  showEstimatedWait: boolean;
}

export function KioskConfigForm({ config }: { config: KioskConfigData }) {
  const [name, _setName] = useState(config.name);
  const [welcomeMessage, setWelcomeMessage] = useState(config.welcomeMessage ?? '');
  const [footerMessage, setFooterMessage] = useState(config.footerMessage ?? '');
  const [printerName, setPrinterName] = useState(config.printerName ?? '');
  const [printerSheetSize, setPrinterSheetSize] = useState(config.printerSheetSize ?? '80mm');
  const [autoResetSeconds, _setAutoResetSeconds] = useState(config.autoResetSeconds.toString());
  const [showEstimatedWait, setShowEstimatedWait] = useState(config.showEstimatedWait);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const isDirty =
    name !== config.name ||
    welcomeMessage !== (config.welcomeMessage ?? '') ||
    footerMessage !== (config.footerMessage ?? '') ||
    printerName !== (config.printerName ?? '') ||
    printerSheetSize !== (config.printerSheetSize ?? '80mm') ||
    autoResetSeconds !== config.autoResetSeconds.toString() ||
    showEstimatedWait !== config.showEstimatedWait;

  function handleSave() {
    startTransition(async () => {
      try {
        const result = await updateKioskConfig(config.id, {
          name,
          welcomeMessage,
          footerMessage,
          printerName,
          printerSheetSize,
          autoResetSeconds: Number(autoResetSeconds),
          showEstimatedWait,
        });
        if (result.success) {
          setSaved(true);
          toast.success('Kiosk config updated.');
          setTimeout(() => setSaved(false), 2000);
        }
      } catch {
        toast.error('Failed to update kiosk config.');
      }
    });
  }

  return (
    <div className="space-y-8 rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{config.name}</h2>
          {config.isDefault && <Badge>Default</Badge>}
        </div>
        <Button size="sm" disabled={!isDirty || isPending} onClick={handleSave} className="gap-1.5">
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <Save className="size-4" />
          )}
          {saved ? 'Saved' : 'Save Changes'}
        </Button>
      </div>

      {/* Display */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Display</h3>
          <p className="text-xs text-muted-foreground">Messages shown on the kiosk screen.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`welcome-${config.id}`}>Welcome Message</Label>
            <Input
              id={`welcome-${config.id}`}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Welcome! Please select a service."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`footer-${config.id}`}>Footer Message</Label>
            <Input
              id={`footer-${config.id}`}
              value={footerMessage}
              onChange={(e) => setFooterMessage(e.target.value)}
              placeholder="Please wait to be called."
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={showEstimatedWait} onCheckedChange={setShowEstimatedWait} />
            <div className="space-y-0.5">
              <Label>Show Estimated Wait</Label>
              <p className="text-xs text-muted-foreground">
                Display estimated wait time on the kiosk screen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t" />

      {/* Printer */}
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Printer</h3>
          <p className="text-xs text-muted-foreground">
            Configure the receipt printer for this kiosk.
          </p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`printer-${config.id}`}>Printer Name</Label>
            <Input
              id={`printer-${config.id}`}
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              placeholder="e.g. Receipt Printer"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sheet Size</Label>
            <Select
              value={printerSheetSize}
              onValueChange={(v) => setPrinterSheetSize(v ?? '80mm')}
            >
              <SelectTrigger>
                <SelectValue>{(val) => val}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58mm">58mm (Small)</SelectItem>
                <SelectItem value="80mm">80mm (Standard)</SelectItem>
                <SelectItem value="A4">A4 (Full Page)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Paper size for the receipt printer.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
