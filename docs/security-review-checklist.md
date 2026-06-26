# Final Security Review Checklist

**Version:** 1.0.0
**Status:** Security Review
**Parent Document:** Master Plan §15, Sub-Phase 5.3.3

---

## 1. Overview

This checklist is the final security gate before production launch. It covers every security concern from the master plan Section 15. Execute this review against a staging environment that mirrors production. Any critical finding MUST be resolved before deploying to production.

**Who runs this:** The security reviewer (tech lead, DevOps, or dedicated security engineer).
**When:** Before every major production launch and after every major security-related change.
**Expected outcome:** No critical findings (zero CRITICAL items unchecked).

---

## 2. Authentication

- [ ] Every API endpoint requires authentication where expected. Public endpoints: `/api/auth/*`, `/api/tickets/issue`, `/api/sse/global`, `/api/sse/display-boards/snapshot/*`, `/api/health`, `/display`, `/kiosk`.
- [ ] The refresh token rotation works: old token revoked, new token issued on refresh.
- [ ] The 15-minute access token expiry is enforced (verify by waiting 16 minutes and testing).
- [ ] The 7-day refresh token expiry is enforced.
- [ ] The bcrypt password hashing uses cost factor 12 (verify in the seed script or user creation).
- [ ] No authentication bypass exists (test: access `GET /api/services` without a token — returns 401).
- [ ] The login endpoint is rate-limited: 11th request from same IP in 60 seconds returns 429.

---

## 3. Role-Based Access Control (RBAC)

- [ ] Every API endpoint enforces the correct permission via `withPermission()`.
- [ ] `PERMISSION_SYSTEM_AUDIT` is granted only to `SUPER_ADMIN` (verify via the database).
- [ ] `PERMISSION_SYSTEM_CONFIGURE` is granted only to `SUPER_ADMIN`.
- [ ] `PERMISSION_USER_MANAGE` is granted only to `SUPER_ADMIN`.
- [ ] No permission is granted to roles that shouldn't have it.
- [ ] The 401 vs 403 distinction is correct:
  - 401 UNAUTHORIZED = no valid session (not logged in).
  - 403 FORBIDDEN = has a session but lacks the required permission.

---

## 4. Security Headers

Verify: `curl -I https://staging.example.com/login`

