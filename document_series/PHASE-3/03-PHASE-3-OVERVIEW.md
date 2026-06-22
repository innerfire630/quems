# Smart Queue Management System

## Phase 3 Overview — Real-Time Display & Audio System

**Version:** 1.0.0
**Status:** Authoritative Reference for Phase 3
**Parent Document:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Series Position:** Phase 3 of 5
**Document Count:** 1 overview + 9 sub-phase task plan documents

---

## Table of Contents

1. [Phase 3 Strategic Context](#1-phase-3-strategic-context)
2. [Phase 3 Goals & Non-Goals](#2-phase-3-goals--non-goals)
3. [Phase 3 Deliverables Summary](#3-phase-3-deliverables-summary)
4. [Sub-Phase 3.1 — Real-Time Infrastructure](#4-sub-phase-31--real-time-infrastructure)
5. [Sub-Phase 3.2 — Main Display Board](#5-sub-phase-32--main-display-board)
6. [Sub-Phase 3.3 — Audio Announcement System](#6-sub-phase-33--audio-announcement-system)
7. [Sub-Phase Dependency Map](#7-sub-phase-dependency-map)
8. [Cross-Cutting Standards for Phase 3](#8-cross-cutting-standards-for-phase-3)
9. [Phase 3 Exit Criteria & Phase 4 Hand-off](#9-phase-3-exit-criteria--phase-4-hand-off)
10. [Phase 3 Document Map (Quick Reference)](#10-phase-3-document-map-quick-reference)

---

## 1. Phase 3 Strategic Context

Phase 3 is the **public-facing real-time layer** of the Smart Queue Management System. It transforms the system from "a queue that records tickets" into "a queue that customers in a waiting area can see and hear being served". It is the moment when the queue becomes a **live experience**.

The strategic goal is to **build the real-time display and audio system**: an SSE-based event delivery infrastructure, a public display board that renders the live queue state, and an audio announcement system that calls tickets out loud. When Phase 3 is complete, a customer sitting in the waiting area sees their ticket number appear on the display board and hears their ticket called by name — even though no push notification, no officer dashboard, and no reports yet exist.

Phase 3 is also the moment when **the Phase 2 → Phase 3 seam becomes real**. The `broadcastEvent()` function introduced as a no-op stub in Phase 2.1.1 receives its real implementation in Phase 3.1.3. The event payload types locked in Phase 2 are now actually delivered to subscribed clients.

### 1.1 Why This Phase Comes After Phase 2

Phase 3 has zero ability to display anything meaningful without Phase 2. The display board shows ticket calls — and ticket calls only exist because Phase 2.3 emits them. Phase 3 is fundamentally a **consumer** of Phase 2's event stream. Building it before Phase 2 would mean building infrastructure that has nothing to deliver.

### 1.2 Why This Phase Comes Before Phase 4

Phase 4 (mobile notifications and counter management) needs Phase 3 in two ways:

- The officer dashboard (4.2.3) is a real-time consumer. It subscribes to a counter-specific SSE channel to see live ticket queue depth and status changes. Without the SSE infrastructure from 3.1, the officer dashboard has no live updates.
- The notification reply / broadcast system (4.3) sends messages to the display board. The display board is the receiver — it has to exist and be subscribed to the right SSE channel before broadcasts can be routed to it.

### 1.3 Reference to the Master Plan

This overview document **does not redefine** the system-wide specifications. Every architectural, schema, API, and design detail is the responsibility of the [Master Plan](./00-MASTER-PLAN.md). Phase 3 task plan documents will reference the master plan sections they implement (for example, document 3.1.1 will implement Master Plan Section 4.4's SSE Event Bus Architecture and Section 11's overall Real-Time Communication Architecture).

---

## 2. Phase 3 Goals & Non-Goals

### 2.1 Phase 3 Goals (Must Be Achieved)

1. A working Server-Sent Events (SSE) infrastructure: a singleton event manager, a `/api/sse/[channel]` route handler, the heartbeat ping, the event envelope format, and the client-side `useSSE()` hook with automatic reconnection.
2. A working `broadcastEvent()` server utility that delivers events to all subscribed clients on the right channel, replacing the no-op stub from Phase 2.1.1.
3. A working main display board at `/display` (and `/display?boardId=xxx` for specific configurations): full-screen, dark-themed, showing all active counters and the ticket numbers they are currently calling.
4. A working audio announcement system: a bell chime followed by a TTS announcement, played in strict sequence for every ticket call, with proper browser audio context unlock.
5. A working announcement queue that handles multiple simultaneous ticket calls arriving close together, processing them in FIFO order with no overlap.
6. A working display board configuration system: administrators can create, edit, and activate multiple display board configurations, each with its own announcement template, TTS settings, and visual theme.
7. Proper handling of the audio context unlock requirement: the display board must prompt the operator to click once to enable audio before live events are shown.

### 2.2 Phase 3 Non-Goals (Explicitly Out of Scope)

The following are **deferred** to later phases and must not be implemented during Phase 3:

- The push notification / FCM system (Phase 4.1). Phase 3.1.3's `broadcastEvent()` function may be reused by Phase 4.1 for FCM dispatch, but FCM itself is not implemented here.
- The counter temporary closure toggle from the officer side (Phase 4.2.1). The display board in Phase 3 does show a counter as "temporarily closed" when the relevant data is in the database, but the toggle UI and the `PATCH /api/counters/[counterId]/status` endpoint are Phase 4.
- The officer notification toggle (Phase 4.2.2).
- The full officer dashboard layout (Phase 4.2.3) — Phase 3.1.2 builds the `useSSE()` hook and the event subscription mechanism, but the dashboard composition is Phase 4.
- The officer reply / broadcast message system (Phase 4.3). Phase 3.2 (display board) can render a broadcast message overlay (the layout slot is reserved), but the message creation and routing are Phase 4.
- The security officer screen (Phase 4.3.3) — but the `security` SSE channel itself is set up in Phase 3.1.1.
- The reports / analytics / charts (Phase 5).
- Rate limiting and security hardening (Phase 5).
- PostgreSQL migration (Phase 5).
- Multi-server SSE with Redis Pub/Sub (future). Phase 3 uses an in-process singleton, suitable for single-server deployment only.

### 2.3 What "Done" Means for Phase 3

Phase 3 is complete when:

1. A super-admin can create a `DisplayBoard` configuration via the admin UI.
2. Opening `/display?boardId=xxx` in a browser shows a full-screen dark-themed display board.
3. On first load, the operator sees the audio context unlock overlay and clicks to enable audio.
4. After unlocking, a ticket call action (via the temporary officer ticket action panel from Phase 2.3.2) immediately updates the display board to show the new ticket, and plays the bell + TTS announcement in sequence.
5. Multiple ticket calls arriving within a few seconds of each other are queued and played one after another with no overlap or interruption.
6. Disconnecting the display board's network and reconnecting it triggers automatic reconnection with exponential backoff, and the display board resumes showing the latest state.
7. The `broadcastEvent()` function actually delivers events to subscribed clients — the Phase 2 no-op stub is replaced with a real implementation.

---

## 3. Phase 3 Deliverables Summary

Phase 3 is decomposed into **3 sub-phases**, each containing **3 task plan documents**, for a total of **9 implementation documents**.

| Sub-Phase | Theme                     | Documents           | Primary Outputs                                          |
| --------- | ------------------------- | ------------------- | -------------------------------------------------------- |
| 3.1       | Real-Time Infrastructure  | 3.1.1, 3.1.2, 3.1.3 | SSE manager, useSSE hook, broadcastEvent implementation  |
| 3.2       | Main Display Board        | 3.2.1, 3.2.2, 3.2.3 | Display UI, multi-counter rendering, board configuration |
| 3.3       | Audio Announcement System | 3.3.1, 3.3.2, 3.3.3 | Bell playback, TTS integration, announcement queue       |

The single most important property of Phase 3 is that **real-time events flow end-to-end**: from the ticket action API in Phase 2, through the `broadcastEvent()` function in 3.1.3, over the SSE channel, into the `useSSE()` hook in 3.1.2, and rendered in the display board (3.2) and played through the audio system (3.3).

---

## 4. Sub-Phase 3.1 — Real-Time Infrastructure

### 4.1 Purpose

Sub-Phase 3.1 builds the **plumbing** that makes everything else in Phase 3 (and Phase 4) possible. The SSE manager is the server-side component that holds open client connections and pushes events to them. The `useSSE()` hook is the client-side component that subscribes to a channel and receives events. The `broadcastEvent()` function is the single call site that any business logic uses to push events.

No business-facing UI is built in this sub-phase. The work is entirely infrastructure: a route handler, a singleton module, a React hook, and a utility function.

### 4.2 Why This Sub-Phase Comes First

Sub-Phases 3.2 and 3.3 cannot exist without 3.1:

- The display board (3.2) is a `useSSE()` consumer. It subscribes to the `global` channel and renders ticket call events.
- The audio system (3.3) is also a `useSSE()` consumer. It receives ticket call events and triggers the announcement sequence.
- The officer dashboard (Phase 4.2.3) and the security officer screen (Phase 4.3.3) will also be `useSSE()` consumers on the `counter:[counterId]` and `security` channels respectively.

Sub-Phase 3.1 produces the infrastructure that all later real-time consumers depend on.

### 4.3 Document Breakdown

#### Document 3.1.1 — Server-Sent Events (SSE) Architecture

**Scope:** The SSE manager singleton, the `/api/sse/[channel]` route handler, the heartbeat, and the event envelope format.

**What this document covers:**

- The **SSE manager singleton** in `lib/sse-manager.ts`: a module-scope variable that holds the connection map, survives hot-reloads in development, and works in a single-server production deployment. The manager is structured as a class or object with the following capabilities:
  - Register a new client connection on a given channel.
  - Remove a client connection on disconnect.
  - Send an event to a single client.
  - Send an event to all clients on a channel.
  - List active clients per channel (for diagnostics).
  - Send a heartbeat ping to all connected clients.
- The data structure: a `Map<string, Set<SSEClient>>` keyed by channel name, where each `SSEClient` holds the underlying `ReadableStream` controller, the client ID, the channel name, and the connection timestamp.
- The `/api/sse/[channel]/route.ts` route handler:
  - Creates a `ReadableStream` that pushes events to the client.
  - Sets the correct SSE response headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`).
  - Registers the client with the SSE manager on connect.
  - Removes the client on disconnect (via the stream's `cancel` callback or `request.signal`).
  - Sends an initial "connected" event so the client knows the stream is live.
- The **heartbeat mechanism:** every 30 seconds, the manager sends a comment-type heartbeat `": heartbeat\n\n"` to all connected clients. This prevents proxy and load balancer timeouts that would otherwise close idle connections.
- The **event envelope format** (from the master plan's Section 11.2) is fully implemented:
  - Each event is a JSON string transmitted as the `data:` field of an SSE message.
  - The JSON shape: `{ type: string, id: string, timestamp: ISO 8601 string, payload: object }`.
  - The `id` field is also sent as the SSE `id:` field for client-side reconnection support.
  - The `type` field is also sent as the SSE `event:` field for client-side event-type filtering.
- The **channel structure:** three channel patterns are supported:
  - `global` — for display boards, kiosks, and any unauthenticated viewer.
  - `counter:[counterId]` — for the officer dashboard of a specific counter. Requires the connecting user to be the assigned officer for that counter.
  - `security` — for the security officer screen. Requires the connecting user to have the security officer role.
  - The route handler enforces channel-level auth based on the channel pattern.
- The **server-side lifecycle** considerations: the manager is process-local (suitable for a single-server deployment). Multi-server SSE (with Redis Pub/Sub) is documented as a future upgrade path but not implemented.

**Outcome:** A client can connect to `/api/sse/global` and receive a stream of events. The manager tracks the connection, sends heartbeats every 30 seconds, and removes the client on disconnect. The event envelope format is the canonical shape that all subsequent event types conform to.

**Master Plan sections implemented:** Sections 4.4 (SSE Event Bus Architecture), 9.3 (SSE endpoint), 11 (entire Real-Time Communication Architecture), 17 (decisions log entry on multi-server SSE).

---

#### Document 3.1.2 — Real-Time State Management on Client

**Scope:** The `useSSE()` custom hook, automatic reconnection with exponential backoff, event parsing, and the event type registry on the client side.

**What this document covers:**

- The `useSSE()` hook in `hooks/useSSE.ts`:
  - Accepts a channel name and an optional event-type filter.
  - Opens an `EventSource` connection to `/api/sse/[channel]`.
  - Parses incoming events into the typed envelope.
  - Invokes a caller-provided callback for each event.
  - Cleans up the connection on unmount.
- The **automatic reconnection** behavior: the `useSSE()` hook listens for the `EventSource.onerror` event and reconnects with exponential backoff (1s, 2s, 4s, 8s, max 30s). The `EventSource` API has built-in reconnection but the hook implements a custom one to control the backoff curve and to track the current attempt count.
- The **event type registry** on the client side, as TypeScript types in `types/sse.types.ts`. The registry is the full set of event types that the system can emit:
  - `TICKET_ISSUED` — a new ticket was issued at the kiosk.
  - `TICKET_CALLED` — an officer called a ticket.
  - `TICKET_RECALLED` — an officer recalled a previously called ticket.
  - `TICKET_NO_SHOW` — a ticket was marked as no-show.
  - `TICKET_COMPLETED` — a ticket was completed (Phase 4.2.3 will emit this).
  - `COUNTER_OPENED` — a counter was opened.
  - `COUNTER_CLOSED` — a counter was temporarily closed.
  - `COUNTER_STATUS_CHANGED` — a counter's status changed (open ↔ temporarily closed).
  - `BROADCAST_MESSAGE` — a broadcast message was sent to the display board or security screen.
  - `DAILY_RESET` — the daily reset ran.
  - `TICKET_QUEUED` — a ticket was added to a counter's queue (for officer dashboard).
  - `QUEUE_UPDATED` — the counter's queue was updated (for officer dashboard).
  - `NOTIFICATION_RECEIVED` — a push notification was dispatched (for officer dashboard).
  - `OFFICER_REPLY` — an officer sent a reply to a broadcast (for security screen).
  - The payload shape for each event type is defined as a TypeScript discriminated union.
- The **subscription model:** the hook is designed to be used by any client component. The display board (3.2), the audio system (3.3), the officer dashboard (4.2.3), and the security screen (4.3.3) all use this hook.
- A small test page or temporary route to verify the hook works: a page that subscribes to the `global` channel and logs every event to the console.

**Outcome:** Any client component can call `useSSE('global', (event) => { ... })` and receive typed events. Disconnecting the network and reconnecting triggers automatic reconnection. The event type registry is the single source of truth for what events exist and what their payloads look like.

**Master Plan sections implemented:** Sections 11.2 (envelope), 11.5 (heartbeat and reconnection), and the client-side half of Section 11.1.

---

#### Document 3.1.3 — Event Broadcasting System

**Scope:** The implementation of `broadcastEvent()`, the event routing rules, and the integration with the Phase 2 call sites.

**What this document covers:**

- The `broadcastEvent()` function in `lib/sse-manager.ts` (or a separate `lib/broadcast.ts` if cleaner). The function signature is **exactly** what was locked in Phase 2.1.1: `broadcastEvent(channel: string | string[], eventType: string, payload: object): void`. Phase 2 code calls this function; Phase 3.1.3 provides its real implementation.
- The function body:
  - Constructs the event envelope: `{ type: eventType, id: generateId(), timestamp: new Date().toISOString(), payload }`.
  - Looks up the channel(s) in the SSE manager and writes the event to all connected clients.
  - Supports broadcasting to multiple channels in one call (for events that go to both `global` and a specific `counter:[counterId]`).
- The **event routing rules** — which events go to which channels:
  - `TICKET_ISSUED` → `global`. The display board may show "new ticket issued" indicators, and other counters may want to know about new arrivals.
  - `TICKET_CALLED` → `global` (for the display board) AND `counter:[counterId]` (for the calling officer's dashboard to confirm the call).
  - `TICKET_RECALLED` → `global` AND `counter:[counterId]`.
  - `TICKET_NO_SHOW` → `global` AND `counter:[counterId]`.
  - `TICKET_COMPLETED` → `counter:[counterId]`. (The display board does not necessarily show completed tickets; this is for the officer dashboard.)
  - `COUNTER_OPENED` / `COUNTER_CLOSED` / `COUNTER_STATUS_CHANGED` → `global`. The display board reflects counter state.
  - `BROADCAST_MESSAGE` → `global` (for display board) AND `security` (for security screen). The payload specifies which target.
  - `DAILY_RESET` → `global`.
  - `TICKET_QUEUED` / `QUEUE_UPDATED` → `counter:[counterId]`. Officer dashboard only.
  - `NOTIFICATION_RECEIVED` → `counter:[counterId]`. Officer dashboard only.
  - `OFFICER_REPLY` → `security`. Security screen only.
- The function dispatches to all relevant channels in a single call. For example, calling `broadcastEvent(['global', `counter:${counterId}`], 'TICKET_CALLED', payload)` delivers the event to both the display board and the specific officer.
- **No-op fallback for unknown channels:** if a channel has no connected clients, the function returns silently. This is important because it means code that emits events doesn't have to check whether anyone is listening.
- The **Phase 2 call sites are not modified.** The function signature is the same; only the implementation changes. This is the clean realization of the seam.
- **Future-phase call sites are also possible:** the routing table is defined in this document, but the call sites for events like `COUNTER_OPENED`, `BROADCAST_MESSAGE`, `NOTIFICATION_RECEIVED`, and `OFFICER_REPLY` are added in Phase 4 documents as those features are built. The function is ready; the call sites are added when their respective business logic is implemented.
- A small test that triggers a `TICKET_CALLED` event (e.g., via a temporary test route) and verifies it arrives on the `global` channel and the relevant `counter:[counterId]` channel.

**Outcome:** Calling `broadcastEvent('global', 'TICKET_CALLED', payload)` from any server-side code path immediately delivers the event to all display boards and other `global` subscribers. The routing rules are defined as a data structure (e.g., a constant map) so they're easy to review and extend. The Phase 2 no-op stub is replaced.

**Master Plan sections implemented:** Sections 4.4 (broadcast part of SSE Event Bus), 11.1 (channel design and routing), 11.2 (envelope construction), 11.3 (TICKET_CALLED payload — the actual delivery, since 2.3.1 only defined the shape), 11.4 (BROADCAST_MESSAGE payload).

---

### 4.4 Sub-Phase 3.1 Exit Criteria

Sub-Phase 3.1 is complete when:

1. A client can connect to `/api/sse/global` and receive events.
2. The SSE manager sends a heartbeat every 30 seconds.
3. The client disconnects are properly cleaned up in the manager.
4. The `useSSE()` hook subscribes to a channel, receives events, and reconnects automatically with exponential backoff.
5. Calling `broadcastEvent('global', 'TICKET_CALLED', payload)` from a server-side code path delivers the event to all connected `global` clients within a second.
6. The event envelope matches the master plan's Section 11.2 format exactly.
7. The routing rules are implemented as a data structure and reviewed.

---

## 5. Sub-Phase 3.2 — Main Display Board

### 5.1 Purpose

Sub-Phase 3.2 is the **visual public face** of the system. The display board is what customers in the waiting area see — a full-screen, dark-themed, high-contrast view of all active counters and the tickets they are currently calling. It is the most visible component of the entire system.

The display board is **unauthenticated** — anyone in the waiting area can see it. It uses the `useSSE()` hook from 3.1.2 to subscribe to the `global` channel, and renders the latest state based on the events it receives.

### 5.2 Why This Sub-Phase Comes After 3.1

The display board is a `useSSE()` consumer. It cannot render real-time events without the SSE infrastructure. The audio system (3.3) is also a `useSSE()` consumer, but 3.2 is developed first because the visual rendering is the easier of the two and provides a visible test surface for the SSE infrastructure.

### 5.3 Document Breakdown

#### Document 3.2.1 — Display Board UI & Layout

**Scope:** The full-screen display layout, the ticket call card component, the "now serving" primary slot, the recent calls history list, the scrolling marquee, and the clock display.

**What this document covers:**

- The `app/display/page.tsx` page: the main display screen. Supports both the default board (`/display` with no query) and specific boards (`/display?boardId=xxx`).
- The **layout** as specified in the master plan's Section 6.4:
  - Full screen (`100vw × 100vh`), `display-bg` background.
  - Top bar (48px tall): brand logo on the left, current date/time on the right.
  - Main section: grid of counter cards (responsive, 2–4 columns depending on the number of active counters).
  - Bottom marquee: scrolling custom message or instructions.
  - No scroll — everything fits in the viewport.
- The **color tokens** for the display board (from Section 6.2): `display-bg` for background, `display-accent` for ticket numbers, `display-text` for general text. These are the dark-theme tokens; the display board does not use the light-theme tokens.
- The **typography** for display ticket numbers (from Section 6.3): `font-size: 5rem`, `font-weight: 900`, `letter-spacing: -0.02em`. This is the largest type in the system and must be readable from across a waiting room.
- The **ticket call card component** (`<DisplayTicketBlock />` from Section 6.5):
  - Shows the counter name and number at the top.
  - Shows the currently serving ticket number in the large display typography.
  - Shows the counter's status (open / temporarily closed) as a small indicator.
  - If the counter has no active ticket, shows a placeholder (e.g., "—").
- The **"now serving" primary slot:** the most recently called ticket on each counter. Only one ticket per counter is shown as "now serving".
- The **recent calls history list:** below the primary slot, a smaller list of the last N called tickets for that counter. The N value comes from `DisplayBoard.maxDisplayedTickets` (default 10). The list is ordered most-recent-first.
- The **scrolling marquee** (`<MarqueeMessage />` from Section 6.5): displays `DisplayBoard.customMessage` (if set) as a continuous horizontal scroll. If no custom message is set, the marquee is hidden or shows default instructions.
- The **clock display** (`<DisplayClock />` from Section 6.5): a live-updating current time and date in the top right. Updates every second.
- The **audio context unlock overlay:** a full-screen overlay shown on first load, prompting the operator to click anywhere to enable audio. The overlay is dismissed on click and unlocks the `AudioContext` (per the master plan's Section 12.2). The overlay must be dismissed **before** any SSE event is rendered, so the operator doesn't miss the first announcement.
- The **initial state loading:** on first load, the display board fetches the current state of all active counters (a small API call that returns the latest CALLED ticket per counter, plus all active counter definitions). This is the "snapshot" that the SSE events then update. The snapshot endpoint is implemented in this document (or referenced if it was already implemented in a Phase 2 doc).

**Outcome:** Opening `/display?boardId=xxx` in a browser shows a full-screen dark-themed display board. The operator clicks to enable audio. The board renders the current state of all active counters. As ticket call events arrive over SSE, the affected counter's "now serving" updates and the ticket number animates into place.

**Master Plan sections implemented:** Sections 6.2 (display color tokens), 6.3 (display typography), 6.4 (display layout), 6.5 (display components).

---

#### Document 3.2.2 — Multi-Counter Ticket Display Logic

**Scope:** How multiple simultaneous counter calls are displayed, the display queue buffer, transition animations, and the handling of counter closure state.

**What this document covers:**

- The **grid layout** for multiple counters: the display board shows a responsive grid of counter cards. The number of columns is determined by the number of active counters and the viewport size:
  - 1–2 counters → 2 columns.
  - 3–4 counters → 2 columns.
  - 5–8 counters → 3 columns.
  - 9+ counters → 4 columns.
  - The exact breakpoints are specified in the document.
- The **display queue buffer:** each counter card maintains an in-memory buffer of the last N called tickets, where N is `DisplayBoard.maxDisplayedTickets` (default 10). The buffer is updated on every `TICKET_CALLED` event for that counter. When a new call arrives, the oldest entry is dropped and the new one is added at the top.
- The **transition animation** on a new ticket call: when a counter's "now serving" updates, the new ticket number animates into view (e.g., a brief scale-up or fade-in). The animation duration is short (e.g., 300ms) so it doesn't slow the customer's perception.
- The **counter closure state handling:**
  - When a `COUNTER_CLOSED` event arrives for a counter, the counter card visually changes to indicate the closure (e.g., greyed out, "Temporarily Closed" label, no "now serving" slot).
  - When a `COUNTER_OPENED` event arrives, the counter card returns to its normal state.
  - A closed counter's recent calls history remains visible (so customers can still see what the counter was serving before it closed).
  - The `ClosureReason` (if set via the `CounterStatusEvent.reason` field) is shown as a tooltip or small text on the closed counter card.
- The **recall and no-show handling:**
  - On `TICKET_RECALLED`, the counter's "now serving" remains the same ticket (the recall is the same ticket being re-announced; visually, the counter still shows it as "now serving", but the audio system re-plays the announcement).
  - On `TICKET_NO_SHOW`, the ticket is removed from "now serving" and the next waiting ticket (if auto-advance is on, and if the system has called the next ticket in response) becomes the new "now serving". If auto-advance is off, the counter card shows no "now serving" until the next call.
- The **buffer persistence:** the recent calls history is in-memory only. It is initialized from the snapshot on page load and then updated by events. It is **not** persisted across page reloads. (This is a deliberate design choice — the history is ephemeral, the snapshot in the database is authoritative.)
- The **in-progress ticket handling:** tickets in `SERVING` state (introduced in Phase 4.2.3) will appear as the "now serving" with an additional visual indicator. The display board in Phase 3 is designed to handle CALLED tickets; the SERVING state is added in Phase 4 but the rendering is forward-compatible.

**Outcome:** The display board correctly shows multiple counters with multiple ticket states, animates new calls, displays counter closure states, and maintains a recent calls history per counter. The buffer and rendering are smooth even with rapid event delivery.

**Master Plan sections implemented:** Sections 6.4 (grid layout), 6.5 (display components), 8.2 (DisplayBoard config usage), 11 (event consumption).

---

#### Document 3.2.3 — Display Configuration & Customization

**Scope:** The `DisplayBoard` configuration API, the admin UI for managing display boards, and the URL scheme for launching specific display configurations.

**What this document covers:**

- The API endpoints for managing `DisplayBoard` configurations:
  - `GET /api/display-boards` — list all display boards.
  - `POST /api/display-boards` — create a new display board configuration.
  - `GET /api/display-boards/[boardId]` — get a specific board's configuration.
  - `PATCH /api/display-boards/[boardId]` — update a board's configuration.
  - `DELETE /api/display-boards/[boardId]` — delete a board configuration (soft delete or hard delete — the document specifies which, and the cascade behavior on active displays referencing this board).
- The `app/(dashboard)/settings/display/page.tsx` admin page:
  - Lists all display boards with columns for name, isDefault, maxDisplayedTickets, TTS language, theme color, and actions.
  - A "Create Display Board" button that opens a form.
- The `app/(dashboard)/settings/display/new/page.tsx` and `app/(dashboard)/settings/display/[boardId]/page.tsx` create/edit pages, using the `SystemSettingsForm` (or a dedicated `DisplayBoardForm`) component. The form includes all fields from the master plan's Section 8.2:
  - `name` — board name for admin reference.
  - `isDefault` — whether this is the default board.
  - `maxDisplayedTickets` — max recent tickets per counter (default 10).
  - `announcementEnabled` — master switch for all announcements.
  - `bellEnabled` — whether the bell chime plays.
  - `ttsEnabled` — whether TTS announcements are made.
  - `ttsLanguage` — BCP-47 language tag.
  - `ttsRate`, `ttsPitch`, `ttsVolume` — TTS voice parameters.
  - `announcementTemplate` — TTS text template with placeholders.
  - `themeColor` — optional theme color override.
  - `logoUrl` — optional logo URL.
  - `customMessage` — marquee message.
- The **isDefault invariant:** only one board may have `isDefault = true` at a time. The form logic ensures that setting one board as default un-sets the previous default.
- The **URL scheme** for launching display boards:
  - `/display` (no query) → loads the default board (where `isDefault = true`).
  - `/display?boardId=xxx` → loads a specific board.
  - If a `boardId` is provided but doesn't exist or is deleted, the display board falls back to the default and shows a console warning.
- The display board is loaded once on page mount, fetches the board's configuration, and applies it. Configuration changes (made via the admin UI) take effect on the next page load of the display board — there is no live push of configuration updates.
- Route protection: admin pages are guarded with `system:configure` permission (or a new `display:manage` permission — the document specifies which; using existing permissions is preferred to avoid scope creep).
- Audit log writes for every display board mutation.

**Outcome:** A super-admin can open `/settings/display`, see all display boards, create a new board with custom TTS settings and theme colors, edit any board, and delete boards. The `/display` route respects the URL scheme and loads the right board configuration.

**Master Plan sections implemented:** Sections 6.4 (display layout), 8.2 (DisplayBoard model), 9.3 (display config API), 11 (display URL scheme).

---

### 5.4 Sub-Phase 3.2 Exit Criteria

Sub-Phase 3.2 is complete when:

1. A super-admin can create, edit, and delete `DisplayBoard` configurations via the admin UI.
2. Opening `/display?boardId=xxx` in a browser shows the configured display board with the correct theme color, logo, and marquee message.
3. The operator can click to dismiss the audio unlock overlay.
4. Triggering a ticket call (via the temporary officer ticket action panel from Phase 2.3.2) updates the display board within a second to show the new ticket.
5. Multiple ticket calls arriving close together all appear correctly on the display board.
6. A counter marked as temporarily closed (directly in the database for testing, or via a temporary test route) shows as closed on the display board.
7. The recent calls history shows the last N called tickets per counter.
8. Only one display board can be marked as the default at a time.

---

## 6. Sub-Phase 3.3 — Audio Announcement System

### 6.1 Purpose

Sub-Phase 3.3 is the **audible public face** of the system. When a ticket is called, the system plays a bell chime followed by a TTS announcement that names the ticket number and counter. The announcement system is what makes the queue useful in a noisy waiting area where the display board alone may not be enough.

The audio system is tightly coupled to the display board — both are consumers of the same `global` SSE events. The display board renders the visual state; the audio system plays the announcement. They share the audio context unlock overlay (the operator clicks once, and both systems are ready).

### 6.2 Why This Sub-Phase Closes Phase 3

Sub-Phase 3.3 closes Phase 3 by adding the audio dimension. Without audio, the display board works but the system is not fully accessible to all customers (e.g., visually impaired customers, or customers whose attention is not on the display). With audio, the system provides a complete real-time experience.

The audio system is also a non-trivial piece of state management — the announcement queue with strict sequence enforcement, the audio context unlock, and the TTS API quirks across browsers. It deserves its own sub-phase.

### 6.3 Document Breakdown

#### Document 3.3.1 — Bell/Chime Audio Integration

**Scope:** The Web Audio API integration for playing the bell sound file on ticket call events, the preloading strategy, the volume control, and the AudioContext unlock pattern.

**What this document covers:**

- The **bell sound file** (`bell.mp3` in `public/sounds/`): placed in the project by Phase 2.2.3 as a static asset. This document references the file and specifies its expected format (e.g., a short chime of 1–2 seconds, MP3 or WAV, modest file size for fast load).
- The **Web Audio API integration** in `lib/audio-bell.ts` (or similar):
  - On application load, the bell file is fetched and decoded into an `AudioBuffer` for low-latency playback. Decoding once and replaying from the buffer is significantly faster than fetching and decoding on every call.
  - A pre-warmed `AudioContext` is created. The context starts in a `suspended` state due to browser autoplay policies.
  - A function `playBell()` resumes the context (if needed) and plays the decoded buffer at the configured volume.
- The **audio context unlock pattern:**
  - On the display board's first load, a full-screen overlay is shown (implemented in 3.2.1).
  - On the operator's click, the overlay is dismissed and the `AudioContext` is resumed (transitioning from `suspended` to `running`).
  - The unlock is a one-time event per page load. The `AudioContext` remains `running` for the rest of the session.
  - If the audio context is somehow suspended again (e.g., the tab is backgrounded for a long time), the `playBell()` function attempts to resume it; if resume fails, the bell is silently skipped and the TTS still plays (which has its own browser-side resilience).
- The **volume control:** the bell volume is controlled by `DisplayBoard.ttsVolume` (the master volume for all announcement audio). The document specifies the mapping: `AudioBufferSourceNode.gain` is set to the configured volume (0 to 1).
- The **preload strategy:** the bell file is preloaded on page load (using a `fetch` request) and decoded as soon as the response is available. The decoding is asynchronous; the function that plays the bell awaits the decoding promise on first call and reuses the buffer on subsequent calls.
- The **`bellEnabled` flag:** if `DisplayBoard.bellEnabled = false`, the bell is skipped and only TTS plays. If `bellEnabled = true` and `announcementEnabled = false`, neither bell nor TTS plays.
- The **`useAnnouncement` hook** in `hooks/useAnnouncement.ts`: the React hook that ties the SSE event subscription to the audio playback. The hook receives ticket call events from the `useSSE()` hook and orchestrates the bell + TTS sequence. The full hook is built in 3.3.3.

**Outcome:** When a `TICKET_CALLED` event arrives on the display board, the bell chime plays within a few hundred milliseconds (thanks to the pre-decoded buffer). The audio context unlock is handled correctly, and the bell volume respects the configured setting.

**Master Plan sections implemented:** Sections 12.1 (bell part of the sequence), 12.2 (browser audio unlock).

---

#### Document 3.3.2 — Browser TTS API Integration

**Scope:** The `SpeechSynthesis` API integration, the announcement script template, voice selection, the TTS parameters, and the utterance event handlers.

**What this document covers:**

- The `SpeechSynthesis` API integration in `lib/audio-tts.ts`:
  - The `speechSynthesis` global is the entry point.
  - A `SpeechSynthesisUtterance` object is constructed with the announcement text.
  - The utterance's `lang`, `rate`, `pitch`, and `volume` are set from the `DisplayBoard` configuration.
  - The utterance is enqueued via `speechSynthesis.speak(utterance)`.
- The **announcement script template** (from the master plan's Section 12.3):
  - Default template: `"Now serving ticket {number} at {counter}"`.
  - The template is stored in `DisplayBoard.announcementTemplate`.
  - Available placeholders: `{number}` (full ticket number), `{counter}` (counter display name), `{service}` (service name).
  - The placeholders are replaced with values from the event payload.
  - The placeholder replacement function is a small utility in `lib/audio-tts.ts` that handles the substitution.
- The **voice selection logic:**
  - The `getVoices()` API returns a list of available voices for the current browser/OS.
  - The function selects a voice that matches `DisplayBoard.ttsLanguage` (a BCP-47 tag like `en-US`).
  - If no exact match is found, the first available voice is used (with a console warning in development).
  - The `voiceschanged` event is handled (some browsers populate the voice list asynchronously).
- The **TTS event handlers:**
  - `utterance.onstart` — fires when TTS starts speaking.
  - `utterance.onend` — fires when TTS completes (the announcement queue uses this to know when to play the next announcement).
  - `utterance.onerror` — fires on TTS error (the announcement queue handles this and moves to the next item).
- The **TTS configuration flags:**
  - `DisplayBoard.ttsEnabled` — whether TTS plays at all.
  - `DisplayBoard.announcementEnabled` — master switch for all audio (bell and TTS).
  - The TTS is skipped if either is false.
- The **TTS quirks across browsers:**
  - Chrome on desktop: full support, voice list populates synchronously.
  - Safari on macOS: voices may take a moment to populate; the `voiceschanged` handler is essential.
  - Mobile browsers: TTS may be limited or unavailable; the announcement queue gracefully handles this by skipping TTS and only playing the bell (if enabled).
  - The document specifies the exact fallback behavior for each platform.

**Outcome:** The TTS announcement plays the configured template with the correct ticket number, counter name, and (if included in the template) service name. The voice respects the configured language. The TTS is correctly skipped when disabled. Browser-specific quirks are handled.

**Master Plan sections implemented:** Sections 8.2 (DisplayBoard TTS settings), 12.1 (TTS part of the sequence), 12.3 (TTS template and placeholders).

---

#### Document 3.3.3 — Announcement Queue & Sequencing Logic

**Scope:** The FIFO announcement queue, the strict bell → TTS sequence, the processing lock, the cancellation logic, and the behavior when new events arrive during playback.

**What this document covers:**

- The **announcement queue** is a FIFO array held in component state (or a context, if multiple components need to share it — the document specifies the architecture).
- The **trigger:** every `TICKET_CALLED` event from the `useSSE()` hook enqueues a new announcement.
- The **processor:** a single processor loop that picks the first item from the queue, plays the bell (3.3.1), waits for bell completion, plays the TTS (3.3.2), waits for TTS completion, and moves to the next item. The processor is implemented as an async function with a single-flight guard (only one instance runs at a time).
- The **strict sequence enforcement:** the bell must complete before TTS starts. The processor uses promises that resolve on the audio events (`AudioBufferSourceNode.onended` for the bell, `SpeechSynthesisUtterance.onend` for TTS). No overlap, no skipping, no reordering.
- The **processing lock:** a boolean flag (or a single-flight promise) ensures only one announcement is playing at a time, even if multiple events arrive simultaneously. The processor checks the lock; if it's held, the new event joins the queue and waits.
- The **cancellation logic:** if the display board is unmounted (e.g., the user navigates away), the in-progress announcement is cancelled. The `AudioBufferSourceNode` is stopped, and `speechSynthesis.cancel()` is called. The queue is cleared.
- The **new-during-playback behavior:** if a new `TICKET_CALLED` event arrives while another announcement is in progress, the new event is **appended to the queue** and waits its turn. It does not interrupt the current announcement. The queue continues processing in FIFO order.
- The **`useAnnouncement` hook** (in `hooks/useAnnouncement.ts`): the React hook that:
  - Subscribes to the `global` SSE channel via `useSSE()`.
  - Filters incoming events to the types that should trigger announcements (`TICKET_CALLED`, `TICKET_RECALLED`).
  - Enqueues each event into the announcement queue.
  - Runs the processor loop.
  - Cleans up on unmount (cancels in-progress audio, clears the queue, unsubscribes from SSE).
- The hook is consumed by the display board page (`app/display/page.tsx`). The page wires the hook to the SSE events and the audio context.
- The **last-N buffering:** the queue does not grow unbounded. The maximum queue size is configurable (default: 5). If a new event arrives when the queue is full, the oldest queued event is dropped (with a console warning). This prevents a flood of events (e.g., during a test) from creating an hours-long announcement backlog.
- The **priority of immediate events:** if a new event has a high priority (e.g., it's been waiting in the queue for more than 30 seconds), it may be promoted to the front of the queue. The document specifies the exact promotion rule (or notes that no promotion is implemented and events are strictly FIFO).

**Outcome:** Multiple ticket calls arriving close together are played one after another in strict bell → TTS sequence, with no overlap. The announcement queue is bounded. If the display board navigates away mid-announcement, the announcement is cancelled cleanly.

**Master Plan sections implemented:** Section 12.1 (full announcement sequence), 6.5 (`useAnnouncement` hook in the hooks inventory).

---

### 6.4 Sub-Phase 3.3 Exit Criteria

Sub-Phase 3.3 is complete when:

1. The bell sound file is loaded and pre-decoded on display board page load.
2. The audio context unlock overlay is shown on first load and is dismissed on click.
3. After unlocking, a `TICKET_CALLED` event triggers bell playback within 500ms.
4. After the bell completes, the TTS announcement plays with the correct ticket number and counter name.
5. Multiple `TICKET_CALLED` events arriving within 1 second of each other are all played in order, with strict bell → TTS sequence, no overlap.
6. The announcement queue never exceeds its maximum size.
7. Navigating away from the display board mid-announcement cancels the in-progress audio.
8. The TTS template respects the configured placeholders and language.
9. The `bellEnabled`, `ttsEnabled`, and `announcementEnabled` flags correctly skip the corresponding audio.

---

## 7. Sub-Phase Dependency Map

The following diagram shows the build order of sub-phases and the inter-document dependencies. Documents on the same row can be developed in parallel after the row above is complete.

```
Sub-Phase 3.1 (Real-Time Infrastructure)
├── 3.1.1  SSE Architecture & Manager
├── 3.1.2  Real-Time State Management on Client    (depends on 3.1.1)
└── 3.1.3  Event Broadcasting System                (depends on 3.1.1, 3.1.2)

Sub-Phase 3.2 (Main Display Board)
├── 3.2.1  Display Board UI & Layout                (depends on 3.1.2)
├── 3.2.2  Multi-Counter Ticket Display Logic       (depends on 3.2.1)
└── 3.2.3  Display Configuration & Customization   (depends on 3.2.1)

Sub-Phase 3.3 (Audio Announcement System)
├── 3.3.1  Bell/Chime Audio Integration             (depends on 3.2.1 — for the unlock overlay)
├── 3.3.2  Browser TTS API Integration              (depends on 3.3.1)
└── 3.3.3  Announcement Queue & Sequencing Logic    (depends on 3.3.1, 3.3.2, 3.1.2)
```

**Critical Path:** `3.1.1 → 3.1.2 → 3.1.3 → 3.2.1 → 3.2.2 → 3.3.1 → 3.3.2 → 3.3.3`

**Parallel Opportunities:**

- `3.1.2` and `3.1.3` can be developed in parallel after `3.1.1` is complete (the hook and the broadcast function are different concerns, though they share the SSE manager).
- `3.2.2` and `3.2.3` can be developed in parallel after `3.2.1` is complete.
- `3.3.1` and `3.2.3` can be developed in parallel after `3.2.1` is complete.

**Critical Seam Realization:** Documents `3.1.3` provides the real implementation of the `broadcastEvent()` function whose signature was locked in Phase 2.1.1. The Phase 2 call sites in `lib/ticket-service.ts` are not modified; they simply become functional because the function they call is no longer a no-op.

**Forward Seam with Phase 4:** The SSE manager and `useSSE()` hook built in 3.1 are reused by:

- The officer dashboard (4.2.3) on the `counter:[counterId]` channel.
- The security officer screen (4.3.3) on the `security` channel.
- The broadcast message injection (4.3.2) calls `broadcastEvent()` to push messages to the `global` and `security` channels.

---

## 8. Cross-Cutting Standards for Phase 3

The following standards apply to every Phase 3 task plan document. The conventions from Phase 1 and Phase 2 (folder naming, import paths, TypeScript, Zod validation, error handling, env vars, git commits, transaction boundaries, ticket state machine) all carry forward. The standards below are **new or specific to Phase 3**.

### 8.1 Event Type Discriminated Union

The event envelope and all event payloads are defined as a single TypeScript discriminated union in `types/sse.types.ts`. The discriminator is the `type` field. Every consumer of events (display board, audio system, officer dashboard, security screen) imports this type and pattern-matches on `event.type`. This is the single source of truth for what events exist and what their payloads look like.

The discriminated union is **append-only**. Adding new event types is allowed; removing or renaming existing event types requires a coordinated update across all consumers. This is a stable contract between the server and all clients.

### 8.2 SSE Channel Naming Convention

Channel names follow a strict pattern:

- `global` — the public channel. Subscribed by the display board, the kiosk (for queue depth indicators), and any other public viewer.
- `counter:[counterId]` — a counter-specific channel. Subscribed by the officer dashboard for that counter. The `[counterId]` is the Prisma cuid of the counter.
- `security` — the security officer screen channel. Subscribed only by users with the `SECURITY_OFFICER` role.

Future channel patterns (e.g., `service:[serviceId]` for service-specific dashboards) follow the same colon-separated structure. The pattern is documented and enforced in the route handler.

### 8.3 Browser Audio Context Discipline

The `AudioContext` is a per-page-instance resource. The rules:

- The display board creates one `AudioContext` on mount and reuses it for the entire session.
- The context starts in `suspended` state and is resumed on the operator's click (the unlock gesture).
- After resumption, the context remains in `running` state. If it is suspended again (e.g., due to a long tab background), the announcement system attempts to resume it before each playback.
- The unlock gesture is a user click anywhere on the overlay. It is a one-time event per page load.
- The audio context unlock overlay is shown **before any SSE event is rendered on the display board**. This ensures the operator doesn't miss the first announcement.

These rules are non-negotiable. They are browser security policy, not design preferences.

### 8.4 Display Board as a "View" Layer

The display board is a **read-only consumer** of SSE events. It does not call any mutating API. It does not log in. It does not authenticate. The only data it sends is the audio context unlock click (which is purely local, not a network call).

This discipline means:

- The `/display` route is in the public allow-list in the Phase 1.2.3 middleware.
- No `withPermission()` guard is needed on any display-board-related code.
- The display board cannot accidentally trigger business actions (e.g., it cannot call a ticket).

### 8.5 Real-Time Event Subscription Discipline

Every `useSSE()` call must:

- Be inside a React component (or a custom hook called from a component).
- Have a stable `channel` parameter (or the hook re-subscribes on every render, which is wasteful).
- Clean up the subscription on unmount. The hook handles this automatically.
- Not be called inside loops or conditions (React rules of hooks).

For multiple subscriptions in a single component, each subscription is a separate `useSSE()` call. There is no built-in "subscribe to many" — the component orchestrates them.

### 8.6 Display Board Configuration Discipline

The `DisplayBoard` model is similar to `KioskConfig` (Phase 2.2.2) in its discipline:

- Only one display board may have `isDefault = true` at a time.
- The `isDefault` board is the fallback when no `boardId` is in the URL.
- Display boards are read at page load, not pushed live. Configuration changes require a display board reload to take effect.

This discipline ensures the URL scheme (`/display`, `/display?boardId=xxx`) is unambiguous and the fallback behavior is well-defined.

### 8.7 Announcement Queue Discipline

The announcement queue is a **single-instance** resource per display board page. The rules:

- The queue is held in component state (or a `useRef`) — not in global state, not in local storage, not in the database. It is purely ephemeral.
- The queue is bounded. The maximum size is 5 by default and is configurable.
- The processor is a single async function with a single-flight guard. Only one announcement plays at a time.
- On unmount, the queue is cleared and the in-progress audio is cancelled. This is a hard cleanup — no announcements continue after the page is gone.

These rules are essential because audio playback that continues after the page is unmounted is a bug, not a feature.

### 8.8 TTS Voice Caching

The TTS voice list (`speechSynthesis.getVoices()`) is cached at the module level after the first `voiceschanged` event. The cache is invalidated only on page reload. This avoids repeated synchronous calls to `getVoices()` on every announcement, which can be slow on some browsers.

---

## 9. Phase 3 Exit Criteria & Phase 4 Hand-off

### 9.1 Phase 3 Exit Criteria (The Complete Checklist)

Phase 3 is complete when **all** of the following are true:

#### Real-Time Infrastructure

- [ ] The SSE manager correctly tracks all active connections per channel.
- [ ] Heartbeat pings are sent every 30 seconds.
- [ ] Client disconnects are cleaned up in the manager.
- [ ] The `useSSE()` hook subscribes, receives events, and reconnects with exponential backoff.
- [ ] The `broadcastEvent()` function delivers events to all subscribed clients on the right channel(s).
- [ ] The event envelope matches the master plan's Section 11.2 format exactly.
- [ ] The routing rules (which event types go to which channels) are implemented.

#### Display Board

- [ ] A super-admin can create, edit, list, and delete display board configurations.
- [ ] The `/display` and `/display?boardId=xxx` routes load the correct board configuration.
- [ ] The display board shows a full-screen dark-themed layout.
- [ ] The audio context unlock overlay is shown on first load and dismissed on click.
- [ ] The display board renders the current state of all active counters.
- [ ] New ticket calls update the display board within a second.
- [ ] Counter closure is reflected on the display board.
- [ ] The recent calls history shows the last N called tickets per counter.
- [ ] Only one display board can be marked as the default at a time.

#### Audio System

- [ ] The bell sound file is preloaded and pre-decoded.
- [ ] After audio unlock, ticket calls trigger bell playback within 500ms.
- [ ] After the bell, the TTS announcement plays with the correct text.
- [ ] Multiple ticket calls arriving close together are queued and played in order.
- [ ] The announcement queue is bounded and never exceeds its maximum size.
- [ ] Navigating away mid-announcement cancels the in-progress audio.
- [ ] TTS respects the configured language, rate, pitch, and volume.
- [ ] Disabling bell, TTS, or all announcements via the configuration correctly skips the corresponding audio.

#### Code Quality

- [ ] All events are typed using the discriminated union in `types/sse.types.ts`.
- [ ] The SSE manager and `useSSE()` hook are reusable by Phase 4.
- [ ] `yarn lint`, `yarn type-check`, and `yarn build` all pass.

### 9.2 What Phase 4 Will Assume

When Phase 4 begins, it assumes Phase 3 is fully complete and verified. Specifically, Phase 4 will assume:

- The SSE manager, `useSSE()` hook, and `broadcastEvent()` function are working and tested.
- The `counter:[counterId]` and `security` channels are set up in the SSE manager, even though Phase 3 has no consumers for them yet.
- The display board is live, subscribed to the `global` channel, and rendering events.
- The `useAnnouncement()` hook is reusable by the officer dashboard (if the dashboard also wants audible call notifications — the master plan doesn't explicitly require this, so the document specifies the policy).
- The event payload types in `types/sse.types.ts` include all the types Phase 4 will emit (`COUNTER_OPENED`, `COUNTER_CLOSED`, `BROADCAST_MESSAGE`, `NOTIFICATION_RECEIVED`, `OFFICER_REPLY`, etc.) even if those events are not yet emitted by any code.
- The `DisplayBoard` configuration model and the URL scheme are working, so Phase 4.3's broadcast messages can be routed to a specific display board.

### 9.3 What Phase 3 Should Not Touch

Phase 3 task plan documents must **not** introduce:

- The FCM / push notification system (Phase 4.1).
- The mobile app authentication endpoint (Phase 4.1.2) — though the API contract from the master plan's Section 4.5 is referenced.
- The counter temporary closure API and toggle UI (Phase 4.2.1). Phase 3.2.2 shows a closed counter on the display board, but the toggle is Phase 4.
- The officer notification toggle (Phase 4.2.2).
- The full officer dashboard layout (Phase 4.2.3). Phase 3.1.2 builds the hook that 4.2.3 will use, but the dashboard composition is Phase 4.
- The officer reply API and broadcast message creation (Phase 4.3.1, 4.3.2). Phase 3.2 (display) reserves a layout slot for the broadcast overlay, but the message creation is Phase 4.
- The security officer screen (Phase 4.3.3). The `security` SSE channel is set up in Phase 3.1.1, but no client subscribes to it yet.
- The reports / analytics / charts (Phase 5).
- Rate limiting and security hardening (Phase 5).
- PostgreSQL migration (Phase 5).
- Multi-server SSE with Redis Pub/Sub (future).

If a Phase 3 task plan document finds itself needing any of the above, it is a signal that the sub-phase is over-scoped and the work should be deferred.

---

## 10. Phase 3 Document Map (Quick Reference)

| Doc ID    | Title                                 | Master Plan Sections Implemented                    |
| --------- | ------------------------------------- | --------------------------------------------------- |
| **3.1.1** | Server-Sent Events (SSE) Architecture | 4.4, 9.3, 11 (entire), 17                           |
| **3.1.2** | Real-Time State Management on Client  | 11.2, 11.5, client half of 11.1                     |
| **3.1.3** | Event Broadcasting System             | 4.4 (broadcast part), 11.1, 11.2, 11.3, 11.4        |
| **3.2.1** | Display Board UI & Layout             | 6.2, 6.3, 6.4, 6.5                                  |
| **3.2.2** | Multi-Counter Ticket Display Logic    | 6.4, 6.5, 8.2 (DisplayBoard config usage), 11       |
| **3.2.3** | Display Configuration & Customization | 6.4, 8.2 (DisplayBoard model), 9.3, 11 (URL scheme) |
| **3.3.1** | Bell/Chime Audio Integration          | 12.1 (bell part), 12.2                              |
| **3.3.2** | Browser TTS API Integration           | 8.2 (TTS settings), 12.1 (TTS part), 12.3           |
| **3.3.3** | Announcement Queue & Sequencing Logic | 6.5 (useAnnouncement hook), 12.1 (full sequence)    |

---

_End of Phase 3 Overview Document — Version 1.0.0_

_This document is the authoritative overview for Phase 3 of the Smart Queue Management System DDD series. It is the parent reference for the 9 task plan documents listed in Section 10. All Phase 3 task plan documents must be derived from and remain consistent with this overview and the master plan._
