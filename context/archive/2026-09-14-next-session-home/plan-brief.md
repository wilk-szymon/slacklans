# Next session home — Plan Brief

> Full plan: `context/changes/next-session-home/plan.md`

## What & Why

A passerby who only has the app name must see where and when to join, with no account (US-02 / FR-012). Home is that walk-up screen: the nearest still-running or upcoming session, then the rest in the same order.

## Starting Point

S-01 is done: spots, events, Warsaw times, public `/sesja/[id]`. `/` is still a static Polish blurb with no query. Chrome fail-open and “no `getSession` on public pages” are already locked.

## Desired End State

Logged-out `/` shows a hero “Najbliższa sesja” plus a “Kolejne sesje” list, or a Polish empty line when nothing is still joinable. Rows link to `/sesja/[id]`. No map JS, no login wall.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| What “next” means | `ends_at > now`, then soonest start | A live park session stays visible; “upcoming starts only” would hide it | Plan |
| Empty home | Polish empty copy, keep Slacklans `h1` | Passerby knows the app is right and that nothing is on | Plan |
| Layout | Hero card + remaining list | Next session is unmistakable on a phone; rest still scannable | Plan |
| Start-time tie | Finished-host count, then event id | Prefer stable hosts without the parked likes/confirmed ranking | Plan (user Other) |
| Click-through | Link to `/sesja/[id]` | Home is discovery; S-01 already owns time/place/map | Plan |
| Freshness | Every request (`connection` + `force-dynamic`) | A just-ended session must not stay featured | Plan |
| Ranking implementation | Pure helper + two reads | Unit tests own the counterexamples; no SQL-only oracle | Plan |

## Scope

**In scope:** Rank helper, two reads, home hero/list/empty, request-time render, keep fail-open e2e green.

**Out of scope:** Photos, edit, parked ranking (confirmed/likes/history beyond finished-host count), Leaflet on `/`, schema/index, schedule cache, new ranking e2e.

## Architecture / Approach

Page calls `connection()`, loads not-yet-finished events joined to spots plus finished counts per `creator_id`, then a pure `rankHomeSessions(rows, counts, now)` splits hero vs rest. Cards are `Link`s. No `getSession` on `/`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Ranking helper and reads | Tested eligibility + sort; loader | Sort keys implemented as “id only” and skipping host count |
| 2. Home hero, list, and empty | Public `/` UI + request-time + e2e still green | Prerendered “now”; Playwright dropping `DATABASE_URL` |

**Prerequisites:** S-01 archived; Neon reachable for e2e/`next start`.
**Estimated effort:** ~1–2 sessions across 2 phases.

## Open Risks & Assumptions

- Playwright `webServer.env` must spread `process.env` or home 500s in e2e.
- DB outage 500s `/` (accepted with freshness).
- Finished-host count is the only extra start-tie key; full “most probable” ranking stays parked.

## Success Criteria (Summary)

- Logged-out visitor sees the live-or-next session first, then the rest, with time and place.
- Empty home explains there is nothing to join, without a fake next session.
- `/` stays public, session-free, and map-free, and still paints without a login wall.
