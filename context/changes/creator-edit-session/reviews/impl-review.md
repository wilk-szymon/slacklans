<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Creator edit session

- **Plan**: context/changes/creator-edit-session/plan.md
- **Scope**: Phases 1–2 of 3 (phase 2 manuals pending; phase 3 not started)
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 3 warnings 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Update/delete SQL does not include creator_id

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/spot-actions.ts:229-232, 261
- **Detail**: After `editGateError`, `update` and `delete(event)` filter only `eq(event.id, eventId)`. A TOCTOU window (or a missed gate) would persist by id alone. Tests cover the app-level gate (other user does not call update/delete).
- **Fix A ⭐ Recommended**: Add `and(eq(event.id, eventId), eq(event.creatorId, session.user.id))` (and `gt(event.endsAt, now)` if you want unfinished in the same predicate).
  - Strength: Authz is enforced at persist, matching fail-closed writes.
  - Tradeoff: Tests must assert the where-clause shape or integration against a real DB.
  - Confidence: HIGH — Drizzle `and()` is already used elsewhere in the app.
  - Blind spot: Mocked `where` does not currently inspect the predicate.
- **Fix B**: Keep the load-then-write gate; document TOCTOU as accepted at Gdynia volume.
  - Strength: No code change; tests already prove the JS gate.
  - Tradeoff: Persist path is not defense-in-depth.
  - Confidence: MEDIUM — race is unlikely with one editor.
  - Blind spot: Future extra write shapes copying this pattern.
- **Decision**: FIXED via Fix A — update/delete WHERE includes creator_id and ends_at > now.

### F2 — Forbidden UI is HTTP 200, not 403

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/app/sesja/[id]/edytuj/page.tsx:10-18, 46-50
- **Detail**: Plan allowed `forbidden()` if Next 16 exports it, else a Polish status page. This Next build has no `forbidden()`. The page returns `<Forbidden>` with the planned copy but status 200. Logged-in non-creator and finished sessions therefore look like a normal document.
- **Fix**: Keep the Polish page (Next has no `forbidden()` here) and treat 200+copy as the 403 UX, or set status via a route handler / `unauthorized` pattern if you need a real 403.
- **Decision**: ACCEPTED — Polish 200 page is the 403 UX; Next 16.3 here has no `forbidden()`.

### F3 — Phase 2 manual checks still pending

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/creator-edit-session/plan.md (Progress 2.5–2.9)
- **Detail**: Automated 2.1–2.4 are `[x]` without SHA (phase-2 commit not done). Manual 2.5–2.9 are `[ ]`. Logged-out → login with callback was observed in Playwright MCP. Creator save, other-user 403, finish≤start, and post-`ends_at` 403 were not confirmed. Phase 3 is not started.
- **Fix**: Finish the five manual bullets (or accept 2.7 as observed and do the rest), then commit phase 2 before starting `/moje`.
- **Decision**: ACCEPTED — manuals stay pending until confirmed; then commit phase 2.

### F4 — Delete control has no confirm step

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/sesja/[id]/edytuj/EditSessionForm.tsx:88-102
- **Detail**: Plan said confirm via form submit, no extra modal. A single tap on “Usuń sesję” deletes. Matches the plan; easy mis-tap on a phone.
- **Fix**: Leave as planned, or add `confirm()` / a second submit if mis-taps show up.
- **Decision**: ACCEPTED — form submit is the confirm, as planned.
