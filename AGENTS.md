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

## 10xDevs AI Toolkit - Module 2, Lesson 4

Prepare for a harder implementation stream with the **research-backed planning chain**:

```
internal research (/10x-research) + external research (exa.ai, Context7) -> /10x-plan -> /10x-implement -> success
```

The lesson focus is distinguishing internal from external research and using evidence to back planning decisions.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Internal research (lesson focus)** | |
| `/10x-research <change-id>` | You need evidence from the existing codebase — patterns, conventions, integration points, or existing implementations. Runs parallel sub-agents over the repo and writes structured findings to `research.md`. |
| **External research (lesson focus)** | |
| exa.ai | You need AI-native web search for library comparisons, best practices, or ecosystem context that the codebase cannot answer. |
| Context7 (`resolve-library-id` → `get-library-docs`) | You need live, current documentation for a specific library or framework. Resolves a library ID first, then fetches relevant doc pages. |
| **Framing spare wheel** | |
| `/10x-frame <change-id>` | The plan won't converge, the plan doesn't deliver expected results, or persistent drift keeps breaking the implementation. Use as an escape hatch on a separate problem (demonstrated on Space Explorers example), not as pre-research ritual. |
| **Planning and execution** | |
| `/10x-plan <change-id>` / `/10x-implement <change-id> phase <n>` | Use the same planning and execution chain from Lesson 2, now with upstream research evidence feeding the plan. |

### Research discipline

- Internal research (`/10x-research`) answers "what does our codebase already do?" — patterns, schemas, conventions, integration points.
- External research (exa.ai, Context7) answers "what should we do?" — library capabilities, API docs, ecosystem best practices.
- Combine both as evidence-backed input to `/10x-plan`. A plan without research evidence on a non-trivial stream is a guess.
- Agent-friendly docs (`llms.txt`, markdown-for-agents, `/md` endpoints) are a quality signal for library selection — libraries that publish agent-readable docs integrate faster.

### `/10x-frame` as spare wheel

Three triggers for reaching for `/10x-frame`:
1. The plan won't converge — research keeps opening more questions instead of narrowing to a contract.
2. The plan doesn't deliver — implementation repeatedly fails to meet success criteria.
3. Persistent drift — the implementation keeps diverging from the plan in ways that suggest the problem was mis-framed.

Demonstrated on a Space Explorers example, not the SRS path. It is an escape hatch, not a mandatory step.

### Paths used by this lesson

- `context/changes/<change-id>/research.md` - internal research output
- `context/changes/<change-id>/frame.md` - framing output when needed
- `context/changes/<change-id>/plan.md` - evidence-backed implementation contract
- `context/foundation/lessons.md` - recurring rules and pitfalls

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
