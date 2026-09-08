# Post session and share Implementation Plan

## Overview

A logged-in slackliner posts a Gdynia spot and a single session from one gated page, then hands a visitor a public URL. Visitors see time and location with no account. Photos, home ranking, and edit stay out.

## Current State Analysis

F-01 shipped Better Auth, Neon Pool + Drizzle (`transaction: true`), Polish fail-open chrome, and a fail-closed `/nowe` coming-soon stub. Schema is identity only (`user`, `session`, `account`, `verification`). `drizzle.config.ts` points only at `src/lib/schema/auth.ts`. No map library, no product tables, no public dynamic route.

`/nowe` is dual-gated (`src/proxy.ts` matcher `["/nowe"]` plus page `getSession()`). This slice **replaces** that URL with `/spot` (F-01 reserved `/nowe` for S-01, not as a forever path). Public share URLs must stay outside the proxy matcher.

Research: `context/changes/post-session-and-share/research.md`. Map stack locked: Leaflet + react-leaflet v5, MapTiler Cloud Free raster XYZ (`streets-v4`), `NEXT_PUBLIC_MAPTILER_KEY`. Lesson: public chrome fail-open; gated pages fail-closed.

## Desired End State

A logged-in slackliner opens `/spot`, sees existing spots as map pins, taps a pin or the empty map, optionally names a new spot, sets start and finish, and submits. They land on `/sesja/<id>` and can copy that URL. A visitor with no account sees time (Europe/Warsaw), the spot name or coordinates, and a link that opens the place on a map. Logged-out `/spot` never shows the form. `/nowe` redirects to `/spot`.

### Key Discoveries:

- Session lookup is `getSession` in `src/lib/session.ts` (`cache()`). Writes must call it in the server action; proxy only checks cookie presence (`src/proxy.ts:5-17`).
- Product tables go in a new schema file; barrel `src/lib/schema/index.ts`; Better Auth adapter stays the four-table object in `src/lib/auth.ts`. Widen `drizzle.config.ts` or `db:generate` emits nothing.
- `user.id` is `text`. Creator FKs must be `text` referencing `user.id`. Auth FKs cascade; product FKs must not.
- Leaflet is not SSR-safe. `next/dynamic(..., { ssr: false })` must be called from a Client Component, not from `/spot/page.tsx` if that page stays a Server Component (`research.md`, react-leaflet limitations).
- OSMF `tile.openstreetmap.org` is not a production CDN. MapTiler raster XYZ: `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=…` with `tileSize: 512`, `zoomOffset: -1`.
- No test runner. Verification is `npm run lint`, `npm run build`, migrate, and a written manual path.

## What We're NOT Doing

- Spot photos, Blob, `next/image` for uploads (S-02)
- Next-session ranking on `/` (S-03)
- Creator edit UI (S-04) — `creator_id` is stored only
- Spots catalog page (FR-017), dedicated share-button (FR-009)
- Event description, skill, recurrence, favorites, ratings
- MapTiler SDK, vector `maptilerLayer`, geocoding control
- Mapbox, Google, OSMF public tiles as the tile URL
- Leaflet draw/cluster plugins
- Map JS on the public event page
- Test runner, GitHub Actions, unattended `vercel deploy --prod`
- Re-scaffolding auth or a second DB client

## Implementation Approach

Two entities, one gated page. `spot` and `event` in Postgres. `/spot` is the logged-in workspace: MapTiler+Leaflet island, pins for existing spots, empty-map tap for a new spot, start/finish, one server action. New pin writes spot+event in one `db.transaction`. Existing pin writes an event on that `spot_id`. After success, `redirect` to `/sesja/[id]`. That page is ungated, text + OSM (or equivalent) map link, no `getSession()`. `/nowe` 308s to `/spot`. Proxy matcher becomes exact `["/spot"]`.

## Critical Implementation Details

**Timing & lifecycle.** Proxy matcher must stay an exact path (`/spot`), never `/spot/:path*` or a prefix that could swallow a future nested public URL. `dynamic({ ssr: false })` is illegal in a Server Component — wrap the map in a client caller. Create writes `getSession()` in the action; missing session redirects to `/logowanie?callbackUrl=/spot`.

**User experience spec.** All new copy Polish. Chrome link label Polish (e.g. “Nowa sesja”) even though the path is `/spot`. Map and controls `min-h-12` / `text-base`. Clicking a pin selects that spot (reuse); clicking the map background sets a new lat/lng (create). Marker `click` must not also apply map-background lat/lng (Leaflet fires map `click` after marker `click` unless the marker stops propagation). Finish must be strictly after start. Times are typed as local clock, stored UTC, shown Europe/Warsaw. Do **not** parse `datetime-local` with `new Date("YYYY-MM-DDTHH:mm")` — Vercel Node is UTC and that string becomes Zulu. Use `src/lib/warsaw-time.ts`.

