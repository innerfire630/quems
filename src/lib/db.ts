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
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { logQuery, logWarn, logError, isLoggingEnabled } from '@/lib/prisma-logging';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const dbPath = url.startsWith('file:') ? url.slice('file:'.length) : url;

  const adapter = new PrismaBetterSqlite3({ url: dbPath });

  // Enable query logging in development (5.2.2)
  const emitLog = isLoggingEnabled();
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

  // Register event listeners for query logging with slow query detection
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
