# Smart Queue Management System
## Phase 2 Overview — Core Queue Domain

**Version:** 1.0.0
**Status:** Authoritative Reference for Phase 2
**Parent Document:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Series Position:** Phase 2 of 5
**Document Count:** 1 overview + 9 sub-phase task plan documents

---

## Table of Contents

1. [Phase 2 Strategic Context](#1-phase-2-strategic-context)
2. [Phase 2 Goals & Non-Goals](#2-phase-2-goals--non-goals)
3. [Phase 2 Deliverables Summary](#3-phase-2-deliverables-summary)
4. [Sub-Phase 2.1 — Service & Counter Management](#4-sub-phase-21--service--counter-management)
5. [Sub-Phase 2.2 — Ticket Issuance & Self-Service Kiosk](#5-sub-phase-22--ticket-issuance--self-service-kiosk)
6. [Sub-Phase 2.3 — Queue Processing Operations](#6-sub-phase-23--queue-processing-operations)
7. [Sub-Phase Dependency Map](#7-sub-phase-dependency-map)
8. [Cross-Cutting Standards for Phase 2](#8-cross-cutting-standards-for-phase-2)
9. [Phase 2 Exit Criteria & Phase 3 Hand-off](#9-phase-2-exit-criteria--phase-3-hand-off)
10. [Phase 2 Document Map (Quick Reference)](#10-phase-2-document-map-quick-reference)

---

## 1. Phase 2 Strategic Context

Phase 2 is the **operational core** of the Smart Queue Management System. It is the first phase that introduces real business domain logic — services, counters, tickets, the customer-facing kiosk, and the counter-side queue operations. Everything that runs the queue lives here.

The strategic goal is to **build the working queue engine**: the structural configuration (services and counters), the customer-facing ticket issuance (kiosk), the counter-side ticket lifecycle (call, recall, no-show), and the daily business cycle (reset). When Phase 2 is complete, a customer can walk up to a kiosk, take a ticket, and be served at a counter — even if no real-time display, no audio announcements, no push notifications, and no reports yet exist.

The work in Phase 2 also defines **the seam where real-time events are produced**. The ticket call, recall, and no-show actions in Sub-Phase 2.3 produce events with a documented payload structure. The actual delivery of those events to clients (via SSE) is implemented in Phase 3.1.3. This deliberate split allows Phase 2 to be developed, tested, and verified without depending on the SSE infrastructure being in place — but the data shape, the event types, and the call sites are all locked in by the end of Phase 2.

### 1.1 Why This Phase Comes After Phase 1

Phase 2 cannot exist without the foundation Phase 1 built:

- The `User`, `Role`, and `Permission` tables (Phase 1.3) are required because counter officers (Sub-Phase 2.1) are users, and the `counter:call` permission gates the ticket action endpoints (Sub-Phase 2.3).
- The `withPermission()` guard (Phase 1.3.2) wraps every Phase 2 API route.
- The audit log helper (Phase 1.3.3) is invoked by Phase 2 mutations (service created, counter created, ticket issued, ticket called).
- The login flow and protected route middleware (Phase 1.2) gate the admin pages where Phase 2's service and counter management UIs live.

### 1.2 Why This Phase Comes Before Phase 3

Phase 3 (real-time display and audio) is fundamentally a **consumer** of Phase 2. Phase 3.1.3 implements the `broadcastEvent()` function that delivers events, but those events only exist because ticket operations in Phase 2.3 emit them. Without Phase 2, there are no events to broadcast. Without Phase 3, Phase 2's events are produced but not delivered to any client.

### 1.3 Reference to the Master Plan

This overview document **does not redefine** the system-wide specifications. Every architectural, schema, API, and design detail is the responsibility of the [Master Plan](./00-MASTER-PLAN.md). Phase 2 task plan documents will reference the master plan sections they implement (for example, document 2.2.1 will implement Master Plan Section 8.2's `Ticket` model and the ticket-issuance portion of Section 9.3).

---

## 2. Phase 2 Goals & Non-Goals

### 2.1 Phase 2 Goals (Must Be Achieved)

1. A complete admin interface for creating, editing, listing, and deactivating services and counters, with the many-to-many assignment between them enforced.
2. A working ticket issuance flow: a customer at the kiosk selects a service, receives a ticket with a uniquely formatted number (prefix + zero-padded sequence), and gets an estimated wait time.
3. A working silent printing flow: after a ticket is issued, the kiosk prints the ticket on a thermal printer without showing a browser print dialog.
4. A complete counter-side ticket lifecycle: officers can call the next ticket, recall a ticket they have called, and mark a ticket as no-show — with proper validation, audit logging, and event emission.
5. A defined ticket status state machine that governs every legal transition and prevents illegal ones.
6. A working daily reset mechanism that resets per-service ticket numbering at the boundary of a business day, archives the day's tickets into a daily snapshot, and handles in-progress tickets correctly.
7. A minimal officer-side interaction surface (ticket action panel) that can call/recall/no-show tickets. The full officer dashboard layout is Phase 4, but the action buttons and the underlying behaviour must be working here.
8. SSE event payloads for ticket lifecycle events, with a documented data shape and event-type registry, ready for Phase 3 to deliver.

### 2.2 Phase 2 Non-Goals (Explicitly Out of Scope)

The following are **deferred** to later phases and must not be implemented during Phase 2:

- Any real-time / SSE / display board / audio announcement features (Phase 3). Phase 2 *produces* events; Phase 3 *delivers* them. The broadcast mechanism itself (the SSE manager) is Phase 3.1.3.
- Any push notification / FCM / mobile / counter-status-toggle UI (Phase 4). Counter temporary closure from the officer side (the "I'm going on a break" button) is Phase 4.2.1.
- The full officer dashboard layout with all surrounding context (sidebar, notification toggle, counter status toggle, recent activity feed) — this is Phase 4.2.3. Phase 2 only builds the ticket action panel component.
- Any reporting / analytics / charts (Phase 5). The `QueueDailySnapshot` table is *populated* in Phase 2 (as part of the daily reset), but the reporting dashboard is Phase 5.
- Any rate limiting, security headers, or production hardening (Phase 5).
- Any PostgreSQL migration (Phase 5).
- OAuth / social login.
- Kiosk authentication (kiosks are anonymous; the `KIOSK` role and `ticket:issue` permission govern what the kiosk can do, but the kiosk itself does not log in as a user — it uses a service-account-like session).

### 2.3 What "Done" Means for Phase 2

Phase 2 is complete when:

1. A super-admin can create services, create counters, assign services to counters, and deactivate either.
2. A customer at the kiosk can select a service, take a ticket, see a confirmation screen with the ticket number and estimated wait, and have the ticket print silently on a thermal printer.
3. A counter officer (logged in via Phase 1's auth) can navigate to a temporary test page, see the next waiting ticket, and call it. The ticket's status updates in the database. The event is emitted (visible in the logs even if not yet delivered to any client).
4. The officer can recall the same ticket, then mark it as no-show. Each action updates the ticket's status and writes a `TicketEvent` audit record.
5. At the configured daily reset time, the system resets the per-service ticket counters and creates a `QueueDailySnapshot` for the previous day.
6. All illegal ticket state transitions are rejected with a clear error.

---

## 3. Phase 2 Deliverables Summary

Phase 2 is decomposed into **3 sub-phases**, each containing **3 task plan documents**, for a total of **9 implementation documents**.

| Sub-Phase | Theme | Documents | Primary Outputs |
|---|---|---|---|
| 2.1 | Service & Counter Management | 2.1.1, 2.1.2, 2.1.3 | Service/counter CRUD, many-to-many assignment, admin pages |
| 2.2 | Ticket Issuance & Self-Service Kiosk | 2.2.1, 2.2.2, 2.2.3 | Ticket generation engine, kiosk UI, silent printing |
| 2.3 | Queue Processing Operations | 2.3.1, 2.3.2, 2.3.3 | Call/recall, no-show, daily reset |

The single most important property of Phase 2 is that the **ticket lifecycle is fully working** at the API and database level by the end of Sub-Phase 2.3 — even though no client (display, officer dashboard, mobile app) is yet subscribed to its events.

---

## 4. Sub-Phase 2.1 — Service & Counter Management

### 4.1 Purpose

Sub-Phase 2.1 establishes the **structural backbone** of the queue system. Services represent the categories of work the system handles (e.g., "General Inquiry", "Medical", "Finance"). Counters represent the physical or virtual points of service where officers serve customers. The relationship between them is many-to-many: a counter can handle multiple services, and a service can be served at multiple counters.

No tickets are issued in this sub-phase. The work is purely configuration: defining what services exist, what counters exist, and which counters handle which services.

### 4.2 Why This Sub-Phase Comes First

Sub-Phases 2.2 and 2.3 cannot function without services and counters in place:

- A ticket must reference a service (Sub-Phase 2.2).
- A counter call must be issued by an officer assigned to a counter, and the counter must have services assigned to it (Sub-Phase 2.3).
- The daily reset (Sub-Phase 2.3) operates over services.

Sub-Phase 2.1 produces the data foundation that 2.2 and 2.3 build on.

### 4.3 Document Breakdown

#### Document 2.1.1 — Service Entity & Management API

**Scope:** The Service CRUD API, the service listing and detail admin pages, and the service management business rules.

**What this document covers:**

- The `Service` model is already defined in the master plan's Section 8.2 and was created in the Prisma schema during Phase 1.1.3. This document implements the API and UI that operates on it.
- The `POST /api/services` and `GET /api/services` endpoints (from the master plan's Section 9.3 endpoint registry), the `GET /api/services/[serviceId]`, `PATCH /api/services/[serviceId]`, and `DELETE /api/services/[serviceId]` endpoints.
- **Business rules for services:**
  - `code` must be unique across all services (enforced at the database and API layers).
  - `ticketPrefix` must be unique across all services and must be a single uppercase letter (or a small defined set of characters — the document specifies the exact allowed set).
  - `isActive` toggles whether the service appears on the kiosk; deactivated services are hidden from customers but remain in the database for historical ticket references.
  - `currentTicketNumber` is incremented atomically on every ticket issuance and reset to 0 at daily reset. The document defines the atomicity strategy (database transaction with row lock, or Prisma's `increment` operation, or similar).
  - `sortOrder` controls the order services appear in the kiosk's service grid.
  - `averageServiceTime` is the input to the estimated wait time calculation in Sub-Phase 2.2.
- The Zod validation schema for service create/update in `schemas/service.schema.ts`, reused on both the client and the server.
- The `app/(dashboard)/services/page.tsx` listing page: a data table of services with columns for name, code, prefix, active status, current ticket number, sort order, and actions.
- The `app/(dashboard)/services/new/page.tsx` and `app/(dashboard)/services/[serviceId]/page.tsx` create/edit pages, using the shadcn `ServiceForm` component from the master plan's Section 6.5.
- The route protection: pages and API endpoints are guarded with `service:read` (for listing) and `service:manage` (for create/update/delete).
- Audit log writes for every service mutation (create, update, deactivate).

**Outcome:** A super-admin can open `/services`, see all services, create a new service with a code and prefix, edit any service, and deactivate services. The API endpoints are functional and validated. The `currentTicketNumber` field is in the database and ready for Sub-Phase 2.2 to increment.

**Master Plan sections implemented:** Sections 6.4, 6.5, 8.2 (`Service` model), 9.3 (services API endpoints), and the audit log writes referenced in Section 15.

---

#### Document 2.1.2 — Counter Entity & Management API

**Scope:** The Counter CRUD API, the counter listing and detail admin pages, and the counter management business rules.

**What this document covers:**

- The `Counter` model (Section 8.2) and its API endpoints: `POST /api/counters`, `GET /api/counters`, `GET /api/counters/[counterId]`, `PATCH /api/counters/[counterId]`, `DELETE /api/counters/[counterId]`.
- **Business rules for counters:**
  - `number` must be unique across all counters (it's the number shown on the display board — it must be unambiguous).
  - `name` and `displayLabel`: the document clarifies the relationship — `name` is the administrative name, `displayLabel` is what's shown on the display board (it defaults to `name` but can be overridden, e.g., "Counter 2" in admin becomes "Information Desk" on the display).
  - `isActive` distinguishes a counter that exists in the system from one that's been retired. Active=false hides it from assignment but preserves historical tickets.
- The `app/(dashboard)/counters/page.tsx` listing page: a data table with columns for number, name, display label, active status, number of assigned services, current operational status (open / temporarily closed / offline — though the toggle is Phase 4.2.1, the indicator reads from the `CounterOfficer.currentStatus` field), and assigned officers.
- The `app/(dashboard)/counters/new/page.tsx` and `app/(dashboard)/counters/[counterId]/page.tsx` create/edit pages, using the shadcn `CounterForm` component.
- The `app/(dashboard)/counters/[counterId]/services/page.tsx` placeholder page: a stub for Sub-Phase 2.1.3's service assignment UI. The page exists with a heading but the assignment UI is implemented in 2.1.3.
- The route protection: pages and API endpoints are guarded with `counter:read` and `counter:manage`.
- Audit log writes for every counter mutation.

**Outcome:** A super-admin can open `/counters`, see all counters, create a new counter with a unique number, edit any counter, and deactivate counters. The counter list shows the current operational status (even if the toggle is implemented later — the field is read from the database).

**Master Plan sections implemented:** Sections 6.4, 6.5, 8.2 (`Counter` model), 9.3 (counter API endpoints).

---

#### Document 2.1.3 — Service-Counter Assignment Logic

**Scope:** The `CounterService` join table management, the assignment UI, and the validation/cascade rules.

**What this document covers:**

- The `CounterService` join table (Section 8.2) and the API endpoints: `GET /api/counters/[counterId]/services`, `POST /api/counters/[counterId]/services` (assign), `DELETE /api/counters/[counterId]/services` (unassign).
- The reverse view: from a service, which counters handle it (computed from the join table; no separate endpoint required, but the service detail page in 2.1.1 can show the list).
- **Validation rules:**
  - A counter must have at least one assigned service. Attempting to remove the last service from a counter is rejected with a clear error. (This is the only "non-empty" rule on the relationship — the inverse, that a service must be in at least one counter, is not enforced, because services can exist as configuration before any counter handles them.)
  - Duplicate (counter, service) pairs are prevented by a composite unique constraint.
- The `app/(dashboard)/counters/[counterId]/services/page.tsx` service assignment UI: shows the counter's currently assigned services as a list, allows adding a service from a dropdown of available services, and allows removing an assigned service (subject to the "at least one" rule).
- The service detail page in 2.1.1 also shows the list of counters that handle this service, with a link to each counter's detail page.
- The `CounterServiceAssignment` shadcn component (Section 6.5) for the multi-select / tag-style assignment UI.
- **Cascade behavior:**
  - Deactivating a service (`isActive = false`) does not automatically remove it from any counter. It just becomes hidden at the kiosk. (An administrator may need to re-enable it later.)
  - Deactivating a counter (`isActive = false`) does not delete the assignments. They remain in the join table for historical reference, but the counter stops appearing in any "active counters" lists.
  - Deleting a service or counter is forbidden if it would orphan historical tickets. The document specifies the soft-delete vs hard-delete policy: services and counters are soft-deleted (deactivated) — they are never hard-deleted while ticket history references them.
- Route protection: assignment pages and API endpoints are guarded with `counter:manage`.
- Audit log writes for every assignment change.

**Outcome:** A super-admin can navigate to a counter's services page, assign or unassign services, and see the assignment reflected in both the counter detail and the service detail. The "at least one service per counter" rule is enforced. Deactivating a service or counter preserves the assignment history.

**Master Plan sections implemented:** Sections 6.5 (`CounterServiceAssignment` component), 8.2 (`CounterService` join table), 9.3 (assignment API endpoints), 17 (decisions on cascade behavior).

---

### 4.4 Sub-Phase 2.1 Exit Criteria

Sub-Phase 2.1 is complete when:

1. At least two services and at least two counters exist in the database (created via the admin UI).
2. The service-to-counter assignment is functional in both directions (counter view shows services, service view shows counters).
3. A service cannot be created with a duplicate code or prefix; the form shows a clear validation error.
4. A counter cannot be created with a duplicate number; the form shows a clear validation error.
5. Attempting to remove the last service from a counter is rejected.
6. Deactivating a service hides it from the kiosk-active list but preserves the join table records.
7. A non-admin user cannot access the service or counter management pages (403).

---

## 5. Sub-Phase 2.2 — Ticket Issuance & Self-Service Kiosk

### 5.1 Purpose

Sub-Phase 2.2 is the **customer-facing entry point** of the system. It implements the self-service kiosk where anonymous customers select a service, receive a ticket, and have it printed. The ticket generation engine, the kiosk UI, and the silent printing flow are all part of this sub-phase.

The kiosk is the only unauthenticated, customer-facing UI in the system. Its design constraints are very different from the admin and officer dashboards: touch-first, full-screen, no chrome, no navigation, with an auto-reset timer to prevent the kiosk from getting stuck on a previous customer's screen.

### 5.2 Why This Sub-Phase Comes After 2.1

Sub-Phase 2.2 cannot issue tickets without services and counters configured. The kiosk must load the list of active services (from 2.1.1) and assign a generated ticket to one of the counters that handle that service (from 2.1.3). The ticket issuance also depends on the `currentTicketNumber` field that 2.1.1 defined and that the daily reset (2.3.3) manages.

### 5.3 Document Breakdown

#### Document 2.2.1 — Ticket Generation Engine & Queue Logic

**Scope:** The `POST /api/tickets/issue` endpoint, the ticket number generation algorithm, the estimated wait time calculation, the daily reset trigger, and the queue position calculation.

**What this document covers:**

- The `Ticket` model (Section 8.2) is already in the database from Phase 1.1.3. This document implements the API and business logic that operates on it.
- The `POST /api/tickets/issue` endpoint (Section 9.3): the only unauthenticated ticket endpoint (kiosks do not log in as users, but the request is permitted by the `KIOSK` role's `ticket:issue` permission via a service token, or by an explicit allow-list for the kiosk route).
- **Ticket number generation algorithm:**
  - The ticket number is composed of the service's `ticketPrefix` (e.g., `A`) plus a zero-padded sequential number (e.g., `A001`, `A002`, ... `A999`, then `A1000`).
  - The zero-padding width is configurable but defaults to 3 digits. The document specifies the exact default and the rule for when the padding expands (e.g., when the daily count exceeds 999).
  - The `displayNumber` field stores the integer sequence (1, 2, 3, ...) without the prefix or padding.
  - The `currentTicketNumber` field on the `Service` record is atomically incremented within the same transaction that creates the new `Ticket`. This ensures uniqueness even under concurrent issuance.
- The **queue position calculation:** when a ticket is issued, its `waitPosition` is set to the count of currently WAITING tickets for the same service, plus one. The document specifies the exact query and the concurrency handling.
- The **estimated wait time calculation formula:**
  - The formula uses the service's `averageServiceTime` (in minutes) and the number of waiting tickets ahead of this one in the same service.
  - The default formula: `estimatedWaitMinutes = waitPosition * averageServiceTime`.
  - The document specifies a smoothing factor or fallback when `averageServiceTime` is null (default to a system-wide setting, e.g., 5 minutes).
  - The result is stored in the ticket's `estimatedWaitMinutes` field at issuance time, so historical accuracy is preserved.
- The **business date concept:** every ticket has a `businessDate` field (the date the ticket belongs to, used for daily resets). The document specifies how the business date is determined (e.g., server local time at the configured daily reset hour, or UTC, or a configurable system setting) and the default value.
- The `TicketEvent` record for issuance: a `TicketEvent` with `eventType = ISSUED` is written in the same transaction as the ticket creation.
- The SSE event emission: the document specifies that on issuance, an event is emitted (the actual SSE delivery is Phase 3, but the data shape is locked here). The event type and payload are documented.
- Zod validation for the issue request (e.g., `serviceId` is a valid service ID, the service is active).
- The `audit-log` write for the ticket issuance (debatable — high-volume actions may skip audit logging; the document specifies the policy).
- The `lib/ticket-service.ts` module: all the business logic (number generation, position calculation, wait time estimation) lives here as pure functions for testability.

**Outcome:** A `POST /api/tickets/issue` request with a valid `serviceId` returns a fully populated ticket object with the correct number, position, and estimated wait. The `Service.currentTicketNumber` is incremented atomically. A `TicketEvent` audit record is written. An event is emitted for downstream consumption (Phase 3).

**Master Plan sections implemented:** Sections 6.5 (TicketBadge, StatusChip), 8.2 (`Ticket` and `TicketEvent` models), 9.3 (ticket issuance endpoint), 11.3 (`TICKET_CALLED` event payload — but here, the `TICKET_ISSUED` event payload is added to the same envelope structure).

---

#### Document 2.2.2 — Kiosk UI & Service Selection Flow

**Scope:** The kiosk's user-facing UI, the service selection grid, the confirmation screen, the auto-reset timer, and the kiosk configuration loading.

**What this document covers:**

- The `app/kiosk/page.tsx` page: the full-screen kiosk interface. The document specifies the route resolution — kiosks may be a specific kiosk instance via `?kioskId=xxx` (loading the matching `KioskConfig`), or a default kiosk if no ID is provided. Multiple kiosks are supported via the `KioskConfig` table.
- The **kiosk layout** as specified in the master plan's Section 6.4: full screen, white background, 32px padding, brand logo, current date/time, welcome message.
- The **service selection grid:** displays the active services as large tappable cards (2 columns on tablet, 1 column on phone). Each card shows the service name, icon (from `Service.iconName`), color accent, and a brief description. The grid is filtered by `KioskConfig.restrictedServiceIds` if set.
- The **service selection → confirmation flow:** tapping a service navigates to a confirmation screen that shows the generated ticket number, the service name, the estimated wait time, and the counter guidance text ("Please wait to be called").
- The **auto-reset timer:** the kiosk returns to the home screen after `KioskConfig.autoResetSeconds` of inactivity. Inactivity is defined as no tap, no API call, and no SSE event handling (i.e., the timer resets on any user interaction). The timer is implemented as a hook (`useKioskReset`) that listens for interaction events.
- The **kiosk configuration loading:** on page load, the kiosk fetches its `KioskConfig` (by ID from the URL query, or the default config). If no active kiosk config is found, a fallback message is shown.
- The `KioskServiceGrid`, `ServiceCard`, `TicketConfirmation`, and `KioskResetTimer` shadcn components (Section 6.5) are implemented.
- The `app/kiosk/layout.tsx` provides a minimal layout (no sidebar, no top bar) suitable for full-screen kiosk deployment.
- The `lib/kiosk-config.ts` module loads and exposes the active kiosk config to the kiosk components.
- The kiosk does **not** require authentication, but the `ticket:issue` permission check happens at the API layer. The `KIOSK` role is implicitly granted this permission (from Phase 1.3.1) and the API verifies the request comes from an allowed origin.

**Outcome:** A customer at the kiosk sees the service grid, taps a service, sees the confirmation screen with the ticket number and wait estimate, and the screen auto-resets to the grid after the configured timeout. The full flow is touch-optimized and full-screen.

**Master Plan sections implemented:** Sections 6.4 (kiosk layout), 6.5 (kiosk components), 8.2 (`KioskConfig` model), 9.3 (ticket issue from the kiosk's perspective).

---

#### Document 2.2.3 — Silent Ticket Printing Implementation

**Scope:** The silent printing strategy, the printable ticket template, the print CSS, the trigger mechanism, and the fallback behavior.

**What this document covers:**

- The **silent printing strategy** as specified in the master plan's Section 13: a hidden `<iframe>` containing a dedicated printable ticket template is injected into the kiosk page DOM after ticket issuance. The iframe's `contentWindow.print()` is called, which triggers a print of only the iframe contents. Combined with Chrome's `--kiosk-printing` mode and a pre-configured default printer, this prints silently without a dialog.
- The **printable ticket template** (the `PrintTicket` shadcn component from Section 6.5): renders the ticket number (large, bold), the service name, the counter guidance text, the estimated wait time (if `KioskConfig.showEstimatedWait` is true), the issue datetime, the business logo (if set), and a reserved space for a future QR code.
- The **print CSS** targets 80mm thermal paper by default: `@page { size: 80mm auto; margin: 4mm; }`. A 58mm variant is also defined and selected via a CSS media query or a `KioskConfig` setting.
- The **trigger mechanism:** after the `POST /api/tickets/issue` call returns successfully, the kiosk's confirmation screen mounts the `PrintTicket` component into a hidden iframe and calls its print function. The document specifies the exact lifecycle (mount → wait for content load → call print → unmount or keep for reprint).
- The **`KioskConfig.printerName` field:** the document specifies how the configured printer name is used. In Chrome kiosk mode, the browser uses the OS-level default printer, so the field is informational (and used for diagnostics). The document specifies what happens if the field is unset (use the OS default).
- The **fallback behavior** if printing fails: the iframe's print promise rejects, the `onerror` handler fires, the kiosk displays a "Print failed — please show this screen to the counter" fallback message, and the ticket is still recorded in the database. The document specifies the exact UX (a yellow warning banner, a "Reprint" button, etc.).
- The **audio file prerequisite:** the master plan's Section 12.1 specifies that `bell.mp3` lives in `public/sounds/`. This document does not add the audio logic (that's Phase 3.3), but it does place the file in the project as a static asset to avoid Phase 3 needing to add it later.
- The print iframe is sandboxed (the document specifies the sandbox attributes) to limit its capabilities.

**Outcome:** After a ticket is issued, the kiosk prints the ticket on the default thermal printer without showing a browser print dialog. If printing fails, a clear fallback message is shown and the customer is guided to the counter with the on-screen ticket number.

**Master Plan sections implemented:** Sections 6.5 (`PrintTicket` component), 8.2 (`KioskConfig` model usage), 12 (print file location), 13 (silent printing architecture).

---

### 5.4 Sub-Phase 2.2 Exit Criteria

Sub-Phase 2.2 is complete when:

1. A kiosk loads and shows the active services as a tappable grid.
2. Tapping a service results in a `POST /api/tickets/issue` call and a successful response.
3. The ticket number is in the correct format (prefix + zero-padded sequence) and is unique for the day within the service.
4. The confirmation screen shows the ticket number, the service name, the estimated wait, and a counter guidance message.
5. The confirmation screen auto-resets to the grid after the configured timeout.
6. After the issuance, the ticket prints silently on the configured thermal printer (in a Chrome kiosk-mode environment) without a print dialog.
7. If the printer is unavailable, a clear fallback message is shown.
8. Two kiosks issued in quick succession (e.g., 50ms apart) get sequential ticket numbers, never the same number.
9. The `Service.currentTicketNumber` field is correctly incremented.

---

## 6. Sub-Phase 2.3 — Queue Processing Operations

### 6.1 Purpose

Sub-Phase 2.3 is the **counter-side of the queue**. It implements the operations an officer performs on tickets: calling the next waiting ticket, recalling a previously called ticket, and marking a ticket as no-show. It also implements the daily reset — the business process that closes out the day's queue and starts a fresh one.

The work in this sub-phase is what produces the events that Phase 3 delivers. Every state transition is audited, validated, and emitted as a structured event for downstream consumers.

### 6.2 Why This Sub-Phase Closes Phase 2

Sub-Phase 2.3 is the last sub-phase of Phase 2. It closes the loop on the ticket lifecycle:

- A ticket is issued in Sub-Phase 2.2.
- A ticket is called, recalled, or marked no-show in Sub-Phase 2.3.
- At the end of the business day, the ticket is closed out and snapshotted in Sub-Phase 2.3's daily reset.

After Sub-Phase 2.3, the system has a **fully functional queue at the API and database level**, ready to be observed and acted upon by Phase 3's real-time display, Phase 4's officer dashboard and push notifications, and Phase 5's reporting.

### 6.3 Document Breakdown

#### Document 2.3.1 — Call & Recall Ticket Operations

**Scope:** The `POST /api/tickets/[ticketId]/call` and `POST /api/tickets/[ticketId]/recall` endpoints, the ticket status state machine for these transitions, the validation rules, and the SSE event payload for call events.

**What this document covers:**

- The `POST /api/tickets/[ticketId]/call` endpoint (Section 9.3): an officer calls a ticket to bring it to their counter.
- The `POST /api/tickets/[ticketId]/recall` endpoint: an officer re-announces a ticket that was previously called but is being re-cued (e.g., the customer didn't appear in time and the officer wants to call them again).
- **Validation rules:**
  - The calling officer must be assigned to the counter that will serve the ticket (the counter must be in the `CounterOfficer` join with `isOnDuty = true`).
  - The counter must be `isActive = true` (deactivated counters cannot receive calls).
  - The ticket must be in a state that allows the operation:
    - For `call`: ticket must currently be `WAITING`, `RECALLED` (a re-call), or `NO_SHOW` (the officer is giving the customer another chance). It must **not** be `CALLED` (already called, recall the same one), `SERVING` (already being served), `COMPLETED` (already done), `TRANSFERRED`, or `CANCELLED`.
    - For `recall`: ticket must currently be `CALLED` or `RECALLED`. The recall operation increments the recall counter (a `recalledAt` timestamp is updated, and a `TicketEvent` of type `RECALLED` is written).
  - The ticket's service must be one of the services assigned to the counter (the validation enforces that officers cannot call tickets for services their counter doesn't handle).
- The **ticket status state machine** for the call/recall transitions is documented as a state diagram (textual, not visual code). The legal transitions during this sub-phase are:
  - `WAITING → CALLED` (on call)
  - `CALLED → RECALLED` (on recall)
  - `RECALLED → CALLED` (on call again)
  - `NO_SHOW → CALLED` (on call, giving another chance)
  - `CALLED → SERVING` and `SERVING → COMPLETED` are **deferred to a later phase** (the master plan does not explicitly list them as Phase 2; the document may include the call-to-serving transition as part of "calling" or defer it to Phase 4.2.3 — the exact policy is specified in the document). The `TicketStatus` enum already supports these values, but the transitions are defined in this document for the ones Phase 2 implements.
  - `* → CANCELLED` and `* → TRANSFERRED` are out of scope.
- The **SSE event payload for a call event** (the `TICKET_CALLED` event from the master plan's Section 11.3) is **fully defined in this document** with the exact field shape, types, and required fields. The actual SSE delivery (writing to the SSE manager) is a no-op or a stub during Phase 2 — the call site invokes a `broadcastEvent()` function whose implementation is provided in Phase 3.1.3. This is the critical seam between Phase 2 and Phase 3.
- The `TicketEvent` audit record is written in the same transaction as the status update.
- The `audit-log` write is also performed.
- The Zod validation schema for the call/recall request.
- Route protection: the `counter:call` permission gates both endpoints.

**Outcome:** An officer with the correct counter assignment can call any waiting ticket for their counter's services. The ticket's status updates atomically. A `TicketEvent` is written. A `TICKET_CALLED` event is emitted (even if not yet delivered to any client). The recall operation works on a previously called ticket.

**Master Plan sections implemented:** Sections 6.5 (TicketActionPanel), 8.2 (`Ticket` and `TicketEvent` models), 9.3 (call/recall endpoints), 11.3 (TICKET_CALLED event payload definition), 11.4 (broadcast message envelope structure).

---

#### Document 2.3.2 — No-Show Handling & Queue Advancement

**Scope:** The `POST /api/tickets/[ticketId]/no-show` endpoint, the no-show grace period, the automatic advancement option, the audit record, and the temporary officer interaction surface for the no-show action.

**What this document covers:**

- The `POST /api/tickets/[ticketId]/no-show` endpoint (Section 9.3).
- **Validation rules:**
  - The ticket must be in `CALLED` or `RECALLED` state — a waiting ticket that was never called cannot be marked no-show (the customer never had a chance to appear).
  - The calling officer must be the officer who originally called the ticket (or have the `counter:manage` permission as an override).
- The **no-show grace period:** the document specifies a configurable grace period (e.g., 60 seconds — the exact default is specified here) after the `calledAt` timestamp. If the grace period has not elapsed, the no-show action is rejected with a clear "Ticket was just called — please wait" error. This prevents officers from prematurely marking tickets as no-show immediately after calling.
- The **automatic advancement option:** when a ticket is marked no-show, the system can automatically call the next waiting ticket for the same service. This is controlled by a system setting (e.g., `SystemSetting.queue.auto_advance_on_no_show`). The document specifies the default (true) and the override mechanism.
- The `TicketEvent` record with `eventType = NO_SHOW` is written, including a metadata field capturing the previous status, the grace period elapsed time, and the auto-advance outcome.
- The SSE event emission: a `TICKET_NO_SHOW` event is emitted with a documented payload. As with call/recall, the actual delivery is Phase 3.
- The `audit-log` write.
- The **temporary officer ticket action panel** (`TicketActionPanel` shadcn component from Section 6.5): a minimal component with the Call, Recall, and No-Show buttons that the officer can use to act on the current ticket. The component is implemented in this document and is used by a stub page (`app/(officer)/counter/[counterId]/page.tsx`) that shows the current serving ticket and the action buttons. The full officer dashboard layout (with sidebar, notification toggle, counter status toggle, etc.) is Phase 4.2.3 — this stub is replaced by that full layout.
- Zod validation, route protection (`counter:call` permission), and standard error responses.

**Outcome:** An officer can mark a called ticket as no-show after the grace period has elapsed. The ticket's status updates to `NO_SHOW`, a `TicketEvent` is written, a `TICKET_NO_SHOW` event is emitted, and (if auto-advance is enabled) the next waiting ticket is automatically called. The officer sees the updated state in the temporary ticket action panel.

**Master Plan sections implemented:** Sections 6.5 (TicketActionPanel), 8.2 (`TicketEvent` for no-show), 9.3 (no-show endpoint), 11.2 (TICKET_NO_SHOW event in the channel registry).

---

#### Document 2.3.3 — Daily Queue Reset & Queue State Management

**Scope:** The daily reset mechanism, the per-service ticket counter reset, the daily snapshot population, the manual reset override, and the handling of in-progress tickets.

**What this document covers:**

- The **daily reset mechanism:** a scheduled job that fires at a configurable time (default: midnight local time, stored in `SystemSetting` as `queue.daily_reset_time`). The job iterates over all services and:
  - Archives the previous day's tickets (in WAITING state) to a `QueueDailySnapshot` per service.
  - Calculates the day's statistics: `totalIssued`, `totalServed`, `totalNoShow`, `totalCancelled`, `totalWaiting`, `averageWaitMinutes`, `averageServiceMinutes`, `peakHour`.
  - Resets each service's `currentTicketNumber` to 0.
  - The new business date starts.
- The **scheduling approach:** the document specifies the implementation (e.g., a cron-style scheduler, a `setInterval` with a check on app boot, or a serverless cron — the simplest approach for a single-server Next.js deployment is documented).
- The **manual reset override:** a `POST /api/admin/reset-queue` endpoint (or similar — the exact path is specified here) that allows a super-admin to trigger the daily reset manually. The endpoint requires a confirmation parameter (e.g., `?confirm=RESET_TODAY`) to prevent accidental resets. The endpoint creates a `TicketEvent` of type `PRIORITY_CHANGED` (or a new dedicated `RESET` type — the document specifies which) for audit.
- **Handling of in-progress tickets:** the reset does not delete or modify tickets that are currently in `CALLED`, `RECALLED`, or `SERVING` state. They retain their state and are considered orphaned (their counter is the same, but the business date has changed). The document specifies the policy:
  - Tickets in `WAITING` state at the moment of reset are archived but not deleted.
  - Tickets in non-WAITING states are unaffected; the officer can still complete or mark them no-show. The `businessDate` field is not changed for in-progress tickets.
- The `QueueDailySnapshot` population: a snapshot per service per business date. The composite unique constraint on `(businessDate, serviceId)` is enforced.
- The `audit-log` write for the reset action.
- The reset is logged to the console (in development) so the operator can verify it ran.
- A **post-reset SSE event emission** (`DAILY_RESET`): the document specifies the event payload, which downstream consumers (Phase 3 display board, Phase 5 reports) can use to refresh their state.

**Outcome:** At the configured time each day, the system automatically resets the ticket counters, archives the day's data into snapshots, and emits a `DAILY_RESET` event. A super-admin can also trigger a manual reset. In-progress tickets are preserved and the officer can still complete them.

**Master Plan sections implemented:** Sections 8.2 (`QueueDailySnapshot` model), 9.3 (admin reset endpoint), 11.2 (DAILY_RESET event in the channel registry), 11.1 (broadcast on daily reset).

---

### 6.4 Sub-Phase 2.3 Exit Criteria

Sub-Phase 2.3 is complete when:

1. An officer assigned to a counter can call a waiting ticket for one of that counter's services. The ticket's status transitions to `CALLED`. A `TicketEvent` is written. A `TICKET_CALLED` event is emitted.
2. The same officer can recall the just-called ticket. The status transitions to `RECALLED`. Another `TicketEvent` is written. A `TICKET_RECALLED` event is emitted.
3. The same officer can mark the recalled ticket as no-show after the grace period. The status transitions to `NO_SHOW`. A `TICKET_NO_SHOW` event is emitted. The next waiting ticket (if auto-advance is enabled) is automatically called.
4. The illegal transitions (e.g., calling a `COMPLETED` ticket) are rejected with a clear error.
5. An officer cannot call a ticket for a service their counter doesn't handle — the request is rejected.
6. The temporary officer ticket action panel at `/counter/[counterId]` shows the current serving ticket and the action buttons, and exercises the API correctly.
7. At the configured reset time, the system resets the per-service ticket counters and creates a `QueueDailySnapshot` per service with the correct statistics.
8. A super-admin can trigger a manual reset via the admin endpoint, with the confirmation parameter.
9. In-progress tickets (CALLED, RECALLED, SERVING) at the moment of reset are preserved and not modified.

---

## 7. Sub-Phase Dependency Map

The following diagram shows the build order of sub-phases and the inter-document dependencies. Documents on the same row can be developed in parallel after the row above is complete.

```
Sub-Phase 2.1 (Service & Counter Management)
├── 2.1.1  Service Entity & Management API
├── 2.1.2  Counter Entity & Management API        (parallel with 2.1.1)
└── 2.1.3  Service-Counter Assignment Logic       (depends on 2.1.1, 2.1.2)

Sub-Phase 2.2 (Ticket Issuance & Self-Service Kiosk)
├── 2.2.1  Ticket Generation Engine & Queue Logic  (depends on 2.1.1, 2.1.2, 2.1.3)
├── 2.2.2  Kiosk UI & Service Selection Flow       (depends on 2.2.1)
└── 2.2.3  Silent Ticket Printing                  (depends on 2.2.2)

Sub-Phase 2.3 (Queue Processing Operations)
├── 2.3.1  Call & Recall Ticket Operations         (depends on 2.2.1, Phase 1.3 RBAC)
├── 2.3.2  No-Show Handling & Queue Advancement    (depends on 2.3.1)
└── 2.3.3  Daily Queue Reset & State Management    (depends on 2.2.1, 2.3.1, 2.3.2)
```

**Critical Path:** `2.1.1 → 2.1.3 → 2.2.1 → 2.2.2 → 2.3.1 → 2.3.2 → 2.3.3`

**Parallel Opportunities:**
- `2.1.1` and `2.1.2` can be developed in parallel (different entities, no shared code).
- `2.2.2` and `2.3.1` can be developed in parallel after `2.2.1` is complete. The kiosk UI (2.2.2) and the officer ticket actions (2.3.1) are independent surfaces.
- `2.2.3` and `2.3.2` can be developed in parallel after their respective prerequisites.

**Critical Seam with Phase 3:** Documents `2.2.1`, `2.3.1`, `2.3.2`, and `2.3.3` all emit events. During Phase 2, the event emission calls a `broadcastEvent()` function whose implementation is a no-op stub (or an interface whose default implementation is no-op). Phase 3.1.3 replaces this stub with the real SSE-based implementation. The data shapes are locked in by the end of Phase 2.

---

## 8. Cross-Cutting Standards for Phase 2

The following standards apply to every Phase 2 task plan document. The conventions from Phase 1 (folder naming, import paths, TypeScript, Zod validation, error handling, env vars, git commits) all carry forward. The standards below are **new or specific to Phase 2**.

### 8.1 Transaction Boundaries

Every multi-write operation (e.g., ticket issuance, ticket call, daily reset) must run inside a single Prisma `$transaction` block. The rule is: if two or more database writes are semantically a single operation, they must be atomic. Phase 2 examples:

- Issuing a ticket: increment `Service.currentTicketNumber` + create the `Ticket` record + create the `TicketEvent` — all in one transaction.
- Calling a ticket: update the `Ticket` status + create the `TicketEvent` — in one transaction.
- Daily reset: for each service, create the `QueueDailySnapshot` + reset the `currentTicketNumber` — in one transaction per service.

### 8.2 The Broadcast Event Seam (Phase 2 → Phase 3)

A single utility function `broadcastEvent(channel, eventType, payload)` is introduced in Phase 2.1.1 (as a stub) and used by 2.2.1, 2.3.1, 2.3.2, and 2.3.3. The signature is locked in Phase 2.1.1. The implementation is replaced in Phase 3.1.3. During Phase 2:

- The function exists with the correct signature and is called from all event-emitting code paths.
- The function's body is a no-op (or logs to the console) so Phase 2 can be developed and tested without SSE.
- The event payload shapes are defined as TypeScript types in `types/sse.types.ts` and exported for Phase 3 to consume.

This pattern is the only acceptable way to introduce the Phase 3 dependency in Phase 2 code.

### 8.3 Ticket Number Generation Discipline

The `currentTicketNumber` field is **never** manually set to a non-increment value outside of the daily reset. The only operations that touch it are:

- `POST /api/tickets/issue` — atomic increment.
- Daily reset (2.3.3) — reset to 0.

Any code path that modifies `currentTicketNumber` must be reviewed against this rule. The atomicity is provided by the database transaction (or a row-level lock where the database supports it). Concurrent ticket issuances must always produce sequential numbers, never duplicates.

### 8.4 Audit Log Policy for High-Volume Operations

The audit log (from Phase 1.3.3) captures every user management action. Phase 2 extends the policy to cover business-domain actions. The default policy is to write an audit log entry for:

- Service create/update/deactivate (2.1.1)
- Counter create/update/deactivate (2.1.2)
- Service-counter assignment changes (2.1.3)
- Daily reset (2.3.3)
- Manual reset override (2.3.3)

The policy is **explicitly opt-out** for ticket issuance and the ticket call/recall/no-show actions. The reason: these are high-volume operations (potentially hundreds per day per counter) and the `TicketEvent` table already provides a complete audit trail for ticket lifecycle. The master plan's `AuditLog` table is reserved for **administrative and configuration** events. The document specifies this policy clearly so the implementation does not double-log.

### 8.5 Kiosk Configuration Discipline

Kiosk configurations (`KioskConfig`) are global to the system but each kiosk instance may load a different one. The rule:

- The `KioskConfig` table is read by the kiosk route (`/kiosk` and `/kiosk?kioskId=xxx`).
- Only ONE kiosk config may have `isDefault = true` at any time (enforced in the service create/update logic).
- The default kiosk config is the fallback when no `kioskId` is provided in the URL.

This discipline ensures that adding a second physical kiosk (e.g., a building with two kiosks) is a configuration task, not a code change.

### 8.6 Ticket Status State Machine

Every ticket status transition is governed by the state machine defined in document 2.3.1. The state machine is implemented in `lib/ticket-service.ts` as a pure function `canTransition(from: TicketStatus, to: TicketStatus, action: TicketAction): boolean`. Every ticket-mutating endpoint calls this function before performing the transition. Illegal transitions return `VALIDATION_ERROR` with a clear message.

The state machine is the single source of truth for ticket lifecycle. No endpoint may perform a transition that the state machine does not permit. This is critical because the same state machine will be reused by the future Android app (via the API) and by any automation that interacts with tickets.

### 8.7 Daily Reset Idempotency

The daily reset is **idempotent**: running it twice in the same business day does not create duplicate snapshots. The mechanism is the `QueueDailySnapshot` composite unique constraint on `(businessDate, serviceId)` combined with an "upsert" pattern. If a snapshot for the current business date already exists, the reset updates it (recalculating statistics) rather than creating a new one. This is important for the manual reset override and for handling the case where the scheduled job runs while an operator is also triggering a manual reset.

### 8.8 Business Date Boundary

The `businessDate` field on a ticket determines which daily snapshot it belongs to. The rule for the business date boundary:

- A ticket issued at 23:59:59 local time on day D has `businessDate = D`.
- A ticket issued at 00:00:01 local time on day D+1 has `businessDate = D+1`.
- The daily reset runs at the configured reset time (default: midnight) and creates snapshots for the business date that just ended.

The implementation stores `businessDate` as a `DateTime` representing midnight (00:00:00) of the business day in the system's configured timezone. The system timezone is a configuration setting (default: server local time).

---

## 9. Phase 2 Exit Criteria & Phase 3 Hand-off

### 9.1 Phase 2 Exit Criteria (The Complete Checklist)

Phase 2 is complete when **all** of the following are true:

#### Service & Counter Management
- [ ] A super-admin can create, edit, list, and deactivate services and counters.
- [ ] The service-to-counter assignment is functional in both directions.
- [ ] Service code and prefix uniqueness is enforced.
- [ ] Counter number uniqueness is enforced.
- [ ] The "at least one service per counter" rule is enforced.
- [ ] Non-admin users cannot access service or counter management (403).

#### Ticket Issuance & Kiosk
- [ ] The kiosk displays the active services as a tappable grid.
- [ ] Tapping a service results in a successful ticket issuance via the API.
- [ ] The ticket number is correctly formatted and unique within the service for the day.
- [ ] Two concurrent issuances produce sequential numbers (no duplicates).
- [ ] The confirmation screen shows the ticket number, service name, and estimated wait.
- [ ] The kiosk auto-resets after the configured timeout.
- [ ] Silent printing works (in Chrome kiosk mode with a configured default printer).
- [ ] Print failure shows a clear fallback message.

#### Queue Processing
- [ ] An officer can call a waiting ticket for their counter's services.
- [ ] The same officer can recall the ticket.
- [ ] The same officer can mark the ticket as no-show after the grace period.
- [ ] Illegal ticket state transitions are rejected with clear errors.
- [ ] The auto-advance-on-no-show setting works as configured.
- [ ] The temporary officer ticket action panel functions correctly.

#### Daily Reset
- [ ] At the configured time, the system resets per-service ticket counters.
- [ ] A `QueueDailySnapshot` is created per service for the previous business date.
- [ ] Daily statistics are correctly calculated.
- [ ] In-progress tickets are preserved at the moment of reset.
- [ ] A super-admin can trigger a manual reset with the confirmation parameter.
- [ ] Running the reset twice in the same business date does not create duplicate snapshots.

#### Event Emission (for Phase 3 hand-off)
- [ ] `TICKET_ISSUED` event is emitted on ticket issuance with the documented payload.
- [ ] `TICKET_CALLED` event is emitted on ticket call with the documented payload.
- [ ] `TICKET_RECALLED` event is emitted on ticket recall with the documented payload.
- [ ] `TICKET_NO_SHOW` event is emitted on ticket no-show with the documented payload.
- [ ] `DAILY_RESET` event is emitted on reset with the documented payload.
- [ ] All event payloads are defined as TypeScript types in `types/sse.types.ts`.
- [ ] The `broadcastEvent()` function exists with the correct signature (even if no-op).

#### Code Quality
- [ ] All multi-write operations are inside transactions.
- [ ] No illegal ticket state transitions are possible.
- [ ] `yarn lint`, `yarn type-check`, and `yarn build` all pass.

### 9.2 What Phase 3 Will Assume

When Phase 3 begins, it assumes Phase 2 is fully complete and verified. Specifically, Phase 3 will assume:

- The service and counter catalogues are populated with at least seed data (a few services and counters with assignments), so the display board has something to show.
- The kiosk is functional end-to-end (issuance + print + reset timer) and can be used to generate test tickets.
- The temporary officer ticket action panel is in place at `/counter/[counterId]` and can call/recall/no-show tickets — Phase 3 may exercise this to generate test events.
- The `broadcastEvent()` function exists with the correct signature and is called from all the right places. Phase 3.1.3's job is to implement the function body.
- The SSE event payload types are defined in `types/sse.types.ts` — Phase 3 will consume them and the client will use them.
- The ticket status state machine is implemented in `lib/ticket-service.ts` and is the single source of truth for transitions.
- The `QueueDailySnapshot` table is populated by the daily reset and ready for Phase 5's reporting.

### 9.3 What Phase 2 Should Not Touch

Phase 2 task plan documents must **not** introduce:

- The SSE manager implementation (Phase 3.1.1).
- The `useSSE()` client hook (Phase 3.1.2).
- The real `broadcastEvent()` implementation (Phase 3.1.3) — Phase 2 only defines the signature and the no-op stub.
- The display board UI, layout, or any display-specific components (Phase 3.2).
- The display board configuration UI (Phase 3.2.3).
- The audio announcement system, bell playback, TTS, or announcement queue (Phase 3.3).
- The FCM / push notification system (Phase 4.1).
- The counter temporary closure toggle (Phase 4.2.1).
- The notification toggle (Phase 4.2.2).
- The full officer dashboard layout (Phase 4.2.3) — Phase 2 only has the temporary ticket action panel.
- The notification reply or broadcast message system (Phase 4.3).
- The security officer screen (Phase 4.3.3).
- The reports / analytics / charts / CSV export (Phase 5).
- The rate limiting / security hardening (Phase 5).
- The PostgreSQL migration (Phase 5).

If a Phase 2 task plan document finds itself needing any of the above, it is a signal that the sub-phase is over-scoped and the work should be deferred.

---

## 10. Phase 2 Document Map (Quick Reference)

| Doc ID | Title | Master Plan Sections Implemented |
|---|---|---|
| **2.1.1** | Service Entity & Management API | 6.4, 6.5, 8.2 (`Service`), 9.3 (services API) |
| **2.1.2** | Counter Entity & Management API | 6.4, 6.5, 8.2 (`Counter`), 9.3 (counters API) |
| **2.1.3** | Service-Counter Assignment Logic | 6.5, 8.2 (`CounterService`), 9.3 (assignment API) |
| **2.2.1** | Ticket Generation Engine & Queue Logic | 6.5, 8.2 (`Ticket`, `TicketEvent`), 9.3 (issue endpoint) |
| **2.2.2** | Kiosk UI & Service Selection Flow | 6.4, 6.5, 8.2 (`KioskConfig`), 9.3 |
| **2.2.3** | Silent Ticket Printing Implementation | 6.5, 8.2 (`KioskConfig`), 12, 13 |
| **2.3.1** | Call & Recall Ticket Operations | 6.5, 8.2 (`Ticket`, `TicketEvent`), 9.3, 11.3, 11.4 |
| **2.3.2** | No-Show Handling & Queue Advancement | 6.5, 8.2, 9.3, 11.2 |
| **2.3.3** | Daily Queue Reset & State Management | 8.2 (`QueueDailySnapshot`), 9.3, 11.1, 11.2 |

---

*End of Phase 2 Overview Document — Version 1.0.0*

*This document is the authoritative overview for Phase 2 of the Smart Queue Management System DDD series. It is the parent reference for the 9 task plan documents listed in Section 10. All Phase 2 task plan documents must be derived from and remain consistent with this overview and the master plan.*
