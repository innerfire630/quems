# PostgreSQL Migration Strategy

**Version:** 1.0.0
**Status:** Production Runbook
**Parent Document:** Master Plan §3.2, §17
**Series Position:** Sub-Phase 5.3.1

---

## Table of Contents

1. [Overview](#1-overview)
2. [Two-Step Migration Process](#2-two-step-migration-process)
3. [Environment Variable Changes](#3-environment-variable-changes)
4. [Data Migration Strategy](#4-data-migration-strategy)
5. [PostgreSQL-Specific Considerations](#5-postgresql-specific-considerations)
6. [Rollback Procedure](#6-rollback-procedure)
7. [Verification Checklist](#7-verification-checklist)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Overview

This document is the authoritative runbook for migrating the Smart Queue Management System from SQLite (development) to PostgreSQL (production). It is intended for the operations team performing the migration.

**Prerequisites:**

- PostgreSQL 15+ installed and running
- A PostgreSQL database and user created with `CREATEDB` and full access privileges
- The `DATABASE_URL` connection string: `postgresql://user:password@host:5432/database?schema=public`
- The `DIRECT_URL` connection string (if using a managed database with a connection pooler, e.g., Supabase, Neon)
- The `pgloader` system tool installed (if migrating existing data from SQLite)
- A backup of the existing SQLite database (`prisma/dev.db` or equivalent)

**Who should read this:** Operations engineers, DevOps, and any team member performing a production database migration.

**References:** Master Plan §3.2 (database choice), §17 (decisions log).

---

## 2. Two-Step Migration Process

The migration from SQLite to PostgreSQL is a two-step process: (1) swap the Prisma provider, (2) apply the migrations.

### Step 2.1: Swap the Provider

The EXACT line in `prisma/schema.prisma` that must change:

```prisma
// Before (development — in the repository):
datasource db {
  provider = "sqlite"
}

// After (production — applied by the operator during migration):
datasource db {
  provider = "postgresql"
}
```

**Important caveat:** This change is NOT applied in the repository. The repository keeps `provider = "sqlite"` for local development. The change is applied by the operator during the migration and reverted after. A comment in the schema near the datasource block documents this: `// NOTE: For production, change to "postgresql" during migration. See docs/postgresql-migration.md.`

**Rationale:** The `provider` field controls which database Prisma generates SQL for. SQLite and PostgreSQL have different SQL dialects. The provider swap tells Prisma to use PostgreSQL's dialect for migrations.

**To apply the change:**

1. Open `prisma/schema.prisma`.
2. Locate the `datasource db { provider = "sqlite" }` line.
3. Change `sqlite` to `postgresql`.
4. Save the file.
5. Run `yarn prisma format` to verify the schema is valid.

**To verify:** Run `yarn prisma validate` — it should succeed with no errors.

**Reversibility:** To revert, change `postgresql` back to `sqlite` and re-run `yarn prisma generate`. The database itself is not affected by this change — only the SQL dialect Prisma generates is affected.

### Step 2.2: Apply the Migrations

After swapping the provider, apply all existing migrations to the PostgreSQL instance.

**Command:** `yarn prisma:migrate:deploy`

**Prerequisite:** The `DATABASE_URL` env var must be set to the PostgreSQL connection string.

**Behavior:** `prisma migrate deploy` applies all migrations in `prisma/migrations/` in chronological order. It does NOT generate new migrations. It does NOT prompt for confirmation. It is idempotent — running it twice has the same effect as running it once.

**Expected output:**

```
Applying migration `20260101120000_init`
Applying migration `20260101130000_add_performance_indexes`
The following migration(s) have been applied:

migrations/
  └─ 20260101120000_init/
  └─ 20260101130000_add_performance_indexes/

All migrations have been successfully applied.
```

**Failure modes:**

- Database unreachable — check `DATABASE_URL` and network connectivity.
- Credentials wrong — verify the user has `CREATEDB` and full access.
- Migration conflicts with existing data — drop the database and re-run, or resolve the conflict manually.

**What `migrate deploy` does NOT do:**

- It does NOT seed the database. Run `yarn prisma:seed` separately after the deploy.
- It does NOT generate new migrations. Use `yarn prisma:migrate:dev` for schema changes in development.
- It does NOT verify data integrity. Run the verification script after the migration.

---

## 3. Environment Variable Changes

### `DATABASE_URL`

| Environment             | Format                                                        |
| ----------------------- | ------------------------------------------------------------- |
| Development (SQLite)    | `file:./prisma/dev.db`                                        |
| Production (PostgreSQL) | `postgresql://user:password@host:5432/database?schema=public` |

**Connection pool parameters (append to the URL query string):**

- `?connection_limit=30` — pool size (see §5.4 for the formula)
- `&connect_timeout=10` — connection timeout in seconds
- `&application_name=quems-app` — for identification in PostgreSQL logs

**Full example:** `postgresql://quems_user:s3cret@db.example.com:5432/quems_prod?schema=public&connection_limit=30&connect_timeout=10&application_name=quems-app`

### `DIRECT_URL`

Optional. Used for migrations that must bypass a connection pooler (e.g., Supabase PgBouncer, Neon). Format: same as `DATABASE_URL` but without the `?connection_limit` parameter.

**When to set:** If the platform uses a connection pooler and `prisma migrate deploy` fails with "cannot run CREATE DATABASE inside a transaction", set `DIRECT_URL` to a direct connection (port 5432, bypassing the pooler).

### `APP_TIMEZONE`

This does NOT change with the migration. All timestamps are stored as UTC in both SQLite and PostgreSQL. The `APP_TIMEZONE` is used for display conversion only (`Intl.DateTimeFormat`).

---

## 4. Data Migration Strategy

### When to Use the Data Migration

ONLY for existing deployments with data in SQLite. Fresh deployments skip this step entirely — run `yarn prisma:seed` instead.

### The `pgloader` Workflow

`pgloader` is a system-level tool that handles SQLite-to-PostgreSQL schema conversion and data migration automatically. It is installed via the OS package manager, NOT as a Node.js dependency.

**Install `pgloader`:**

- Ubuntu/Debian: `apt-get install pgloader`
- macOS: `brew install pgloader`
- Windows: use WSL or a Linux VM

**Configuration file:** `scripts/migration/pgloader.config` — contains the source, target, schema mapping rules, include/exclude rules, worker count, and batch size.

**Running the data migration (for the operator):**

1. **Stop the application** — ensure no writes are happening to the SQLite database.
2. **Backup the SQLite database** — copy `prisma/dev.db` to a safe location.
3. **Verify PostgreSQL is accessible** — run `psql $DATABASE_URL -c "SELECT 1"`.
4. **Run pgloader:** `pgloader scripts/migration/pgloader.config`.
5. **Wait for completion** — the output shows progress for each table.
6. **Run the verification script:** `yarn migration:verify` — confirms row counts and sample data.
7. **Run the seed script (fresh deployments only):** `yarn prisma:seed`.

**Expected output:** A summary of tables migrated with row counts:

```
table name     errors       rows      bytes      total time
-----------    ------    --------   --------    -----------
User                 0           1       0.2s          0.3s
Role                 0           5       0.1s          0.1s
...
Total migration time: 12.4s
```

**Failure modes:**

- Connection failures — check `DATABASE_URL` format.
- Type mismatches — see the `pgloader.config` casting rules.
- Constraint violations — resolve the data issue in the source SQLite database first.

### When to Skip the Data Migration

- **Fresh deployments:** No SQLite data exists. Run `yarn prisma:migrate:deploy` followed by `yarn prisma:seed`.
- **Staging/testing:** Seed with test data instead of migrating production data.

---

## 5. PostgreSQL-Specific Considerations

### 5.1 Case Sensitivity

PostgreSQL string comparisons are **case-sensitive** by default. SQLite's `LIKE` is case-insensitive for ASCII; PostgreSQL's `LIKE` is case-sensitive.

**Impact:** The email lookup on login (`db.user.findUnique({ where: { email } })`) will NOT match `John@Example.com` to `john@example.com` after the migration.

**Mitigation:** Use Prisma's `mode: 'insensitive'` in the where clause:

```ts
db.user.findFirst({
  where: { email: { equals: email, mode: 'insensitive' } },
});
```

**Alternative:** Change the `email` column to PostgreSQL's `citext` type via a migration. NOT recommended — `citext` has performance overhead. Use `mode: 'insensitive'` instead.

**Recommendation:** Audit all `where` clauses for string equality comparisons that should be case-insensitive. Add `mode: 'insensitive'` where needed. The primary case is email lookups.

### 5.2 JSONB Queries

Prisma's `Json` type maps to PostgreSQL's `jsonb`. Queries use Prisma's `Json` filter syntax:

- `path: ['settingKey']` — access a JSON key
- `string_contains: 'value'` — string contains in a JSON field
- `equals: value` — exact JSON value match

**Example:**

```ts
db.auditLog.findMany({
  where: { metadata: { path: ['settingKey'], equals: 'queue.daily_reset_time' } },
});
```

JSONB is more efficient than JSON for queries — it's parsed once at insert time, not at query time.

### 5.3 Date/Time Handling

- All timestamps are stored as **UTC** in both SQLite and PostgreSQL.
- The Prisma `DateTime` type maps to `timestamp(3) with time zone` in PostgreSQL.
- Application code converts to local time for display using `APP_TIMEZONE` and `Intl.DateTimeFormat`.
- **Never store local time.**
- The `businessDate` field on `Ticket` is a UTC `Date` representing midnight in `APP_TIMEZONE`. The conversion is handled in application code.

### 5.4 Connection Pool Sizing

**Formula:**

```
pool_size = floor((max_connections - reserved) / num_app_instances)
```

**Defaults:**

- PostgreSQL `max_connections`: 100 (default)
- Reserved for admin (`psql` manual connections): 10
- With 3 application instances: `floor((100 - 10) / 3) = 30` connections each
- With 1 application instance: `floor((100 - 10) / 1) = 90` connections each

**Configuration:** Set via the `?connection_limit=N` query parameter on `DATABASE_URL`.

**Managed services note:** Some platforms (Supabase, Neon) have different `max_connections` defaults. Check the platform's documentation and adjust the formula.

### 5.5 Transaction Isolation

The default `READ COMMITTED` isolation level is used. This is sufficient for the queue workload:

- Tickets are issued sequentially per service.
- Calls are sequential per counter.
- No two officers can call the same ticket (the state machine enforces it).
- No high-contention serializable operations exist.

If higher isolation is ever needed (`SERIALIZABLE`), it adds overhead and may cause serialization conflicts. Any future change to the isolation level must be documented here.

### 5.6 Backup Strategy

**Daily backups:**

```bash
pg_dump -Fc -d quems_prod -f /var/backups/quems/backup-$(date +%Y%m%d).dump
```

**Restore:**

```bash
pg_restore -d quems_prod /var/backups/quems/backup-YYYYMMDD.dump
```

**Retention:**

- 30 days local storage
- 1 year cold storage (upload to S3 or equivalent)

**Managed services:** Use the managed backup feature (AWS RDS automated backups, Supabase backups, Neon branching). Verify it's enabled.

**Critical rule:** A backup that has never been restored is not a backup. Test the restore procedure quarterly.

---

## 6. Rollback Procedure

### When to Roll Back

- The migration fails partway through.
- The verification checks fail.
- The application is not functional after the migration.

### Rollback Steps

1. **Revert the `provider` change** in `prisma/schema.prisma` from `postgresql` back to `sqlite`. This allows local development to continue.
2. **Restore the previous PostgreSQL state** (if the migration was applied to a production PostgreSQL). Use `pg_restore` from the most recent backup, or use the managed service's point-in-time recovery feature.
3. **Update `DATABASE_URL`** back to the SQLite file path (for local development) or to the previous PostgreSQL connection string.
4. **Restart the application** with the previous configuration.

### What CANNOT Be Rolled Back

If data was migrated from SQLite to PostgreSQL and the migration is rolled back:

- The SQLite database is the source of truth.
- The PostgreSQL data is discarded.
- The operator must re-migrate from the SQLite backup.

### Partial Data Migration

If `pgloader` fails partway through, the PostgreSQL database may have some tables populated and some empty. The verification script will catch this. **Fix:** Drop the PostgreSQL database and re-run the migration from scratch.

### Communication

Notify the team immediately if a rollback is needed. Document the rollback in the deployment log.

---

## 7. Verification Checklist

Run these steps after the migration to confirm it succeeded.

| Step | Action                                                                                         | Expected Outcome                                    |
| ---- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1    | `psql $DATABASE_URL`                                                                           | Connection succeeds                                 |
| 2    | `\dt` in psql                                                                                  | Lists ~25 tables matching the schema                |
| 3    | `SELECT * FROM _prisma_migrations ORDER BY started_at;`                                        | Every migration from `prisma/migrations/` is listed |
| 4    | `SELECT 'User' AS tbl, COUNT(*) FROM "User" UNION ALL SELECT 'Role', COUNT(*) FROM "Role" ...` | Row counts match expectations                       |
| 5    | `yarn migration:verify`                                                                        | PASS report for every table                         |
| 6    | `yarn build && yarn start`                                                                     | Application boots without errors                    |
| 7    | `curl https://queue.example.com/api/health`                                                    | Returns 200 with `database: 'connected'`            |
| 8    | Log in via the admin dashboard                                                                 | Services list loads correctly                       |
| 9    | Run the smoke test checklist (`docs/smoke-test-checklist.md`)                                  | All items pass                                      |

---

## 8. Troubleshooting

| Issue                                                                | Likely Cause                              | Solution                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------- |
| `prisma migrate deploy` fails with "connection refused"              | PostgreSQL not running or wrong host/port | Check `DATABASE_URL`, verify `psql $DATABASE_URL` works                   |
| `prisma migrate deploy` fails with "permission denied"               | User lacks `CREATEDB`                     | Grant the user `CREATEDB` or use a superuser for the migration            |
| `prisma migrate deploy` fails with "cannot run inside a transaction" | Connection pooler blocks DDL              | Use `DIRECT_URL` (bypasses pooler)                                        |
| Login fails with wrong email case after migration                    | PostgreSQL case-sensitive email lookup    | Add `mode: 'insensitive'` to the email `where` clause                     |
| `pgloader` fails with type mismatch                                  | SQLite and PostgreSQL type differences    | Check `pgloader.config` casting rules, adjust as needed                   |
| `yarn migration:verify` reports FAIL on a table                      | Data integrity issue                      | Check the specific table and row; the script reports the exact column     |
| Application boots but queries are slow                               | Missing or outdated database indexes      | Run `yarn prisma:migrate:deploy` again (idempotent); verify indexes exist |
| Connection pool exhausted                                            | Pool size too small                       | Increase `?connection_limit=N` on `DATABASE_URL`                          |

---

_End of PostgreSQL Migration Runbook — Version 1.0.0_
