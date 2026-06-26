// =============================================================================
// scripts/check-env.ts — Environment variable validation script
// =============================================================================
// Validates the current environment configuration. Use before deploying to
// verify all required variables are set correctly.
//
// Usage: yarn env:check
// Exits with code 0 on success, code 1 on failure.
// =============================================================================

import { validateEnv } from '@/lib/env';

console.log('[env:check] Validating environment variables...\n');

const valid = validateEnv();

if (valid) {
  console.log('[env:check] ✅ All environment variables are valid.\n');
  process.exit(0);
} else {
  console.log('[env:check] ❌ Some environment variables are missing or invalid.\n');
  process.exit(1);
}
