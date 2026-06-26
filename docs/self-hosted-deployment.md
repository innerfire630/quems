# Self-Hosted Deployment Runbook

**Version:** 1.0.0
**Status:** Operations Runbook
**Parent Document:** Master Plan §3.4
**Series Position:** Sub-Phase 5.3.2

---

## Table of Contents

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [Initial Server Setup](#3-initial-server-setup)
4. [Database Setup](#4-database-setup)
5. [Application Build](#5-application-build)
6. [Database Migration](#6-database-migration)
7. [Systemd Service](#7-systemd-service)
8. [Nginx Configuration](#8-nginx-configuration)
9. [TLS Setup](#9-tls-setup)
10. [Process Supervision](#10-process-supervision)
11. [Log Aggregation](#11-log-aggregation)
12. [Backup Setup](#12-backup-setup)
13. [Monitoring Setup](#13-monitoring-setup)
14. [Deployment Procedure](#14-deployment-procedure)
15. [Rollback Procedure](#15-rollback-procedure)
16. [Secrets Management](#16-secrets-management)

---

## 1. Overview

This document describes the complete self-hosted deployment procedure for the Smart Queue Management System using Node.js, PostgreSQL, nginx, and systemd on a Linux server. Use this runbook if you are NOT using Vercel (or another managed platform).

**Who should read this:** Operations engineers deploying the system on a self-managed server.

**Alternative deployment:** For Vercel deployment, see the project settings in `vercel.json` and the Deploy GitHub Actions workflow (`.github/workflows/deploy.yml`).

---

## 2. Prerequisites

| Component                                | Minimum Version | Purpose                         |
| ---------------------------------------- | --------------- | ------------------------------- |
| Linux server (Ubuntu 22.04+ recommended) | —               | Host OS                         |
| Node.js                                  | 20+             | Application runtime             |
| Yarn                                     | 1.22+           | Package manager                 |
| PostgreSQL                               | 15+             | Production database             |
| nginx                                    | 1.20+           | Reverse proxy & TLS termination |
| systemd                                  | —               | Process supervision             |
| certbot                                  | latest          | Let's Encrypt TLS certificate   |
| git                                      | latest          | Source code management          |

**Server sizing:** Minimum 2 GB RAM, 20 GB disk, 2 vCPU. Recommended: 4 GB RAM, 40 GB disk, 4 vCPU.

---

## 3. Initial Server Setup

### 3.1 Create a Non-Root User

```bash
useradd -m -s /bin/bash quems
usermod -aG sudo quems
```

### 3.2 Directory Structure

```
/opt/quems/           # Application code
/etc/quems/           # Configuration and environment
/var/log/quems/       # Application logs
/var/backups/quems/   # Database backups
```

Create the directories:

```bash
mkdir -p /opt/quems /etc/quems /var/log/quems /var/backups/quems
chown -R quems:quems /opt/quems /var/log/quems
```

### 3.3 Firewall

Allow ports 22 (SSH), 80 (HTTP for TLS challenge), 443 (HTTPS):

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

---

## 4. Database Setup

### 4.1 Install PostgreSQL

```bash
apt-get install postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

### 4.2 Create Database and User

```bash
sudo -u postgres psql -c "CREATE DATABASE quems_prod;"
sudo -u postgres psql -c "CREATE USER quems_user WITH ENCRYPTED PASSWORD 'generate-a-strong-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE quems_prod TO quems_user;"
sudo -u postgres psql -d quems_prod -c "GRANT ALL ON SCHEMA public TO quems_user;"
```

### 4.3 Configure Authentication

Edit `/etc/postgresql/15/main/pg_hba.conf` to allow local connections with password:

```
local   all             quems_user                              scram-sha-256
host    all             quems_user        127.0.0.1/32          scram-sha-256
```

Reload PostgreSQL: `systemctl reload postgresql`

### 4.4 Test Connection

```bash
psql postgresql://quems_user:password@localhost:5432/quems_prod -c "SELECT 1;"
```

---

## 5. Application Build

### 5.1 Clone the Repository

```bash
cd /opt/quems
git clone https://github.com/your-org/quems.git .
git checkout main
```

### 5.2 Set Environment Variables

Create `/etc/quems/secrets.env` with the production environment variables. See `.env.example` for the variable list.

**Critical variables:**

```env
DATABASE_URL="postgresql://quems_user:password@localhost:5432/quems_prod?schema=public&connection_limit=30&connect_timeout=10&application_name=quems-app"
NEXTAUTH_SECRET="<generated via openssl rand -base64 32>"
NEXTAUTH_URL="https://queue.example.com"
FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
FCM_PROJECT_ID="my-project"
APP_TIMEZONE="Asia/Colombo"
NODE_ENV="production"
```

Secure the file:

```bash
chmod 600 /etc/quems/secrets.env
chown quems:quems /etc/quems/secrets.env
```

### 5.3 Install and Build

```bash
cd /opt/quems
yarn install --frozen-lockfile
yarn prisma:generate
yarn build
```

---

## 6. Database Migration

### 6.1 Apply Migrations

```bash
cd /opt/quems
yarn prisma:migrate:deploy
```

### 6.2 Seed the Database

```bash
yarn prisma:seed
```

This creates the default roles, permissions, and a super-admin user. Change the default password immediately.

---

## 7. Systemd Service

### 7.1 Create the Service File

Create `/etc/systemd/system/quems.service`:

```ini
[Unit]
Description=Smart Queue Management System
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=quems
WorkingDirectory=/opt/quems
EnvironmentFile=/etc/quems/secrets.env
ExecStart=/usr/bin/yarn start
Restart=on-failure
RestartSec=5s

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/quems /var/log/quems

[Install]
WantedBy=multi-user.target
```

### 7.2 Enable and Start

```bash
systemctl daemon-reload
systemctl enable quems
systemctl start quems
systemctl status quems
```

---

## 8. Nginx Configuration

### 8.1 Create Site Config

Create `/etc/nginx/sites-available/quems.conf`:

```nginx
server {
    listen 80;
    server_name queue.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name queue.example.com;

    # TLS certificates (managed by certbot)
    ssl_certificate     /etc/letsencrypt/live/queue.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/queue.example.com/privkey.pem;

    # Modern TLS configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Application proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # CRITICAL for SSE: no buffering, long timeout
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Logs
    access_log /var/log/nginx/quems-access.log;
    error_log /var/log/nginx/quems-error.log;
}
```

### 8.2 Enable and Reload

```bash
ln -s /etc/nginx/sites-available/quems.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

## 9. TLS Setup

### 9.1 Obtain Certificate (Let's Encrypt)

```bash
certbot --nginx -d queue.example.com
```

Certbot automatically configures nginx and sets up auto-renewal. Verify:

```bash
certbot renew --dry-run
```

---

## 10. Process Supervision

systemd manages the application process. Key commands:

```bash
systemctl status quems         # Check status
systemctl restart quems        # Restart
systemctl stop quems           # Stop
journalctl -u quems -f         # Follow logs
journalctl -u quems --since "1 hour ago"  # Recent logs
```

---

## 11. Log Aggregation

Application logs are available via `journalctl`. For centralized logging, configure your log aggregation service (Papertrail, Loggly, Datadog) to ingest `journald` logs.

---

## 12. Backup Setup

### 12.1 Daily Backup Cron

Create `/etc/cron.d/quems-backup`:

```
0 2 * * * quems pg_dump -Fc -d quems_prod -f /var/backups/quems/backup-$(date +\%Y\%m\%d).dump
```

### 12.2 Retention Cleanup

Clean up backups older than 30 days:

```
0 3 * * * quems find /var/backups/quems/ -name "backup-*.dump" -mtime +30 -delete
```

### 12.3 Offsite Upload (Optional)

Upload to S3 using `awscli`:

```
0 4 * * * quems aws s3 cp /var/backups/quems/backup-$(date +\%Y\%m\%d).dump s3://my-backups/quems/ --sse
```

---

## 13. Monitoring Setup

- External monitoring (Pingdom, UptimeRobot, Datadog): call `GET /api/health` every 60 seconds. Alert on 503 response.
- Log monitoring: aggregate `journald` logs and alert on error patterns.
- Resource monitoring: track CPU, RAM, disk via the server's monitoring agent.

---

## 14. Deployment Procedure

1. SSH into the server as the `quems` user.
2. `cd /opt/quems && git pull origin main`
3. `yarn install --frozen-lockfile`
4. `yarn prisma:migrate:deploy` (if there are new migrations)
5. `yarn build`
6. `systemctl restart quems`
7. Run the smoke test checklist (`docs/smoke-test-checklist.md`).

---

## 15. Rollback Procedure

1. SSH into the server.
2. `cd /opt/quems && git checkout <previous-commit-sha>`
3. `yarn install --frozen-lockfile && yarn build`
4. `systemctl restart quems`
5. Run the smoke test to verify.

**Note:** Database migrations are forward-only. Rolling back the code does not roll back the schema. If a migration must be reversed, follow the PostgreSQL migration rollback procedure in `docs/postgresql-migration.md`.

---

## 16. Secrets Management

- **Storage:** `/etc/quems/secrets.env` (chmod 600, owned by `quems`).
- **Rotation schedule:**
  - `NEXTAUTH_SECRET`: annually (invalidates all sessions).
  - Database password: quarterly.
  - FCM service account JSON: annually.
- **What is NEVER committed:** `.env`, `secrets.env`, `*.pem`, `*.key`, service account JSON files.

---

_End of Self-Hosted Deployment Runbook — Version 1.0.0_
