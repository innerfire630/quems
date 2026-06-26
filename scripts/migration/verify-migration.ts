// =============================================================================
// scripts/migration/verify-migration.ts — Data migration verification
// =============================================================================
// Compares row counts and sample data between source SQLite and target
// PostgreSQL after a pgloader migration. Exits with code 0 on success,
// code 1 on any failure.
//
// Usage: yarn migration:verify
// Requires: SQLITE_URL and DATABASE_URL env vars
// =============================================================================

import { PrismaClient as SqliteClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// The target is PostgreSQL via the standard DATABASE_URL
import { prisma as pgClient } from '@/lib/db';

// =============================================================================
// Types
// =============================================================================

interface TableInfo {
  name: string;
  /** Prisma delegate name (camelCase) used to access `pgClient[delegate].count()` */
  delegate: string;
}

interface VerificationResult {
  table: string;
  rowCountSource: number;
  rowCountTarget: number;
  countMatch: boolean;
  sampleMatch: boolean;
  sampleErrors: string[];
}

// =============================================================================
// Table registry — all tables in the schema
// =============================================================================

const TABLES: TableInfo[] = [
  { name: 'User', delegate: 'user' },
  { name: 'Role', delegate: 'role' },
  { name: 'Permission', delegate: 'permission' },
  { name: 'RolePermission', delegate: 'rolePermission' },
  { name: 'UserRole', delegate: 'userRole' },
  { name: 'RefreshToken', delegate: 'refreshToken' },
  { name: 'Service', delegate: 'service' },
  { name: 'Counter', delegate: 'counter' },
  { name: 'CounterService', delegate: 'counterService' },
  { name: 'CounterOfficer', delegate: 'counterOfficer' },
  { name: 'CounterStatusEvent', delegate: 'counterStatusEvent' },
  { name: 'Ticket', delegate: 'ticket' },
  { name: 'TicketEvent', delegate: 'ticketEvent' },
  { name: 'DisplayBoard', delegate: 'displayBoard' },
  { name: 'KioskConfig', delegate: 'kioskConfig' },
  { name: 'DeviceToken', delegate: 'deviceToken' },
  { name: 'Notification', delegate: 'notification' },
  { name: 'NotificationReply', delegate: 'notificationReply' },
  { name: 'BroadcastMessage', delegate: 'broadcastMessage' },
  { name: 'QueueDailySnapshot', delegate: 'queueDailySnapshot' },
  { name: 'AuditLog', delegate: 'auditLog' },
  { name: 'SystemSetting', delegate: 'systemSetting' },
];

// =============================================================================
// SQLite client (source)
// =============================================================================

function createSqliteClient(): SqliteClient {
  const url = process.env.SQLITE_URL ?? 'file:./prisma/dev.db';
  const dbPath = url.startsWith('file:') ? url.slice('file:'.length) : url;
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new SqliteClient({ adapter });
}

// =============================================================================
// Helpers
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getRowCount(client: any, delegate: string): Promise<number> {
  return client[delegate].count() as Promise<number>;
}

async function getSampleRows(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  delegate: string,
  limit = 10,
): Promise<Record<string, unknown>[]> {
  return client[delegate].findMany({ take: limit, orderBy: { id: 'asc' } }) as Promise<
    Record<string, unknown>[]
  >;
}

function compareRows(source: Record<string, unknown>, target: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const allKeys = new Set([...Object.keys(source), ...Object.keys(target)]);

  for (const key of allKeys) {
    const srcVal = source[key];
    const tgtVal = target[key];

    // Skip internal Prisma fields
    if (key.startsWith('_')) continue;

    // Handle dates: compare ISO strings
    if (srcVal instanceof Date && tgtVal instanceof Date) {
      if (srcVal.toISOString() !== tgtVal.toISOString()) {
        errors.push(
          `  Column "${key}": source=${srcVal.toISOString()}, target=${tgtVal.toISOString()}`,
        );
      }
      continue;
    }

    // Handle null/undefined
    if (srcVal === null && tgtVal === null) continue;
    if (srcVal === undefined && tgtVal === undefined) continue;
    if ((srcVal === null || srcVal === undefined) !== (tgtVal === null || tgtVal === undefined)) {
      errors.push(`  Column "${key}": source=${String(srcVal)}, target=${String(tgtVal)}`);
      continue;
    }

    // Handle objects (JSON)
    if (typeof srcVal === 'object' && typeof tgtVal === 'object') {
      if (JSON.stringify(srcVal) !== JSON.stringify(tgtVal)) {
        errors.push(`  Column "${key}": JSON mismatch`);
      }
      continue;
    }

    // Scalar comparison
    if (String(srcVal) !== String(tgtVal)) {
      errors.push(`  Column "${key}": source=${String(srcVal)}, target=${String(tgtVal)}`);
    }
  }

  return errors;
}

// =============================================================================
// Main verification
// =============================================================================

async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Migration Verification Script             ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const sqlite = createSqliteClient();
  const startTime = Date.now();

  const results: VerificationResult[] = [];
  let totalPass = 0;
  let totalFail = 0;

  for (const table of TABLES) {
    const result: VerificationResult = {
      table: table.name,
      rowCountSource: 0,
      rowCountTarget: 0,
      countMatch: false,
      sampleMatch: false,
      sampleErrors: [],
    };

    try {
      // Row count comparison
      result.rowCountSource = await getRowCount(sqlite, table.delegate);
      result.rowCountTarget = await getRowCount(pgClient, table.delegate);
      result.countMatch = result.rowCountSource === result.rowCountTarget;

      // Sample data comparison (only if source has data)
      if (result.rowCountSource > 0 && result.rowCountTarget > 0) {
        const sourceRows = await getSampleRows(sqlite, table.delegate);
        const targetRows = await getSampleRows(pgClient, table.delegate);

        if (sourceRows.length > 0 && targetRows.length > 0) {
          for (let i = 0; i < Math.min(sourceRows.length, targetRows.length); i++) {
            const errors = compareRows(sourceRows[i], targetRows[i]);
            if (errors.length > 0) {
              result.sampleErrors.push(`Row ${i + 1}:`);
              result.sampleErrors.push(...errors);
            }
          }
          result.sampleMatch = result.sampleErrors.length === 0;
        } else {
          // No sample rows to compare — pass by default
          result.sampleMatch = true;
        }
      } else {
        // No data in source or target — pass by default
        result.sampleMatch = true;
      }
    } catch (err) {
      result.sampleErrors.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
      result.sampleMatch = false;
    }

    // Print result
    const passed = result.countMatch && result.sampleMatch;
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(
      `${status}  ${result.table.padEnd(25)} rows: ${String(result.rowCountSource).padStart(5)} → ${String(result.rowCountTarget).padStart(5)}`,
    );

    if (!result.countMatch) {
      console.log(`       ⚠ Row count mismatch!`);
    }
    for (const err of result.sampleErrors) {
      console.log(`       ${err}`);
    }

    if (passed) totalPass++;
    else totalFail++;

    results.push(result);
  }

  // Cleanup
  await sqlite.$disconnect();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n──────────────────────────────────────────────`);
  console.log(`  Total: ${results.length} tables checked`);
  console.log(`  Pass:  ${totalPass}`);
  console.log(`  Fail:  ${totalFail}`);
  console.log(`  Time:  ${elapsed}s`);
  console.log(`──────────────────────────────────────────────`);

  if (totalFail > 0) {
    console.log(`\n❌ VERIFICATION FAILED — ${totalFail} table(s) have mismatches.`);
    process.exit(1);
  }

  console.log('\n✅ VERIFICATION PASSED — all tables match.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(2);
});
