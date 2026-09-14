---
date: 2026-09-08T22:33:22+02:00
researcher: Grok 4.6
git_commit: 5adf5e505b8b95c478aa968bff163df9818999b7
branch: main
repository: slacklans
topic: "What does the codebase already provide and constrain for S-01 post-session-and-share?"
tags: [research, codebase, auth, drizzle, neon, app-router, spots, events, map-picker]
status: complete
last_updated: 2026-09-08
last_updated_by: Grok 4.6
last_updated_note: "Locked MapTiler Cloud Free as tile host with Leaflet raster XYZ"
---

# Research: Post session and share (S-01)

**Date**: 2026-09-08T22:33:22+02:00
**Researcher**: Grok 4.6
**Git Commit**: `5adf5e505b8b95c478aa968bff163df9818999b7` (HEAD; `chore(archive): close minimal-login`, unpushed)
**Branch**: `main` (ahead of `origin/main` by 1)
**Repository**: [wilk-szymon/slacklans](https://github.com/wilk-szymon/slacklans)

Source permalinks below use `origin/main` at [`172dcbc947ff034e8ace328808f1a981307fa337`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337) because HEAD is not on GitHub yet. Archive paths are local (`context/archive/...`).

## Research Question

What does the Slacklans codebase already provide — and constrain — for implementing roadmap S-01 `post-session-and-share`: a logged-in slackliner creates a spot by picking a place on the map (or picks an existing spot), posts a single event with that spot and start/finish time, and a visitor opens the event URL and sees time and location with no account?

## Summary

F-01 (`minimal-login`) is done and archived. The live app already has Better Auth email/password, Neon WebSocket `Pool` + Drizzle with `transaction: true`, Polish public chrome, and a fail-closed `/nowe` coming-soon page. Product data, a map picker, and a public event route do **not** exist.

S-01 is greenfield product work on top of that session gate:

- Fill `/nowe` as the logged-in create flow (keep proxy matcher exact + page `getSession()` fail-closed).
- Add spots and events tables via a new Drizzle schema file; widen `drizzle.config.ts` (it currently points only at auth).
- Put the visitor event page on a **new ungated path**. Do not nest it under `/nowe` or widen `proxy.ts` to a prefix.
- Copy the existing `useActionState` + `"use server"` form pattern. Store `session.user.id` (`text`, not uuid) if a creator FK is added.
- Do **not** ship photos (S-02), next-session home ranking (S-03), creator edit UI (S-04), description/skill/recurrence, a dedicated share button, or a spots catalog.

Map library, event URL slug, timezone for Gdynia times, and one-page vs two-step create UX are **not** answered by this tree. `AGENTS.md` still claims auth/Postgres are absent — that is stale; map picker and photos are still absent.

## Detailed Findings

### Auth, session, and write-gating

The only app session wrapper is `getSession` in [`src/lib/session.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/session.ts#L5-L9): React `cache()` around `auth.api.getSession({ headers })`. There is no `requireSession` helper. Call sites: `SessionChrome`, `/nowe`, `/logowanie`, `/rejestracja`. Chrome + page share one lookup per request.

Better Auth lives in [`src/lib/auth.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/auth.ts#L7-L47): Drizzle adapter with an **explicit** four-table schema, `transaction: true`, `nextCookies()`, email/password only, 7-day session, sign-in rate limit, and `disabledPaths` including `"/sign-up/email"`. HTTP catch-all: [`src/app/api/auth/[...all]/route.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/api/auth/%5B...all%5D/route.ts). Mutations are server actions in [`src/lib/auth-actions.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/auth-actions.ts) — no Better Auth client SDK.

`/nowe` is dual-gated and fail-closed:

| Layer | What it checks | Missing session |
| --- | --- | --- |
| [`src/proxy.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/proxy.ts#L5-L17) | Cookie **presence** via `getSessionCookie` | `/logowanie?callbackUrl=/nowe` |
| [`src/app/nowe/page.tsx`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/nowe/page.tsx#L8-L12) | Real `getSession()` (no try/catch) | same redirect; throw → 500 |

Proxy matcher is **exact** `["/nowe"]` — not `/nowe/*`, not `/`, not `_next`. Cookie presence can pass an expired token; the page is the real gate. Create **writes** must call `getSession()` in the server action, not trust the proxy.

[`SessionChrome`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/components/SessionChrome.tsx#L4-L11) catches `getSession` errors and renders the logged-out header. Root layout mounts it on every page ([`src/app/layout.tsx`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/layout.tsx#L21-L31)). Lesson still holds: public chrome fail-open; gated pages fail-closed (`context/foundation/lessons.md`). Chrome does **not** link to `/nowe`. Logged-in chrome is email + `Wyloguj` only.

Identity after login: `session.user.id` (Postgres `user.id` **text** PK), `email`, `name`. No roles. That `id` is the FK type for a future `creator_id`.

`safeCallbackPath` ([`src/lib/safe-callback-path.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/safe-callback-path.ts#L16-L43)) allows same-origin relative paths only (rejects `//`, `\`, control chars, encoded `%2f`/`%5c`, off-origin `new URL`). Login/register **POST** redirects to `callbackUrl`. Logged-in GET of `/logowanie?callbackUrl=/nowe` still `redirect("/")` ([`src/app/logowanie/page.tsx`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/logowanie/page.tsx#L14-L17)) — return-to-`/nowe` only works on successful form submit.

### Data layer (Neon / Drizzle)

Live client is **not** neon-http. [`src/lib/db.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/db.ts#L1-L31): `@neondatabase/serverless` `Pool`, `drizzle-orm/neon-serverless`, `ws` polyfill, pool cached on `globalThis`. Archived F3 (`neon-http` + `transaction: false`) was fixed via Pool + `transaction: true`.

Schema is identity only — four Better Auth tables in [`src/lib/schema/auth.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/schema/auth.ts): `user`, `session`, `account`, `verification`. Barrel [`src/lib/schema/index.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/schema/index.ts) re-exports auth. **No** spots, events, lat/lng, geo, PostGIS, or photo columns.

Two consumers, intentionally different:

| Consumer | Import | Must stay |
| --- | --- | --- |
| `getDb()` | `import * as schema from "@/lib/schema"` | Product tables can join the barrel |
| Better Auth adapter | explicit `{ user, session, account, verification }` from `auth.ts` | Do **not** pass the full barrel |

[`drizzle.config.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/drizzle.config.ts#L6-L13) `schema` is **only** `./src/lib/schema/auth.ts`. New product files are invisible to `npm run db:generate` until this path is widened to the barrel or a glob. Journal has two migrations: `0000_illegal_mentallo`, `0001_lush_wiccan`. 0001 adds `account.issuer` `NOT NULL` with no default — already applied; do not replay on a DB that already has accounts. S-01 should add **0002+**, not rewrite 0000/0001.

Env names (values not in git): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`. Documented in `.env.example` (gitignored `.env*` except the example). `getDb()` is unused outside auth today; product writes will call it. Reuse the same Pool; do not add a second client. `user.id` is `text`, not `uuid`. Email uniqueness is a case-sensitive DB unique plus app `trim().toLowerCase()`. Timestamps are `timestamp` without time zone. No RLS.

### Routes, UI, and form conventions

Route inventory today:

| Path | File | Classification |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | Public stub. No event list. Never redirects to login. |
| `/nowe` | `src/app/nowe/page.tsx` + `src/proxy.ts` | Fail-closed placeholder: “Wkrótce / Dodawanie spotów i sesji pojawi się wkrótce.” No form, no map. |
| `/logowanie` | `src/app/logowanie/` | Public form; session present → `/`. |
| `/rejestracja` | `src/app/rejestracja/` | Same as login. |
| `/api/auth/*` | catch-all | Better Auth HTTP; sign-up email path disabled. |

No nested layouts, no `loading.tsx` / `error.tsx` / `not-found.tsx`. No dynamic `[id]` / `[slug]` App Router page except the auth catch-all. No `/wydarzenie`, `/sesja`, or `/e/` route. Home copy: “Miejsca i sesje slackline w Gdyni. Możesz przeglądać bez konta.” ([`src/app/page.tsx`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/page.tsx#L1-L9)).

Form pattern to copy ([`LoginForm.tsx`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/logowanie/LoginForm.tsx)):

1. Server page: metadata, optional `getSession()`, `safeCallbackPath`.
2. Colocated PascalCase `"use client"` form with `useActionState`.
3. `"use server"` action in `src/lib/` taking `FormData`, returning `{ error?: string }` or `redirect(...)`.
4. Single Polish `role="alert"` `aria-live="polite"` error. HTML5 constraints plus server re-check. `min-h-12` controls, `text-base` inputs, pending `disabled` + ellipsis label.
5. No Zod / RHF / form library. `"use client"` exists only on the two auth forms.

URL slugs are Polish (`/logowanie`, `/rejestracja`, `/nowe`); code identifiers and query keys are English (`callbackUrl`). `html lang="pl"`. Phone: 48px targets, no hover-only logout, `flex-wrap` header.

Map picker: **absent**. No leaflet / mapbox / maplibre / Google Maps / OSM / nominatim / geolocation usage in `src/` or lockfile. S-01 has nothing to copy for map UI.

### Product and stack constraints

Roadmap S-01 (`context/foundation/roadmap.md`) in-scope: FR-002, FR-004, FR-005, FR-006, FR-010, US-01 **minus** photos and creator-edit (those moved to later slices).

| In S-01 | Out of S-01 |
| --- | --- |
| New spot by map pick | Spot photos (S-02 / FR-003) |
| Pick an **existing** spot for a new event | Next-session home ranking (S-03 / FR-012); 2s NFR lives there |
| Single event + **start and finish** required | Creator edit UI (S-04 / FR-011) |
| Public event page: time + location, no account, no extra personal data | Spots catalog (FR-017 parked) |
| Event page URL **is** the share link | Dedicated share-link action (FR-009 parked) |
| Polish; phone-usable outdoors | Description, skill, recurrence, favorites, ratings, confirm-tag |

PRD shape that the schema/UX must obey: **spots and events are two entities**, one UX flow. Visitors never need an account. Flat users; writes require login. Description and skill are not required and are parked — do not add those fields.

Tech-stack (`context/foundation/tech-stack.md`) names map picking as extra assembly and **does not pick a library**. Infra (`context/foundation/infrastructure.md`): `fra1` already in [`vercel.json`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/vercel.json); Neon EU already decided; Blob and Hobby image-transform caps are **S-02**; Next 16 uses `proxy.ts` not `middleware.ts`; app rollback does not undo Neon migrations. No test runner; do not add one. No GitHub Actions in tree; do not add GHA + Vercel Git auto-deploy together.

`AGENTS.md` hard rule still says auth, Postgres, spot photos, and the map picker are “absent from this tree.” Auth and Postgres **are present**. Map picker and photos **are still absent**. S-01 **is** the task that assembles map picking + product persistence; the same sentence already allows that (“unless the task is to assemble them”). Do not re-scaffold auth. Roadmap Baseline and Backlog Handoff still describe F-01 as absent/planning — stale after archive.

Public event pages inherit fail-open chrome via root layout. They must **not** `getSession()`-redirect logged-out visitors. The 2-second “highlighted next event” NFR is S-03’s home ranking, but the share URL still has to stay cheap and ungated (outdoor phone, no login wall). Heavy map JS belongs on logged-in `/nowe`, not necessarily on the visitor page.

## Code References

- [`src/lib/session.ts:5-9`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/session.ts#L5-L9) — `cache()`-wrapped `getSession`
- [`src/lib/auth.ts:7-47`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/auth.ts#L7-L47) — Better Auth, Pool adapter `transaction: true`, `disabledPaths`
- [`src/lib/db.ts:1-31`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/db.ts#L1-L31) — Neon WebSocket `Pool` + `ws`
- [`src/lib/schema/auth.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/schema/auth.ts) — `user.id` text PK; identity tables only
- [`src/lib/schema/index.ts:1`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/schema/index.ts#L1) — barrel re-export of auth
- [`drizzle.config.ts:6-8`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/drizzle.config.ts#L6-L8) — kit schema path is auth-only (S-01 generate miss if unchanged)
- [`src/proxy.ts:5-17`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/proxy.ts#L5-L17) — exact `/nowe` matcher, cookie presence only
- [`src/app/nowe/page.tsx:8-20`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/nowe/page.tsx#L8-L20) — fail-closed coming-soon stub
- [`src/components/SessionChrome.tsx:4-47`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/components/SessionChrome.tsx#L4-L47) — fail-open chrome; no `/nowe` CTA
- [`src/app/layout.tsx:21-31`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/layout.tsx#L21-L31) — `lang="pl"`, chrome on every page
- [`src/app/page.tsx:1-9`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/page.tsx#L1-L9) — public home stub
- [`src/app/logowanie/page.tsx:14-20`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/logowanie/page.tsx#L14-L20) — logged-in login visits go home, not `callbackUrl`
- [`src/app/logowanie/LoginForm.tsx`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/app/logowanie/LoginForm.tsx) — form pattern for create
- [`src/lib/safe-callback-path.ts:16-43`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/safe-callback-path.ts#L16-L43) — tightened same-origin callback
- [`src/lib/auth-actions.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/lib/auth-actions.ts) — `{ error?: string }` or `redirect`; email lowercasing
- [`vercel.json`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/vercel.json) — `regions: ["fra1"]`
- `context/foundation/lessons.md` — public chrome must fail open
- `context/foundation/roadmap.md` — S-01 proposed; F-01 done

## Architecture Insights

1. **Reuse the session gate; do not rebuild it.** `/nowe` is the reserved create URL. Public share links must live **outside** `proxy.ts`’s matcher and must not fail-closed-redirect.
2. **Schema split is already the right pattern.** New product tables in a new file under `src/lib/schema/`, re-export from `index.ts`, keep adapter imports pinned to `auth.ts`, **widen `drizzle.config.ts`**.
3. **Writes go through server actions + `getSession()`, same as login.** No Better Auth HTTP client; `/sign-up/email` is 404 by design. Atomic spot+event inserts should use the existing Pool (`db.transaction`), not a new neon-http client.
4. **Creator identity is `user.id` text.** If S-01 persists `createdBy` for S-04, the column type is `text` referencing `user.id`. ON DELETE is a product choice (auth FKs currently cascade).
5. **Polish URLs, English code.** Inventing `/wydarzenie/[id]` (or similar) matches `/logowanie` / `/nowe`. Query keys stay English.
6. **Keep `/` a cheap public page.** S-03 owns next-event ranking. S-01 must not turn home into a login wall or a heavy map.
7. **AGENTS.md will fight the map library unless the plan cites S-01 as the assembly task.** Photos/Blob stay out.

## Historical Context (from prior changes)

- `context/archive/2026-09-05-minimal-login/change.md` — F-01 was only the session gate; spots/events/photos out of scope; `/nowe` reserved for S-01.
- `context/archive/2026-09-05-minimal-login/plan.md` — Better Auth + Neon EU + `proxy.ts`; public `/`; fail-closed `/nowe`; S-01 reuses the same Postgres.
- `context/archive/2026-09-05-minimal-login/plan-brief.md` — write gate is `/nowe` coming soon; durable users so S-01 can require a logged-in slackliner.
- `context/archive/2026-09-05-minimal-login/reviews/impl-review-phase-3.md` — chrome fail-open (now a lesson); `cache()` session (live in `session.ts`).
- `context/archive/2026-09-05-minimal-login/reviews/impl-review.md` — `safeCallbackPath` tightened (F1 FIXED); HTTP sign-up disabled (F2 FIXED); Pool+transactions (F3 FIXED via Fix B); logout fail-safe; 0001 issuer migration left as-is.

Roadmap Baseline still claims Data/Auth absent as of 2026-09-05; live tree contradicts that. Backlog Handoff still points F-01 at `context/changes/minimal-login/` — that folder is archived.

## Related Research

No other `research.md` exists under `context/changes/` or `context/archive/`. This is the first internal research artifact for the repo.

## Open Questions

These are **not** answered by the codebase. Do not invent them in this document; they need a human call and/or external research (exa / library docs) before `/10x-plan`.

1. **Map library** — none chosen. Tech-stack only says “extra assembly.”
2. **Event URL shape** — PRD says the page URL is the share link; no path or id strategy (`/wydarzenie/[id]` vs slug vs opaque id).
3. **Timezone** — start and finish are required; no `Europe/Warsaw` vs UTC storage/display rule.
4. **Create UX** — one page vs two steps. PRD separates **entities** (spot vs event), not screens. `/nowe` is a single reserved URL.
5. **Existing-spot picker** — FR-005 requires picking an existing spot; FR-017 catalog is parked. Map pins vs a short list is unspecified.
6. **Spot fields beyond coordinates** — name? address? nothing in schema or PRD beyond “place on the map.”
7. **Persist `createdBy` in S-01?** — S-04 needs it later; not an S-01 success criterion. Planning choice.
8. **Map tile/API keys** — whether they belong in Vercel env; Hobby CPU risk of a map-heavy weekend is documented, vendor is not.

## Follow-up Research 2026-09-08T22:44:29+02:00

Pushed the eight open questions against product docs and live code. **Most stay unanswered as design picks.** What changed is the constraint list `/10x-plan` must not violate.

### What product docs actually settle

| Topic | Settled? | Constraint (not a design) |
| --- | --- | --- |
| Event URL path / id vs slug | No | Share **is** the public event page URL (FR-009 parked). `/nowe` is the create gate, not the visitor path. |
| One page vs two steps | No | “One UX flow” = two **entities** (spot + event) and reuse of an existing spot (FR-002 Socrates). Screen count is unspecified. Create stays on reserved `/nowe`. |
| Existing-spot pick without catalog | How: no | FR-005 is in S-01; FR-017 catalog is parked. Do not park FR-005 with FR-017. No list/select UI exists to copy. |
| Spot name / address fields | No | PRD only says “place on the map” (create) and visitor “time and location.” “Location” is always paired with time; FR-010’s “exact location” is a rejected safety objection, not a field type. |
| Persist `createdBy` in S-01 | When: no | S-01 PRD refs omit FR-011. Do not ship edit UI. Docs never say to store or omit a creator FK. |
| Timezone | No | Start **and** finish are clock times, not date-only or free text. `fra1` is compute region, not session TZ. |
| Visitor map vs text location | No | Create uses a map (FR-002). Visitor must see time + location ungated (FR-010). Map widget on the share page is unspecified. Exact location stays in scope. |
| Chrome `/nowe` CTA | No | F-01 chrome is email + Wyloguj; server gate, not only hidden links. S-01 does not require a CTA. |

### What live code adds

**Timestamps.** Auth columns are Postgres `timestamp` **without** time zone, Drizzle default `Date` mode (`toISOString` on write, `+0000` on read). Copying that helper for start/finish stores a UTC clock in a naive column. There is no `Europe/Warsaw`, `Intl`, `datetime-local`, or date library. A Gdynia display rule would be new.

**Public dynamic page.** Typed as `PageProps<"/…/[id]">` (global, no import), `params` is a `Promise`, await it — same as login’s `PageProps<"/logowanie">` + await `searchParams`. That type does not exist until the folder exists and Next typegen runs. Static `export const metadata = { title: "… — Slacklans" }` is the repo pattern; a per-event title needs `generateMetadata` (cannot coexist with static `metadata` in the same segment). No `not-found.tsx`; unknown paths and later `notFound()` use Next’s default 404.

**Proxy / chrome.** [`src/proxy.ts`](https://github.com/wilk-szymon/slacklans/blob/172dcbc947ff034e8ace328808f1a981307fa337/src/proxy.ts#L15-L17) matcher `["/nowe"]` does **not** gate `/wydarzenie/[id]` (or any other new path). Root layout always mounts `SessionChrome`, so a new public page gets fail-open header for free. A public event page that `await getSession()` without try/catch **can 500** when the session store is down — chrome’s catch does not protect the sibling page. Home does not call `getSession()`; copy that for the share URL.

**Map as a client island.** Copy LoginForm: keep `/nowe/page.tsx` a server component (`metadata` + `getSession`). Do not mark `layout.tsx` or the page `"use client"`. Do not import `getSession` / `next/headers` into the map island. Empty `next.config.ts` / no CSP means tiles are not blocked today; adding CSP without tile origins would block them. Map keys, if any, go in gitignored env (names in `.env.example` only). Heavy map JS on the **visitor** page is a Hobby CPU risk (`infrastructure.md`); create-time map on gated `/nowe` is the safer default unless the plan explicitly puts a map on the share URL.

### Still needs a human call or external research

Unchanged except map library and tile host (closed below): **event path + id strategy**, **timezone policy**, **screen count**, **existing-spot picker UI**, **spot fields beyond a map place**, **creator FK now vs S-04**.

## Follow-up Research 2026-09-08T23:05:00+02:00 (Exa: map library)

External research for open question 1. Full write-up: `exa-results/map-library-2026-09-08.md`.

**Recommendation for `/10x-plan`:** Leaflet + [react-leaflet](https://react-leaflet.js.org/docs/start-introduction/) v5 as a `"use client"` island behind `next/dynamic({ ssr: false })` on gated `/nowe`. Tiles from CARTO free or MapTiler Cloud Free, with OSM attribution. Do **not** use OSMF `tile.openstreetmap.org` as the production CDN ([tile policy](https://operations.osmfoundation.org/policies/tiles/)). Do not add Mapbox or Google. Do not put WebGL MapLibre on the outdoor picker unless a later slice needs vector styles.

Convergent practitioner pattern: GL stacks (Mapbox/MapLibre/Google) are regretted for “drop a pin”; raster Leaflet is regretted only when CSS/height/SSR are skipped. React 19 matches react-leaflet v5; the wrapper is quiet (OpenSSF Maintained 0/10 as of 2026-06) — keep the island thin, no draw/cluster plugins.

Still a human call: CARTO vs MapTiler as the tile host (both need a free key in Vercel env). Map library choice is no longer unknown.

## Follow-up Research 2026-09-08T23:20:00+02:00 (tile host: MapTiler)

Human decision: **MapTiler Cloud Free**, not CARTO. Library stays Leaflet + react-leaflet v5; MapTiler is the tile URL + key only.

Plan contract:

- Raster XYZ via native `L.tileLayer` / react-leaflet `TileLayer`. No MapTiler SDK, no `maptilerLayer` vector plugin, no geocoding control ([Leaflet + MapTiler](https://docs.maptiler.com/leaflet/), [raster XYZ](https://docs.maptiler.com/leaflet/examples/raster-tiles-in-leaflet-js/)).
- Official starter URL: `https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=…` with `tileSize: 512`, `zoomOffset: -1` ([npm get started](https://docs.maptiler.com/leaflet/examples/npm-get-started/)). 256px fallback: `.../streets-v4/256/{z}/{x}/{y}.png`.
- Env: `NEXT_PUBLIC_MAPTILER_KEY` (browser tile requests). Name only in `.env.example`; value in gitignored `.env*` and Vercel Production/Preview. Default key is unprotected — create a **new** key with Allowed HTTP origins (`localhost`, `slacklans.vercel.app`, preview hosts) ([protect key](https://docs.maptiler.com/guides/maps-apis/maps-platform/how-to-protect-your-map-key/)).
- Attribution on the map: © MapTiler + © OpenStreetMap contributors. Free plan also requires the **MapTiler logo** and is **non-commercial only**; quota pause, not a bill ([pricing](https://www.maptiler.com/cloud/pricing/)).
- Do not add MapTiler geocoding. Click → `e.latlng` is enough for S-01.

Human still creates the MapTiler account/key; the agent cannot invent it.
