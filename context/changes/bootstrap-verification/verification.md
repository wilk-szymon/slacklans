---
bootstrapped_at: 2026-09-05T14:32:29Z
starter_id: next
starter_name: Next.js
project_name: slacklans
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: npm audit --json
---

## Hand-off

```yaml
starter_id: next
package_manager: npm
project_name: slacklans
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

## Why this stack

Solo after-hours ship of a Polish Gdynia web app in three weeks, on Vercel, with TypeScript and PostgreSQL as soft preferences. You walked the custom path and picked Next.js over the JS web default (Astro + Supabase + Cloudflare) and over T3: Next is the mainstream full-stack React starter, Vercel is its default host, and scaffolding has been run end-to-end. Login is in scope; payments, realtime, AI, and background jobs are not. Auth, Postgres, spot photos, and the map place-picker are extra assembly on Next — they are not first-class in this starter. GitHub Actions auto-deploys on merge to main.

## Pre-scaffold verification

| Signal             | Value                                              | Severity | Notes                                                                 |
| ------------------ | -------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| npm package        | create-next-app v16.3.4 published 2026-09-04T23:40:34.955Z | fresh    | resolved from `npx create-next-app@latest` in cmd_template            |
| GitHub repo        | not run                                            | —        | card `docs_url` is `https://nextjs.org/docs`, not `github.com/<owner>/<repo>` |

## Scaffold log

**Resolved invocation**: `npx --yes create-next-app@latest bootstrap-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`

**Strategy**: subdir-then-move (temp directory then move files up)

**Exit code**: 0 (after one retry; see note)

**Files moved**: 19 project files + `node_modules/` + `.git/` (create-next-app initialized a git repo in the temp dir; cwd had no `.git/`, so it moved up)

**Conflicts (.scaffold siblings)**: AGENTS.md

**`.gitignore` handling**: moved silently (no `.gitignore` in cwd)

**`.bootstrap-scaffold` cleanup**: deleted (temp dir was `bootstrap-scaffold/` rather than `.bootstrap-scaffold/` — see note)

**Note — npm naming restriction**: first invocation used `{name}=.bootstrap-scaffold` per the default temp-dir convention and exited 1:

```
Could not create a project called ".bootstrap-scaffold" because of npm naming restrictions:
    * name cannot start with a period
```

Retried with `{name}=bootstrap-scaffold` (valid npm package name). Same merge policy applied. `package.json` `name` was then patched from `bootstrap-scaffold` to `slacklans` (the hand-off project name). Extra `--yes` flags were passed so npx and create-next-app ran non-interactively.

**Move log**:

- moved: `.gitignore`, `.next/`, `CLAUDE.md`, `README.md`, `eslint.config.mjs`, `next-env.d.ts`, `next.config.ts`, `node_modules/`, `package-lock.json`, `package.json`, `postcss.config.mjs`, `public/`, `src/`, `tsconfig.json`, `.git/`
- sidecar: `AGENTS.md` → `AGENTS.md.scaffold` (cwd already had a 10x-cli `AGENTS.md`; existing file kept)
- dropped: none (`context/` was not present in the scaffold)
- leftover in temp dir before delete: `bootstrap-scaffold/AGENTS.md` (source of the sidecar copy)

**CLI stdout (success, last lines)**:

```
Generating route types...
✓ Types generated successfully

Initialized a git repository.

Success! Created bootstrap-scaffold at /Users/swilk/Library/CloudStorage/OneDrive-Personal/10x/bootstrap-scaffold
```

**CLI warnings**: `eslint@9.39.5` marked deprecated; `unrs-resolver@1.12.2` postinstall blocked by npm `allowScripts`. Neither halted the scaffold.

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: not distinguished by this tool (`metadata.dependencies` reports prod/dev/optional/peer, no `direct` field). Totals: prod 17, dev 384, optional 88, total 438. `vulnerabilities` object empty.

#### CRITICAL findings

none

#### HIGH findings

none

#### MODERATE findings

none

#### LOW / INFO findings

none

Raw `metadata.vulnerabilities`: info 0, low 0, moderate 0, high 0, critical 0, total 0. Exit code 0.

## Hints recorded but not acted on

| Hint                       | Value                              |
| -------------------------- | ---------------------------------- |
| bootstrapper_confidence    | verified                           |
| quality_override           | false                              |
| path_taken                 | custom                             |
| self_check_answers         | typed: true; from_official_starter: true; conventions: true; docs_current: true; can_judge_agent: false |
| team_size                  | solo                               |
| deployment_target          | vercel                             |
| ci_provider                | github-actions                     |
| ci_default_flow            | auto-deploy-on-merge               |
| has_auth                   | true                               |
| has_payments               | false                              |
| has_realtime               | false                              |
| has_ai                     | false                              |
| has_background_jobs        | false                              |

Auth is in scope on the hand-off; this starter does not scaffold auth (or Postgres, photos, map picker). Those remain extra assembly.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.
