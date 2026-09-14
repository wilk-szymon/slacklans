<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Post session and share

- **Plan**: context/changes/post-session-and-share/plan.md
- **Mode**: Deep
- **Date**: 2026-09-08
- **Verdict**: SOUND (after triage)
- **Findings**: 0 critical 3 warnings 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS (F2 fixed) |
| Lean Execution | PASS |
| Architectural Fitness | PASS |
| Blind Spots | PASS (F1, F3 fixed) |
| Plan Completeness | PASS (F4 fixed) |

## Grounding

8/8 existing paths ✓, 3 new paths expected-absent ✓, 5/5 symbols ✓, brief↔plan ✓. Proxy order, `db.transaction` on Neon Pool, and `/nowe` blast radius confirmed.

## Findings

### F1 — datetime-local on UTC serverless is not Warsaw

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 3 — Create form and action
- **Detail**: Contract says interpret `datetime-local` as Europe/Warsaw and persist UTC. Vercel Node is UTC. `new Date("2026-09-14T18:00")` is 18:00Z, which displays as 20:00 in Warsaw.
- **Fix A ⭐ Recommended**: Name a small helper (e.g. `src/lib/warsaw-time.ts`) that parses datetime-local as Europe/Warsaw → UTC Date, and formats timestamptz back with `timeZone: "Europe/Warsaw"`.
  - Strength: One place; matches the TZ decision; fra1 UTC is the actual runtime.
  - Tradeoff: A few dozen lines, no extra package if Temporal or a fixed-offset parse is used.
  - Confidence: HIGH — this is the standard serverless pitfall.
  - Blind spot: DST spring-forward gaps still need a defined error.
- **Fix B**: Document “set TZ=Europe/Warsaw on the function”.
  - Strength: Naive `Date()` would then match the typed clock.
  - Tradeoff: Vercel/Fluid does not reliably honor TZ; easy to regress.
  - Confidence: LOW — platform TZ is not a contract in this repo.
  - Blind spot: Preview vs production TZ drift.
- **Decision**: FIXED via Fix A

### F2 — Phase 3 “redirect /sesja/<id>” lands on 404

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: End-State Alignment
- **Location**: Phase 3 Success Criteria vs Phase 4 event page
- **Detail**: Phase 3 writes the event and redirects to `/sesja/<id>`. The page is added in Phase 4, so Phase 3 manual testers hit Next’s default 404.
- **Fix A ⭐ Recommended**: Phrase Phase 3 success as “URL is /sesja/<id> (page may 404 until Phase 4); rows exist.”
  - Strength: Keeps the phase split; no extra stub route.
  - Tradeoff: Phase 3 demo is not visitor-complete.
  - Confidence: HIGH
  - Blind spot: None significant.
- **Fix B**: Add a one-line stub `/sesja/[id]` in Phase 3.
  - Strength: Redirect looks finished earlier.
  - Tradeoff: Mixes public page into the write phase.
  - Confidence: HIGH
  - Blind spot: Stub copy might ship if Phase 4 is skipped.
- **Decision**: FIXED via Fix A

### F3 — Pin tap vs map tap is unspecified at the event level

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Blind Spots
- **Location**: Phase 3 — Load spots / UX spec
- **Detail**: Leaflet typically fires a map `click` after a marker `click` unless the marker stops propagation. Tapping an existing pin can also set new-spot coords and create a duplicate.
- **Fix**: Contract the island: Marker `click` selects `spotId` and must not also apply map-background lat/lng. Map `click` only when no marker handled it.
- **Decision**: FIXED

### F4 — Progress phase titles drop backticks from body headers

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Completeness
- **Location**: ## Progress vs ## Phase 3 / 4 headings
- **Detail**: Body uses `` `/spot` `` / `` `/sesja/[id]` `` in Phase headings; Progress omits backticks. `/10x-implement` matches by phase number more than exact title.
- **Fix**: Make Progress `###` titles identical to `## Phase N:` headings (or strip backticks in both).
- **Decision**: FIXED
