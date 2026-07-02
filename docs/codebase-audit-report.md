# Codebase Audit Report — Smart Queue Management System (QUEMS)

**Date:** 2026-07-02  
**Auditor:** Automated Code Audit  
**Codebase Version:** Latest (commit `64fc5aa` + working changes)

---

## 1. Executive Summary

The QUEMS codebase is a **functionally complete** Next.js 16 queue management system with real-time SSE, push notifications, and analytics. The code quality is generally good — consistent patterns, proper TypeScript usage, and well-structured modules. However, several areas need attention:

**Critical Issues (3):**

- Auto-complete logic in `call-next` and `recall-no-show` routes operates **outside transactions**, risking orphaned state
- Dashboard API endpoints (`current-ticket`, `next-ticket`) lack **counter assignment authorization** — any authenticated user can query any counter
- SSE payload inconsistencies (`counterName` set to officer name instead of counter name)

**Code Health:**

- ~117 source files across `src/`
- 27 API routes, 5 Prisma migrations
- 45 document DDD series (all completed)
- No TODO/FIXME comments found
- 33 `eslint-disable` comments (mostly Prisma 7 `any` casts — documented limitation)

**Positive Observations:**

- Consistent envelope pattern for API responses (`{ success, data | error }`)
- Proper SSE architecture with channel isolation and heartbeat
- Good Prisma schema with composite indexes for common queries
- Clean separation of concerns (service layer, guards, state machine)

---

## 2. Unused & Dead Code Detection

### 🔴 Unused Export (Will Crash If Called)

| #   | File                        | Line   | Item                                                        | Issue                                                                                                           |
| --- | --------------------------- | ------ | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | `src/lib/ticket-service.ts` | 1141   | `serveTicket()`                                             | **Exported but never imported.** The serve route inlines its own COMPLETE logic. Dead code — should be removed. |
| 2   | `src/lib/ticket-service.ts` | 61     | `calculateEstimatedWaitMinutes()`                           | Exported but only used internally by `resolveAndCalculateEstimatedWaitMinutes()`. Could be unexported.          |
| 3   | `src/lib/ticket-service.ts` | 78     | `resolveAndCalculateEstimatedWaitMinutes()`                 | Exported but only used internally (line 311). Could be unexported.                                              |
| 4   | `src/lib/display-state.ts`  | 18-200 | 8 individual reducer functions (`applyTICKET_CALLED`, etc.) | All exported but only consumed internally by `applyEvent()`. Only `applyEvent` is imported externally.          |

### 🟡 Suppressed Lint Rules

| #   | File                                         | Line           | Rule                                 | Risk                                                      |
| --- | -------------------------------------------- | -------------- | ------------------------------------ | --------------------------------------------------------- |
| 5   | `src/lib/ticket-service.ts`                  | 135, 298, 487+ | `@typescript-eslint/no-explicit-any` | Prisma 7 interactive tx requires `(tx: any)` — documented |
| 6   | `src/components/admin/audit-log-filters.tsx` | 122            | `react-hooks/exhaustive-deps`        | May hide stale closure bugs                               |
| 7   | `src/hooks/use-sse.ts`                       | 104+           | `react-hooks/exhaustive-deps`        | May hide stale closure bugs                               |
| 8   | `src/lib/guards.ts`                          | 42, 134, 138+  | `@typescript-eslint/no-explicit-any` | 5+ occurrences — type guards need better typing           |

### 🟢 No TODO/FIXME Comments

Zero `TODO` or `FIXME` comments found in `src/`. ✅

---

## 3. Problematic Areas & Potential Bugs

### 🔴 HIGH — Race Conditions

| #   | File                                                                    | Line     | Issue                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/app/api/tickets/call-next/route.ts`                                | ~100-130 | **Auto-complete outside transaction.** The current SERVING ticket is completed via raw `prisma.ticket.update` OUTSIDE the `callTicket()` transaction. If `callTicket()` throws, the previous ticket is already COMPLETED but no new ticket was called — **orphaned state**. The state machine is also **bypassed** (direct `status: 'COMPLETED'` without `transitionTicket()`). |
| 2   | `src/app/api/officers/me/dashboard/[counterId]/recall-no-show/route.ts` | ~55-80   | **Same pattern** — auto-completes SERVING ticket outside transaction, then calls `recallNoShowTicket()`. Same orphaned-state risk.                                                                                                                                                                                                                                              |

**Fix:** Wrap auto-complete + callTicket/recallNoShow in a single Prisma `$transaction`.

### 🔴 HIGH — Missing Authorization

| #   | File                                                                    | Line   | Issue                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3   | `src/app/api/officers/me/dashboard/[counterId]/current-ticket/route.ts` | ~30-50 | **Only checks `auth()` — does NOT verify the user is assigned to `counterId`.** Any authenticated user can query any counter's current serving ticket by guessing counter IDs. |
| 4   | `src/app/api/officers/me/dashboard/[counterId]/next-ticket/route.ts`    | ~30-50 | **Same issue** — any authenticated user can see any counter's next waiting ticket.                                                                                             |

