// =============================================================================
// src/app/security/layout.tsx — Minimal security layout (4.3.3)
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Officer — Broadcasts',
  description: 'Security officer broadcast monitoring screen',
};

export default function SecurityLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-zinc-950 text-zinc-100 min-h-screen">{children}</div>;
}
