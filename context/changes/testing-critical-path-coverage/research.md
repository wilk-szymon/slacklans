---
date: 2026-09-09T23:26:58+02:00
researcher: Szymon Wilk
git_commit: c4b6dee5adbc66691b754f7c18b455fb0dac8a10
branch: main
repository: slacklans
topic: "Ground rollout Phase 1 of context/foundation/test-plan.md (Risks #1, #2, #3)"
tags: [research, codebase, auth, session, spot-actions, proxy, session-chrome, vitest]
status: complete
last_updated: 2026-09-09
last_updated_by: Szymon Wilk
---

# Research: Ground rollout Phase 1 (Risks #1, #2, #3)

**Date**: 2026-09-09T23:26:58+02:00
**Researcher**: Szymon Wilk
**Git Commit**: c4b6dee5adbc66691b754f7c18b455fb0dac8a10
**Branch**: main
**Repository**: slacklans

## Research Question

Ground rollout Phase 1 of `context/foundation/test-plan.md`.

Risks to verify: #1, #2, #3.

Risk response guidance to verify, not blindly accept:

- **#1**: prove passwords/session secrets never appear in HTML, JSON, logs, or the client bundle; challenge “Better Auth means we cannot leak”; avoid oracles copied from current error strings.
- **#2**: prove logged-out / cookie-without-session create does not insert a row; challenge “gating `/spot` in the proxy is enough”.
- **#3**: prove a throwing session lookup still renders public `/` and `/sesja/[id]`; challenge “home is public, so auth cannot take it down”.

Hot-spot directories cited as likelihood evidence (not anchors): `src/lib/`, `src/app/logowanie/`, `src/app/spot/`, `src/proxy.ts`, `src/components/`.

Stack: Next.js 16.3.4 App Router, Better Auth, Drizzle, Neon. Test-base: none. Phase 1 bootstraps Vitest (unit + integration). Official Next 16 docs: Vitest does not render async Server Components.

## Summary

All three Phase 1 risks are **real**. None is speculative “add a safeguard first.”

| Risk | Live today? | Where the failure actually lives | Cheapest useful layer | Guidance correction |
|------|-------------|----------------------------------|-----------------------|---------------------|
| #1 Secret leak | **Yes** on HTTP success JSON (`token`). UI actions currently do not echo the password. | Catch-all [`src/app/api/auth/[...all]/route.ts`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/app/api/auth/%5B...all%5D/route.ts) + [`src/lib/auth-actions.ts`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/auth-actions.ts) | Integration of `login`/`register` return values **and** HTTP `POST`/`GET` on `/api/auth/*`. Unit `login-cooldown` is extra, not the leak. | The live leak is **success** `token`, not error JSON. Generic Polish copy does not prove the HTTP payload is clean. `src/app/logowanie/` is a misleading hot-spot. |
| #2 Unauthenticated write | **Closed if** `createSession` keeps `getSession()`. Proxy is **not** a write gate. | [`src/lib/spot-actions.ts`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/spot-actions.ts) (`createSession`). [`src/proxy.ts`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/proxy.ts) is cookie presence only. | Direct `createSession(formData)` in Vitest with mocked `getSession` / DB. Oracle: **no new `spot`/`event` row**. | “Proxy is enough” is false. Do not POST `/spot` with no cookie and call that coverage. Hot-spots `src/app/spot/` and `src/proxy.ts` mis-point the write. |
| #3 Public 500 | **Regression** of an existing fail-open catch. | [`src/components/SessionChrome.tsx`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/components/SessionChrome.tsx) in root layout. `/` and `/sesja/[id]` do not call `getSession`. | Not RTL of the async SC. Extract + unit the catch, **or** invoke `SessionChrome` with a throwing `getSession` and assert it does not reject. Document-level oracle is Phase 3 e2e with a **throwing** lookup (cookieless + dead DB is a false pass). | “Home is public so auth cannot take it down” is false: chrome is in the root layout. `src/components/` churn overweights the map island vs the catch. |

