# Smart Queue Management System

## Phase 4 Overview — Mobile Notification & Counter Management

**Version:** 1.0.0
**Status:** Authoritative Reference for Phase 4
**Parent Document:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Series Position:** Phase 4 of 5
**Document Count:** 1 overview + 9 sub-phase task plan documents

---

## Table of Contents

1. [Phase 4 Strategic Context](#1-phase-4-strategic-context)
2. [Phase 4 Goals & Non-Goals](#2-phase-4-goals--non-goals)
3. [Phase 4 Deliverables Summary](#3-phase-4-deliverables-summary)
4. [Sub-Phase 4.1 — Push Notification Infrastructure](#4-sub-phase-41--push-notification-infrastructure)
5. [Sub-Phase 4.2 — Counter Status & Notification Controls](#5-sub-phase-42--counter-status--notification-controls)
6. [Sub-Phase 4.3 — Notification Reply & Broadcasting](#6-sub-phase-43--notification-reply--broadcasting)
7. [Sub-Phase Dependency Map](#7-sub-phase-dependency-map)
8. [Cross-Cutting Standards for Phase 4](#8-cross-cutting-standards-for-phase-4)
9. [Phase 4 Exit Criteria & Phase 5 Hand-off](#9-phase-4-exit-criteria--phase-5-hand-off)
10. [Phase 4 Document Map (Quick Reference)](#10-phase-4-document-map-quick-reference)

---

## 1. Phase 4 Strategic Context

Phase 4 is the **mobile-and-officer** layer of the Smart Queue Management System. It introduces the push notification pipeline that connects the system to officer mobile devices (Android-ready), the counter status controls that let officers manage their counter's availability, the officer dashboard that brings together everything an officer needs, and the broadcast system that lets officers send messages to the display board and security officer screen.

The strategic goal is to **make the queue operationally complete for officers and ready for the future Android app**. When Phase 4 is complete:

- Officers can close their counter temporarily (e.g., for a break) and the system reflects that everywhere.
- Officers can toggle push notifications on or off for their devices.
- Officers can see a full dashboard of their counter's state and act on tickets.
- Officers can reply to notifications from their mobile device, and the reply appears on the display board and the security officer's screen.
- The Android app (future) has a complete API surface to integrate against, even though no app is built in this phase.

Phase 4 also completes the **end-to-end event consumption chain**. The SSE infrastructure from Phase 3 is now consumed by:

- The officer dashboard (on the `counter:[counterId]` channel).
- The security officer screen (on the `security` channel).
- The display board's broadcast overlay (via the `global` channel, receiving `BROADCAST_MESSAGE` events).

### 1.1 Why This Phase Comes After Phase 3

Phase 4 cannot exist without Phase 3's infrastructure:

- The SSE manager and `useSSE()` hook from Phase 3.1 are the consumption layer for the officer dashboard (4.2.3) and the security screen (4.3.3).
- The display board from Phase 3.2 is the receiver of broadcast messages (4.3.2). The broadcast overlay slot was reserved in 3.2.1 and is wired up in 4.3.2.
- The routing rules from Phase 3.1.3 already include the event types Phase 4 emits (`COUNTER_OPENED`, `COUNTER_CLOSED`, `BROADCAST_MESSAGE`, `NOTIFICATION_RECEIVED`, `OFFICER_REPLY`).

Phase 4 is fundamentally a **producer and consumer** of events that Phase 3 made possible.

### 1.2 Why This Phase Comes Before Phase 5

Phase 5 (analytics, hardening, production) depends on Phase 4 in two ways:

- The reporting dashboard consumes the `Notification`, `NotificationReply`, `BroadcastMessage`, and `CounterStatusEvent` tables that Phase 4 populates.
- The rate limiting and security hardening in Phase 5 protect the new Phase 4 endpoints (FCM dispatch, device registration, officer reply).

### 1.3 Reference to the Master Plan

This overview document **does not redefine** the system-wide specifications. Every architectural, schema, API, and design detail is the responsibility of the [Master Plan](./00-MASTER-PLAN.md). Phase 4 task plan documents will reference the master plan sections they implement (for example, document 4.1.1 will implement Master Plan Section 3.3's FCM technology choice and Section 14's Mobile Notification Architecture).

---

## 2. Phase 4 Goals & Non-Goals

### 2.1 Phase 4 Goals (Must Be Achieved)

1. A working FCM-backed push notification pipeline: the `NotificationService` module, the device token registration and cleanup flow, and the dispatch logic for ticket-issued and ticket-recalled events.
2. A working device registration API that the future Android app will use to register its FCM token with the server.
3. A working counter temporary closure system: officers can mark their counter as temporarily closed with an optional reason, the closure is reflected on the display board in real time, and the system records the closure as a `CounterStatusEvent`.
4. A working officer notification toggle: officers can enable or disable push notifications for their profile, and the toggle state is respected by the dispatch logic.
5. A complete counter officer dashboard that brings together the ticket action panel (from Phase 2.3.2), the counter status toggle (4.2.1), the notification toggle (4.2.2), the live queue depth indicator, the next ticket preview, and the recent activity feed.
6. A working officer reply flow: an officer can reply to a notification (via the mobile API), the reply is recorded, and it triggers a broadcast message that appears on the display board and the security officer's screen.
7. A working security officer screen at `/security` that subscribes to the `security` SSE channel and displays incoming broadcast messages in a chronological feed.
8. A clear separation of concerns: the officer dashboard is a composition of pre-existing components (TicketActionPanel from 2.3.2, the SSE hook from 3.1.2), with new components added only where Phase 4 introduces new behavior.

### 2.2 Phase 4 Non-Goals (Explicitly Out of Scope)

The following are **deferred** to later phases or are explicitly out of scope:

- **Native Android or iOS app development.** The API surface is fully ready for it, but no app is built in this phase. The master plan's Section 4.5 documents the Android integration strategy; Phase 4 implements the server side of that strategy.
- **SMS / WhatsApp notifications.** Only FCM push notifications are implemented.
- **OAuth or social login for mobile.** The mobile login is username/password (the endpoint from Phase 1.2.2, finalized in 4.1.2 for mobile use).
- **The display board implementation.** The display board was built in Phase 3.2. Phase 4.3.2 only wires up the broadcast message injection into the existing display board's reserved overlay slot.
- **The SSE manager implementation.** The manager was built in Phase 3.1. Phase 4 only consumes it.
- **The reports / analytics / charts.** Phase 5. The `Notification`, `NotificationReply`, `BroadcastMessage`, and `CounterStatusEvent` tables are _populated_ in Phase 4, but no reporting UI exists yet.
- **Rate limiting and security hardening.** Phase 5.
- **PostgreSQL migration.** Phase 5.

### 2.3 What "Done" Means for Phase 4

Phase 4 is complete when:

1. A new device token can be registered via `POST /api/notifications/devices/register`.
2. Triggering a ticket issuance or recall event dispatches a push notification to the appropriate officer's device (verifiable via FCM logs in development).
3. An officer can mark their counter as temporarily closed, and the display board reflects the closure within a second.
4. An officer can toggle push notifications on or off, and the toggle state affects subsequent dispatches.
5. The officer dashboard at `/counter/[counterId]` shows the live counter state, the current serving ticket, the queue depth, the next ticket, and the action buttons.
6. An officer can reply to a notification (via a test call to the mobile API), and the reply appears as a broadcast message on the display board and in the security officer's feed within a second.
7. The security officer screen at `/security` shows incoming broadcast messages in real time, with sender name, message text, and timestamp.
8. An FCM INVALID_REGISTRATION error marks the corresponding `DeviceToken` as inactive, preventing further dispatch attempts.

---

## 3. Phase 4 Deliverables Summary

Phase 4 is decomposed into **3 sub-phases**, each containing **3 task plan documents**, for a total of **9 implementation documents**.

| Sub-Phase | Theme                                  | Documents           | Primary Outputs                                             |
| --------- | -------------------------------------- | ------------------- | ----------------------------------------------------------- |
| 4.1       | Push Notification Infrastructure       | 4.1.1, 4.1.2, 4.1.3 | FCM integration, device registration, dispatch system       |
| 4.2       | Counter Status & Notification Controls | 4.2.1, 4.2.2, 4.2.3 | Counter closure, notification toggle, officer dashboard     |
| 4.3       | Notification Reply & Broadcasting      | 4.3.1, 4.3.2, 4.3.3 | Officer reply, display broadcast injection, security screen |

The single most important property of Phase 4 is that **the system becomes operationally complete for officers and the API is fully ready for a future Android app**, even though no mobile app is built.

---

## 4. Sub-Phase 4.1 — Push Notification Infrastructure

### 4.1 Purpose

Sub-Phase 4.1 builds the **push notification pipeline**. FCM (Firebase Cloud Messaging) is the chosen transport (per the master plan's Section 3.3 and the Decisions Log in Section 17). The pipeline consists of: the FCM service account and credential configuration, the server-side `NotificationService` module that wraps the FCM HTTP v1 API, the device registration endpoint, the dispatch logic, and the failure handling.

No mobile app is built in this sub-phase. The work is entirely server-side. The mobile app (future) is a consumer of the API surface defined here.

### 4.2 Why This Sub-Phase Comes First

Sub-Phases 4.2 and 4.3 both depend on the notification system:

- 4.2.2 (notification toggle) and 4.2.3 (officer dashboard) both interact with the notification system — the toggle UI changes the dispatch state, and the dashboard shows the current state.
- 4.3.1 (officer reply) uses the `Notification` and `DeviceToken` tables that 4.1 sets up.

Sub-Phase 4.1 produces the notification foundation that the rest of Phase 4 builds on.

### 4.3 Document Breakdown

#### Document 4.1.1 — FCM Integration Architecture

**Scope:** The Firebase project setup, the FCM service account credential configuration, the `NotificationService` server module, the FCM error code handling, and the environment variable naming.

**What this document covers:**

- The **Firebase project setup instructions** (no code — configuration documentation only):
  - Creating a Firebase project in the Firebase console.
  - Enabling Firebase Cloud Messaging.
  - Generating a service account JSON key.
  - Storing the service account JSON in an environment variable (e.g., `FCM_SERVICE_ACCOUNT_JSON`).
  - Adding the FCM HTTP v1 API endpoint to the project.
- The **environment variable naming convention** for FCM:
  - `FCM_SERVICE_ACCOUNT_JSON` — the full service account JSON as a string (or a path to the JSON file, with the document specifying the chosen approach).
  - `FCM_PROJECT_ID` — the Firebase project ID.
  - Any other FCM-specific environment variables.
  - The document specifies the exact list and their formats.
- The `NotificationService` server module in `lib/notification-service.ts`:
  - A `send(notification: NotificationPayload)` function that dispatches a single push notification via FCM HTTP v1 API.
  - A `sendBatch(notifications: NotificationPayload[])` function for batch dispatch (used when the same event needs to be sent to multiple officers).
  - The function constructs the FCM request body, signs it with the service account credentials, and POSTs to the FCM HTTP v1 endpoint.
  - The function returns a result object indicating success or failure, with the FCM message ID on success or the error code on failure.
- The **FCM error code handling:**
  - `INVALID_REGISTRATION` / `UNREGISTERED` — the device token is no longer valid. The function triggers a cleanup that marks the `DeviceToken.isActive = false` (delegated to 4.1.2, but the trigger is here).
  - `SENDER_ID_MISMATCH` — configuration error; logged as a critical alert.
  - `QUOTA_EXCEEDED` — rate limit hit; the function logs and returns the failure (retry logic is in 4.1.3).
  - Other errors are logged and returned.
- The **token cleanup hook:** the `NotificationService` exposes a callback or event that 4.1.2 subscribes to. When the service marks a token as invalid, the callback is invoked with the token string, and 4.1.2's logic deactivates the corresponding `DeviceToken` record.
- The **dependency on FCM credentials:** the `NotificationService` checks for the presence of the FCM credentials at startup. If they are missing (e.g., in local development without FCM set up), the service falls back to a "console log" mode where notifications are logged to the server console instead of being dispatched. This allows local development without requiring every developer to set up Firebase.
- A small verification: a test script or temporary route that calls `NotificationService.send()` with a fake payload and confirms the console-log fallback (or, if FCM is configured, the real dispatch).

**Outcome:** The `NotificationService` module exists with the correct API. In local development without FCM credentials, notifications are logged to the console. With credentials, they are dispatched to FCM. FCM error codes are handled, and invalid tokens trigger a cleanup callback.

**Master Plan sections implemented:** Sections 3.3 (FCM technology choice), 14.1 (FCM integration overview), 14.4 (invalid token cleanup), 17 (decisions log entry on FCM).

---

#### Document 4.1.2 — Device Registration & Token Management API

**Scope:** The `POST /api/notifications/devices/register` endpoint, the `DELETE /api/notifications/devices/[tokenId]` endpoint, the device token deduplication, the mobile login endpoint finalization, and the cleanup callback from 4.1.1.

**What this document covers:**

- The `POST /api/notifications/devices/register` endpoint:
  - Accepts a request body with the FCM token, the platform (`ANDROID`, `IOS`, or `WEB`), and optional `deviceInfo` (model, OS version).
  - Authenticated: requires a valid officer session (web or mobile).
  - Validates the request using a Zod schema in `schemas/notification.schema.ts`.
  - Creates a new `DeviceToken` record linked to the calling officer's `CounterOfficer` profile.
  - **Token deduplication:** if a token with the same string already exists in the database, the existing record is updated (refreshed `lastUsedAt`, updated `deviceInfo` if provided) and the existing record's ID is returned. The endpoint is idempotent — calling it twice with the same token does not create two records.
  - The endpoint requires the calling user to have the `notification:toggle` permission (or a more specific `notification:register` permission — the document specifies which).
- The `DELETE /api/notifications/devices/[tokenId]/route.ts` endpoint:
  - Removes a `DeviceToken` record by ID.
  - Authenticated: requires the calling user to own the token (i.e., the token's `CounterOfficer` must be the calling user's profile). This prevents one officer from removing another's device tokens.
  - Returns 204 on success or 403/404 on failure.
- The **mobile login endpoint finalization:** the `POST /api/auth/mobile/login` endpoint was implemented in Phase 1.2.2 (it returns the access token, refresh token, and expiry). Phase 4.1.2 documents the endpoint's expected request/response format for mobile clients and ensures the response includes any mobile-specific fields the master plan calls out (e.g., the officer's profile, the assigned counter, the notification toggle state — so the app has everything it needs in one call after login).
- The **token cleanup integration:** the cleanup callback from 4.1.1 (triggered when FCM returns `INVALID_REGISTRATION`) is wired up. When the callback fires with an invalid token string, the system:
  - Looks up the `DeviceToken` by token string.
  - If found, sets `isActive = false`.
  - Logs the cleanup event.
- The `lib/device-token.ts` module: utility functions for token registration, deduplication, lookup, and deactivation. This module is the single entry point for device token operations.
- Route protection: both endpoints are guarded with the appropriate permission (`notification:toggle` or similar).
- Audit log writes for token registration and deactivation events (excluding the FCM-triggered cleanup, which is a system event, not a user action — the document specifies this policy).
- A small test page or temporary route that registers a fake token, deduplicates it on a second call, and deactivates it via the cleanup callback.

**Outcome:** A device can be registered via the API. Duplicate tokens are deduplicated. Tokens can be removed. FCM-triggered cleanups deactivate invalid tokens automatically. The mobile login endpoint is finalized and documented for mobile clients.

**Master Plan sections implemented:** Sections 4.5 (Android integration strategy), 9.3 (device register/delete endpoints), 10.3 (mobile authentication flow), 14.2 (FCM trigger points referenced), 14.4 (invalid token cleanup integration).

---

#### Document 4.1.3 — Notification Dispatch & Delivery System

**Scope:** The trigger points for sending notifications, the notification payload structure, the delivery tracking via the `Notification` table, and the retry logic for failed deliveries.

**What this document covers:**

- The **trigger points** for sending push notifications (from the master plan's Section 14.2):
  - **New ticket issued:** when a ticket is issued (in Phase 2.2.1) for a service that is assigned to one or more counters, all active duty officers on those counters who have notifications enabled receive a push notification. The notification is "New ticket [number] for [service]".
  - **Ticket recalled:** when a ticket is recalled (in Phase 2.3.1) by an officer, the officer who originally called the ticket (if different) receives a notification. The notification is "Ticket [number] has been recalled".
  - **Admin system message (future):** not implemented in Phase 4, but the dispatch system is designed to accommodate it.
- The **notification payload structure** (from the master plan's Section 14.3):
  - `type`: `TICKET_ISSUED`, `TICKET_RECALLED`, etc.
  - `notificationId`: the ID of the `Notification` record.
  - `ticketId`: the ID of the ticket.
  - `ticketNumber`: the displayed ticket number.
  - `serviceId`, `serviceName`: the service.
  - `counterId`, `counterName`: the counter.
  - `replyUrl`: the endpoint to reply to (e.g., `/api/notifications/<id>/reply`).
  - This payload is the `data` object of the FCM notification.
- The **dispatch flow:**
  - When a trigger event occurs, the system determines the recipients (officers to notify).
  - For each recipient, the system creates a `Notification` record in the database with `status = PENDING`.
  - The system calls `NotificationService.send()` for each recipient.
  - On FCM success, the `Notification.status` is updated to `SENT` and `sentAt` is set. If FCM returns a `messageId`, it's stored in `fcmMessageId`.
  - On FCM failure, the `Notification.status` is updated to `FAILED` and the error is logged.
- The **delivery tracking:**
  - The `Notification.status` enum values are: `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `READ`.
  - The `deliveredAt` and `readAt` timestamps are set by the mobile app via API callbacks (when the app confirms delivery and read). For Phase 4, only `PENDING`, `SENT`, and `FAILED` are populated. The `DELIVERED` and `READ` states are future enhancements for the Android app.
- The **retry logic for failed deliveries:**
  - On `FAILED` with a retriable error code (e.g., `INTERNAL`, `UNAVAILABLE`), the system retries up to 3 times with exponential backoff (1s, 5s, 30s).
  - On `INVALID_REGISTRATION` or `UNREGISTERED`, no retry — the token is deactivated and the failure is final.
  - On `QUOTA_EXCEEDED`, the retry is deferred (no immediate retry; the next dispatch will catch up).
- The **integration with Phase 2.2.1 and 2.3.1:** the trigger points are added to the ticket issuance and recall code paths. The existing `broadcastEvent()` calls (for SSE) are not modified; the notification dispatch is a parallel action. A `notifyOfficers()` helper function is created that handles the recipient determination and the dispatch.
- The `audit-log` writes for notification dispatch events are NOT performed (per the Phase 2.8.4 policy: high-volume actions skip audit logging; the `Notification` table is the audit trail).
- A small verification: a test that issues a ticket, observes the `Notification` record being created in `PENDING` state, and then either transitions to `SENT` (with valid FCM credentials) or stays in `PENDING` (with the console-log fallback).

**Outcome:** Issuing a ticket results in push notifications being dispatched to the appropriate officers' devices. Recalling a ticket results in a push notification to the original calling officer. The `Notification` table tracks every dispatch attempt. Failed deliveries are retried up to 3 times.

**Master Plan sections implemented:** Sections 14.2 (notification trigger points), 14.3 (FCM notification payload structure), 14.4 (retry and cleanup), 9.3 (notification-related endpoints).

---

### 4.4 Sub-Phase 4.1 Exit Criteria

Sub-Phase 4.1 is complete when:

1. The `NotificationService` module is implemented and handles FCM success and error cases.
2. In local development without FCM credentials, notifications are logged to the console.
3. A device token can be registered via `POST /api/notifications/devices/register`. Duplicate tokens are deduplicated.
4. A device token can be removed via `DELETE /api/notifications/devices/[tokenId]`. Officers can only remove their own tokens.
5. An FCM `INVALID_REGISTRATION` error marks the corresponding `DeviceToken` as inactive.
6. Issuing a ticket results in a `Notification` record being created and dispatched (or console-logged if FCM is not configured).
7. Recalling a ticket results in a `Notification` record being dispatched to the original calling officer.
8. Failed dispatches are retried up to 3 times with exponential backoff.
9. The mobile login endpoint is finalized and documented for mobile clients.

---

## 5. Sub-Phase 4.2 — Counter Status & Notification Controls

### 5.1 Purpose

Sub-Phase 4.2 introduces the **operational controls** that an officer has over their counter and their notifications. Counter temporary closure is a critical real-world feature: an officer needs to be able to step away from their counter (for a break, a meeting, an emergency) without the system continuing to assign tickets to them. The notification toggle is a personal preference: an officer may want to disable push notifications while still keeping their counter open.

This sub-phase also builds the **full officer dashboard**, which is the composition layer where everything an officer needs comes together. The dashboard is the visual front door of the operational system.

### 5.2 Why This Sub-Phase Comes After 4.1

The notification toggle (4.2.2) and the officer dashboard (4.2.3) both depend on the notification system from 4.1. Without 4.1, the notification toggle has nothing to toggle, and the dashboard's notification state has nothing to display.

### 5.3 Document Breakdown

#### Document 4.2.1 — Temporary Counter Closure System

**Scope:** The `PATCH /api/counters/[counterId]/status` endpoint, the `CounterStatusEvent` audit record, the display board reflection of closure, the queue behavior during closure, and the SSE event broadcast.

**What this document covers:**

- The `PATCH /api/counters/[counterId]/status` endpoint (from the master plan's Section 9.3):
  - Accepts a request body with the new status (`OPENED` or `CLOSED_TEMPORARY`) and an optional `reason` string.
  - The status `CLOSED_PERMANENT` is not exposed via this endpoint — permanent closure is the same as `Counter.isActive = false`, which is an admin action via the counter management page (Phase 2.1.2).
  - Authenticated: requires the calling user to be the assigned officer for the counter (or have the `counter:manage` permission as an override).
  - Validates the transition (e.g., you cannot close a counter that is already closed).
- The **state transitions** for `CounterOfficer.currentStatus`:
  - `AVAILABLE` → `CLOSED` (on temporary closure).
  - `CLOSED` → `AVAILABLE` (on reopening).
  - Other transitions (e.g., to `SERVING`, `OFFLINE`) are not in scope for 4.2.1.
- The `CounterStatusEvent` record creation:
  - On every status change, a `CounterStatusEvent` is created with the appropriate `status` enum value, the `counterId`, the `counterOfficerId`, the optional `reason`, and the `createdAt` timestamp.
  - The `statusHistory` relation on the `Counter` record captures this audit trail.
- The **display board reflection:** when a counter is marked as closed, a `COUNTER_CLOSED` SSE event is emitted via `broadcastEvent('global', 'COUNTER_CLOSED', payload)`. The display board (from Phase 3.2) consumes this event and shows the counter as "Temporarily Closed" with the optional reason. When reopened, a `COUNTER_OPENED` event is emitted and the display board returns the counter to its normal state.
- The **queue behavior during closure:**
  - Tickets that are waiting for the closed counter's services continue to wait. They are not reassigned to other counters.
  - No new calls can be made to the closed counter (the call endpoint in Phase 2.3.1 returns an error if the counter is closed).
  - The display board may show a "Closed" indicator for the counter; waiting customers see that the counter is temporarily unavailable.
- The **CounterStatusToggle component** (from the master plan's Section 6.5): the UI control in the officer dashboard that lets the officer toggle the counter open or closed, with an optional reason input. The component is a simple toggle/switch combined with a modal or inline form for the reason.
- The `PATCH /api/officers/me/notifications` endpoint is NOT in this document — that's 4.2.2.
- Route protection: the endpoint is guarded with `counter:close` permission.
- Audit log writes for the status change (the `CounterStatusEvent` is the primary audit; an additional `AuditLog` entry is written for compliance).

**Outcome:** An officer can mark their counter as temporarily closed with an optional reason. The closure is reflected on the display board within a second. A `CounterStatusEvent` records the closure. Tickets continue to wait and are not auto-reassigned. Reopening the counter restores normal operation.

**Master Plan sections implemented:** Sections 6.5 (CounterStatusToggle component), 8.2 (CounterStatusEvent model usage), 9.3 (status endpoint), 11.2 (COUNTER_CLOSED event in routing).

---

#### Document 4.2.2 — Notification Toggle Feature

**Scope:** The `PATCH /api/officers/me/notifications` endpoint, the toggle UI in the officer dashboard, the visual indicator of the current state, and the independence rule between notification state and counter state.

**What this document covers:**

- The `PATCH /api/officers/me/notifications` endpoint:
  - Accepts a request body with the new `notificationsEnabled` boolean.
  - Authenticated: requires the calling user to be a counter officer (have a `CounterOfficer` profile).
  - Updates the `CounterOfficer.notificationsEnabled` field.
  - No additional permission check beyond being a counter officer (the toggle is a personal preference).
- The **independence rule** (emphasized in the master plan's Section 4.2.2): the notification toggle state is **independent** of the counter open/closed state. An officer can:
  - Disable notifications while the counter is open (they just won't receive push notifications, but the counter still receives tickets).
  - Enable notifications while the counter is temporarily closed (they'll receive notifications about tickets for their counter's services, even though they can't serve them right now).
  - The two states are tracked in separate fields and enforced by separate endpoints.
- The `NotificationToggle` component (from the master plan's Section 6.5): the UI control in the officer dashboard. It's a simple switch or toggle with a clear on/off state and a label.
- The **visual indicator:** the current notification state is shown clearly in the dashboard (e.g., a colored indicator: green for enabled, grey for disabled).
- The **integration with the dispatch system (4.1.3):** the dispatch logic checks `CounterOfficer.notificationsEnabled` before sending a notification. If the field is false, no notification is sent to that officer for that counter (the `Notification` record is also not created — the dispatch is skipped entirely).
- The **counter-specific vs. officer-wide toggle:** the master plan's `CounterOfficer` model has a `notificationsEnabled` field. The document specifies that this field is per-officer-per-counter (a user with multiple counter assignments can have different notification preferences for each). The `PATCH /api/officers/me/notifications` endpoint takes the `counterId` as a query parameter or in the body to identify which `CounterOfficer` profile to update.
- Route protection: the endpoint is guarded with `notification:toggle` permission.
- Audit log writes for the toggle change.

**Outcome:** An officer can toggle push notifications on or off for a specific counter. The toggle state is respected by the dispatch system. The toggle is independent of the counter's open/closed state. The dashboard shows the current state clearly.

**Master Plan sections implemented:** Sections 6.5 (NotificationToggle component), 8.2 (CounterOfficer model usage), 9.3 (notifications endpoint), 11.2 (event routing implication).

---

#### Document 4.2.3 — Counter Officer Dashboard

**Scope:** The full officer dashboard layout, the live counter state, the current serving ticket, the queue depth indicator, the next ticket preview, the action buttons, the counter status toggle, the notification toggle, the recent activity feed, and the loading/empty state handling.

**What this document covers:**

- The `app/(officer)/counter/[counterId]/page.tsx` page: the full officer dashboard. The temporary stub from Phase 2.3.2 (the bare `TicketActionPanel` on a minimal page) is replaced with the full layout.
- The **dashboard layout** (from the master plan's Section 4.2.3, expanded):
  - **Header:** counter name and number, current operational status indicator (open / temporarily closed / offline).
  - **Current serving ticket card:** large display of the ticket the officer is currently calling or serving. Includes the ticket number, service, and the action buttons (Call Next, Recall, No-Show — from the `TicketActionPanel` component built in 2.3.2).
  - **Queue depth indicator:** visual indicator of how many tickets are waiting for this counter. E.g., "12 waiting". Updated in real time via SSE.
  - **Next ticket preview:** the ticket that would be called if the officer pressed "Call Next". Shows the ticket number and service.
  - **Counter status toggle:** the `CounterStatusToggle` component from 4.2.1. Lets the officer open or close the counter.
  - **Notification toggle:** the `NotificationToggle` component from 4.2.2. Lets the officer enable or disable push notifications.
  - **Recent activity feed:** a chronological list of recent actions (tickets called, recalled, marked no-show; counter status changes). Pulled from the `TicketEvent` and `CounterStatusEvent` tables for this counter.
- The **real-time updates via SSE:**
  - The dashboard subscribes to the `counter:[counterId]` channel using the `useSSE()` hook from Phase 3.1.2.
  - Events that update the dashboard:
    - `TICKET_QUEUED` — a new ticket was issued and added to the counter's queue.
    - `QUEUE_UPDATED` — the queue changed (e.g., a ticket was called or no-show'd).
    - `COUNTER_STATUS_CHANGED` — the counter's status changed.
    - `NOTIFICATION_RECEIVED` — a push notification was dispatched to this officer (the dashboard shows an indicator, even if the mobile app is the primary recipient).
  - The dashboard updates the queue depth, current serving ticket, and recent activity feed in real time.
- The **composition with Phase 2 components:**
  - The `TicketActionPanel` from 2.3.2 is reused for the Call/Recall/No-Show buttons. No duplication.
  - The dashboard imports the component and wires it up to the SSE events.
- The `app/(officer)/layout.tsx` is updated: the officer now has a simplified sidebar with navigation items (Dashboard, Settings, Logout). The sidebar is less elaborate than the admin's — it focuses on the officer's immediate operational needs.
- The **loading and empty state handling:**
  - On page load, a loading skeleton is shown while the initial data is fetched.
  - If the counter has no waiting tickets, the "Next ticket" section shows "No tickets waiting" with a friendly empty state.
  - If the counter is temporarily closed, the action buttons are disabled and a clear "Counter is closed — reopen to serve tickets" message is shown.
- The **route protection:**
  - The page requires the user to be a counter officer assigned to the counter.
  - The `counter:read` permission is required.
  - The SSE channel subscription (`/api/sse/counter/[counterId]`) enforces the same authorization at the server side.
- A small test that loads the dashboard as a counter officer, observes the layout, and verifies that SSE updates trigger UI changes.

**Outcome:** The full officer dashboard is working. An officer assigned to a counter can see the live state, act on tickets, toggle counter status, toggle notifications, and observe real-time queue changes. The dashboard is the officer's operational home base.

**Master Plan sections implemented:** Sections 4.2 (rendering strategy for officer dashboard), 6.4 (officer layout), 6.5 (all officer-facing components), 8.2 (CounterOfficer model usage), 11.1 (counter channel consumption).

---

### 5.4 Sub-Phase 4.2 Exit Criteria

Sub-Phase 4.2 is complete when:

1. An officer can mark their counter as temporarily closed with a reason. The display board reflects the closure within a second.
2. The counter can be reopened. The display board returns to normal.
3. A `CounterStatusEvent` is created for every status change with the correct status, reason, and timestamps.
4. An officer can toggle push notifications on or off. The toggle state is respected by the dispatch system (verifiable by issuing a ticket and observing whether a `Notification` record is created).
5. The notification toggle works independently of the counter open/closed state.
6. The full officer dashboard at `/counter/[counterId]` shows the counter name, current serving ticket, queue depth, next ticket preview, action buttons, counter status toggle, notification toggle, and recent activity feed.
7. The dashboard updates in real time when a ticket is queued, called, or marked no-show.
8. A non-assigned officer cannot access another counter's dashboard (403).
9. The dashboard's loading and empty states are handled gracefully.

---

## 6. Sub-Phase 4.3 — Notification Reply & Broadcasting

### 6.1 Purpose

Sub-Phase 4.3 closes the **communication loop** between officers and the rest of the system. An officer who receives a push notification (about a new ticket or a recall) can reply to it. The reply becomes a broadcast message that appears on the display board (visible to all waiting customers and staff) and in the security officer's feed (so security personnel can act on officer requests).

The strategic value of this feature is that **officers can request assistance or communicate context without leaving their counter**. A reply of "I need assistance at Counter 2" appears on the display board and in the security officer's view, who can dispatch help.

### 6.2 Why This Sub-Phase Closes Phase 4

Sub-Phase 4.3 is the last sub-phase of Phase 4. It completes the operational picture:

- Officers can receive notifications (4.1).
- Officers can manage their counter and notification state (4.2).
- Officers can reply to notifications, and the replies reach the right people (4.3).
- The display board and security officer screen become communication surfaces, not just status displays.

After Sub-Phase 4.3, the system is **operationally complete** for officers and ready for the analytics and hardening layer in Phase 5.

### 6.3 Document Breakdown

#### Document 4.3.1 — Officer Reply API & Message Flow

**Scope:** The `POST /api/notifications/[notificationId]/reply` endpoint, the `NotificationReply` record creation, the validation rules, the character limit, and the timestamp recording.

**What this document covers:**

- The `POST /api/notifications/[notificationId]/reply` endpoint (from the master plan's Section 9.3):
  - Accepts a request body with the `message` string.
  - Authenticated: requires the calling user to be the officer who received the notification (i.e., the `Notification.counterOfficerId` matches the calling user's `CounterOfficer` profile) OR the assigned officer for the counter the notification is about.
  - Validates the message: must be non-empty, must not exceed 500 characters (the master plan's `NotificationReply.message` field has `max 500 chars`).
  - Creates a `NotificationReply` record with the message, the notification ID, the counter officer ID, and the creation timestamp.
- The **validation rules:**
  - The notification must exist and be in a state that allows replies (not expired, not deleted).
  - The calling officer must be authorized to reply (per the auth rule above).
  - The message length is enforced (1 to 500 characters).
  - The reply is idempotent in the sense that submitting the same reply twice creates two `NotificationReply` records (each is a separate reply) — there's no built-in deduplication.
- The **timestamp recording:**
  - `createdAt` is set automatically by Prisma.
  - The `broadcastAt` field is set later, when 4.3.2 converts the reply into a broadcast message.
- The **integration with the mobile flow:** the mobile app's reply UI calls this endpoint. The endpoint returns the created `NotificationReply` record (so the app can show "Reply sent" confirmation) and triggers the broadcast creation (4.3.2).
- The `lib/notification-reply.ts` module: utility functions for reply creation, validation, and the broadcast trigger.
- Route protection: the endpoint is guarded with `notification:reply` permission.
- Audit log writes for the reply creation (the `NotificationReply` is the primary record; an additional `AuditLog` entry is written for compliance).

**Outcome:** An officer can submit a reply to a notification via the API. The reply is recorded in the `NotificationReply` table with the correct timestamp, message, and authorization. The reply triggers the broadcast creation (4.3.2).

**Master Plan sections implemented:** Sections 6.5 (no specific component — this is API only), 8.2 (NotificationReply model), 9.3 (reply endpoint).

---

#### Document 4.3.2 — Display Board Message Injection

**Scope:** The conversion of a `NotificationReply` to a `BroadcastMessage`, the SSE event payload, the display board's broadcast overlay rendering, and the handling of multiple simultaneous broadcasts.

**What this document covers:**

- The **conversion flow:**
  - When a `NotificationReply` is created (4.3.1), a `BroadcastMessage` record is also created (in the same transaction or a tightly coupled post-step).
  - The `BroadcastMessage` includes:
    - `message`: copied from the reply (or formatted with sender context).
    - `senderOfficerId`: the replying officer.
    - `senderDisplayName`: denormalized for stability (so a renamed officer doesn't break old messages).
    - `sourceReplyId`: link back to the `NotificationReply`.
    - `targetDisplayBoardId`: if the broadcast targets a specific display board (e.g., a particular configuration), set here. Otherwise null for "all boards".
    - `displayDurationSeconds`: how long the message should show on the display board (default 10 seconds, configurable per broadcast).
    - `expiresAt`: when the message expires (default: 5 minutes from creation, configurable).
    - `isActive`: defaults to true.
- The **SSE event emission:**
  - The `broadcastEvent()` function from Phase 3.1.3 is called with:
    - Channels: `['global', 'security']` (the display board consumes `global`, the security screen consumes `security`).
    - Event type: `'BROADCAST_MESSAGE'`.
    - Payload (from the master plan's Section 11.4): `{ broadcastId, message, senderName, displaySeconds }`.
- The **display board's broadcast overlay:**
  - The display board (from Phase 3.2) consumes the `BROADCAST_MESSAGE` event.
  - The overlay was reserved in Phase 3.2.1 (the layout slot exists). Phase 4.3.2 wires it up.
  - The `<BroadcastBanner />` component (from the master plan's Section 6.5) renders the message at a designated position (typically the top or bottom of the screen, prominent but not blocking the ticket cards).
  - The banner shows for `displayDurationSeconds` (default 10) and then auto-dismisses.
  - The banner can also be manually dismissed by the operator (clicking the banner removes it).
- The **multiple simultaneous broadcasts handling:**
  - If two broadcasts arrive within seconds of each other, they stack. The display board may show two banners (or rotate between them, depending on the implementation — the document specifies which).
  - The default implementation rotates: each new broadcast replaces the currently displayed one and shows for its full duration. Older broadcasts are discarded (they're ephemeral by design).
  - The security screen (4.3.3) is the authoritative receiver for the full broadcast history.
- The **expiry logic:**
  - The `expiresAt` field is checked on the client side. If a broadcast arrives with `expiresAt` in the past, it is not displayed.
  - The `isActive` field is checked. If false, the broadcast is not displayed.
- The `lib/broadcast.ts` module: utility functions for broadcast creation, event emission, and expiry checking.
- The `BroadcastBanner` component implementation: positioning, animation, dismissal logic, and accessibility (ARIA roles for screen readers).
- Route protection: the conversion happens server-side in response to the reply endpoint; there is no separate user-facing endpoint for broadcast creation. The reply endpoint is the entry point.

**Outcome:** When an officer replies to a notification, a broadcast message is created, an SSE event is emitted, and the display board shows the broadcast overlay for the configured duration. The security screen receives the same event (handled in 4.3.3).

**Master Plan sections implemented:** Sections 6.5 (BroadcastBanner component), 8.2 (BroadcastMessage model), 11.4 (BROADCAST_MESSAGE event payload), 6.4 (display layout — broadcast overlay slot).

---

#### Document 4.3.3 — Security Officer Screen & Broadcast Receiver

**Scope:** The security officer display screen, the SSE subscription to the `security` channel, the broadcast message feed, the unread indicator, and the security officer role assignment.

**What this document covers:**

- The `app/security/page.tsx` page: the dedicated full-screen view for the security officer. The page is similar in layout philosophy to the display board (full-screen, minimal chrome) but with different content (a chronological feed of broadcast messages).
- The **route protection:**
  - The page requires the user to have the `SECURITY_OFFICER` role.
  - If a non-security user accesses the page, they are redirected to the dashboard or shown a 403.
  - The SSE channel subscription (`/api/sse/security`) enforces the same authorization at the server side.
- The **layout:**
  - Full-screen view, dark theme (using the same `display-bg` and `display-text` tokens as the main display board, for consistency).
  - Top bar: "Security Officer" label, current time, user name, logout.
  - Main area: a chronological feed of broadcast messages.
  - Each message shows: sender display name, message text, timestamp, and an "unread" indicator (e.g., a colored dot) for messages the security officer has not yet viewed.
- The **SSE subscription:**
  - The page subscribes to the `security` channel using the `useSSE()` hook from Phase 3.1.2.
  - Events consumed:
    - `BROADCAST_MESSAGE` — a new broadcast is added to the feed.
    - `OFFICER_REPLY` — a reply was sent (this is informational; the security officer can see the reply context if needed).
  - The page also fetches the initial state of broadcasts on page load (a small API call that returns the recent active broadcasts).
- The **broadcast message feed:**
  - Messages are ordered most-recent-first.
  - Each message has a "read" state (a boolean in the client state, persisted in `localStorage` or a server-side `BroadcastMessageRead` table — the document specifies the chosen approach).
  - The "unread" indicator is shown for messages where `read = false`.
  - Tapping a message marks it as read.
- The **security officer role assignment:**
  - The master plan's Section 2.2 lists "Security Officer" as a system actor.
  - The master plan's Section 10.4 lists `SECURITY_OFFICER` as a system role with the permissions `ticket:view` and `notification:broadcast`.
  - The security officer is identified by **role assignment**, not by counter assignment. The master plan's wording "counter assignment that identifies which user receives broadcasts as the Security Officer" (in the Sub-Phase 4.3.3 scope summary) is interpreted here as **role assignment** — counter assignment is for counter officers, and the security officer is identified by having the `SECURITY_OFFICER` role.
  - The document explicitly captures this clarification so the implementation does not confuse the two.
- The **multiple security officers consideration:** if multiple users have the `SECURITY_OFFICER` role (e.g., a shift change), all of them see all broadcasts. There is no "this security officer" concept in Phase 4. Future enhancements may add assignment, but it's not in scope here.
- The `app/security/layout.tsx`: a minimal layout (no sidebar, full-screen).
- A small test: a security officer loads the page, a counter officer sends a reply, and the security officer sees the new broadcast within a second.

**Outcome:** The security officer screen at `/security` is working. It subscribes to the `security` SSE channel and displays incoming broadcast messages in real time. The unread indicator helps the security officer prioritize. Only users with the `SECURITY_OFFICER` role can access the page.

**Master Plan sections implemented:** Sections 2.2 (security officer actor), 6.4 (security screen layout), 8.2 (BroadcastMessage model usage), 10.4 (SECURITY_OFFICER role), 11.1 (security channel).

---

### 6.4 Sub-Phase 4.3 Exit Criteria

Sub-Phase 4.3 is complete when:

1. An officer can submit a reply to a notification via `POST /api/notifications/[notificationId]/reply`. The reply is recorded in the `NotificationReply` table.
2. The reply is converted to a `BroadcastMessage` with the correct fields (message, sender, timestamps, expiry).
3. A `BROADCAST_MESSAGE` SSE event is emitted to the `global` and `security` channels.
4. The display board shows the broadcast overlay for the configured duration.
5. The security officer screen at `/security` shows the broadcast in the chronological feed within a second.
6. Multiple broadcasts arriving close together are handled (rotated on display, listed in order on the security screen).
7. The security officer screen requires the `SECURITY_OFFICER` role. Non-security users are denied.
8. Broadcasts past their `expiresAt` are not displayed.
9. The unread indicator on the security screen works correctly.

---

## 7. Sub-Phase Dependency Map

The following diagram shows the build order of sub-phases and the inter-document dependencies. Documents on the same row can be developed in parallel after the row above is complete.

```
Sub-Phase 4.1 (Push Notification Infrastructure)
├── 4.1.1  FCM Integration Architecture
├── 4.1.2  Device Registration & Token Management API     (depends on 4.1.1)
└── 4.1.3  Notification Dispatch & Delivery System        (depends on 4.1.1, 4.1.2)

Sub-Phase 4.2 (Counter Status & Notification Controls)
├── 4.2.1  Temporary Counter Closure System               (depends on Phase 2.3.1, Phase 3.1.3)
├── 4.2.2  Notification Toggle Feature                    (depends on 4.1.3, 4.2.1)
└── 4.2.3  Counter Officer Dashboard                      (depends on 4.2.1, 4.2.2, Phase 2.3.2, Phase 3.1.2)

Sub-Phase 4.3 (Notification Reply & Broadcasting)
├── 4.3.1  Officer Reply API & Message Flow               (depends on 4.1.3)
├── 4.3.2  Display Board Message Injection                (depends on 4.3.1, Phase 3.2.1)
└── 4.3.3  Security Officer Screen & Broadcast Receiver   (depends on 4.3.2, Phase 3.1.2)
```

**Critical Path:** `4.1.1 → 4.1.2 → 4.1.3 → 4.2.1 → 4.2.3 → 4.3.1 → 4.3.2 → 4.3.3`

**Parallel Opportunities:**

- `4.1.1` and `4.2.1` can be developed in parallel after Phase 2 and Phase 3 are complete. The FCM integration and the counter closure feature are largely independent.
- `4.1.2` and `4.1.3` are tightly coupled (the device registration enables the dispatch) and must be developed in sequence.
- `4.2.2` and `4.3.1` can be developed in parallel after `4.1.3` is complete.

**Composition with Earlier Phases:**

- The `TicketActionPanel` from **2.3.2** is reused in the officer dashboard (4.2.3) — no duplication.
- The `useSSE()` hook from **3.1.2** is used by the officer dashboard (4.2.3) on the `counter:[counterId]` channel and by the security screen (4.3.3) on the `security` channel.
- The `broadcastEvent()` function from **3.1.3** is used by 4.2.1 (counter closure) and 4.3.2 (broadcast creation).
- The `BroadcastBanner` slot from **3.2.1** is wired up in 4.3.2.
- The mobile login endpoint from **1.2.2** is finalized in 4.1.2.

---

## 8. Cross-Cutting Standards for Phase 4

The following standards apply to every Phase 4 task plan document. The conventions from Phase 1, 2, and 3 (folder naming, import paths, TypeScript, Zod validation, error handling, env vars, git commits, transaction boundaries, ticket state machine, event type registry, channel naming) all carry forward. The standards below are **new or specific to Phase 4**.

### 8.1 FCM Token Lifecycle Discipline

`DeviceToken` records have a strict lifecycle:

- **Created** via the device registration endpoint.
- **Refreshed** on every successful FCM dispatch (the `lastUsedAt` is updated).
- **Deactivated** when FCM returns `INVALID_REGISTRATION` or `UNREGISTERED` (via the cleanup callback from 4.1.1).
- **Deleted** via the device removal endpoint or by the cleanup callback setting `isActive = false` (soft delete).

The dispatch system **only sends to active tokens** (`isActive = true`). This is enforced at the query level in the dispatch logic. A token that has not been used in 90 days is flagged for potential cleanup (the document specifies whether automatic cleanup is implemented or whether this is a future enhancement).

### 8.2 Push Notification Retry Discipline

Failed dispatches follow a strict retry policy:

- **Retriable errors** (`INTERNAL`, `UNAVAILABLE`): retry up to 3 times with exponential backoff (1s, 5s, 30s).
- **Non-retriable errors** (`INVALID_REGISTRATION`, `UNREGISTERED`, `SENDER_ID_MISMATCH`): no retry; the token is deactivated or the error is logged.
- **Quota errors** (`QUOTA_EXCEEDED`): no immediate retry; the next dispatch will catch up. The error is logged at warn level.

The retry logic is implemented in `NotificationService.send()` with the retry counts and delays as configurable constants.

### 8.3 Counter Status vs Notification Toggle Independence

The two toggleable states on a `CounterOfficer` profile are **strictly independent**:

- `currentStatus` (AVAILABLE / CLOSED / SERVING / OFFLINE) — controlled by 4.2.1, reflects the counter's operational availability.
- `notificationsEnabled` (boolean) — controlled by 4.2.2, reflects the officer's personal notification preference.

The rules:

- An officer can have `currentStatus = AVAILABLE` and `notificationsEnabled = false` (counter is open, but no push notifications).
- An officer can have `currentStatus = CLOSED` and `notificationsEnabled = true` (counter is closed, but they still get notifications — perhaps because they're on a break and want to know what's happening).
- The dispatch system checks `notificationsEnabled` before sending, regardless of `currentStatus`.
- The call/recall endpoint checks `currentStatus` before allowing the action, regardless of `notificationsEnabled`.

This independence is critical and is documented as a non-negotiable UX rule.

### 8.4 Officer Dashboard Composition Discipline

The officer dashboard (4.2.3) is a **composition layer**, not a re-implementation. The rules:

- The `TicketActionPanel` from 2.3.2 is imported and used as-is.
- The `CounterStatusToggle` from 4.2.1 is imported and used as-is.
- The `NotificationToggle` from 4.2.2 is imported and used as-is.
- The `useSSE()` hook from 3.1.2 is imported and used.
- No business logic is duplicated. The dashboard only orchestrates pre-existing components.

This discipline ensures that any bug fix or enhancement to a component (e.g., a new feature in the `TicketActionPanel`) automatically benefits the dashboard without further work.

### 8.5 Broadcast Message Lifecycle Discipline

`BroadcastMessage` records have a well-defined lifecycle:

- **Created** when a `NotificationReply` triggers a broadcast (4.3.2).
- **Active** for `displayDurationSeconds` (default 10) on the display board.
- **Expired** when `expiresAt` is reached (default 5 minutes from creation).
- **Inactive** when `isActive = false` (set manually by an admin or automatically by expiry).

The discipline:

- The display board checks `isActive = true` AND `expiresAt > now()` before displaying. Expired or inactive messages are not shown.
- The security screen shows all active messages in its feed; expired messages are not shown but may be retained in the database for history (the document specifies retention policy).
- The database keeps the `BroadcastMessage` records for audit and historical purposes; only the display logic filters by expiry.

### 8.6 Mobile-Facing API Conventions

All endpoints that the future Android app will call follow mobile-friendly conventions:

- Authentication via `Authorization: Bearer {accessToken}` (the mobile flow from 1.2.2, finalized in 4.1.2).
- The mobile login response includes a compact officer profile (name, roles, assigned counter, notification toggle state) so the app has what it needs in one call.
- Date/time fields are always ISO 8601 strings.
- Error responses use the standard envelope from the master plan's Section 9.1.
- The mobile app does not have access to web-only endpoints (e.g., the user management pages); it only has the mobile-specific surface.

These conventions are documented in 4.1.2 and apply to all mobile-facing endpoints added in Phase 4.

### 8.7 Security Officer Role vs Counter Officer Role

The `SECURITY_OFFICER` and `COUNTER_OFFICER` roles are **mutually exclusive in practice** but not enforced at the database level (a user could theoretically have both). The discipline:

- A user with `COUNTER_OFFICER` role can access counter-related pages and APIs.
- A user with `SECURITY_OFFICER` role can access the security screen.
- A user with both roles can access both surfaces (rare, but possible for an admin who also acts as security).
- The role check is per-page, per-API. There is no "mode switching" — the user just navigates to the appropriate page.

### 8.8 SSE Channel Authorization on the Server

The SSE channel authorization from Phase 3.1.1 is enforced in Phase 4:

- `counter:[counterId]` — the connecting user must be the assigned officer for that counter. Enforced at the route handler.
- `security` — the connecting user must have the `SECURITY_OFFICER` role. Enforced at the route handler.
- A non-authorized user attempting to subscribe to a channel receives a 403 (not a silent failure — the error is clear).

The channel authorization logic is implemented in `lib/sse-manager.ts` (or a dedicated authorization helper) and reused across all channel subscriptions.

---

## 9. Phase 4 Exit Criteria & Phase 5 Hand-off

### 9.1 Phase 4 Exit Criteria (The Complete Checklist)

Phase 4 is complete when **all** of the following are true:

#### Push Notifications

- [ ] The `NotificationService` module is implemented with FCM HTTP v1 API integration.
- [ ] In local development without FCM credentials, notifications are logged to the console.
- [ ] Device tokens can be registered and removed via the API.
- [ ] Token deduplication works correctly.
- [ ] Invalid FCM tokens are deactivated automatically.
- [ ] Issuing a ticket dispatches a notification to the appropriate officers.
- [ ] Recalling a ticket dispatches a notification to the original calling officer.
- [ ] Failed dispatches are retried with exponential backoff.

#### Counter Status & Notification Controls

- [ ] An officer can mark their counter as temporarily closed with a reason.
- [ ] The closure is reflected on the display board within a second.
- [ ] A `CounterStatusEvent` is created for every status change.
- [ ] An officer can toggle push notifications independently of the counter status.
- [ ] The dispatch system respects the notification toggle.
- [ ] The full officer dashboard shows all required components.
- [ ] The dashboard updates in real time via SSE.

#### Notification Reply & Broadcasting

- [ ] An officer can reply to a notification via the API.
- [ ] The reply is converted to a `BroadcastMessage` with the correct fields.
- [ ] A `BROADCAST_MESSAGE` event is emitted to the `global` and `security` channels.
- [ ] The display board shows the broadcast overlay for the configured duration.
- [ ] The security officer screen at `/security` shows the broadcast feed in real time.
- [ ] The security screen requires the `SECURITY_OFFICER` role.
- [ ] Expired broadcasts are not displayed.

#### Code Quality

- [ ] No business logic is duplicated from earlier phases.
- [ ] All Phase 4 API endpoints are guarded with the correct permissions.
- [ ] `yarn lint`, `yarn type-check`, and `yarn build` all pass.

### 9.2 What Phase 5 Will Assume

When Phase 5 begins, it assumes Phase 4 is fully complete and verified. Specifically, Phase 5 will assume:

- The `Notification`, `NotificationReply`, `BroadcastMessage`, and `CounterStatusEvent` tables are populated by real data flows.
- The FCM pipeline is operational (with the console-log fallback in local development).
- The officer dashboard is live and the full Phase 4 surface is exercised.
- The security officer screen is live and receiving broadcasts.
- The display board's broadcast overlay is wired up and rendering.
- All Phase 4 API endpoints are in place and used by the front-end code (even though the mobile app is not built, the API surface is complete and ready for it).

### 9.3 What Phase 4 Should Not Touch

Phase 4 task plan documents must **not** introduce:

- **Native Android or iOS app code.** The server side is complete; the app itself is future.
- **The display board implementation itself.** The display board was built in Phase 3. Phase 4.3.2 only wires up the broadcast overlay into the existing display board's reserved slot.
- **The SSE manager implementation.** The manager was built in Phase 3.1. Phase 4 only consumes it.
- **The officer dashboard's individual components** (TicketActionPanel, CounterStatusToggle, NotificationToggle). These are built in their respective sub-phases and composed in 4.2.3 — no duplication.
- **The reports / analytics / charts.** Phase 5. The data tables are populated in Phase 4, but no reporting UI is built.
- **Rate limiting and security hardening.** Phase 5.
- **PostgreSQL migration.** Phase 5.

If a Phase 4 task plan document finds itself needing any of the above, it is a signal that the sub-phase is over-scoped and the work should be deferred.

---

## 10. Phase 4 Document Map (Quick Reference)

| Doc ID    | Title                                        | Master Plan Sections Implemented         |
| --------- | -------------------------------------------- | ---------------------------------------- |
| **4.1.1** | FCM Integration Architecture                 | 3.3, 14.1, 14.4, 17                      |
| **4.1.2** | Device Registration & Token Management API   | 4.5, 9.3, 10.3, 14.4                     |
| **4.1.3** | Notification Dispatch & Delivery System      | 14.2, 14.3, 14.4, 9.3                    |
| **4.2.1** | Temporary Counter Closure System             | 6.5, 8.2 (CounterStatusEvent), 9.3, 11.2 |
| **4.2.2** | Notification Toggle Feature                  | 6.5, 8.2 (CounterOfficer), 9.3, 11.2     |
| **4.2.3** | Counter Officer Dashboard                    | 4.2, 6.4, 6.5, 8.2, 11.1                 |
| **4.3.1** | Officer Reply API & Message Flow             | 8.2 (NotificationReply), 9.3             |
| **4.3.2** | Display Board Message Injection              | 6.5, 8.2 (BroadcastMessage), 11.4, 6.4   |
| **4.3.3** | Security Officer Screen & Broadcast Receiver | 2.2, 6.4, 8.2, 10.4, 11.1                |

---

_End of Phase 4 Overview Document — Version 1.0.0_

_This document is the authoritative overview for Phase 4 of the Smart Queue Management System DDD series. It is the parent reference for the 9 task plan documents listed in Section 10. All Phase 4 task plan documents must be derived from and remain consistent with this overview and the master plan._
