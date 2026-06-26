# Printer Compatibility Test

**Version:** 1.0.0
**Status:** QA Documentation
**Parent Document:** Sub-Phase 5.3.3

---

## 1. Overview

This document describes the printer compatibility test for the silent ticket printing feature. Silent printing depends on three components working together: Chrome's `--kiosk-printing` flag, the OS printer configuration, and the thermal printer's ESC/POS compatibility.

**Prerequisites:**

- Chrome (latest version) launched with `--kiosk --kiosk-printing --disable-pinch` flags.
- The target thermal printer configured as the default printer on the OS.
- The paper width configured (80mm or 58mm) in the printer's OS settings.

---

## 2. Setup

1. Install Chrome (latest version) on the kiosk machine.
2. Connect the thermal printer via USB or network.
3. Configure the printer as the default printer in the OS settings.
4. Set the paper width:
   - For 80mm: Set "Paper Size" to "80 x 297 mm" or "Roll Paper 80 x 297 mm".
   - For 58mm: Set "Paper Size" to "58 x 297 mm" or "Roll Paper 58 x 297 mm".
5. Launch Chrome with the required flags:
   ```
   google-chrome --kiosk --kiosk-printing --disable-pinch https://staging.example.com/kiosk
   ```
   - `--kiosk` — fullscreen mode.
   - `--kiosk-printing` — enables silent printing (no print dialog).
   - `--disable-pinch` — prevents zoom gestures on touch screens.

---

## 3. Test Cases

### Test 1: 80mm Paper — Basic Ticket

1. Launch Chrome with the printer set to 80mm paper.
2. Navigate to the kiosk. Issue a ticket for a service with a short name (e.g., "General Inquiry").
3. Observe the printed ticket.

**Verification:**

- [ ] The ticket prints silently (no dialog appears).
- [ ] Content: ticket number (e.g., "A001"), service name, estimated wait time, issue datetime.
- [ ] The ticket fits within the 80mm width with approximately 4mm margins on each side.
- [ ] Text is clear and legible.

### Test 2: 80mm Paper — Long Service Name

1. Issue a ticket for a service with a 50-character name (e.g., "Department of Motor Vehicles — License Renewal and Testing").
2. Observe the printed ticket.

**Verification:**

- [ ] The text wraps correctly within the 80mm width.
- [ ] No text is cut off or overflowing.

### Test 3: 80mm Paper — Large Queue Depth

1. Artificially inflate the queue depth to 99+.
2. Issue a ticket. The estimated wait time should be large.
3. Observe the printed ticket.

**Verification:**

- [ ] The wait time estimate is displayed correctly on the ticket.
- [ ] The ticket fits within the 80mm width.

### Test 4: 58mm Paper — Basic Ticket

1. Change the printer to 58mm paper width in the OS settings.
2. Issue a ticket for a short service name.
3. Observe the printed ticket.

**Verification:**

- [ ] The ticket prints correctly with the narrower paper.
- [ ] Content fits within the 58mm width.

### Test 5: 58mm Paper — Truncation

1. Issue a ticket with a long service name on 58mm paper.
2. Observe the printed ticket.

**Verification:**

- [ ] The text wraps or truncates correctly.
- [ ] No content overflows the 58mm width.

### Test 6: No Printer Configured

1. Launch Chrome without a configured default printer.
2. Issue a ticket from the kiosk.

**Verification:**

- [ ] The kiosk shows a "Printer not available" message (graceful degradation).
- [ ] The ticket issuance still succeeds (the ticket is created in the database).
- [ ] No error crashes the kiosk UI.

---

## 4. Supported Printer Specifications

| Specification      | Requirement                                        |
| ------------------ | -------------------------------------------------- |
| Type               | ESC/POS compatible thermal printer                 |
| Resolution         | 203 DPI minimum (8 dots/mm)                        |
| Paper Width        | 80mm (most common) or 58mm (smaller)               |
| Connection         | USB (most common) or network (via OS print server) |
| Character Encoding | UTF-8 or printer default (CP437/CP850)             |

**Tested models** (examples — not exhaustive):

- Epson TM-T88 series (80mm)
- Epson TM-T20 series (80mm)
- Xprinter XP-58 series (58mm)
- Any ESC/POS compatible thermal printer should work

---

## 5. Troubleshooting

| Issue                | Solution                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Print dialog appears | Add `--kiosk-printing` flag to the Chrome launch command                                            |
| Nothing prints       | Check the printer is set as the default in OS settings. Check USB/network connection                |
| Text is cut off      | Check paper width setting in the OS printer properties. Adjust the print CSS if needed              |
| Print is slow        | Thermal printers can be slow — this is normal. The silent print triggers after the ticket is issued |
| Garbled characters   | Check the printer's character encoding. Set to UTF-8 in the printer settings                        |

---

_End of Printer Compatibility Test — Version 1.0.0_
