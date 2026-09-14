# Next session home Implementation Plan

## Overview

A passerby who only has the app name opens `/` with no account and sees the nearest still-running or upcoming session as a hero, then the rest in the same order. Each row links to the public `/sesja/[id]` page. Photos, edit, and the parked “most probable” ranking stay out.

## Current State Analysis

S-01 shipped `spot` / `event` (`src/lib/schema/spots.ts`), Warsaw format (`src/lib/warsaw-time.ts`), and public `/sesja/[id]` (join by id, `formatWarsaw`, OSM link, no `getSession`). `/` is still the static marketing stub (`src/app/page.tsx`). There is no event list query, no `orderBy`, and no `starts_at` index.

Chrome is fail-open (`src/lib/chrome-session.ts`). Proxy matcher is exact `/spot` only. Vitest is the unit+integration gate (`npm run test:run`). An existing Playwright spec (`e2e/public-home-survives-session-throw.spec.ts`) requires `/` to stay 200 with heading “Slacklans” and logged-out chrome when `E2E_THROW_SESSION=1`.

This project does **not** enable Next 16 Cache Components (`next.config.ts`). Uncached DB reads can still be prerendered at build if the page never uses a Request-time API. `new Date()` on `/` is not enough by itself.

## Desired End State

Logged-out `/` shows:

1. Heading **Slacklans** (keep this `h1` — the fail-open e2e keys off it).
2. If at least one session has `ends_at > now`: a hero “Najbliższa sesja” card, then “Kolejne sesje” for the rest (omit the rest heading when there is only one).
3. If none: Polish empty copy, no fake next session.

Hero and list rows are links to `/sesja/[id]`. Times are Europe/Warsaw via `formatWarsaw`. Place is spot name, or lat/lng to 5 decimals (same fallback as `/sesja/[id]`). No account, no Leaflet, no `getSession` on the page.

### Key Discoveries:

- Eligible set is `ends_at > now`, not `starts_at > now` — an in-progress park session stays on home (`src/lib/schema/spots.ts:20-21` has both timestamps).
- Same-start extra key is **finished-host count** (`ends_at <= now` for that `creator_id`), then `event.id` ascending. This is not the parked likes/confirmed ranking; it only breaks start ties.
- `/sesja/[id]` already has the display contract to reuse: `formatWarsaw`, name-or-coords, no session lookup (`src/app/sesja/[id]/page.tsx:9-47`).
- Public pages must not grow a `getSession` import (`src/app/public-get-session-imports.test.ts`).
- Playwright `webServer.env` currently sets only `E2E_THROW_SESSION`. After home reads the DB, the e2e server must still see `DATABASE_URL` (spread `process.env`) or `/` 500s and the fail-open spec dies.
- Cookbook: colocated `src/**/*.test.ts`, mock `@/lib/db` at the edge, no RTL of async Server Components (`context/foundation/test-plan.md` §6.1–6.2).

## What We're NOT Doing

- Spot photos, Blob, placeholders (S-02)
- Creator edit UI (S-04)
- Parked same-time ranking: confirmed, more information, likes, participants, favorites
- Independent spots catalog (FR-017)
- Leaflet / MapTiler on `/`
- `getSession` on `/` or `/sesja/[id]`
- Schema migration or `starts_at` index (Gdynia volume; revisit if the 2s NFR fails)
- Pagination / “show past sessions”
- Caching or ISR of the schedule
- Fail-open on DB errors (a down database 500s home; that was the freshness tradeoff)
- New Playwright journey for ranking (test-plan e2e Phase 3). Keep the existing fail-open spec green.
- Polish copy snapshots

## Implementation Approach

Two reads, one pure rank, one public page.

1. **Rank in process.** A helper with an injected `now` filters, sorts, and splits hero vs rest. Unit tests own the counterexamples. The helper must not import `getDb` or `next/server`.
2. **Load at request time.** A loader queries not-yet-finished events joined to spots, and finished-session counts grouped by `creator_id`. The page calls `connection()` from `next/server` and sets `export const dynamic = "force-dynamic"` so “now” is not baked at build.
3. **Render.** Replace the marketing-only body with hero + list + empty. Cards are `next/link` to `/sesja/[id]`. Reuse Warsaw formatting and the place fallback. Keep the Slacklans `h1`.

