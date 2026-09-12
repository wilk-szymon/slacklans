# Critical-path coverage Implementation Plan

## Overview

Bootstrap Vitest and lock test-plan Risks #1–#3 at unit/integration: auth JSON and action results must not carry passwords or session tokens; `createSession` must not persist without a live session; public chrome must fail-open when session lookup throws. Production changes are limited to stripping auth JSON secrets and extracting the existing chrome catch. The last phase fills cookbook §6 and backports test-plan §2.

## Current State Analysis

No test runner, no `test` script, 0 test files. `AGENTS.md` still forbids adding a runner unless asked.

Research (`context/changes/testing-critical-path-coverage/research.md`) grounded the three paths:

- **#1** — `login`/`register` return `{ error?: string }` and do not echo the password. The Better Auth catch-all still puts `token` / `session.token` in success JSON. HTTP sign-up is 404 via `disabledPaths`. Cooldown is an in-memory 5/30s `Map` on login only.
- **#2** — Sole write is `createSession` in `src/lib/spot-actions.ts`. It already calls `getSession()` before insert. `src/proxy.ts` checks cookie **presence** only. Server Actions are reachable without the `/spot` UI.
- **#3** — `SessionChrome` already try/catches `getSession`. Root layout mounts chrome on every route. `/` and `/sesja/[id]` do not call `getSession`. Vitest cannot render async Server Components. Document-level “page stays up” stays in rollout Phase 3 e2e.

`auth.ts` calls `getDb()` at import time. Tests that import auth must mock `@/lib/db` (or session/auth) first.

## Desired End State

`npm run test:run` is the local unit+integration gate. A canary password and a canary session token never appear in action return values or in `/api/auth/*` JSON. A logged-out or dead-session `createSession` does not insert `spot` or `event` (both write shapes). Chrome session load returns null on throw; public page modules stay session-free. Cookbook §6.1, §6.2, and §6.4 name location, naming, reference test, and run command. `AGENTS.md` points at the cookbook instead of forbidding a runner.

### Key Discoveries:

- Catch-all is `src/app/api/auth/[...all]/route.ts:1-4`. Better Auth `customSession` does not remove the top-level `token` on sign-in JSON. A pure JSON stripper on the Next handler covers both endpoints. Leave `Set-Cookie` alone.
- `createSession` insert shapes: existing `spotId` (`src/lib/spot-actions.ts:83-106`) vs new lat/lng transaction (`:109-141`). Gate is `:54-57`. `session.user.id` after the null check is not a gate.
- `getSession` (`src/lib/session.ts:5-9`) must stay throw-through so `/spot` stays fail-closed. Fail-open belongs only in chrome.
- Official Next 16 Vitest setup: `vitest.config.mts`, `vite-tsconfig-paths`, `@vitejs/plugin-react`. Do not RTL async Server Components (`node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`).
- Lesson: public chrome fail-open; gated pages fail-closed (`context/foundation/lessons.md`).

## What We're NOT Doing

- Playwright / e2e / RTL of `SessionChrome`, `/spot`, or `/sesja/[id]`
- GitHub Actions YAML or typecheck script (rollout Phase 4)
- Fail-open on `/logowanie` or `/rejestracja` (sibling hole, recorded only)
- Real Neon in this suite (insert spy / mocked `getDb`)
- Risks #4–#6 (map href, row wipe, Warsaw time)
- Polish copy snapshots, Leaflet/MapTiler pixels
- Using `customSession` as the only token fix
- Moving the chrome catch into `getSession`
- Happy-path logged-in `createSession` as a substitute for the no-row oracle
- Asserting current `LOGIN_ERROR` / `REGISTER_ERROR` strings as the oracle

## Implementation Approach

Cost × signal, one risk per test phase after the runner exists.

1. Install Vitest per Next 16 docs (skip Testing Library until a test actually renders). Default environment `node`. Colocate `*.test.ts` next to the unit.
2. Close the HTTP leak with a pure stripper wrapped around the catch-all GET/POST. Unit the stripper with canaries. Integration-test `login`/`register` return shape with mocked `auth.api` / `headers`. Unit cooldown 5/30s. Config-lock `disabledPaths` includes `/sign-up/email`.
3. Call `createSession` directly with `getSession → null` and a `getDb` insert spy — both write shapes. Unit `proxy`: no cookie → redirect; garbage cookie → `next()`.
4. Extract `loadChromeSession` (name may vary) used only by `SessionChrome`. Unit: throw → null. Structural test: `src/app/page.tsx` and `src/app/sesja/[id]/page.tsx` source text must not contain `getSession`.
5. Fill test-plan §6.1, §6.2, §6.4; backport §2 Source/guidance from research; keep §6.3 TBD for e2e.

