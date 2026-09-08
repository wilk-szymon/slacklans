<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Minimal login

- **Plan**: context/changes/minimal-login/plan.md
- **Scope**: Phases 1–3 of 4
- **Date**: 2026-09-08
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Open-redirect bypass in callbackUrl helper

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/safe-callback-path.ts:15
- **Detail**: Plan requires redirect to `callbackUrl` only when it is a same-origin path. `safeCallbackPath` blocks `//`, `://`, and `\`, then returns the rest. It still allows control characters (tab, CR/LF) and encoded separators (`%2f` / `%5c`). Better Auth’s `isSafeRelativeURL` rejects those classes because WHATWG URL parsing strips tabs/newlines, so `/\t//evil.com` can collapse to a protocol-relative `//evil.com`. Login and register both `redirect(callbackUrl)` after a successful session. SameSite=Lax httpOnly cookies are not sent to the attacker origin, so this is post-login phishing, not session theft. Phase-3 fail-open chrome and `cache()` session reads from `a2ff8a7` are still in place and are not re-opened here.
- **Fix**: Tighten `safeCallbackPath` to match Better Auth: reject control characters, encoded path separators, and any value whose `new URL(value, origin)` is not same-origin.
- **Decision**: FIXED

### F2 — Public sign-up API enumerates emails

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/api/auth/[...all]/route.ts:4
- **Detail**: UI register errors are generic (`USER_ALREADY_EXISTS` is mapped to Polish generic copy in `auth-actions.ts`). The planned catch-all still exposes `POST /api/auth/sign-up/email`. With `autoSignIn: true` and verification off, Better Auth throws `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (422) for an existing address. `formCsrfMiddleware` skips origin checks on cookieless POSTs with no Origin/Referer/Fetch-Metadata, so curl can probe. Sign-in HTTP stays generic (`INVALID_EMAIL_OR_PASSWORD`). Plan copy rule was “must not say whether the email exists.”
- **Fix A ⭐ Recommended**: Add `/sign-up/email` to `disabledPaths`. Server-action `auth.api.signUpEmail` does not go through the HTTP `onRequest` 404 gate, so the Polish register form should keep working.
  - Strength: Closes the public probe without changing register UX or `autoSignIn`.
  - Tradeoff: Anything that later posts to the HTTP sign-up route (Better Auth client, docs snippets) will 404.
  - Confidence: HIGH — `disabledPaths` is already used for reset routes; HTTP `onRequest` is the only 404 gate.
  - Blind spot: Have not runtime-verified that `auth.api.signUpEmail` from a server action bypasses `disabledPaths`.
- **Fix B**: Keep the HTTP route and genericize duplicate-signup responses (wrapper around the catch-all, or `autoSignIn: false` so Better Auth itself returns a generic duplicate body).
  - Strength: Public HTTP sign-up remains available.
  - Tradeoff: A wrapper is extra surface; `autoSignIn: false` breaks “register sets a session cookie.”
  - Confidence: MEDIUM — generic-duplicate is a Better Auth flag tied to verification/autoSignIn, not a dedicated “hide enumeration” switch.
  - Blind spot: Have not checked whether a response-rewriting wrapper would break Better Auth’s own error shape.
- **Decision**: FIXED via Fix A

### F3 — Sign-up is not atomic on Neon HTTP

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/auth.ts:16
- **Detail**: `drizzleAdapter(..., { transaction: false })` is required for `drizzle-orm/neon-http` (no `db.transaction`). Better Auth hashes, `createUser`, then `linkAccount` with the scrypt hash. If the second write fails, a `user` row exists with no credential `account`. Login returns invalid credentials; register returns already-exists. That email cannot sign in or re-register. Uncommon two-request failure, but no repair path.
- **Fix A ⭐ Recommended**: Document as accepted Neon HTTP risk for this change; add a repair path only if a real lockout shows up.
  - Strength: Matches the planned neon-http client; no driver change before Phase 4.
  - Tradeoff: A rare partial sign-up can still burn an email.
  - Confidence: HIGH — `transaction: false` is the documented neon-http constraint.
  - Blind spot: Have not reproduced a mid-sign-up HTTP failure against Neon.
- **Fix B**: Switch to a Neon WebSocket `Pool` and enable adapter transactions.
  - Strength: Makes createUser+linkAccount atomic.
  - Tradeoff: Different connection model than the planned HTTP client; runtime/pooling implications on Vercel.
  - Confidence: MEDIUM — Pool+transactions is the usual fix, but it is a stack change.
  - Blind spot: Have not checked Vercel Hobby + `@neondatabase/serverless` Pool behavior in this app.
- **Decision**: FIXED via Fix B

### F4 — Logout is not fail-safe

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/auth-actions.ts:114
- **Detail**: `logout` awaits `auth.api.signOut` then `redirect("/")` with no try/catch. A Better Auth/DB error leaves the user on the current page still looking logged in. Unlike chrome, this is not a public-read path; the fail-open lesson does not apply.
- **Fix**: Catch sign-out failures and still `redirect("/")`.
- **Decision**: FIXED

### F5 — Migration 0001 adds NOT NULL issuer with no default

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: drizzle/0001_lush_wiccan.sql:1
- **Detail**: `ALTER TABLE "account" ADD COLUMN "issuer" text NOT NULL` has no `DEFAULT` and no backfill. PostgreSQL allows this only on an empty table; any `account` rows from `0000` make the migration fail. This repo applied `0001` in Phase 2 before register tests, so the current DB is fine. Replay against a DB that already has `0000` accounts would fail.
- **Fix**: Leave as-is unless you need to replay `0001` on a database that already has accounts; then add default or a two-step nullable → backfill → NOT NULL.
- **Decision**: FIXED (left as-is; 0001 already applied before account rows)
