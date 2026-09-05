# Lessons Learned

> Append-only register of recurring rules and patterns. Re-read at start by /10x-frame, /10x-research, /10x-plan, /10x-plan-review, /10x-implement, /10x-impl-review.

## Public chrome must fail open

- **Context:** `src/components/SessionChrome.tsx` (root layout session lookup)
- **Problem:** Uncaught `auth.api.getSession` errors 500 the whole document, including public `/`.
- **Rule:** Session lookup in shared chrome must catch errors and render the logged-out header. Gated pages stay fail-closed.
- **Applies to:** Root layout chrome and any session-aware UI on public routes.
