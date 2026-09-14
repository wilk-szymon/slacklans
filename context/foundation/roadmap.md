---
project: Slacklans
version: 1
status: draft
created: 2026-09-05
updated: 2026-09-14
prd_version: 1
main_goal: speed
top_blocker: time
milestone_id: first-shareable-session
milestone_seq: 1
milestone_status: open
---

# Roadmap: Slacklans

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: First shareable session** — Status: open

- **Intent:** Prove that a Gdynia slackliner can post a session and that a visitor or passerby can see when and where it is, with no account.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-010, FR-011, FR-012, US-01, US-02.

## Vision recap

People who slackline in Gdynia get asked by passersby how to join, and today they give verbal directions that vanish. Slacklans is a Polish web app so a slackliner can post a place and a time, and a passerby, a friend, or next-season-you can look that up. Existing tools are spots maps without schedules.

## North star

**S-01: user can post a session and a visitor can see time and place** — this is the validation milestone (the smallest end-to-end slice whose delivery would prove the core product idea) because the primary success criterion is a logged-in slackliner creating a spot and event, then a visitor opening the URL with no account.

> North star here means: the smallest end-to-end slice whose successful delivery would prove the core product hypothesis — placed as early as Prerequisites allow because everything else only matters if this works.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| ----- | ---------------------- | --------------------------------- | ---------------- | -------------- | -------- |
| F-01 | minimal-login | (foundation) email+password login issues a session; visitors can still read without an account | — | FR-001, Access Control | done |
| S-01 | post-session-and-share | user can create a spot on the map, post a single event with that spot and start/finish time, and a visitor can open the event URL and see time and location with no account | F-01 | US-01, FR-002, FR-004, FR-005, FR-006, FR-010 | done |
| S-03 | next-session-home | user can open the app with no account and see the next upcoming session (soonest start) with time and location | S-01 | US-02, FR-012 | proposed |
| S-02 | spot-photos | user can add photos to a spot so they show on the spot and on events at that spot, not as broken placeholders | S-01 | US-01, FR-003 | proposed |
| S-04 | creator-edit-session | user can edit a spot or event only when they created it | S-01 | FR-011 | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
| ------ | ------------------ | ------------------------------ | --------------------------------------------------------- |
| A | Post and share | `F-01` → `S-01` → `S-02` | Must-have path (the launch-required capabilities only) for US-01; photos follow the north star so create+share is not blocked on media. |
| B | Find the next session | `S-03` | Joins Stream A at `S-01`. Walk-up story (FR-012); can run beside `S-02` and `S-04`. |
| C | Creator fix-up | `S-04` | Joins Stream A at `S-01`. Guardrail FR-011; can run beside `S-02` and `S-03`. |

## Baseline

What's already in place in the codebase as of `2026-09-05` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — App Router starter homepage (`src/app/page.tsx`, `src/app/layout.tsx`); no product screens yet.
- **Backend / API:** partial — same app can host server work; no product routes or write handlers yet.
- **Data:** absent — no database, schema, or migrations in app source.
- **Auth:** absent — no login, sessions, or write gates.
- **Deploy / infra:** present — production host live; `vercel.json` pins region `fra1`; no GitHub Actions workflow.
- **Observability:** absent — no app error tracking or metrics.

## Foundations

### F-01: Minimal login

- **Outcome:** (foundation) email+password login issues a session; unauthenticated visitors can still read.
- **Change ID:** `minimal-login`
- **PRD refs:** FR-001, Access Control
- **Unlocks:** S-01 (and every later write slice: S-02, S-04)
- **Prerequisites:** —
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** US-01 is Given a logged-in slackliner; without a thin login, the north star cannot be planned. This is only the session gate, not a full account product (no roles, no password-recovery program).
- **Status:** done

## Slices

### S-01: Post a session and share the URL

