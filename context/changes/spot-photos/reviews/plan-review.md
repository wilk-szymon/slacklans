<!-- PLAN-REVIEW-REPORT -->
# Plan Review: Spot and session photos

- **Plan**: `context/changes/spot-photos/plan.md`
- **Mode**: Deep
- **Date**: 2026-10-04
- **Verdict**: SOUND
- **Findings**: 0 critical, 6 warnings, 1 observation

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| End-State Alignment | PASS |
| Lean Execution | PASS |
| Architectural Fitness | WARNING |
| Blind Spots | WARNING |
| Plan Completeness | WARNING |

## Grounding

8/8 existing paths ✓, 4/4 symbols ✓, brief↔plan ✓

## Findings

### F1 — The server cannot choose the blob pathname

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — the token check is written against an API that ignores it
- **Dimension**: Architectural Fitness
- **Location**: Implementation Approach; Phase 1 upload token
- **Detail**: `onBeforeGenerateToken` cannot set the pathname. `upload()` sends it, and a returned pathname is overwritten. `head()` still stops a bad URL from becoming a row.
- **Fix A ⭐ Recommended**: The browser sends the prefixed pathname. The callback throws unless it starts with `session-photos/<session user id>/` or `spot-photos/<session user id>/`.
- **Fix B**: Rely only on `head()` when attaching.
- **Decision**: ACCEPTED

### F2 — One component cannot both load the session and upload

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — phase 3 as written does not compile, and it paints the list twice
- **Dimension**: Architectural Fitness
- **Location**: Phase 2 session/spot pages; Phase 3 SessionPhotos and SpotPhotos
- **Detail**: Phase 2 renders the images in the page. Phase 3 named one file that both calls `loadChromeSession` and `upload()`.
- **Fix**: Split each surface into a server list and a client uploader. Phase 3 moves the images out of the page.
- **Decision**: FIXED

### F3 — The gallery query has no way to tell the two kinds of photo apart

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — phase 3 buttons depend on fields the read model never names
- **Dimension**: Plan Completeness
- **Location**: Phase 1 read model; Phase 3 controls
- **Detail**: Gallery rows need `kind`. Session rows need `uploader_id`. Neither was in the query contract.
- **Fix**: Name `id`, `blob_url`, `uploader_id` on session photos, `kind` on gallery rows, and `id` plus `blob_url` on unfeatured rows.
- **Decision**: FIXED

### F4 — Deleting the blob first can leave a broken image

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — the order fights the rule this slice exists to meet
- **Dimension**: Blind Spots
- **Location**: Critical Implementation Details, state sequencing
- **Detail**: Blob delete is outside the SQL transaction. Blob-first can leave a row whose file is already gone.
- **Fix A ⭐ Recommended**: Delete the row first, then the blob. A failed blob delete leaves an orphan.
- **Fix B**: Keep blob-first and compensate if the blob is already gone.
- **Decision**: FIXED via Fix A

### F5 — The create page does not know who owns the pin

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — one query field
- **Dimension**: Plan Completeness
- **Location**: Phase 3 create form
- **Detail**: `SpotPin` and the `/spot` select have no `creatorId`, which the spot-photo input needs.
- **Fix**: Add `creatorId` to that select and to `SpotPin`, and pass the current user id into the form.
- **Decision**: FIXED

### F6 — Existing delete tests assert an exact delete count

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — the mock is local to one test file
- **Dimension**: Plan Completeness
- **Location**: Phase 1 mutations
- **Detail**: `deleteSession` success tests expect `del` once or twice, and the transaction mock's photo select will not resolve to a list.
- **Fix**: Return an empty photo list from that mock and update the call-count assertions.
- **Decision**: FIXED

### F7 — Phase 2 manual checks need rows the UI cannot create yet

- **Severity**: OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Blind Spots
- **Location**: Phase 2 manual verification
- **Detail**: Featuring and uploading arrive in phase 3. Phase 2 still asks a person to look at those photos.
- **Fix**: Say those rows are inserted in the database for the phase 2 check.
- **Decision**: SKIPPED
