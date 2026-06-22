// =============================================================================
// src/lib/db.ts — Prisma client singleton (Prisma 7 with driver adapter)
// =============================================================================
// Hot-reload-safe pattern: in development, Next.js aggressively reloads server
// modules. Without this guard, every reload would open a new Prisma client and
// eventually exhaust the database connection pool.
//
// Prisma 7 requires a driver adapter to talk directly to the database (no
// more embedded query engine). For SQLite we use @prisma/adapter-better-sqlite3.
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  // Prisma's SQLite URL format is `file:./relative/path.db` — strip the prefix
  // before handing the path to better-sqlite3.
  const dbPath = url.startsWith('file:') ? url.slice('file:'.length) : url;

  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
