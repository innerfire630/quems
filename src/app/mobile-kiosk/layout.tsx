// =============================================================================
// src/app/mobile-kiosk/layout.tsx — Mobile Kiosk layout
// =============================================================================
// Minimal mobile-friendly layout for self-service ticketing via QR code.
// No auth required. Clean, centered layout optimized for mobile screens.
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mobile Kiosk — QUEMS',
  description: 'Get your queue ticket from your mobile device',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function MobileKioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">{children}</div>
  );
}
