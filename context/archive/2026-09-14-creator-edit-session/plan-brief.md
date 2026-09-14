# Creator edit session — Plan Brief

> Full plan: `context/changes/creator-edit-session/plan.md`

## What & Why

FR-011: only the creator may change a session. This slice is the bad-time/bad-listing guardrail — fix start/finish or cancel — without letting anyone move a community-reused pin.

## Starting Point

Create, public `/sesja/[id]`, and home ranking are done. `creator_id` is stored. There is no update/delete action and no edit UI. Public pages must not `getSession`.

## Desired End State

Chrome **Moje sesje** lists my not-yet-finished events. Each opens `/sesja/[id]/edytuj` to change times or delete. Logged-out users hit login; other logged-in users get 403. After delete, an unused pin I created goes away; someone else’s pin does not.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| What is editable | Event times only | Moving a reused pin would relocate other people’s public URLs | Plan |
| Delete | Own event; then unused own pin | Cancel a night; do not steal someone else’s spot row | Plan (user) |
| Unused pin | Zero remaining events and I created it | Orphans I own disappear; shared pins stay | Plan |
| After it ended | No edit, no delete | Past schedule is frozen | Plan (user) |
| Entry | `/moje` in chrome, not a public Edytuj | Keeps `/sesja/[id]` session-free | Plan (user) |
| Edit URL | `/sesja/[id]/edytuj` | Share page stays read-only | Plan |
| Non-creator | 403 Polish copy | Honest; does confirm the id exists to a logged-in peer | Plan (user) |
| Logged-out | Login redirect (like `/spot`) | 403 without an account blocks the real creator from signing in | Plan |
| Tests | Action-level gates, cookbook | Test-plan risk #2; proxy is not the write oracle | Plan |

## Scope

**In scope:** Warsaw `datetime-local` helper, update/delete actions, gated `/edytuj`, 403, `/moje`, chrome link, proxy exact `/moje`.

**Out of scope:** Spot name/place editor, photos, confirm-tag, `getSession` on public `/sesja`, `/sesja` in the proxy matcher, form e2e.

## Architecture / Approach

Fail-closed `getSession()` in actions and on `/moje` + `/edytuj`. Public `/sesja/[id]` unchanged. Delete event, then conditionally delete spot. Proxy matcher stays `/spot` + `/moje` with pathname equality — never a `/sesja` prefix.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Update and delete actions | Gated writes + tests | IDOR if creator check is after persist |
| 2. Gated edit page and 403 | `/edytuj` form | Putting `getSession` on public `/sesja/[id]` |
| 3. Moje sesje list and chrome | Discovery path | Proxy matcher swallowing `/sesja` |

**Prerequisites:** S-01 archived (events with `creator_id`).
**Estimated effort:** ~2 sessions across 3 phases.

## Open Risks & Assumptions

- Logged-out 403 was in the same interview option as non-creator 403; this plan uses login redirect for logged-out so the creator can sign in.
- Last-write-wins if two tabs edit; Gdynia volume, no lock.
- `forbidden()` vs a hand-rolled 403 page depends on Next 16 App Router helpers at implement time.

## Success Criteria (Summary)

- Only the event creator changes times or cancels, and only before `ends_at`.
- Visitors still read `/sesja/[id]` with no account and no edit control.
- Unused own pins disappear after the last own event; shared pins do not.
