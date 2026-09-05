# First Vercel deploy — Slacklans

Runbook for the first production deploy of the Next.js 16.3.4 starter. Fills gaps in `@context/foundation/infrastructure.md` Getting Started against `@context/foundation/tech-stack.md` and the current repo.

- **Platform:** Vercel Hobby
- **Project name:** `slacklans`
- **Package manager:** npm
- **Git remote:** `https://github.com/wilk-szymon/slacklans` (`main`)
- **This run:** CLI-only production deploy. No GitHub connection, no GitHub Actions, no Neon, no Blob, no auth.

## Gaps found (not in Getting Started)

| Gap | Evidence | Decision for this run |
|---|---|---|
| First CLI deploy of a new project **is production**, even without `--prod` | infrastructure Getting Started; Vercel docs | Treat this as the human-approved first production deploy: `vercel deploy --prod --yes` after link. |
| Agent must not run `--prod` unattended | infrastructure Operational Story | The execute request is the explicit ask. Stop if `vercel login` fails. |
| No `vercel.json` yet | cwd | Add `regions: ["fra1"]` before deploy. Hobby = one region. Default otherwise is `iad1`. |
| Not linked; CLI token invalid | no `.vercel/`; `vercel whoami` failed | Human `vercel login` is a hard gate, then `vercel link` with project name `slacklans`. |
| CLI was 54.18.6 vs latest 59.x; CLI 55 changed `--yes` / team linking | `vercel --version` | Upgrade with `npm i -g vercel@latest` before login/link. |
| Local Node 26.3.0; Vercel default 24.x | `node -v`; infrastructure unknown unknowns | Do not pin `engines`. Remote build uses Vercel Node 24. |
| Tech-stack GHA auto-deploy vs infra “pick one” and CI out of scope | tech-stack frontmatter; infrastructure | CLI-only. Do not connect GitHub. Do not add `.github/workflows`. |
| Dirty working tree; GitHub remote exists | `git status` | CLI uploads the working tree. No commit/push required. |
| Course/context files would upload | `.gitignore` does not ignore `context/` | `.vercelignore` excludes `context/`, `.agents/`, `.claude/`, `AGENTS.md.scaffold`, `skills-lock.json`. |
| `vercel pull` / `vercel dev` | Vercel CLI defaults | Skip. No env vars. Local server stays `npm run dev`. |
| Neon / Blob / auth | tech-stack extras | Out of this run. |
| Hobby commercial policy | infrastructure risk register | Accepted: no ads, no payments (`has_payments: false`). |

## Sequence

1. Write this file.
2. Add `vercel.json` (`fra1`) and `.vercelignore`.
3. Upgrade CLI: `npm i -g vercel@latest`.
4. Auth: `vercel login` then `vercel whoami`. Stop on failure.
5. Link: `vercel link --yes --project slacklans` from repo root. `.vercel/` stays gitignored.
6. Deploy: `vercel deploy --prod --yes`.
7. Verify inspect, HTTP 200, region, error logs.
8. Record results below.
9. Do not `vercel git connect`, add GHA, `vercel env add`, or provision Neon/Blob.

## Files in this run

- `context/deployment/deploy-plan.md` (this file)
- `vercel.json`
- `.vercelignore`
- `.vercel/` locally (gitignored)

## Follow-ups (not this run)

- Commit `vercel.json` and `.vercelignore` with the next commit.
- Later: **either** Vercel Git integration on `main` **or** GitHub Actions auto-deploy — never both.
- Later: Neon EU + Blob when auth/photos land; keep functions on `fra1`.

## Out of scope

Docker, GHA workflow, custom domain, preview protection (Pro), Neon, Blob, auth, `vercel dev`, production HA.

## Deploy Result

- **URL:** https://slacklans.vercel.app (alias); deployment https://slacklans-g47oi7nht-swilk.vercel.app
- **Inspect:** https://vercel.com/swilk/slacklans/GAmtcxmaHdzurF1LHao4ByzEVP1V
- **Target:** production
- **Status:** READY
- **Framework:** nextjs (Next.js 16.3.4, Turbopack)
- **Build duration:** Ready in 35s (remote `next build` ~26s)
- **Deployment id:** `dpl_GAmtcxmaHdzurF1LHao4ByzEVP1V`
- **Source:** CLI (`vercel deploy --prod --yes --scope swilk`)
- **Team / project:** `swilk` / `prj_vaErWXi5WsgIdkOzKucl0akaekcn`
- **CLI:** 59.11.7 after upgrade from 54.18.6
- **Linked as:** `wilk-szymon` on Hobby team Wilk

### Post-Deploy

- **Homepage:** HTTP 200 on https://slacklans.vercel.app — title `Create Next App`, starter copy and Next.js logo present (`x-nextjs-prerender: 1`)
- **Region:** Functions listed as `[fra1]` (`λ index`, `_global-error`). Deployment `regions: ["fra1"]`. Build machine was iad1 (normal). CDN PoP for this GET was `arn1` (Stockholm) via `x-vercel-id` — static prerender, not a function hop.
- **Error scan:** `vercel logs … --level error` — no logs found (clean)
- **Git:** CLI attach recorded GitHub metadata from local `origin` (`gitDirty: 1`). This run did **not** `vercel git connect` and did **not** add GitHub Actions. Keep it that way until you pick one auto-deploy path.
