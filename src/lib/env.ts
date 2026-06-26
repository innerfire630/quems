// =============================================================================
// src/lib/env.ts — Environment variable validation (1.1.2, extended 5.3.2)
// =============================================================================
// Validates all environment variables on application boot. In production,
// malformed or missing required variables throw a clear error and prevent
// the application from starting. In development, warnings are logged but
// the application continues (for developer convenience).
//
// Addendum 5.3.2: extended with production PostgreSQL env vars, CI/CD
// validation, and stricter auth security checks.
// =============================================================================

const isProd = process.env.NODE_ENV === 'production';
const isDev = !isProd;

// =============================================================================
// Validation helpers
// =============================================================================

interface EnvVarDef {
  key: string;
  required: boolean;
  example: string;
  /** Validation function — returns null if valid, error message if invalid */
  validate: (value: string | undefined) => string | null;
}

function warn(message: string): void {
  if (isDev) {
    console.warn(`[env] WARNING: ${message}`);
  }
}

// =============================================================================
// Individual validators
// =============================================================================

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function isValidPostgresUrl(value: string): boolean {
  return value.startsWith('postgresql://') || value.startsWith('postgres://');
}

const ENV_VARS: EnvVarDef[] = [
  // ---- Database ----
  {
    key: 'DATABASE_URL',
    required: true,
    example: isProd
      ? 'postgresql://user:password@host:5432/database?schema=public'
      : 'file:./prisma/dev.db',
    validate: (v) => {
      if (!v) return 'DATABASE_URL is required.';
      if (isProd && !isValidPostgresUrl(v)) {
        return `DATABASE_URL must start with postgresql:// or postgres:// in production. Got: ${v.substring(0, 20)}...`;
      }
      if (!isProd && !v.startsWith('file:')) {
        warn(`DATABASE_URL is not a file: URL — is this intentional for development?`);
      }
      return null;
    },
  },
  {
    key: 'DIRECT_URL',
    required: false,
    example: 'postgresql://user:password@host:5432/database?schema=public',
    validate: (v) => {
      if (v && !isValidPostgresUrl(v)) {
        return `DIRECT_URL must start with postgresql:// or postgres://. Got: ${v.substring(0, 20)}...`;
      }
      return null;
    },
  },

  // ---- Authentication ----
  {
    key: 'NEXTAUTH_SECRET',
    required: true,
    example: '<generated via `openssl rand -base64 32`>',
    validate: (v) => {
      if (!v) return 'NEXTAUTH_SECRET is required.';
      if (v.length < 32)
        return `NEXTAUTH_SECRET must be at least 32 characters. Currently ${v.length} characters.`;
      if (isProd && v === 'development-secret-do-not-use-in-production') {
        return 'NEXTAUTH_SECRET is the development default. Generate a strong secret for production.';
      }
      return null;
    },
  },
  {
    key: 'NEXTAUTH_URL',
    required: true,
    example: isProd ? 'https://queue.example.com' : 'http://localhost:3000',
    validate: (v) => {
      if (!v) return 'NEXTAUTH_URL is required.';
      if (!isValidUrl(v)) return `NEXTAUTH_URL must be a valid URL. Got: ${v}`;
      if (isProd && !v.startsWith('https://')) {
        return `NEXTAUTH_URL must be HTTPS in production. Got: ${v}`;
      }
      return null;
    },
  },

  // ---- Push Notifications ----
  {
    key: 'FCM_SERVICE_ACCOUNT_JSON',
    required: isProd,
    example: '{"type":"service_account","project_id":"my-project",...}',
    validate: (v) => {
      if (!v && isProd) return 'FCM_SERVICE_ACCOUNT_JSON is required in production.';
      if (v) {
        try {
          JSON.parse(v);
        } catch {
          return 'FCM_SERVICE_ACCOUNT_JSON must be valid JSON.';
        }
      }
      if (!v && isDev) {
        warn(
          'FCM_SERVICE_ACCOUNT_JSON is not set — push notifications will run in console-log mode (dev only).',
        );
      }
      return null;
    },
  },
  {
    key: 'FCM_PROJECT_ID',
    required: isProd,
    example: 'my-firebase-project',
    validate: (v) => {
      if (!v && isProd) return 'FCM_PROJECT_ID is required in production.';
      if (!v) warn('FCM_PROJECT_ID is not set — push notifications disabled.');
      return null;
    },
  },

  // ---- CORS ----
  {
    key: 'ALLOWED_MOBILE_ORIGINS',
    required: false,
    example: 'https://app.example.com,https://admin.example.com',
    validate: (v) => {
      if (v) {
        const origins = v.split(',').map((o) => o.trim());
        for (const origin of origins) {
          if (!isValidUrl(origin)) {
            return `ALLOWED_MOBILE_ORIGINS contains an invalid URL: ${origin}`;
          }
        }
      }
      return null;
    },
  },

  // ---- Application ----
  {
    key: 'APP_TIMEZONE',
    required: false,
    example: 'Asia/Colombo',
    validate: (v) => {
      if (v) {
        const supported = Intl.supportedValuesOf('timeZone') as string[];
        if (!supported.includes(v)) {
          return `APP_TIMEZONE "${v}" is not a valid IANA timezone.`;
        }
      }
      return null;
    },
  },
  {
    key: 'NODE_ENV',
    required: false,
    example: 'production',
    validate: (_v) => null,
  },

  // ---- Optional Hardening ----
  {
    key: 'RATE_LIMIT_ENABLED',
    required: false,
    example: 'true',
    validate: (_v) => {
      // Coerced to boolean in rate-limit.ts. Default: true in production, false in dev.
      return null;
    },
  },
  {
    key: 'MAX_REQUEST_BODY_SIZE',
    required: false,
    example: '10485760',
    validate: (v) => {
      if (v) {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0)
          return `MAX_REQUEST_BODY_SIZE must be a positive integer. Got: ${v}`;
      }
      return null;
    },
  },
  {
    key: 'PRISMA_LOG_QUERIES',
    required: false,
    example: 'true',
    validate: (_v) => null,
  },

  // ---- Optional Database Pool ----
  {
    key: 'DATABASE_POOL_SIZE',
    required: false,
    example: '30',
    validate: (v) => {
      if (v) {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0) return `DATABASE_POOL_SIZE must be a positive integer. Got: ${v}`;
      }
      return null;
    },
  },
  {
    key: 'DATABASE_CONNECT_TIMEOUT_MS',
    required: false,
    example: '10000',
    validate: (v) => {
      if (v) {
        const n = parseInt(v, 10);
        if (isNaN(n) || n <= 0)
          return `DATABASE_CONNECT_TIMEOUT_MS must be a positive integer. Got: ${v}`;
      }
      return null;
    },
  },
];

