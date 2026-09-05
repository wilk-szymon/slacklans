---
project: slacklans
researched_at: 2026-09-05
recommended_platform: Vercel
runner_up: Railway
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Next.js 16.3.4
  runtime: Node.js (Vercel default 24.x)
---

## Recommendation

**Deploy on Vercel.**

Slacklans is Next.js 16 App Router; Vercel is the zero-config host (`vercel deploy` / `vercel deploy --prod` / `vercel rollback` / `vercel logs`). Interview weights: cheapest viable path is Hobby at $0 (this community app has no payments or ads, so it fits Hobby's non-commercial personal-use rule as of 2026-09-05); you already know Vercel; single-region Poland does not need a global edge platform. Co-located Postgres is the gap — Vercel Postgres is sunset; use Neon (Marketplace) and Vercel Blob when those features land. Runner-up Railway if you want app+Postgres on one bill (~$5–15/mo) and will accept no CLI rollback.

## Platform Comparison

Research date: 2026-09-05. Scoring is Pass / Partial / Fail against CLI-first ops, managed/serverless, agent-readable docs, stable deploy API, and MCP. Interview answers (cost-first, Vercel/Netlify + AWS familiarity, single region, co-located DB preferred) weight the shortlist; they do not drop candidates. Persistent connections were "don't know"; the PRD has no realtime or background jobs, so serverless platforms were not filtered out.

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration |
|---|---|---|---|---|---|
| Cloudflare | Pass (`wrangler deploy`, `rollback`, `tail`) | Pass | Pass (`llms.txt`, GitHub markdown) | Partial (vinext **beta**; OpenNext vs Wrangler split) | Pass |
| Vercel | Pass (`vercel`, `rollback`, `logs`) | Pass | Pass (`llms.txt` / per-page `.md`) | Pass | Partial (MCP **Public Beta**) |
| Netlify | Pass (`netlify deploy`, `logs`) | Pass | Pass (`llms.txt`) | Partial (OpenNext; official Next adapter **in development**) | Pass |
| Fly.io | Pass (`fly deploy`, `fly logs`) | Pass | Pass (`llms.txt`, GitHub MDX) | Pass (rollback is `fly deploy --image`) | Partial (`fly mcp logs` **experimental**) |
| Railway | Partial (no `railway rollback`; dashboard/GraphQL; Hobby images **72h**) | Pass | Pass (`llms.txt`, GitHub) | Partial | Pass |
| Render | Partial (rollback is REST/dashboard, not CLI) | Pass | Pass (`llms.txt`, `.md`) | Pass | Pass |

**Cloudflare.** Cheapest compute (Free 100k req/day or Paid $5/mo) and strong MCP/docs, but Next.js 16 on Workers is vinext **beta** or `@opennextjs/cloudflare` with `nodejs_compat` gotchas. D1 is SQLite; Postgres is Hyperdrive + Neon (not first-party). Free CPU is **10 ms/invocation**, tight for SSR. Dropped from the shortlist because a 3-week after-hours Next MVP cannot absorb an adapter bet.

**Vercel.** Native Next.js 16 (no adapter). Hobby $0, 1M invocations / 4 CPU-hrs / 100 GB transfer; overage **pauses** (no buy-up). Hobby is **non-commercial personal use only** ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)). Fluid compute **GA**. WebSockets **Public Beta**. Postgres/KV sunset → Marketplace Neon / Upstash; Blob **GA**. Default function region **iad1**; nearest to Gdynia is **fra1**. MCP **Public Beta**.

**Netlify.** Next 16 via OpenNext (`@netlify/plugin-nextjs`); official Adapter API path **in active development**. Credit plans: Free 300 credits (~20 prod deploys). Netlify Database = Neon **GA** (credit plans). Function region default Ohio; self-serve EU (`fra`) is **Pro+**. Blobs **beta**. Familiarity helped; EU-region-on-Pro and adapter risk kept it off the shortlist.

**Fly.io.** Containers, persistent processes, `waw` **deprecated**; use `ams`/`fra`. No ongoing free tier. Smallest always-on VM ~$2–7/mo, but Managed Postgres starts about **$38/mo**. Cost-first MVP killer. Tigris object storage: Fly docs still mark **beta**.

