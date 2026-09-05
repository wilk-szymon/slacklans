<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Minimal login

- **Plan**: context/changes/minimal-login/plan.md
- **Scope**: Phase 3 of 4
- **Date**: 2026-09-05
- **Verdict**: APPROVED
- **Findings**: 0 critical 1 warnings 1 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — Public chrome 500s if session lookup throws

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/components/SessionChrome.tsx:7
- **Detail**: Root layout chrome always awaits `auth.api.getSession` with no try/catch. Better Auth rethrows DB/internal failures as FAILED_TO_GET_SESSION, so a session-store blip 500s the whole document — including public `/`. Logged-out visitors with no cookie are fine (`getSession` returns null without hitting Postgres). `/nowe` should stay fail-closed.
- **Fix**: Catch errors in SessionChrome only and render the logged-out header. Keep `/nowe` fail-closed.
  - Strength: Public home stays readable when the session store is down; matches “home never redirects to login” / public read.
  - Tradeoff: A logged-in user might briefly see logged-out chrome during a DB blip until they retry.
  - Confidence: HIGH — getSession already returns null for missing cookies; only the throw path is uncovered.
  - Blind spot: Have not confirmed Better Auth’s exact throw vs null for a present-but-invalid cookie.
- **Decision**: FIXED + ACCEPTED-AS-RULE: Public chrome must fail open

### F2 — Duplicate session read on /nowe

- **Severity**: ℹ️ OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/nowe/page.tsx:10
- **Detail**: `/nowe` calls `auth.api.getSession` twice in one request (SessionChrome + page). Same pattern as `/logowanie` and `/rejestracja`. Matcher already skips `_next`/static; `/` is not gated.
- **Fix**: Wrap session lookup in `cache()` from `react` and reuse it in chrome and gated pages.
- **Decision**: FIXED
