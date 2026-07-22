# QMS Update - Dynamic/Static QR Codes, Live Chat, and Chat Retention Settings

This document outlines the revised specifications for integrating dynamic QR codes, mobile self-service ticketing, real-time customer-staff chat, and an admin-configurable chat retention system into the Queue Management System.

---

## 1. Database & Schema Requirements

### A. Chat Message Model

Create a `ChatMessage` model to support text-only communication:

- **Fields:**
  - `id` (Primary Key)
  - `ticketId` (Foreign Key referencing the `Ticket` model)
  - `senderType` (String: 'CUSTOMER' or 'STAFF')
  - `message` (String - text only, limit to 500 characters)
  - `createdAt` (DateTime, default to now)

### B. Admin Settings Update

Add a new setting to the database (configured via Admin Panel & seed file):

- `chat.retention_days` (INTEGER, Default: 7): The number of days chat history is kept before being permanently deleted from the database.

---

## 2. Feature 1: Dynamic QR Code & Mobile Ticket Display

### A. Dynamic QR Code on Ticket

- When a ticket is issued (via physical Kiosk or Mobile Kiosk), generate a unique QR code.
- The QR code must contain a link pointing to the mobile-responsive Ticket Display page: `/ticket/[ticketId]`.
- Ensure this QR is rendered in the ticket receipt payload/print screen.

### B. Mobile Ticket Display Page (`/ticket/[ticketId]`)

- A mobile-friendly page showing:
  - Ticket Number and Customer Name.
  - Current status (Waiting, Called, Served).
  - Real-time estimated waiting time/queue position.
- **Live Chat Widget:**
  - A messaging interface docked at the bottom of the page.
  - Only text messages are allowed (no image/file uploads needed).
  - **Chat State Logic:**
    - If the ticket status is `WAITING` or `CALLED`, the chat is fully interactive.
    - Once the ticket status changes to `SERVED`, the input field must be disabled and show "Ticket Served - Chat Ended".
    - Unlike active tickets, the user can still read the previous messages but cannot send new ones.

---

## 3. Feature 2: Counter Manager Chat Interface & Retention

### A. Counter Manager Chat Panel

- **Navbar Update:** Add a "Chats" menu link in the Counter Manager's navigation bar.
- **Active Chats List:**
  - Display a list of chats grouped by **Ticket Number** and **Customer Name**.
  - Clicking on a chat loads the message history.
  - The manager can reply to messages in real-time.
  - Once a ticket is marked as "Served", the chat remains in the database (read-only) but is moved from the "Active Chats" view to an "Archived/Past Chats" tab or hidden from the main active list.

### B. Automated Chat Cleanup (Retention Policy)

- **Background Task / Cron Job:**
  - Implement a scheduled clean-up routine (e.g., using a background task, serverless cron, or a scheduled database query).
  - This routine must fetch the `chat.retention_days` configuration from the settings database.
  - It must permanently delete all `ChatMessage` records where the `createdAt` date is older than the configured number of days (e.g., `current_date - chat.retention_days`).

---

## 4. Feature 3: Static QR Code & Mobile Kiosk Ticketing

### A. Admin Static QR Code Generator

- In the Admin Settings, provide a utility to generate a static QR code pointing to a public route: `/mobile-kiosk`.
- This static QR can be printed and posted on walls/counters for self-service.

### B. Mobile Kiosk Route (`/mobile-kiosk`)

- When scanned, this route must load a mobile-friendly ticket issuance form.
- The form must collect the same fields as the physical kiosk (Name/ID and Contact Number).
- Upon submitting the form, a new ticket is created, and the customer is immediately redirected to `/ticket/[ticketId]`.

### C. Session Recovery (Re-scan Scenario)

- If a customer accidentally closes their browser tab or needs to re-access their active ticket:
  - On the main `/mobile-kiosk` landing page, display a prominent button/link: **"Already have an active ticket? Recover Session"**.
  - Clicking this must prompt the user to input their **Contact Number**.
  - The system must check the database for any active (`WAITING` or `CALLED`) ticket associated with that Contact Number.
  - If an active ticket is found, redirect the customer back to their `/ticket/[ticketId]` page.
  - If no active ticket is found, display a friendly message: "No active ticket found for this number. Please generate a new ticket."
