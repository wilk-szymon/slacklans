# Minimal login — Plan Brief

> Full plan: `context/changes/minimal-login/plan.md`

## What & Why

A slackliner must be logged in before they can post a session (roadmap F-01, PRD FR-001). Visitors must still read with no account. This change is only the session gate: register, login, logout, durable users.

## Starting Point

Next.js 16 App Router starter on Vercel (`fra1`). No auth, no database, English starter homepage. Postgres was chosen as a preference, not wired.

## Desired End State

Someone can create an email+password account, stay signed in for about a week or until Wyloguj, see Polish chrome on the public home, and open `/nowe` only when logged in (coming soon). The same email still works after a redeploy.

## Key Decisions Made

| Decision | Choice | Why |
| ------------------------------ | ----------------- | ----------------- |
| Complexity | HIGH (12 questions) | New store + session + public vs gated routes |
| Accounts | Self-serve register + login | Real slackliners without manual seeding |
| After login | Same public home + chrome | Public read, login to share |
| Bad login | Generic error + cooldown | Don’t leak emails; cheap throttle |
| Persistence | Durable Postgres | Survive redeploy; S-01 will need the same DB |
| Session | ~7 days or logout | Phone between park sessions |
| Logout | Visible Wyloguj | Required with long sessions |
| Password | Length ≥ 8 only | Usable outdoors |
| Email | Case-insensitive unique | Phone autocapitalize |
| Language | Polish only, `lang="pl"` | NFR |
| Write gate | `/nowe` coming soon, server-gated | Reserves S-01 URL |
| Verify | Lint, build, manual path | No test runner |
| Stack | Better Auth + our Postgres (Neon EU) | Email/password we own; Next 16 `proxy.ts` |

## Scope

**In scope:** Register, login, logout, session cookie, user table, Polish chrome, gated `/nowe` placeholder, Vercel env.

**Out of scope:** Spots/events/photos, password reset, email verify, OAuth, roles, Clerk, GitHub Actions, test runner, unattended production deploy.

## Architecture / Approach

Better Auth email/password against Neon Postgres (EU). Polish pages `/rejestracja` and `/logowanie`. Home `/` never requires a session. `/nowe` checks the session on the server. `src/proxy.ts` skips static assets.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --------- | ----------------------- | ------------------------- |
| 1. User store | Neon EU + identity schema | Wrong region vs `fra1` |
| 2. Session gate | Register/login/logout + cooldown | Cookie helper / Next 16 mismatch |
| 3. Chrome + `/nowe` | Polish public home; gated placeholder | Accidentally gating `/` |
| 4. Ship and verify | Env + manual path on Vercel | Secrets in git; Git auto-deploy |

**Prerequisites:** Neon project you can create; Vercel project `slacklans` already linked.  
**Estimated effort:** ~2–3 sessions across 4 phases.

## Open Risks & Assumptions

- Better Auth rate-limit/cooldown may reset on serverless cold start.
- Preview URLs may need a distinct `BETTER_AUTH_URL` or cookies will miss.
- First human must create Neon EU and paste `DATABASE_URL` — the agent cannot invent it.

## Success Criteria (Summary)

- Logged-out `/` stays public and Polish.
- Register/login/logout work; email casing does not fork accounts.
- `/nowe` is coming-soon only when logged in.
- Same user still logs in after a deploy.
