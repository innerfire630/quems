# Codebase Audit Report — quems

**Generated**: 2026-07-01  
**Scope**: Full codebase scan for dead code, unwired integrations, and disconnected modules

---

## 1. Dead Code — Unused Components & Files

### 1.1 `LogoutButton` — Replaced by `ProfileDropdown`

- **Issue Category**: Dead Code
- **File**: `src/app/(dashboard)/_components/logout-button.tsx`
- **Description**: This component was the original sign-out button. It was replaced by the `ProfileDropdown` component (which includes sign-out + change password + profile info). No file imports `LogoutButton` anymore.
- **How to Fix**: Safe to delete `logout-button.tsx`.

---

### 1.2 `CounterServiceAssignment` — Replaced by `ServiceAssignment`

- **Issue Category**: Dead Code
- **File**: `src/app/(dashboard)/counters/_components/counter-service-assignment.tsx`
- **Description**: This was the original service assignment widget for the standalone "Manage Services" page. That page was deleted, and a new `ServiceAssignment` component was created inline on the Edit Counter page. No file imports `CounterServiceAssignment` anymore.
- **How to Fix**: Safe to delete `counter-service-assignment.tsx`.

---

### 1.3 `notification-reply.ts` — Orphaned Module

- **Issue Category**: Dead Code
- **File**: `src/lib/notification-reply.ts`
- **Description**: This module was created as a "single source of truth" for officer reply operations. However, the notification reply route (`src/app/api/notifications/[notificationId]/reply/route.ts`) implements all reply logic inline and never imports this file. All its exports (`createReplyForNotification`, `NotificationNotFoundError`, etc.) are unused.
- **How to Fix**: Safe to delete `notification-reply.ts`. If the route handler logic ever needs to be shared, refactor the route to import from this module instead.

---

### 1.4 `PlaceholderPage` — Never Imported

- **Issue Category**: Dead Code
- **File**: `src/components/shared/PlaceholderPage.tsx`
- **Description**: A scaffold/placeholder component from early development. No file in the codebase imports it.
- **How to Fix**: Safe to delete.

---

### 1.5 `Overview` Page — Duplicate of Dashboard Root

- **Issue Category**: Dead Code / Redundant
- **File**: `src/app/(dashboard)/overview/page.tsx`
- **Description**: This page is nearly identical to `src/app/(dashboard)/page.tsx` (the dashboard root). Both show stats cards, roles, and the same layout. The sidebar links to `/overview`, and `/` redirects to `/overview`. The root page (`page.tsx`) has the "Welcome, {name}" message while overview just says "Overview". Consider consolidating into a single page.
- **How to Fix**: Delete `src/app/(dashboard)/overview/page.tsx` and update the sidebar to link to `/`. Or delete the root `page.tsx` and keep only `/overview`.

---

### 1.6 `DisplayBoardForm` — Unused `handleSubmit` Result

- **Issue Category**: Dead Code (partial)
- **File**: `src/components/admin/display-board-form.tsx`
- **Description**: The form component exists and is used by display board pages, but the `handleSubmit` function calls `router.push('/settings/display')` on success which is correct. No dead code here — included for completeness.
- **How to Fix**: No action needed.

---

## 2. Dev/Test/Debug Routes — Should Be Production-Gated

### 2.1 `_test/rate-limit` Route

- **Issue Category**: Dev/Test Route
- **File**: `src/app/api/_test/rate-limit/route.ts`
- **Description**: A test endpoint for exercising rate limiting. Only useful during development.
- **How to Fix**: Already excluded from auth via proxy.ts matcher. Consider adding `NODE_ENV !== 'production'` check or deleting for production builds.

---

### 2.2 `_dev/permission-check` Route

- **Issue Category**: Dev/Test Route
- **File**: `src/app/api/_dev/permission-check/route.ts`
- **Description**: A dev-only endpoint for testing the `withPermission` guard. Not needed in production.
- **How to Fix**: Already excluded from auth via proxy.ts. Safe to delete for production.

---

### 2.3 `auth/debug-session` Route

- **Issue Category**: Dev/Test Route
- **File**: `src/app/api/auth/debug-session/route.ts`
- **Description**: Development-only session inspector. Exposes session data.
- **How to Fix**: Delete or gate behind `NODE_ENV !== 'production'`.

---

### 2.4 `debug/broadcast` Route

- **Issue Category**: Dev/Test Route
- **File**: `src/app/api/debug/broadcast/route.ts`
- **Description**: Temporary endpoint for triggering SSE events from curl/browser during development.
- **How to Fix**: Delete or gate behind `NODE_ENV !== 'production'`.

---

### 2.5 Debug Route Group

- **Issue Category**: Dev/Test Route
- **Files**: `src/app/(debug)/layout.tsx`, `src/app/(debug)/sse-test/page.tsx`
- **Description**: The debug layout returns 404 in production, but the files still exist.
- **How to Fix**: Safe to delete for production builds. Already gated by layout returning 404.

---

## 3. Scripts — Not Part of Runtime

### 3.1 `scripts/fix-auto-advance.js`

- **Issue Category**: Dead Script
- **File**: `scripts/fix-auto-advance.js`
- **Description**: A one-time migration script for fixing auto-advance settings. No longer needed since the auto-advance feature was removed.
- **How to Fix**: Safe to delete.

---

### 3.2 `scripts/load-test-sse.ts`

- **Issue Category**: Dead Script
- **File**: `scripts/load-test-sse.ts`
- **Description**: A load testing script for SSE. Not part of the application runtime.
- **How to Fix**: Keep if load testing is planned. Otherwise safe to delete.

---

## 4. Unwired / Disconnected Integrations

### 4.1 `GET /api/notifications/devices` — Never Called from Frontend

