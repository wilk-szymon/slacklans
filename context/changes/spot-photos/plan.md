# Spot and session photos Implementation Plan

## Overview

A logged-in slackliner can attach photos to a session, and the owner of a spot can keep a separate place gallery. Visitors see each list on its own page. A photo that does not render is a failure. An empty list shows nothing.

## Current State Analysis

Sessions already post and share. `/spot` creates a spot or reuses one and writes one event (`src/lib/spot-actions.ts`). `/sesja/[id]` is public and shows Warsaw start and finish, the place label, and an OpenStreetMap link. `/` and `/moje` show the place label and time. There is no spot URL. `/spot` is the create page, not a place page.

`spot` and `event` have no photo columns (`src/lib/schema/spots.ts`). Nothing in `src/` accepts a file upload. The map logo is a plain `<img>` because `next/image` was left for this slice (`src/components/SpotMap.tsx`). Infrastructure already chose Vercel Blob for the bytes and forbids `next/image` optimization on Hobby.

Public pages must not call `getSession`. `src/app/public-get-session-imports.test.ts` fails if `src/app/sesja/[id]/page.tsx` contains that string. Shared chrome already fails open through `loadChromeSession` (`src/lib/chrome-session.ts`). Writes check `getSession()` inside the server action. The proxy only checks a cookie, and only for `/spot` and `/moje`.

Product foreign keys use `ON DELETE RESTRICT`. `deleteSession` deletes the event, then deletes the spot only when that spot has no events left and the caller created it.

## Desired End State

A visitor opening `/sesja/[id]` sees that session's photos and no other photos. The place name links to `/miejsce/[id]`. That page shows the spot gallery only: photos the owner uploaded, plus session photos the owner has featured. Neither page shows a photo block when its list is empty. Neither page shows a broken image or a placeholder graphic.

Any logged-in user can add a photo to any session, including one that has ended, from the session page, and the publisher can attach session photos while creating the session. The spot owner can upload and delete place photos, and can feature or unfeature session photos taken at that spot. Each user can delete only the session photos they uploaded. Deleting a session photo removes it from the session and from the spot gallery. There is no count cap.

### Key Discoveries:

