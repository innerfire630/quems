# End-to-End Integration Test Scenarios

**Version:** 1.0.0
**Status:** QA Documentation
**Parent Document:** Sub-Phase 5.3.3
**Expected Duration:** 4-8 hours for a full pass

---

## 1. Overview

This document contains the manual end-to-end integration test scenarios for every user role in the Smart Queue Management System. Execute these scenarios against a staging environment that mirrors production (PostgreSQL, all env vars, deployed build) before every major release.

**Who runs this:** QA engineers, or the operations team as part of the pre-production checklist.
**When:** Before every production deployment and after every major feature change.

**Prerequisites:**

- A staging environment deployed and running
- The seeded super-admin credentials
- A test counter officer user created and assigned to a counter
- A test security officer user created
- A test service and counter configured
- A Chrome browser (for kiosk and display board tests)

---

## 2. Super-Admin Scenario

**Objective:** Verify the super-admin can perform all administrative functions.

### Steps

1. Navigate to `https://staging.example.com/login`.
2. Enter the seeded super-admin credentials (email: `admin@example.com`, password: `Admin@123`).
   - **Expected:** Redirect to the admin dashboard. Sidebar shows all navigation links including "Users", "Services", "Counters", "Reports", "Audit Log", "Settings".

3. Click "Services" in the sidebar → "Add Service".
4. Enter: name = "General Inquiry", code = "GEN", prefix = "A", description = "General inquiries and assistance". Save.
   - **Expected:** Success toast. Service appears in the services list.

5. Click "Counters" in the sidebar → "Add Counter".
6. Enter: name = "Counter 1", number = 1. Assign the "General Inquiry" service. Save.
   - **Expected:** Success toast. Counter appears in the counters list with the assigned service.

7. Click "Users" in the sidebar → "Add User".
8. Enter: name = "Test Admin", email = "testadmin@example.com", password = "Test@123", role = "ADMIN". Save.
   - **Expected:** Success toast. User appears in the users list.

9. Log out (click the user menu → "Sign Out").

10. Log in as the new "Test Admin" user.
    - **Expected:** Dashboard loads. Sidebar shows "Reports" and "Audit Log" but NOT "Users" or "Settings" (admin lacks `system:configure` and `user:manage` permissions).

11. Navigate to `/reports`.
    - **Expected:** Reports dashboard loads with KPIs and charts.

12. Navigate to `/audit-log`.
    - **Expected:** Audit log viewer loads.

13. Log out.

**Pass Criteria:** The super-admin can create services, counters, and users. The admin role has the correct restricted permissions. The reports and audit log viewer are accessible.

---

## 3. Admin Scenario

**Objective:** Verify the admin can view reports and audit logs, and export CSV.

### Steps

1. Log in as "Test Admin" (from the super-admin scenario).
2. Navigate to `/reports`.
3. Change the date range to include today.
   - **Expected:** The KPI cards update. The bar chart renders.

4. Select a service filter (e.g., "General Inquiry").
   - **Expected:** The KPI cards and chart filter to only the selected service.

5. Click "Export CSV".
   - **Expected:** A CSV file downloads. Open it — columns include: Date, Service Code, Service Name, Total Issued, Total Served, Total No Show, etc.

6. Navigate to `/audit-log`.
7. Filter by action = "SERVICE_CREATED".
   - **Expected:** The table shows the service creation event from the super-admin scenario.

8. Change the date range to a period with no data.
   - **Expected:** Empty state message: "No data for the selected period".

**Pass Criteria:** Reports load with data, filters work, CSV exports correctly, audit log shows historical entries.

---

## 4. Counter Officer Scenario

**Objective:** Verify the counter officer can call, recall, no-show tickets, close/reopen the counter, and toggle notifications.

### Steps

1. Log in as a counter officer assigned to Counter 1.
2. Navigate to the officer dashboard (e.g., `/officer` or the counter-specific route).
   - **Expected:** The dashboard shows the counter name, queue depth, and the current serving ticket (or "No ticket being served").

3. Ensure there is at least one waiting ticket. If not, issue a ticket from the kiosk first.

4. Click "Call Next" (or equivalent button).
   - **Expected:** The "now serving" updates to show the called ticket. A success message appears. The display board (in another tab) updates in real-time.

5. Click "Recall" on the current serving ticket.
   - **Expected:** The ticket is recalled. The display board updates. The bell/TTS plays on the display if audio is enabled.

