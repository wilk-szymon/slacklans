# Minimal login Implementation Plan

## Overview

Add email+password register and login so a slackliner can hold a session, while visitors still read the public home with no account. Users persist in our Postgres. `/nowe` is reserved and only reachable when logged in (placeholder copy until S-01). No spots, events, photos, password recovery, or roles.

## Current State Analysis

The app is a Next.js 16.3.4 App Router starter under `src/app/`. There is no auth library, no database client, no `src/app/api/` routes, and no `proxy.ts`. `src/app/layout.tsx` is `lang="en"`. `src/app/page.tsx` is the default marketing homepage. Production is on Vercel Hobby with `vercel.json` `regions: ["fra1"]`. Postgres was a stack preference and is not wired. Roadmap F-01 (`minimal-login`) is the session gate that unlocks S-01.

## Desired End State

A person can register with email+password, log in, see Polish chrome on the same public home (email + Wyloguj), and open `/nowe` to a “coming soon” page. Logged-out visitors still open `/` without an account. Logged-out requests to `/nowe` do not show the placeholder. Accounts still work after a Vercel redeploy. Wrong password shows a generic Polish error and, after several failures, a short cooldown.

### Key Discoveries:

- Next 16 request interception is `src/proxy.ts` (Node), not `middleware.ts` (`@context/foundation/infrastructure.md`, `@AGENTS.md`).
- Better Auth documents Next 16 `proxy` and email/password; Auth.js credentials would be extra work for the same PRD.
- No test runner by repo rule (`@AGENTS.md`). Verification is `npm run lint`, `npm run build`, plus a written manual path.
- User store must be durable; S-01 will reuse the same Postgres.

## What We're NOT Doing

- Spots, map picker, events, photos, favorites, ratings
- Password reset, email verification, OAuth, magic links, roles/admin
- Clerk / hosted IdP
- GitHub Actions (still CLI deploy; do not connect Git auto-deploy in this change)
- Adding a test runner
- Polish i18n framework (copy in Polish in the auth UI only)
- Production `vercel --prod` without an explicit human ask after this change is implemented

## Implementation Approach

Better Auth with email/password enabled, sessions in Postgres (Neon, EU, same region story as `fra1`). App-owned Polish pages for register/login. Home stays public; chrome reflects session. `/nowe` is a real App Router page: session required on the server; logged-in users see a short Polish “coming soon”; logged-out users are sent to login with a return to `/nowe`. Rate-limit sign-in for the cooldown. Disable email verification.

## Critical Implementation Details

**Timing & lifecycle.** Cookie writes from Better Auth on Next.js must go through the Next cookies helper Better Auth documents for App Router. A session check in `proxy.ts` that hits the database on every static asset will hurt the 2s NFR later; matcher must skip `_next` and static files. `/` must never require a session.

**User experience spec.** All auth strings Polish. Root layout `lang="pl"`. Login/register usable on a phone (large targets, no hover-only logout). Generic failure copy must not say whether the email exists.

## Phase 1: User store

### Overview

Provision EU Postgres and Better Auth’s user/session tables so accounts survive redeploy.

### Changes Required:

#### 1. Database connection

**File**: env + DB client under `src/` (e.g. `src/lib/db.ts`)

**Intent**: App talks to one Postgres URL from the environment. Local and Vercel production both work.

**Contract**: Required env names documented (not committed values): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. `.env*` stays gitignored. Neon project in EU (Frankfurt or Amsterdam), not US, so it sits with `fra1`.

#### 2. Auth schema

**File**: schema/migration next to the DB client

**Intent**: Persist Better Auth users, sessions, and accounts.

**Contract**: Email stored so uniqueness is case-insensitive (normalize to lowercase before unique check). Passwords never stored in plaintext. Schema is only identity/session — no spots or events tables.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- App boots locally with `DATABASE_URL` set (no crash on missing schema after migrate)

#### Manual Verification:

- Neon instance is EU; Vercel env has `DATABASE_URL` for Production and Preview
- A row exists in the user table after a test register in a later phase (this phase only proves migrate + connect)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Session gate

### Overview

Register, login, logout, session cookie, password rules, generic errors, sign-in cooldown.

### Changes Required:

#### 1. Auth server

**File**: `src/lib/auth.ts` (or equivalent) + App Router handler under `src/app/api/auth/[...all]/route.ts`

**Intent**: Better Auth email/password is the only sign-in method.

**Contract**: Min password length 8; no class/complexity rules. Email uniqueness case-insensitive. Email verification off. Session max age ~7 days, refreshed while in use; logout revokes it. Sign-in failures: one generic Polish message; after several failures from the same source, a short cooldown (order of tens of seconds). No password-reset routes.

#### 2. Register and login pages

**File**: `src/app/rejestracja/page.tsx`, `src/app/logowanie/page.tsx`

**Intent**: Self-serve create account and log in.

**Contract**: Polish labels and errors. Success: session cookie set, redirect to `/` (or to `callbackUrl` when present, only if it is a same-origin path). Duplicate email: Polish error, no session. Logged-in visit to these pages may redirect home.

#### 3. Logout

**File**: server action or auth API used by chrome

**Intent**: Explicit logout ends the session.

**Contract**: After logout, `/` is the public home and `/nowe` is no longer accessible.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Register with a new email (≥8 char password) then see logged-in chrome on `/`
- Login with same email in different casing works
- Wrong password: generic Polish error; after several tries, cooldown
- Logout returns to logged-out home

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Polish chrome and `/nowe`