- Server Actions reject bodies over 1 MB (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`). Phone photos cannot ride in `createSession`.
- Vercel Blob client upload sends the file from the browser to Blob. `handleUpload` still needs `BLOB_READ_WRITE_TOKEN`. `onUploadCompleted` is a webhook and does not run against localhost without a tunnel ([client uploads](https://vercel.com/docs/vercel-blob/client-upload)).
- `upload()` returns the blob URL to the browser even when that webhook never fires. The database row can be written by a follow-up server action that checks the blob with the server SDK.
- Hobby image optimization is 5,000 transforms a month, then the deployment pauses (`context/foundation/infrastructure.md`). User photos are served as the blob URL.
- A missing MapTiler key already fails only the map island. A missing blob token must fail the upload, not the public page.

## What We're NOT Doing

- A count cap, captions, cropping, reordering, or a cover photo
- HEIC, GIF, SVG, or any type other than JPEG, PNG, and WebP
- `next/image` optimization, or `next/image` at all for these photos
- Photos on `/` or `/moje`
- A list of all spots (FR-017)
- Videos, ratings, favorites, descriptions, skill level
- The spot owner deleting another person's session photo
- Requiring a photo before a session can be published
- A job that deletes blobs nobody attached
- Editing a spot's name or coordinates
- Gating `/miejsce` or `/sesja/[id]` behind login
- An unattended production deploy

## Implementation Approach

Two tables. `session_photo` belongs to one event and one uploader. `featured` marks it into the spot gallery without copying the file. `spot_photo` belongs to the spot and is uploaded by the spot owner.

Bytes go browser → Vercel Blob (`access: 'public'`) through one route that issues a client token only to a logged-in user. The token allows `image/jpeg`, `image/png`, and `image/webp`, at most 8 MiB. The pathname is chosen on the server side of token generation and always starts with `session-photos/<userId>/` or `spot-photos/<userId>/`, plus a random suffix. After `upload()` resolves, a server action checks `head()` on that URL: the blob is in this store, the pathname prefix is the current user and the right kind, and the content type and size match. Only then does it insert a row. The client cannot attach an arbitrary URL.

Public pages render `<img>` with the stored blob URL and a Polish alt. Controls that need the current user live in a child that calls `loadChromeSession`, so a session-lookup failure hides the buttons and still paints the photos.

`/miejsce/[id]` is the place page. `/spot` stays the create flow.

## Critical Implementation Details

**Timing & lifecycle.** Do not write the photo row from `onUploadCompleted`. That callback is invoked by Vercel, not by the browser, and it does not reach `localhost`. The row is written when the browser calls the server action with the URL `upload()` returned. Orphan blobs, from an upload that never gets attached, stay in the store until a later cleanup. That is accepted.

**User experience spec.** Copy is Polish. Photos stack vertically, full width of the existing column, in `created_at` order, then `id` for a tie. No carousel. Session page heading `Zdjęcia` only when that session has photos. Spot page heading `Zdjęcia` only when the gallery is non-empty. File input label `Dodaj zdjęcie` on a session, `Dodaj zdjęcie miejsca` for an owner upload. Delete `Usuń zdjęcie`. Feature `Pokaż na stronie miejsca`. Unfeature `Usuń ze strony miejsca`. The owner-only picker heading is `Zdjęcia z sesji` and is absent for everyone else. An empty visitor list has no heading and no image.

**State sequencing.** Read the pathname, delete the photo row inside the database transaction, then delete the blob. If the blob delete fails, leave the orphan and do not restore the row, so the page never keeps an `<img>` aimed at a missing file. `deleteSession` loads photo pathnames, deletes those rows, then deletes the event, in one transaction. When it also deletes the spot, it deletes that spot's `spot_photo` rows in the same transaction before the spot row. Blob deletes run after the commit. A blob-delete failure leaves orphans and does not restore the session. Foreign keys stay `ON DELETE RESTRICT`, so a forgotten photo row fails the event delete instead of dropping the row without a pathname to clean up.

## Phase 1: Photo records and rules

### Overview

Persist both lists and enforce who may attach, feature, and delete. No new page yet.

### Changes Required:

#### 1. Tables

**File**: `src/lib/schema/spots.ts`

**Intent**: Store session photos and owner place photos as separate rows so featuring does not copy a file.

**Contract**: `session_photo`: `id` text PK, `event_id` text not null FK → `event.id` ON DELETE RESTRICT, `uploader_id` text not null FK → `user.id` ON DELETE RESTRICT, `blob_url` text not null, `pathname` text not null, `featured` boolean not null default false, `created_at` timestamptz not null. `spot_photo`: `id` text PK, `spot_id` text not null FK → `spot.id` ON DELETE RESTRICT, `uploader_id` text not null FK → `user.id` ON DELETE RESTRICT, `blob_url` text not null, `pathname` text not null, `created_at` timestamptz not null. Do not add these tables to the Better Auth adapter. Next migration is `drizzle/0003_*` via `npm run db:generate`. Do not rewrite `0000`–`0002`.

#### 2. Read model

**File**: `src/lib/photo-queries.ts` (new)

**Intent**: Give the two pages two different lists.

**Contract**: `loadSessionPhotos(eventId)` returns `id`, `blob_url`, `uploader_id`, and `created_at` for that event, `created_at` ascending, then `id` ascending. `loadSpotGallery(spotId)` returns `spot_photo` rows for that spot plus `session_photo` rows with `featured = true` whose event's `spot_id` is that spot, same order, using each row's own `created_at`. Each gallery row includes `id`, `blob_url`, `created_at`, and `kind: "spot" | "session"`. `loadUnfeaturedSessionPhotos(spotId)` returns `id` and `blob_url` for non-featured session photos on events at that spot, same order. No function returns both lists as one visitor payload.

#### 3. Upload token

**File**: `src/app/api/blob/upload/route.ts` (new) and a pure helper next to it

**Intent**: Let a logged-in browser upload straight to Blob, and refuse everyone else.

**Contract**: `POST` uses `handleUpload` from `@vercel/blob/client`. The helper that runs before the token is issued receives the session user id or null, the requested kind (`session` or `spot`), and returns either a rejection or token options. Null user rejects. Kind `session` forces pathname prefix `session-photos/<userId>/`. Kind `spot` forces `spot-photos/<userId>/`. Allowed types are `image/jpeg`, `image/png`, `image/webp`. Maximum size is 8 MiB. Random suffix on. `tokenPayload` carries the user id and the kind. `onUploadCompleted` does not insert a row. Add `@vercel/blob`. Document `BLOB_READ_WRITE_TOKEN` in `.env.example` with a comment that the store is a public Vercel Blob store and the value stays out of git. Missing token fails this route only.

#### 4. Mutations

**File**: `src/lib/photo-actions.ts` (new), called from `src/lib/spot-actions.ts` where a session or spot is created or deleted

**Intent**: Attach, feature, and delete under the rules agreed in planning, including the create form and the existing session delete.

**Contract**: Every mutation calls `getSession()` and redirects to login with a same-origin `callbackUrl` when there is no session. A blob URL is accepted only after `head()` shows it is in this store, its pathname starts with the current user's prefix for that kind, and its content type and size are inside the token rules. Anything else returns an error and writes nothing.

- `addSessionPhoto(eventId, url)` inserts a `session_photo` for any existing event, including one whose `ends_at` is in the past. `featured` starts false. Uploader is the current user.
- `deleteSessionPhoto(photoId)` reads the pathname and deletes the row only when `uploader_id` is the current user, then deletes the blob. A featured row disappears from the gallery with the row delete. A failed blob delete leaves an orphan and does not restore the row.
- `addSpotPhoto(spotId, url)` inserts a `spot_photo` only when `spot.creator_id` is the current user.
- `deleteSpotPhoto(photoId)` reads the pathname and deletes the row only when the current user is that spot's creator, then deletes the blob. A failed blob delete leaves an orphan and does not restore the row.
- `featureSessionPhoto(photoId)` sets `featured` true only when the current user created the spot of that photo's event. It does not copy the blob.
- `unfeatureSessionPhoto(photoId)` sets `featured` false under the same owner check and leaves the session photo in place.
- `createSession` accepts repeated `sessionPhotoUrl` and `spotPhotoUrl` fields. It verifies every URL before it writes. Spot URLs are allowed only when this submit creates the spot, or when the selected spot's creator is the current user. On success the same transaction inserts the event and the photo rows. One bad URL returns an error and inserts neither the session nor the photos.
- `deleteSession` loads photo pathnames, deletes those rows, then deletes the event, in one transaction. When it also deletes the spot, it deletes that spot's `spot_photo` rows in the same transaction before the spot row. Blob deletes run after the commit. A blob-delete failure leaves orphans and does not restore the session.

Tests live next to these modules, in the same style as `src/lib/spot-actions.test.ts`: mock `getSession`, `getDb`, and the blob client. Assert that a forbidden call does not insert or delete. Do not assert Polish copy. Do not call the network. The existing `deleteSession` transaction mock must resolve a photo select to an empty list. Update its `del` call-count assertions when photo deletes are added, so the current success cases stay green.

### Success Criteria:

#### Automated Verification:

- `npm run db:generate` produces a new `0003_*` migration that creates `session_photo` and `spot_photo` only
- `npm run db:migrate` applies on a database that already has `0000`–`0002`
- `npm run test:run` covers logged-out rejection, another user's URL, non-owner spot upload, feature across a different spot, author delete of a featured photo, owner unfeature, finished-session add, and `deleteSession` removing photo rows before the event
- `npm run lint` passes
- `npx tsc --noEmit` passes

#### Manual Verification:

- After migrate, existing login and an existing session page still load
- `BLOB_READ_WRITE_TOKEN` is present in `.env.local` from a public Blob store whose Development, Preview, and Production environments are connected. The token is not committed

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Public pages

### Overview

Visitors can see each list on its own URL. Upload controls wait until the next phase.

### Changes Required:

#### 1. Session page

**File**: `src/app/sesja/[id]/page.tsx`

**Intent**: Show this session's photos under the place, and send the visitor to the place page.

**Contract**: The page file still does not contain `getSession`. It loads `loadSessionPhotos` for this event. When the list is non-empty, render a `Zdjęcia` section of `<img>` elements whose `src` is `blob_url` and whose `alt` is `Zdjęcie`. When the list is empty, render no image and no heading. The place value links to `/miejsce/<spotId>`. The query that already loads the session must also select `spot.id`. Unknown event ids still `notFound()`. Phase 3 moves this list into a server child. Until then, the page renders it.

#### 2. Spot page

**File**: `src/app/miejsce/[id]/page.tsx` (new)

**Intent**: Give the spot a public page that shows the gallery and the place.

**Contract**: Public. Not added to the proxy matcher. The page file does not contain `getSession`. Unknown id calls `notFound()`. Show the place name or the five-decimal coordinates, the same OpenStreetMap link the session page builds, and `loadSpotGallery`. Empty gallery renders no photo block. Title uses the place name when it exists. `src/app/public-get-session-imports.test.ts` gains the same `getSession` absence check for this file and keeps the check on `src/app/sesja/[id]/page.tsx`. Phase 3 moves the gallery into a server child. Until then, the page renders it.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` passes, including the structural check that `src/app/sesja/[id]/page.tsx` and `src/app/miejsce/[id]/page.tsx` do not contain `getSession`
- `npm run lint` passes
- `npx tsc --noEmit` passes

#### Manual Verification:

- A session with only session photos shows them on `/sesja/[id]` and does not show them on `/miejsce/[id]` until one is featured
- A featured photo and an owner spot photo show on `/miejsce/[id]` and do not appear on a different session at that spot
- A session with no photos has no photo heading and no image
- The place link on the session opens `/miejsce/[id]`
- `/` still shows time and place and no image

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: Add and manage

### Overview

Logged-in users add and remove photos from the pages they already have, including the create form and finished sessions.

### Changes Required:

#### 1. Session controls

**File**: `src/app/sesja/[id]/SessionPhotos.tsx` (server) and `src/app/sesja/[id]/SessionPhotoUpload.tsx` (client)

**Intent**: Let any logged-in user add a photo, and let the uploader delete their own, without taking the public page down when session lookup fails.

**Contract**: The page stops rendering its own `<img>` list and renders `SessionPhotos` instead. `SessionPhotos` is a server component. It calls `loadChromeSession` and renders the `Zdjęcia` list. No user: images only, no upload, no delete. A user: render `SessionPhotoUpload`, and render `Usuń zdjęcie` as a server-action form only on rows whose `uploader_id` is that user. `SessionPhotoUpload` is a client component. It shows `Dodaj zdjęcie` (`accept="image/jpeg,image/png,image/webp"`, multiple), uploads each file with `upload()` from `@vercel/blob/client` to `/api/blob/upload` as kind `session`, then calls `addSessionPhoto`. The same controls show for a finished session. The page file still does not contain `getSession`. One file must not both call `loadChromeSession` and `upload()`.

#### 2. Spot controls

**File**: `src/app/miejsce/[id]/SpotPhotos.tsx` (server) and `src/app/miejsce/[id]/SpotPhotoUpload.tsx` (client)

**Intent**: Let the owner maintain the gallery and feature session photos. Visitors still see only the gallery.

**Contract**: The page stops rendering its own gallery and renders `SpotPhotos` instead. `SpotPhotos` is a server component. It calls `loadChromeSession` and renders the gallery images. `SpotPhotoUpload` is the client child that calls `upload()`. When the user is `spot.creator_id`, show `SpotPhotoUpload` with `Dodaj zdjęcie miejsca` (kind `spot`, then `addSpotPhoto`), `Usuń zdjęcie` as a server-action form on each `spot_photo`, `Usuń ze strony miejsca` on each featured session photo, and the `Zdjęcia z sesji` list from `loadUnfeaturedSessionPhotos` with `Pokaż na stronie miejsca`. Anyone else sees the gallery images only, with no picker and no owner buttons. The page file still does not contain `getSession`. One file must not both call `loadChromeSession` and `upload()`.

#### 3. Create form

**File**: `src/app/spot/page.tsx`, `src/lib/spot-pin.ts`, `src/app/spot/SpotForm.tsx`, and `src/app/spot/SpotWorkspace.tsx`

**Intent**: Attach photos in the same publish action that creates the session.

**Contract**: `SpotPin` gains `creatorId`. The `/spot` select returns it, and the page passes the current user id into the form. The publisher can pick session photos on every publish. They can pick spot photos only when the pin is new or `creatorId` is that user id. Files upload before submit, as the matching kind, and the returned URLs are submitted as repeated `sessionPhotoUrl` and `spotPhotoUrl` fields. A rejected file or a failed upload shows a Polish error and does not publish. Publishing with no files stays valid. The spot-photo input is absent when the user does not own the selected spot.

### Success Criteria:

#### Automated Verification:

- `npm run test:run` passes
- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm run build` passes with `BLOB_READ_WRITE_TOKEN` unset

#### Manual Verification:

- On a phone-width viewport, a logged-in user adds a JPEG to an existing session and sees it on that session page only
- The same user adds a photo to a session whose end is in the past
- A second account cannot delete the first user's photo, and the first user can
- The spot owner features that photo and the visitor sees it on `/miejsce/[id]` and not on the session's photo list as a second copy
- The author deletes it, and it disappears from both pages
- The owner uploads a place photo, sees it on the spot page, and deletes it
- A non-owner publishing at that spot can attach a session photo and cannot attach a place photo
- A new pin published with one session photo and one place photo lands on the session page and the new spot page with the right list on each
- A HEIC or an oversize file is refused and no row appears
- Logged-out `/sesja/[id]` and `/miejsce/[id]` still show their photos and no upload button

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- Token helper: no session rejects; each kind forces its own pathname prefix; other types and sizes are not in the returned options
- `head()` mismatch, another user's prefix, and the wrong kind write nothing
- Non-owner `addSpotPhoto`, `featureSessionPhoto`, and `deleteSpotPhoto` write nothing
- Author `deleteSessionPhoto` on a featured row removes that row
- Owner `unfeatureSessionPhoto` leaves the row with `featured` false
- `addSessionPhoto` on an event with `ends_at` in the past inserts
- Query helpers return the session list and the gallery as different sets

### Integration Tests:

- `createSession` with a bad spot URL for a spot the user does not own inserts neither event nor photo
- `createSession` with verified URLs inserts the event and the photos in one transaction
- `deleteSession` deletes photo rows before the event, and spot photos before the spot when the spot goes too

### Manual Testing Steps:

1. Create a public Blob store and pull `BLOB_READ_WRITE_TOKEN` into `.env.local`.
2. Publish a session with no photos and confirm both pages have no photo block.
3. Add a session photo, feature it, delete it, and watch both URLs.
4. Repeat the add on a finished session and as a second user.
5. Confirm `/` has no images and a logged-out visit still shows photos.

## Performance Considerations

Public pages must not wait on Blob token generation. Image bytes are not optimized by Next, so a large JPEG costs the visitor's connection and Blob transfer, not the Hobby image-transform quota. The home page stays free of photo queries so the existing 2-second first paint is unchanged.

## Migration Notes

`0003` is additive. Existing spots and sessions have empty lists, which is the defined empty state. Rollback of the app does not delete Blob objects or undo the migration. A down migration is not part of this slice.

## References

- Roadmap S-02: `context/foundation/roadmap.md`
- FR-003 and the photo NFR: `context/foundation/prd.md`
- Blob and Hobby image cap: `context/foundation/infrastructure.md`
- Fail-open chrome: `context/foundation/lessons.md`
- Client uploads: https://vercel.com/docs/vercel-blob/client-upload
- Write-gate pattern: `src/lib/spot-actions.ts`
- Public-page structural test: `src/app/public-get-session-imports.test.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Photo records and rules

#### Automated

- [x] 1.1 `npm run db:generate` produces a new `0003_*` migration that creates `session_photo` and `spot_photo` only
- [x] 1.2 `npm run db:migrate` applies on a database that already has `0000`–`0002`
- [x] 1.3 `npm run test:run` covers logged-out rejection, another user's URL, non-owner spot upload, feature across a different spot, author delete of a featured photo, owner unfeature, finished-session add, and `deleteSession` removing photo rows before the event
- [x] 1.4 `npm run lint` passes
- [x] 1.5 `npx tsc --noEmit` passes

#### Manual

- [x] 1.6 After migrate, existing login and an existing session page still load
- [x] 1.7 `BLOB_READ_WRITE_TOKEN` is present in `.env.local` from a public Blob store whose Development, Preview, and Production environments are connected. The token is not committed

### Phase 2: Public pages

#### Automated

- [ ] 2.1 `npm run test:run` passes, including the structural check that `src/app/sesja/[id]/page.tsx` and `src/app/miejsce/[id]/page.tsx` do not contain `getSession`
- [ ] 2.2 `npm run lint` passes
- [ ] 2.3 `npx tsc --noEmit` passes

#### Manual

- [ ] 2.4 A session with only session photos shows them on `/sesja/[id]` and does not show them on `/miejsce/[id]` until one is featured
- [ ] 2.5 A featured photo and an owner spot photo show on `/miejsce/[id]` and do not appear on a different session at that spot
- [ ] 2.6 A session with no photos has no photo heading and no image
- [ ] 2.7 The place link on the session opens `/miejsce/[id]`
- [ ] 2.8 `/` still shows time and place and no image

### Phase 3: Add and manage

#### Automated

- [ ] 3.1 `npm run test:run` passes
- [ ] 3.2 `npm run lint` passes
- [ ] 3.3 `npx tsc --noEmit` passes
- [ ] 3.4 `npm run build` passes with `BLOB_READ_WRITE_TOKEN` unset

#### Manual

- [ ] 3.5 On a phone-width viewport, a logged-in user adds a JPEG to an existing session and sees it on that session page only
- [ ] 3.6 The same user adds a photo to a session whose end is in the past
- [ ] 3.7 A second account cannot delete the first user's photo, and the first user can
- [ ] 3.8 The spot owner features that photo and the visitor sees it on `/miejsce/[id]` and not on the session's photo list as a second copy
- [ ] 3.9 The author deletes it, and it disappears from both pages
- [ ] 3.10 The owner uploads a place photo, sees it on the spot page, and deletes it
- [ ] 3.11 A non-owner publishing at that spot can attach a session photo and cannot attach a place photo
- [ ] 3.12 A new pin published with one session photo and one place photo lands on the session page and the new spot page with the right list on each
- [ ] 3.13 A HEIC or an oversize file is refused and no row appears
- [ ] 3.14 Logged-out `/sesja/[id]` and `/miejsce/[id]` still show their photos and no upload button