Existing tests: **none**. Phase 1 must add Vitest. `AGENTS.md` still says “do not add a test runner unless asked” — this change is that ask.

No Phase 1 risk should be dropped. Creator-only edit (S-04) remains out of scope.

## Detailed Findings

### Risk #1 — password / session secret on the wire

**Product UI path (mostly protected).** [`login`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/auth-actions.ts#L55-L86) / [`register`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/auth-actions.ts#L88-L112) read the password from `FormData` on the server and return `{ error?: string }` or `redirect`. [`polishAuthError`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/auth-actions.ts#L36-L53) never forwards `error.message` or the password. Duplicate-email and unknown-email map to the same register/login class. `polishAuthError` is **not exported**.

**HTTP catch-all (real leak).** [`src/app/api/auth/[...all]/route.ts`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/app/api/auth/%5B...all%5D/route.ts) is a four-line `toNextJsHandler(auth)`. [`disabledPaths`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/auth.ts#L39-L43) 404s HTTP sign-up and password-reset (archive F2). It does **not** close `/sign-in/email`, `/get-session`, or `/list-sessions`. Better Auth success JSON for sign-in includes `token: session.token`; `get-session` includes `session.token`. Cookie is `httpOnly`, but same-origin JS can still `fetch('/api/auth/get-session')` and read the token. “Better Auth means we cannot leak” is **false**.

**Error JSON vs success JSON.** HTTP sign-in failures use generic `INVALID_EMAIL_OR_PASSWORD` and do not echo the password. A test that only POSTs a wrong password and asserts “no password in the 401 body” goes green and **misses** the session-token issue.

**Enumeration + cooldown (folded into #1).** UI login/register are generic. HTTP sign-up enumerating 422 is closed (`disabledPaths`). Cooldown is an in-memory `Map` in [`src/lib/login-cooldown.ts`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/login-cooldown.ts) (5 failures / 30s), wired on **login only**. Better Auth HTTP `rateLimit` does **not** wrap `auth.api.signInEmail`. Durability on Vercel cold start is a known hole, not a secret leak. Key uses client-supplied `x-forwarded-for`.

**Bundle / logs.** No `console.log` of secrets under `src/`. No client import of `@/lib/auth`. Only `NEXT_PUBLIC_*` is `NEXT_PUBLIC_MAPTILER_KEY`. `BETTER_AUTH_SECRET` is env-only. Chrome prints `session.user.email` (identity, not a session token).

**Challenge verdict:** keep. Generic copy on the form does **not** imply a clean HTTP payload.

**Oracle (independent of Polish copy):**

- Response body (action result or `/api/auth/*`) must not contain the submitted **canary** password, `BETTER_AUTH_SECRET`, or the session token except `Set-Cookie` (`HttpOnly`).
- Unknown email vs known email + wrong password → same status and error **class**; body must not include `USER_ALREADY_EXISTS` / “user not found”.
- After 5 login failures in 30s from the same key, the next `login()` is cooldown-class.
- Do not snapshot `LOGIN_ERROR` / `REGISTER_ERROR` (test-plan §7).

**Anti-pattern confirmed:** do not e2e the login form for this risk.

**Misleading hot-spot:** `src/app/logowanie/` (3 touches) does not own secrets. High-signal files: `src/lib/auth.ts`, `src/lib/auth-actions.ts`, `src/lib/login-cooldown.ts`, `src/app/api/auth/[...all]/route.ts`. `src/lib/` 18-touch mix includes spots/schema/Warsaw-time.

### Risk #2 — persist a spot/event without a live session

**Write entry (only one).** [`createSession`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/spot-actions.ts#L50-L57) in a `"use server"` module. Sole UI importer: `SpotForm`. Two insert shapes: existing `spotId` → `event` only; new pin → `spot` + `event` in a transaction. `creatorId` comes from `session.user.id`, not the form.

**Action does check a live session today:**

```50:57:src/lib/spot-actions.ts
export async function createSession(...) {
  const session = await getSession();
  if (!session) {
    redirect("/logowanie?callbackUrl=/spot");
  }
```

[`getSession`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/session.ts#L5-L9) calls `auth.api.getSession({ headers })` (DB-backed; this project does not enable `session.cookieCache`).

**Proxy is cookie presence, not a live session:**

```5:21:src/proxy.ts
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/spot") {
    return NextResponse.next();
  }
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) { /* redirect to /logowanie */ }
  return NextResponse.next();
}
export const config = { matcher: ["/spot"] };
```

`getSessionCookie` parses the cookie **name** only (no signature, expiry, or DB). Matcher is `/spot`. Extra `pathname !== "/spot"` keeps nested `/spot/…` ungated (impl-review F1). Public `/`, `/sesja/[id]`, and `/api/auth/*` are not in the matcher.

**Server Actions are reachable without the `/spot` UI.** Next 16: an exported `"use server"` function is a public POST endpoint; render-time gating is not a security boundary. `/spot/page.tsx` `getSession()` is GET-form gating, not the write gate.

**Cookie-without-session is a distinct proxy path.** Junk/expired cookie on POST `/spot` **passes the proxy** and only dies at the action check. Logged-out POST `/spot` dies at the proxy and **never reaches the action**. A test of “no cookie → `/spot` redirects” can go green while `createSession` inserts.

If the `if (!session)` block is removed, `session.user.id` may throw — that is **not** a gate. Do not use “throws” as the oracle.

**Challenge verdict:** “Gating `/spot` in the proxy is enough” is **false**. Keep both oracles: logged-out **and** cookie-without-session.

**Cheapest layer (tightened):** call `createSession` in Vitest. Bypass the proxy on purpose.

1. `getSession` → `null`, valid `FormData` for **both** insert shapes. Catch `NEXT_REDIRECT`. Oracle: `spot` and `event` row counts unchanged (test DB or insert spy).
2. Cookie-without-session: headers carry `better-auth.session_token=<garbage>` so `getSessionCookie` would pass; `getSession` still `null`; same “no row” oracle. Stubbing `getSession → null` alone does not prove the proxy is insufficient.

Do **not** need Playwright or the map UI. Do **not** treat redirect copy as the oracle.

**Misleading hot-spot:** `src/app/spot/` (4) and `src/proxy.ts` (3) point at page/proxy. The persist path is `src/lib/spot-actions.ts`. `/sesja/[id]` being public is correct and not a write hole.

### Risk #3 — session throw 500s public `/` and `/sesja/[id]`

**Lesson already implemented** ([`context/foundation/lessons.md`](../../foundation/lessons.md)): catch in shared chrome, render logged-out header; gated pages stay fail-closed.

```5:11:src/components/SessionChrome.tsx
  try {
    session = await getSession();
  } catch {
    session = null;
  }
```

Landed in `a2ff8a7`. Later chrome edits kept the catch. Risk #3 is a **regression** of that catch, not new product work.

**Root layout mounts chrome on every route**, including `/` and `/sesja/[id]`:

```21:31:src/app/layout.tsx
        <SessionChrome />
        {children}
```

No `error.tsx` / `global-error.tsx`. Uncaught throw in root-layout chrome is a whole-document 500.

**`getSession` has no catch** ([`src/lib/session.ts`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/lib/session.ts)). `cache()` memoizes **rejection**. Chrome catching does not turn a later `await getSession()` on the same request into `null`. Do **not** move the catch into `getSession` — that would fail-open `/spot`.

**Public pages do not call `getSession`:**

- [`src/app/page.tsx`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/app/page.tsx) — sync stub, no DB.
- [`src/app/sesja/[id]/page.tsx`](https://github.com/wilk-szymon/slacklans/blob/c4b6dee5adbc66691b754f7c18b455fb0dac8a10/src/app/sesja/%5Bid%5D/page.tsx) — product DB join only (`loadPublicSession`). Plan contract: do not call `getSession()` here.

Session-throw can 500 `/sesja/[id]` **only via layout chrome**. Product-DB throw on sesja is a **different** failure (not Risk #3). Better Auth returns `null` with **no cookie** without hitting Postgres — cookieless + dead DB is a **false pass** for this risk. The throw path is cookie-present + store/internal failure.

**Gated / sibling lookups:**

| Call site | Catch? | On throw |
|-----------|--------|----------|
| `/spot` page | no | fail-closed (correct) |
| `createSession` | no | no insert (correct) |
| `/logowanie`, `/rejestracja` | no | 500 on those URLs (sibling hole; not FR-010/FR-012) |

**Challenge verdict:** “Home is public, so auth cannot take it down” is **false**. The page is session-free; chrome in the root layout is not.

**Cheapest layer (corrected):** the test-plan’s “integration with a failing session lookup” cannot be an RTL render of `SessionChrome`. Official Next 16: Vitest does not support async Server Components.

Phase 1 cheap signal (still in scope):

1. Extract the fail-open helper (small production change) and unit: mock `getSession` reject → `null`. Does **not** by itself prove `/` or `/sesja/[id]` stay up.
2. Structural: public page modules (`page.tsx`, `sesja/[id]/page.tsx`) must not import `getSession`.
3. Optional: `await SessionChrome()` with a throwing mock must not reject (element tree, not HTML).

Document-level oracle (visitor content, not 500) is **Phase 3 e2e** against `next build` + `next start`, with session lookup **forced to throw**. Phase 3 already names “public `/` stays up.”

**Anti-pattern confirmed:** chrome markup snapshot; e2e of a healthy login; cookieless request against a dead DB.

**Misleading hot-spot:** `src/components/` 8 file-touches mix SessionChrome (4) with SpotMap (4). Recent heat is the map island. The catch has been stable since `a2ff8a7`. Likelihood is “chrome still gets edited, catch can be deleted,” not map-level churn.

## Code References

- `src/lib/auth.ts:7-48` — Better Auth config: email/password, rateLimit, `disabledPaths`, `nextCookies`, no `secret:` override
- `src/app/api/auth/[...all]/route.ts:1-4` — public catch-all HTTP boundary
- `src/lib/auth-actions.ts:15-53` — `AuthFormState` and private `polishAuthError`
- `src/lib/auth-actions.ts:55-112` — `login` / `register` (password stays on server; generic error object)
- `src/lib/login-cooldown.ts:1-47` — in-memory 5/30s cooldown; `x-forwarded-for` key
- `src/lib/session.ts:5-9` — `cache()` + `auth.api.getSession`; no catch
- `src/components/SessionChrome.tsx:5-11` — fail-open try/catch
- `src/app/layout.tsx:21-31` — chrome on every route
- `src/app/page.tsx:1-10` — public home, no session
- `src/app/sesja/[id]/page.tsx:9-47` — public product read; OSM href; no `getSession`
- `src/app/spot/page.tsx:11-15` — fail-closed GET gate
- `src/app/logowanie/page.tsx:14-17` — uncaught `getSession` on an ungated URL
- `src/proxy.ts:5-21` — cookie-presence gate, matcher `["/spot"]`
- `src/lib/spot-actions.ts:50-57` — live `getSession()` before insert
- `src/lib/spot-actions.ts:74-78` — `creatorId` from session after the null check
- `.env.example` — `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_MAPTILER_KEY`

## Architecture Insights

- **Two auth boundaries.** Product UX is server actions (`auth-actions.ts`). Library HTTP is the catch-all. `disabledPaths` applies to HTTP `onRequest` only; `auth.api.*` bypasses it (intentionally, so register still works). Tests that hit only one boundary miss the other.
- **Optimistic proxy, real gate in the action.** Matches Next 16 auth guidance and S-01 research: cookie presence in `proxy.ts`; live session in `createSession`. Page-level `getSession` is UX, not a mutation boundary.
- **Fail-open is local to chrome, not to `getSession`.** Shared helper stays throw-through so `/spot` stays fail-closed. `cache()` means a rejected lookup poisons siblings on the same request.
- **Public share URL is session-free by design.** `/sesja/[id]` must not grow a `getSession()` call. Coupling to auth is layout chrome only.
- **Vitest vs async RSC.** Server actions and pure helpers are ordinary async functions and **are** unit/integration-testable. `SessionChrome`, `/spot/page.tsx`, and `/sesja/[id]/page.tsx` are async Server Components — do not plan RTL for them in Phase 1.
- **Import-time DB.** `auth.ts` calls `getDb()` at module load. Vitest must `vi.mock` `@/lib/session` / `@/lib/auth` / `@/lib/db` **or** provide `DATABASE_URL`. `headers()` / `redirect()` need request-scope mocks (`next/headers`, `next/navigation`).
- **No in-repo test pattern.** Zero helpers, zero request factories. Phase 1 invents the runner and the first fixtures.

## Historical Context (from prior changes)

- `context/archive/2026-09-05-minimal-login/plan.md` — no test runner; generic Polish login errors; min password 8; cooldown; passwords never plaintext.
- `context/archive/2026-09-05-minimal-login/reviews/impl-review.md` — F2 HTTP sign-up enumerated emails (**FIXED** via `disabledPaths`); F1 `callbackUrl` open redirect (Risk #4, out of Phase 1).
- `context/archive/2026-09-05-minimal-login/reviews/impl-review-phase-3.md` — uncaught `getSession` 500s public `/` (**FIXED + ACCEPTED-AS-RULE**). Origin of `context/foundation/lessons.md`.
- `context/changes/post-session-and-share/research.md` — proxy is cookie presence; writes must `getSession()` in the action; public `/sesja/[id]` must not call `getSession`; chrome catch does not protect sibling pages that await session.
- `context/changes/post-session-and-share/plan.md` — same write-gate contract; matcher exact `/spot`; verification was lint/build/manual, not tests.
- `context/changes/post-session-and-share/reviews/impl-review.md` — F1 extra `pathname !== "/spot"` so Next prefix matching cannot cookie-gate `/spot/*`.

## Related Research

- `context/changes/post-session-and-share/research.md` — S-01 map/session/proxy grounding (Risks #2 and #3 overlap).
- No `research.md` in `context/archive/2026-09-05-minimal-login/` (plan + impl-reviews only).

## Open Questions

- **Does Phase 1 treat HTTP `token` in sign-in/get-session JSON as a failing assertion (product bug) or as a documented library behavior to lock?** The risk says secrets must not appear in JSON. Today they do, on the catch-all. `/10x-plan` must pick: (a) assert token is absent and **fix production** in this change, or (b) assert cookie `HttpOnly` + action bodies clean, and file the catch-all token as a follow-up. Recommendation: **(a) is the risk’s oracle**; if product scope forbids changing Better Auth responses this slice, say so explicitly in the plan rather than writing a tautological “token is present” test.
- **Extract fail-open helper in Phase 1?** Cheap unit for #3 vs extra production churn on chrome. Alternative: structural “public pages must not import `getSession`” plus Phase 3 e2e for the document oracle.
- **Test DB vs insert spy for #2.** Real Neon branch vs mocked `getDb()`. Cost × signal favors a mocked DB for “no row inserted”; a real DB is stronger and slower.
- **Login/register 500 on throwing `getSession`.** Sibling of #3, not in the Phase 1 risk list. Do not expand Phase 1 unless the plan explicitly adds it.

## Corrections for test-plan §2 (backport or `--refresh`)

These are evidence/guidance corrections, not new file anchors:

1. **#1 Source / wording:** live leak is success JSON `token` on `/api/auth/*`, not form error copy. `src/app/logowanie/` is misleading likelihood evidence; prefer `src/lib/` auth modules + the catch-all route directory.
2. **#2 Source:** persist path is the write-action module under `src/lib/`, not `src/app/spot/` or `src/proxy.ts`. Keep those dirs as “optimistic gate” evidence only.
3. **#3 Likely cheapest layer:** not “integration with a failing session lookup” as an RTL page test. Phase 1 = extract/unit or structural import check; document oracle = Phase 3 e2e with a throwing lookup.
4. **#3 hot-spot:** `src/components/` count overweights SpotMap. Likelihood is chrome-edit regression, not map churn.
