# Operations Runbook

**Version:** 1.0.0
**Status:** Operations Runbook
**Parent Document:** Sub-Phase 5.3.2

---

## Table of Contents

1. [Overview](#1-overview)
2. [Smoke Test Execution](#2-smoke-test-execution)
3. [Incident Response](#3-incident-response)
4. [Database Backup and Restore](#4-database-backup-and-restore)
5. [Secret Rotation](#5-secret-rotation)
6. [Scaling](#6-scaling)
7. [Deployment Rollback](#7-deployment-rollback)
8. [Monitoring and Alerting](#8-monitoring-and-alerting)
9. [Disaster Recovery](#9-disaster-recovery)
10. [Periodic Verification](#10-periodic-verification)
11. [Pre-Production Checklist](#11-pre-production-checklist)
12. [Secrets Management](#12-secrets-management)

---

## 1. Overview

This runbook documents the operational procedures for the Smart Queue Management System. It is the primary reference for the operations team.

**Related documents:**

- `docs/smoke-test-checklist.md` — post-deployment verification
- `docs/self-hosted-deployment.md` — self-hosted setup guide
- `docs/postgresql-migration.md` — database migration
- `docs/integration-test-scenarios.md` — end-to-end test scenarios
- `docs/security-review-checklist.md` — periodic security review

---

## 2. Smoke Test Execution

Run the smoke test checklist (`docs/smoke-test-checklist.md`) within 30 minutes of every production deployment. Record the results in the deployment log. If any test fails:

1. Do NOT proceed with the deployment.
2. Investigate the failure.
3. Roll back if necessary (see §7).

---

## 3. Incident Response

### 3.1 When `/api/health` Returns 503

**Cause:** The database is unreachable.
**Actions:**

1. Check the database server: `systemctl status postgresql`
2. Check the connection string: verify `DATABASE_URL` in `/etc/quems/secrets.env`
3. Check network: `telnet localhost 5432`
4. Check database logs: `journalctl -u postgresql`
5. The error message in the health response body indicates the cause.

### 3.2 When a 5xx Spike Is Observed

**Actions:**

1. Check application logs: `journalctl -u quems --since "5 min ago"`
2. Check database logs: `journalctl -u postgresql`
3. Check error tracking system (if configured).
4. Check resource usage: `htop`, `df -h`, `free -m`

### 3.3 When the Database Is Unreachable

**Actions:**

1. Verify PostgreSQL is running: `systemctl status postgresql`
2. If the server is down, fail over to the standby (if HA is configured).
3. If no standby, restore from the most recent backup (§4).

### 3.4 When the Application Is Unresponsive

**Actions:**

1. Check the systemd service: `systemctl status quems`
2. Check logs: `journalctl -u quems -f`
3. Restart: `systemctl restart quems`
4. If restart fails, check resource exhaustion (`htop`, `df -h`).

### 3.5 Communication

- Notify the team immediately via the incident channel (Slack, Teams, PagerDuty).
- Document the incident in the incident log.
- Conduct a post-mortem within 48 hours.

---

## 4. Database Backup and Restore

### 4.1 Manual Backup

```bash
pg_dump -Fc -d quems_prod -f /var/backups/quems/backup-$(date +%Y%m%d).dump
```

### 4.2 Scheduled Backup

A cron job runs `pg_dump` daily at 02:00 UTC. Configured in `/etc/cron.d/quems-backup`.

### 4.3 Restore

```bash
pg_restore -d quems_prod /var/backups/quems/backup-YYYYMMDD.dump
```

### 4.4 Retention

- 30 days local storage.
- 1 year cold storage (S3 or equivalent).
- Test the restore procedure quarterly.

---

## 5. Secret Rotation

### 5.1 NEXTAUTH_SECRET (Annually)

1. Generate a new secret: `openssl rand -base64 32`
2. Update `/etc/quems/secrets.env`
3. Restart the service: `systemctl restart quems`
4. All existing sessions are invalidated — users must log in again.

### 5.2 Database Password (Quarterly)

1. Generate: `openssl rand -base64 24`
2. Update PostgreSQL: `ALTER USER quems_user WITH PASSWORD 'new_password';`
3. Update `/etc/quems/secrets.env`
4. Restart: `systemctl restart quems`

### 5.3 FCM Service Account JSON (Annually)

1. Download a new key from the Firebase Console.
2. Update `/etc/quems/secrets.env`
3. Restart: `systemctl restart quems`

---

## 6. Scaling

### 6.1 Vertical Scaling

Increase the server size (CPU, RAM). Restart the service. Update the PostgreSQL `connection_limit` if the pool size formula changes.

### 6.2 Horizontal Scaling

Add another application instance. Update the nginx config to load-balance across instances. Each instance adds to the PostgreSQL connection count — recalculate the pool size per the formula in `docs/postgresql-migration.md` §5.4.

### 6.3 Database Scaling

Upgrade the PostgreSQL instance. Add read replicas for read-heavy workloads. Sharding is a future enhancement.

---

## 7. Deployment Rollback

### 7.1 Self-Hosted

1. `cd /opt/quems && git checkout <previous-commit-sha>`
2. `yarn install --frozen-lockfile && yarn build`
3. `systemctl restart quems`
4. Run the smoke test checklist.

### 7.2 Hosted (Vercel)

1. Go to the Vercel dashboard → Deployments.
2. Find the previous successful deployment.
3. Click "Promote to Production".

**Note:** Database migrations are forward-only. If a migration must be rolled back, follow the PostgreSQL migration rollback procedure in `docs/postgresql-migration.md` §6.

---

## 8. Monitoring and Alerting

- **External monitoring:** Pingdom, UptimeRobot, or Datadog calls `/api/health` every 60 seconds. Alert on 503 response.
- **Log monitoring:** aggregate `journald` logs and alert on error patterns.
- **Performance monitoring:** track response times for the reports dashboard, the kiosk issuance endpoint, and the SSE connection count.

---

## 9. Disaster Recovery

| Metric                         | Value                               |
| ------------------------------ | ----------------------------------- |
| RPO (Recovery Point Objective) | 24 hours (daily backup)             |
| RTO (Recovery Time Objective)  | 4 hours (restore + verify + deploy) |

**Procedure:**

1. Restore from the most recent backup (`pg_restore`).
2. Apply any post-backup migrations (`yarn prisma:migrate:deploy`).
3. Verify with `yarn migration:verify`.
4. Deploy and run the smoke test.

---

## 10. Periodic Verification

| Frequency | Test                                                | Reference                            |
| --------- | --------------------------------------------------- | ------------------------------------ |
| Weekly    | SSE stability test (subset — 25 connections, 5 min) | `docs/sse-stability-test.md`         |
| Monthly   | Cross-browser compatibility on staging              | `docs/cross-browser-checklist.md`    |
| Quarterly | Full security review                                | `docs/security-review-checklist.md`  |
| Annually  | Full integration test scenarios                     | `docs/integration-test-scenarios.md` |

---

## 11. Pre-Production Checklist

Before every major release or production launch, verify:

- [ ] All integration test scenarios pass (all 12 user role scenarios).
- [ ] Cross-browser compatibility verified on Chrome Desktop, Chrome Android, Safari macOS.
- [ ] Printer compatibility test passes on the target thermal printer.
- [ ] FCM push notification delivery verified on a real Android device.
- [ ] SSE stability test passes (50+ connections, 100+ events, 5 minutes).
- [ ] Security review checklist complete with no critical findings.
- [ ] Smoke test checklist passes on staging.

---

## 12. Secrets Management

### 12.1 Storage Locations

| Environment            | Location                                         |
| ---------------------- | ------------------------------------------------ |
| Self-hosted production | `/etc/quems/secrets.env` (chmod 600)             |
| Vercel deployment      | Vercel Environment Variables (encrypted at rest) |
| CI/CD pipeline         | GitHub Actions Secrets (encrypted)               |

### 12.2 What Is NEVER Committed

- `.env`, `.env.production`, `.env.local` — gitignored
- `*.pem`, `*.key` — gitignored
- `service-account.json`, `*-credentials.json` — gitignored

### 12.3 Generating Strong Secrets

- `NEXTAUTH_SECRET`: `openssl rand -base64 32` (~44 characters, 256 bits)
- Database password: `openssl rand -base64 24` (~32 characters)
- FCM service account: download from Firebase Console → Project Settings → Service Accounts

---

_End of Operations Runbook — Version 1.0.0_
