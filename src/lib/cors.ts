// =============================================================================
// src/lib/cors.ts — CORS configuration helpers (5.2.1)
// =============================================================================
// Handles CORS headers for API routes. The web app is same-origin (no CORS
// needed in production). The future Android app is allowed via the
// ALLOWED_MOBILE_ORIGINS env var (comma-separated list of origins).
//
// References: Master Plan §15.4 (CORS)
// =============================================================================

import { NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_MOBILE_ORIGINS ?? '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // same-origin
  return getAllowedOrigins().includes(origin);
}

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  if (!isOriginAllowed(requestOrigin)) return {};

  return {
    'Access-Control-Allow-Origin': requestOrigin ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// ---------------------------------------------------------------------------
// Preflight handler
// ---------------------------------------------------------------------------

export function handleCorsPreflight(request: Request): NextResponse | null {
  if (request.method !== 'OPTIONS') return null;

  const origin = request.headers.get('origin');
  const headers = getCorsHeaders(origin);

  return new NextResponse(null, {
    status: 204,
    headers: { ...headers },
  });
}
