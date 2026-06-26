# Post-Deployment Smoke Test Checklist

**Version:** 1.0.0
**Status:** Operations Runbook
**Parent Document:** Sub-Phase 5.3.2
**Expected Duration:** 30 minutes

---

## 1. Overview

This checklist is run after every production deployment to verify the system is operational. Execute each step in order and record the result.

**Who runs this:** The operations engineer performing the deployment.
**When:** Immediately after deploying to production (or staging for pre-flight verification).

---

## 2. Pre-Test Setup

- [ ] Open the production URL: `https://queue.example.com/login`
- [ ] Open the admin dashboard in Chrome Desktop.
- [ ] Open the kiosk in a separate browser tab.
- [ ] Open the display board in a separate browser tab.
- [ ] Open the officer dashboard for a test officer.

---

## 3. Health Check

- [ ] `curl -I https://queue.example.com/api/health` returns HTTP 200.
- [ ] Response body includes `{"success": true, "data": {"status": "ok", "database": "connected"}}`.

---

## 4. Login Flow

- [ ] The login page at `/login` loads correctly (card layout, email/password fields).
- [ ] The super-admin can log in with the seeded credentials.
- [ ] After login, the admin dashboard loads (redirect from `/login` to `/` or `/dashboard`).
- [ ] The sidebar is visible with navigation links.

---

## 5. Reports Dashboard

- [ ] Navigate to `/reports` — the page loads.
- [ ] The KPI cards show data (or zeros for a fresh deployment).
- [ ] The bar chart renders (even if empty).

---

## 6. Audit Log Viewer

- [ ] Navigate to `/audit-log` — the page loads.
- [ ] The table shows recent entries (or an empty state).
- [ ] The action/entity/date range filter controls are visible.

---

## 7. Security Headers

Run: `curl -I https://queue.example.com/login`

- [ ] `X-Frame-Options: SAMEORIGIN` is present.
- [ ] `X-Content-Type-Options: nosniff` is present.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` is present.
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()` is present.

---

## 8. Rate Limiting

- [ ] Send 11 POST requests to `/api/auth/callback/credentials` in 60 seconds from the same IP.
- [ ] The 11th request returns HTTP 429 with `error.code = "RATE_LIMITED"`.
- [ ] The response includes the `Retry-After` header.

---

## 9. CORS

- [ ] Send a request with `Origin` header set to an allowed `ALLOWED_MOBILE_ORIGINS` value.
- [ ] The response includes `Access-Control-Allow-Origin` matching the origin.
- [ ] Send a request with `Origin` set to an unauthorized origin.
- [ ] The response does NOT include `Access-Control-Allow-Origin`.

---

## 10. Kiosk

- [ ] Navigate to `/kiosk` — the page loads with the service selection grid.
- [ ] Each service card shows the service name and estimated wait time.
- [ ] The UI is touch-optimized (large tap targets).

---

## 11. Display Board

- [ ] Navigate to `/display` — the page loads with the dark theme (`bg-zinc-950`).
- [ ] The audio unlock overlay appears on first load.
- [ ] No errors in the browser console.

---

## 12. Ticket Issuance

- [ ] On the kiosk, click a service to issue a ticket.
- [ ] The confirmation screen shows: ticket number, service name, estimated wait time.
- [ ] The ticket number format is correct (e.g., "A001" for a service with prefix "A").
- [ ] The kiosk auto-resets to service selection after the configured timeout.

---

## 13. Officer Dashboard

- [ ] Log in as a counter officer (or use the test officer).
- [ ] Navigate to the officer dashboard (e.g., `/counter/1` or the officer's assigned counter).
- [ ] The queue depth and current serving ticket are displayed.

---

## 14. Counter Actions

- [ ] Click "Call Next" — a waiting ticket is called.
- [ ] The display board updates to show the called ticket.
- [ ] Click "Recall" — the ticket is recalled.
- [ ] Click "No-Show" — the ticket is marked as no-show.
- [ ] Click "Close Counter" (with a reason) — the counter status changes.
- [ ] Click "Reopen Counter" — the counter reopens.

---

## 15. Security Screen

- [ ] Log in as a security officer.
- [ ] Navigate to `/security` — the page loads.
- [ ] The broadcast message feed is visible (may be empty).

---

## 16. SSE Connection

- [ ] Open browser dev tools → Network tab on the display board page.
- [ ] Verify there is an active SSE connection to `/api/sse/global` (eventsource content type).
- [ ] Issue a ticket from the kiosk.
- [ ] The display board updates in real-time without a page refresh.

---

## 17. Audit Log Writes

- [ ] Navigate to `/audit-log`.
- [ ] Verify the recent actions (login, ticket issuance, call, recall) are recorded.
- [ ] The entries include: user name, action, entity, timestamp.

---

## 18. Post-Test Cleanup

- [ ] Close all browser tabs used for testing.
- [ ] Record the test results in the deployment log.
- [ ] If any test failed, file an incident and do NOT proceed with the deployment.

---

## Result

| Date | Deploy Version | Tester | Pass/Fail | Notes |
| ---- | -------------- | ------ | --------- | ----- |
|      |                |        |           |       |

---

_End of Smoke Test Checklist — Version 1.0.0_
