<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Critical-path coverage

- **Plan**: context/changes/testing-critical-path-coverage/plan.md
- **Scope**: Phases 1–5 of 5
- **Date**: 2026-09-09
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 5 warnings 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Findings

### F1 — Catch-all route is not locked to the stripper

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/api/auth/[...all]/route.ts:7-13
- **Detail**: Risk #1 lives on HTTP JSON. Tests unit `withStrippedAuthJson` with a fake Response. Nothing imports the route or asserts the source still calls the wrapper. Reverting to `export const { GET, POST } = toNextJsHandler(auth)` leaves the suite green and puts `token` back on `/sign-in/email` and `/get-session`.
- **Fix A ⭐ Recommended**: Add a source-text lock that `route.ts` contains `withStrippedAuthJson` (same pattern as public-page `getSession` checks).
  - Strength: Cheap, no Neon, matches existing structural tests.
  - Tradeoff: Does not execute the handler.
  - Confidence: HIGH — same oracle class as Phase 4.
  - Blind spot: Would not catch wrapping the wrong methods.
- **Fix B**: Mock `@/lib/db` and call exported GET/POST with a stubbed inner handler.
  - Strength: Hits the actual export.
  - Tradeoff: More mock surface; Better Auth import-time DB.
  - Confidence: MEDIUM — import-time `getDb()` is fiddly.
  - Blind spot: Have not tried importing the route under Vitest.
- **Decision**: FIXED via Fix A — `src/app/api/auth/[...all]/route.test.ts` source-locks GET/POST to `withStrippedAuthJson`

### F2 — Root layout is not in the public `getSession` structural check

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/public-get-session-imports.test.ts:9-16
- **Detail**: Lesson: uncaught session lookup in shared chrome 500s the whole document. Tests lock `page.tsx`, `sesja/[id]/page.tsx`, and `SessionChrome`. `layout.tsx` currently mounts `SessionChrome` and does not call `getSession`, but adding `await getSession()` beside chrome would 500 `/` and `/sesja/[id]` while those tests stay green.
- **Fix**: Extend the source check to `src/app/layout.tsx` — must not contain `getSession`; may contain `SessionChrome`.
- **Decision**: FIXED — layout.tsx source-locked in `public-get-session-imports.test.ts`

### F3 — `disabledPaths` test reads the constant, not Better Auth config

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/auth-disabled-paths.test.ts:4-7
- **Detail**: Plan allowed a config assertion as a stand-in for HTTP 404. The extra module is asserted in isolation. `disabledPaths: []` in `auth.ts` with the constant left intact would reopen HTTP sign-up enumeration (archive F2) and the test would still pass.
- **Fix**: Source-lock `src/lib/auth.ts` for `disabledPaths: [...AUTH_DISABLED_PATHS]` (or mock DB and read `auth.options` if available).
- **Decision**: FIXED — `auth.ts` source-locked for `disabledPaths: [...AUTH_DISABLED_PATHS]`

### F4 — Array session-token shape is untested

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/strip-auth-secrets.test.ts:10-51
- **Detail**: Production recurses into arrays (`strip-auth-secrets.ts:23-25`), so `list-sessions` `[{ token }, …]` is stripped today. Tests only cover top-level and `session.token`. Deleting the array branch would still pass.
- **Fix**: Add a fixture `[{ token: CANARY_TOKEN, id: "s1" }]` and assert the token is gone.
- **Decision**: FIXED — array `list-sessions` fixture in `strip-auth-secrets.test.ts`

### F5 — Register enumeration mock never looks like an APIError

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/lib/auth-actions.test.ts:64-80
- **Detail**: Plan: duplicate-email must not leak `USER_ALREADY_EXISTS`. The mock is a plain object. `isAPIError` requires `APIError` name/instance, so `polishAuthError` always returns the generic register string and never inspects `body.code`. Password-not-echoed is a real oracle; enumeration class is not.
- **Fix**: Reject with `{ name: "APIError", body: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" } }` (or a real `APIError`) so the mapper is on the path.
- **Decision**: FIXED — register mock is `name: "APIError"`; duplicate-email and generic register share the same error class

### F6 — `passWithNoTests: true` left in after tests exist

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: vitest.config.mts:10
- **Detail**: Extra vs the Phase 1 contract. Needed for an empty suite. Deleting every `*.test.ts` would still exit 0.
- **Fix**: Remove `passWithNoTests` now that tests exist.
- **Decision**: FIXED — `passWithNoTests` removed from `vitest.config.mts`

### F7 — Proxy garbage-cookie case does not assert `next()`

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/proxy.test.ts:26-31
- **Detail**: Plan: garbage cookie → `NextResponse.next()`. Test only asserts it is not a login redirect. A 403 would pass. Write-gate oracle remains `createSession` + no insert.
- **Fix**: Assert no `Location` header (or status 200) for the garbage-cookie `/spot` request.
- **Decision**: FIXED — garbage-cookie and ungated `/` assert `location` is null

### F8 — `AUTH_DISABLED_PATHS` extracted to its own module

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: src/lib/auth-disabled-paths.ts:1-5
- **Detail**: Plan allowed a config assertion on the route or `auth.ts`. Extracting the array is a small extra file; production values match the three planned paths. Harmless if F3 is fixed.
- **Fix**: Keep the extract; tighten the test per F3. No need to inline it back.
- **Decision**: FIXED — extract kept; F3 already source-locks `auth.ts` spread

## Automated verification (this review)

- `npm run test:run` — PASS (8 files, 23 tests)
- `npm run lint` — PASS
- `package.json` has `test` / `test:run`; no `@testing-library`
- §6.1, §6.2, §6.4 not TBD; §6.3 TBD as planned