**Performance constraints.** Do not load Leaflet on `/sesja/[id]`. Missing MapTiler key must fail the map island, not 500 the document.

## Phase 1: Product schema

### Overview

Add `spot` and `event` tables on the existing Neon database without touching Better Auth tables.

### Changes Required:

#### 1. Product schema file

**File**: `src/lib/schema/spots.ts` (name may vary; must not live in `auth.ts`) + `src/lib/schema/index.ts`

**Intent**: Persist spots and single events so S-01 can write and public pages can read.

**Contract**: Table names `spot` and `event` (singular, no clash with `user` / `session` / `account` / `verification`). `spot`: `id` text PK, `name` text nullable, `lat` / `lng` double precision not null, `creator_id` text not null FK → `user.id` **ON DELETE RESTRICT**, `created_at` timestamptz not null. `event`: `id` text PK, `spot_id` text not null FK → `spot.id` **ON DELETE RESTRICT**, `starts_at` / `ends_at` timestamptz not null, `creator_id` text not null FK → `user.id` **ON DELETE RESTRICT**, `created_at` timestamptz not null. Use `timestamp(..., { withTimezone: true })`, not the naive `timestamp()` used on auth rows. Re-export from the schema barrel. Do not pass these tables into `drizzleAdapter`.

#### 2. Drizzle kit path

**File**: `drizzle.config.ts`

**Intent**: `db:generate` must see product tables.

**Contract**: `schema` points at `./src/lib/schema/index.ts` (or a glob that includes the new file), not only `auth.ts`. Do not rewrite `0000` / `0001`.

#### 3. Migration

**File**: `drizzle/0002_*.sql` via `npm run db:generate`

**Intent**: Apply forward-only DDL on Neon.

**Contract**: `npm run db:migrate` creates both tables and FKs. Empty name is NULL, not `""`.

### Success Criteria:

#### Automated Verification:

- `npm run db:generate` produces a new `0002_*` migration that creates `spot` and `event` only
- `npm run db:migrate` applies on a database that already has `0000`/`0001`
- `npm run lint` passes

#### Manual Verification:

- Neon (or local) `\d spot` / `\d event` shows timestamptz columns and RESTRICT FKs to `user`
- Auth tables unchanged; existing login still works

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: MapTiler and Leaflet island

### Overview

Wire MapTiler raster tiles and a SSR-safe Leaflet island onto gated `/spot`, and retire `/nowe`.

### Changes Required:

#### 1. Dependencies and env name

**File**: `package.json`, `.env.example`

**Intent**: This change is the PRD map-picker assembly (`AGENTS.md` exception). Document the key name without committing values.

**Contract**: Add `leaflet` and `react-leaflet` (v5, React 19 peer). `.env.example` gains `NEXT_PUBLIC_MAPTILER_KEY=` with a comment to create a **protected** key (not MapTiler’s default) and restrict HTTP origins (`localhost`, `slacklans.vercel.app`, preview hosts). Do not add MapTiler SDK.

#### 2. Map island

**File**: colocated client components under `src/` (e.g. `src/components/SpotMap.tsx` + a `dynamic({ ssr: false })` caller)

**Intent**: Logged-in user sees a Gdynia-centered map with MapTiler `streets-v4` tiles.

**Contract**: Import `leaflet/dist/leaflet.css` from the client module. Tile URL and `tileSize` / `zoomOffset` as in MapTiler’s Leaflet npm starter. Attribution: © MapTiler + © OpenStreetMap contributors; satisfy Free-plan logo rules. Explicit non-zero height. Missing or empty key: Polish inline error, no throw. Default view: Gdynia (approx. 54.52, 18.53). No geocoding, no vector plugin. Fix default marker icons if webpack breaks them.

#### 3. Gated `/spot` and `/nowe` redirect

**File**: `src/app/spot/page.tsx`, `src/proxy.ts`, `next.config.ts`, delete `src/app/nowe/page.tsx`

**Intent**: `/spot` is the reserved write URL; old `/nowe` bookmarks still work.

**Contract**: Proxy matcher exact `["/spot"]`; missing cookie → `/logowanie?callbackUrl=/spot`. Page `getSession()` fail-closed (no try/catch). `next.config.ts` `redirects`: `/nowe` → `/spot`, `permanent: true`. Do not put `/sesja` in the matcher. Phase 2 page may show only the map (form in Phase 3).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes with `NEXT_PUBLIC_MAPTILER_KEY` unset (map island degrades, build does not)

