# FCM Delivery Verification Procedure

**Version:** 1.0.0
**Status:** QA Documentation
**Parent Document:** Sub-Phase 5.3.3

---

## 1. Overview

This document describes the procedure for verifying Firebase Cloud Messaging (FCM) push notification delivery on a real Android device. FCM delivery cannot be reliably tested in an emulator or simulator — a real device is required.

**Prerequisites:**

- A real Android device with Google Play Services installed and updated.
- The device connected to the internet (Wi-Fi or mobile data).
- The FCM-enabled test app installed (or the future Android app when built).
- The device registered as a device token for a counter officer (via `POST /api/notifications/devices/register`).
- The Firebase project configured with the correct `FCM_SERVICE_ACCOUNT_JSON` and `FCM_PROJECT_ID`.

---

## 2. Device Registration

Before running the tests, register the Android device as a device token:

```http
POST /api/notifications/devices/register
Authorization: Bearer <officer-access-token>
Content-Type: application/json

{
  "token": "<FCM-device-token>",
  "platform": "ANDROID"
}
```

Expected response: `201 Created` with the device token record.

Verify the registration:

```sql
SELECT * FROM "DeviceToken" WHERE "userId" = '<officer-id>' AND "isActive" = true;
```

---

## 3. Test Procedure

### Test 1: Ticket Issued Notification

1. Verify the counter officer is assigned to a counter that handles a service.
2. Verify the officer's device token is registered and `isActive = true`.
3. Issue a ticket for the service from the kiosk:
   ```
   POST /api/tickets/issue
   { "serviceId": "<service-id>" }
   ```
4. Observe the Android device.

**Verification:**

- [ ] The push notification arrives on the device within 5 seconds.
- [ ] The notification title is "New Ticket".
- [ ] The notification body includes the ticket number and service name.
- [ ] The notification data payload includes: `type: "TICKET_ISSUED"`, `notificationId`, `ticketId`, `ticketNumber`, `serviceId`, `serviceName`, `counterId`, `counterName`, `replyUrl`.
- [ ] Tapping the notification opens the officer dashboard (or the app's ticket detail screen).

### Test 2: Ticket Recalled Notification

1. Call a ticket from the officer dashboard.
2. Recall the ticket:
   ```
   POST /api/tickets/[ticketId]/recall
   ```
3. Observe the Android device.

**Verification:**

- [ ] The push notification arrives within 5 seconds.
- [ ] The notification title is "Ticket Recalled".
- [ ] The notification body includes the ticket number.

### Test 3: Invalid Token Cleanup

1. Manually deactivate the device token in the database:
   ```sql
   UPDATE "DeviceToken" SET "isActive" = false WHERE "token" = '<device-token>';
   ```
2. Issue a ticket.
   - **Expected:** NO push notification is sent (the deactivated token is skipped).

3. Re-activate the token:
   ```sql
   UPDATE "DeviceToken" SET "isActive" = true WHERE "token" = '<device-token>';
   ```
4. Issue another ticket.
   - **Expected:** The push notification IS sent to the re-activated token.

### Test 4: Multiple Devices

1. Register a second device token for the same officer (e.g., a tablet + phone).
2. Issue a ticket.
   - **Expected:** The push notification is sent to BOTH registered devices.

---

## 4. Verification Checklist

- [ ] Push notification arrives within 5 seconds of the trigger event.
- [ ] Notification title is correct ("New Ticket", "Ticket Recalled").
- [ ] Notification body contains the correct information.
- [ ] Data payload is complete (`type`, `notificationId`, `ticketId`, `ticketNumber`, `serviceId`, `serviceName`, `counterId`, `counterName`, `replyUrl`).
- [ ] Tapping the notification navigates to the correct screen.
- [ ] Invalid tokens are skipped (no notification sent).
- [ ] Multiple devices receive the notification simultaneously.

---

## 5. Troubleshooting

| Issue                                       | Solution                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Notification not arriving                   | Check: device token is registered, officer has `notificationsEnabled = true`, service is assigned to a counter the officer handles, FCM service account is configured, FCM project ID is correct |
| Notification arrives but data is wrong      | Check the dispatch logic in `src/lib/notification-service.ts`, the `buildNotificationPayload` function, the `Notification` table record                                                          |
| Notification arrives but deep link is wrong | Check the FCM payload's `replyUrl` field, the Android app's intent filter                                                                                                                        |
| FCM returns `INVALID_TOKEN`                 | The device token has been revoked. Re-register the device. The cleanup listener should automatically deactivate the token                                                                        |

---

_End of FCM Delivery Verification — Version 1.0.0_