## Critical Implementation Details

**Timing & lifecycle.** Call `await connection()` before `new Date()` / the loader. Also export `dynamic = "force-dynamic"` on `src/app/page.tsx`. Do not wrap the schedule in `unstable_cache`. Do not put `connection()` inside the pure rank helper (tests would have to mock Next).

**User experience spec.** Copy is Polish. Hero kicker: “Najbliższa sesja” (covers live and future). Rest heading: “Kolejne sesje”, omitted when `rest` is empty. Empty: “Nie ma teraz sesji do dołączenia.” Hero shows start and finish; list rows show start and place. Links `min-h-12` / `text-base`. Accessible name for each link must be unique (place + start). Do not rename the `h1` away from “Slacklans”.

**Performance constraints.** No map JS on `/`. Two small queries, no extra round-trip per row. No new index in this change.

## Phase 1: Ranking helper and reads

### Overview

Lock the eligibility and sort rules in a pure helper with unit tests, and add the two DB reads the home page will call. `/` UI stays unchanged so this phase is fully automated.

### Changes Required:

#### 1. Pure rank helper

**File**: `src/lib/home-sessions.ts` (name may vary) + `src/lib/home-sessions.test.ts`

**Intent**: One function decides what a passerby sees, with a frozen `now`, so the in-progress / empty / start-tie cases cannot drift in the page.

**Contract**: Input is (a) session rows `{ id, creatorId, startsAt, endsAt, name, lat, lng }[]`, (b) `finishedCountByCreator` map (`creator_id` → count of that host’s events with `ends_at <= now`; missing key = 0), (c) `now: Date`. Drop rows with `endsAt.getTime() <= now.getTime()`. Sort by `startsAt` ascending, then finished count descending, then `id` lexicographic ascending. Return `{ hero: row | null, rest: row[] }` — `hero` is index 0 or null; `rest` is the tail (never includes `hero`). Do not import `getDb`.

#### 2. Request loader

**File**: same module, separate exported async function (e.g. `loadHomeSessions`)

**Intent**: Home needs not-yet-finished sessions plus each host’s finished count without putting SQL in `page.tsx`.

**Contract**: `getDb()` two queries: (1) `event` inner join `spot` where `ends_at > now`, selecting id, creator_id, starts_at, ends_at, name, lat, lng; (2) `creator_id` + `count(*)` from `event` where `ends_at <= now`, grouped by `creator_id`. Pass results into the rank helper. Do not call `getSession`. Do not add a migration.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` covers: in-progress beats a later future start; finished rows are dropped; empty input → `{ hero: null, rest: [] }`; same start → higher finished-host count is hero; same start and same count → smaller `id` is hero; rest is the remaining rows in that same order
- `npm run lint` passes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. This phase has no manual checks.

---

## Phase 2: Home hero, list, and empty

### Overview

Replace the static home body with the ranked schedule, Polish empty state, and request-time rendering. Keep fail-open chrome and the existing e2e heading.

### Changes Required:

#### 1. Public `/` page

**File**: `src/app/page.tsx`

**Intent**: The walk-up visitor sees when and where to join, with no account.

**Contract**: Server Component. `await connection()` then `loadHomeSessions(new Date())`. `export const dynamic = "force-dynamic"`. Do not call `getSession`. Keep `h1` “Slacklans”. Hero + optional rest list as specified above; empty copy when `hero` is null. Each session is a `Link` to `/sesja/${id}`. Reuse `formatWarsaw`. Place fallback matches `/sesja/[id]`. No Leaflet imports.

#### 2. E2E server still has a database URL

**File**: `playwright.config.ts`

**Intent**: Home now reads Postgres; the fail-open spec must not 500 because `DATABASE_URL` was dropped.

**Contract**: `webServer.env` spreads `process.env` and sets `E2E_THROW_SESSION: "1"`. Do not add a ranking e2e. Empty table is a valid e2e world — heading and logged-out chrome still show.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:run` passes (Phase 1 tests + `public-get-session-imports` still asserts `src/app/page.tsx` has no `getSession`)
- `npm run build` passes
- `npx playwright test e2e/public-home-survives-session-throw.spec.ts` is 200 with heading Slacklans and logged-out chrome