#### Manual Verification:

- With a protected key in `.env.local`, logged-in `/spot` shows MapTiler tiles over Gdynia, attribution visible
- Logged-out `/spot` goes to login, not the map
- `/nowe` redirects to `/spot` (then login if logged out)
- `/` and `/sesja/anything` are not cookie-gated by proxy
- Phone-width: map is tappable, not hover-only

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. Human must create the MapTiler account and protected key; the agent cannot invent it.

---

## Phase 3: Post a session from `/spot`

### Overview

Existing pins, new-spot tap, optional name, start/finish, atomic write, redirect to `/sesja/<id>` (the public page itself is Phase 4; a 404 there in this phase is expected).

### Changes Required:

#### 1. Load spots for the map

**File**: `/spot` server page + map island props

**Intent**: Logged-in user sees every existing spot as a pin (reuse is community-wide, not “mine only”).

**Contract**: Server reads spots via `getDb()`; pass serializable `{ id, name, lat, lng }[]` into the client island. Pin tap selects `spotId` and must **not** also set new-spot lat/lng (stop marker click from reaching the map, or ignore map `click` when a marker handled it). Map-background tap clears `spotId` and sets new lat/lng. Selected pin is visually distinct.

#### 2. Create form and action

**File**: colocated `*Form.tsx` on `/spot` + `"use server"` module under `src/lib/` (not `auth-actions.ts`) + `src/lib/warsaw-time.ts`

**Intent**: One page submits a session: existing spot **or** new spot + times. Clock math lives in one helper so Vercel UTC cannot shift Gdynia by two hours.

**Contract**: Copy login form pattern: `useActionState`, `{ error?: string }` or `redirect`, Polish `role="alert"`. Fields: optional name (new spots only), start, finish (`datetime-local`). Hidden: selected `spotId` or `lat`/`lng`. Server: `getSession()` fail-closed; normalize empty name to null. `warsaw-time.ts` parses a `datetime-local` string as `Europe/Warsaw` and returns a UTC `Date` (no extra date library required; do not use `new Date(localString)`). Invalid/gap DST instants → Polish error, no row. Format for `/sesja/[id]` uses `timeZone: "Europe/Warsaw"` / `pl-PL`. Reject `ends_at <= starts_at`; reject missing place; lat ∈ [-90,90], lng ∈ [-180,180]. New spot: `db.transaction` insert spot then event with `session.user.id` as both `creator_id`. Existing spot: insert event only. Success: `redirect("/sesja/" + event.id)`. Ids: text (e.g. `crypto.randomUUID()`).

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- New pin + name + valid times → row in `spot` and `event`; browser URL is `/sesja/<id>` (page may 404 until Phase 4)
- Existing pin + valid times → new `event` only, same `spot_id`; URL is `/sesja/<id>` (page may 404 until Phase 4)
- Finish equal to or before start → Polish error, no row
- Logged-out POST cannot create (session required)
- Usable on a phone-width viewport (48px targets, map tap vs pin tap distinguishable)

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 4: Public `/sesja/[id]` and chrome

### Overview

Visitor share page, logged-in entry to `/spot`, production MapTiler key.

### Changes Required:

#### 1. Event page

**File**: `src/app/sesja/[id]/page.tsx`

**Intent**: Anyone with the URL sees when and where, with no account and no extra personal data.

**Contract**: `PageProps<"/sesja/[id]">`, `await params`. Unknown id → `notFound()` (default Next 404 is fine; do not add a custom `not-found.tsx` unless needed). **Do not** call `getSession()` on this page. Show: start and finish formatted `Europe/Warsaw` (`pl-PL`), spot `name` or lat/lng fallback, link to OSM (or equivalent) for those coordinates (`mlat`/`mlon`). No Leaflet. Title via `generateMetadata` (dynamic) — pattern `"Sesja — Slacklans"` plus name if present. Join `event` → `spot` in one query.

#### 2. Chrome CTA

**File**: `src/components/SessionChrome.tsx`

**Intent**: Logged-in users can reach `/spot` without typing the path.

**Contract**: Logged-in header: Polish link to `/spot` (e.g. “Nowa sesja”) plus email + Wyloguj. Logged-out header unchanged. Keep fail-open try/catch. `min-h-12`, not hover-only.

#### 3. Production MapTiler key

**File**: Vercel project env (not git)

**Intent**: Production/preview tiles work with a domain-restricted key.