### Overview

Public home shows session chrome. `/nowe` is login-gated placeholder for S-01.

### Changes Required:

#### 1. Document language and chrome

**File**: `src/app/layout.tsx`, `src/app/page.tsx`, small header component under `src/`

**Intent**: Whole document is Polish; home stays public.

**Contract**: `html lang="pl"`. Logged-out: links to `/logowanie` and `/rejestracja`. Logged-in: email (or display name) and Wyloguj. Starter marketing content can be replaced with a short Polish public stub so the page is not English. Home never redirects to login.

#### 2. Gated `/nowe`

**File**: `src/app/nowe/page.tsx` plus `src/proxy.ts` matcher (or equivalent server check)

**Intent**: Reserve the post-session URL; only a logged-in slackliner sees it.

**Contract**: Logged-in GET `/nowe` renders Polish “coming soon” (no map, no form). Logged-out GET `/nowe` does not render that page — redirect to `/logowanie` with return to `/nowe`. Static assets and `/` are not gated. Enforcement is on the server, not only hidden links.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Logged-out `/` is 200 and Polish; no session chrome
- Logged-in `/` shows email + Wyloguj
- Logged-out `/nowe` never shows the placeholder
- Logged-in `/nowe` shows coming soon; after logout, `/nowe` is gated again
- Usable on a phone-width viewport

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Ship and verify

### Overview

Env on Vercel, production build, written manual path. No Git integration change.

### Changes Required:

#### 1. Vercel env

**File**: Vercel project env (not git)

**Intent**: Production/preview can create sessions against EU Postgres.

**Contract**: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` set for Production and Preview. `BETTER_AUTH_URL` is the canonical `https://slacklans.vercel.app` (preview may need its own URL or a documented preview caveat). Do not commit secrets. Do not `vercel git connect`. Deploy only with an explicit human ask (`vercel deploy --prod`).

#### 2. Manual path write-up

**File**: this plan’s Manual Testing Steps (execute, don’t expand product scope)

**Intent**: Human can re-run the F-01 path after deploy.

**Contract**: Same clicks as Testing Strategy below, against production after deploy.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Production (or agreed preview) register → login → `/nowe` → logout → `/nowe` gated
- Logged-out `/` still public
- After a fresh deploy, the same email still logs in (durable)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- None this change (no test runner).

### Integration Tests:

- None this change.

### Manual Testing Steps:

1. Open `/` logged-out: Polish public page, Zaloguj się / Zarejestruj się, no Wyloguj.
2. Register a new email, password length 8+: land on `/` with email + Wyloguj.
3. Logout, login with the same email in different casing: success.
4. Wrong password several times: generic Polish error, then cooldown.
5. Logged-out open `/nowe`: login page, not coming soon.
6. Login, open `/nowe`: coming soon. Logout, `/nowe` gated again.
7. Redeploy or restart: same email still logs in.

## Performance Considerations

Session checks must not run on static `_next` assets. `/` stays a cheap public page (no login wall). Cooldown is in-memory or Better Auth’s rate limit — good enough at Gdynia scale; it may reset on cold start.

## Migration Notes

First identity schema only. No backfill. If Neon is empty, register creates the first user. Rollback: remove auth routes and env; leftover user tables on Neon are harmless until dropped by hand.

## References

- Roadmap: `context/foundation/roadmap.md` F-01 `minimal-login`
- PRD: `context/foundation/prd.md` FR-001, Access Control
- Infra: `context/foundation/infrastructure.md` (fra1, Neon EU, `proxy.ts`)
- Better Auth Next.js 16 proxy: https://www.better-auth.com/docs/integrations/next

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: User store

#### Automated

- [x] 1.1 npm run lint passes — 98319fd
- [x] 1.2 App boots locally with DATABASE_URL set after migrate — 98319fd

#### Manual

- [x] 1.3 Neon instance is EU; Vercel env has DATABASE_URL for Production and Preview — 98319fd

### Phase 2: Session gate

#### Automated

- [x] 2.1 npm run lint passes — 63f833b
- [x] 2.2 npm run build passes — 63f833b

#### Manual

- [x] 2.3 Register with a new email then see logged-in chrome on / — 63f833b
- [x] 2.4 Login with same email in different casing works — 63f833b
- [x] 2.5 Wrong password: generic Polish error; after several tries, cooldown — 63f833b
- [x] 2.6 Logout returns to logged-out home — 63f833b

### Phase 3: Polish chrome and /nowe

#### Automated

- [x] 3.1 npm run lint passes — 4c06394
- [x] 3.2 npm run build passes — 4c06394

#### Manual

- [x] 3.3 Logged-out / is 200 and Polish — 4c06394
- [x] 3.4 Logged-in / shows email + Wyloguj — 4c06394
- [x] 3.5 Logged-out /nowe never shows the placeholder — 4c06394
- [x] 3.6 Logged-in /nowe shows coming soon; after logout, /nowe is gated again — 4c06394
- [x] 3.7 Usable on a phone-width viewport — 4c06394

### Phase 4: Ship and verify

#### Automated

- [ ] 4.1 npm run lint passes
- [ ] 4.2 npm run build passes

#### Manual

- [ ] 4.3 Production register → login → /nowe → logout → /nowe gated
- [ ] 4.4 Logged-out / still public
- [ ] 4.5 After a fresh deploy, the same email still logs in