**Fix:** Add `resolveCallingOfficer()` or `findCounterOfficerForUserAndCounter()` check.

### 🔴 HIGH — State Machine Bypassed

| #   | File                                            | Line | Issue                                                                                                                                                                  |
| --- | ----------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5   | `src/app/api/tickets/[ticketId]/serve/route.ts` | ~108 | The "serve" endpoint calls `transitionTicket(ticket.status, 'COMPLETE')` — not `'SERVE'`. The state machine defines `SERVE → SERVING` but it's never used via the API. |
| 6   | `src/app/api/tickets/call-next/route.ts`        | ~115 | Auto-complete sets `status: 'COMPLETED'` directly without calling `transitionTicket()`.                                                                                |

**Fix:** Use `transitionTicket()` consistently, or document the intentional bypass.

### 🔴 HIGH — SSE Payload Bugs

| #   | File                                               | Line | Issue                                                                                    |
| --- | -------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------- |
| 7   | `src/app/api/tickets/[ticketId]/complete/route.ts` | ~90  | `TICKET_SERVED` payload **missing `serviceName`**. Display board reducers may expect it. |
| 8   | `src/app/api/tickets/[ticketId]/complete/route.ts` | ~105 | `counterName` set to `officer.userName` — should be counter name.                        |
| 9   | `src/app/api/tickets/call-next/route.ts`           | ~115 | Same `counterName: officer.userName` bug.                                                |

**Fix:** Fetch counter name from DB and include it in the payload.

### 🟡 MEDIUM — Input Validation

| #   | File                                                                    | Line   | Issue                                                                      |
| --- | ----------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| 10  | `src/app/api/tickets/[ticketId]/complete/route.ts`                      | ~55-65 | **No Zod validation** on body — raw `body as { counterId?: string }` cast. |
| 11  | `src/app/api/officers/me/dashboard/[counterId]/recall-no-show/route.ts` | ~40-45 | **No Zod validation** — raw cast with only falsy check.                    |
| 12  | `src/app/api/counters/[counterId]/officers/route.ts` (POST)             | ~100   | **No Zod validation** — raw cast with typeof check.                        |

### 🟡 MEDIUM — Null Safety

| #   | File                          | Line   | Issue                                                                                                                                |
| --- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 13  | `src/lib/ticket-service.ts`   | ~85-90 | `getCurrentBusinessDate()` uses `!` non-null assertions on `formatToParts()` results. Exotic runtimes could return unexpected parts. |
| 14  | `src/lib/reset-scheduler.ts`  | ~45-50 | Same `!` assertion pattern on `formatToParts()`.                                                                                     |
| 15  | `src/lib/display-snapshot.ts` | ~110   | `evt.ticket` accessed without null check — if ticket was deleted (cascading), this crashes.                                          |

### 🟡 MEDIUM — Redundant Auth Calls

| #   | File                                                                                  | Line    | Issue                                                                                            |
| --- | ------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| 16  | `src/app/api/tickets/[ticketId]/call/route.ts`                                        | ~75-80  | Calls `auth()` inside `withPermission` handler — session already available via `GuardedContext`. |
| 17  | Same in `recall/route.ts`, `no-show/route.ts`, `serve/route.ts`, `call-next/route.ts` | various | All call `auth()` redundantly.                                                                   |

### 🟡 MEDIUM — Debug Endpoint

| #   | File                                   | Line | Issue                                                                                                         |
| --- | -------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| 18  | `src/app/api/debug/broadcast/route.ts` | ~1   | Comment says "REMOVE or restrict in Phase 5.2" — still present. Has `NODE_ENV` guard but route is registered. |

---

## 4. Performance & Code Quality Issues

### 🔴 N+1 Query Problems

| #   | File                           | Line    | Issue                                                                                                                                                                                               | Impact                      |
| --- | ------------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | `src/lib/display-snapshot.ts`  | 73-100  | `getServingTickets()` runs `findFirst` per counter (N+1). Each includes 3 relations.                                                                                                                | Display load: O(N) DB calls |
| 2   | `src/lib/display-snapshot.ts`  | 198-203 | `getDisplaySnapshot()` calls `getRecentTicketsForCounter()` per counter (N+1). Each runs `findMany` with nested includes.                                                                           | Display load: O(N) DB calls |
| 3   | `src/lib/analytics-service.ts` | 348-365 | `calculateServicePerformanceRows` iterates `services × days` calling `calculateServiceDailyMetrics()` sequentially. For 5 services × 30 days = **150 sequential DB calls**, each running 7 queries. | Reports page: 1050 DB calls |

**Fix:** Batch queries using `findMany` with `counterId: { in: [...] }` and group in memory.

### 🔴 Missing Database Indexes