## Critical Implementation Details

**JSON vs cookie.** The stripper rewrites JSON bodies only. It must not drop or rewrite `Set-Cookie`. Session continues to travel in the httpOnly cookie.

**Import-time DB.** `src/lib/auth.ts` calls `getDb()` at module load. Any test that imports `auth` or the catch-all route must `vi.mock("@/lib/db")` (and usually `next/headers`, `next/navigation`) before the import. A throw from `headers()` is not the gate under test.

**Fail-open locality.** Do not catch inside `getSession`. A shared throw-through helper keeps `/spot` and `createSession` fail-closed. `cache()` still memoizes rejection for sibling awaits on the same request.

**Do not RTL async Server Components.** Phase 1 oracles are function return values, insert spies, source-text imports, and stripped JSON — not rendered HTML. Cookieless + dead DB is a false pass for Risk #3.

## Phase 1: Vitest runner

### Overview

Add the official Next 16 Vitest harness and replace the AGENTS.md “no runner” rule so later phases can add colocated tests.

### Changes Required:

#### 1. Vitest config and scripts

**File**: `package.json`, `vitest.config.mts` (new)

**Intent**: Install the runner this rollout phase is supposed to bootstrap, with path aliases so `@/` works.

**Contract**: Dev dependencies: `vitest`, `@vitejs/plugin-react`, `jsdom`, `vite-tsconfig-paths`. Do not add `@testing-library/*` until a test renders UI. `vitest.config.mts` uses `tsconfigPaths()` + `react()`, `test.environment: "node"`, include `src/**/*.test.ts`. Scripts: `"test": "vitest"`, `"test:run": "vitest run"`. Automated gate is `npm run test:run`.

#### 2. Agent rule

**File**: `AGENTS.md`

**Intent**: Stop telling agents not to add a runner now that the suite exists.

**Contract**: Replace the sentence “No `test` script and no `*.test.*` files. Do not add a test runner unless asked.” with: Vitest is the runner; `npm run test:run` is the local gate; how to add a test lives in `context/foundation/test-plan.md` §6. Keep the `BEGIN:nextjs-agent-rules` block untouched.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` exits 0
- `package.json` has `test` and `test:run` scripts; `vitest.config.mts` exists
- `npm run lint` passes

#### Manual Verification:

- `AGENTS.md` no longer forbids a test runner and points at `test-plan.md` §6

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Secret leak (#1)

### Overview

Strip session tokens from Better Auth HTTP JSON. Prove action results never contain the submitted password or a session secret. Lock enumeration class and login cooldown without snapshotting Polish copy.

### Changes Required:

#### 1. JSON secret stripper

**File**: `src/lib/strip-auth-secrets.ts` (new) + colocated `src/lib/strip-auth-secrets.test.ts`

**Intent**: Own a pure function whose oracle is “canary token/password absent,” independent of Better Auth internals.

**Contract**: Given unknown JSON, return a deep copy with `token` and `session.token` removed, and any string equal to a provided canary password removed if present. Do not mutate the input. Unit tests: nested `session.token` gone; top-level sign-in `token` gone; unrelated fields kept; non-JSON / null passed through.

#### 2. Catch-all wrapper

**File**: `src/app/api/auth/[...all]/route.ts`

**Intent**: Apply the stripper to HTTP JSON so `/sign-in/email` and `/get-session` cannot put the session token on the wire. Cookies stay the transport.

**Contract**: Wrap the `GET`/`POST` from `toNextJsHandler(auth)`. After the inner handler, if the body is JSON, replace it with the stripped payload and preserve status and `Set-Cookie`. `disabledPaths` still includes `/sign-up/email`, `/reset-password`, `/request-password-reset`.

#### 3. Action-boundary tests

**File**: `src/lib/auth-actions.test.ts`, `src/lib/login-cooldown.test.ts` (new)

**Intent**: Prove the product login/register boundary matches the archive contract without using form e2e or copy snapshots.

**Contract**: Mock `next/headers`, `next/navigation`, and `@/lib/auth` (or `auth.api`). Call `login`/`register` with FormData containing a unique canary password.

- Failure return is `{ error: string }` only; body JSON.stringify does not contain the canary password, `BETTER_AUTH_SECRET`, or a session token.
- Unknown email + plausible password vs that path’s error class is indistinguishable from a generic failure (must not include `USER_ALREADY_EXISTS` or “user not found”).
- Password length &lt; 8 is allowed to be a distinct class (archive min-8).
- `login-cooldown`: after 5 `recordLoginFailure` in 30s, `isInCooldown` is true; a 6th `login()` short-circuits to cooldown class without needing Better Auth. Do not assert the exact Polish sentence.

#### 4. HTTP sign-up closed

**File**: test colocated with the route or `src/lib/auth.ts` (config assertion)

**Intent**: Keep the archive F2 fix: HTTP sign-up must not enumerate emails.

**Contract**: `disabledPaths` includes `/sign-up/email`. If the route is imported, mock `@/lib/db` first. Prefer asserting 404 on `POST /api/auth/sign-up/email` when that is possible without Neon; otherwise assert the `disabledPaths` membership as the regression lock.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` passes including stripper, action, cooldown, and sign-up-closed tests
- Canary password and canary token are absent from action return values and from stripped JSON fixtures
- `npm run lint` passes

