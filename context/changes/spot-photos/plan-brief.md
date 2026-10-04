# Spot and session photos — Plan Brief

> Full plan: `context/changes/spot-photos/plan.md`

## What & Why

Slackliners need a photo of the place and of a given meetup, and a visitor opening the shared link or the place page must see a real image. Empty is fine. A broken image is not. This is roadmap S-02 (FR-003), the last open slice of the first shareable session.

## Starting Point

Sessions already post, share, and list. A spot is a name and a pin with no URL and no file column. `/spot` is the create page. Public pages must not call `getSession`, or the whole document can 500.

## Desired End State

`/sesja/[id]` shows that session's photos. `/miejsce/[id]` shows the spot gallery: photos the owner uploaded, plus session photos they featured. The place name on the session links to the spot page. Any logged-in user can add a session photo, including after the session ends, and can delete only their own. The owner maintains the gallery. Deleting a session photo removes it from both places.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) |
| --- | --- | --- |
| Two lists | Session photos and a spot gallery, each page shows only its own | A visitor on the shared link sees that day, and the place page stays a place. |
| Who writes | Any logged-in user adds session photos and deletes their own. The spot owner adds and deletes place photos and features session photos from that spot | The owner curates the place, and nobody loses another person's photo. |
| Featuring | A flag on the session photo, one file | The author's delete still removes it from the gallery, and the owner can unfeature without deleting. |
| How many | No count cap. JPEG, PNG, or WebP, at most 8 MiB each | A cap was rejected. The type and size limit keeps a file the browser cannot show from becoming a broken image. |
| Bytes | Browser upload to a public Vercel Blob, then a server action writes the row after `head()` checks the URL | Server Actions stop at 1 MB, and the completion webhook does not reach localhost. |
| Display | Plain `<img>` of the blob URL | Hobby image optimization pauses the deployment at 5,000 transforms. |
| Where | New public `/miejsce/[id]`. `/spot` stays the create flow | The create URL is already taken, and a spots catalog stays parked. |
| When | On the create form and later, including finished sessions | Photos usually exist after the meetup, and publish can still carry them. |
| Empty | No heading and no image | The requirement forbids a placeholder. |
| Public pages | A server child loads the list via `loadChromeSession`. A client child calls `upload()` | A failed session lookup hides the buttons and still shows the photos. One file cannot do both. |

## Scope

**In scope:** Both tables and a `0003` migration, the upload route, attach / feature / delete rules, the two public pages, create-form uploads, and Vitest coverage of the rules.

**Out of scope:** A count cap, captions, reorder, HEIC, home-page thumbnails, a spots index, videos, `next/image` optimization, and deleting someone else's session photo.

## Architecture / Approach

The browser asks `/api/blob/upload` for a token. The route requires a session and pins the pathname to `session-photos/<userId>/` or `spot-photos/<userId>/`. The file goes to Blob. The browser then calls a server action with the returned URL. The action checks `head()` and inserts `session_photo` or `spot_photo`. Featuring sets `featured` on the session row. Public pages read one list each and render the blob URL.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Photo records and rules | Tables, token route, mutations, tests | A client-supplied URL gets stored without a `head()` check |
| 2. Public pages | `/sesja/[id]` and `/miejsce/[id]` show their own lists | The page calls `getSession` and a lookup failure 500s the visitor |
| 3. Add and manage | Create form, session add/delete, owner gallery and featuring | The owner picker leaks unfeatured session photos to visitors |

**Prerequisites:** S-01 is done. A public Vercel Blob store and `BLOB_READ_WRITE_TOKEN` in `.env.local` (and Preview / Production) before the phase 3 manual pass. Phase 1's migration needs `DATABASE_URL`.

**Estimated effort:** About three sessions, one per phase.

## Open Risks & Assumptions

- Unlimited uploads can fill the Blob store. A cap waits until that actually happens. The 8 MiB type gate still applies.
- Uploads that never get attached leave orphan blobs. No cleanup job in this slice.
- App rollback does not delete Blob objects or undo `0003`.
- Preview deployments are public on Hobby. Real photos on a preview URL are visible to anyone with the URL.

## Success Criteria (Summary)

- A visitor sees a session's photos only on that session, and the spot gallery only on `/miejsce/[id]`.
- The owner can feature a session photo, and the author's delete removes it from both pages.
- A session with no photos shows no photo block, and a logged-out visitor still sees photos that exist.