**Contract**: `NEXT_PUBLIC_MAPTILER_KEY` set for Production and Preview. HTTP origins include `slacklans.vercel.app` and preview hosts. Do not commit the value. Deploy only with an explicit human ask.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run build` passes

#### Manual Verification:

- Logged-out `/sesja/<real-id>` is 200: Warsaw times, name or coords, map link works, no login wall, no Leaflet network requests
- Unknown `/sesja/…` is 404, not the create form
- Logged-in chrome “Nowa sesja” (or chosen label) opens `/spot`
- After logout, `/spot` is gated again; `/sesja/<id>` still public
- Production (or agreed preview): register → `/spot` tiles load → post → share URL → logged-out visitor sees the session

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- None this change (no test runner).

### Integration Tests:

- None this change.

### Manual Testing Steps:

1. Logged-out `/`: public Polish home, no create form.
2. Logged-out `/spot` and `/nowe`: login, not the map.
3. Login, `/spot`: MapTiler tiles, existing pins if any.
4. Tap empty map, optional name, start/finish (finish after start) → land on `/sesja/<id>`.
5. Copy URL, logout, open it: times in Polish/Warsaw, place, map link; no account prompt.
6. Login, tap an existing pin, new times → second event, same spot.
7. Finish ≤ start → error, no row.
8. Phone-width: pin vs map tap, 48px chrome link, Wyloguj still a button.

## Performance Considerations

Leaflet only on gated `/spot`. Public `/sesja/[id]` is a cheap server render (one join). Proxy must not run on `_next` or `/`. MapTiler Free pauses at quota — do not add geocoding or a visitor map.

## Migration Notes

Forward-only `0002`. No backfill. Rollback: remove `/spot` and `/sesja` routes, restore `/nowe` stub, drop `event` then `spot` by hand if needed. App rollback does not undo Neon. Do not replay `0001` on a DB that already has `account` rows.

## References

- Research: `context/changes/post-session-and-share/research.md`
- Map library notes: `exa-results/map-library-2026-09-08.md`
- MapTiler Leaflet: https://docs.maptiler.com/leaflet/examples/npm-get-started/
- Key protection: https://docs.maptiler.com/guides/maps-apis/maps-platform/how-to-protect-your-map-key/
- F-01 patterns: `src/lib/auth-actions.ts`, `src/app/logowanie/LoginForm.tsx`, `src/proxy.ts`, `src/lib/session.ts`
- Lesson: `context/foundation/lessons.md` (public chrome fail-open)
- Roadmap S-01: `context/foundation/roadmap.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Product schema

#### Automated

- [ ] 1.1 npm run db:generate produces a new 0002_* migration that creates spot and event only
- [ ] 1.2 npm run db:migrate applies on a database that already has 0000/0001
- [ ] 1.3 npm run lint passes

#### Manual

- [ ] 1.4 Neon (or local) shows timestamptz columns and RESTRICT FKs to user
- [ ] 1.5 Auth tables unchanged; existing login still works

### Phase 2: MapTiler and Leaflet island

#### Automated

- [ ] 2.1 npm run lint passes
- [ ] 2.2 npm run build passes with NEXT_PUBLIC_MAPTILER_KEY unset

#### Manual

- [ ] 2.3 With a protected key in .env.local, logged-in /spot shows MapTiler tiles over Gdynia, attribution visible
- [ ] 2.4 Logged-out /spot goes to login, not the map
- [ ] 2.5 /nowe redirects to /spot (then login if logged out)
- [ ] 2.6 / and /sesja/anything are not cookie-gated by proxy
- [ ] 2.7 Phone-width: map is tappable, not hover-only

### Phase 3: Post a session from `/spot`

#### Automated

- [ ] 3.1 npm run lint passes
- [ ] 3.2 npm run build passes

#### Manual

- [ ] 3.3 New pin + name + valid times → spot and event rows; URL is /sesja/<id> (page may 404 until Phase 4)
- [ ] 3.4 Existing pin + valid times → new event only, same spot_id; URL is /sesja/<id> (page may 404 until Phase 4)
- [ ] 3.5 Finish equal to or before start → Polish error, no row
- [ ] 3.6 Logged-out POST cannot create
- [ ] 3.7 Usable on a phone-width viewport

### Phase 4: Public `/sesja/[id]` and chrome

#### Automated

- [ ] 4.1 npm run lint passes
- [ ] 4.2 npm run build passes

#### Manual

- [ ] 4.3 Logged-out /sesja/<real-id> is 200: Warsaw times, name or coords, map link, no login wall, no Leaflet
- [ ] 4.4 Unknown /sesja/… is 404, not the create form
- [ ] 4.5 Logged-in chrome opens /spot
- [ ] 4.6 After logout, /spot is gated; /sesja/<id> still public
- [ ] 4.7 Production (or agreed preview): tiles + post + logged-out visitor sees the session
