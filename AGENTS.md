<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Repository Guidelines

Slacklans is a Polish Gdynia slackline spots-and-events app. Stack: Next.js 16.3.4 App Router, React 19, TypeScript, Tailwind 4, npm, `src/` layout. Read `@context/foundation/prd.md` and `@context/foundation/tech-stack.md` before inventing product or stack choices.

## Hard rules

- Do not write under `context/archive/` (`@context/archive/README.md`).
- Do not overwrite `context/`. Edit foundation docs in place (`@context/foundation/README.md`).
- Routes live in `src/app/`, not repo-root `app/`. `@README.md` cites `app/page.tsx`; the file is `@src/app/page.tsx`. `@/*` maps to `./src/*` (`@tsconfig.json`).
- Auth, Postgres, spot photos, and the map picker are in the PRD and absent from this tree. Do not add their libraries, routes, or env vars unless the task is to assemble them.
- Keep the `BEGIN:nextjs-agent-rules` block above; `next dev` restores it if removed.
- Do not commit `.env*` (`@.gitignore`).

## Build, Test, and Development Commands

Scripts live in `@package.json`. Lint config is `@eslint.config.mjs`. No `test` script and no `*.test.*` files. Do not add a test runner unless asked.

## Project Structure & Module Organization

- `src/app/` — App Router. Copy the default-export shape in `@src/app/page.tsx` and `@src/app/layout.tsx`.
- `src/app/globals.css` — Tailwind v4 via `@import "tailwindcss"`; no `tailwind.config.*`.
- `context/foundation/` — PRD, shape notes, tech-stack.

`@CLAUDE.md` only contains `@AGENTS.md`.

## Coding Style & Naming Conventions

Run `npm run lint` before finishing. Colocated UI under `src/` uses PascalCase filenames. Import app code with `@/`, not paths that leave `src/`.

## Commit & Pull Request Guidelines

Only commit: `Initial commit from Create Next App`. Remote is `origin` → `https://github.com/wilk-szymon/slacklans` (branch `main`). No `.github/workflows/`. Use a short imperative subject until a convention is set. No CI gate exists. PRs target `main` on that origin.

## Security & Configuration

No `.env` or `.env.example`. Secrets go in gitignored `.env*` only. `@next.config.ts` is empty starter config. Vercel plus GitHub Actions auto-deploy are recorded in `@context/foundation/tech-stack.md` and are not scaffolded.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 3

Review AI-generated code before merge with the **implementation review chain**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` is the lesson focus. Review is a quality gate, not an instruction to fix every finding.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Code review (lesson focus)** | |
| `/10x-impl-review <change-id>` | You have implemented code and want a structured review before merge. The skill checks plan adherence, scope discipline, safety and quality, architecture, pattern consistency, and success criteria, then presents findings for triage. |
| **Recurring lesson outcome** | |
| `/10x-lesson` | A finding reveals a recurring project rule or agent failure pattern. Record it in `context/foundation/lessons.md` instead of treating it as a one-off note. |

### Triage discipline

- Severity says how bad the finding is. Impact says how much the decision matters now.
- Valid outcomes: fix now, fix differently, skip, accept as risk, record as recurring rule (`/10x-lesson`), disagree.
- Fix critical findings. Do not burn hours on low-impact observations just because the agent found them.
- Conscious skipping of low-impact findings is a valid review outcome, not negligence.
- If you disagree with a finding, record why. Wrong agent reasoning is also signal.

### Review boundaries

- This lesson reviews implemented code. It does not create the plan, execute new phases, or teach CI review.
- Testing strategy and quality gates are introduced in Module 3.
- Do not use `/10x-contract` as a triage outcome in this lesson.

### Paths used by this lesson

- `context/changes/<change-id>/plan.md` - expected implementation contract
- `context/changes/<change-id>/reviews/` - review output
- `context/foundation/lessons.md` - recurring lessons

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
