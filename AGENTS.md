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

Scripts live in `@package.json`. Lint config is `@eslint.config.mjs`. Vitest is the test runner; `npm run test:run` is the local unit+integration gate. How to add a test lives in `context/foundation/test-plan.md` §6.

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

## 10xDevs AI Toolkit - Module 3, Lesson 4 (E2E Tests)

**For E2E tests, use the `/10x-e2e` skill.** It is the single source of truth
for the workflow — risk → seed test + rules → generate → review against the five
anti-patterns → re-prompt → verify. The skill's `references/` carry the full
rules, anti-patterns, seed pattern, and prompt-template.

A few hard rules that hold even before you invoke the skill:

- **Locators:** `getByRole` / `getByLabel` / `getByText` first; `getByTestId`
  only when accessibility attributes are ambiguous. Never CSS selectors, XPath,
  or DOM structure.
- **Never `page.waitForTimeout()`.** Wait for state: `toBeVisible()`,
  `waitForURL()`, `waitForResponse()`.
- **Test independence + cleanup.** Each test runs standalone — its own setup,
  action, assertion, and cleanup; unique ids (timestamp suffix) so parallel runs
  and re-runs don't collide.

Two boundaries to keep straight:

- **DOM (snapshot) is the default.** Vision (`--caps=vision`) is a supplement for
  visual-only risks (layout, z-index, animation); for pixel regression prefer
  deterministic tools (`toMatchSnapshot`, Argos, Lost Pixel). VLM model
  selection/cost is a debugging topic (Lesson 5), not testing.
- **Healer helps on selectors, harms on logic.** A changed selector → healer
  re-finds it (route through PR review). A changed business behavior → healer
  masks the bug; that failing-test-to-fix case is Lesson 5.

<!-- END @przeprogramowani/10x-cli -->
