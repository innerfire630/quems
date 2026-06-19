# Smart Queue Management System
## Master Plan Document — DDD Series Root

**Version:** 1.0.0
**Status:** Authoritative Reference
**Prepared for:** Client Delivery (Web Application)
**Architecture Method:** Domain-Driven Development (DDD)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Overview & Scope](#2-system-overview--scope)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Document Series Structure](#5-document-series-structure)
6. [UI/UX Design System](#6-uiux-design-system)
7. [Complete File & Folder Structure](#7-complete-file--folder-structure)
8. [Database Schema Design](#8-database-schema-design)
9. [API Architecture & Endpoint Registry](#9-api-architecture--endpoint-registry)
10. [Authentication & Authorization Architecture](#10-authentication--authorization-architecture)
11. [Real-Time Communication Architecture](#11-real-time-communication-architecture)
12. [Audio Announcement System Architecture](#12-audio-announcement-system-architecture)
13. [Silent Printing Architecture](#13-silent-printing-architecture)
14. [Mobile Notification Architecture](#14-mobile-notification-architecture)
15. [Security Architecture](#15-security-architecture)
16. [Phase-by-Phase Strategic Overview](#16-phase-by-phase-strategic-overview)
17. [Constraints & Decisions Log](#17-constraints--decisions-log)

---

## 1. Executive Summary

This document is the authoritative master plan for the Smart Queue Management System — a production-grade, web-based application designed to streamline the physical queuing experience for customers and operational staff alike. It serves as the root document for the entire Domain-Driven Development (DDD) document series, from which all 45 task plan documents will be derived.

The system digitises and automates queue issuance, counter operations, live display, audio announcements, push notifications, and reporting. It is architected to be mobile-integration-ready from day one, with a clean API surface designed to accommodate a future native Android application without requiring architectural changes.

This master plan defines every domain boundary, data model, API contract, real-time mechanism, and UI system needed to guide AI agents through implementation across five structured phases.

---

## 2. System Overview & Scope

### 2.1 Core Functional Domains

The system is organized into eight primary functional domains:

**Domain 1 — Identity & Access**
Handles user accounts, authentication, session management, and role-based access control. Every actor in the system — from the kiosk to the administrator — operates within this domain.

**Domain 2 — Service & Counter Management**
Covers the configuration of services offered and the physical or virtual counters that handle those services. This is the structural backbone of the queue system.

**Domain 3 — Queue & Ticket Operations**
The heart of the system. Manages the full lifecycle of a ticket from issuance at the kiosk to completion or no-show at a counter. Handles call, recall, no-show, and ticket state transitions.

**Domain 4 — Display & Announcement**
The public-facing real-time display board and the audio announcement system (bell + TTS). This domain consumes queue events and presents them to waiting customers.

**Domain 5 — Kiosk**
The self-service customer terminal for issuing queue tickets. Includes silent printing support and estimated wait time presentation.

**Domain 6 — Notification & Messaging**
Push notifications to counter officer mobile devices when tickets are issued, officer reply messaging, and the broadcast system that routes officer replies to the main display and security officer screen.

**Domain 7 — Counter Officer Operations**
The officer-facing dashboard, including counter status (open, temporarily closed), notification toggle control, and the serving interface (call, recall, no-show).

**Domain 8 — Analytics & Reporting**
Aggregated queue statistics, daily snapshots, performance metrics, and exportable reports for system administrators.

### 2.2 Actors in the System

| Actor | Description | Primary Interface |
|---|---|---|
| Super Administrator | Full system control, user management, system configuration | Admin Dashboard |
| Administrator | Day-to-day management, service and counter configuration, reports | Admin Dashboard |
| Counter Officer | Operates an assigned counter, calls tickets, replies to notifications | Officer Dashboard |
| Security Officer | Views the security display for officer broadcast messages | Security Screen |
| Kiosk User | Anonymous customer who issues a ticket | Kiosk Screen |
| Display Viewer | Anonymous viewer of the main queue display | Display Screen |
| Android App (future) | Receives push notifications, sends replies | Mobile (future) |

### 2.3 Out of Scope for This Phase

- Native Android or iOS app development (API will be fully ready for it)
- SMS/WhatsApp notifications
- Third-party calendar integrations
- Payment processing
- Video-call-based virtual queuing

---

## 3. Technology Stack

### 3.1 Core Framework

| Layer | Technology | Rationale |
|---|---|---|
| Full-stack Framework | Next.js 14+ (App Router) | Server components, API routes, SSE support, file-based routing |
| UI Component Library | shadcn/UI | Accessible, unstyled-by-default components built on Radix UI |
| Styling | Tailwind CSS | Utility-first, co-located with shadcn |
| Language | TypeScript | Type safety across the full stack |
| Package Manager | Yarn | Specified requirement |

### 3.2 Backend & Data

| Layer | Technology | Rationale |
|---|---|---|
| ORM | Prisma | Type-safe database access, schema-first, migration support |
| Database (Dev) | SQLite | Zero-config local development |
| Database (Prod) | PostgreSQL | Production-grade, scalable (Prisma provider swap) |
| Validation | Zod | Schema validation for API inputs and form data |
| Authentication | NextAuth.js v5 | JWT strategy with custom access/refresh token management |

### 3.3 Real-Time & Notifications

| Feature | Technology | Rationale |
|---|---|---|
| Real-time events | Server-Sent Events (SSE) | Unidirectional server-to-client push; no WebSocket server needed; works with Next.js |
| Push notifications (mobile) | Firebase Cloud Messaging (FCM) | Industry standard for Android push; web push fallback available |
| Audio announcements | Web Audio API + Browser TTS (SpeechSynthesis API) | No external dependency; works on display screen browser |

### 3.4 Tooling

| Tool | Purpose |
|---|---|
| ESLint + Prettier | Code linting and formatting |
| Husky | Git hooks for pre-commit checks |
| dotenv | Environment variable management |
| next-pwa (optional) | Progressive Web App shell for kiosk resilience |

---

## 4. System Architecture

### 4.1 High-Level Architecture Pattern

The system follows a **Vertical Slice Architecture** within Next.js, organized by domain. Each domain owns its API routes, server actions, components, types, and Zod schemas. The database is a single shared Prisma instance accessed from the server layer only.

The architecture enforces a strict rule: the client layer never directly accesses the database. All data mutations and queries flow through Next.js Server Actions or API Route Handlers.

### 4.2 Rendering Strategy per View

| View | Rendering Strategy | Reason |
|---|---|---|
| Admin Dashboard | Server Components + Client Islands | Auth-gated, SEO not needed, fast initial load |
| Officer Dashboard | Client Component (heavy interactivity) | Real-time SSE subscription, frequent state changes |
| Main Display Screen | Client Component | SSE subscription, TTS, audio — all browser-side |
| Kiosk | Client Component | Fully interactive touch interface |
| Security Officer Screen | Client Component | SSE subscription for broadcast messages |
| Login Page | Server Component | Simple form, no auth needed |
| Reports Pages | Server Components | Data-heavy, can be statically fetched |

### 4.3 Data Flow for a Ticket Call Event

The following describes the sequence of events when a counter officer presses "Call" on the next ticket:

1. Officer client sends a POST request to `/api/tickets/[ticketId]/call`.
2. The API route handler validates the request (auth, permissions, counter assignment).
3. The handler updates the Ticket record in the database (status → CALLED, calledAt, counterId, calledByOfficerId).
4. A TicketEvent record is written for audit.
5. The handler broadcasts an SSE event to all connected SSE clients (display, other officers, kiosk views) via the global SSE event bus.
6. The handler dispatches a push notification via FCM to the officer's registered device tokens (if notifications are enabled for that officer).
7. The API returns a success response to the officer client.
8. The Display Screen's SSE client receives the event and updates the live board.
9. The Display Screen triggers the bell audio, then queues the TTS announcement.

### 4.4 SSE Event Bus Architecture

A singleton in-process SSE manager holds all active SSE connections keyed by channel name. Channels are:

- `global` — all display boards and kiosks subscribe here
- `counter:[counterId]` — officer-specific events
- `security` — security officer screen events

The SSE manager is instantiated in a Next.js module-level singleton (via a module-scope variable) and survives hot-reloads in development. In production, this works correctly in a single-server deployment. For multi-server deployments (future), the SSE bus must be replaced with a Redis Pub/Sub-backed bus.

### 4.5 Android App Integration Strategy

The backend is designed as an API-first system. The Android app (future) will interact with the system using these mechanisms:

- **Authentication:** The Android app will obtain a JWT access token from `/api/auth/mobile/login` using officer credentials. Refresh tokens will be managed separately.
- **Push Notifications:** The app will register its FCM device token via `/api/notifications/devices/register`. The server stores this token against the officer's profile.
- **Receive Notifications:** FCM delivers notifications to the Android app automatically when the server triggers a push via the FCM HTTP v1 API.
- **Send Reply:** The app posts a reply to `/api/notifications/[notificationId]/reply`, which the backend processes and broadcasts to the display and security screen.
- **Notification Toggle:** The app calls `PATCH /api/officers/me/notifications` to toggle on/off.
- **Counter Status:** The app calls `PATCH /api/counters/[counterId]/status` to open or temporarily close the counter.

---

## 5. Document Series Structure

The DDD series consists of 45 task plan documents organized into 5 phases, each with 3 sub-phases, each sub-phase containing 3 task plan documents. No document contains code. Each document contains domain context, business logic rules, component specifications, API specifications, and data flow descriptions for that specific slice of work.

---

### PHASE 1 — Foundation & Infrastructure

**Strategic Goal:** Stand up the project, establish the data model, configure authentication, and implement role-based access control. Every subsequent phase depends on this foundation being correct.

---

#### Sub-Phase 1.1 — Project Initialization & Environment

> Establishes the development environment, scaffolds the Next.js project, installs all dependencies, and configures Prisma with the SQLite database and the initial schema migration.

| Document ID | Title | Scope Summary |
|---|---|---|
| **1.1.1** | Environment Setup & Toolchain Configuration | Node.js version, Yarn configuration, ESLint, Prettier, Husky, environment variable structure (.env), initial Next.js project creation with TypeScript and Tailwind |
| **1.1.2** | NextJS Project Scaffold & Folder Architecture | App Router structure, route groups, all directory creation, path aliases in tsconfig, global layout, font configuration, Tailwind theme extension for the project color system |
| **1.1.3** | Prisma Setup & Initial Database Configuration | Prisma installation, schema.prisma initial configuration for SQLite, first migration for the full schema (all tables from Section 8), seed script specification for roles, permissions, and a default super-admin user |

---

#### Sub-Phase 1.2 — Authentication & Session Management

> Implements NextAuth.js with a credentials provider, establishes the JWT access/refresh token strategy, and creates the login UI and session handling middleware.

| Document ID | Title | Scope Summary |
|---|---|---|
| **1.2.1** | NextAuth Configuration & JWT Strategy | NextAuth adapter setup, credentials provider, JWT callback configuration, access token payload structure (userId, roles, permissions), token signing, session shape definition |
| **1.2.2** | Access Token & Refresh Token Implementation | Refresh token generation, storage in the RefreshToken table, rotation strategy, revocation logic, the `/api/auth/refresh` endpoint specification, token expiry windows (access: 15 min, refresh: 7 days) |
| **1.2.3** | Authentication UI & Protected Routes | Login page component specification (card layout, email/password fields, error states), middleware.ts route protection rules per role group, redirect logic for unauthenticated users, session-aware layout |

---

#### Sub-Phase 1.3 — Role-Based Access Control (RBAC)

> Seeds and implements the complete RBAC system, including all roles, permissions, and the middleware/hook layer that enforces them across all routes and API endpoints.

| Document ID | Title | Scope Summary |
|---|---|---|
| **1.3.1** | Role & Permission Data Seeding | Full enumeration of all system roles (SUPER_ADMIN, ADMIN, COUNTER_OFFICER, SECURITY_OFFICER, KIOSK), all permission strings per module, the Role↔Permission seeding strategy, system-locked roles that cannot be deleted |
| **1.3.2** | RBAC Middleware & API Guard | The `withPermission()` server-side guard function specification, how permissions are checked on API routes, the `usePermission()` client hook for conditional UI rendering, API error responses for unauthorized access (401 vs 403 distinction) |
| **1.3.3** | User Management Admin Panel | User listing page, create/edit user form, role assignment interface, user activation/deactivation, password reset flow (admin-initiated), audit log entries for all user management actions |

---

### PHASE 2 — Core Queue Domain

**Strategic Goal:** Build the operational core — services, counters, and the full ticket lifecycle. This is the data and logic engine that all other features depend on.

---

#### Sub-Phase 2.1 — Service & Counter Management

> Implements the configuration interfaces for queue services and physical counters, including the many-to-many assignment between them.

| Document ID | Title | Scope Summary |
|---|---|---|
| **2.1.1** | Service Entity & Management API | Service CRUD API specification, ticket prefix and code uniqueness rules, active/inactive toggling, daily ticket number tracking per service, service listing and detail views in the admin panel |
| **2.1.2** | Counter Entity & Management API | Counter CRUD API specification, counter number uniqueness, active/inactive toggling, counter listing with current status indicator, officer assignment view per counter |
| **2.1.3** | Service-Counter Assignment Logic | The CounterService join table management, UI for assigning multiple services to a counter and vice versa, validation rules (a counter must have at least one service to receive tickets), cascade behavior on service or counter deactivation |

---

#### Sub-Phase 2.2 — Ticket Issuance & Self-Service Kiosk

> Builds the customer-facing kiosk screen and the underlying ticket generation engine, including silent printing.

| Document ID | Title | Scope Summary |
|---|---|---|
| **2.2.1** | Ticket Generation Engine & Queue Logic | Ticket number generation algorithm (prefix + zero-padded sequential number per service per day), the `POST /api/tickets/issue` endpoint, estimated wait time calculation formula, daily reset logic triggering at midnight, queue position calculation |
| **2.2.2** | Kiosk UI & Service Selection Flow | Full-screen kiosk layout specification (touch-optimized, large tap targets), service selection grid, confirmation screen with estimated wait time, ticket issued success screen, auto-reset timer after ticket issue, kiosk configuration loading |
| **2.2.3** | Silent Ticket Printing Implementation | The silent printing strategy using a hidden iframe with a dedicated printable ticket template, CSS print stylesheet for the ticket (58mm/80mm thermal paper format), the trigger mechanism post-ticket issuance, printer configuration via KioskConfig, fallback behavior if printing fails |

---

#### Sub-Phase 2.3 — Queue Processing Operations

> Implements the counter-side ticket operations: calling the next ticket, recalling, marking no-show, and managing the daily queue state.

| Document ID | Title | Scope Summary |
|---|---|---|
| **2.3.1** | Call & Recall Ticket Operations | `POST /api/tickets/[ticketId]/call` and `POST /api/tickets/[ticketId]/recall` endpoint specifications, validation rules (officer must be assigned to the counter, counter must be active), the SSE event payload structure for a call event, ticket status state machine for call and recall transitions |
| **2.3.2** | No-Show Handling & Queue Advancement | `POST /api/tickets/[ticketId]/no-show` specification, no-show grace period configuration, automatic advancement to next ticket option, the TicketEvent record for no-show audit, officer dashboard UI update after no-show action |
| **2.3.3** | Daily Queue Reset & Queue State Management | The scheduled or trigger-based daily reset mechanism (resetting currentTicketNumber per service, archiving the day's tickets to the QueueDailySnapshot table), queue statistics calculation at reset time, manual reset override for administrators, handling of in-progress tickets at reset time |

---

### PHASE 3 — Real-Time Display & Audio System

**Strategic Goal:** Build the public-facing real-time display board and the audio announcement system that customers in the waiting area interact with.

---

#### Sub-Phase 3.1 — Real-Time Infrastructure

> Designs and implements the SSE-based event streaming infrastructure that powers all real-time features.

| Document ID | Title | Scope Summary |
|---|---|---|
| **3.1.1** | Server-Sent Events (SSE) Architecture | The SSE manager singleton specification (connection map, channel structure, client registration, client removal on disconnect), the `/api/sse/[channel]` route handler, heartbeat ping interval to keep connections alive, event payload envelope format (type, data, timestamp, id) |
| **3.1.2** | Real-Time State Management on Client | The `useSSE()` custom hook specification (connecting, reconnecting, event parsing, cleanup), how the display board and officer dashboard subscribe to SSE channels, the event type registry (TICKET_CALLED, TICKET_RECALLED, TICKET_NO_SHOW, COUNTER_CLOSED, BROADCAST_MESSAGE, etc.) |
| **3.1.3** | Event Broadcasting System | The `broadcastEvent()` server utility function that writes to all relevant SSE channels simultaneously, event routing rules (which events go to which channels), ensuring the officer dashboard receives counter-specific events while the display board receives global queue events |

---

#### Sub-Phase 3.2 — Main Display Board

> Builds the public main display screen that shows live ticket calls per counter.

| Document ID | Title | Scope Summary |
|---|---|---|
| **3.2.1** | Display Board UI & Layout | Full-screen display layout specification (dark background, high-contrast ticket numbers, counter name labels), the ticket call card component, the "now serving" primary slot, the recent calls history list, scrolling marquee for custom messages, clock display |
| **3.2.2** | Multi-Counter Ticket Display Logic | How multiple simultaneous counter calls are displayed (grid layout for multiple counters), the display queue buffer (holding the last N called tickets per counter), transition animations on new ticket calls, handling of counter closure state on the display |
| **3.2.3** | Display Configuration & Customization | The DisplayBoard configuration API and admin UI (max displayed tickets, custom messages, logo, theme color), the display board setup page for administrators, the URL scheme for launching a specific display board configuration (`/display?boardId=xxx`) |

---

#### Sub-Phase 3.3 — Audio Announcement System

> Implements the two-stage audio announcement: bell chime followed by browser TTS voice announcement.

| Document ID | Title | Scope Summary |
|---|---|---|
| **3.3.1** | Bell/Chime Audio Integration | The Web Audio API integration for playing the bell sound file on ticket call events, the audio file specification (bell.mp3 in /public/sounds/), preloading strategy to prevent latency, volume control, and the AudioContext unlock pattern required by browsers (user gesture to enable audio) |
| **3.3.2** | Browser TTS API Integration | The `SpeechSynthesis` API integration specification, the announcement script template ("Now serving ticket [number] at counter [name]"), voice selection logic, language/rate/pitch/volume configuration from DisplayBoard settings, the utterance event handlers for tracking completion |
| **3.3.3** | Announcement Queue & Sequencing Logic | The announcement queue manager (handling multiple simultaneous calls arriving close together), the strict sequence enforcement (bell completes → TTS starts), the FIFO announcement queue with a processing lock, cancellation logic if the display board navigates away, behavior when a new call arrives while an announcement is in progress |

---

### PHASE 4 — Mobile Notification & Counter Management

**Strategic Goal:** Build the full push notification pipeline (Android-ready), the counter temporary closure system, notification toggles, and the officer reply/broadcast feature.

---

#### Sub-Phase 4.1 — Push Notification Infrastructure

> Implements the FCM-backed push notification system for officer mobile devices, including device registration and notification dispatch.

| Document ID | Title | Scope Summary |
|---|---|---|
| **4.1.1** | FCM Integration Architecture | Firebase project setup instructions (no code), FCM HTTP v1 API service account configuration, the `NotificationService` server module specification (send, batch send, handle FCM error codes, token cleanup on InvalidRegistration), environment variable naming for FCM credentials |
| **4.1.2** | Device Registration & Token Management API | `POST /api/notifications/devices/register` endpoint (accepts FCM token + platform), `DELETE /api/notifications/devices/[tokenId]` endpoint, the DeviceToken table usage, token deduplication logic, the mobile login endpoint `POST /api/auth/mobile/login` that returns access + refresh tokens for the Android app |
| **4.1.3** | Notification Dispatch & Delivery System | The trigger points for sending notifications (ticket issued for a service assigned to a counter, ticket recalled), the notification payload structure (title, body, data object with ticketId, serviceId, counterId, replyEndpoint), delivery tracking (Notification table status updates), retry logic for failed deliveries |

---

#### Sub-Phase 4.2 — Counter Status & Notification Controls

> Implements temporary counter closure, notification toggle, and the officer's operational dashboard.

| Document ID | Title | Scope Summary |
|---|---|---|
| **4.2.1** | Temporary Counter Closure System | `PATCH /api/counters/[counterId]/status` endpoint (open, temporarily close with optional reason), CounterStatusEvent record creation, how the display board reflects a closed counter, queue behavior while a counter is closed (tickets remain waiting, no auto-reassignment), SSE event broadcast on closure/reopening |
| **4.2.2** | Notification Toggle Feature | `PATCH /api/officers/me/notifications` endpoint (enable/disable), the toggle button in the officer dashboard UI, visual indicator of current notification state, behavior clarification: notification toggle state is independent of counter open/closed state (an officer can disable notifications while the counter is open, or enable them while temporarily closed) |
| **4.2.3** | Counter Officer Dashboard | Full officer dashboard layout specification (assigned counter name and number, current serving ticket, queue depth indicator, next ticket preview, Call/Recall/No-Show action buttons, counter status toggle, notification toggle, recent activity feed), loading state and empty queue state handling |

---

#### Sub-Phase 4.3 — Notification Reply & Broadcasting

> Implements the officer-to-display reply flow, the broadcast routing to the display board and security officer screen.

| Document ID | Title | Scope Summary |
|---|---|---|
| **4.3.1** | Officer Reply API & Message Flow | `POST /api/notifications/[notificationId]/reply` endpoint, NotificationReply table record creation, validation (officer must be the recipient of the notification, or be the assigned counter officer), the reply character limit, timestamp recording |
| **4.3.2** | Display Board Message Injection | How a NotificationReply triggers a BroadcastMessage, the SSE event payload for a broadcast message (type: BROADCAST_MESSAGE, message text, senderName, counterId, expiresAt), how the display board renders the broadcast overlay (position, duration, dismissal), multiple simultaneous broadcasts handling |
| **4.3.3** | Security Officer Screen & Broadcast Receiver | The security officer display screen specification (dedicated full-screen view at `/security`), SSE subscription to the `security` channel, the broadcast message feed (chronological list with sender name, message, timestamp), unread indicator, the counter assignment that identifies which user receives broadcasts as the Security Officer |

---

### PHASE 5 — Analytics, Hardening & Production Readiness

**Strategic Goal:** Add the analytics and reporting layer, harden the system for production, implement audit logging, and prepare for PostgreSQL migration and deployment.

---

#### Sub-Phase 5.1 — Analytics & Reporting

> Builds the data collection pipeline for queue analytics and the reporting dashboard.

| Document ID | Title | Scope Summary |
|---|---|---|
| **5.1.1** | Queue Analytics Data Collection | The QueueDailySnapshot population logic (triggered at daily reset), incremental metric recording during the day (totalIssued, totalServed, totalNoShow, totalCancelled), average wait time and service time calculation methodology, the analytics query API endpoints |
| **5.1.2** | Reports Dashboard & Visualization | The reports page layout specification (date range picker, service filter, counter filter), the key KPI cards (total tickets today, average wait time, no-show rate, busiest hour), bar chart for tickets by hour, table for per-service performance, per-counter performance table |
| **5.1.3** | Data Export & Scheduled Reports | `GET /api/reports/export?format=csv&date=...` endpoint specification, CSV column definitions for the export, the admin UI for triggering exports, future hook for automated scheduled email reports (architecture defined, not implemented yet) |

---

#### Sub-Phase 5.2 — System Hardening & Optimization

> Implements rate limiting, input sanitization, caching where applicable, performance optimizations, and the comprehensive audit log.

| Document ID | Title | Scope Summary |
|---|---|---|
| **5.2.1** | API Security & Rate Limiting | Rate limiting strategy per route group (stricter on auth endpoints, ticket issuance; looser on SSE and display reads), IP-based and user-based rate limits using an in-memory store (upgradeable to Redis), CORS configuration for the mobile app origin, request size limits, helmet-equivalent header configuration in Next.js |
| **5.2.2** | Performance Optimization & Caching | Next.js `unstable_cache` strategy for slowly-changing data (services list, counter list), aggressive revalidation on mutations, SSE connection pooling review, database query optimization (identifying N+1 patterns in the report queries), Prisma query logging in development |
| **5.2.3** | Audit Logging & System Monitoring | The AuditLog table write points (every sensitive action: user changes, counter changes, ticket state changes, system configuration changes), the audit log viewer in the admin dashboard (filterable by user, action, entity, date range), system health check endpoint `/api/health`, application error boundary strategy |

---

#### Sub-Phase 5.3 — Deployment & Migration

> Defines the PostgreSQL migration strategy, environment variable management, and the final production deployment checklist.

| Document ID | Title | Scope Summary |
|---|---|---|
| **5.3.1** | PostgreSQL Migration Strategy | The two-step Prisma migration process (provider swap from `sqlite` to `postgresql` in schema.prisma, running `prisma migrate deploy` against the production PostgreSQL instance), environment variable changes needed, data migration strategy from SQLite to PostgreSQL for existing data (if applicable), PostgreSQL-specific considerations (uuid vs cuid for IDs, JSON column handling) |
| **5.3.2** | Environment Configuration & CI/CD | Complete `.env.production` variable list and descriptions, Vercel/self-hosted deployment configuration for Next.js, the recommended CI/CD pipeline steps (lint → type-check → build → migrate → deploy), secrets management recommendations, post-deployment smoke test checklist |
| **5.3.3** | Final Integration & Production Checklist | End-to-end integration test scenarios (manual walkthrough scripts for each user role), cross-browser compatibility checklist (Chrome for display/kiosk, mobile Chrome for officers), printer compatibility test, FCM delivery verification test, SSE stability test under concurrent connections, final security review checklist |

---

## 6. UI/UX Design System

### 6.1 Design Principles

The UI adopts a **clean, professional, operational** aesthetic derived from the reference design. The system serves operational staff in real-world environments (counters, waiting rooms), so clarity and efficiency override aesthetics.

Key principles:
- **Information density is intentional** — officer and display views show only what is needed for the task at hand.
- **High contrast for display screens** — the main display board uses a dark background with very large, high-contrast ticket numbers that are readable from across a waiting room.
- **Touch-first for kiosk** — all kiosk elements are sized for touchscreen interaction (minimum 48px tap targets).
- **Status at a glance** — counter status, ticket state, and notification state must be visually unambiguous.

### 6.2 Color System

| Token Name | Hex Value | Usage |
|---|---|---|
| `primary` | `#2563EB` | Primary actions, active states, selected navigation items, buttons |
| `primary-light` | `#EFF6FF` | Primary backgrounds, active nav item background |
| `primary-foreground` | `#FFFFFF` | Text on primary background |
| `background` | `#F3F4F6` | Page background (light gray) |
| `surface` | `#FFFFFF` | Card and panel backgrounds |
| `border` | `#E5E7EB` | Card borders, dividers |
| `text-primary` | `#111827` | Headings, primary text |
| `text-secondary` | `#6B7280` | Subtext, labels, metadata |
| `success` | `#10B981` | Active/open status, positive metrics |
| `success-light` | `#ECFDF5` | Success chip backgrounds |
| `warning` | `#F59E0B` | Temporary closure status, caution states |
| `warning-light` | `#FFFBEB` | Warning chip backgrounds |
| `destructive` | `#EF4444` | No-show, errors, delete actions |
| `destructive-light` | `#FEF2F2` | Destructive chip backgrounds |
| `display-bg` | `#0F172A` | Display board background (near-black) |
| `display-accent` | `#3B82F6` | Ticket numbers on display board |
| `display-text` | `#F8FAFC` | General text on display board |

### 6.3 Typography

| Role | Specification |
|---|---|
| Display Ticket Numbers | `font-size: 5rem`, `font-weight: 900`, `letter-spacing: -0.02em` |
| Page Headings (H1) | `font-size: 1.875rem`, `font-weight: 700` |
| Section Headings (H2) | `font-size: 1.25rem`, `font-weight: 600` |
| Card Labels | `font-size: 0.875rem`, `font-weight: 500`, text-secondary color |
| Body Text | `font-size: 1rem`, `font-weight: 400` |
| Metadata / Timestamps | `font-size: 0.75rem`, `font-weight: 400`, text-secondary color |

### 6.4 Layout Specification

**Admin & Officer Dashboard Layout:**
- Left sidebar: `240px` wide, white background, shadow-sm on the right edge
- Sidebar top: Brand logo and name
- Sidebar nav: grouped navigation items with icon + label, active item highlighted in primary-light with primary text color and a filled primary left border indicator
- Sidebar bottom: Help link, Logout button
- Top bar: `64px` tall, white background, search bar (center), notification bell icon, user avatar + name (right)
- Content area: `calc(100% - 240px)`, background color, `24px` padding, scrollable

**Main Display Board Layout:**
- Full screen (`100vw × 100vh`), `display-bg` background
- Top bar: Brand logo (left), current date/time (right), `48px` tall
- Main section: Grid of counter cards (responsive, 2–4 columns), each card showing counter name and currently serving ticket number in large type
- Bottom marquee: Scrolling custom message or instructions
- No scroll — everything fits in the viewport

**Kiosk Layout:**
- Full screen, white background, `32px` padding
- Top: Brand logo, current date/time, welcome message
- Center: Service selection grid (2 columns on tablet, 1 column on phone), large service name cards with icons
- After selection: Full-screen confirmation card with ticket number, estimated wait, counter assignment info
- Auto-resets to home screen after configurable timeout

### 6.5 Component Inventory

| Component | Location | Description |
|---|---|---|
| `<AppSidebar />` | `components/layout/` | Full left navigation sidebar |
| `<TopBar />` | `components/layout/` | Top navigation bar |
| `<StatCard />` | `components/shared/` | KPI metric card (number + label + trend) |
| `<CounterCard />` | `components/counter/` | Officer dashboard counter card |
| `<TicketBadge />` | `components/shared/` | Styled ticket number display |
| `<StatusChip />` | `components/shared/` | Colored status pill (WAITING, CALLED, etc.) |
| `<ServiceCard />` | `components/kiosk/` | Kiosk service selection card |
| `<DisplayTicketBlock />` | `components/display/` | Large ticket call block for display board |
| `<BroadcastBanner />` | `components/display/` | Broadcast message overlay on display |
| `<NotificationToggle />` | `components/counter/` | Officer notification enable/disable toggle |
| `<CounterStatusToggle />` | `components/counter/` | Officer counter open/close toggle |
| `<QueueDepthIndicator />` | `components/counter/` | Visual queue depth for officer dashboard |
| `<AuditLogTable />` | `components/admin/` | Paginated audit log viewer |
| `<UserForm />` | `components/admin/` | Create/edit user form |
| `<ServiceForm />` | `components/admin/` | Create/edit service form |
| `<CounterForm />` | `components/admin/` | Create/edit counter form |
| `<ReportChart />` | `components/reports/` | Recharts-based report visualizations |
| `<PrintTicket />` | `components/kiosk/` | Hidden iframe printable ticket template |

---

## 7. Complete File & Folder Structure

```
smart-queue-system/
│
├── prisma/
│   ├── schema.prisma                    # Full Prisma schema (all models)
│   ├── migrations/                      # Auto-generated migration files
│   └── seed.ts                          # Database seeding (roles, permissions, super-admin)
│
├── public/
│   ├── sounds/
│   │   └── bell.mp3                     # Bell/chime audio file for announcements
│   ├── fonts/                           # Self-hosted fonts (if used)
│   └── logo.svg                         # Brand logo
│
├── src/
│   │
│   ├── app/                             # Next.js App Router root
│   │   │
│   │   ├── (auth)/                      # Auth route group (no sidebar layout)
│   │   │   ├── login/
│   │   │   │   └── page.tsx             # Login page
│   │   │   └── layout.tsx               # Auth layout (centered card)
│   │   │
│   │   ├── (dashboard)/                 # Admin dashboard route group
│   │   │   ├── layout.tsx               # Dashboard layout (sidebar + topbar)
│   │   │   ├── page.tsx                 # Dashboard overview / redirect
│   │   │   │
│   │   │   ├── overview/
│   │   │   │   └── page.tsx             # Main admin overview dashboard
│   │   │   │
│   │   │   ├── counters/
│   │   │   │   ├── page.tsx             # Counter listing & management
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Create new counter
│   │   │   │   └── [counterId]/
│   │   │   │       ├── page.tsx         # Counter detail & edit
│   │   │   │       └── services/
│   │   │   │           └── page.tsx     # Service-counter assignment
│   │   │   │
│   │   │   ├── services/
│   │   │   │   ├── page.tsx             # Service listing & management
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Create new service
│   │   │   │   └── [serviceId]/
│   │   │   │       └── page.tsx         # Service detail & edit
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── page.tsx             # User listing & management
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx         # Create new user
│   │   │   │   └── [userId]/
│   │   │   │       └── page.tsx         # User detail & edit
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── page.tsx             # Reports dashboard
│   │   │   │   └── export/
│   │   │   │       └── route.ts         # CSV export route
│   │   │   │
│   │   │   ├── audit-log/
│   │   │   │   └── page.tsx             # Audit log viewer
│   │   │   │
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx             # System settings
│   │   │   │   └── display/
│   │   │   │       └── page.tsx         # Display board configuration
│   │   │   │
│   │   │   └── kiosk-config/
│   │   │       └── page.tsx             # Kiosk configuration
│   │   │
│   │   ├── (officer)/                   # Officer route group
│   │   │   ├── layout.tsx               # Officer layout (simplified sidebar)
│   │   │   └── counter/
│   │   │       └── [counterId]/
│   │   │           └── page.tsx         # Officer serving dashboard
│   │   │
│   │   ├── display/                     # Public display board (no auth)
│   │   │   └── page.tsx                 # Main display screen
│   │   │
│   │   ├── kiosk/                       # Public kiosk screen (no auth)
│   │   │   └── page.tsx                 # Self-service kiosk
│   │   │
│   │   ├── security/                    # Security officer screen (auth required)
│   │   │   └── page.tsx                 # Security officer broadcast view
│   │   │
│   │   └── api/                         # API Route Handlers
│   │       │
│   │       ├── auth/
│   │       │   ├── [...nextauth]/
│   │       │   │   └── route.ts         # NextAuth handler
│   │       │   ├── refresh/
│   │       │   │   └── route.ts         # Access token refresh endpoint
│   │       │   └── mobile/
│   │       │       └── login/
│   │       │           └── route.ts     # Mobile app authentication endpoint
│   │       │
│   │       ├── counters/
│   │       │   ├── route.ts             # GET list, POST create
│   │       │   └── [counterId]/
│   │       │       ├── route.ts         # GET detail, PATCH update, DELETE
│   │       │       ├── status/
│   │       │       │   └── route.ts     # PATCH counter open/close status
│   │       │       └── services/
│   │       │           └── route.ts     # GET/POST/DELETE counter-service assignments
│   │       │
│   │       ├── services/
│   │       │   ├── route.ts             # GET list, POST create
│   │       │   └── [serviceId]/
│   │       │       └── route.ts         # GET detail, PATCH update, DELETE
│   │       │
│   │       ├── tickets/
│   │       │   ├── route.ts             # GET queue list
│   │       │   ├── issue/
│   │       │   │   └── route.ts         # POST issue new ticket (kiosk)
│   │       │   └── [ticketId]/
│   │       │       ├── route.ts         # GET ticket detail
│   │       │       ├── call/
│   │       │       │   └── route.ts     # POST call ticket
│   │       │       ├── recall/
│   │       │       │   └── route.ts     # POST recall ticket
│   │       │       └── no-show/
│   │       │           └── route.ts     # POST mark as no-show
│   │       │
│   │       ├── officers/
│   │       │   └── me/
│   │       │       ├── route.ts         # GET officer profile
│   │       │       └── notifications/
│   │       │           └── route.ts     # PATCH notification toggle
│   │       │
│   │       ├── notifications/
│   │       │   ├── devices/
│   │       │   │   ├── route.ts         # POST register device token
│   │       │   │   └── [tokenId]/
│   │       │   │       └── route.ts     # DELETE device token
│   │       │   └── [notificationId]/
│   │       │       └── reply/
│   │       │           └── route.ts     # POST officer reply
│   │       │
│   │       ├── users/
│   │       │   ├── route.ts             # GET list, POST create
│   │       │   └── [userId]/
│   │       │       └── route.ts         # GET, PATCH, DELETE user
│   │       │
│   │       ├── reports/
│   │       │   ├── route.ts             # GET analytics data
│   │       │   └── export/
│   │       │       └── route.ts         # GET CSV export
│   │       │
│   │       ├── sse/
│   │       │   └── [channel]/
│   │       │       └── route.ts         # SSE stream endpoint
│   │       │
│   │       └── health/
│   │           └── route.ts             # System health check
│   │
│   ├── components/
│   │   ├── ui/                          # shadcn/UI auto-generated components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── separator.tsx
│   │   │   └── ... (all shadcn components)
│   │   │
│   │   ├── layout/
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── OfficerSidebar.tsx
│   │   │   └── MobileNav.tsx
│   │   │
│   │   ├── shared/
│   │   │   ├── StatCard.tsx
│   │   │   ├── TicketBadge.tsx
│   │   │   ├── StatusChip.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── DataTable.tsx
│   │   │
│   │   ├── counter/
│   │   │   ├── CounterCard.tsx
│   │   │   ├── CounterForm.tsx
│   │   │   ├── CounterStatusToggle.tsx
│   │   │   ├── NotificationToggle.tsx
│   │   │   ├── QueueDepthIndicator.tsx
│   │   │   ├── TicketActionPanel.tsx       # Call / Recall / No-Show buttons
│   │   │   └── CounterServiceAssignment.tsx
│   │   │
│   │   ├── display/
│   │   │   ├── DisplayTicketBlock.tsx
│   │   │   ├── BroadcastBanner.tsx
│   │   │   ├── DisplayClock.tsx
│   │   │   └── MarqueeMessage.tsx
│   │   │
│   │   ├── kiosk/
│   │   │   ├── ServiceCard.tsx
│   │   │   ├── KioskServiceGrid.tsx
│   │   │   ├── TicketConfirmation.tsx
│   │   │   ├── KioskResetTimer.tsx
│   │   │   └── PrintTicket.tsx             # Hidden iframe print component
│   │   │
│   │   ├── admin/
│   │   │   ├── UserForm.tsx
│   │   │   ├── UserTable.tsx
│   │   │   ├── RoleAssignment.tsx
│   │   │   ├── AuditLogTable.tsx
│   │   │   └── SystemSettingsForm.tsx
│   │   │
│   │   ├── services/
│   │   │   ├── ServiceForm.tsx
│   │   │   └── ServiceTable.tsx
│   │   │
│   │   └── reports/
│   │       ├── ReportKPICards.tsx
│   │       ├── TicketsByHourChart.tsx
│   │       ├── ServicePerformanceTable.tsx
│   │       └── CounterPerformanceTable.tsx
│   │
│   ├── lib/
│   │   ├── db.ts                        # Prisma client singleton
│   │   ├── auth.ts                      # NextAuth configuration
│   │   ├── auth-utils.ts                # Token generation, validation helpers
│   │   ├── sse-manager.ts               # SSE connection manager singleton
│   │   ├── notification-service.ts      # FCM notification dispatch
│   │   ├── ticket-service.ts            # Ticket generation business logic
│   │   ├── queue-service.ts             # Queue state management logic
│   │   ├── audit-log.ts                 # Audit log write utility
│   │   ├── permissions.ts               # Permission constants and check helpers
│   │   └── utils.ts                     # General utility functions
│   │
│   ├── hooks/
│   │   ├── useSSE.ts                    # SSE subscription hook
│   │   ├── usePermission.ts             # Client-side permission check hook
│   │   ├── useAnnouncement.ts           # Bell + TTS announcement queue hook
│   │   ├── useCounterStatus.ts          # Counter open/close state hook
│   │   ├── useTicketActions.ts          # Call/Recall/No-Show action hook
│   │   └── useKioskReset.ts             # Kiosk inactivity reset timer hook
│   │
│   ├── types/
│   │   ├── index.ts                     # Re-exports all types
│   │   ├── auth.types.ts                # Session, token payload types
│   │   ├── queue.types.ts               # Ticket, Counter, Service types
│   │   ├── notification.types.ts        # Notification, DeviceToken types
│   │   ├── sse.types.ts                 # SSE event envelope types
│   │   └── api.types.ts                 # API request/response types
│   │
│   ├── schemas/                         # Zod validation schemas
│   │   ├── auth.schema.ts               # Login, token schemas
│   │   ├── user.schema.ts               # User create/update schemas
│   │   ├── counter.schema.ts            # Counter create/update schemas
│   │   ├── service.schema.ts            # Service create/update schemas
│   │   ├── ticket.schema.ts             # Ticket issue, action schemas
│   │   ├── notification.schema.ts       # Device register, reply schemas
│   │   └── report.schema.ts             # Report query parameter schemas
│   │
│   └── middleware.ts                    # Next.js middleware (route protection)
│
├── .env                                 # Local development env vars (gitignored)
├── .env.example                         # Env var template (committed)
├── .eslintrc.json
├── .prettierrc
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── components.json                      # shadcn/UI configuration
└── package.json
```

---

## 8. Database Schema Design

This section defines all database tables, their fields, types, constraints, and relationships as the authoritative specification for the Prisma schema file. Enums are listed first, followed by models in dependency order.

### 8.1 Enums

**`UserStatus`**
Values: `ACTIVE`, `INACTIVE`, `SUSPENDED`

**`Platform`**
Values: `ANDROID`, `IOS`, `WEB`

**`CounterOfficerStatus`**
Values: `AVAILABLE`, `SERVING`, `CLOSED`, `OFFLINE`

**`CounterEventStatus`**
Values: `OPENED`, `CLOSED_TEMPORARY`, `CLOSED_PERMANENT`, `REOPENED`

**`TicketStatus`**
Values: `WAITING`, `CALLED`, `RECALLED`, `SERVING`, `COMPLETED`, `NO_SHOW`, `TRANSFERRED`, `CANCELLED`

**`TicketEventType`**
Values: `ISSUED`, `CALLED`, `RECALLED`, `SERVED`, `COMPLETED`, `NO_SHOW`, `TRANSFERRED`, `CANCELLED`, `PRIORITY_CHANGED`

**`NotificationType`**
Values: `TICKET_ISSUED`, `TICKET_RECALLED`, `SYSTEM_MESSAGE`, `BROADCAST`

**`NotificationStatus`**
Values: `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `READ`

**`SettingType`**
Values: `STRING`, `INTEGER`, `BOOLEAN`, `JSON`

---

### 8.2 Models

---

#### `User`

The central identity record for every system user. All officers, admins, and the security officer are users.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Unique user identifier |
| `email` | String | Unique, not null | Login email address |
| `password` | String | Not null | Bcrypt-hashed password |
| `name` | String | Not null | Display name |
| `avatar` | String? | Nullable | Avatar image URL |
| `status` | `UserStatus` | Default ACTIVE | Account status |
| `createdAt` | DateTime | Default now() | Record creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Relations:**
- `roles` → `UserRole[]` (one-to-many)
- `sessions` → `Session[]` (one-to-many, NextAuth)
- `accounts` → `Account[]` (one-to-many, NextAuth)
- `refreshTokens` → `RefreshToken[]` (one-to-many)
- `counterProfile` → `CounterOfficer?` (one-to-one, optional; not all users are counter officers)
- `auditLogs` → `AuditLog[]` (one-to-many)

**Indexes:** `email` (unique)

---

#### `Role`

Defines a named role within the RBAC system.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Unique role identifier |
| `name` | String | Unique, not null | System name e.g. `SUPER_ADMIN`, `COUNTER_OFFICER` |
| `displayName` | String | Not null | Human-readable name |
| `description` | String? | Nullable | Role description |
| `isSystem` | Boolean | Default false | If true, this role cannot be deleted via the UI |
| `createdAt` | DateTime | Default now() | Record creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Relations:**
- `permissions` → `RolePermission[]` (one-to-many)
- `users` → `UserRole[]` (one-to-many)

---

#### `Permission`

An atomic permission string representing one action on one resource.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Unique permission identifier |
| `name` | String | Unique, not null | Dotted permission key e.g. `counter:call`, `user:manage` |
| `displayName` | String | Not null | Human-readable name |
| `description` | String? | Nullable | What this permission allows |
| `module` | String | Not null | Grouping module: `USER`, `COUNTER`, `SERVICE`, `TICKET`, `NOTIFICATION`, `REPORT`, `SYSTEM` |
| `createdAt` | DateTime | Default now() | Record creation timestamp |

**Relations:**
- `roles` → `RolePermission[]` (one-to-many)

---

#### `RolePermission`

Join table linking roles to their assigned permissions.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Record identifier |
| `roleId` | String | FK → Role.id, not null | Associated role |
| `permissionId` | String | FK → Permission.id, not null | Associated permission |
| `createdAt` | DateTime | Default now() | Assignment timestamp |

**Constraints:** Composite unique on `(roleId, permissionId)`

**Relations:**
- `role` → `Role` (many-to-one)
- `permission` → `Permission` (many-to-one)

---

#### `UserRole`

Join table linking users to their assigned roles.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Record identifier |
| `userId` | String | FK → User.id, not null | Associated user |
| `roleId` | String | FK → Role.id, not null | Associated role |
| `assignedAt` | DateTime | Default now() | Assignment timestamp |
| `assignedById` | String? | Nullable | User ID of who assigned this role |

**Constraints:** Composite unique on `(userId, roleId)`

---

#### `Session`

NextAuth.js session records.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Session identifier |
| `sessionToken` | String | Unique, not null | The session token string |
| `userId` | String | FK → User.id, not null | Owning user |
| `expires` | DateTime | Not null | Session expiry datetime |

---

#### `Account`

NextAuth.js OAuth account records (for future OAuth provider support).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Account identifier |
| `userId` | String | FK → User.id, not null | Owning user |
| `type` | String | Not null | Account type (credentials, oauth) |
| `provider` | String | Not null | Provider name |
| `providerAccountId` | String | Not null | External provider ID |
| `refresh_token` | String? | Text, nullable | OAuth refresh token |
| `access_token` | String? | Text, nullable | OAuth access token |
| `expires_at` | Int? | Nullable | OAuth token expiry (Unix timestamp) |
| `token_type` | String? | Nullable | Token type |
| `scope` | String? | Nullable | OAuth scope |
| `id_token` | String? | Text, nullable | OIDC ID token |
| `session_state` | String? | Nullable | OAuth session state |

**Constraints:** Composite unique on `(provider, providerAccountId)`

---

#### `RefreshToken`

Custom refresh token records for the dual-token authentication system.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Record identifier |
| `token` | String | Unique, not null | The hashed refresh token string |
| `userId` | String | FK → User.id, not null | Token owner |
| `expiresAt` | DateTime | Not null | Token expiry datetime |
| `isRevoked` | Boolean | Default false | Whether this token has been revoked |
| `createdAt` | DateTime | Default now() | Token issuance timestamp |
| `revokedAt` | DateTime? | Nullable | Revocation timestamp |
| `replacedByToken` | String? | Nullable | Token ID that replaced this one (rotation chain) |

**Indexes:** `token` (unique), `userId`

---

#### `Service`

A queue service category (e.g., General Inquiry, Medical, Finance).

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Unique service identifier |
| `name` | String | Not null | Display name of the service |
| `code` | String | Unique, not null | Short system code (e.g., `GEN`, `MED`) |
| `ticketPrefix` | String | Unique, not null | Single letter prefix for ticket numbers (e.g., `A`, `B`) |
| `description` | String? | Nullable | Service description |
| `iconName` | String? | Nullable | Lucide icon name for UI display |
| `color` | String? | Nullable | Hex color for UI accent |
| `isActive` | Boolean | Default true | Whether the service is available at the kiosk |
| `currentTicketNumber` | Int | Default 0 | Current sequential ticket counter (resets daily) |
| `averageServiceTime` | Int? | Nullable | Estimated minutes per customer (for wait time calc) |
| `sortOrder` | Int | Default 0 | Display order on kiosk |
| `createdAt` | DateTime | Default now() | Record creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Relations:**
- `counters` → `CounterService[]` (one-to-many)
- `tickets` → `Ticket[]` (one-to-many)
- `dailySnapshots` → `QueueDailySnapshot[]` (one-to-many)

**Indexes:** `code` (unique), `ticketPrefix` (unique), `isActive`

---

#### `Counter`

A physical or virtual serving counter in the queue system.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Unique counter identifier |
| `name` | String | Not null | Display name (e.g., "Counter 1", "Information Desk") |
| `number` | Int | Unique, not null | Numeric identifier shown on display board |
| `description` | String? | Nullable | Counter description |
| `isActive` | Boolean | Default true | Whether the counter exists in the system |
| `displayLabel` | String? | Nullable | Custom label for the display board (defaults to name) |
| `createdAt` | DateTime | Default now() | Record creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Relations:**
- `services` → `CounterService[]` (one-to-many)
- `officers` → `CounterOfficer[]` (one-to-many; multiple officers can be assigned, one on duty at a time)
- `tickets` → `Ticket[]` (one-to-many; tickets assigned to this counter)
- `statusHistory` → `CounterStatusEvent[]` (one-to-many)

**Indexes:** `number` (unique), `isActive`

---

#### `CounterService`

Join table assigning services to counters.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Record identifier |
| `counterId` | String | FK → Counter.id, not null | Associated counter |
| `serviceId` | String | FK → Service.id, not null | Associated service |
| `createdAt` | DateTime | Default now() | Assignment timestamp |

**Constraints:** Composite unique on `(counterId, serviceId)`

---

#### `CounterOfficer`

The operational profile for a user acting as a counter officer. One record per user-counter assignment.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Record identifier |
| `userId` | String | FK → User.id, not null | The officer's user account |
| `counterId` | String | FK → Counter.id, not null | The assigned counter |
| `isOnDuty` | Boolean | Default false | Whether the officer is currently active on this counter |
| `isClosed` | Boolean | Default false | Whether the officer has temporarily closed the counter |
| `closureReason` | String? | Nullable | Reason provided for temporary closure |
| `closedAt` | DateTime? | Nullable | Timestamp of temporary closure |
| `notificationsEnabled` | Boolean | Default true | Whether push notifications are enabled for this officer |
| `currentStatus` | `CounterOfficerStatus` | Default OFFLINE | Operational status |
| `createdAt` | DateTime | Default now() | Assignment timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Relations:**
- `user` → `User` (many-to-one)
- `counter` → `Counter` (many-to-one)
- `deviceTokens` → `DeviceToken[]` (one-to-many)
- `calledTickets` → `Ticket[]` (one-to-many; tickets this officer has called)
- `notifications` → `Notification[]` (one-to-many; notifications sent to this officer)
- `notificationReplies` → `NotificationReply[]` (one-to-many)

**Constraints:** Composite unique on `(userId, counterId)`

---

#### `CounterStatusEvent`

Audit trail of counter open/close events.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Record identifier |
| `counterId` | String | FK → Counter.id, not null | The affected counter |
| `counterOfficerId` | String | FK → CounterOfficer.id, not null | The officer who triggered the event |
| `status` | `CounterEventStatus` | Not null | The status transition |
| `reason` | String? | Nullable | Provided reason |
| `createdAt` | DateTime | Default now() | Event timestamp |

---

#### `Ticket`

The core queue ticket record. One record per issued ticket.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Unique ticket identifier |
| `ticketNumber` | String | Not null | Full displayed ticket number e.g. `A001` |
| `displayNumber` | Int | Not null | The sequential number part (1, 2, 3...) |
| `serviceId` | String | FK → Service.id, not null | The service this ticket is for |
| `counterId` | String? | FK → Counter.id, nullable | Counter assigned when called |
| `calledByOfficerId` | String? | FK → CounterOfficer.id, nullable | Officer who called this ticket |
| `status` | `TicketStatus` | Default WAITING | Current ticket lifecycle status |
| `priority` | Int | Default 0 | Priority level (0 = normal; higher = served first) |
| `waitPosition` | Int | Not null | Queue position at time of issuance |
| `estimatedWaitMinutes` | Int? | Nullable | Estimated wait time at issuance |
| `issuedAt` | DateTime | Default now() | Ticket issuance timestamp |
| `calledAt` | DateTime? | Nullable | When the ticket was first called |
| `recalledAt` | DateTime? | Nullable | When the ticket was last recalled |
| `servedAt` | DateTime? | Nullable | When serving began |
| `completedAt` | DateTime? | Nullable | When service was completed |
| `noShowAt` | DateTime? | Nullable | When no-show was recorded |
| `businessDate` | DateTime | Not null | The business day this ticket belongs to (used for daily resets) |
| `customerPhone` | String? | Nullable | Optional phone number for future SMS |
| `createdAt` | DateTime | Default now() | Record creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Relations:**
- `service` → `Service` (many-to-one)
- `counter` → `Counter?` (many-to-one, nullable)
- `calledByOfficer` → `CounterOfficer?` (many-to-one, nullable)
- `events` → `TicketEvent[]` (one-to-many)
- `notifications` → `Notification[]` (one-to-many)

**Indexes:** `serviceId`, `counterId`, `status`, `businessDate`, `ticketNumber`

---

#### `TicketEvent`

Immutable audit trail of every state transition a ticket undergoes.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Record identifier |
| `ticketId` | String | FK → Ticket.id, not null | The affected ticket |
| `eventType` | `TicketEventType` | Not null | The type of event |
| `counterId` | String? | FK → Counter.id, nullable | Counter at time of event |
| `officerId` | String? | FK → CounterOfficer.id, nullable | Officer at time of event |
| `metadata` | Json? | Nullable | Additional event data (e.g., previous status) |
| `createdAt` | DateTime | Default now() | Event timestamp |

---

#### `DisplayBoard`

Configuration record for a main display screen instance.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Board identifier |
| `name` | String | Not null | Board name for admin reference |
| `isDefault` | Boolean | Default false | Whether this is the default board |
| `maxDisplayedTickets` | Int | Default 10 | Max recent tickets shown per counter |
| `announcementEnabled` | Boolean | Default true | Master switch for all announcements |
| `bellEnabled` | Boolean | Default true | Whether the bell chime plays |
| `ttsEnabled` | Boolean | Default true | Whether TTS announcements are made |
| `ttsLanguage` | String | Default "en-US" | BCP-47 language tag for TTS |
| `ttsRate` | Float | Default 1.0 | TTS speech rate (0.1 to 10) |
| `ttsPitch` | Float | Default 1.0 | TTS speech pitch (0 to 2) |
| `ttsVolume` | Float | Default 1.0 | TTS speech volume (0 to 1) |
| `announcementTemplate` | String | Default "Now serving ticket {number} at {counter}" | TTS announcement text template |
| `themeColor` | String? | Nullable | Custom primary color hex override |
| `logoUrl` | String? | Nullable | Custom logo URL |
| `customMessage` | String? | Nullable | Scrolling marquee message |
| `createdAt` | DateTime | Default now() | Record creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

---

#### `KioskConfig`

Configuration record for a self-service kiosk instance.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Kiosk identifier |
| `name` | String | Not null | Kiosk name for admin reference |
| `isActive` | Boolean | Default true | Whether the kiosk is operational |
| `welcomeMessage` | String? | Nullable | Greeting message on the kiosk home screen |
| `footerMessage` | String? | Nullable | Footer text on all kiosk screens |
| `printerName` | String? | Nullable | Target printer name for silent print |
| `autoResetSeconds` | Int | Default 30 | Inactivity timeout before resetting to home screen |
| `showEstimatedWait` | Boolean | Default true | Whether to show estimated wait on confirmation screen |
| `restrictedServiceIds` | Json? | Nullable | JSON array of service IDs visible at this kiosk (null = all services) |
| `createdAt` | DateTime | Default now() | Record creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

---

#### `DeviceToken`

FCM push notification device tokens registered by officer mobile devices or browsers.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Token record identifier |
| `counterOfficerId` | String | FK → CounterOfficer.id, not null | Token owner |
| `token` | String | Unique, not null | The FCM registration token |
| `platform` | `Platform` | Not null | Device platform |
| `deviceInfo` | Json? | Nullable | Optional device metadata (model, OS version) |
| `isActive` | Boolean | Default true | Whether this token is still valid |
| `lastUsedAt` | DateTime? | Nullable | Last successful notification delivery |
| `createdAt` | DateTime | Default now() | Token registration timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Indexes:** `token` (unique), `counterOfficerId`

---

#### `Notification`

A push notification record tracking dispatch to a specific officer.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Notification record identifier |
| `ticketId` | String | FK → Ticket.id, not null | The associated ticket |
| `counterOfficerId` | String | FK → CounterOfficer.id, not null | The recipient officer |
| `type` | `NotificationType` | Not null | Notification category |
| `title` | String | Not null | Notification title |
| `body` | String | Not null | Notification body text |
| `data` | Json? | Nullable | Structured payload (ticketId, serviceId, counterId, replyEndpoint) |
| `status` | `NotificationStatus` | Default PENDING | Delivery status |
| `fcmMessageId` | String? | Nullable | FCM-assigned message ID for tracking |
| `sentAt` | DateTime? | Nullable | Dispatch timestamp |
| `deliveredAt` | DateTime? | Nullable | Delivery confirmation timestamp |
| `readAt` | DateTime? | Nullable | Read confirmation timestamp |
| `createdAt` | DateTime | Default now() | Record creation timestamp |

**Relations:**
- `ticket` → `Ticket` (many-to-one)
- `counterOfficer` → `CounterOfficer` (many-to-one)
- `replies` → `NotificationReply[]` (one-to-many)

---

#### `NotificationReply`

An officer's reply message to a notification, which triggers display broadcast.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Reply identifier |
| `notificationId` | String | FK → Notification.id, not null | The notification being replied to |
| `counterOfficerId` | String | FK → CounterOfficer.id, not null | The replying officer |
| `message` | String | Not null, max 500 chars | The reply message text |
| `isDisplayBroadcast` | Boolean | Default false | Whether this reply was broadcast to the display board |
| `isSecurityBroadcast` | Boolean | Default false | Whether this reply was broadcast to the security officer |
| `broadcastAt` | DateTime? | Nullable | Timestamp of broadcast |
| `createdAt` | DateTime | Default now() | Reply creation timestamp |

**Relations:**
- `notification` → `Notification` (many-to-one)
- `counterOfficer` → `CounterOfficer` (many-to-one)
- `broadcastMessages` → `BroadcastMessage[]` (one-to-many)

---

#### `BroadcastMessage`

A message pushed to the display board and/or security officer screen.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Broadcast identifier |
| `message` | String | Not null | The message text to display |
| `senderOfficerId` | String | FK → CounterOfficer.id, not null | The officer who sent this |
| `senderDisplayName` | String | Not null | Display name at time of sending (denormalized) |
| `sourceReplyId` | String? | FK → NotificationReply.id, nullable | If triggered by a notification reply |
| `targetDisplayBoardId` | String? | FK → DisplayBoard.id, nullable | If targeting a specific board (null = all) |
| `targetSecurityUserId` | String? | FK → User.id, nullable | Specific security officer to receive this |
| `displayDurationSeconds` | Int | Default 10 | How long to show on the display board |
| `expiresAt` | DateTime? | Nullable | Message expiry (after which it is not shown) |
| `isActive` | Boolean | Default true | Whether the message is currently active |
| `createdAt` | DateTime | Default now() | Broadcast timestamp |

---

#### `QueueDailySnapshot`

Aggregated statistics for a single service on a single business day.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Snapshot identifier |
| `businessDate` | DateTime | Not null | The business day (midnight UTC) |
| `serviceId` | String | FK → Service.id, not null | The service |
| `totalIssued` | Int | Default 0 | Total tickets issued |
| `totalServed` | Int | Default 0 | Total tickets successfully served |
| `totalNoShow` | Int | Default 0 | Total no-show tickets |
| `totalCancelled` | Int | Default 0 | Total cancelled tickets |
| `totalWaiting` | Int | Default 0 | Remaining waiting at day close |
| `averageWaitMinutes` | Float? | Nullable | Average customer wait time |
| `averageServiceMinutes` | Float? | Nullable | Average serving time per ticket |
| `peakHour` | Int? | Nullable | Hour of day (0-23) with most tickets called |
| `createdAt` | DateTime | Default now() | Snapshot creation timestamp |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |

**Constraints:** Composite unique on `(businessDate, serviceId)`

---

#### `AuditLog`

System-wide immutable audit trail for sensitive actions.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Log entry identifier |
| `userId` | String? | FK → User.id, nullable | User who performed the action (null for system actions) |
| `userDisplayName` | String? | Nullable | Display name at time of action (denormalized) |
| `action` | String | Not null | Action key e.g. `TICKET_CALLED`, `COUNTER_CLOSED`, `USER_CREATED` |
| `entity` | String | Not null | Entity type e.g. `Ticket`, `Counter`, `User` |
| `entityId` | String? | Nullable | The affected entity's ID |
| `before` | Json? | Nullable | Entity state before the action |
| `after` | Json? | Nullable | Entity state after the action |
| `ipAddress` | String? | Nullable | Request IP address |
| `userAgent` | String? | Nullable | Request user agent string |
| `createdAt` | DateTime | Default now() | Action timestamp |

**Indexes:** `userId`, `action`, `entity`, `createdAt`

---

#### `SystemSetting`

Key-value store for system-wide configuration parameters.

| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | String | PK, default cuid() | Setting identifier |
| `key` | String | Unique, not null | Setting key e.g. `queue.daily_reset_time`, `notification.default_enabled` |
| `value` | String | Not null | Setting value (stored as string) |
| `type` | `SettingType` | Not null | Value type for deserialization |
| `description` | String? | Nullable | What this setting controls |
| `isPublic` | Boolean | Default false | If true, exposed to unauthenticated clients (e.g., kiosk) |
| `updatedAt` | DateTime | @updatedAt | Last update timestamp |
| `updatedById` | String? | FK → User.id, nullable | Admin who last changed this setting |

---

### 8.3 Relationship Summary Diagram (Text)

```
User ──< UserRole >── Role ──< RolePermission >── Permission

User ──── CounterOfficer ──── Counter ──< CounterService >── Service
                │                │
                │                └──< Ticket ──< TicketEvent
                │                         │
                │                         └──< Notification ──< NotificationReply
                │                                                      │
                └──< DeviceToken                                       └──< BroadcastMessage
                └──< NotificationReply
                └── CounterStatusEvent

Service ──< QueueDailySnapshot

(Standalone)
DisplayBoard
KioskConfig
AuditLog
SystemSetting
RefreshToken ──── User
Session ──── User
Account ──── User
```

---

## 9. API Architecture & Endpoint Registry

All API routes follow REST conventions. JSON is the transport format for all requests and responses. All authenticated endpoints require a valid `Authorization: Bearer {accessToken}` header except where noted.

### 9.1 Response Envelope

All API responses follow this structure:

```
Success:  { success: true,  data: <payload>,  meta?: <pagination/metadata> }
Error:    { success: false, error: { code: string, message: string, details?: any } }
```

### 9.2 Standard Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `UNAUTHORIZED` | 401 | No valid authentication token |
| `FORBIDDEN` | 403 | Authenticated but lacks permission |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed Zod validation |
| `CONFLICT` | 409 | Unique constraint violation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 9.3 Endpoint Registry

| Method | Path | Auth Required | Permission | Description |
|---|---|---|---|---|
| POST | `/api/auth/[...nextauth]` | No | — | NextAuth handler (login, logout) |
| POST | `/api/auth/refresh` | Refresh token | — | Obtain new access token |
| POST | `/api/auth/mobile/login` | No | — | Mobile app credential login |
| GET | `/api/counters` | Yes | `counter:read` | List all counters |
| POST | `/api/counters` | Yes | `counter:manage` | Create a new counter |
| GET | `/api/counters/[id]` | Yes | `counter:read` | Get counter detail |
| PATCH | `/api/counters/[id]` | Yes | `counter:manage` | Update counter |
| DELETE | `/api/counters/[id]` | Yes | `counter:manage` | Delete/deactivate counter |
| PATCH | `/api/counters/[id]/status` | Yes | `counter:close` | Toggle counter open/close |
| GET | `/api/counters/[id]/services` | Yes | `counter:read` | List services for counter |
| POST | `/api/counters/[id]/services` | Yes | `counter:manage` | Assign service to counter |
| DELETE | `/api/counters/[id]/services` | Yes | `counter:manage` | Remove service from counter |
| GET | `/api/services` | Yes | `service:read` | List all services |
| POST | `/api/services` | Yes | `service:manage` | Create a new service |
| GET | `/api/services/[id]` | Yes | `service:read` | Get service detail |
| PATCH | `/api/services/[id]` | Yes | `service:manage` | Update service |
| DELETE | `/api/services/[id]` | Yes | `service:manage` | Delete/deactivate service |
| GET | `/api/tickets` | Yes | `ticket:view` | List queue tickets (filterable) |
| POST | `/api/tickets/issue` | No (kiosk) | — | Issue a new ticket |
| GET | `/api/tickets/[id]` | Yes | `ticket:view` | Get ticket detail |
| POST | `/api/tickets/[id]/call` | Yes | `counter:call` | Call a ticket to counter |
| POST | `/api/tickets/[id]/recall` | Yes | `counter:call` | Recall a previously called ticket |
| POST | `/api/tickets/[id]/no-show` | Yes | `counter:call` | Mark ticket as no-show |
| GET | `/api/officers/me` | Yes | — | Get current officer profile |
| PATCH | `/api/officers/me/notifications` | Yes | — | Toggle notification state |
| POST | `/api/notifications/devices/register` | Yes | — | Register FCM device token |
| DELETE | `/api/notifications/devices/[id]` | Yes | — | Remove device token |
| POST | `/api/notifications/[id]/reply` | Yes | `notification:reply` | Send officer reply |
| GET | `/api/users` | Yes | `user:manage` | List all users |
| POST | `/api/users` | Yes | `user:manage` | Create a new user |
| GET | `/api/users/[id]` | Yes | `user:manage` | Get user detail |
| PATCH | `/api/users/[id]` | Yes | `user:manage` | Update user |
| DELETE | `/api/users/[id]` | Yes | `user:manage` | Deactivate user |
| GET | `/api/reports` | Yes | `report:view` | Get analytics data |
| GET | `/api/reports/export` | Yes | `report:export` | Export report as CSV |
| GET | `/api/sse/[channel]` | Varies | Varies | SSE event stream |
| GET | `/api/health` | No | — | System health check |

---

## 10. Authentication & Authorization Architecture

### 10.1 Token Strategy

The system uses a **dual-token** JWT strategy:

**Access Token**
- Short-lived: 15 minutes
- Contains: `sub` (userId), `email`, `name`, `roles` (array of role names), `permissions` (flattened array of permission strings)
- Signed with `NEXTAUTH_SECRET`
- Transmitted via Authorization header or NextAuth session cookie

**Refresh Token**
- Long-lived: 7 days
- Stored hashed in the `RefreshToken` database table
- Transmitted via HttpOnly cookie
- Rotated on every use (new token issued, old token revoked)

### 10.2 Authentication Flow

1. User submits credentials to `/api/auth/[...nextauth]` (NextAuth credentials provider).
2. NextAuth validates credentials against the User table (bcrypt compare).
3. On success, NextAuth generates a JWT session. The JWT callback enriches the token with roles and permissions fetched from the database.
4. The custom `signIn` callback generates a refresh token, hashes it, stores it in `RefreshToken`, and sets it as an HttpOnly cookie.
5. The client receives the access token (embedded in the NextAuth session) and the refresh token cookie.
6. When the access token expires, the client calls `/api/auth/refresh`. The refresh endpoint validates the cookie token against the database record, checks expiry and revocation status, rotates the token (revokes old, issues new), and returns a new access token.

### 10.3 Mobile Authentication Flow

1. Android app POSTs credentials to `/api/auth/mobile/login`.
2. The endpoint validates credentials and returns: `{ accessToken, refreshToken, expiresIn }`.
3. The app stores these securely (Android Keystore / EncryptedSharedPreferences).
4. The app includes `Authorization: Bearer {accessToken}` in all API requests.
5. The app uses `refreshToken` in the request body to `/api/auth/refresh` when the access token expires.

### 10.4 RBAC Permission List

**Module: USER**
`user:read`, `user:create`, `user:update`, `user:delete`, `user:manage` (includes all user permissions)

**Module: COUNTER**
`counter:read`, `counter:create`, `counter:update`, `counter:delete`, `counter:manage`, `counter:call`, `counter:close`

**Module: SERVICE**
`service:read`, `service:create`, `service:update`, `service:delete`, `service:manage`

**Module: TICKET**
`ticket:issue`, `ticket:view`, `ticket:manage`

**Module: NOTIFICATION**
`notification:toggle`, `notification:reply`, `notification:broadcast`

**Module: REPORT**
`report:view`, `report:export`

**Module: SYSTEM**
`system:configure`, `system:audit`

**Default Role-Permission Assignments:**

| Role | Permissions |
|---|---|
| SUPER_ADMIN | All permissions |
| ADMIN | All except `system:configure` |
| COUNTER_OFFICER | `counter:read`, `counter:call`, `counter:close`, `ticket:view`, `notification:toggle`, `notification:reply` |
| SECURITY_OFFICER | `ticket:view`, `notification:broadcast` |
| KIOSK | `ticket:issue`, `service:read` |

---

## 11. Real-Time Communication Architecture

### 11.1 SSE Channel Design

| Channel | Path | Auth | Who Subscribes | Events Received |
|---|---|---|---|---|
| Global | `/api/sse/global` | No (public) | Display boards, kiosks | `TICKET_CALLED`, `TICKET_RECALLED`, `TICKET_NO_SHOW`, `COUNTER_OPENED`, `COUNTER_CLOSED`, `BROADCAST_MESSAGE`, `DAILY_RESET` |
| Counter | `/api/sse/counter/[counterId]` | Yes (officer) | Counter officer client | `TICKET_QUEUED`, `QUEUE_UPDATED`, `COUNTER_STATUS_CHANGED`, `NOTIFICATION_RECEIVED` |
| Security | `/api/sse/security` | Yes (security officer) | Security officer screen | `BROADCAST_MESSAGE`, `OFFICER_REPLY` |

### 11.2 SSE Event Envelope Format

Every SSE event is a JSON string transmitted as the `data:` field of an SSE message, with the following structure:

```
{
  "type":      "<EventType string>",
  "id":        "<unique event ID>",
  "timestamp": "<ISO 8601 datetime>",
  "payload":   { <event-specific data> }
}
```

### 11.3 `TICKET_CALLED` Event Payload

```
{
  "ticketId":       "<id>",
  "ticketNumber":   "A005",
  "serviceName":    "General",
  "counterId":      "<id>",
  "counterName":    "Counter 2",
  "counterNumber":  2,
  "officerName":    "John Silva"
}
```

### 11.4 `BROADCAST_MESSAGE` Event Payload

```
{
  "broadcastId":    "<id>",
  "message":        "Please proceed to counter 3 urgently.",
  "senderName":     "Counter 2 - John Silva",
  "displaySeconds": 10
}
```

### 11.5 Heartbeat & Reconnection

The SSE manager sends a comment-type heartbeat `": heartbeat\n\n"` every 30 seconds to prevent proxy and load balancer timeouts. The client-side `useSSE()` hook implements automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s) on connection drop.

---

## 12. Audio Announcement System Architecture

### 12.1 Trigger Sequence

When a `TICKET_CALLED` or `TICKET_RECALLED` SSE event is received on the Display Board:

1. The event is added to the **announcement queue** (FIFO array held in component state).
2. If the queue processor is not already running, it starts.
3. The processor picks the first event from the queue.
4. **Stage 1 — Bell:** The Web Audio API loads and plays `bell.mp3` from `/sounds/bell.mp3`. The processor waits for the `ended` event on the audio element before proceeding.
5. **Stage 2 — TTS:** The `SpeechSynthesis` API is invoked with a constructed utterance string. The processor waits for the `onend` event of the `SpeechSynthesisUtterance` before proceeding.
6. The processor picks the next event from the queue and repeats from step 4.
7. When the queue is empty, the processor marks itself as idle.

### 12.2 Browser Audio Unlock

Modern browsers require a user gesture before audio playback is allowed. The Display Board, on first load, must show a full-screen overlay prompting the operator to click anywhere. This click unlocks the AudioContext for the session. The overlay must be dismissed before SSE events are displayed (to avoid missed announcements while audio is locked).

### 12.3 TTS Announcement Template

The announcement string is built from the `DisplayBoard.announcementTemplate` field. Available placeholders:

| Placeholder | Replaced With |
|---|---|
| `{number}` | Full ticket number (e.g., `A005`) |
| `{counter}` | Counter display name (e.g., `Counter 2`) |
| `{service}` | Service name (e.g., `General Inquiry`) |

Default template: `"Now serving ticket {number} at {counter}"`

---

## 13. Silent Printing Architecture

### 13.1 Problem Definition

The browser's native `window.print()` always shows the browser's print preview dialog. The kiosk must print thermal tickets without any dialog appearing.

### 13.2 Chosen Approach

A hidden `<iframe>` containing a dedicated printable ticket template is injected into the kiosk page DOM after ticket issuance. The iframe's `contentWindow.print()` is called, which triggers a print of only the iframe contents. On most modern browsers in kiosk mode (Chrome), this invokes the default printer directly without a dialog when combined with the following conditions:

- Chrome launched in `--kiosk-printing` mode (command-line flag)
- The default printer is pre-configured on the OS level
- The print CSS is tuned precisely to the thermal paper dimensions

### 13.3 Ticket Template Specification

The printable ticket template renders the following elements:
- Business logo (optional, from `KioskConfig`)
- Ticket number (large, bold)
- Service name
- Counter guidance text (e.g., "Please wait to be called")
- Estimated wait time (if `showEstimatedWait` is true)
- Issue datetime
- QR code (future: for mobile check-in) — placeholder space reserved

Print CSS targets 80mm paper width with `@page { size: 80mm auto; margin: 4mm; }`. A 58mm variant should also be defined.

---

## 14. Mobile Notification Architecture

### 14.1 FCM Integration Overview

Firebase Cloud Messaging (HTTP v1 API) is the notification delivery mechanism. The server communicates with FCM using a service account credential (JSON key file stored as environment variable). The `NotificationService` module wraps the FCM REST API call.

### 14.2 Notification Trigger Points

| Trigger | Recipients | Notification Content |
|---|---|---|
| New ticket issued for a service | All active, duty officers on counters handling that service, with notifications enabled | "New ticket [number] for [service]" |
| Ticket recalled | The officer who originally called the ticket | "Ticket [number] has been recalled" |
| Admin system message | All officers or a targeted officer | Message from admin |

### 14.3 FCM Notification Payload Structure

The `data` field of every FCM notification contains:

```
{
  "type":           "TICKET_ISSUED",
  "notificationId": "<id>",
  "ticketId":       "<id>",
  "ticketNumber":   "A005",
  "serviceId":      "<id>",
  "serviceName":    "General",
  "counterId":      "<id>",
  "counterName":    "Counter 2",
  "replyUrl":       "/api/notifications/<id>/reply"
}
```

This structure provides the Android app with all information needed to display a rich notification and compose a reply without additional API calls.

### 14.4 Invalid Token Cleanup

When FCM returns an `INVALID_REGISTRATION` or `UNREGISTERED` error for a device token, the `NotificationService` must immediately set that `DeviceToken.isActive = false`. This prevents continued failed dispatch attempts.

---

## 15. Security Architecture

### 15.1 Input Validation

Every API endpoint accepts and validates input using Zod schemas. Zod schemas are colocated in `src/schemas/`. Validation errors are returned as `VALIDATION_ERROR` with the Zod error details in `details`.

### 15.2 Authentication Security

- Passwords stored as bcrypt hashes (cost factor 12)
- Refresh tokens stored as SHA-256 hashes in the database (not plaintext)
- HttpOnly, Secure, SameSite=Strict cookies for refresh tokens
- JWT tokens signed with a strong random secret (minimum 256 bits)
- All authentication endpoints rate-limited (5 attempts per minute per IP)

### 15.3 Rate Limiting

| Endpoint Group | Limit | Window |
|---|---|---|
| Auth endpoints (`/api/auth/*`) | 10 requests | 1 minute |
| Ticket issuance (`/api/tickets/issue`) | 30 requests | 1 minute |
| Officer actions (call, recall, no-show) | 60 requests | 1 minute |
| SSE connections | 10 concurrent per IP | — |
| General API | 200 requests | 1 minute |

### 15.4 CORS

The API sets CORS headers to allow:
- Web app origin (same-origin in production)
- Android app: configured via `ALLOWED_MOBILE_ORIGINS` environment variable

### 15.5 Security Headers

The Next.js `next.config.ts` sets the following headers on all responses:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 16. Phase-by-Phase Strategic Overview

| Phase | Theme | Key Deliverables | Dependencies |
|---|---|---|---|
| **Phase 1** | Foundation | Auth, RBAC, Database, Project structure | None |
| **Phase 2** | Core Domain | Services, Counters, Ticket lifecycle, Kiosk, Printing | Phase 1 |
| **Phase 3** | Real-Time & Display | SSE infrastructure, Display board, Audio announcements | Phase 2 |
| **Phase 4** | Mobile & Notifications | FCM push, Device registration, Counter closure, Reply broadcast | Phase 3 |
| **Phase 5** | Production | Analytics, Security hardening, Audit log, PostgreSQL migration | Phase 4 |

**Critical Path:** Phases must be executed in sequence. No phase may be started until the preceding phase's sub-phases are complete and verified. Each task plan document (1.1.1 through 5.3.3) is a self-contained unit of implementation work.

---

## 17. Constraints & Decisions Log

This section records key architectural decisions, the reasons behind them, and any alternatives that were considered.

| Decision | Choice Made | Reason | Alternative Considered |
|---|---|---|---|
| Real-time transport | Server-Sent Events (SSE) | Works natively with Next.js App Router; no separate WebSocket server; sufficient for unidirectional server-to-client updates | WebSocket — requires separate server or workaround in Next.js |
| Database (dev) | SQLite via Prisma | Zero-config for development; Prisma makes switching to PostgreSQL trivial for production | PostgreSQL from day 1 — adds setup complexity for developers |
| Auth library | NextAuth.js v5 | Built for Next.js; handles session, JWT, and cookie management; reduces boilerplate | Custom JWT implementation — unnecessary complexity |
| Push notifications | Firebase Cloud Messaging | Industry standard for Android; reliable delivery; supports data-only payloads; free tier is sufficient | One Signal, AWS SNS — additional service dependency and cost |
| Silent printing | Chrome `--kiosk-printing` flag | Works without dialog in a controlled kiosk environment (Chrome OS or Windows kiosk mode) | QZ Tray — additional local agent software to install |
| State management | React built-in state + SSE | SSE already provides a reactive data stream; local state is sufficient per-view; avoids Zustand/Redux complexity | Zustand — would add value only if cross-component state sharing becomes complex |
| Multi-server SSE | In-process singleton (single server) | Sufficient for the initial deployment target | Redis Pub/Sub — documented as the upgrade path for horizontal scaling |
| ORM | Prisma | Type-safe, schema-first, excellent migration tooling, SQLite→PostgreSQL provider swap is one line | Drizzle ORM — newer, less ecosystem maturity; Kysely — too low-level |

---

*End of Master Plan Document — Version 1.0.0*

*This document is the sole source of truth for the Smart Queue Management System DDD document series. All 45 task plan documents (Phases 1–5, Sub-phases A–C, Tasks 1–3) must be derived from and remain consistent with the specifications defined herein.*