- **Outcome:** user can create a spot by picking a place on the map, create a single event with that spot and start/finish time, and a visitor can open the event page URL and see time and location with no account and no extra personal data.
- **Change ID:** `post-session-and-share`
- **PRD refs:** US-01, FR-002, FR-004, FR-005, FR-006, FR-010
- **Prerequisites:** F-01
- **Parallel with:** —
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced immediately after login because it is the north star. Map place-picking and persistence land here (first slice that needs them), not as a prior layer. Photos are S-02 so this slice stays one create+visit flow. UI in Polish; usable on a phone outdoors (NFR).
- **Status:** done

### S-03: Next session on the home screen

- **Outcome:** user can open the app with no account and see the next upcoming event highlighted (soonest start time) with time and location, plus a list in the same order.
- **Change ID:** `next-session-home`
- **PRD refs:** US-02, FR-012
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Placed right after the north star so the walk-up “app name only” path is not waiting on photos or edit. Ranking is start time only; same-time tie-break is parked. First paint should meet the 2-second NFR, including logged-out.
- **Status:** proposed

### S-02: Photos on a spot

- **Outcome:** user can add photos to a spot so they are visible on that spot and on events that use it — not broken placeholders.
- **Change ID:** `spot-photos`
- **PRD refs:** US-01, FR-003
- **Prerequisites:** S-01
- **Parallel with:** S-03, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Split from S-01 so create+share can ship without media. Still must-have; do not park. Storage and display land in this slice (first time photos are needed).
- **Status:** proposed

### S-04: Creator can edit own spot or event

- **Outcome:** user can edit a spot or event only if they created it.
- **Change ID:** `creator-edit-session`
- **PRD refs:** FR-011
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Guardrail for bad times/places; sequenced after create exists. Ghost sessions if the creator disappears are accepted for this ship (confirm-tag is parked).
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| ---------- | ---------------------- | ----------------------------- | --------------------- | ----- |
| F-01 | minimal-login | Minimal email+password login; public read stays open | no | Status: planning — `context/changes/minimal-login/` |
| S-01 | post-session-and-share | Post a session (map spot + times) and public event page | no | Unlocks after F-01 is done |
| S-03 | next-session-home | Home shows next upcoming session for logged-out passerby | no | After S-01; parallel with S-02 and S-04 |
| S-02 | spot-photos | Photos on spots, visible on event and spot | no | After S-01; parallel with S-03 and S-04 |
| S-04 | creator-edit-session | Creator-only edit of spot or event | no | After S-01; parallel with S-02 and S-03 |

## Open Roadmap Questions

None. PRD `## Open Questions` was empty at capture time.

## Parked

- **Other cities and other languages** — Why parked: PRD §Non-Goals; MVP is Gdynia, Polish only.
- **Native mobile app / app-store listing** — Why parked: PRD §Non-Goals; phone-usable website only.
- **Offline-first / no network in the park** — Why parked: PRD §Non-Goals.
- **Confirm-tag and hiding two unconfirmed events (FR-018)** — Why parked: nice-to-have; out of the 14.09.2026 ship.
- **Same-time tie-break ranking** — Why parked: PRD §Non-Goals; first screen is next-by-time only.
- **Independent spots catalog (FR-017)** — Why parked: nice-to-have; spots without events recreate existing maps.
- **Dedicated share-link action (FR-009)** — Why parked: nice-to-have; the event page URL is the share link.
- **Event description (FR-007) and optional skill level (FR-008)** — Why parked: nice-to-have.
- **Favorites (FR-013), ratings/comments (FR-014)** — Why parked: nice-to-have.
- **Photos on a past event (FR-015) and recurring events (FR-016)** — Why parked: nice-to-have.
- **Videos on events** — Why parked: shape-notes Forward: tech-stack; deprioritized.

## Milestone History

## Done

- **F-01: (foundation) email+password login issues a session; unauthenticated visitors can still read.** — Archived 2026-09-08 → `context/archive/2026-09-05-minimal-login/`. Lesson: —.
- **S-01: user can create a spot by picking a place on the map, create a single event with that spot and start/finish time, and a visitor can open the event page URL and see time and location with no account and no extra personal data.** — Archived 2026-09-14 → `context/archive/2026-09-08-post-session-and-share/`. Lesson: —.
