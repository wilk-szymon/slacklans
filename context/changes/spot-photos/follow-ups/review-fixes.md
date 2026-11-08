# Review fixes — spot-photos

Fixes queued from `reviews/impl-review.md` (2026-11-01). Each is delegated to a GitHub issue under the tracking issue wilk-szymon/slacklans#1. The four issues own disjoint files, so they run in parallel.

| Issue | Findings | Owned files |
|---|---|---|
| wilk-szymon/slacklans#2 | F1, F2, F10 | `src/lib/schema/spots.ts`, `drizzle/0004_*`, `drizzle/meta/*`, `src/lib/spot-actions.ts`, and its test |
| wilk-szymon/slacklans#3 | F7, F9 | `src/lib/photo-actions.ts`, the upload route, `SessionPhotos.tsx`, `SpotPhotos.tsx`, and their tests |
| wilk-szymon/slacklans#4 | F3, F4, F8 | `src/components/PhotoUploadField.tsx`, `SessionPhotoUpload.tsx`, `SpotPhotoUpload.tsx`, `SpotForm.tsx`, `src/app/photo-controls.test.ts` |
| wilk-szymon/slacklans#5 | F5 | `README.md` |

Accepted without a code change: F6, and the serial `head()` part of F10.

After merge, a human still needs to:
- apply `0004_*` with `npm run db:migrate`;
- run the Phase 3 manual checks 3.5–3.14.

Then re-run `/10x-impl-review spot-photos` and `/10x-archive spot-photos`.
