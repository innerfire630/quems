// =============================================================================
// src/lib/security-headers.ts — Security header constants (5.2.1)
// =============================================================================
// The four security headers from Master Plan §15.5 applied to every response.
//
// References: Master Plan §15.5 (Security Headers)
// =============================================================================

import type { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SECURITY_HEADERS: ReadonlyArray<{ key: string; value: string }> = [
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
] as const;

export const SECURITY_HEADERS_MAP: Readonly<Record<string, string>> = Object.fromEntries(
  SECURITY_HEADERS.map((h) => [h.key, h.value]),
);

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const { key, value } of SECURITY_HEADERS) {
    response.headers.set(key, value);
  }
  return response;
}