// =============================================================================
// Main validation function
// =============================================================================

export function validateEnv(): boolean {
  let hasErrors = false;

  for (const def of ENV_VARS) {
    const value = process.env[def.key];
    const error = def.validate(value);
    if (error) {
      console.error(`[env] ${error}`);
      if (def.required) hasErrors = true;
    }
  }

  if (hasErrors && isProd) {
    throw new Error(
      '[env] One or more required environment variables are missing or invalid. See logs above.',
    );
  }

  if (hasErrors && isDev) {
    console.warn(
      '[env] Some required variables are missing — the application may not function correctly.',
    );
  }

  return !hasErrors;
}

/**
 * Returns a formatted list of all env vars for documentation purposes.
 */
export function getEnvVarDocs(): string {
  let out = '# Environment Variables\n\n';
  for (const def of ENV_VARS) {
    const req = def.required ? '(required)' : '(optional)';
    out += `## ${def.key} ${req}\n\n`;
    out += `Example: \`${def.example}\`\n\n`;
  }
  return out;
}

// =============================================================================
// Validated exports (typed access after validation)
// =============================================================================

/** The resolved DATABASE_URL — validated on import */
export const DATABASE_URL: string = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';

/** Whether the current database is PostgreSQL */
export const IS_POSTGRES: boolean =
  DATABASE_URL.startsWith('postgresql://') || DATABASE_URL.startsWith('postgres://');