| #   | Table            | Columns                             | Impact                                                                                           |
| --- | ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| 4   | `TicketEvent`    | `(counterId, eventType, createdAt)` | `getRecentTicketsForCounter` and `getRecentActivity` filter by these — full table scan           |
| 5   | `Ticket`         | `(counterId, status, businessDate)` | `calculateCounterPerformanceRows` filters by these                                               |
| 6   | `CounterService` | `(serviceId)`                       | `findEligibleRecipientsForIssuance` queries by `serviceId`-first but unique is `counterId`-first |

### 🟡 Code Duplication (DRY Violations)

| #   | Pattern                                  | Files                                                                        | Fix                              |
| --- | ---------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------- |
| 7   | `resolveTimezone()` duplicated 3 times   | `analytics-service.ts:47`, `ticket-service.ts:112`, `queue-reset.ts:32`      | Extract to `src/lib/timezone.ts` |
| 8   | `getHourInTimezone()` duplicated 3 times | `analytics-service.ts:59`, `queue-reset.ts:48`, `ticket-service.ts` (inline) | Extract to `src/lib/timezone.ts` |
| 9   | Auto-complete logic duplicated           | `call-next/route.ts:100-130`, `recall-no-show/route.ts:55-80`                | Extract to shared utility        |

### 🟡 SSE Heartbeat Mutation Risk

| #   | File                     | Line    | Issue                                                                                                     |
| --- | ------------------------ | ------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 10  | `src/lib/sse-manager.ts` | 125-138 | `tickHeartbeat` iterates `Set` and calls `removeClient` (mutates Set) during iteration. May skip entries. | Collect dead clients first, then remove. |

### 🟢 Positive Observations

- `getRecentActivity` in `officer-dashboard.ts` uses batch name resolution ✅
- `serviceDailyCounters` Map is bounded by service count and cleared on daily reset ✅
- `use-sse.ts` cleanup properly unmounts and closes EventSource ✅
- Ticket composite indexes cover most common query patterns ✅

---

## 5. Action Item Checklist

### 🔴 High Priority

- [ ] **H1.** Wrap auto-complete + `callTicket()` in a single Prisma `$transaction` in `call-next/route.ts`
- [ ] **H2.** Wrap auto-complete + `recallNoShowTicket()` in a single `$transaction` in `recall-no-show/route.ts`
- [ ] **H3.** Add `resolveCallingOfficer()` check to `current-ticket/route.ts` and `next-ticket/route.ts`
- [ ] **H4.** Fix `counterName` in SSE payloads — use actual counter name, not `officer.userName` in `complete/route.ts` and `call-next/route.ts`
- [ ] **H5.** Add `serviceName` to `TICKET_SERVED` payload in `complete/route.ts`
- [ ] **H6.** Add composite index `@@index([counterId, eventType, createdAt])` to `TicketEvent` model
- [ ] **H7.** Add composite index `@@index([counterId, status, businessDate])` to `Ticket` model
- [ ] **H8.** Refactor `getServingTickets()` and `getDisplaySnapshot()` to batch queries instead of N+1

### 🟡 Medium Priority

- [ ] **M1.** Add Zod schemas for `complete`, `recall-no-show`, and `POST /officers` body validation
- [ ] **M2.** Remove or gate `src/app/api/debug/broadcast/route.ts` for production
- [ ] **M3.** Extract `resolveTimezone()` and `getHourInTimezone()` to shared `src/lib/timezone.ts`
- [ ] **M4.** Remove dead `serveTicket()` export from `ticket-service.ts`
- [ ] **M5.** Use `transitionTicket()` in auto-complete logic instead of bypassing state machine
- [ ] **M6.** Remove redundant `auth()` calls inside `withPermission` handlers
- [ ] **M7.** Add `@@index([serviceId])` to `CounterService` model
- [ ] **M8.** Fix `sse-manager.ts` heartbeat to collect dead clients before removing
- [ ] **M9.** Consolidate `calculateServiceDailyMetrics` from 7 queries to 1-2 using `groupBy`
- [ ] **M10.** Add null check for `evt.ticket` in `getRecentTicketsForCounter()`

### 🟢 Low Priority

- [ ] **L1.** Unexport individual reducer functions in `display-state.ts` (only `applyEvent` needed)
- [ ] **L2.** Unexport `calculateEstimatedWaitMinutes()` and `resolveAndCalculateEstimatedWaitMinutes()` from `ticket-service.ts`
- [ ] **L3.** Add `!` assertion fallbacks in `getCurrentBusinessDate()` and `getDailyResetTimeToday()`
- [ ] **L4.** Review `react-hooks/exhaustive-deps` suppressions in `audit-log-filters.tsx` and `use-sse.ts`
- [ ] **L5.** Document the intentional SERVE → COMPLETE bypass in serve route

---

_Report generated automatically. All file paths are relative to the project root._