6. Issue another ticket from the kiosk. Call it. Then click "No-Show" (after the grace period, if configured).
   - **Expected:** The ticket is marked as no-show. The display board updates. The next waiting ticket advances automatically.

7. Click "Close Counter" → enter a reason: "Lunch break". Confirm.
   - **Expected:** The counter status changes to closed. The display board shows the counter as "Temporarily Closed" (reduced opacity or label).

8. Verify that calling a ticket is now rejected:
   - **Expected:** Attempting to call a ticket returns 403 Forbidden.

9. Click "Reopen Counter".
   - **Expected:** The counter status returns to open. Normal operations resume.

10. Toggle notifications off (the notification bell icon or switch).
11. Issue a ticket from the kiosk for the service the officer handles.
    - **Expected:** No push notification is sent (verify via the Android device test or the server logs).

12. Toggle notifications back on.
13. Issue another ticket.
    - **Expected:** Push notification IS sent (if FCM is configured; otherwise skip).

**Pass Criteria:** All counter operations work as expected. The display board updates in real-time. Counter closure blocks operations. Notifications respect the toggle.

---

## 5. Security Officer Scenario

**Objective:** Verify the security officer can view broadcast messages in real-time.

### Steps

1. Log in as a security officer.
2. Navigate to `/security`.
   - **Expected:** The security screen loads. The broadcast message feed is visible.

3. In another browser tab, log in as a counter officer, call a ticket, and send a reply message via the reply interface (or simulate via API if no mobile app).
   - **Expected:** Within 2 seconds, the broadcast message appears on the security screen with the message text, sender name, and timestamp.

4. Click on the broadcast message to mark it as read (if supported by the UI).
   - **Expected:** The message's read state updates. The visual indicator changes.

**Pass Criteria:** Broadcast messages from counter officer replies arrive on the security screen within 2 seconds.

---

## 6. Kiosk Scenario

**Objective:** Verify the kiosk self-service flow works correctly.

### Steps

1. Open a new browser tab. Navigate to `https://staging.example.com/kiosk`.
   - **Expected:** The kiosk loads with the service selection grid. Each service card shows: service name, estimated wait time.

2. Click on the "General Inquiry" service card.
   - **Expected:** A confirmation screen appears showing the service name and estimated wait time.

3. Confirm the ticket issuance.
   - **Expected:** The ticket issued success screen appears. Shows: ticket number (e.g., "A001"), service name, issue datetime, estimated wait time. The ticket silently prints to the configured printer (if a printer is set up).

4. Wait for the auto-reset timeout (default ~30 seconds).
   - **Expected:** The kiosk returns to the service selection screen.

5. Issue 5 more tickets in rapid succession.
   - **Expected:** Each ticket has an incrementing number (A002, A003, A004, A005, A006). No tickets share the same number.

**Pass Criteria:** Tickets issue correctly, numbers increment, auto-reset works, silent print triggers.

---

## 7. Display Board Scenario

**Objective:** Verify the public display board renders correctly and responds to real-time events.

### Steps

1. Open a new browser tab. Navigate to `https://staging.example.com/display`.
   - **Expected:** The display board loads with the dark theme (`bg-zinc-950`). The audio unlock overlay appears.

2. Click "Enable Audio" on the overlay (requires user gesture for browser AudioContext).
   - **Expected:** The overlay dismisses. The "now serving" area shows the current state.

3. Issue a ticket from the kiosk. Call the ticket from the officer dashboard.
   - **Expected:** The "now serving" slot updates. The recent calls history updates. The bell audio plays. The TTS announcement plays: "Now serving ticket A001 at Counter 1".

4. Recall the ticket from the officer dashboard.
   - **Expected:** The recall replays the audio announcement.

5. Close a counter from the officer dashboard.
   - **Expected:** The display board shows the counter as "Temporarily Closed" with reduced opacity.

**Pass Criteria:** Dark theme renders correctly. Real-time updates work via SSE. Audio plays (bell + TTS). Counter closures are reflected.

---

## 8. Daily Reset Scenario

**Objective:** Verify the daily queue reset creates correct `QueueDailySnapshot` records.

### Steps

1. Issue several tickets throughout the day for multiple services.
2. Call and complete some tickets.
3. Log in as super-admin.
4. Trigger a manual reset via the admin endpoint:

   ```
   POST /api/queue/reset?confirm=RESET_TODAY
   ```
   - **Expected:** The reset succeeds. All `Service.currentTicketNumber` values reset to 0.