**Railway.** Railpack/Dockerfile, `output: "standalone"`. Hobby $5 usage included; typical web+Postgres ~$5–15/mo. Postgres, Redis, Tigris buckets co-located. EU = Amsterdam only. Persistent WebSockets yes. No CLI rollback. Best one-vendor data story at this budget.

**Render.** Frankfurt region, first-party Postgres from $6/mo, web from $7/mo always-on (~$13 together). Free web **spins down after 15 idle minutes** (~1 min wake) — bad for shared event URLs. No native object storage. MCP **GA**. Rollback not in CLI.

### Shortlisted Platforms

#### 1. Vercel (Recommended)

Won on Next.js 16 native deploy, Hobby $0 for a non-commercial community app, CLI rollback/logs, and existing familiarity. Cost-first still holds unless Hobby commercial policy or image/CPU caps force Pro ($20/mo). Neon + Blob cover the PRD's Postgres and photos as extra assembly, not as Vercel-native Postgres.

#### 2. Railway

Runner-up: one project for app + Postgres + buckets at Hobby rates, Amsterdam, long-lived Node process if you later need it. Loses on CLI rollback, Next standalone/Docker ceremony, and no Poland region (same as Vercel). Swap here if Hobby is ruled commercial or you refuse a second vendor for the database.

#### 3. Render

Frankfurt (closest compute of the three to Gdynia) + managed Postgres + MCP GA. Always-on price is honest (~$13/mo). Free tier cold starts make it a poor fit for passerby links. No object store for spot photos.

## Anti-Bias Cross-Check: Vercel

### Devil's Advocate — Weaknesses

1. Hobby is non-commercial only. Commercial includes financial gain for anyone who built the site (paid work, ads, selling a product). If Slacklans is later treated as a product, Hobby **pauses**; Pro is $20/mo, more than Railway.
2. There is no Vercel Postgres. "Co-located DB" is Neon on Marketplace — two vendors, two dashboards, easy region mismatch (functions default iad1).
3. Photos hit Hobby image limits first, not request counts. Hobby: 5k image transformations/month. Spot photos + `next/image` can pause production during meetup season. Blob is extra.
4. Hobby overage pauses the deployment. You cannot buy more. A map-heavy weekend can take production down until the next cycle or a Pro upgrade.
5. WebSockets are Public Beta, pinned to one Fluid instance, closed at `maxDuration` (Hobby 300s). Fine while realtime is out of scope; a later live board does not fit this runtime.

### Pre-Mortem — How This Could Fail

You shipped Slacklans to Vercel Hobby in a week because `vercel --prod` just worked. You assumed a free community app was "personal." Event pages with photos went out on Instagram. Image optimization and Blob transfer burned the Hobby caps; production paused on a Saturday session. You upgraded to Pro. Neon had been created in a US region while you later pinned functions to `fra1`; map tiles felt fine, event writes did not. GitHub Actions auto-deploy on merge and Vercel's Git integration both built every push, doubling build minutes. Six months on, storage and images cost more than the $5 Railway Postgres you skipped, and "co-located" still meant a Marketplace invoice. Rollback of the app was easy; Neon migrations were not.

### Unknown Unknowns

- Next.js 16 dropped `runtime = 'edge'`; `middleware.ts` is `proxy.ts` (Node only). Training data will still emit the old files.
- Fluid compute is GA and default. Billing is CPU-hours, not "requests." 100k cheap requests can still exhaust 4 CPU-hrs on Hobby if SSR/map work is heavy.
- Preview URLs on Hobby are public. Preview protection is a Pro feature.
- `next dev` already matches Vercel's Node runtime for this stack. `vercel dev` is not required and can diverge.
- Default function region is iad1 (US). Set `fra1` (Frankfurt) explicitly. There is no Poland region. Node 20 is deprecated 2026-10-01; new projects default to 24.x.
- Vercel MCP is Public Beta (`https://mcp.vercel.com`).

## Operational Story

How Vercel operates day to day for this repo (`https://github.com/wilk-szymon/slacklans`, branch `main`).

