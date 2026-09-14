# Creator edit session Implementation Plan

## Overview

The session creator can fix start/finish or cancel a session that has not ended yet. Other people cannot. Public share URLs stay read-only and session-free. Spot name and map place are not edited in this slice.

## Current State Analysis

Create is shipped: `createSession` in `src/lib/spot-actions.ts` is the only product write. It fail-closes with `getSession()` before any `getDb()`. Proxy cookie-gates exact `/spot` (`src/proxy.ts`). `creator_id` is already on `spot` and `event` (`src/lib/schema/spots.ts`). Pin reuse is community-wide: a later event on an existing pin does not take over `spot.creator_id`.

Public `/sesja/[id]` has no `getSession` and no edit link (`src/app/sesja/[id]/page.tsx`). Chrome has “Nowa sesja” only (`src/components/SessionChrome.tsx`). Cookbook for a new write: copy `src/lib/spot-actions.test.ts` — missing session, no persist (`context/foundation/test-plan.md` §6.4). Lesson: public chrome fail-open; gated pages fail-closed.

`formatWarsaw` is `pl-PL` short, not a `datetime-local` value. Edit forms need a Warsaw `YYYY-MM-DDTHH:mm` formatter.

## Desired End State

Logged-in chrome shows **Moje sesje** → `/moje`: the current user’s not-yet-finished events. Each row opens `/sesja/[id]/edytuj`. There they can change start/finish (same Warsaw rules as create) or delete the session. After a successful edit they land on public `/sesja/[id]`. After delete they land on `/moje`.

Logged-out GET/POST of `/moje` or `/edytuj` redirects to login with that callback. Logged-in non-creator, unknown id treated as not theirs, or `ends_at <= now`: Polish 403, no row change. Public `/sesja/[id]` still has no session lookup and no edit button.

If the deleted event was the last one on a pin the current user created, that `spot` row is deleted too. A pin with remaining events, or a pin someone else created, stays.

### Key Discoveries:

- Write oracle is the action, not the proxy (`src/lib/spot-actions.ts:54-57`; `src/proxy.ts` is cookie presence only).
- Do **not** put `/sesja` in the proxy matcher — `/sesja/[id]` must stay public. Gate `/edytuj` with page `getSession()` like `/spot` already double-gates.
- Home eligibility is `ends_at > now` (`src/lib/home-sessions.ts`). “Not yet finished” for edit/delete must use the same predicate so a session cannot vanish from the editor while still on `/`.
- Deleting a reused pin’s last event must not delete a spot another user created.

## What We're NOT Doing

- Editing spot name, lat, or lng (community reuse)
- Confirm-tag / FR-018
- Photos (S-02)
- Description, skill, recurrence
- Admin override
- `getSession` on public `/sesja/[id]` or `/`
- Adding `/sesja` to the proxy matcher
- New ranking e2e / Playwright click-through of the form
- Polish copy snapshots
- Schema migration (no new columns)
- Fail-open on gated edit pages

## Implementation Approach

Three writes stay in `src/lib/` next to `createSession`: update times, delete event, then maybe delete orphan own-spot. UI is two fail-closed Server Component routes plus a chrome link. Tests copy the create write-gate: missing session, other user, finished, own user.

Logged-out → login (same as `/spot`). Logged-in forbidden → 403 with Polish copy (chosen over 404).

## Critical Implementation Details

**Timing & lifecycle.** Compare `ends_at` to `now` at action time, not only when rendering the form. A session that ends between GET and POST must reject. Delete the event first; only then count remaining events on `spot_id` and maybe delete the spot. Do not add `/sesja` to `proxy` `matcher`.

**User experience spec.** Polish. `/moje` heading “Moje sesje”. Edit kicker can stay “Edytuj sesję”. 403 copy for non-creator: “Nie możesz edytować tej sesji.” 403 copy for finished: “Tej sesji nie można już zmienić.” Unknown id: `notFound()`. Links `min-h-12` / `text-base`. `datetime-local` defaults must be Warsaw wall clock via a new helper (do not feed `formatWarsaw` into the input). After update: `redirect("/sesja/"+id)`. After delete: `redirect("/moje")`.

## Phase 1: Update and delete actions

### Overview

Lock creator, session, and not-finished gates in server actions with Vitest. No new routes yet.

### Changes Required:

#### 1. Warsaw local input string

**File**: `src/lib/warsaw-time.ts` + existing or colocated test

