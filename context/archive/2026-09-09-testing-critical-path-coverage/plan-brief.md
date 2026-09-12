# Critical-path coverage — Plan Brief

> Full plan: `context/changes/testing-critical-path-coverage/plan.md`
> Research: `context/changes/testing-critical-path-coverage/research.md`

## What & Why

Bootstrap Vitest and lock the three High×High test-plan risks: secrets on the wire, unauthenticated writes, public pages dying when session lookup throws. This is rollout Phase 1 of `context/foundation/test-plan.md` — cheapest layer only; e2e waits for Phase 3.

## Starting Point

No runner and no tests. Login/register actions already hide passwords; the Better Auth catch-all still returns `session.token` in JSON. `createSession` already checks `getSession()`; the proxy only checks cookie presence. `SessionChrome` already fail-opens; Vitest cannot render that async component.

## Desired End State

`npm run test:run` is the local gate. Canary password/token never appear in action results or auth JSON. Dead-session `createSession` inserts nothing. Chrome load returns null on throw; public pages stay session-free. Cookbook §6 tells the next agent how to add the same kinds of test.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| HTTP `token` in JSON | Assert absent and fix production | Risk #1 oracle; do not green-light the leak | Research + Plan |
| How to strip the token | Pure JSON stripper on the catch-all, not `customSession` alone | Sign-in puts `token` at the top level; `customSession` does not cover that | Plan |
| Risk #3 cheap layer | Extract helper + public-page import check | Vitest cannot RTL async SC; document oracle is Phase 3 e2e | Research + Plan |
| No-row oracle | Mock `getDb` / insert spy | Cost × signal; no Neon in this suite | Plan |
| Login/register 500 | Out of this change | Not FR-010/FR-012 visitor paths | Research + Plan |
| Test layout | Colocate `*.test.ts` next to the unit | Matches Next Vitest guide and the agreed cookbook | Plan |
| Rules files | Update `AGENTS.md`; fill §6; backport §2 | Agents must not refuse the runner; hot-spots were misleading | Plan |

## Scope

**In scope:** Vitest harness; JSON secret strip; #1/#2/#3 unit+integration; cookbook §6.1/6.2/6.4; §2 backport; `AGENTS.md` runner sentence.

**Out of scope:** Playwright; CI YAML; Neon; map/time/wipe risks; login/register fail-open; RTL of async pages; Polish copy snapshots.

## Architecture / Approach

Tests call server actions and pure helpers as functions (`vi.mock` at db/session/headers). HTTP leak is owned by a stripper wrapped around `toNextJsHandler`. Write oracle is “insert not called,” not proxy redirect. Fail-open stays out of `getSession`.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Vitest runner | Config, scripts, AGENTS.md | Agents still forbidden to add tests if the rule is skipped |
| 2. Secret leak (#1) | Stripper + action/cooldown tests | Leaving `Set-Cookie` intact; not snapshotting Polish copy |
| 3. Write gate (#2) | No-row `createSession` + proxy garbage-cookie | Treating GET `/spot` as the write gate |
| 4. Fail-open (#3) | Helper unit + import check | Putting the catch on `getSession` and fail-opening `/spot` |
| 5. Cookbook + §2 | §6 filled; §2 evidence corrected | File:line leaking into §2 |

**Prerequisites:** Research complete; Node/npm as in the repo.
**Estimated effort:** ~2–3 sessions across 5 phases.

## Open Risks & Assumptions

- Better Auth may add another JSON field that carries the raw token; the stripper must target `token` and `session.token` at least.
- Import-time `getDb()` will break tests that forget to mock `@/lib/db`.
- Document-level Risk #3 remains unproven until rollout Phase 3 e2e.

## Success Criteria (Summary)

- `npm run test:run` is green without Neon or a browser.
- A canary password/token cannot be found in action results or stripped auth JSON.
- Dead session cannot insert a spot/event; public pages do not import `getSession`.
