<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Spot and session photos

- **Plan**: context/changes/spot-photos/plan.md
- **Scope**: Phase 3 of 3 (full plan; Phase 3 manual checks 3.5–3.14 still pending)
- **Date**: 2026-11-01
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical 5 warnings 5 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | WARNING |
| Scope Discipline | WARNING |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | WARNING |
| Success Criteria | PASS |

## Success criteria evidence

- `npm run test:run` — PASS (16 files, 90 tests)
- `npm run lint` — PASS
- `npx tsc --noEmit` — PASS once `next build` has generated `next-env.d.ts` and route types (a fresh clone reports `PageProps`/`LayoutProps` and leaflet PNG module errors before that)
- `npm run build` with `BLOB_READ_WRITE_TOKEN` unset — PASS. It still needs `DATABASE_URL`, because `src/lib/db.ts` throws when `src/lib/auth.ts` loads. That predates this change (`0a232ff`).
- Manual 3.5–3.14 — pending. They need a real Neon database and a public Blob store. Phases 1–2 manual are checked.

## Findings

### F1 — Same blob can be attached many times; deleting one row breaks the rest

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/lib/schema/spots.ts:34-59, src/lib/photo-actions.ts:42-69, src/lib/photo-actions.ts:134-151, src/lib/spot-actions.ts:42-47
- **Detail**: Neither `session_photo.pathname` nor `spot_photo.pathname` is unique. Several actions accept a URL that is already attached: `addSessionPhoto` called twice, the same URL on two events, the same URL repeated in `sessionPhotoUrl` on publish, or a re-pick after a partial failure (F4). All of them succeed. `deleteSessionPhoto`, `deleteSpotPhoto` and `deleteSession` then `del()` the shared pathname, and every other row points at a missing file. The plan's state-sequencing rule says "the page never keeps an `<img>` aimed at a missing file".
- **Fix A ⭐ Recommended**: Add a unique index on `pathname` in both tables (new `drizzle/0004_*` via `npm run db:generate`), dedupe `urlList`, and map the unique-violation insert error to `PHOTO_SAVE_ERROR`.
  - Strength: The database enforces it for every path, including concurrent double-submits. The inserts already sit in `try/catch` that returns `PHOTO_SAVE_ERROR`.
  - Tradeoff: Adds a migration to an otherwise-finished slice. The index fails if prod already holds duplicates (unlikely before launch).
  - Confidence: HIGH — additive index, existing error path.
  - Blind spot: Have not checked whether prod already has duplicate rows.
- **Fix B**: App-level `select … where pathname = ?` before each insert.
  - Strength: No migration.
  - Tradeoff: Racy under double-submit, and needs a check in three places.
  - Confidence: MED — covers the UI paths, not concurrent calls.
  - Blind spot: Concurrent tabs.
- **Decision**: PENDING

### F2 — `deleteSession` can delete photos and keep the event

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/spot-actions.ts:388-422
- **Detail**: `tx.delete(sessionPhoto).where(eq(sessionPhoto.eventId, eventId))` runs with no gate. The guarded event delete (`creatorId` and `endsAt > now`) can then match 0 rows if the session ends or is edited between the pre-check and the transaction. The transaction still commits. Every session photo, other users' included, and its blob is permanently gone, the event stays, and the user is redirected to `/moje` as if it worked.
- **Fix**: Add `.returning({ id: event.id })` to the event delete and throw inside the transaction when it is empty, so the photo delete rolls back. Return `SAVE_ERROR`, and add a test for the 0-row case.
- **Decision**: PENDING

### F3 — Publish form re-uploads every file after a server-side validation error

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: src/app/spot/SpotForm.tsx:69-90
- **Detail**: Files upload before `createSession` runs. When the action returns `TIME_ORDER`, `PLACE_ERROR`, `COORDS_ERROR` or `SAVE_ERROR`, each resubmit uploads all files again (up to 8 MiB each). Each failed try leaves orphan blobs, and the plan has no cleanup job.
- **Fix**: Cache uploaded URLs in a ref keyed by kind+name+size+lastModified and reuse them on resubmit. Also check start < finish on the client before uploading.
  - Strength: Removes repeat transfer and orphans in the most common error loop, a mistyped time.
  - Tradeoff: Small amount of client state; the cache must be cleared when the file inputs change.
  - Confidence: HIGH — the form is client-only and the URLs stay valid.
  - Blind spot: Not measured how often users hit server-side errors.
