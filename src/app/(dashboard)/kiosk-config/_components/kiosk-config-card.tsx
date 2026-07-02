'use client';

// =============================================================================
// KioskConfigCard — Editable kiosk configuration card
// =============================================================================

import { useState, useTransition } from 'react';
import { Loader2, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { updateKioskConfig } from '@/actions/update-kiosk-config';

interface KioskConfigData {
  id: string;
  name: string;
  isDefault: boolean;
  welcomeMessage: string | null;
  footerMessage: string | null;
  printerName: string | null;
  autoResetSeconds: number;
  showEstimatedWait: boolean;
}

export function KioskConfigCard({ config }: { config: KioskConfigData }) {
  const [name, setName] = useState(config.name);
  const [welcomeMessage, setWelcomeMessage] = useState(config.welcomeMessage ?? '');
  const [footerMessage, setFooterMessage] = useState(config.footerMessage ?? '');
  const [printerName, setPrinterName] = useState(config.printerName ?? '');
  const [autoResetSeconds, setAutoResetSeconds] = useState(config.autoResetSeconds.toString());
  const [showEstimatedWait, setShowEstimatedWait] = useState(config.showEstimatedWait);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const isDirty =
    name !== config.name ||
    welcomeMessage !== (config.welcomeMessage ?? '') ||
    footerMessage !== (config.footerMessage ?? '') ||
    printerName !== (config.printerName ?? '') ||
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
    <Card className="overflow-visible">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{config.name}</CardTitle>
          <div className="flex items-center gap-2">
            {config.isDefault && <Badge>Default</Badge>}
            <Button
              size="sm"
              variant={saved ? 'outline' : 'default'}
              disabled={!isDirty || isPending}
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`name-${config.id}`} className="text-xs">
              Name
            </Label>
            <Input
              id={`name-${config.id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`reset-${config.id}`} className="text-xs">
              Auto-reset (seconds)
            </Label>
            <Input
              id={`reset-${config.id}`}
              type="number"
              value={autoResetSeconds}
              onChange={(e) => setAutoResetSeconds(e.target.value)}
              min={0}
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`printer-${config.id}`} className="text-xs">
              Printer Name
            </Label>
            <Input
              id={`printer-${config.id}`}
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              placeholder="e.g. Receipt Printer"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={showEstimatedWait} onCheckedChange={setShowEstimatedWait} />
              <Label className="text-xs">Show Wait</Label>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`welcome-${config.id}`} className="text-xs">
            Welcome Message
          </Label>
          <Input
            id={`welcome-${config.id}`}
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Welcome! Please select a service."
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`footer-${config.id}`} className="text-xs">
            Footer Message
          </Label>
          <Input
            id={`footer-${config.id}`}
            value={footerMessage}
            onChange={(e) => setFooterMessage(e.target.value)}
            placeholder="Please wait to be called."
            className="h-8 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
