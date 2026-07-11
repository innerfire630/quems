// =============================================================================
// src/app/kiosk/layout.tsx — Kiosk layout (2.2.2)
// =============================================================================
// Minimal full-screen layout for the kiosk route group — no sidebar,
// no top bar, no navigation, no auth required. White background, 32px padding.
// =============================================================================

import type { Metadata } from 'next';
import { KioskScrollLock } from './_components/kiosk-scroll-lock';

export const metadata: Metadata = {
  title: 'Kiosk — QUEMS',
  description: 'Self-service kiosk for ticket issuance',
};

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <KioskScrollLock />
      <div className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-300">{children}</div>
    </>
  );
}