- **Preview deploys**: `vercel` (no `--prod`) or a push to a non-production Git branch after the GitHub integration is connected. Stdout is the preview URL. Hobby previews are public; Vercel Authentication for previews is Pro. Fork PRs from outsiders are not enabled unless you turn on the Git integration's fork-PR setting — leave it off.
- **Secrets**: Project Environment Variables in Vercel (Production / Preview / Development). Pull locally with `vercel env pull`. Team members with project access can read values in the dashboard; the CLI can list names. Rotate by removing and re-adding the var (`vercel env rm` / `vercel env add`), then redeploy — changing a var does not mutate an existing deployment. Never commit `.env*` (`@.gitignore`).
- **Rollback**: `vercel rollback` (Hobby: previous production deployment only) or `vercel rollback <deployment-id-or-url>`. Typical time-to-revert is one promote, seconds to a minute. Database migrations (Neon, later) do **not** roll back with the app.
- **Approval**: A human must: first production deploy / custom domain, Hobby→Pro upgrade, Neon provision, secret rotation for auth keys, and any database drop. An agent may create preview deploys (`vercel`) unattended once the project is linked (`VERCEL_ORG_ID` + `VERCEL_PROJECT_ID` or an existing `.vercel/`). Do not let an agent run `vercel --prod` without an explicit ask.
- **Logs**: `vercel logs --follow` (live, ≤5 min) and `vercel logs --deployment <id> --json`. MCP: `https://mcp.vercel.com` (**Public Beta**, 2026-09-05). Runtime logs on Hobby are retained 1 hour.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Hobby paused as "commercial" | Devil's advocate / Research | L | H | Ship without ads/payments; if the app monetizes, budget Pro $20 or move to Railway. Confirm with Vercel Support if unsure. |
| Hobby usage pause (CPU / images / transfer) | Devil's advocate / Pre-mortem | M | H | Watch 4 CPU-hrs and 5k image transforms; prefer unoptimized local images until Blob exists; upgrade or wait the cycle — there is no Hobby buy-up. |
| Neon region ≠ function region | Devil's advocate / Pre-mortem | M | M | Create Neon in EU (Frankfurt/Amsterdam) and set Vercel `regions` to `["fra1"]` before first DB traffic. |
| Photos blow image optimization quota | Devil's advocate | M | M | Do not enable `next/image` optimization for user uploads on Hobby; serve Blob URLs or unoptimized images until Pro. |
| GitHub Actions + Vercel Git both deploy | Pre-mortem | M | L | Pick one: Vercel Git integration on `main` **or** Actions. Tech-stack recorded GHA auto-deploy; do not also connect Git deploy without disabling one. |
| `edge` / `middleware.ts` copied from training data | Unknown unknowns | H | M | Next 16.3: no `runtime = 'edge'`; use `proxy.ts` (Node). Read `node_modules/next/dist/docs/` before adding middleware. |
| Public preview URLs leak unreleased spots | Unknown unknowns | M | M | Treat preview URLs as public on Hobby. Do not put real user photos on previews, or upgrade for preview auth. |
| WebSocket/live features later | Devil's advocate | L | H | Out of PRD. If they appear, re-evaluate Railway/Render (always-on) rather than Vercel WS **Public Beta**. |
| MCP tools change under beta | Unknown unknowns / Research | M | L | Prefer `vercel` CLI for deploy/logs; treat MCP as optional. |
| App rollback does not undo DB migrations | Research | M | H | Never migrate production schema in the same change as an irreversible data rewrite; keep forward-fix migrations. |

## Getting Started

Validated 2026-09-05 against Next.js 16.3.4 on Vercel (Hobby). Local runtime stays `npm run dev` — do not add `vercel dev` for this stack.

1. Install and log in: `npm i -g vercel` then `vercel login`.
2. From the repo root: `vercel link` (or `vercel --yes` to accept defaults). Confirm the project name `slacklans`. This writes `.vercel/` (already gitignored by Vercel tooling; keep it out of git if it appears).
3. Pin compute to Frankfurt before the first production deploy: add `vercel.json` with `"regions": ["fra1"]`. Default is `iad1` (US). Hobby allows one region.
4. Preview: `vercel` — stdout is the URL. Production: `vercel deploy --prod` (first deploy of a new project is production even without `--prod`; later previews need the flag omitted, production needs `--prod`).
5. Connect GitHub `wilk-szymon/slacklans` in the Vercel project **or** keep deploys CLI-only. If you later add GitHub Actions, disable Vercel's git auto-deploy (or the reverse) so `main` builds once. When Postgres/photos land: Neon (EU) via Marketplace + Vercel Blob; do not assume Vercel Postgres exists.

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup
- Production-scale architecture (multi-region, HA, DR)