- **Issue Category**: Unwired Endpoint
- **File**: `src/app/api/notifications/devices/route.ts`
- **Description**: This endpoint lists all device tokens. The frontend never calls it — device management happens through register (`/api/notifications/devices/register`) and remove (`/api/notifications/devices/[tokenId]`).
- **How to Fix**: Either wire it up to a device management UI, or delete if not needed.

---

### 4.2 `GET /api/officers/me` — Never Called from Frontend

- **Issue Category**: Unwired Endpoint
- **File**: `src/app/api/officers/me/route.ts`
- **Description**: Returns the current officer's profile. The officer dashboard loads data via `/api/officers/me/dashboard/[counterId]/current-ticket` and `/next-ticket`, but never calls the base `/api/officers/me` endpoint.
- **How to Fix**: Either wire it up to a profile/settings page for officers, or delete if the dashboard provides sufficient data.

---

### 4.3 `POST /api/display-boards` — No Frontend Form

- **Issue Category**: Unwired Endpoint (partially)
- **File**: `src/app/api/display-boards/route.ts`
- **Description**: The POST endpoint for creating display boards exists, and there IS a `DisplayBoardForm` component and a `/settings/display/new` page. This is wired up correctly. **No issue.**
- **How to Fix**: N/A — already connected.

---

### 4.4 `GET /api/display-boards/snapshot/default` — Unclear Usage

- **Issue Category**: Unwired Endpoint
- **File**: `src/app/api/display-boards/snapshot/default/route.ts`
- **Description**: Returns the default display board snapshot. Used by `src/app/display/page.tsx`. May also be called by external display screens. **Likely fine.**
- **How to Fix**: N/A if external displays use it.

---

### 4.5 `src/app/(dashboard)/kiosk-config/page.tsx` — Kiosk Config Admin Page

- **Issue Category**: Unwired Route (potentially)
- **File**: `src/app/(dashboard)/kiosk-config/page.tsx`
- **Description**: An admin page for configuring kiosk settings. Not linked from the sidebar. Users would need to navigate directly to `/kiosk-config`.
- **How to Fix**: Add a link in the sidebar or settings page, or consolidate into the Settings section.

---

## 5. Redundant / Overlapping Code

### 5.1 Two Dashboard Pages

- **Issue Category**: Redundant Code
- **Files**: `src/app/(dashboard)/page.tsx` and `src/app/(dashboard)/overview/page.tsx`
- **Description**: Both pages show nearly identical content (stats cards, roles section). The root page has a "Welcome, {name}" greeting; the overview page just says "Overview". The sidebar links to `/overview`, and the root page is accessed via `/`.
- **How to Fix**: Consolidate into one page. Keep the root `page.tsx` with the welcome message and delete `overview/page.tsx`, updating the sidebar link to `/`.

---

### 5.2 `TopBar` vs `DashboardTopBar` — Two Top Bar Components

- **Issue Category**: Redundant Code
- **Files**: `src/components/layout/TopBar.tsx` and `src/app/(dashboard)/_components/dashboard-top-bar.tsx`
- **Description**: `TopBar` is used by the officer layout. `DashboardTopBar` is used by the admin dashboard layout. Both now use `ProfileDropdown` and are very similar. Could be consolidated into a single component.
- **How to Fix**: Consider merging into one `TopBar` component that accepts all needed props.

---

## 6. Unused Exports in Library Files

### 6.1 `src/lib/audit-log.ts` — `AuditLogEntry` Interface

- **Issue Category**: Unused Export
- **File**: `src/lib/audit-log.ts`
- **Description**: The `AuditLogEntry` interface has `targetUserId` and `targetUserName` fields that are only used internally by `writeAuditLog`. The `entity` and `entityId` fields were added but many callers still use `targetUserId` as the entity ID fallback. Not strictly dead, but the API surface is confusing.
- **How to Fix**: Consider simplifying the interface — remove `targetUserId`/`targetUserName` in favor of `entityId` and a generic `metadata` field.

---

## Summary Table

| #   | Category    | File                                                                      | Status                |
| --- | ----------- | ------------------------------------------------------------------------- | --------------------- |
| 1   | Dead Code   | `src/app/(dashboard)/_components/logout-button.tsx`                       | **Delete**            |
| 2   | Dead Code   | `src/app/(dashboard)/counters/_components/counter-service-assignment.tsx` | **Delete**            |
| 3   | Dead Code   | `src/lib/notification-reply.ts`                                           | **Delete**            |
| 4   | Dead Code   | `src/components/shared/PlaceholderPage.tsx`                               | **Delete**            |
| 5   | Redundant   | `src/app/(dashboard)/overview/page.tsx`                                   | **Consolidate**       |
| 6   | Redundant   | `TopBar` vs `DashboardTopBar`                                             | **Consider merging**  |
| 7   | Dev Route   | `src/app/api/_test/rate-limit/route.ts`                                   | **Gate or delete**    |
| 8   | Dev Route   | `src/app/api/_dev/permission-check/route.ts`                              | **Gate or delete**    |
| 9   | Dev Route   | `src/app/api/auth/debug-session/route.ts`                                 | **Gate or delete**    |
| 10  | Dev Route   | `src/app/api/debug/broadcast/route.ts`                                    | **Gate or delete**    |
| 11  | Dev Route   | `src/app/(debug)/` directory                                              | **Gate or delete**    |
| 12  | Dead Script | `scripts/fix-auto-advance.js`                                             | **Delete**            |
| 13  | Unwired     | `GET /api/notifications/devices`                                          | **Wire up or delete** |
| 14  | Unwired     | `GET /api/officers/me`                                                    | **Wire up or delete** |
| 15  | Unwired     | `/kiosk-config` admin page                                                | **Add sidebar link**  |
