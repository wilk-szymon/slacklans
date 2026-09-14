# Post session and share — Plan Brief

> Full plan: `context/changes/post-session-and-share/plan.md`
> Research: `context/changes/post-session-and-share/research.md`

## What & Why

A logged-in slackliner needs a durable place-and-time to hand a passerby. This slice is roadmap S-01: pick (or reuse) a spot on a map, post one session with start and finish, share `/sesja/[id]`. Visitors read it with no account.

## Starting Point

F-01 is done: email/password, Neon, Polish chrome, fail-closed `/nowe` stub. No spots, events, or map. `/nowe` was a placeholder for this slice, not the product URL.

## Desired End State

Logged-in `/spot` shows a Gdynia map: tap a pin to reuse a spot, tap empty map to add one (optional name), set times, submit. Browser opens `/sesja/<id>` (the share link). A logged-out visitor sees Warsaw times, the place, and a map link.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Map library | Leaflet + react-leaflet v5 | Phone raster picker; no WebGL | Research + Exa |
| Tiles | MapTiler Cloud Free `streets-v4` | Not OSMF CDN; no Mapbox/Google bill | Research + user |
| Create URL | `/spot` (not `/nowe`) | One logged-in page for spots + sessions | Plan (user) |
| Share URL | `/sesja/[id]` | Polish slug; ungated | Plan (user) |
| Spot fields | lat/lng + optional name | Visitors can read a place; reuse without a catalog | Plan |
| Times | UTC `timestamptz`, show Europe/Warsaw via `src/lib/warsaw-time.ts` | Vercel Node is UTC; naive `Date(datetime-local)` is wrong | Plan |
| Create UX | One page, pins on the same map | FR-005 without a catalog | Plan (user) |
| Creator | `creator_id` now, no edit UI | S-04 needs it; ON DELETE RESTRICT | Plan |
| Visitor location | Text + OSM (or equivalent) link | No Leaflet on the share URL | Plan (user) |
| Bad times | Reject finish ≤ start | Session has positive duration | Plan |
| After submit | Redirect to `/sesja/[id]` + chrome CTA | Address bar is the share link (FR-009 parked) | Plan |

## Scope

**In scope:** Schema, MapTiler+Leaflet on gated `/spot`, pin reuse, optional name, start/finish, public `/sesja/[id]`, `/nowe` → `/spot`, chrome link, Vercel MapTiler key.

**Out of scope:** Photos, home ranking, edit UI, catalog, share button, description/skill/recurrence, MapTiler SDK/geocoding, visitor map JS, test runner, unattended prod deploy.

## Architecture / Approach

`spot` + `event` on the existing Neon Pool. `/spot` is a Server Component page with a client map island (`dynamic({ ssr: false })`) and a server action. New pin: one transaction (spot then event). Existing pin: event only. Proxy matcher exact `/spot`. `/sesja/[id]` is public, no `getSession()`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Product schema | `spot` / `event`, 0002, kit path widened | Naive timestamps copied from auth |
| 2. MapTiler + Leaflet | Tiles on gated `/spot`, `/nowe` redirect | SSR `window`, missing key, OSMF URL slip |
| 3. Post from `/spot` | Pins, form, atomic write, redirect | Pin vs map tap; Warsaw parse |
| 4. Public `/sesja/[id]` | Share page, chrome, Vercel key | Accidentally gating `/sesja` |

**Prerequisites:** Neon + auth from F-01; human MapTiler account and a **protected** key (agent cannot invent it).
**Estimated effort:** ~3–4 sessions across 4 phases.

## Open Risks & Assumptions

- MapTiler Free is non-commercial, logo on map, quota **pauses** (no bill).
- react-leaflet v5 is quiet (OpenSSF Maintained 0/10 as of 2026-06) — keep the island thin.
- Logged-in visit to `/logowanie?callbackUrl=/spot` still redirects **home** (F-01); return-to-`/spot` only on successful login POST.
- `AGENTS.md` still says map picker is absent; this change **is** the assembly task.

## Success Criteria (Summary)

- Logged-in user posts a session from `/spot` (new or existing pin) and gets `/sesja/<id>`.
- Logged-out visitor opens that URL and sees time + place + map link, no account.
- `/spot` is gated; `/` and `/sesja/<id>` are not.