**Intent**: The edit form must round-trip the stored UTC instant as a `datetime-local` value in Europe/Warsaw.

**Contract**: Export a function that returns `YYYY-MM-DDTHH:mm` for a `Date` using the same Warsaw wall-clock rules as `parseWarsawLocal`. Do not use `date.toISOString().slice(0,16)` (that is UTC).

#### 2. Update and delete actions

**File**: `src/lib/spot-actions.ts` (or a sibling module imported by the later form) + `src/lib/spot-actions.test.ts` (or sibling test)

**Intent**: Only the event creator can change times or cancel, and only while the session has not ended.

**Contract**: Both actions call `getSession()` first; missing session → `redirect("/logowanie?callbackUrl=…")` to the edit URL, **before** `getDb()`. Then load the event. Missing row or `creator_id !== session.user.id` → Polish error or throw to a 403 path — tests must show **no update/delete**. `ends_at <= now` → same, no persist. Update: parse start/finish with `parseWarsawLocal`; reject finish ≤ start; `update` that event only. Delete: `delete` that event; if `count(event where spot_id)` is 0 **and** `spot.creator_id === session.user.id`, delete that spot; otherwise leave the spot. Do not call `loadChromeSession` (fail-open) as a write gate.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` covers: missing session does not update or delete; other user does not update or delete; finished session (`ends_at <= now`) does not update or delete; own not-finished update persists new times; own not-finished delete removes the event; last own event on own unused pin also deletes the spot; last event on someone else’s pin does not delete the spot
- `npm run lint` passes

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase. This phase has no manual checks.

---

## Phase 2: Gated edit page and 403

### Overview

`/sesja/[id]/edytuj` is fail-closed. Creators see the form. Everyone else who is logged in sees 403. Public `/sesja/[id]` is unchanged.

### Changes Required:

#### 1. Edit page

**File**: `src/app/sesja/[id]/edytuj/page.tsx` + a colocated client form like `SpotForm`

**Intent**: The creator edits times or deletes from a dedicated URL, not from the public share page.

**Contract**: `getSession()` fail-closed (no try/catch). No session → redirect login with `callbackUrl=/sesja/{id}/edytuj`. Not creator or finished → render a 403-style response (`forbidden()` if the Next 16 App Router helper is available, else a Polish status page that is not the public session). Unknown id → `notFound()`. Form: start/finish `datetime-local` prefilled with the Warsaw helper; `useActionState` + Polish `role="alert"` like create. Separate delete control that posts the delete action (confirm via `form` submit, no extra modal required). Do not import Leaflet. Do not call `getSession` from `src/app/sesja/[id]/page.tsx`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:run` passes
- `src/app/public-get-session-imports.test.ts` still asserts `src/app/sesja/[id]/page.tsx` and `src/app/page.tsx` contain no `getSession`
- `npm run build` passes

#### Manual Verification:

- Logged-in creator of a live/future session: `/sesja/<id>/edytuj` shows current Warsaw times; save changes public `/sesja/<id>`
- Logged-in other user: 403 copy, times unchanged
- Logged-out: login, then back to `/edytuj` after login
- Finish ≤ start → Polish error, no persist
- After `ends_at`, creator sees 403, not the form

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Moje sesje list and chrome

### Overview

Creators reach the editor from chrome, without putting an edit link on the public page.

### Changes Required:

#### 1. `/moje` and proxy

**File**: `src/app/moje/page.tsx`, `src/proxy.ts`, `src/proxy.test.ts`

**Intent**: A logged-in list of my not-yet-finished sessions is the discovery path to `/edytuj`.

**Contract**: Page `getSession()` fail-closed; missing → `/logowanie?callbackUrl=/moje`. Query events where `creator_id = user.id` and `ends_at > now`, join spot, order by `starts_at`. Rows link to `/sesja/[id]/edytuj`. Empty: Polish “Nie masz teraz sesji do edycji.” Proxy: cookie-gate **exact** `/moje` the same way as `/spot` (pathname equality, not a `/sesja` prefix). Matcher list becomes `/spot` and `/moje`. Do not matcher `/sesja`.

#### 2. Chrome link

**File**: `src/components/SessionChrome.tsx`

**Intent**: Logged-in users can open `/moje` without typing the path.

