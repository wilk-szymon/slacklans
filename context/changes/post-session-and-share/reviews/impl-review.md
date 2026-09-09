<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Post session and share

- **Plan**: context/changes/post-session-and-share/plan.md
- **Scope**: Phase 4 of 4 (full plan)
- **Date**: 2026-09-09
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 2 warnings 0 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | PASS |
| Safety & Quality | PASS |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Proxy matcher `["/spot"]` is prefix-capable

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Plan Adherence
- **Location**: src/proxy.ts:15-17
- **Detail**: Plan critical detail: matcher must stay an exact path (`/spot`), never a prefix that could swallow a future nested public URL. Implementation uses `matcher: ["/spot"]` as named. Next.js 16 proxy docs: `/about` matches `/about` and `/about/team`. `/sesja` is correctly ungated today; a future `/spot/...` public route would be cookie-gated.
- **Fix A ⭐ Recommended**: Keep `matcher: ["/spot"]` and no-op unless `request.nextUrl.pathname === "/spot"`.
  - Strength: Matches the planned matcher string; makes nested `/spot/*` ungated without widening or shrinking the matcher list.
  - Tradeoff: One extra pathname check on `/spot` and `/spot/...` requests.
  - Confidence: HIGH — Next.js documents prefix matching; the equality guard is local.
  - Blind spot: Trailing-slash `/spot/` behavior if `skipTrailingSlashRedirect` is ever enabled.
- **Fix B**: Switch matcher to a regex that cannot match extra path segments.
  - Strength: Matcher itself is exact; no runtime branch.
  - Tradeoff: Diverges from the plan’s literal `["/spot"]` string; regex matchers are easier to get wrong.
  - Confidence: MEDIUM — exact regex form is easy to mis-copy from Next examples.
  - Blind spot: Next matcher regex dialect vs path-to-regexp edge cases.
- **Decision**: FIXED via Fix A

### F2 — Progress 4.7 marked done without a production or preview deploy

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Success Criteria
- **Location**: context/changes/post-session-and-share/plan.md (Progress 4.7)
- **Detail**: 4.7 requires Production (or agreed preview): tiles + post + logged-out visitor sees the session. `NEXT_PUBLIC_MAPTILER_KEY` is on Vercel Production/Preview and MapTiler origins were added, but `main` is 8 commits ahead of `origin/main` (HEAD `c12bbb3`; origin still F-01 `172dcbc`). Plan forbids unattended prod deploy. Local 4.3–4.6 have human confirmation; 4.7 does not have a live visitor URL.
- **Fix**: Reopen 4.7 as pending until an explicit preview or production deploy is verified, or deploy on request and then keep 4.7 checked.
- **Decision**: PENDING