5. Check the database:

   ```sql
   SELECT * FROM "QueueDailySnapshot" WHERE "businessDate" = CURRENT_DATE - INTERVAL '1 day';
   ```
   - **Expected:** A snapshot record exists for yesterday with `totalIssued`, `totalServed`, `totalNoShow`, `totalCancelled`, etc.

6. Verify the metrics are correct:
   - `totalIssued` matches the number of tickets issued yesterday.
   - `totalServed` matches the number of tickets completed yesterday.
   - `totalNoShow` matches the number of no-show tickets yesterday.

**Pass Criteria:** The reset triggers correctly. The snapshot is created with accurate metrics. Ticket counters reset to 0.

---

## 9. Multi-Counter Scenario

**Objective:** Verify 3+ counters operate independently and the display board shows all of them.

### Steps

1. Create 3 counters (Counter 1, Counter 2, Counter 3) and assign them to different services.
2. Assign 3 different counter officers to each counter.
3. Open the display board.
4. Issue tickets for all 3 services from the kiosk.
5. Call a ticket on Counter 1 → verify the display board shows it in Counter 1's slot.
6. Call a ticket on Counter 2 → verify the display board shows it in Counter 2's slot.
7. Call a ticket on Counter 3 → verify the display board shows it in Counter 3's slot.
   - **Expected:** The display grid shows all 3 counters independently. Each has its own "now serving" and recent calls.

**Pass Criteria:** Multi-counter grid renders correctly. Events don't interfere between counters.

---

## 10. Counter Closure Scenario

**Objective:** Verify counter closure is visible on the display board and blocks operations.

### Steps

1. Open Counter 1.
2. Issue a ticket for its assigned service. Call the ticket (to verify normal operation).
3. Close Counter 1 with reason "Lunch break".
   - **Expected:** Display board shows Counter 1 as "Temporarily Closed" (reduced opacity or label).

4. Attempt to call another ticket on Counter 1:

   ```
   POST /api/tickets/call-next
   ```
   - **Expected:** Returns 403 Forbidden with `error.code = "COUNTER_CLOSED"`.

5. Attempt to recall the last ticket:

   ```
   POST /api/tickets/[ticketId]/recall
   ```
   - **Expected:** Returns 403 Forbidden.

6. Attempt to no-show the last ticket:

   ```
   POST /api/tickets/[ticketId]/no-show
   ```
   - **Expected:** Returns 403 Forbidden.

7. Reopen Counter 1.
   - **Expected:** Display board shows Counter 1 as open. Normal operations resume.

**Pass Criteria:** Closure is visible, endpoints reject, reopening restores functionality.

---

## 11. Notification Toggle Scenario

**Objective:** Verify the notification toggle controls FCM push delivery.

### Steps

1. Log in as a counter officer.
2. Ensure notifications are enabled (the toggle is ON).
3. Issue a ticket for a service the officer handles.
   - **Expected:** Push notification arrives on the registered Android device.

4. Toggle notifications OFF.
5. Issue another ticket for the same service.
   - **Expected:** NO push notification is sent.

6. Toggle notifications back ON.
7. Issue a third ticket.
   - **Expected:** Push notification arrives again.

**Pass Criteria:** Toggle is respected. Push notifications are sent only when enabled.

---

## 12. Cross-Feature Scenario

**Objective:** Verify the complete end-to-end flow across all surfaces.

### Steps

1. Open the kiosk → issue a ticket.
2. Open the display board → observe the queue depth update in real-time.
3. Open the officer dashboard → call the ticket.
4. Observe the display board → "now serving" updates, bell plays, TTS announces.
5. Simulate an officer reply (via API or the officer's mobile) → observe the broadcast on the display board and the security screen.
6. On the officer dashboard → mark the ticket as completed.
7. Open the reports dashboard → verify the daily KPIs reflect the issued, called, and completed ticket.
8. Open the audit log → verify every action is recorded:
   - TICKET_ISSUED
   - TICKET_CALLED
   - BROADCAST_MESSAGE_SENT
   - TICKET_COMPLETED

**Pass Criteria:** The entire flow works end-to-end. Every surface is consistent. Every action is audited.

---

_End of Integration Test Scenarios — Version 1.0.0_