**Contract**: Next to “Nowa sesja”, Polish “Moje sesje” → `/moje`, `min-h-12`. Logged-out header unchanged. Keep `loadChromeSession` fail-open. Do not add Edytuj on public `/sesja/[id]`.

### Success Criteria:

#### Automated Verification:

- `npm run lint` passes
- `npm run test:run` passes (proxy: `/moje` without cookie redirects to login; `/sesja/anything` still not cookie-gated)
- `npm run build` passes
- `npx playwright test e2e/public-home-survives-session-throw.spec.ts --project=chromium` still 200 with Slacklans heading and logged-out chrome

#### Manual Verification:

- Logged-in chrome “Moje sesje” lists only my not-yet-finished sessions
- Row opens `/edytuj`; delete last own event on own unused pin removes the spot; delete last event on someone else’s pin leaves the spot
- Public `/sesja/<id>` has no Edytuj; logged-out visitor still sees times
- Phone-width: chrome and list rows tappable

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful.

---

## Testing Strategy

### Unit Tests:

- Warsaw `datetime-local` formatter round-trips with `parseWarsawLocal`
- Update/delete gates as Phase 1 automated list
- Proxy: `/moje` no cookie → login; `/sesja/...` not gated
- Do not snapshot 403 strings as oracles

### Integration Tests:

- Action-level only (mocked `getDb` / `getSession`). Do not treat GET `/edytuj` redirect as the persist oracle.

### Manual Testing Steps:

1. Login as creator, `/moje` → edit times → public page shows new Warsaw times.
2. Same account, delete a session that is the only event on a pin you created → pin gone.
3. Delete a session on a pin someone else created (or that still has another event) → pin remains.
4. Second account: `/edytuj` is 403.
5. Logged-out `/moje` and `/edytuj` go to login.
6. After the session ends, `/edytuj` is 403.

## Performance Considerations

`/moje` is one join filtered by `creator_id` and `ends_at`. No Leaflet on edit. Public `/sesja` unchanged (still one join, no session).

## Migration Notes

None. Rollback: remove `/moje`, `/edytuj`, chrome link, and the new actions. Rows already deleted are not restored.

## References

- Roadmap S-04: `context/foundation/roadmap.md`
- PRD FR-011, Access Control: `context/foundation/prd.md`
- Create write: `src/lib/spot-actions.ts`
- Lesson: `context/foundation/lessons.md`
- Test cookbook: `context/foundation/test-plan.md` §6.4
- Warsaw time: `src/lib/warsaw-time.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Update and delete actions

#### Automated

- [x] 1.1 npm run test:run covers missing session, other user, finished, own update, own delete, unused own pin deleted, someone else’s pin kept — 520c4fb
- [x] 1.2 npm run lint passes — 520c4fb

### Phase 2: Gated edit page and 403

#### Automated

- [x] 2.1 npm run lint passes — 9aaea35
- [x] 2.2 npm run test:run passes — 9aaea35
- [x] 2.3 public-get-session-imports still asserts sesja/[id]/page.tsx and page.tsx contain no getSession — 9aaea35
- [x] 2.4 npm run build passes — 9aaea35

#### Manual

- [x] 2.5 Logged-in creator of a live/future session: /edytuj shows Warsaw times; save updates public /sesja/<id> — 9aaea35
- [x] 2.6 Logged-in other user: 403 copy, times unchanged — 9aaea35
- [x] 2.7 Logged-out: login, then back to /edytuj after login — 9aaea35
- [x] 2.8 Finish ≤ start → Polish error, no persist — 9aaea35
- [x] 2.9 After ends_at, creator sees 403, not the form — 9aaea35

### Phase 3: Moje sesje list and chrome

#### Automated

- [x] 3.1 npm run lint passes
- [x] 3.2 npm run test:run passes (proxy: /moje without cookie redirects; /sesja/anything still not cookie-gated)
- [x] 3.3 npm run build passes
- [x] 3.4 npx playwright test e2e/public-home-survives-session-throw.spec.ts --project=chromium still 200 with Slacklans heading and logged-out chrome

#### Manual

- [x] 3.5 Logged-in chrome Moje sesje lists only my not-yet-finished sessions
- [x] 3.6 Row opens /edytuj; delete last own event on own unused pin removes the spot; delete last event on someone else’s pin leaves the spot
- [x] 3.7 Public /sesja/<id> has no Edytuj; logged-out visitor still sees times
- [x] 3.8 Phone-width: chrome and list rows tappable