- [ ] `X-Frame-Options: SAMEORIGIN` is present.
- [ ] `X-Content-Type-Options: nosniff` is present.
- [ ] `Referrer-Policy: strict-origin-when-cross-origin` is present.
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()` is present.
- [ ] Headers are applied globally via `next.config.ts` — verified on multiple routes.
- [ ] Headers are also verified from a real browser (Chrome DevTools → Network → Response Headers).

---

## 5. Rate Limiting

- [ ] Auth endpoint: 11th POST to `/api/auth/callback/credentials` in 1 min → 429.
- [ ] Ticket issuance: 31st POST to `/api/tickets/issue` in 1 min → 429.
- [ ] Officer actions: 61st POST to `/api/tickets/*/call` in 1 min → 429.
- [ ] SSE connections: 11th simultaneous GET to `/api/sse/global` → refused.
- [ ] The 429 response includes `Retry-After` header.
- [ ] The 429 response body: `{ success: false, error: { code: "RATE_LIMITED", message: "..." } }`.

---

## 6. CORS

- [ ] Request from an `ALLOWED_MOBILE_ORIGINS` origin returns `Access-Control-Allow-Origin` matching the origin.
- [ ] Request from an unauthorized origin does NOT return `Access-Control-Allow-Origin`.
- [ ] `Access-Control-Allow-Origin` is the actual origin, NOT `*` (with credentials).
- [ ] Preflight OPTIONS request returns 204 with the correct CORS headers.

---

## 7. Audit Log

- [ ] Every administrative action is written to the `AuditLog` table (verify by performing actions and checking the database).
- [ ] Audit log viewer at `/audit-log` renders all entries.
- [ ] Filters work: user, action, entity, date range.
- [ ] Viewing the audit log itself creates an `AUDIT_LOG_VIEWED` audit entry (no infinite loop — handled by the guard).

---

## 8. Secrets Management

- [ ] No secrets are committed to the repository (`git log --all -- .env` shows nothing).
- [ ] `.env.example` contains placeholders only — no real values.
- [ ] `.gitignore` excludes: `.env`, `.env.production`, `.env.local`, `*.pem`, `*.key`, `service-account.json`, `*-credentials.json`.
- [ ] `NEXTAUTH_SECRET` is at least 256 bits (44 characters in base64). Generated via `openssl rand -base64 32`.
- [ ] Database password is at least 16 characters. Generated, not handwritten.
- [ ] FCM service account JSON is stored in the secrets manager (not in the repo).

---

## 9. HTTPS

- [ ] All requests are served over HTTPS. HTTP requests redirect to HTTPS.
- [ ] HSTS header is set (optional but recommended — `Strict-Transport-Security: max-age=63072000`).
- [ ] TLS certificate is valid and auto-renewed (Let's Encrypt or managed).
- [ ] TLS version: minimum TLS 1.2; TLS 1.3 preferred.

---

## 10. Input Validation

- [ ] Every user input is validated with a Zod schema before reaching the database.
- [ ] No unvalidated input passes through to Prisma queries.
- [ ] Error messages do NOT leak internal details (no stack traces, no database errors in API responses).

---

## 11. SQL Injection Prevention

- [ ] All database queries use Prisma's parameterized queries.
- [ ] No raw SQL with string concatenation exists in the codebase.
- [ ] Query logging (5.2.2) shows no suspicious patterns.

---

## 12. Cross-Site Scripting (XSS) Prevention

- [ ] React's default output escaping is used throughout.
- [ ] No `dangerouslySetInnerHTML` without prior sanitization.
- [ ] User-generated content (broadcast messages, counter closure reasons) is sanitized.

---

## 13. Cross-Site Request Forgery (CSRF) Prevention

- [ ] NextAuth's CSRF token is used for all state-changing operations.
- [ ] The `SameSite` cookie attribute is set to `Strict` for the refresh token.

---

## 14. Dependency Vulnerabilities

- [ ] `yarn audit` shows no high or critical vulnerabilities.
- [ ] Dependencies are reasonably up to date (no major versions behind without reason).
- [ ] `yarn.lock` is committed to the repository.

---

## 15. Penetration Testing

Perform a basic manual penetration test:

- [ ] SQL injection attempt: submit `' OR 1=1 --` in login form fields → rejected by Zod validation.
- [ ] XSS attempt: submit `<script>alert(1)</script>` in a user-editable field → escaped by React.
- [ ] Auth bypass attempt: access `GET /api/services` without a token → 401.
- [ ] Auth bypass attempt: access `GET /api/services` with an expired JWT → 401.
- [ ] Rate limit bypass attempt: send 10 requests, wait 61 seconds, send 10 more → still within the window (429).
- [ ] IDOR attempt: modify `ticketId` in the URL to another user's ticket → 403 (permission check).

- [ ] No critical findings.

---

## 16. Compliance

- [ ] The system does not store PCI-DSS, HIPAA, or other regulated data. If it does, the compliance requirements are documented and met.
- [ ] Data retention policy is documented: audit logs are kept indefinitely; ticket data retained per operations policy.
- [ ] User data can be deleted upon request (GDPR "right to erasure") — verify the user deletion endpoint works.

---

## Result

| Date | Reviewer | CRITICAL | HIGH | MEDIUM | LOW | Notes |
| ---- | -------- | -------- | ---- | ------ | --- | ----- |
|      |          |          |      |        |     |       |

- **CRITICAL:** Must be fixed before production deployment.
- **HIGH:** Should be fixed; document if deferred.
- **MEDIUM:** Fix in the next release cycle.
- **LOW:** Nice to have; track in the backlog.

---

_End of Security Review Checklist — Version 1.0.0_
