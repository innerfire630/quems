// =============================================================================
// src/app/kiosk/layout.tsx — Kiosk layout (2.2.2)
// =============================================================================
// Minimal full-screen layout for the kiosk route group — no sidebar,
// no top bar, no navigation, no auth required. White background, 32px padding.
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kiosk — QUEMS',
  description: 'Self-service kiosk for ticket issuance',
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-white p-8">{children}</div>;
}
