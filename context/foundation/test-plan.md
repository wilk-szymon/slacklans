# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-09

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
   risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "<the
   team is worried about X, and the failure would surface somewhere in
   <area>>" carry the same weight as PRD lines or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
   could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/` (11 commits / 30d).
Provider outages (Neon/Vercel down) are observability, not a test.

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).

| # | Risk (failure scenario) | Impact | Likelihood | Source (evidence — not anchor) |
|---|-------------------------|--------|------------|--------------------------------|
| 1 | Password or session secret appears in HTML, JSON errors, logs, or the client bundle | High | High | interview Q1; interview Q3 (login); archive `2026-09-05-minimal-login` (no plaintext, generic errors); hot-spot dir `src/lib/` (18 file-touches/30d); research: live leak is success JSON `token` on `/api/auth/*` |
| 2 | A logged-out visitor, or a request with a cookie but no live session, can persist a spot or event | High | High | PRD Access Control; archive F-01 write gate; roadmap S-01 (action must session-check; proxy is cookie-only); interview Q3; persist path is the write-action under `src/lib/`; `src/app/spot/` (4) and `src/proxy.ts` (3) are optimistic-gate evidence only |
| 3 | Session lookup throws and public `/` or `/sesja/[id]` 500 — visitors cannot see when/where | High | High | interview Q1; lessons.md fail-open chrome; PRD FR-010, FR-012; likelihood is chrome-edit regression, not map-island churn (`src/components/` 8 file-touches/30d mix chrome + map) |
| 4 | “Open on a map” or login return URL sends the user to an attacker site | High | Medium | interview Q1; archive F-01 same-origin callback; S-01 public map link; untrusted-input lens |
| 5 | Existing spots/events disappear after a create, auth change, user-delete, or migration | High | Medium | interview Q1; roadmap S-01 product tables; hot-spot dir `src/lib/schema/` (5 file-touches/30d) |
| 6 | Visitor on a shared URL sees the wrong Warsaw clock time or the wrong coordinates | High | Medium | PRD US-01, FR-006, FR-010; S-01 Warsaw-time contract; hot-spot dir `src/app/spot/` (4) |

Creator-only edit (FR-011 / S-04) is not in this map: that surface is not shipped. Abuse rows in this map: #1 (secret leakage), #2 (authorization), #4 (untrusted input). Email-enumeration and login cooldown fold into #1 (same login boundary).

### Risk Response Guidance

| Risk | What would prove protection | Must challenge | Context `/10x-research` must ground | Likely cheapest layer | Anti-pattern to avoid |
|------|-----------------------------|----------------|--------------------------------------|-----------------------|-----------------------|
| #1 | Register/login responses and `/api/auth/*` JSON never echo the password or a session secret (success JSON `token` included); error bodies stay generic | “Better Auth means we cannot leak” / “generic copy implies no secret in the payload” | Auth HTTP boundary, error mapping, what is logged vs returned | Integration at the auth HTTP boundary plus a unit on the JSON secret stripper | Oracle copied from current error strings; e2e of the login form instead of the response body |
| #2 | Logged-out create does not insert a row; cookie-without-session does not insert a row | “Gating `/spot` in the proxy is enough” | Write entry, session check inside the action, proxy matcher vs action | Integration against the write action (insert not called); proxy unit only proves cookie presence | Happy-path logged-in create only; e2e through the map UI to prove a server gate; GET `/spot` redirect as the write oracle |
| #3 | When session lookup throws, `/` and the public session URL still render visitor content (logged-out chrome, not 500) | “Home is public, so auth cannot take it down” | Shared chrome vs gated pages; fail-open vs fail-closed | Unit of the chrome fail-open helper plus a structural check that public pages stay session-free. Document oracle: §3 Phase 3 e2e with a throwing lookup (cookieless + dead DB is a false pass) | Snapshot of chrome markup; e2e that only exercises a healthy login; RTL of async Server Components |
| #4 | Map href is a known maps host plus numeric lat/lng only; external/absolute return URL is rejected | “We only put coordinates in, so the href cannot leave our origin” | How the map href is built; callback allowlist | Unit on the URL builder + callback sanitizer | Clicking the live maps link in e2e; snapshot of the anchor tag |
| #5 | Create, register, login, and user-delete (if present) leave other users’ spots/events in place | “No delete UI means rows cannot disappear” | Product FKs, write transaction, migrations | Integration against the database | Re-asserting the schema DDL as the oracle |
| #6 | A session saved from a Warsaw local start/finish is shown to the visitor as that same clock time and the same coordinates | “`datetime-local` round-trips fine in the browser” (Node on Vercel is UTC) | Parse → store UTC → display Europe/Warsaw; public page output | Unit on time conversion + integration of the public page | Asserting production `Date` formatting as the oracle; Leaflet screenshot |

## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.

| # | Phase name | Goal (one line) | Risks covered | Test types | Status | Change folder |
|---|------------|-----------------|---------------|------------|--------|---------------|
| 1 | Critical-path coverage | Bootstrap the runner; prove secrets stay off the wire, writes require a live session, public pages survive auth failure | #1, #2, #3 | unit + integration | complete | testing-critical-path-coverage |
| 2 | Share-link and persistence integrity | Prove map/return URLs cannot leave origin, rows survive writes, visitor time/place matches input | #4, #5, #6 | unit + integration | not started | — |
| 3 | Public-journey e2e | Prove async visitor paths in a real server: public session URL shows time/place; logged-out `/spot` stays gated; `/` stays up | #2, #3, #6 | e2e | not started | — |
| 4 | Quality-gates wiring | Lock lint, typecheck, unit+integration, and Phase 3 e2e as required gates | cross-cutting | gates | not started | — |

No dedicated AI-native phase: cost × signal does not justify vision-on-map or copy review. §4 still names Playwright MCP with a When NOT to use line.

## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.

Test-base profile at write time: **none** — no runner config, 0 test files.

| Layer | Tool | Version | Notes |
|-------|------|---------|-------|
| unit + integration | Vitest | none yet | none yet — see §3 Phase 1. Official Next 16 unit runner; does not render async Server Components. |
| e2e | Playwright | none yet | none yet — see §3 Phase 3. Official Next 16 e2e for async RSC and cookie+proxy journeys. Run against `next build` + `next start`, not `next dev`. |
| AI-native | Playwright MCP — checked: 2026-09-09 | n/a | Selective later verification of 1–3 screens. **When NOT to use:** MapTiler/Leaflet pixels, Polish chrome copy, any assertion a unit or integration already covers. |

**Stack grounding tools (current session):**
- Docs: Context7 not available in current session — used bundled Next 16 testing guides (`node_modules/next/dist/docs/01-app/02-guides/testing/`); checked: 2026-09-09
- Search: Exa.ai — confirmed current official Vitest + Playwright App Router guides at nextjs.org; checked: 2026-09-09
- Runtime/browser: Playwright MCP — possible later verification layer, not a substitute for deterministic tests; checked: 2026-09-09
- Provider/platform: Neon docs MCP + Vercel docs MCP — later env/gate checks only; GitHub Actions not exposed in session; checked: 2026-09-09

## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required after §3 Phase \<N\>" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.

| Gate | Where | Required? | Catches |
|------|-------|-----------|---------|
| lint | local now; CI after §3 Phase 4 | required | syntactic drift (`npm run lint` exists) |
| typecheck | local + CI | required after §3 Phase 4 | type drift (no `tsc` script yet) |
| unit + integration | local after §3 Phase 1; CI after §3 Phase 4 | required after §3 Phase 1 | logic regressions on #1–#6 at the cheap layer |
| e2e on public session URL, logged-out `/spot`, public `/` | CI on PR | required after §3 Phase 3 | async visitor/write-gate remainder that unit tests cannot render |

## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase \<N\>."

### 6.1 Adding a unit test

- **Location:** colocated next to the unit under `src/`.
- **Naming:** `<file>.test.ts` (Vitest include: `src/**/*.test.ts`).
- **Run:** `npm run test:run` (watch: `npm test`). Environment is `node`.
- **Reference:** `src/lib/strip-auth-secrets.test.ts` (canary token/password absent), `src/lib/chrome-session.test.ts` (throw → null), `src/lib/login-cooldown.test.ts` (5/30s), `src/proxy.test.ts` (garbage cookie is not a live session).
- **Do not** RTL async Server Components. Do not snapshot Polish copy.

### 6.2 Adding an integration test

- **Location / naming / run:** same as §6.1.
- **Reference:** `src/lib/auth-actions.test.ts` (canary password absent from action JSON), `src/lib/spot-actions.test.ts` (no insert when session is missing).
- **Mock** at the DB / session / `next/headers` / `next/navigation` edges. Use `vi.hoisted` for mock factories. Auth modules call the database at import — mock `@/lib/db` before importing them.
- **Never** assert production error copy. **Never** treat a proxy or GET `/spot` redirect as the write gate.

### 6.3 Adding an e2e test

TBD — see §3 Phase 3 for public-session time/place, logged-out `/spot` gate, and public `/` stays up.

### 6.4 Adding a test for a new write or auth gate

- **Write gate:** copy `src/lib/spot-actions.test.ts`. Call the action with session missing. Oracle: insert / transaction / `getDb` not called (both write shapes). A garbage-cookie proxy case is supporting evidence, not the persist oracle.
- **Auth body / HTTP JSON:** copy `src/lib/auth-actions.test.ts` and `src/lib/strip-auth-secrets.test.ts`. Oracle: unique canary password and canary token absent from `JSON.stringify` of the result; `Set-Cookie` may still carry the session.
- **Run:** `npm run test:run`.

### 6.5 Adding a test for public share time/place or URL safety

TBD — see §3 Phase 2 for Warsaw clock + coordinates on the public URL, and map/return URL origin safety.

### 6.6 Per-rollout-phase notes

- **§3 Phase 1 (this change):** HTTP `token` is stripped at the catch-all; cookie remains the session transport. Async Server Component HTML is not proven here — that is §3 Phase 3 e2e with a throwing session lookup. Login/register pages that await session without a catch are out of Phase 1. Public pages must not grow a session lookup (`src/app/public-get-session-imports.test.ts`).

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview Q5 skipped; defaults accepted with the seed brief). Future contributors should respect these unless the underlying assumption changes.

- **Leaflet / MapTiler pixel snapshots** — zoom and tile noise; they do not catch wrong coordinates or scam hrefs. Re-evaluate if the public page ships an interactive map. (Source: seed-brief defaults after interview Q5 skip.)
- **Polish copy snapshots on chrome / auth forms** — string tweaks fail CI and never catch a leak or a delete. Re-evaluate if legal/compliance copy becomes load-bearing. (Source: seed-brief defaults after interview Q5 skip.)
- **Unshipped nice-to-haves** — photos, favorites, recurrence, confirm-tag, creator-edit UI. Re-evaluate when the matching roadmap slice ships. (Source: PRD Non-Goals / nice-to-have; roadmap S-02, S-04 parked relative to this map.)
- **Generated Drizzle snapshots / SQL** — the generator is the check. Re-evaluate if we start hand-editing snapshots as product contracts. (Source: seed-brief defaults after interview Q5 skip.)

## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-09
- Stack versions last verified: 2026-09-09
- AI-native tool references last verified: 2026-09-09

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.
