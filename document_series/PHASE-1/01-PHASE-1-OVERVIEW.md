# Smart Queue Management System
## Phase 1 Overview — Foundation & Infrastructure

**Version:** 1.0.0
**Status:** Authoritative Reference for Phase 1
**Parent Document:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Series Position:** Phase 1 of 5
**Document Count:** 1 overview + 9 sub-phase task plan documents

---

## Table of Contents

1. [Phase 1 Strategic Context](#1-phase-1-strategic-context)
2. [Phase 1 Goals & Non-Goals](#2-phase-1-goals--non-goals)
3. [Phase 1 Deliverables Summary](#3-phase-1-deliverables-summary)
4. [Sub-Phase 1.1 — Project Initialization & Environment](#4-sub-phase-11--project-initialization--environment)
5. [Sub-Phase 1.2 — Authentication & Session Management](#5-sub-phase-12--authentication--session-management)
6. [Sub-Phase 1.3 — Role-Based Access Control (RBAC)](#6-sub-phase-13--role-based-access-control-rbac)
7. [Sub-Phase Dependency Map](#7-sub-phase-dependency-map)
8. [Cross-Cutting Standards for Phase 1](#8-cross-cutting-standards-for-phase-1)
9. [Phase 1 Exit Criteria & Phase 2 Hand-off](#9-phase-1-exit-criteria--phase-2-hand-off)

---

## 1. Phase 1 Strategic Context

Phase 1 is the **foundation phase** of the Smart Queue Management System. It is the only phase in the DDD series with **zero dependencies on prior phases** — every later phase (2 through 5) is fully dependent on what is built and verified here.

The strategic goal is straightforward but non-negotiable: **stand up a runnable, authenticated, role-aware Next.js application with a fully modelled database that every subsequent phase can build upon without rework.**

The decisions made in Phase 1 — how the project is structured, how authentication tokens are issued and rotated, how roles and permissions are wired through every layer — determine the trajectory of the entire 45-document series. A weak foundation here propagates rework across every later phase. A correct foundation enables Phase 2 onward to move quickly and confidently.

### 1.1 Why This Phase Exists Separately

Many DDD-style projects collapse "setup" and "first feature" into a single sprint. This series deliberately separates them because:

- The setup work has its own internal complexity (Prisma migrations, NextAuth wiring, RBAC seeding) that is easy to under-scope.
- Auth and RBAC are cross-cutting concerns — they touch every later route, component, and API. Getting them right once is far cheaper than retrofitting them.
- A clean, verified Phase 1 means Phase 2 onwards can focus purely on business domain logic.

### 1.2 Reference to the Master Plan

This overview document **does not redefine** the system-wide specifications. Every architectural, schema, API, and design detail is the responsibility of the [Master Plan](./00-MASTER-PLAN.md). Phase 1 task plan documents will reference the master plan sections they implement (for example, document 1.3.1 will implement Master Plan Section 10.4).

---

## 2. Phase 1 Goals & Non-Goals

### 2.1 Phase 1 Goals (Must Be Achieved)

1. A runnable Next.js 14+ application that boots without errors on a clean clone.
2. A complete Prisma schema covering all models defined in the master plan, applied via an initial migration against a local SQLite database.
3. A seeded database containing the full role catalogue, the full permission catalogue, default role-to-permission assignments, and a working super-admin user.
4. A working login flow that authenticates against the User table and issues an enriched JWT session.
5. A working refresh-token rotation system with database-backed revocation.
6. A protected route system (middleware + server-side guards + client-side hooks) that enforces the correct access rules for every role.
7. A basic admin user-management page that allows a super-admin to create, edit, deactivate, and assign roles to users.

### 2.2 Phase 1 Non-Goals (Explicitly Out of Scope)

The following are **deferred** to later phases and must not be implemented during Phase 1:

- Any queue, ticket, counter, or service business logic (Phase 2).
- Any real-time / SSE / display board / audio announcement features (Phase 3).
- Any push notification / FCM / mobile / counter-closure features (Phase 4).
- Any reporting / analytics / audit log viewer UI (Phase 5).
- Any PostgreSQL migration, rate limiting, or production hardening (Phase 5).
- Kiosk UI, display screen UI, or officer dashboard UI (Phases 2–4).
- OAuth / social login (the master plan provisions the Account table for this, but the implementation is future).

### 2.3 What "Done" Means for Phase 1

Phase 1 is complete when a fresh developer can:

1. Clone the repository, run the documented setup steps, and have a running application.
2. Log in as the seeded super-admin using the login page.
3. Open the user management page, create a new user, assign them a role, and log in as that new user.
4. Attempt to access an admin-only page as a non-admin user and be denied with the correct error response.
5. Wait 15 minutes, trigger a refresh, and observe the token rotation in the database.

---

## 3. Phase 1 Deliverables Summary

Phase 1 is decomposed into **3 sub-phases**, each containing **3 task plan documents**, for a total of **9 implementation documents**. Each task plan document is a self-contained unit of work that an AI agent can pick up and execute.

| Sub-Phase | Theme | Documents | Primary Outputs |
|---|---|---|---|
| 1.1 | Project Initialization & Environment | 1.1.1, 1.1.2, 1.1.3 | Running app, folder structure, complete database |
| 1.2 | Authentication & Session Management | 1.2.1, 1.2.2, 1.2.3 | Login flow, dual-token system, protected routes |
| 1.3 | Role-Based Access Control (RBAC) | 1.3.1, 1.3.2, 1.3.3 | Seeded roles/permissions, guards, user management UI |

The single most important property of Phase 1 is that **all three sub-phases are required to be complete before Phase 2 can begin**. In particular:

- Sub-Phase 1.3 depends on the User model and the auth flow from 1.1 and 1.2.
- The user management UI in 1.3.3 is the only Phase 1 deliverable that has a user-facing page beyond the login screen.

---

## 4. Sub-Phase 1.1 — Project Initialization & Environment

### 4.1 Purpose

Sub-Phase 1.1 takes the project from **"empty folder"** to **"runnable Next.js application connected to a fully modelled SQLite database"**. It establishes every structural, configuration, and tooling decision that later phases will inherit.

No business logic is built in this sub-phase. The only functional output is the database schema migration and seed, and the verification that the application boots and can connect to the database.

### 4.2 Why This Sub-Phase Comes First

The application cannot be authenticated (1.2) or role-gated (1.3) without:

- A working Next.js project with the correct folder structure.
- A database that has the User, Role, Permission, and related tables.
- Environment variable conventions that all later code will follow.

Sub-Phase 1.1 establishes all of this so that the next sub-phase can be implemented without revisiting any setup decision.

### 4.3 Document Breakdown

#### Document 1.1.1 — Environment Setup & Toolchain Configuration

**Scope:** The developer workstation and the project root configuration files that exist before any code is written.

**What this document covers:**

- The required Node.js version range and how to verify it.
- Yarn as the package manager (specified by the master plan) — configuration, version, and `.yarnrc` conventions.
- The creation of the initial Next.js 14+ project with the App Router, TypeScript, and Tailwind CSS, using the official scaffolder.
- ESLint configuration: the Next.js default ESLint setup extended with any project-specific rules needed (import ordering, unused-import enforcement, naming conventions for domain folders).
- Prettier configuration: print width, tab/spaces, single vs double quotes, and the Prettier–ESLint integration that disables conflicting ESLint formatting rules.
- Husky and lint-staged (or equivalent) setup so that pre-commit hooks enforce linting and formatting.
- The `.env`, `.env.example`, and `.env.local` conventions: which file is committed, which is gitignored, and the initial variable list (database URL, NextAuth secret placeholder, NextAuth URL, application environment).
- The root `package.json` scripts: `dev`, `build`, `start`, `lint`, `format`, `type-check`, `prisma:generate`, `prisma:migrate`, `prisma:seed`, and the corresponding `db:*` aliases.
- A `.gitignore` that excludes `.env*`, `node_modules`, `.next`, Prisma generated client, build output, and OS metadata files.

**Outcome:** A clone of the repository, after running the documented install step, can run `yarn dev` and see the default Next.js welcome page. All linting, formatting, and pre-commit hooks are operational.

**Master Plan sections implemented:** Sections 3.1, 3.4, and the project root portion of Section 7.

---

#### Document 1.1.2 — Next.js Project Scaffold & Folder Architecture

**Scope:** The full directory tree defined in the master plan, the routing structure, the path aliases, the global layout, and the Tailwind theme extension.

**What this document covers:**

- Creation of every folder listed in the master plan's Section 7: `app/` with all route groups `((auth)`, `(dashboard)`, `(officer)`, `(display)`, `(kiosk)`, `(security)`) and the `api/` sub-tree, plus all `components/`, `lib/`, `hooks/`, `types/`, and `schemas/` directories.
- Route group organization: route groups are used to apply distinct layouts without affecting URLs. The `(auth)` group is unauthenticated and renders a centred card. The `(dashboard)` group is the authenticated admin layout with sidebar and top bar. The `(officer)` group is the officer layout. `display`, `kiosk`, and `security` are public/auth-specific views.
- Path aliases in `tsconfig.json` to support clean imports: `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/schemas`, `@/app`. These aliases are mandatory because every later phase will use them.
- The root `app/layout.tsx` (global HTML, body, font loading, global metadata).
- The `app/globals.css` Tailwind directives plus any global CSS resets.
- The Tailwind `tailwind.config.ts` extension: the full colour token system from the master plan's Section 6.2 must be defined as `theme.extend.colors` so that every component can use the design tokens (e.g., `bg-primary`, `text-text-primary`, `bg-display-bg`).
- Font configuration: either a self-hosted font from `public/fonts/` or a Google Font via `next/font` for the application's primary typeface.
- The placeholder pages: each route group must have at least a minimal `page.tsx` so the routes resolve. These are temporary placeholders that later phases will replace. Examples: `(auth)/login/page.tsx` shows a static "Login" heading, `(dashboard)/page.tsx` shows a static "Dashboard" heading, etc.
- The `app/(dashboard)/layout.tsx` and `app/(auth)/layout.tsx` must be created with the structural composition (sidebar + top bar for dashboard, centred card for auth), but with stub content.
- The shadcn/UI initialization: `components.json` creation, the initial component set (button, card, input, label, form, dialog, table, toast, badge, dropdown-menu, separator, select, switch), and the `lib/utils.ts` `cn()` helper that shadcn requires.

**Outcome:** Every folder and route from the master plan exists, every route renders a placeholder page, the Tailwind theme tokens are available, and shadcn/UI is ready to be used by later phases. The application still has no real business logic.

**Master Plan sections implemented:** Section 7 (folder structure) and Section 6.2 (colour tokens).

---

#### Document 1.1.3 — Prisma Setup & Initial Database Configuration

**Scope:** The complete Prisma schema, the initial migration, the Prisma client singleton, and the database seed script.

**What this document covers:**

- Prisma installation and the `prisma` and `@prisma/client` dependencies in `package.json`.
- The `prisma/schema.prisma` file, fully written to contain:
  - The datasource block pointing to SQLite with the URL read from `DATABASE_URL`.
  - The generator block emitting the Prisma client into `node_modules/@prisma/client` (or a custom path as preferred).
  - **Every enum and every model from the master plan's Section 8**, in dependency order, with all fields, types, defaults, relations, indexes, and unique constraints exactly as specified. This is the single most important output of document 1.1.3 — the schema must match the master plan verbatim.
- The initial migration: running `prisma migrate dev` to produce the first migration file containing the full schema. The migration file must be committed to the repository.
- The `lib/db.ts` Prisma client singleton: a module-scope variable holds the client to prevent hot-reload connection exhaustion in development, and a conditional global is used in non-production environments.
- The seed script (`prisma/seed.ts`): its job in Phase 1 is to insert the default system roles, the default permissions, the default role-to-permission assignments, and a default super-admin user. The full RBAC seed specification (which roles, which permissions, which mapping) is delegated to document 1.3.1 — document 1.1.3 is responsible only for the **plumbing** of the seed script (how it is wired, how it runs, how the package.json `prisma.seed` field is configured).
- The `prisma db seed` configuration in `package.json` so that `yarn prisma:seed` runs the seed script.
- A verification step: a small script or command that opens a Prisma client, performs a trivial query (e.g., counts users, counts roles), and confirms that the database is reachable and the seed has run.

**Outcome:** The SQLite database file is created, all tables from the master plan exist, the seed script runs cleanly, and the application can perform Prisma queries at runtime. Documents 1.2 and 1.3 depend on this state.

**Master Plan sections implemented:** Section 8 (entire database schema), and the Prisma-related portions of Section 3.2 and Section 4.1.

---

### 4.4 Sub-Phase 1.1 Exit Criteria

Sub-Phase 1.1 is complete when:

1. `yarn install` succeeds on a clean clone.
2. `yarn prisma:migrate` applies the initial migration without error.
3. `yarn prisma:seed` succeeds and populates roles, permissions, and the super-admin user.
4. `yarn dev` starts the application, and all listed routes return 200 with their placeholder content.
5. ESLint and Prettier pass on the entire codebase.
6. The Tailwind theme tokens render correctly (a temporary page using `bg-primary` and `text-display-bg` confirms).

---

## 5. Sub-Phase 1.2 — Authentication & Session Management

### 5.1 Purpose

Sub-Phase 1.2 takes the application from **"any visitor can access any page"** to **"only authenticated users with valid tokens can access protected pages, and tokens are issued, validated, and rotated correctly"**.

It does not (yet) decide what an authenticated user is *allowed* to do — that is Sub-Phase 1.3. Sub-Phase 1.2 establishes identity and session continuity.

### 5.2 Why This Sub-Phase Comes Before RBAC

Authentication must work before authorization. The RBAC system in 1.3 needs to know "who is the current user?" on every protected request. That requires:

- A working login flow that produces a verifiable identity.
- A way to attach that identity to subsequent requests.
- A way to refresh that identity when it expires.

These three requirements are exactly the scope of Sub-Phase 1.2.

### 5.3 Document Breakdown

#### Document 1.2.1 — NextAuth Configuration & JWT Strategy

**Scope:** The NextAuth.js v5 setup, the credentials provider, the JWT callback enrichment, and the access-token payload structure.

**What this document covers:**

- NextAuth.js v5 installation: `next-auth` and the Prisma adapter (`@auth/prisma-adapter`) as dependencies. The master plan's Section 3.2 specifies NextAuth — document 1.2.1 implements this.
- The `lib/auth.ts` file: the NextAuth configuration object with:
  - The Prisma adapter wired to the `lib/db.ts` client.
  - The credentials provider configured to accept email and password, look up the user in the `User` table, and verify the password using bcrypt compare.
  - The session strategy set to `jwt` (not database sessions) to support the custom token model.
  - The `signIn` callback that runs on successful credential verification. It is responsible for creating the refresh-token record (full refresh-token logic is delegated to 1.2.2; document 1.2.1 only ensures the callback hook exists and the refresh token cookie is set).
  - The `jwt` callback that runs on every JWT issuance and refresh. It must enrich the token with: `userId`, `email`, `name`, `roles` (array of role names), and `permissions` (flattened array of permission strings). Roles and permissions are read from the database at sign-in time. On subsequent calls (when the token already has them), the callback returns the token unchanged to avoid extra database hits.
  - The `session` callback that shapes the session object exposed to the client. The client must receive `userId`, `roles`, and `permissions` for the RBAC client hooks (document 1.3.2) to work.
- The `app/api/auth/[...nextauth]/route.ts` handler that exposes NextAuth's REST endpoints.
- The environment variables consumed by NextAuth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (or `AUTH_URL` in NextAuth v5), with a documented local-dev default and a strong-secret generation recommendation for production.
- The access token expiry window: 15 minutes (from the master plan's Section 10.1). The JWT's `exp` claim must reflect this.
- A small, non-production verification approach: a temporary route or script that signs in as the seeded super-admin and prints the resulting session shape, to confirm the JWT enrichment is working.

**Outcome:** A user can submit valid credentials to the login page (or directly to NextAuth) and receive a session that contains their `userId`, `roles`, and `permissions`. The session is signed and verifiable.

**Master Plan sections implemented:** Sections 3.2, 10.1, 10.2, and 10.3 (mobile login endpoint is specified here but implemented in document 1.2.2 for the refresh side; the mobile login route itself is part of document 1.2.2 since it returns both access and refresh tokens).

---

#### Document 1.2.2 — Access Token & Refresh Token Implementation

**Scope:** The full dual-token model — refresh token generation, hashing, storage, rotation, revocation, and the refresh endpoint.

**What this document covers:**

- The refresh-token utility functions in `lib/auth-utils.ts`:
  - A function to generate a cryptographically secure random refresh token string.
  - A function to hash that string (using SHA-256) before database storage.
  - A function to validate an incoming refresh token: hash the incoming value, look up the matching record, check `isRevoked === false` and `expiresAt > now`, and return the associated user.
  - A function to revoke a refresh token: mark `isRevoked = true`, set `revokedAt`, and optionally link `replacedByToken` to the new token in the rotation chain.
  - A function to issue a new access-token JWT (signed with `NEXTAUTH_SECRET`, expiring in 15 minutes, with the enriched payload).
- The refresh token's expiry window: 7 days (from the master plan's Section 10.1).
- The cookie strategy: the refresh token is set as an `HttpOnly`, `Secure`, `SameSite=Strict` cookie. In development (HTTP), `Secure` is omitted; the configuration must be environment-aware.
- The `app/api/auth/refresh/route.ts` endpoint: accepts a request containing the refresh token (from cookie or body), validates it, rotates it (revoke old, create new), and returns a new access token plus sets a new refresh token cookie.
- The mobile login endpoint: `app/api/auth/mobile/login/route.ts`. This endpoint accepts credentials in the request body (email + password), validates them, and returns a JSON response containing the access token, the refresh token (in the response body — not a cookie, since mobile apps cannot set HttpOnly cookies), and the access-token expiry in seconds. This is the endpoint the future Android app will use. The mobile refresh flow (sending the refresh token in the body) is implemented here.
- The integration with the NextAuth `signIn` callback from document 1.2.1: on successful web sign-in, the callback invokes the refresh-token utilities to create a record and set the cookie.
- The integration with the NextAuth `jwt` callback from document 1.2.1: on every token refresh (when the access token is about to expire), the callback may call the refresh endpoint transparently. The simplest implementation is to handle this at the client side using the refresh endpoint.

**Outcome:** Refresh tokens are stored hashed in the database, are rotated on use, can be revoked, expire after 7 days, and the `/api/auth/refresh` endpoint can be called to obtain a new access token. The mobile login endpoint is fully functional.

**Master Plan sections implemented:** Sections 10.1, 10.2, 10.3, and the refresh/mobile portions of the API registry in Section 9.3.

---

#### Document 1.2.3 — Authentication UI & Protected Routes

**Scope:** The login page UI, the Next.js middleware for route protection, the unauthenticated-redirect logic, and the session-aware layout foundation.

**What this document covers:**

- The `app/(auth)/login/page.tsx` login page: a centred card layout using shadcn `Card`, `Input`, `Label`, and `Button` components. Fields for email and password, a submit button, error-state display (using shadcn `Alert` or inline error text), and a loading state during submission. The form posts to the NextAuth credentials provider's `signIn` action.
- The login form validation using a Zod schema in `schemas/auth.schema.ts` (the schema validates email format and non-empty password on the client; the same schema is reused on the server if needed).
- The `middleware.ts` file at the project root: a Next.js middleware that:
  - Inspects the session cookie on every request to a protected route.
  - Redirects unauthenticated users to `/login` with a `callbackUrl` query parameter.
  - For role-aware redirect (in this sub-phase: only authentication is checked, not roles — role enforcement is added in 1.3.2).
  - Allows the unauthenticated routes `/login`, `/display/*`, `/kiosk/*`, `/api/auth/*`, `/api/sse/*`, `/api/tickets/issue`, and `/api/health` to pass through.
- The `app/(dashboard)/layout.tsx` is updated to be session-aware: it reads the server session, and if no session exists, it triggers a redirect to `/login`. This is a defence-in-depth measure alongside the middleware.
- The `lib/auth.ts` (or a new `lib/session.ts`) exposes a `getServerSession()` helper that returns the typed session for use in server components and server actions.
- The sign-out flow: a "Logout" button in the dashboard layout that calls the NextAuth sign-out action and clears the session.
- After successful sign-in, the user is redirected to `/` (or `callbackUrl` if present). The dashboard's home page can be a simple "Welcome, {name}" placeholder for now.
- A basic loading state for the login form: the submit button is disabled and shows a spinner while the sign-in request is in flight.

**Outcome:** The login page is functional and styled according to the master plan's design system. Unauthenticated users are redirected to login when they try to access any protected route. Logging in takes the user to the dashboard placeholder. Logging out returns the user to the login page.

**Master Plan sections implemented:** Section 6.4 (login card layout), Section 6.2 (colour tokens applied), and the session-aware portions of Section 4.2.

---

### 5.4 Sub-Phase 1.2 Exit Criteria

Sub-Phase 1.2 is complete when:

1. The seeded super-admin can log in via the login page and be redirected to the dashboard.
2. The session received by the client contains `userId`, `roles`, and `permissions`.
3. An unauthenticated user attempting to access `/` is redirected to `/login`.
4. After 15 minutes (or by manipulating the token's `exp`), the refresh endpoint successfully issues a new access token and rotates the refresh token.
5. The previous refresh token is marked as revoked in the database.
6. Logging out clears the session and returns the user to the login page.
7. The mobile login endpoint returns the expected access/refresh token JSON payload.

---

## 6. Sub-Phase 1.3 — Role-Based Access Control (RBAC)

### 6.1 Purpose

Sub-Phase 1.3 takes the application from **"we know who you are"** to **"we know what you are allowed to do"**. It defines the full role and permission catalogue, wires enforcement through every layer of the application, and provides the user management interface that administrators will use.

This is the final sub-phase of Phase 1. After it completes, the application is fully role-aware and the user-management foundation is in place for every later phase to plug into.

### 6.2 Why This Sub-Phase Closes Phase 1

Every later phase (2 through 5) will need to:

- Display UI conditionally based on the user's permissions (e.g., only show the "Reports" link to users with `report:view`).
- Guard API routes against unauthorised access (e.g., only allow users with `ticket:manage` to delete tickets).
- Audit who did what (the AuditLog table from the master plan — written to in 5.2.3 — needs a populated `users` table with correct role assignments to be meaningful).

Sub-Phase 1.3 establishes the seed data, the enforcement layer, and the user management UI to make all of this possible.

### 6.3 Document Breakdown

#### Document 1.3.1 — Role & Permission Data Seeding

**Scope:** The full RBAC data catalogue and the seed logic that populates it.

**What this document covers:**

- The complete **role catalogue** as defined in the master plan's Section 10.4:
  - `SUPER_ADMIN` — system role, all permissions.
  - `ADMIN` — system role, all permissions except `system:configure`.
  - `COUNTER_OFFICER` — `counter:read`, `counter:call`, `counter:close`, `ticket:view`, `notification:toggle`, `notification:reply`.
  - `SECURITY_OFFICER` — `ticket:view`, `notification:broadcast`.
  - `KIOSK` — `ticket:issue`, `service:read`.
  - (Additional roles may be added in future phases — the seed design must allow extension.)
- The complete **permission catalogue** as defined in the master plan's Section 10.4, grouped by module:
  - Module `USER`: `user:read`, `user:create`, `user:update`, `user:delete`, `user:manage`.
  - Module `COUNTER`: `counter:read`, `counter:create`, `counter:update`, `counter:delete`, `counter:manage`, `counter:call`, `counter:close`.
  - Module `SERVICE`: `service:read`, `service:create`, `service:update`, `service:delete`, `service:manage`.
  - Module `TICKET`: `ticket:issue`, `ticket:view`, `ticket:manage`.
  - Module `NOTIFICATION`: `notification:toggle`, `notification:reply`, `notification:broadcast`.
  - Module `REPORT`: `report:view`, `report:export`.
  - Module `SYSTEM`: `system:configure`, `system:audit`.
- The **role-to-permission mapping** (exactly as in the master plan's Section 10.4 default assignments table).
- The **system-locked roles**: `SUPER_ADMIN`, `ADMIN`, `COUNTER_OFFICER`, `SECURITY_OFFICER`, and `KIOSK` are all marked `isSystem = true` in the seed. System roles cannot be deleted via the user management UI (enforced in 1.3.3).
- The **default super-admin user** seeded with a known email and a documented default password (e.g., `admin@example.com` / `Admin@123` — the exact value is to be specified in the document). The password must be bcrypt-hashed. The document must also specify that **the default password must be changed immediately in any non-local environment** and that the seed script emits a clear warning to the console when a default credential is used.
- The seed script structure: idempotent (can be run multiple times without creating duplicates — uses `upsert` keyed on `Role.name` and `Permission.name`).
- The `prisma/seed.ts` script is updated by this document (or, more accurately, the substantive RBAC content of the seed is added here; the seed script's plumbing was set up in 1.1.3).

**Outcome:** Running `yarn prisma:seed` after a fresh migration results in a database with the full role catalogue, the full permission catalogue, the correct role-to-permission mappings, and a super-admin user that can be used to log in.

**Master Plan sections implemented:** Section 10.4 (full RBAC specification).

---

#### Document 1.3.2 — RBAC Middleware & API Guard

**Scope:** The enforcement layer for permissions, both on the server (API routes, server actions) and on the client (conditional UI rendering).

**What this document covers:**

- The `lib/permissions.ts` module: exports the permission string constants (e.g., `PERMISSION_USER_MANAGE = 'user:manage'`) so that the rest of the codebase references permissions by symbol rather than by string literal. This prevents typos and enables IDE refactoring.
- The `withPermission()` server-side guard: a higher-order function that wraps an API route handler or a server action. It accepts a permission string (or an array of permission strings — any-match or all-match) and returns a wrapper that:
  - Verifies the user is authenticated (returns `UNAUTHORIZED` if not).
  - Verifies the user has the required permission (returns `FORBIDDEN` if not).
  - Distinguishes between 401 and 403 according to the master plan's Section 9.2.
  - Passes the typed session into the wrapped handler.
- The `withRole()` companion guard: a similar wrapper that checks for a specific role by name (less commonly used but useful for system-locked role checks).
- The `usePermission()` client-side hook (in `hooks/usePermission.ts`): reads the current session's `permissions` array from the NextAuth `useSession()` hook and returns a function that accepts a permission string and returns a boolean. The hook is used to conditionally render UI elements.
- A `Can` component (or equivalent) that wraps children in a permission check, for declarative use in JSX (e.g., `<Can permission="user:manage">...</Can>`).
- Updating the Next.js `middleware.ts` from document 1.2.3 to add role-based route protection: certain route prefixes (e.g., `/users`, `/audit-log`, `/settings`, `/kiosk-config`) are accessible only to users with the appropriate role or permission. The middleware reads the session's permissions from the JWT and denies access to routes the user is not entitled to.
- The standard error response shape for unauthorised access: the master plan's Section 9.1 envelope `{ success: false, error: { code: 'UNAUTHORIZED' | 'FORBIDDEN', message, details? } }` with the corresponding HTTP status.
- Verification scenarios documented: a test page or temporary route that exercises the guards (e.g., a route that requires `user:manage` — a super-admin can access it, a counter officer cannot).

**Outcome:** A permission check is one function call away on the server (`withPermission('user:manage')(handler)`) and one component away on the client (`<Can permission="user:manage">...</Can>`). The middleware enforces role-based route access at the edge. The 401 vs 403 distinction is correct.

**Master Plan sections implemented:** Sections 9.1, 9.2, 10.1 (permission propagation in JWT), and 15 (security enforcement surface).

---

#### Document 1.3.3 — User Management Admin Panel

**Scope:** The user-facing UI for managing users and roles, plus the supporting API endpoints and audit logging hooks.

**What this document covers:**

- The API endpoints (in `app/api/users/route.ts` and `app/api/users/[userId]/route.ts`):
  - List users (with pagination and search by name/email).
  - Create a new user (with role assignment).
  - Get a single user.
  - Update a user (name, email, status, role assignments).
  - Deactivate a user (soft delete via `UserStatus.INACTIVE`).
- The **admin-initiated password reset flow**: an admin can set a new temporary password for any user. The new password is bcrypt-hashed. The document specifies that the temporary password is shown to the admin once (with a "copy and send securely to the user" warning) and never persisted in plaintext.
- The `app/(dashboard)/users/page.tsx` user listing page:
  - A `DataTable` of users with columns: name, email, status, roles, last updated, actions.
  - A search input that filters by name or email.
  - A "Create User" button that opens a dialog.
- The `app/(dashboard)/users/new/page.tsx` and `app/(dashboard)/users/[userId]/page.tsx` create/edit form pages:
  - Fields: name, email, password (create only / reset only), status (active, inactive, suspended), role multi-select.
  - Client-side validation using a Zod schema in `schemas/user.schema.ts`.
  - The role multi-select must display each role's display name and description.
  - System-locked roles must be marked as such in the UI (but can still be assigned — they just cannot be deleted).
- The route protection: both the pages and the API endpoints are guarded with `user:manage` permission (or `user:read` for the listing page). Non-admin users are denied.
- The audit log writes: every user management action (create, update, deactivate, role assignment change, password reset) writes an `AuditLog` entry. The AuditLog model is populated (the `lib/audit-log.ts` helper is created in this document, even though the audit log viewer UI itself is in Phase 5).
- The user table must show the user's roles clearly. A user can have multiple roles, and the permission set is the union of all assigned roles' permissions.
- Loading and error states: the listing page handles loading (skeleton rows), error (toast or alert), and empty (empty-state component) states. The form pages handle validation errors inline.

**Outcome:** A super-admin can open `/users`, see all users, create a new user with assigned roles, edit an existing user (changing roles or status), deactivate a user, and reset a user's password. Every action is audit-logged. A non-admin user cannot access this page (redirected to a 403 page or the dashboard home).

**Master Plan sections implemented:** Sections 6.4 (admin layout), 6.5 (`UserForm` and `UserTable` components), 8.2 (`User`, `Role`, `UserRole` model usage), 9.3 (user API endpoints), 10 (RBAC in action), and the `AuditLog` model from Section 8.2 (writes only — viewer UI is Phase 5).

---

### 6.4 Sub-Phase 1.3 Exit Criteria

Sub-Phase 1.3 is complete when:

1. Running `yarn prisma:seed` on a fresh database populates the full role and permission catalogue and a default super-admin user.
2. Logging in as the super-admin allows access to the user management page.
3. Creating a new user with the `COUNTER_OFFICER` role and then logging in as that user shows the correct session permissions.
4. The counter officer attempting to access `/users` is denied (403).
5. Updating a user's role takes effect on the user's next session refresh.
6. Deactivating a user prevents them from logging in (the credentials provider rejects them with a clear error).
7. Resetting a user's password allows them to log in with the new temporary password.
8. Every user management action produces an `AuditLog` entry (verifiable via a Prisma query in development).

---

## 7. Sub-Phase Dependency Map

The following diagram shows the build order of sub-phases and the inter-document dependencies. Documents on the same row can be developed in parallel only after the row above is complete; otherwise, they must be developed in sequence.

```
Sub-Phase 1.1 (Project & Database)
├── 1.1.1  Environment & Toolchain
├── 1.1.2  Next.js Scaffold & Folder Structure        (depends on 1.1.1)
└── 1.1.3  Prisma Schema & Initial Migration          (depends on 1.1.1, 1.1.2)

Sub-Phase 1.2 (Authentication)
├── 1.2.1  NextAuth & JWT Strategy                    (depends on 1.1.3)
├── 1.2.2  Refresh Token System                       (depends on 1.2.1)
└── 1.2.3  Login UI & Protected Routes                (depends on 1.2.1)

Sub-Phase 1.3 (RBAC)
├── 1.3.1  Role & Permission Seeding                  (depends on 1.1.3)
├── 1.3.2  RBAC Guards & Middleware                   (depends on 1.2.1, 1.3.1)
└── 1.3.3  User Management UI                         (depends on 1.2.3, 1.3.2)
```

**Critical Path:** `1.1.1 → 1.1.2 → 1.1.3 → 1.2.1 → 1.2.2 → 1.2.3 → 1.3.2 → 1.3.3`

Documents `1.2.3` and `1.3.1` can be developed in parallel after `1.2.1` and `1.1.3` are respectively complete. `1.3.3` is the final document and depends on essentially everything before it.

---

## 8. Cross-Cutting Standards for Phase 1

The following standards apply to **every** Phase 1 task plan document. They are not phase-specific features — they are conventions that every later document must follow, and Phase 1 sets the precedent.

### 8.1 Folder & File Naming

- All folders use kebab-case for multi-word names (e.g., `audit-log/`, `mobile-nav/`).
- All component files use PascalCase (e.g., `UserForm.tsx`, `CounterCard.tsx`).
- All non-component modules use camelCase (e.g., `auth-utils.ts`, `ticket-service.ts`).
- All type files use kebab-case with a `.types.ts` suffix when colocated (e.g., `auth.types.ts`).

### 8.2 Import Conventions

- All imports use the `@/` alias for project-internal paths.
- External package imports are listed first (alphabetically), then internal imports (grouped by `@/components`, `@/lib`, `@/hooks`, `@/types`, `@/schemas`).
- No deep relative imports (`../../../lib/...`) inside the `src/` tree — always use `@/`.

### 8.3 TypeScript Standards

- All exported functions and components have explicit type annotations.
- No `any` types in production code. Use `unknown` and narrow with type guards where the type cannot be statically determined.
- All API request and response types live in `src/types/api.types.ts` or a domain-specific `.types.ts` file.
- Discriminated unions are used for state machines (e.g., ticket status transitions).

### 8.4 Validation Standards

- Every form on the client has a Zod schema for client-side validation.
- The same Zod schema is reused on the server (where applicable) for server-side validation.
- Validation error responses use the master plan's `VALIDATION_ERROR` envelope with the Zod error details in `error.details`.

### 8.5 Error Handling Standards

- Server actions and API routes return the master plan's standard envelope (`{ success, data | error }`).
- Client-side error display uses shadcn `Toast` for transient errors and inline alerts for form-field errors.
- Every API route is wrapped in a try/catch that logs the error (in development) and returns `INTERNAL_ERROR` (in production) for unhandled exceptions.

### 8.6 Audit Logging Standard

- Every mutating action in user management (Sub-Phase 1.3) writes an `AuditLog` entry.
- The `lib/audit-log.ts` helper is the single entry point for audit log writes and is reusable by every later phase.
- Audit log writes must not block the main response — they are best-effort, and any failure in writing a log is logged to the console but does not fail the user-facing action.

### 8.7 Environment Variable Standards

- All environment variables are documented in `.env.example` (committed) with placeholder values and inline comments explaining each variable.
- The `.env` file is gitignored.
- All environment variable access goes through a single `lib/env.ts` (or similar) module that validates required variables at startup and throws a clear error if any are missing.
- Variable names follow the SCREAMING_SNAKE_CASE convention.

### 8.8 Git Commit Standards

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).
- Each task plan document corresponds to one or more commits. A single document may produce multiple commits, but a single commit should not span multiple documents.
- The initial migration file from 1.1.3 and the seed script from 1.3.1 are committed together in a single `feat: initial database schema and RBAC seed` commit.

---

## 9. Phase 1 Exit Criteria & Phase 2 Hand-off

### 9.1 Phase 1 Exit Criteria (The Complete Checklist)

Phase 1 is complete when **all** of the following are true:

#### Environment & Build
- [ ] `yarn install` succeeds on a clean clone.
- [ ] `yarn lint` passes with zero errors and zero warnings.
- [ ] `yarn type-check` passes with zero errors.
- [ ] `yarn build` produces a successful production build.
- [ ] `yarn dev` starts the application on the configured port and all placeholder pages are reachable.

#### Database
- [ ] `yarn prisma:migrate` applies the initial migration cleanly.
- [ ] `yarn prisma:seed` populates all roles, all permissions, all role-permission mappings, and the super-admin user.
- [ ] Every model from the master plan's Section 8 exists in the database with the correct columns and relations.
- [ ] All foreign-key constraints are in place.

#### Authentication
- [ ] The seeded super-admin can log in via the login page.
- [ ] The session received by the client contains `userId`, `roles`, and `permissions`.
- [ ] Unauthenticated access to any protected route redirects to `/login`.
- [ ] The refresh endpoint issues a new access token and rotates the refresh token correctly.
- [ ] Revoked refresh tokens are rejected.
- [ ] The mobile login endpoint returns the expected JSON payload.
- [ ] Logout clears the session.

#### RBAC
- [ ] All roles and permissions from the master plan's Section 10.4 are present in the database.
- [ ] A counter officer cannot access `/users` (denied with 403).
- [ ] A counter officer cannot call user management API endpoints (denied with 403).
- [ ] An unauthenticated request to a protected API returns 401, not 403.
- [ ] The `withPermission()` guard and the `<Can>` component are reusable and used in at least one place each.

#### User Management UI
- [ ] A super-admin can list, create, edit, deactivate, and password-reset users.
- [ ] Role assignment in the UI updates the user's effective permissions on the next session.
- [ ] Every user management action writes an `AuditLog` entry.
- [ ] The form validation works client-side and server-side.

### 9.2 What Phase 2 Will Assume

When Phase 2 begins, it assumes Phase 1 is fully complete and verified. Specifically, Phase 2 will assume:

- The project boots, builds, lints, and type-checks without errors.
- The database is in a known-good seeded state on every developer's machine.
- Every protected route is already auth-gated — Phase 2 features (services, counters, tickets) are added behind the existing `withPermission()` pattern.
- The `User` table has real users with real role assignments — Phase 2's counter officer assignments will reuse the `User` records created in 1.3.3.
- The `AuditLog` helper from 1.3.3 is available for Phase 2's audit log writes (e.g., service created, counter created, ticket issued).
- The shadcn/UI component library is fully initialised and ready to be used in Phase 2's service and counter management UIs.
- The Tailwind theme tokens (Section 6.2 of the master plan) are defined and working — Phase 2's UI components will use them.

### 9.3 What Phase 1 Should Not Touch

Phase 1 task plan documents must **not** introduce:

- Any service- or counter-related business logic (deferred to 2.1).
- Any ticket lifecycle code (deferred to 2.2 and 2.3).
- Any SSE, real-time, or display board code (deferred to Phase 3).
- Any FCM or push notification code (deferred to Phase 4).
- Any reporting or analytics code (deferred to Phase 5).
- Any rate limiting, security headers, or production hardening (deferred to 5.2).
- Any PostgreSQL migration code (deferred to 5.3).
- Any KioskConfig, DisplayBoard, or Notification table writes (these tables exist after the 1.1.3 migration, but they are not used by Phase 1).

If a Phase 1 task plan document finds itself needing any of the above, it is a signal that the sub-phase is over-scoped and the work should be deferred.

---

## 10. Phase 1 Document Map (Quick Reference)

| Doc ID | Title | Master Plan Sections Implemented |
|---|---|---|
| **1.1.1** | Environment Setup & Toolchain Configuration | 3.1, 3.4 |
| **1.1.2** | Next.js Project Scaffold & Folder Architecture | 6.2, 7 |
| **1.1.3** | Prisma Setup & Initial Database Configuration | 3.2, 4.1, 8 (all) |
| **1.2.1** | NextAuth Configuration & JWT Strategy | 3.2, 10.1, 10.2 |
| **1.2.2** | Access Token & Refresh Token Implementation | 10.1, 10.2, 10.3, 9.3 |
| **1.2.3** | Authentication UI & Protected Routes | 6.4, 4.2 |
| **1.3.1** | Role & Permission Data Seeding | 10.4 |
| **1.3.2** | RBAC Middleware & API Guard | 9.1, 9.2, 10.1, 15 |
| **1.3.3** | User Management Admin Panel | 6.4, 6.5, 8.2, 9.3, 10 |

---

*End of Phase 1 Overview Document — Version 1.0.0*

*This document is the authoritative overview for Phase 1 of the Smart Queue Management System DDD series. It is the parent reference for the 9 task plan documents listed in Section 10. All Phase 1 task plan documents must be derived from and remain consistent with this overview and the master plan.*
