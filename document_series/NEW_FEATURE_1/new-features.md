# Queue Management System - New Feature Requirements

This document outlines the new features that need to be integrated into the existing Queue Management System. Please review the requirements below and implement them without disrupting the current flow.

**Note for Developer:** Do not generate code snippets immediately. Read through the requirements to understand the logic and database/UI changes needed.

## 1. Kiosk System Enhancements

- **Customer Information Collection:**
  Before a ticket is issued from the Kiosk, prompt the user with a form to enter their details.
  - Required fields: Name OR ID Number, and Contact Number.
  - The ticket should only be printed/issued after these details are provided.

## 2. Counter Manager Dashboard Enhancements

- **Waiting Time Display:**
  - Display the real-time waiting duration on each issued token (e.g., "1 min ago", "15 mins ago").
- **Sorting and Filtering:**
  - Implement a filter/sort mechanism to display the first-arrived customers (oldest tickets) at the top of the waiting list.
- **Customer Calling Feature:**
  - The waiting list UI must display the Ticket Number and the Customer's Name.
  - The counter manager must be able to select a specific ticket from this list and initiate a "Call" to the customer.

## 3. Visual & Audio Indicators (Counter Manager)

- **Dynamic Color-coded Waiting Times:**
  The waiting time display should change color based on the duration:
  - Green: Less than 15 minutes.
  - Yellow: Between 15 to 30 minutes.
  - Red: More than 30 minutes.
- **Delayed Reminder Alert:**
  - If a ticket passes the 30-minute mark, the ticket UI should blink and play a short reminder sound alert every 5 minutes.

## 4. Web Browser Notifications (Background Alerts)

- **New Ticket Alert for Counter Users:**
  - Since counter users may be working on other browser tabs, the system must trigger a Web Browser Notification + Sound Alert to the relevant counter whenever a new ticket is issued.
- **User Control:**
  - Add an ON/OFF toggle button on the Counter Manager's dashboard so they can manually enable or disable these incoming ticket notifications and sounds.

## 5. Admin Panel Configurations (Settings)

The system administrators must have control over the above features via an Admin Settings page:

- **Waiting Time Color Configuration:**
  - Ability to customize the time thresholds (currently 15 mins and 30 mins) and choose the respective colors (Green, Yellow, Red).
- **Reminder Alert Configuration:**
  - Ability to configure the initial threshold for the delayed reminder (currently 30 mins).
  - Ability to configure the recurring interval time for the reminder (currently 5 mins).
- **Audio File Management:**
  - **Requirement:** The admin must be able to upload custom sound files directly via the Admin UI for both the "Delayed Reminder Sound" and the "New Ticket Alert Sound".
  - _Instruction:_ Please create a dedicated folder structure in the backend (e.g., `public/uploads/sounds/`) to store these audio files. I will provide the sound files to be manually uploaded to this folder, but the Admin panel should eventually handle the uploads and assignment of these sounds to specific alerts.
