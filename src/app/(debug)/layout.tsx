// =============================================================================
// src/app/(debug)/layout.tsx — Debug route group layout (3.1.2)
// =============================================================================
// Minimal wrapper for debug pages. In production, returns 404 to prevent
// internal debugging surfaces from being accessible.
// =============================================================================

import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

export default function DebugLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-yellow-100 dark:bg-yellow-900/20 border-b border-yellow-300 dark:border-yellow-700 px-4 py-2 text-sm text-yellow-800 dark:text-yellow-200">
        ⚠ Debug Pages — for development and verification only. Do not use in production.
      </div>
      <main className="container mx-auto py-8">{children}</main>
    </div>
  );
}