- **Decision**: PENDING

### F4 — Partial multi-file failure leaves the picker dirty and re-attaches files

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/sesja/[id]/SessionPhotoUpload.tsx:38-55, src/app/miejsce/[id]/SpotPhotoUpload.tsx:38-55
- **Detail**: When file k fails, files 1..k-1 are already attached, but `input.value = ""` runs only on full success. Re-picking the same selection either does not fire `change`, or attaches files 1..k-1 a second time (see F1).
- **Fix**: Clear the input in `finally`. F1's unique index then makes any repeat attach fail cleanly.
- **Decision**: PENDING

### F5 — README rewritten outside plan scope and already stale

- **Severity**: ⚠️ WARNING
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Scope Discipline
- **Location**: README.md (rewritten in c8c5664)
- **Detail**: The plan asked only for a `.env.example` entry, which is done. The README rewrite has no `BLOB_READ_WRITE_TOKEN` row in its env table, no `/miejsce/[id]` route, no photo features, and no `session_photo`/`spot_photo` tables.
- **Fix**: Add the token row, the `/miejsce/[id]` route, and the two tables to README.md.
- **Decision**: PENDING

### F6 — Upload pathname is validated, not server-chosen; "this store" is implicit

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Plan Adherence
- **Location**: src/lib/blob-upload.ts:163-185, src/lib/photo-blob.ts:20-47
- **Detail**: The plan says the pathname "is chosen on the server side of token generation". In `@vercel/blob` 2.8 the client sends the pathname and the SDK signs it (`client.js:252-283`), so `authorizeUpload` instead refuses any pathname outside `<kind>-photos/<userId>/`. Store membership has no hostname check; it relies on `head()` using this store's token, and the code stores `meta.url`, never the client string. Security is equivalent.
- **Fix**: Accept as documented drift; no code change.
- **Decision**: PENDING

### F7 — No-op `onUploadCompleted` registers a webhook per upload

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/app/api/blob/upload/route.ts:29-31
- **Detail**: Because the callback is defined, `handleUpload` sets a `callbackUrl`, so Vercel POSTs a signed webhook to this route after every upload. The route does nothing with it.
- **Fix**: Drop the `onUploadCompleted` option (optional in 2.8 types). That still meets the plan's "does not insert a row".
- **Decision**: PENDING

### F8 — Upload components are near-duplicates

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Pattern Consistency
- **Location**: src/app/sesja/[id]/SessionPhotoUpload.tsx, src/app/miejsce/[id]/SpotPhotoUpload.tsx
- **Detail**: The two files differ in 6 lines: the action import, the prop name, the kind, the action call, the label, and the input id. Any fix to one (F4) has to be copied into the other.
- **Fix**: Extract one `PhotoUploadField({ inputId, label, kind, attach })` client component under `src/components/`.
- **Decision**: PENDING

### F9 — Action argument hygiene and login return path

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/photo-actions.ts:35,79-80,118,161-162,199-200
- **Detail**: Exported server actions call `.trim()` on their arguments, which can be arbitrary. A non-string throws a TypeError before `requireUser`, or right after it in the delete and feature actions. The delete and feature actions also send a logged-out user to login with `callbackUrl=/` instead of the page they were on.
- **Fix**: Guard with `typeof x === "string"` like `fieldString` in spot-actions.ts.
- **Decision**: PENDING

### F10 — Serial `head()` and no FK indexes

- **Severity**: 💬 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/photo-blob.ts:49-63, src/lib/spot-actions.ts:84-114, drizzle/0003_session_spot_photos.sql
- **Detail**: `collectOwnedPhotos` awaits `head()` once per URL in sequence, and `writeEventPhotos` inserts one row at a time. There is no index on `session_photo.event_id` or `spot_photo.spot_id`; Postgres does not index FKs automatically. This is fine at Gdynia volume.
- **Fix**: If F1 adds a migration, fold the two FK indexes into it. Optionally use `Promise.all` for the `head()` calls.
- **Decision**: PENDING