#### Manual Verification:

- Logged-out `/` with no joinable sessions: heading + “Nie ma teraz sesji do dołączenia.”; no leftover marketing-only body as the only content
- A session that already started and has not ended is the hero when a later future session also exists
- Two sessions with the same start: the host with more finished sessions is the hero; equal counts → smaller event id
- Logged-out click on hero and a list row opens `/sesja/<id>` (times + place + map link)
- Phone-width: hero and rows are tappable (`min-h-12`), not hover-only
- `/` has no Leaflet network requests
- First paint feels within ~2s on phone (no map, no login wall)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- Rank helper: in-progress vs future, drop finished, empty, start-tie by finished count, start-tie by id, rest order
- Do not snapshot Polish strings
- Do not RTL `page.tsx`

### Integration Tests:

- Optional: loader with mocked `getDb` returning fixture rows — only if the query wiring is non-trivial. The rank helper is the oracle for order. Do not treat a GET `/` 200 as the ranking oracle.

### Manual Testing Steps:

1. Logged-out `/` on an empty DB: empty copy, chrome Zaloguj / Zarejestruj.
2. Create a session that is live now and one that starts later → home hero is the live one; later is in the list; both link to `/sesja/[id]`.
3. Create two sessions with the same start, different hosts (one with prior finished events) → that host’s session is the hero.
4. Wait until finish (or use a short fixture) → that session leaves home; it is not shown as “next”.
5. Phone-width, logged-out.

## Performance Considerations

Home is one cheap document: chrome (fail-open session) + two SQL reads + text. Leaflet stays on `/spot`. No schedule cache, so a Neon blip 500s `/`. No index in this slice.

## Migration Notes

None. No DDL. Rollback is revert `src/app/page.tsx` to the marketing stub and delete the helper module. Rows in `event` / `spot` are unchanged.

## References

- Roadmap S-03: `context/foundation/roadmap.md`
- PRD US-02, FR-012, Business Logic, NFR 2s: `context/foundation/prd.md`
- Lesson: `context/foundation/lessons.md` (public chrome fail-open)
- Public session page: `src/app/sesja/[id]/page.tsx`
- Warsaw time: `src/lib/warsaw-time.ts`
- Test cookbook: `context/foundation/test-plan.md` §6
- Next 16 (no Cache Components): `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` (`dynamic = "force-dynamic"`); `connection()`: `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/connection.md`
- Fail-open e2e: `e2e/public-home-survives-session-throw.spec.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Ranking helper and reads

#### Automated

- [x] 1.1 npm run test:run covers in-progress, drop finished, empty, start-tie by finished-host count, start-tie by id, rest order — a614c25
- [x] 1.2 npm run lint passes — a614c25

### Phase 2: Home hero, list, and empty

#### Automated

- [x] 2.1 npm run lint passes
- [x] 2.2 npm run test:run passes (Phase 1 tests + public-get-session-imports still asserts page.tsx has no getSession)
- [x] 2.3 npm run build passes
- [x] 2.4 npx playwright test e2e/public-home-survives-session-throw.spec.ts is 200 with heading Slacklans and logged-out chrome

#### Manual

- [x] 2.5 Logged-out `/` with no joinable sessions: heading + empty copy
- [x] 2.6 A live session is the hero when a later future session also exists
- [x] 2.7 Same start: host with more finished sessions is the hero; equal counts → smaller event id
- [x] 2.8 Logged-out click on hero and a list row opens `/sesja/<id>`
- [x] 2.9 Phone-width: hero and rows are tappable, not hover-only
- [x] 2.10 `/` has no Leaflet network requests
- [x] 2.11 First paint feels within ~2s on phone
