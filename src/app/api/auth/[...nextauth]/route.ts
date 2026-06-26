// =============================================================================
// src/app/api/auth/[...nextauth]/route.ts — NextAuth.js v5 API route handler
// =============================================================================
// Catches all /api/auth/* requests and delegates to NextAuth's built-in
// handlers (sign-in callback, session, sign-out, CSRF, providers, etc.).
// =============================================================================

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
