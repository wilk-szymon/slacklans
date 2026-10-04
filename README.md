# Slacklans

Polish web app for the Gdynia slackline scene. The public home lists sessions that have not ended yet, with the soonest start first, in Europe/Warsaw time. A logged-in slackliner pins a place on the map or reuses an existing spot, sets a start and finish, and shares `/sesja/[id]`. Visitors see time and place with no account.

Production: [slacklans.vercel.app](https://slacklans.vercel.app)

## Stack

- [Next.js](https://nextjs.org) 16.3.4 (App Router) on React 19, TypeScript, and Tailwind CSS 4
- [Better Auth](https://www.better-auth.com) email and password
- [Neon](https://neon.tech) Postgres through [Drizzle](https://orm.drizzle.team)
- [Leaflet](https://leafletjs.com) and react-leaflet, with MapTiler raster tiles
- npm, Vitest, Playwright, ESLint
- Vercel, functions in `fra1` (`vercel.json`)

Routes live in `src/app/`. The `@/*` import alias maps to `./src/*`.

## Getting started

You need Node.js 20 or newer and a Postgres database (Neon in EU matches the `fra1` deploy).

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Fill `.env.local` before `db:migrate` and `dev`. The dev server reads that file. Do not commit `.env*`.

| Variable | Role |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Required. Auth opens the pool when the app loads. |
| `BETTER_AUTH_SECRET` | Long random string for auth. |
| `BETTER_AUTH_URL` | Public origin of this app. Locally `http://localhost:3000`. In production `https://slacklans.vercel.app`. |
| `NEXT_PUBLIC_MAPTILER_KEY` | MapTiler key for the session map. Optional for the rest of the app. `/spot` shows an error until it is set. Use a protected key and restrict HTTP origins. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest watch mode (`src/**/*.test.ts`) |
| `npm run test:run` | Vitest once |
| `npm run db:generate` | Write a Drizzle migration from `src/lib/schema/` |
| `npm run db:migrate` | Apply migrations in `drizzle/` |

Playwright lives in `e2e/` and is not an npm script. Build first, then run `npx playwright test`. The config starts `next start` on port 3100 and sets `E2E_THROW_SESSION=1` so the public-home spec can check that a failed session lookup still leaves `/` up for visitors.

`lefthook.yml` runs ESLint, `tsc --noEmit`, and related Vitest tests on pre-commit when Lefthook is installed.

## What the app does

The interface is Polish.

- **Home (`/`)** lists sessions whose end is still in the future. The first card is the soonest start and shows the finish time. Same start time prefers the creator with more finished sessions, then the smaller id. An empty list says there is nothing to join.
- **Session (`/sesja/[id]`)** is public: start, finish, place name or coordinates, and an OpenStreetMap link. Unknown ids 404.
- **New session (`/spot`)** requires a login. Pick an existing spot or drop a pin, optional name (max 200 characters), and a Warsaw start and finish. Finish must be after start. `/nowe` redirects here.
- **My sessions (`/moje`)** lists the signed-in user's sessions that have not ended, soonest start first.
- **Edit (`/sesja/[id]/edytuj`)** lets the creator change start and finish until the session has ended.
- **Account** is email and password at `/logowanie` and `/rejestracja`. Password minimum is 8 characters. Sessions last 7 days. Sign-in is rate-limited. `/spot` and `/moje` redirect to login when the session cookie is missing (`src/proxy.ts`). The header still renders logged-out links if session lookup throws.

Auth HTTP routes are under `/api/auth/[...all]`.

## Layout

```
src/app/            pages and the auth route handler
src/components/     header and map
src/lib/            auth, database, home ranking, spot actions, Warsaw time
src/lib/schema/     Drizzle tables: user, session, account, verification, spot, event
src/proxy.ts        cookie gate for /spot and /moje
drizzle/            SQL migrations
e2e/                Playwright
context/foundation/ product, stack, and test notes
```

Product requirements and stack notes live in `context/foundation/prd.md` and `context/foundation/tech-stack.md`.

## Deploy

The app is on Vercel in `fra1`. Set the same environment variables for Production and Preview. `BETTER_AUTH_URL` must be the origin that serves that deployment. Database migrations do not roll back with an app rollback.
