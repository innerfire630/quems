// =============================================================================
// src/lib/db.ts — Prisma client singleton (Prisma 7 with driver adapter)
// =============================================================================
// Hot-reload-safe pattern: in development, Next.js aggressively reloads server
// modules. Without this guard, every reload would open a new Prisma client and
// eventually exhaust the database connection pool.
//
// Prisma 7 requires a driver adapter to talk directly to the database (no
// more embedded query engine). For SQLite we use @prisma/adapter-better-sqlite3.
//
// Query logging is enabled in development (5.2.2) with slow query detection
// handled by the Prisma event emitter.
//
// PostgreSQL connection pool configuration (5.3.1):
// - In production, the DATABASE_URL is a PostgreSQL connection string.
// - Connection pool size is set via the ?connection_limit=N query parameter.
// - The DIRECT_URL env var (if set) is used for migrations that bypass a
//   connection pooler (e.g., Supabase PgBouncer, Neon).
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { logQuery, logWarn, logError, isLoggingEnabled } from '@/lib/prisma-logging';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// =============================================================================
// Connection pool sizing (5.3.1)
// =============================================================================

/**
 * Computes the connection pool size for PostgreSQL based on the formula:
 *   pool_size = floor((max_connections - reserved) / num_app_instances)
 *
 * Defaults: max_connections=100, reserved=10, instances=1 → pool_size=90
 * Override via DATABASE_POOL_SIZE env var.
 */
function getConnectionLimit(): number {
  if (process.env.DATABASE_POOL_SIZE) {
    const parsed = parseInt(process.env.DATABASE_POOL_SIZE, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  // Default for single-instance production: reserve 10 of 100 for admin
  return 90;
}

/**
 * Connection timeout in milliseconds. Default 10s.
 * Override via DATABASE_CONNECT_TIMEOUT_MS env var.
 */
function getConnectTimeout(): number {
  if (process.env.DATABASE_CONNECT_TIMEOUT_MS) {
    const parsed = parseInt(process.env.DATABASE_CONNECT_TIMEOUT_MS, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 10000;
}

// =============================================================================
// Client creation
// =============================================================================

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const isPostgres = url.startsWith('postgresql://') || url.startsWith('postgres://');

  const emitLog = isLoggingEnabled();

  if (isPostgres) {
    // PostgreSQL production path — Prisma 7 connects directly using the
    // datasources option. The constructor uses a type assertion because
    // the driver adapter import modifies the PrismaClient constructor type.
    let pgUrl = url;
    const hasConnectionLimit = pgUrl.includes('connection_limit=');
    const hasConnectTimeout = pgUrl.includes('connect_timeout=');

    if (!hasConnectionLimit) {
      const sep = pgUrl.includes('?') ? '&' : '?';
      pgUrl = `${pgUrl}${sep}connection_limit=${getConnectionLimit()}`;
    }
    if (!hasConnectTimeout) {
      pgUrl = `${pgUrl}&connect_timeout=${Math.floor(getConnectTimeout() / 1000)}`;
    }
    if (!pgUrl.includes('application_name=')) {
      pgUrl = `${pgUrl}&application_name=quems-app`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Client = PrismaClient as any;
    const client = new Client({
      datasources: { db: { url: pgUrl } },
      log: emitLog
        ? [
            { level: 'query', emit: 'event' },
            { level: 'warn', emit: 'event' },
            { level: 'error', emit: 'event' },
          ]
        : ['error'],
    }) as PrismaClient;

    if (emitLog) {
      client.$on('query' as never, logQuery as never);
    }
    client.$on('warn' as never, logWarn as never);
    client.$on('error' as never, logError as never);

    return client;
  }

  // SQLite development path — uses the driver adapter
  const dbPath = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  const client = new PrismaClient({
    adapter,
    log: emitLog
      ? [
          { level: 'query', emit: 'event' },
          { level: 'warn', emit: 'event' },
          { level: 'error', emit: 'event' },
        ]
      : ['error'],
  });

  if (emitLog) {
    client.$on('query', logQuery);
  }
  client.$on('warn', logWarn);
  client.$on('error', logError);

  return client;
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
