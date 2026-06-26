# Cross-Browser Compatibility Checklist

**Version:** 1.0.0
**Status:** QA Documentation
**Parent Document:** Sub-Phase 5.3.3

---

## 1. Overview

This document defines the cross-browser compatibility requirements and test procedure for the Smart Queue Management System. The system is primarily designed for Chrome (desktop and kiosk mode), with Safari support for the admin dashboard.

---

## 2. Chrome Desktop (Latest)

**Primary target.** Every surface must work correctly.

| Test Area         | Verification                                                       |
| ----------------- | ------------------------------------------------------------------ |
| Admin Dashboard   | Layout renders correctly, sidebar navigation works, forms submit   |
| Officer Dashboard | Real-time SSE updates, action buttons work, counter status toggles |
| Display Board     | Dark theme renders, SSE connected, bell audio plays, TTS speaks    |
| Kiosk             | Touch targets large, ticket issuance works, silent print triggers  |
| Security Screen   | Broadcast messages arrive in real-time, read state updates         |
| Login Page        | Form renders, validation errors display, redirect after login      |
| Reports Dashboard | KPIs render, charts render, filters work, CSV export downloads     |
| Audit Log Viewer  | Table renders, filters work, pagination works                      |

---

## 3. Chrome Android (Latest)

**Target for the future Android app** and mobile admin access.

| Test Area         | Verification                                                    |
| ----------------- | --------------------------------------------------------------- |
| Login Page        | Form fits viewport, touch keyboard works                        |
| Officer Dashboard | Touch interactions work, viewport scaling correct, SSE connects |
| Display Board     | Dark theme renders on mobile, audio unlock works                |
| Admin Dashboard   | Sidebar collapses to hamburger menu (if responsive)             |

---

## 4. Safari macOS (Latest)

**Secondary target** for administrators using macOS.

| Test Area           | Verification                                                         |
| ------------------- | -------------------------------------------------------------------- |
| Admin Dashboard     | Layout renders, sidebar works, forms submit                          |
| Reports Dashboard   | KPIs render, charts render (Recharts), filters work                  |
| Audit Log Viewer    | Table renders, pagination works                                      |
| Login Page          | Form renders, validation works                                       |
| TTS (Display Board) | Minor voice differences acceptable (Safari uses macOS system voices) |

---

## 5. Kiosk Mode (Chrome `--kiosk`)

Launch Chrome with `--kiosk --kiosk-printing --disable-pinch` flags.

| Test Area    | Verification                                                       |
| ------------ | ------------------------------------------------------------------ |
| Fullscreen   | Kiosk fills the entire screen, no browser chrome visible           |
| Touch        | Tap targets are large and responsive                               |
| Auto-reset   | After ticket issuance, auto-resets to service selection            |
| Silent Print | No print dialog appears; ticket prints silently to default printer |

---

## 6. Display Mode (Chrome)

Launch Chrome with `--kiosk` flag for the display board.

| Test Area    | Verification                                                |
| ------------ | ----------------------------------------------------------- |
| Dark Theme   | `bg-zinc-950` renders correctly, high contrast              |
| Audio Unlock | Overlay appears on first load, click to enable              |
| SSE          | Connection established, real-time updates work              |
| Long-Running | Display stays functional for 8+ hours without memory issues |

---

## 7. Known Limitations

| Browser           | Limitation                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------- |
| Firefox           | TTS (`SpeechSynthesis`) may not work on some platforms. NOT a supported browser.                           |
| Safari iOS        | Aggressive `AudioContext` suspension may block audio unlock. NOT the primary target for the display board. |
| Edge Legacy       | Not supported.                                                                                             |
| Internet Explorer | Not supported.                                                                                             |

---

## 8. Browser Test Matrix

| Browser          | Version | Platform      | Admin   | Officer | Display | Kiosk   | Security | Notes              |
| ---------------- | ------- | ------------- | ------- | ------- | ------- | ------- | -------- | ------------------ |
| Chrome           | latest  | Windows/macOS | ✅ Full | ✅ Full | ✅ Full | ✅ Full | ✅ Full  | Primary target     |
| Chrome           | latest  | Android       | ✅ Full | ✅ Full | ✅ Full | —       | —        | Mobile target      |
| Safari           | latest  | macOS         | ✅ Full | —       | ⚠️ TTS  | —       | —        | Admin only         |
| Chrome `--kiosk` | latest  | Linux/Windows | —       | —       | ✅ Full | ✅ Full | —        | Kiosk/display mode |

- ✅ Full = fully supported, all features work
- ⚠️ = works with minor differences
- — = not applicable
- ❌ = not supported

---

_End of Cross-Browser Checklist — Version 1.0.0_