#### Manual Verification:

- Failed login in the UI still does not display the typed password as server-rendered `defaultValue` (browser DOM retention after submit is out of scope)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Write gate (#2)

### Overview

Prove a request without a live session cannot persist a spot or event. Prove the proxy is not that gate.

### Changes Required:

#### 1. `createSession` no-row tests

**File**: `src/lib/spot-actions.test.ts` (new)

**Intent**: The product oracle is “no row,” not redirect copy. Bypass `/spot` on purpose.

**Contract**: `vi.mock("@/lib/session")`, `vi.mock("@/lib/db")`, `vi.mock("next/navigation")`. `getSession` resolves `null`. Valid FormData for **both** shapes: existing `spotId`; new `lat`/`lng`/`start`/`finish` (Warsaw-local strings that `parseWarsawLocal` accepts). Catch `NEXT_REDIRECT` / `redirect()`. Oracle: `insert` (and `transaction`) not called. Do not treat `session.user.id` throwing as the gate. Do not add a logged-in happy-path as a substitute.

#### 2. Proxy is cookie presence only

**File**: `src/proxy.test.ts` (new)

**Intent**: Make the challenged assumption falsifiable: a garbage cookie still passes the proxy.

**Contract**: Call `proxy(request)` with pathname `/spot`. No cookie → redirect to `/logowanie` with `callbackUrl=/spot`. Cookie `better-auth.session_token=garbage` → `NextResponse.next()` (not redirect). Pathname other than `/spot` → `next()` even without a cookie. This is not write coverage; it is why action tests must exist.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` passes including both `createSession` shapes and the proxy garbage-cookie case
- `npm run lint` passes

#### Manual Verification:

- Do not use the map UI or a logged-out GET `/spot` as the write-gate check

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Fail-open (#3)

### Overview

Extract the existing chrome catch so it can be unit-tested. Lock public pages from growing a `getSession` import. Do not claim this proves `/` HTML stays up (rollout Phase 3 e2e).

### Changes Required:

#### 1. Chrome session helper

**File**: new helper next to chrome (e.g. `src/lib/chrome-session.ts` or colocated under `src/components/`) + `src/components/SessionChrome.tsx`

**Intent**: Same fail-open behavior as today, in a function Vitest can call without rendering an async Server Component.

**Contract**: `getSession` remains throw-through. New helper: `try { return await getSession() } catch { return null }`. `SessionChrome` uses only this helper for lookup. Unit: mock `getSession` to reject → helper returns `null`; mock resolve with a user → helper returns that session. Do not change `/spot` or `createSession`.

#### 2. Public pages stay session-free

**File**: `src/app/public-get-session-imports.test.ts` (new) — or colocated equivalent

**Intent**: Session-throw can 500 `/sesja/[id]` only through layout chrome; the page must not grow its own uncaught lookup.

**Contract**: Read `src/app/page.tsx` and `src/app/sesja/[id]/page.tsx` as source text. They must not contain `getSession`. Do not import those modules into Vitest (async SC / Next runtime). This does not replace Phase 3 e2e.

### Success Criteria:

#### Automated Verification:

- Helper unit: reject → `null`; `SessionChrome` no longer calls `getSession` directly
- Public page source files do not contain `getSession`
- `npm run test:run` passes
- `npm run lint` passes

#### Manual Verification:

- None. Document-level “visitor still sees `/` and `/sesja/[id]` when session throws” is rollout Phase 3 e2e, with a throwing lookup, not a cookieless dead-DB hit.

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 5: Cookbook and test-plan §2

### Overview

Write down how to add the tests this change just shipped, and correct §2 evidence/guidance so later phases do not chase misleading hot-spots.

### Changes Required:

#### 1. Cookbook §6.1, §6.2, §6.4

**File**: `context/foundation/test-plan.md` §6

**Intent**: §6 becomes the answer to “how do I add a test for X.”

**Contract**: Replace TBD for 6.1, 6.2, 6.4 with location (`*.test.ts` next to the unit under `src/`), naming (`<file>.test.ts`), reference tests (stripper, `createSession` no-row, chrome helper), and run command (`npm run test:run`). 6.2 mocking policy: mock at DB/session/headers/navigation edges, never assert production error copy, never treat proxy redirect as the write gate. 6.4: new write/auth gate → integration, oracle is no row / no secret in body. Leave §6.3 TBD (e2e). Append a 6.6 note: HTTP `token` is stripped at the catch-all; async SC HTML is Phase 3; login/register uncaught `getSession` is out of Phase 1.

#### 2. Backport §2

**File**: `context/foundation/test-plan.md` §2 (Source and Risk Response Guidance only)

**Intent**: Research is ground truth where it disagreed with the guide.

**Contract**: No file:line anchors. #1: live leak is success JSON token on `/api/auth/*`; drop `src/app/logowanie/` as likelihood evidence. #2: persist path is the write-action module under `src/lib/`; `src/app/spot/` and `src/proxy.ts` are optimistic-gate evidence only. #3 cheapest layer: helper unit + structural import check; document oracle is Phase 3 e2e with a throwing lookup. #3 hot-spot: do not treat `src/components/` map churn as fail-open heat. Bump header “Last updated” if §2 cells change.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` still passes
- `context/foundation/test-plan.md` §6.1, §6.2, §6.4 are not TBD

#### Manual Verification:

- Reading §6 is enough to add another write-gate or auth-body test without rereading research
- §2 Source cells have no `file:line` or function names

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- `stripAuthSecrets` with canary token/password (Risk #1)
- `login-cooldown` 5 failures / 30s window (Risk #1, folded)
- `proxy` garbage cookie vs no cookie (Risk #2 challenge)
- `loadChromeSession` throw → null (Risk #3)
- Public page source must not mention `getSession` (Risk #3)

### Integration Tests:

- `login`/`register` FormData → return object has no canary password/token (Risk #1)
- `createSession` both insert shapes with `getSession → null` → no insert (Risk #2)
- Catch-all wrapper preserves `Set-Cookie` while JSON has no `token` (Risk #1) — unit the wrapper with a fake `Response` if a live Better Auth call needs Neon

### Manual Testing Steps:

1. Phase 1: confirm `AGENTS.md` points at the cookbook.
2. Phase 2: one failed UI login; password is not a server-rendered field value.
3. Do not verify Risk #2 or #3 in the browser in this change.

## Performance Considerations

`npm run test:run` must stay a local, no-Neon gate. Do not start `next dev` or `next build` for these tests.

## Migration Notes

No database migration. Auth cookie contract unchanged. Existing sessions keep working; only HTTP JSON bodies lose `token`.

## References

- Research: `context/changes/testing-critical-path-coverage/research.md`
- Test plan: `context/foundation/test-plan.md` §2 Risks #1–#3, §3 Phase 1, §6, §7
- Lesson: `context/foundation/lessons.md` (public chrome fail-open)
- Next 16 Vitest: `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`
- Archive F2: `context/archive/2026-09-05-minimal-login/reviews/impl-review.md`
- S-01 write gate: `context/changes/post-session-and-share/research.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Vitest runner

#### Automated

- [x] 1.1 npm run test:run exits 0
- [x] 1.2 package.json has test and test:run scripts; vitest.config.mts exists
- [x] 1.3 npm run lint passes

#### Manual

- [x] 1.4 AGENTS.md no longer forbids a test runner and points at test-plan.md §6

### Phase 2: Secret leak (#1)

#### Automated

- [ ] 2.1 npm run test:run passes including stripper, action, cooldown, and sign-up-closed tests
- [ ] 2.2 Canary password and canary token are absent from action return values and from stripped JSON fixtures
- [ ] 2.3 npm run lint passes

#### Manual

- [ ] 2.4 Failed login in the UI still does not display the typed password as server-rendered defaultValue

### Phase 3: Write gate (#2)

#### Automated

- [ ] 3.1 npm run test:run passes including both createSession shapes and the proxy garbage-cookie case
- [ ] 3.2 npm run lint passes

#### Manual

- [ ] 3.3 Do not use the map UI or a logged-out GET /spot as the write-gate check

### Phase 4: Fail-open (#3)

#### Automated

- [ ] 4.1 Helper unit: reject → null; SessionChrome no longer calls getSession directly
- [ ] 4.2 Public page source files do not contain getSession
- [ ] 4.3 npm run test:run passes
- [ ] 4.4 npm run lint passes

### Phase 5: Cookbook and test-plan §2

#### Automated

- [ ] 5.1 npm run test:run still passes
- [ ] 5.2 context/foundation/test-plan.md §6.1, §6.2, §6.4 are not TBD

#### Manual

- [ ] 5.3 Reading §6 is enough to add another write-gate or auth-body test without rereading research
- [ ] 5.4 §2 Source cells have no file:line or function names
