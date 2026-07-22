// =============================================================================
// src/app/(dashboard)/settings/_components/static-qr-generator.tsx
// =============================================================================
// Admin utility to generate and print a static QR code pointing to
// the public /mobile-kiosk route. Can be printed and posted on walls.
// =============================================================================
'use client';

import { useState, useRef } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function StaticQrGenerator() {
  const [label, setLabel] = useState('Scan to Get a Ticket');
  const [qrSize, setQrSize] = useState(200);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mobileKioskUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/mobile-kiosk` : '/mobile-kiosk';

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a larger canvas with label
    const padding = 40;
    const labelHeight = 40;
    const totalHeight = qrSize + padding * 2 + labelHeight;
    const totalWidth = qrSize + padding * 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = totalWidth;
    exportCanvas.height = totalHeight;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw QR code
    ctx.drawImage(canvas, padding, padding, qrSize, qrSize);

    // Draw label
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, totalWidth / 2, qrSize + padding + 28);

    // Download
    const link = document.createElement('a');
    link.download = 'mobile-kiosk-qr.png';
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dataUrl = canvas.toDataURL('image/png');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mobile Kiosk QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 2rem;
            }
            img { display: block; margin: 0 auto; }
            h2 { margin-top: 1rem; font-size: 1.25rem; }
            p { color: #666; font-size: 0.875rem; margin-top: 0.5rem; }
            @media print {
              body { min-height: auto; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${dataUrl}" width="${qrSize}" height="${qrSize}" alt="QR Code" />
            <h2>${label}</h2>
            <p>${mobileKioskUrl}</p>
          </div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Static QR Code — Mobile Kiosk</CardTitle>
        <CardDescription>
          Generate a printable QR code for customers to scan and get tickets from their mobile
          device. Post this on walls or counters.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          {/* QR Code Preview */}
          <div className="flex flex-col items-center gap-2">
            <div className="rounded-lg border bg-white p-4">
              <QRCodeSVG value={mobileKioskUrl} size={qrSize} level="H" includeMargin={false} />
            </div>
            {/* Hidden canvas for export */}
            <QRCodeCanvas
              value={mobileKioskUrl}
              size={qrSize}
              level="H"
              includeMargin={false}
              ref={canvasRef}
              style={{ display: 'none' }}
            />
          </div>

          {/* Configuration */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="qr-label">Print Label</Label>
              <Input
                id="qr-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Scan to Get a Ticket"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-size">QR Size (px)</Label>
              <Input
                id="qr-size"
                type="number"
                value={qrSize}
                onChange={(e) => setQrSize(Math.max(100, Math.min(400, Number(e.target.value))))}
                min={100}
                max={400}
                step={50}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Points to: <span className="font-mono">{mobileKioskUrl}</span>
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
                <Download className="size-3.5" />
                Download PNG
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="size-3.5" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
