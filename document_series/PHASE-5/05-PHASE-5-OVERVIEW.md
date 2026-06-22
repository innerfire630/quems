# Smart Queue Management System

## Phase 5 Overview — Analytics, Hardening & Production Readiness

**Version:** 1.0.0
**Status:** Authoritative Reference for Phase 5
**Parent Document:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Series Position:** Phase 5 of 5 (Final Phase)
**Document Count:** 1 overview + 9 sub-phase task plan documents

---

## Table of Contents

1. [Phase 5 Strategic Context](#1-phase-5-strategic-context)
2. [Phase 5 Goals & Non-Goals](#2-phase-5-goals--non-goals)
3. [Phase 5 Deliverables Summary](#3-phase-5-deliverables-summary)
4. [Sub-Phase 5.1 — Analytics & Reporting](#4-sub-phase-51--analytics--reporting)
5. [Sub-Phase 5.2 — System Hardening & Optimization](#5-sub-phase-52--system-hardening--optimization)
6. [Sub-Phase 5.3 — Deployment & Migration](#6-sub-phase-53--deployment--migration)
7. [Sub-Phase Dependency Map](#7-sub-phase-dependency-map)
8. [Cross-Cutting Standards for Phase 5](#8-cross-cutting-standards-for-phase-5)
9. [Phase 5 Exit Criteria & Production Hand-off](#9-phase-5-exit-criteria--production-hand-off)
10. [Phase 5 Document Map (Quick Reference)](#10-phase-5-document-map-quick-reference)

---

## 1. Phase 5 Strategic Context

Phase 5 is the **production-readiness** layer of the Smart Queue Management System. It is the final phase in the DDD series. Where Phases 1–4 built features, Phase 5 makes those features production-grade: observable, performant, secure, and deployable.

The strategic goal is to **transform the working system into a production-ready system**. This means:

- **Analytics & reporting** so administrators can see how the queue is performing over time.
- **System hardening** so the system is secure, performant, and resilient under production load.
- **Deployment & migration** so the system can move from local SQLite development to a real production environment with PostgreSQL, CI/CD, and a deployment checklist.

When Phase 5 is complete, the system is ready to be deployed to a real environment and serve real customers. After Phase 5, there is no Phase 6 — the series ends, and the work transitions from development to operations.

### 1.1 Why This Phase Comes After Phase 4

Phase 5 cannot meaningfully harden or report on a system that doesn't yet exist in a working form. The features from Phases 1–4 (auth, RBAC, queue domain, real-time display, mobile notifications, officer dashboard) must be functional before Phase 5 can:

- Collect analytics from them (5.1).
- Apply rate limits and security headers to their endpoints (5.2).
- Deploy the complete system with PostgreSQL (5.3).

Phase 5 is a **consumer and protector** of everything that came before.

### 1.2 Why This Phase Is the Last

The DDD series is complete at Phase 5. The system's feature set, operational surface, and deployment story are all in place. Future work after Phase 5 falls into three categories, none of which are part of this series:

1. **Operations** — running the system in production, monitoring, incident response.
2. **New features** — the master plan's Section 2.3 lists explicit "out of scope" items (native Android app, SMS/WhatsApp notifications, payment processing, etc.) that are future enhancements.
3. **Scaling** — when the system needs to handle more load than a single server can support (multi-server SSE with Redis Pub/Sub, horizontal scaling, etc.).

These are not Phase 6. They are post-series work that depends on the production deployment established by Phase 5.

### 1.3 Reference to the Master Plan

This overview document **does not redefine** the system-wide specifications. Every architectural, schema, API, and design detail is the responsibility of the [Master Plan](./00-MASTER-PLAN.md). Phase 5 task plan documents will reference the master plan sections they implement (for example, document 5.2.1 will implement Master Plan Section 15's Security Architecture — the rate limits, CORS, and security headers).

---

## 2. Phase 5 Goals & Non-Goals

### 2.1 Phase 5 Goals (Must Be Achieved)

1. A working analytics and reporting layer: daily metrics are collected and aggregated, a reports dashboard renders KPIs and charts, and CSV export is available.
2. Rate limiting on all API endpoints per the master plan's Section 15.3 specification, with stricter limits on auth and ticket issuance endpoints.
3. Security headers on all responses (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) per the master plan's Section 15.5.
4. CORS configuration that allows the web app's same-origin requests and the future Android app's configured origin.
5. Performance optimization: caching for slowly-changing data, query optimization for N+1 patterns, and Prisma query logging in development.
6. A complete audit log policy enforcement: every administrative action writes to `AuditLog` per the policy defined in Phase 2.8.4 (extended with new write points in 5.2.3), and a viewer UI exists in the admin dashboard.
7. A system health check endpoint at `/api/health` that returns the operational status of the system.
8. Application error boundaries that prevent client-side crashes from taking down the entire UI.
9. A complete PostgreSQL migration strategy: the Prisma schema can be swapped from SQLite to PostgreSQL with a single change, the migration is reproducible, and the production data flow is documented.
10. A complete production deployment configuration: environment variables, CI/CD pipeline steps, and a post-deployment smoke test checklist.
11. A final integration test scenario suite that walks through each user role end-to-end.

### 2.2 Phase 5 Non-Goals (Explicitly Out of Scope)

The following are **explicitly out of scope** for the entire DDD series, including Phase 5:

- **Native Android or iOS app development.** The API is ready for it; the app is not built in this series.
- **Multi-server SSE with Redis Pub/Sub.** The in-process singleton from Phase 3.1 is the documented architecture; horizontal scaling is a future upgrade.
- **SMS / WhatsApp / email notifications.** Only FCM push is implemented.
- **Payment processing, video-call queuing, third-party calendar integrations.** All listed as out of scope in the master plan's Section 2.3.
- **Multi-tenancy.** The system is single-tenant.
- **Real-time analytics dashboards** (live updating charts). The reports dashboard in 5.1.2 is a static page with on-demand refresh; live updating is a future enhancement.
- **Automated scheduled email reports.** The architecture is defined in 5.1.3 (the hook exists in the code), but the scheduler is not implemented. The export must be triggered manually.
- **A/B testing, feature flags.** Not in scope.
- **Full internationalization.** The master plan specifies `ttsLanguage` for TTS, but the admin UI itself is English-only.

### 2.3 What "Done" Means for Phase 5

Phase 5 is complete when:

1. An administrator can open the reports dashboard, see KPIs for the current day, filter by service and counter, and export a CSV.
2. The system rejects 11 auth requests in 1 minute from the same IP with a `RATE_LIMITED` error.
3. Every response carries the security headers from Section 15.5.
4. The audit log viewer at `/audit-log` shows all administrative actions filterable by user, action, entity, and date range.
5. `/api/health` returns 200 with a JSON body indicating the operational status of the system.
6. The Prisma schema can be swapped to `postgresql` provider, migrations applied against a PostgreSQL instance, and the application runs identically.
7. The CI/CD pipeline steps (lint → type-check → build → migrate → deploy) are documented and reproducible.
8. A super-admin can complete the post-deployment smoke test checklist against a production-like environment.
9. A non-super-admin user attempting to access the reports or audit log pages is denied (403).

---

## 3. Phase 5 Deliverables Summary

Phase 5 is decomposed into **3 sub-phases**, each containing **3 task plan documents**, for a total of **9 implementation documents**.

| Sub-Phase | Theme                           | Documents           | Primary Outputs                                     |
| --------- | ------------------------------- | ------------------- | --------------------------------------------------- |
| 5.1       | Analytics & Reporting           | 5.1.1, 5.1.2, 5.1.3 | Metrics collection, reports dashboard, CSV export   |
| 5.2       | System Hardening & Optimization | 5.2.1, 5.2.2, 5.2.3 | Rate limiting, performance, audit log, health check |
| 5.3       | Deployment & Migration          | 5.3.1, 5.3.2, 5.3.3 | PostgreSQL migration, CI/CD, production checklist   |

The single most important property of Phase 5 is that **the system is production-ready**: secure, observable, performant, and deployable with confidence.

---

## 4. Sub-Phase 5.1 — Analytics & Reporting

### 4.1 Purpose

Sub-Phase 5.1 makes the system **observable to its operators**. Without analytics, the system is a black box — tickets are issued and served, but no one knows if the queue is performing well. The reports answer questions like: "What's our average wait time today?", "Which counter is the slowest?", "What's the no-show rate?", and "When is our busiest hour?".

The work in this sub-phase has three layers: **collection** (5.1.1 — gather the data), **presentation** (5.1.2 — show it in a dashboard), and **export** (5.1.3 — let administrators take it out of the system).

### 4.2 Why This Sub-Phase Comes First

Analytics (5.1) precedes hardening (5.2) and deployment (5.3) because:

- The reports dashboard is an admin-facing UI that needs the same hardened infrastructure (rate limiting, security headers, audit logging) that 5.2 provides. Building the reports before hardening means the reports themselves may be unhardened, which is a security gap.
- The data collection in 5.1.1 must be in place before 5.1.2 (the dashboard) can show real data. The dashboard without data is a placeholder.
- The CSV export in 5.1.3 shares infrastructure with the reports dashboard (both query the same data). Implementing 5.1.3 in parallel with 5.1.2 is fine, but both need 5.1.1's data.

### 4.3 Document Breakdown

#### Document 5.1.1 — Queue Analytics Data Collection

**Scope:** The `QueueDailySnapshot` population logic, the incremental metric recording during the day, the average wait time and service time calculation methodology, and the analytics query API endpoints.

**What this document covers:**

- The `QueueDailySnapshot` table (from the master plan's Section 8.2) is already in the database and is populated by the daily reset mechanism in Phase 2.3.3. This document **extends** the existing daily-reset logic to include the additional metrics specified in the master plan:
  - `totalIssued` — total tickets issued for the service on that business date.
  - `totalServed` — total tickets successfully served (status = `COMPLETED`).
  - `totalNoShow` — total no-show tickets.
  - `totalCancelled` — total cancelled tickets.
  - `totalWaiting` — remaining waiting tickets at the end of the business day.
  - `averageWaitMinutes` — average customer wait time (from `Ticket.issuedAt` to `Ticket.servedAt` or `Ticket.calledAt`).
  - `averageServiceMinutes` — average serving time per ticket (from `Ticket.servedAt` to `Ticket.completedAt`).
  - `peakHour` — hour of day (0-23) with the most tickets called.
- The **incremental metric recording during the day:**
  - On every ticket issuance, call, recall, no-show, completion, or cancellation, the system updates an **in-memory or in-database running counter** for the current business date.
  - The running counter is per-service. The data structure is a `Map<serviceId, ServiceDailyCounters>` held in memory (or a database table; the document specifies the approach).
  - At daily reset, the running counter is flushed to the `QueueDailySnapshot` record for the previous business date.
- The **average wait time calculation methodology:**
  - For each served ticket, the wait time is `calledAt - issuedAt` (or `servedAt - issuedAt` if the call-to-serve transition is recorded).
  - The average is the arithmetic mean of all wait times for the service on the business date.
  - Edge cases: tickets that were no-show'd (no wait time recorded), tickets that were cancelled (no wait time recorded), tickets that are still waiting at day close (excluded from the average).
- The **average service time calculation methodology:**
  - For each completed ticket, the service time is `completedAt - servedAt`.
  - The average is the arithmetic mean.
  - Edge cases: tickets that were no-show'd or cancelled are excluded.
- The **peak hour calculation:**
  - The hour (0-23) with the highest count of `TICKET_CALLED` events for the service on the business date.
  - The calculation iterates over the `TicketEvent` records with `eventType = CALLED` for the date and finds the hour with the maximum count.
- The **analytics query API endpoints:**
  - `GET /api/reports` — returns the analytics data for a given date range, with optional service and counter filters.
  - The endpoint accepts query parameters: `startDate`, `endDate`, `serviceId?`, `counterId?`.
  - The response includes the daily snapshot data plus any computed aggregations.
- The `lib/analytics-service.ts` module: all the metric calculation logic lives here. Pure functions for testability.
- Route protection: the endpoint is guarded with `report:view` permission.
- The **completeness of the daily reset:** the existing reset in 2.3.3 is updated (in this document) to write all the metrics listed above. The reset is the only place where the `QueueDailySnapshot` is fully populated.

**Outcome:** Every business day, the `QueueDailySnapshot` is populated with the correct metrics. The `GET /api/reports` endpoint returns analytics data for any date range, service, and counter combination. The average wait time, average service time, and peak hour are calculated correctly.

**Master Plan sections implemented:** Section 8.2 (`QueueDailySnapshot` model — full population), Section 9.3 (reports endpoint).

---

#### Document 5.1.2 — Reports Dashboard & Visualization

**Scope:** The reports page layout, the KPI cards, the bar chart, the per-service performance table, the per-counter performance table, the date range picker, and the loading/empty state handling.

**What this document covers:**

- The `app/(dashboard)/reports/page.tsx` page: the main reports dashboard. The page is in the authenticated admin route group, behind the `report:view` permission.
- The **layout** as a sequence of sections:
  - **Top section — date range picker:** a control to select the start and end dates for the report. Defaults to "today" on first load. The page re-fetches when the range changes.
  - **Top section — service and counter filters:** dropdowns to filter by service and by counter. The page re-fetches when the filters change.
  - **KPI cards row:** four key metrics displayed as large numbers with labels and trend indicators (compared to the previous equivalent period):
    - Total tickets today (or in the date range).
    - Average wait time (in minutes).
    - No-show rate (as a percentage).
    - Busiest hour (e.g., "14:00 - 15:00").
  - **Bar chart — tickets by hour:** a chart showing the number of tickets issued per hour of the day, for the date range. Built with Recharts.
  - **Per-service performance table:** a table with columns for service name, total issued, total served, no-show rate, average wait, average service time, peak hour.
  - **Per-counter performance table:** a table with columns for counter name, total tickets served, no-show count, average service time, closure events (count of temporary closures in the period).
- The `<ReportKPICards />`, `<TicketsByHourChart />`, `<ServicePerformanceTable />`, and `<CounterPerformanceTable />` shadcn components (from the master plan's Section 6.5) are implemented.
- The `DataTable` component (from Phase 1.2.3) is reused for the per-service and per-counter tables.
- The `GET /api/reports` endpoint (from 5.1.1) is the data source. The page fetches the data on mount and on filter change.
- The **loading and empty state handling:**
  - While data is loading, a skeleton placeholder is shown.
  - If the date range has no data, an empty state message is displayed: "No data for the selected period".
  - If a service or counter filter returns no results, the relevant table shows "No data" within the table.
- Route protection: `report:view` permission.
- The page is linked from the admin sidebar (the "Reports" nav item).

**Outcome:** An administrator can open `/reports`, see the KPIs and charts for the current day, change the date range or filter by service or counter, and observe the dashboard update. The empty and loading states are handled.

**Master Plan sections implemented:** Sections 6.4 (admin layout), 6.5 (reports components), 9.3 (reports endpoint consumption).

---

#### Document 5.1.3 — Data Export & Scheduled Reports

**Scope:** The `GET /api/reports/export` endpoint, the CSV column definitions, the admin UI for triggering exports, and the future hook for automated scheduled email reports.

**What this document covers:**

- The `GET /api/reports/export?format=csv&date=...` endpoint (from the master plan's Section 9.3):
  - Accepts query parameters: `format` (only `csv` is supported in this phase), `startDate`, `endDate`, `serviceId?`, `counterId?`.
  - Returns a CSV file as the response body with the correct `Content-Type: text/csv` and `Content-Disposition: attachment; filename="report-YYYY-MM-DD.csv"`.
  - The CSV is generated server-side from the same data the reports dashboard uses.
  - The endpoint requires the `report:export` permission.
- The **CSV column definitions:**
  - The CSV has one row per service per day in the date range.
  - Columns: `Date`, `Service Code`, `Service Name`, `Total Issued`, `Total Served`, `Total No Show`, `Total Cancelled`, `Total Waiting`, `Average Wait (min)`, `Average Service (min)`, `Peak Hour`.
  - The CSV is properly escaped (commas in field values, line breaks in field values handled).
- The **admin UI for triggering exports:**
  - A "Export CSV" button on the reports dashboard (5.1.2) that triggers the export with the current filters applied.
  - The button initiates a browser download of the CSV file.
- The **future hook for scheduled email reports:**
  - The architecture defines a `lib/scheduled-reports.ts` module that, if implemented, would call the export endpoint and email the CSV to a list of recipients.
  - In this phase, only the **interface** is defined (function signature, configuration storage for recipients and schedule), but the actual scheduler is not implemented. The implementation is a future enhancement.
  - The configuration is stored in `SystemSetting` (e.g., `reports.scheduled_recipients`, `reports.scheduled_frequency`) and the interface respects these settings.
- The `lib/report-export.ts` module: utility functions for CSV generation, escaping, and the scheduled reports interface.
- The `app/api/reports/export/route.ts` endpoint implementation.
- Route protection: `report:export` permission (stricter than `report:view`).
- Audit log writes for export actions (an export is a sensitive data access event).

**Outcome:** An administrator can trigger a CSV export from the reports dashboard, receive a properly formatted CSV file, and the scheduled reports interface is in place for future implementation.

**Master Plan sections implemented:** Sections 8.2 (SystemSetting usage for future schedule), 9.3 (export endpoint), 17 (decisions log — scheduling deferred).

---

### 4.4 Sub-Phase 5.1 Exit Criteria

Sub-Phase 5.1 is complete when:

1. After a business day with multiple tickets, the `QueueDailySnapshot` contains correct `totalIssued`, `totalServed`, `totalNoShow`, `totalCancelled`, `totalWaiting`, `averageWaitMinutes`, `averageServiceMinutes`, and `peakHour` values.
2. The `GET /api/reports` endpoint returns analytics data for any date range with optional filters.
3. The reports dashboard at `/reports` shows the KPI cards, the tickets-by-hour bar chart, the per-service table, and the per-counter table.
4. The date range picker, service filter, and counter filter work correctly and trigger re-fetches.
5. The CSV export endpoint returns a properly formatted CSV with the correct columns and escaping.
6. The "Export CSV" button on the dashboard downloads the file.
7. A user without `report:view` cannot access the reports page (403).
8. A user without `report:export` cannot call the export endpoint (403).

---

## 5. Sub-Phase 5.2 — System Hardening & Optimization

### 5.1 Purpose

Sub-Phase 5.2 takes the working system and makes it **production-grade**. The system has features; now it needs to be secure (rate limiting, security headers, CORS), performant (caching, query optimization, connection pooling), observable (audit log viewer, health check, error boundaries), and reliable (graceful error handling, monitoring hooks).

This sub-phase does not introduce new user-facing features. It adds the **operational and security infrastructure** that production deployments require.

### 5.2 Why This Sub-Phase Comes After 5.1

Hardening (5.2) comes after analytics (5.1) because:

- The reports dashboard (5.1.2) is itself an admin-facing surface that needs hardening. Building the reports first and hardening them afterwards is cleaner than hardening an empty page and then adding features.
- The export endpoint (5.1.3) needs rate limiting (5.2.1) and audit logging (5.2.3). Building the export before the rate limiter means the export is temporarily unprotected, which is a security gap.
- The audit log viewer (5.2.3) is an admin page that needs the same hardened infrastructure as other admin pages.

### 5.3 Document Breakdown

#### Document 5.2.1 — API Security & Rate Limiting

**Scope:** The rate limiting strategy per route group, the IP-based and user-based rate limits, the in-memory rate limit store, the CORS configuration, the request size limits, and the security headers.

**What this document covers:**

- The **rate limiting strategy** per the master plan's Section 15.3:
  - Auth endpoints (`/api/auth/*`): 10 requests per 1 minute per IP.
  - Ticket issuance (`/api/tickets/issue`): 30 requests per 1 minute per IP.
  - Officer actions (call, recall, no-show): 60 requests per 1 minute per user.
  - SSE connections: 10 concurrent per IP.
  - General API: 200 requests per 1 minute per user (or IP if unauthenticated).
- The **in-memory rate limit store:** a `Map<key, RateLimitBucket>` held in the Next.js process memory. Each bucket tracks the request count, the window start, and the expiry. The store is upgradeable to Redis (a future enhancement) but the interface is the same.
- The `lib/rate-limit.ts` module: utility functions for rate limit checking, bucket creation, and key generation. The module is called from API route handlers and the middleware.
- The rate limit response: when a limit is exceeded, the response is `RATE_LIMITED` (from the master plan's Section 9.2) with HTTP 429 and a `Retry-After` header.
- The **CORS configuration** per the master plan's Section 15.4:
  - The web app: same-origin in production (no CORS needed).
  - The Android app: an `ALLOWED_MOBILE_ORIGINS` environment variable lists the allowed origins.
  - The CORS headers are set in `next.config.ts` and applied to all API responses.
- The **request size limits:**
  - Request body size is limited to prevent abuse (e.g., a 10MB body limit for JSON requests).
  - The limit is configured in the Next.js config and applied globally.
- The **security headers** per the master plan's Section 15.5:
  - `X-Frame-Options: SAMEORIGIN` — prevents clickjacking.
  - `X-Content-Type-Options: nosniff` — prevents MIME sniffing.
  - `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer information.
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables unused browser features.
  - These are set in `next.config.ts` as `headers()` and applied to all responses.
- The **middleware integration:** the rate limiter is invoked from `middleware.ts` (the file from Phase 1.2.3, updated). The middleware checks the rate limit for each request before allowing it through. Per-route-group limits are enforced by inspecting the request path.
- The **route protection is layered:** the middleware does rate limiting, the `withPermission()` guard does auth/RBAC (from Phase 1.3.2), and the route handler does business logic. Each layer is independent and can be tested separately.
- A small test: send 11 auth requests in 1 minute from the same IP and observe the 11th receives 429.

**Outcome:** All API endpoints are rate-limited per the master plan's specification. All responses carry the security headers. CORS allows the Android app origin when configured. The system rejects abuse attempts at the edge.

**Master Plan sections implemented:** Section 15 (entire Security Architecture — rate limits, CORS, security headers).

---

#### Document 5.2.2 — Performance Optimization & Caching

**Scope:** The Next.js `unstable_cache` strategy for slowly-changing data, the revalidation triggers, the SSE connection pooling review, the database query optimization, and the Prisma query logging in development.

**What this document covers:**

- The **Next.js `unstable_cache` strategy** for slowly-changing data:
  - The active services list (used by the kiosk and the display board) is cached. It changes only when a service is created, edited, or deactivated.
  - The active counters list (used by the officer dashboard and the display board) is cached. It changes only when a counter is created, edited, deactivated, or its status changes.
  - The display board configurations list is cached.
  - The system settings (the `SystemSetting` table) is cached.
  - Each cache entry has a `tags` array for revalidation: e.g., `['services']`, `['counters']`, `['display-boards']`, `['settings']`.
- The **revalidation triggers:**
  - On any service mutation (create/update/delete), `revalidateTag('services')` is called.
  - On any counter mutation, `revalidateTag('counters')` is called.
  - On counter status change, `revalidateTag('counters')` is called.
  - On any display board mutation, `revalidateTag('display-boards')` is called.
  - On any system setting change, `revalidateTag('settings')` is called.
  - This pattern ensures that the cache is invalidated as soon as the underlying data changes, so the kiosk and display board always see the latest services and counters.
- The **SSE connection pooling review:**
  - The SSE manager from Phase 3.1 is reviewed for any leaks or efficiency issues.
  - The heartbeat interval (30s) is confirmed to be appropriate.
  - The maximum number of concurrent connections per server is documented (with a recommendation for production: monitor connection counts and plan capacity).
- The **database query optimization:**
  - The report queries in 5.1.1 are reviewed for N+1 patterns. The `QueueDailySnapshot` is denormalized specifically to avoid N+1 in reports, but the underlying ticket data still needs to be queried for some metrics.
  - Prisma's `include` and `select` are used to fetch only the fields needed.
  - Common query patterns are documented with their expected performance characteristics.
  - Indexes are added (or confirmed) on frequently-queried fields: `Ticket.businessDate`, `Ticket.serviceId`, `Ticket.status`, `TicketEvent.eventType`, `CounterStatusEvent.counterId`, `Notification.counterOfficerId`, etc.
- The **Prisma query logging in development:**
  - The Prisma client is configured to log queries in development (with timing).
  - Slow queries (>100ms) are highlighted.
  - The logs help identify N+1 patterns and other inefficiencies during development.
- A small performance test: load the reports dashboard with 10,000 tickets in the database and verify the page loads in under 2 seconds.

**Outcome:** Slowly-changing data is cached with proper revalidation triggers. The reports dashboard is performant even with large datasets. SSE connections are well-managed. Prisma queries are optimized.

**Master Plan sections implemented:** Section 3.2 (Prisma), Section 4.1 (architecture pattern), Section 11 (SSE performance), and the performance implications of Section 8 (data model).

---

#### Document 5.2.3 — Audit Logging & System Monitoring

**Scope:** The `AuditLog` table write points, the audit log viewer in the admin dashboard, the system health check endpoint, and the application error boundary strategy.

**What this document covers:**

- The **AuditLog write points** (per the policy from Phase 2.8.4, extended):
  - User management actions (create, update, deactivate, role assignment change, password reset) — already written in 1.3.3.
  - Service mutations (create, update, deactivate) — written in 2.1.1.
  - Counter mutations (create, update, deactivate) — written in 2.1.2.
  - Service-counter assignment changes — written in 2.1.3.
  - Daily reset (scheduled and manual) — written in 2.3.3.
  - **Display board mutations (create, update, delete) — added in 5.2.3** (in this document).
  - **Export actions — added in 5.1.3, enforced in 5.2.3.**
  - **Counter status change (counter closure) — already audited in 4.2.1, but consolidated in this document.**
  - **System setting changes — added in 5.2.3.**
- The **ticket state change policy clarification:**
  - The master plan's Phase 5 description mentions "ticket state changes" as a write point for `AuditLog`. The Phase 2.8.4 policy (and the implementation in 2.3) chose `TicketEvent` as the authoritative record for ticket state transitions, NOT `AuditLog`. This is because ticket state changes are high-volume (potentially hundreds per day per counter) and the `TicketEvent` table is designed for that scale with proper indexing.
  - `AuditLog` is reserved for **administrative and configuration** events — actions that change the system's configuration, not its day-to-day operation.
  - This document explicitly captures this distinction so the implementation does not double-log.
- The **audit log viewer** at `app/(dashboard)/audit-log/page.tsx`:
  - A paginated table of audit log entries, filterable by user, action, entity, and date range.
  - The `<AuditLogTable />` shadcn component (from the master plan's Section 6.5) is implemented.
  - The `DataTable` component (from Phase 1.2.3) is reused for the table.
  - The `GET /api/audit-log` endpoint returns the filtered, paginated list.
  - Route protection: `system:audit` permission.
- The **system health check endpoint** at `app/api/health/route.ts`:
  - Returns 200 with a JSON body indicating the operational status of the system.
  - The body includes:
    - `status`: `"ok"` or `"degraded"`.
    - `timestamp`: the current ISO 8601 datetime.
    - `database`: `"connected"` or `"disconnected"` (a Prisma query to verify connectivity).
    - `version`: the application version from `package.json`.
    - `uptimeSeconds`: the time since the application started.
  - The endpoint is unauthenticated (so external monitoring tools can call it).
  - The endpoint is rate-limit exempt (it has its own rate limit, e.g., 60 req/min, but is not subject to the general API limit).
- The **application error boundary strategy:**
  - A top-level React error boundary wraps the entire app. If a client-side component throws an unhandled error, the boundary shows a fallback UI ("Something went wrong — please refresh") instead of a blank page.
  - The `<ErrorBoundary />` shadcn component (from the master plan's Section 6.5) is implemented and added to the root layout.
  - Per-route error boundaries are also added to the dashboard layout, the officer layout, the kiosk page, the display board, and the security screen — so a crash in one surface doesn't take down the others.
- The `lib/audit-log.ts` module (already created in Phase 1.3.3) is extended with the new write points and a `query()` function for the viewer.
- The `lib/health-check.ts` module: utility functions for the health check.
- The `lib/error-boundary.tsx` module: the error boundary component.

**Outcome:** The audit log captures every administrative action per the policy. The audit log viewer at `/audit-log` lets administrators filter and view the entries. The `/api/health` endpoint returns the system status. The error boundaries prevent client-side crashes from blanking the entire UI.

**Master Plan sections implemented:** Sections 8.2 (AuditLog model), 9.3 (audit-log endpoint, health endpoint), 6.5 (ErrorBoundary and AuditLogTable components), 15 (security implications of audit logging).

---

### 5.4 Sub-Phase 5.2 Exit Criteria

Sub-Phase 5.2 is complete when:

1. Sending 11 auth requests in 1 minute from the same IP results in 429 on the 11th request.
2. Every response from the application includes the security headers from Section 15.5.
3. The CORS configuration allows requests from the configured `ALLOWED_MOBILE_ORIGINS`.
4. The active services list is cached and invalidated on service mutation.
5. The reports dashboard loads in under 2 seconds with 10,000 tickets in the database.
6. The audit log viewer at `/audit-log` shows all administrative actions filterable by user, action, entity, and date range.
7. The `/api/health` endpoint returns 200 with the operational status JSON.
8. A client-side component throwing an unhandled error shows the error boundary fallback instead of blanking the page.
9. A non-super-admin user cannot access the audit log viewer (403).

---

## 6. Sub-Phase 5.3 — Deployment & Migration

### 6.1 Purpose

Sub-Phase 5.3 takes the system from **local development with SQLite** to **production deployment with PostgreSQL**. The work is primarily configuration and process — there is little new application code. The sub-phase establishes:

- The PostgreSQL migration strategy (5.3.1).
- The production environment configuration and CI/CD pipeline (5.3.2).
- The final integration and production checklist (5.3.3).

When this sub-phase is complete, the system can be deployed to a real environment with confidence. The CI/CD pipeline ensures that every deployment is reproducible, the smoke test checklist ensures that the system is operational after deployment, and the PostgreSQL migration is well-understood.

### 6.2 Why This Sub-Phase Closes Phase 5

Sub-Phase 5.3 is the last sub-phase. It closes Phase 5 by:

- Validating the production database setup (PostgreSQL migration).
- Validating the production deployment process (CI/CD + smoke tests).
- Providing the final checklist that operators use to confirm the system is ready.

After 5.3, the system is **fully production-ready** and the DDD series is complete.

### 6.3 Document Breakdown

#### Document 5.3.1 — PostgreSQL Migration Strategy

**Scope:** The two-step Prisma migration process, the environment variable changes, the data migration strategy from SQLite to PostgreSQL, and the PostgreSQL-specific considerations.

**What this document covers:**

- The **two-step Prisma migration process:**
  - **Step 1 — provider swap:** the `provider` value in `prisma/schema.prisma` is changed from `sqlite` to `postgresql`. This is a single-line change in the schema.
  - **Step 2 — migration:** `prisma migrate deploy` is run against the production PostgreSQL instance. This applies all migrations in order. The first migration (from Phase 1.1.3) contains the full schema.
  - The process is **reproducible**: a fresh PostgreSQL instance, the new schema, and `prisma migrate deploy` produces the full database structure.
- The **environment variable changes:**
  - `DATABASE_URL` is changed from a SQLite file path to a PostgreSQL connection string.
  - Example: `postgresql://user:password@host:5432/database?schema=public`.
  - The `DIRECT_URL` may also be needed for some PostgreSQL setups (e.g., for migrations that require a direct connection bypassing pgbouncer). The document specifies when this is needed.
- The **data migration strategy from SQLite to PostgreSQL:**
  - For a fresh deployment, no data migration is needed — the database starts empty and is seeded.
  - For an existing deployment with data in SQLite, the data migration is:
    - Dump the SQLite database to a SQL file.
    - Convert the SQL file's syntax from SQLite to PostgreSQL (e.g., `AUTOINCREMENT` → `SERIAL`, date functions, etc.).
    - Import the converted SQL into the PostgreSQL database.
    - Verify data integrity with spot checks.
  - The document specifies a recommended tool (e.g., `pgloader`) and the exact steps.
  - Data migration is a **one-time operation** and is not part of the regular deployment process.
- The **PostgreSQL-specific considerations:**
  - **UUID vs CUID for IDs:** the master plan uses `cuid()` for all primary keys. CUIDs are still valid in PostgreSQL (stored as `TEXT`). No change is needed.
  - **JSON column handling:** SQLite stores JSON as `TEXT`; PostgreSQL has a native `JSONB` type. Prisma's `Json` type maps to `JSONB` in PostgreSQL, which is more efficient for querying. The schema does not need to change — Prisma handles the type mapping.
  - **Case sensitivity:** PostgreSQL string comparisons are case-sensitive by default. If the application relies on case-insensitive comparisons (e.g., email lookups), the queries must be explicit: `WHERE LOWER(email) = LOWER(?)`. The document flags this for review.
  - **Connection limits:** PostgreSQL has connection limits (typically 100 by default). The Prisma client connection pool should be sized to stay within this limit. The document specifies the recommended pool size.
  - **Transaction isolation:** PostgreSQL supports multiple isolation levels. The document specifies which level is used (the default `READ COMMITTED` is usually sufficient).
  - **Backups:** PostgreSQL requires a backup strategy. The document specifies the recommended approach (e.g., daily `pg_dump`, or a managed service like AWS RDS automated backups).
- A small verification: swap the provider, run `prisma migrate deploy` against a fresh PostgreSQL instance, run the seed, and verify the application boots and works identically to SQLite.

**Outcome:** The Prisma schema can be swapped from SQLite to PostgreSQL with a single line change. The migrations are reproducible. The data migration path is documented for existing data. PostgreSQL-specific considerations are addressed.

**Master Plan sections implemented:** Section 3.2 (database choice — production), Section 17 (decisions log — PostgreSQL choice).

---

#### Document 5.3.2 — Environment Configuration & CI/CD

**Scope:** The complete `.env.production` variable list, the deployment configuration, the CI/CD pipeline steps, the secrets management, and the post-deployment smoke test checklist.

**What this document covers:**

- The **complete `.env.production` variable list:**
  - `DATABASE_URL` — the PostgreSQL connection string.
  - `DIRECT_URL` — if needed for migrations.
  - `NEXTAUTH_SECRET` — a strong random secret (minimum 256 bits). Generated once and stored securely.
  - `NEXTAUTH_URL` — the production application URL (e.g., `https://queue.example.com`).
  - `FCM_SERVICE_ACCOUNT_JSON` — the FCM service account credentials.
  - `FCM_PROJECT_ID` — the Firebase project ID.
  - `ALLOWED_MOBILE_ORIGINS` — the Android app origin(s) for CORS.
  - `NODE_ENV=production` — the Node.js environment.
  - `RATE_LIMIT_REDIS_URL` — optional, for future Redis-backed rate limiting.
  - Any other environment variables used by the application.
  - The document lists every variable with a description, an example value, and whether it's required or optional.
- The **deployment configuration:**
  - Vercel deployment: the application is a Next.js 14+ app, deployable to Vercel with zero configuration. The environment variables are set in the Vercel project settings. The Prisma migrations are run as part of the Vercel build process.
  - Self-hosted deployment: the application runs on Node.js with the Prisma client. The deployment is via `yarn build` followed by `yarn start`. The reverse proxy (nginx or similar) terminates TLS and forwards to the Node.js process.
- The **CI/CD pipeline steps:**
  - **Step 1 — Lint:** `yarn lint` must pass.
  - **Step 2 — Type-check:** `yarn type-check` must pass.
  - **Step 3 — Test:** `yarn test` (if tests exist; the document specifies the testing strategy).
  - **Step 4 — Build:** `yarn build` must succeed.
  - **Step 5 — Migrate:** `yarn prisma:migrate:deploy` against the production database.
  - **Step 6 — Deploy:** deploy the build artifact to the hosting environment.
  - The pipeline runs on every push to the main branch and on every pull request.
- The **secrets management:**
  - Secrets (NEXTAUTH_SECRET, FCM credentials, database password) are stored in a secrets manager (e.g., Vercel Environment Variables, AWS Secrets Manager, HashiCorp Vault).
  - Secrets are never committed to the repository.
  - The `.env.example` file (committed) lists every variable with a placeholder; `.env.production` is generated by the deployment process.
- The **post-deployment smoke test checklist:**
  - The application loads at the production URL.
  - The login page is reachable.
  - The super-admin can log in.
  - A new user can be created via the admin panel.
  - A service can be created.
  - A counter can be created.
  - The kiosk loads and shows the services.
  - A ticket can be issued.
  - The display board loads and shows the ticket.
  - The officer dashboard loads and can call the ticket.
  - The `/api/health` endpoint returns 200.
  - The audit log is being written for administrative actions.
  - The document specifies this checklist in detail.

**Outcome:** The production environment variables are documented. The CI/CD pipeline is reproducible. The secrets management is secure. The post-deployment smoke test checklist provides confidence that the deployment is successful.

**Master Plan sections implemented:** Section 3.4 (tooling), Section 9.3 (endpoint deployment), Section 15 (security in deployment), Section 17 (decisions log — deployment target).

---

#### Document 5.3.3 — Final Integration & Production Checklist

**Scope:** The end-to-end integration test scenarios, the cross-browser compatibility checklist, the printer compatibility test, the FCM delivery verification, the SSE stability test, and the final security review.

**What this document covers:**

- The **end-to-end integration test scenarios** (manual walkthroughs for each user role):
  - **Super-admin scenario:** log in, create a service, create a counter, assign the service to the counter, create a user with `ADMIN` role, log out, log in as the new admin, verify access.
  - **Admin scenario:** log in, view the reports dashboard, export a CSV, view the audit log.
  - **Counter officer scenario:** log in, navigate to the officer dashboard, call a waiting ticket, recall the ticket, mark as no-show, toggle the counter closed (with a reason), reopen the counter, toggle notifications off.
  - **Security officer scenario:** log in as a security officer, observe a broadcast message arrive (triggered by a counter officer reply), verify the message text and sender.
  - **Kiosk scenario:** load the kiosk, select a service, observe the ticket issued and printed, observe the confirmation screen, observe the auto-reset.
  - **Display board scenario:** load the display board, click to enable audio, observe a ticket call update the board and trigger the bell + TTS announcement.
  - **Daily reset scenario:** trigger a manual reset (via the admin endpoint), verify the ticket counters reset and the snapshot is created.
  - The document specifies the exact steps and expected outcomes for each scenario.
- The **cross-browser compatibility checklist:**
  - Chrome (latest, desktop): the primary target. Display, kiosk, admin, and officer dashboard must all work.
  - Chrome (Android, latest): the officer dashboard must work (and is the target for the future Android app).
  - Safari (macOS, latest): the admin dashboard must work. The TTS may have minor voice differences.
  - The kiosk and display board are designed for Chrome (per the master plan's Section 13.2 — Chrome's `--kiosk-printing` flag is used for silent printing).
- The **printer compatibility test:**
  - The silent printing (from Phase 2.2.3) must be tested with the target thermal printer.
  - The test verifies: 80mm paper format, correct text rendering, no dialog appearing in kiosk mode.
  - A checklist of supported printers (or printer specifications) is provided.
- The **FCM delivery verification test:**
  - With a real Android device registered as a device token, issue a ticket and verify the push notification arrives on the device.
  - The test verifies: the notification has the correct title and body, the data payload is parseable, tapping the notification opens the correct deep link.
  - The test is a manual verification (not automated) and is part of the smoke test checklist.
- The **SSE stability test under concurrent connections:**
  - Open 50+ concurrent SSE connections from different clients.
  - Trigger 100+ ticket events over 5 minutes.
  - Verify: all clients receive all events, no events are dropped, connection heartbeats are maintained, no memory leaks in the server.
  - The test is run against a staging environment before production deployment.
- The **final security review checklist:**
  - All API endpoints require authentication where expected.
  - All API endpoints enforce the correct permissions.
  - All responses carry the security headers.
  - The refresh token rotation works correctly.
  - The rate limiting is effective.
  - The CORS configuration is correct.
  - The audit log is being written for sensitive actions.
  - No secrets are committed to the repository.
  - The `NEXTAUTH_SECRET` is a strong random value.
  - The FCM service account credentials are stored securely.
  - The database password is strong and rotated periodically.
- The **documentation deliverables:**
  - The README.md file is updated with: prerequisites, setup steps, environment variable list, deployment instructions, troubleshooting tips.
  - The DDD series documents (this series) are committed to the repository under `document_series/`.
  - The architectural decisions are documented in the master plan's Section 17.

**Outcome:** The system has been verified end-to-end across all user roles. The cross-browser, printer, FCM, and SSE tests have passed. The security review is complete. The system is ready for production deployment.

**Master Plan sections implemented:** Sections 4.1 (architecture review), 13 (printing verification), 14 (notification verification), 11 (SSE verification), 15 (security review).

---

### 6.4 Sub-Phase 5.3 Exit Criteria

Sub-Phase 5.3 is complete when:

1. The Prisma schema can be swapped to PostgreSQL with a single line change.
2. `prisma migrate deploy` against a fresh PostgreSQL instance produces the correct schema.
3. The data migration from SQLite to PostgreSQL is documented and tested (if applicable).
4. The complete `.env.production` variable list is documented.
5. The CI/CD pipeline steps are documented and reproducible.
6. The post-deployment smoke test checklist is documented and has been executed against a staging environment.
7. All end-to-end integration test scenarios pass.
8. The cross-browser, printer, FCM, and SSE stability tests have passed.
9. The final security review checklist is complete with no critical findings.

---

## 7. Sub-Phase Dependency Map

The following diagram shows the build order of sub-phases and the inter-document dependencies. Documents on the same row can be developed in parallel after the row above is complete.

```
Sub-Phase 5.1 (Analytics & Reporting)
├── 5.1.1  Queue Analytics Data Collection
├── 5.1.2  Reports Dashboard & Visualization           (depends on 5.1.1)
└── 5.1.3  Data Export & Scheduled Reports             (depends on 5.1.1)

Sub-Phase 5.2 (System Hardening & Optimization)
├── 5.2.1  API Security & Rate Limiting                (depends on Phase 1.2.3 middleware)
├── 5.2.2  Performance Optimization & Caching          (depends on 5.1.1 — the report queries)
└── 5.2.3  Audit Logging & System Monitoring           (depends on Phase 1.3.3 audit log helper)

Sub-Phase 5.3 (Deployment & Migration)
├── 5.3.1  PostgreSQL Migration Strategy               (depends on Phase 1.1.3 Prisma setup)
├── 5.3.2  Environment Configuration & CI/CD           (depends on 5.3.1)
└── 5.3.3  Final Integration & Production Checklist    (depends on 5.3.2, all of 5.1, 5.2)
```

**Critical Path:** `5.1.1 → 5.1.2 → 5.2.2 → 5.3.1 → 5.3.2 → 5.3.3`

**Parallel Opportunities:**

- `5.1.2` and `5.1.3` can be developed in parallel after `5.1.1` is complete.
- `5.2.1` and `5.2.3` can be developed in parallel (security headers and audit log are independent).
- `5.2.1`, `5.2.2`, and `5.2.3` can be developed in parallel after `5.1.1` is complete.
- `5.3.1` can be developed in parallel with `5.2.x` (the PostgreSQL migration is independent of hardening).

**Composition with Earlier Phases:**

- The `AuditLog` model from **1.1.3** is the target for 5.2.3's write points.
- The `withPermission()` guard from **1.3.2** is what 5.2.1's rate limiting wraps.
- The middleware from **1.2.3** is what 5.2.1 updates.
- The `QueueDailySnapshot` table from **1.1.3** is populated by **2.3.3** and queried by **5.1.1**.
- The Prisma schema from **1.1.3** is the schema that 5.3.1 migrates.
- The `SystemSetting` table from **1.1.3** is extended by 5.1.3 (for future scheduled reports).

---

## 8. Cross-Cutting Standards for Phase 5

The following standards apply to every Phase 5 task plan document. The conventions from Phases 1, 2, 3, and 4 (folder naming, import paths, TypeScript, Zod validation, error handling, env vars, git commits, transaction boundaries, ticket state machine, event type registry, channel naming, FCM token lifecycle, counter status vs notification toggle independence, officer dashboard composition, broadcast message lifecycle, mobile-facing API conventions) all carry forward. The standards below are **new or specific to Phase 5**.

### 8.1 Audit Log Policy (Extended)

The audit log policy from Phase 2.8.4 is **finalized** in Phase 5.2.3. The complete policy:

**`AuditLog` captures (low-volume, administrative):**

- User management: create, update, deactivate, role assignment change, password reset.
- Service management: create, update, deactivate.
- Counter management: create, update, deactivate.
- Service-counter assignment: assign, unassign.
- Display board management: create, update, delete.
- Counter status: open, temporarily close, reopen.
- Daily reset: scheduled, manual.
- System setting changes.
- Report exports.

**`AuditLog` does NOT capture (high-volume, in dedicated tables):**

- Ticket lifecycle events (in `TicketEvent`).
- Device token registrations and deactivations (in `DeviceToken` and the cleanup log).
- Notification dispatches (in `Notification`).
- Officer replies (in `NotificationReply`).
- Broadcast messages (in `BroadcastMessage`).
- Login attempts and token refreshes (these are auth events; logged separately if at all).

This policy is the single source of truth for what goes in `AuditLog`. Any new administrative action introduced in future work must be evaluated against this policy.

### 8.2 Rate Limit Key Strategy

The rate limit keys follow a consistent pattern:

- **Auth endpoints:** keyed on IP address only (`ip:1.2.3.4`). IP-based because the user is not yet authenticated.
- **Ticket issuance:** keyed on IP address only (kiosks are unauthenticated; rate-limited by IP).
- **Officer actions:** keyed on user ID (`user:abc123`). User-based because the officer is authenticated.
- **SSE connections:** keyed on IP address and counted as concurrent (not per-minute).
- **General API:** keyed on user ID if authenticated, IP if not.

The key strategy is documented in `lib/rate-limit.ts` and is the single source of truth for rate limit keying.

### 8.3 Cache Invalidation Discipline

Every cache entry is invalidated by a specific `revalidateTag()` call. The rules:

- The data fetch that uses the cache specifies the tag(s).
- The mutation that changes the data calls `revalidateTag()` with the matching tag(s).
- If a mutation changes multiple data types (e.g., a service-counter assignment affects both services and counters), all relevant tags are invalidated.
- The tags are constants defined in a single module (e.g., `lib/cache-tags.ts`).

This discipline ensures that the cache is always consistent with the underlying data.

### 8.4 Security Header Discipline

The security headers from the master plan's Section 15.5 are set in `next.config.ts` as `headers()` and applied to ALL responses. The rule: any new response (including error responses, redirects, and SSE responses) inherits the headers. The headers are not opt-in per route; they are global.

### 8.5 Environment Variable Validation

The production environment variables are validated at application startup. The `lib/env.ts` module (or similar) reads every required variable and throws a clear error if any are missing or malformed. The validation runs once on boot and is the first thing the application does.

The validation rules:

- `DATABASE_URL` must be a valid PostgreSQL connection string (in production).
- `NEXTAUTH_SECRET` must be at least 32 characters.
- `NEXTAUTH_URL` must be a valid URL.
- `FCM_SERVICE_ACCOUNT_JSON` (if set) must be valid JSON.
- `ALLOWED_MOBILE_ORIGINS` (if set) must be a comma-separated list of valid URLs.

The validation is environment-aware: in development, missing variables get a warning; in production, missing variables are fatal.

### 8.6 PostgreSQL-Specific Query Discipline

After the migration to PostgreSQL, all queries must be reviewed for:

- **Case-sensitive comparisons:** use `LOWER()` or `ILIKE` for case-insensitive matches.
- **Connection pool sizing:** the Prisma pool size must be set to stay within PostgreSQL's connection limit.
- **JSON queries:** use Prisma's `Json` filter syntax, which maps to `JSONB` queries in PostgreSQL.
- **Date/time zones:** all timestamps are stored as UTC. Application code must convert to local time for display, never store local time.

These disciplines are documented in the relevant code modules and reviewed during the security audit (5.3.3).

### 8.7 CI/CD Pipeline Discipline

The CI/CD pipeline runs on every push and every pull request. The rules:

- The pipeline MUST pass before any merge to the main branch.
- The pipeline MUST run all steps: lint, type-check, build. (Test is optional in this phase — the document specifies whether tests are required for the merge gate.)
- A failed pipeline blocks the merge. There are no "skip CI" or "force merge" options.
- The pipeline is reproducible: any developer can run the same steps locally with `yarn lint && yarn type-check && yarn build`.

### 8.8 Smoke Test Discipline

The post-deployment smoke test is a manual verification (no automation). The rules:

- The smoke test is executed after every production deployment.
- The test must pass within 30 minutes of deployment. If it doesn't, the deployment is rolled back.
- The test results are recorded (in a runbook, in Slack, or in a deployment log).
- The test is a **subset** of the full integration scenarios in 5.3.3 — it's the minimum viable verification that the system is operational.

---

## 9. Phase 5 Exit Criteria & Production Hand-off

### 9.1 Phase 5 Exit Criteria (The Complete Checklist)

Phase 5 is complete when **all** of the following are true:

#### Analytics & Reporting

- [ ] The reports dashboard at `/reports` shows KPIs, charts, and tables for the current day.
- [ ] The CSV export endpoint returns a properly formatted CSV.
- [ ] The date range picker, service filter, and counter filter work correctly.
- [ ] The `QueueDailySnapshot` is populated with correct metrics after a daily reset.
- [ ] Non-admin users cannot access the reports (403).

#### System Hardening

- [ ] All API endpoints are rate-limited per the master plan's Section 15.3.
- [ ] All responses carry the security headers from Section 15.5.
- [ ] CORS is configured for the web app (same-origin) and the Android app (`ALLOWED_MOBILE_ORIGINS`).
- [ ] Slowly-changing data is cached with proper revalidation.
- [ ] The reports dashboard loads in under 2 seconds with 10,000 tickets.
- [ ] The audit log viewer at `/audit-log` shows all administrative actions.
- [ ] The `/api/health` endpoint returns 200 with the operational status.
- [ ] Client-side error boundaries are in place.
- [ ] A non-super-admin user cannot access the audit log (403).

#### Deployment & Migration

- [ ] The Prisma schema can be swapped to PostgreSQL with a single line change.
- [ ] `prisma migrate deploy` against a fresh PostgreSQL produces the correct schema.
- [ ] The data migration from SQLite to PostgreSQL is documented.
- [ ] The complete `.env.production` variable list is documented.
- [ ] The CI/CD pipeline steps are documented and reproducible.
- [ ] The post-deployment smoke test checklist has been executed against staging.
- [ ] All end-to-end integration test scenarios pass.
- [ ] The cross-browser, printer, FCM, and SSE tests have passed.
- [ ] The final security review checklist is complete.

#### Code Quality

- [ ] `yarn lint`, `yarn type-check`, and `yarn build` all pass.
- [ ] All Phase 5 endpoints are guarded with the correct permissions.
- [ ] The README.md is updated with setup, deployment, and troubleshooting information.

### 9.2 What Production Operations Will Assume

When Phase 5 is complete and the system is deployed, the operations team assumes:

- The PostgreSQL database is the production database (no more SQLite).
- The application is deployed via the documented CI/CD pipeline.
- The smoke test checklist is the standard verification after every deployment.
- The audit log is the authoritative record of administrative actions.
- The `/api/health` endpoint is the primary health check for monitoring tools.
- The rate limiting is in place and any spikes are investigated.
- The security headers are in place and any deviations are flagged.
- The error boundaries are in place and any client-side crashes are reported via the error tracking system (if configured in a future enhancement).

### 9.3 What Phase 5 Should Not Touch

Phase 5 task plan documents must **not** introduce:

- **New user-facing features.** Phase 5 is hardening, not feature work. Any new feature is post-series.
- **Native Android or iOS app code.** The API is ready; the app is future.
- **Multi-server SSE with Redis Pub/Sub.** Single-server deployment is sufficient for the initial launch.
- **SMS / WhatsApp / email notifications.** FCM only.
- **Multi-tenancy.** Single-tenant.
- **Real-time analytics dashboards.** The reports are static pages with on-demand refresh.
- **Automated scheduled email reports.** The interface is defined; the scheduler is not implemented.
- **A/B testing, feature flags.** Not in scope.
- **Internationalization of the admin UI.** English-only.

If a Phase 5 task plan document finds itself needing any of the above, it is a signal that the sub-phase is over-scoped and the work should be deferred to post-series enhancements.

---

## 10. Phase 5 Document Map (Quick Reference)

| Doc ID    | Title                                    | Master Plan Sections Implemented                                                           |
| --------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| **5.1.1** | Queue Analytics Data Collection          | 8.2 (`QueueDailySnapshot` full population), 9.3 (reports endpoint)                         |
| **5.1.2** | Reports Dashboard & Visualization        | 6.4, 6.5, 9.3 (reports endpoint consumption)                                               |
| **5.1.3** | Data Export & Scheduled Reports          | 8.2 (`SystemSetting` for future schedule), 9.3 (export endpoint), 17 (deferred scheduling) |
| **5.2.1** | API Security & Rate Limiting             | 15 (entire Security Architecture — rate limits, CORS, security headers)                    |
| **5.2.2** | Performance Optimization & Caching       | 3.2 (Prisma), 4.1 (architecture), 11 (SSE performance), 8 (data model)                     |
| **5.2.3** | Audit Logging & System Monitoring        | 8.2 (AuditLog), 9.3 (audit-log, health), 6.5 (ErrorBoundary, AuditLogTable), 15 (security) |
| **5.3.1** | PostgreSQL Migration Strategy            | 3.2 (database production), 17 (decisions log — PostgreSQL)                                 |
| **5.3.2** | Environment Configuration & CI/CD        | 3.4 (tooling), 9.3 (deployment), 15 (security in deployment), 17                           |
| **5.3.3** | Final Integration & Production Checklist | 4.1, 13, 14, 11, 15 (full system verification)                                             |

---

## Series Conclusion

The Smart Queue Management System DDD document series is now complete:

| Phase | Overview                                    | Status                     |
| ----- | ------------------------------------------- | -------------------------- |
| 0     | Master Plan                                 | ✅ Authoritative Reference |
| 1     | Foundation & Infrastructure                 | ✅ Phase 1 Overview        |
| 2     | Core Queue Domain                           | ✅ Phase 2 Overview        |
| 3     | Real-Time Display & Audio System            | ✅ Phase 3 Overview        |
| 4     | Mobile Notification & Counter Management    | ✅ Phase 4 Overview        |
| 5     | Analytics, Hardening & Production Readiness | ✅ Phase 5 Overview        |

When all 45 task plan documents (1.1.1 through 5.3.3) are derived from these six overviews and implemented, the system is production-ready.

---

_End of Phase 5 Overview Document — Version 1.0.0_

_This document is the authoritative overview for Phase 5 of the Smart Queue Management System DDD series. It is the parent reference for the 9 task plan documents listed in Section 10. All Phase 5 task plan documents must be derived from and remain consistent with this overview and the master plan._

_With this document, the full 6-document series (1 master plan + 5 phase overviews) is complete. The 45 task plan documents can now be generated from these overviews, one per inner subphase task._
