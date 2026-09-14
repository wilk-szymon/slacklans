<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Next session home

- **Plan**: context/changes/next-session-home/plan.md
- **Scope**: Phase 2 of 2 (full plan)
- **Date**: 2026-09-14
- **Verdict**: APPROVED
- **Findings**: 0 critical 1 warning 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Progress 2.5 and 2.6 checked without those screens in the browser

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/next-session-home/plan.md (Progress 2.5, 2.6)
- **Detail**: Both rows are `[x]` with SHA `f84e67c`. Browser verification that day showed two future same-start sessions (Bulwar hero, Promenada list), so 2.7–2.11 and click-through were observed. The live DB was not empty, and neither session was in-progress, so empty copy (2.5) and “live beats later start” (2.6) were not on screen. Ranking unit tests cover empty input and in-progress-as-hero; empty copy lives in `src/app/page.tsx`. Plan forbids Polish snapshots and RTL of `page.tsx`.
- **Fix A ⭐ Recommended**: Leave 2.5/2.6 checked. Treat `rankHomeSessions` tests plus the empty branch in `page.tsx` as the oracle.
  - Strength: Matches the test-plan cheapest-layer rule; does not require wiping live sessions.
  - Tradeoff: Those two UI states were never screenshotted in a browser.
  - Confidence: HIGH — empty is `hero === null`; in-progress is already a unit case.
  - Blind spot: A typo in the empty string would not be caught without looking at the page.
- **Fix B**: Reopen 2.5 and 2.6 until an empty schedule and a live+later pair are seen in the browser.
  - Strength: Matches the plan’s manual bullets literally.
  - Tradeoff: Needs a throwaway DB state or waiting for a live session.
  - Confidence: MEDIUM — depends on not disturbing production rows.
  - Blind spot: Whether a local Neon branch is available for that fixture.
- **Decision**: ACCEPTED via Fix A — 2.5/2.6 stay checked; rank tests + empty branch in page.tsx are the oracle.

### F2 — Eligible list and finished-count query are unbounded

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/home-sessions.ts:54-74
- **Detail**: `loadHomeSessions` has no `LIMIT` on not-yet-finished events and counts every finished row per creator. Home renders the full `rest` list. Plan explicitly skipped pagination and indexes for Gdynia volume.
- **Fix**: Leave as-is for this slice. Revisit a `LIMIT` or `starts_at` index if the 2s NFR fails.
- **Decision**: ACCEPTED — leave unbounded for this slice; revisit LIMIT/index if the 2s NFR fails.
