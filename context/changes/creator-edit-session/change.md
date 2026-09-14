---
change_id: creator-edit-session
title: Creator edit session
status: implementing
created: 2026-09-14
updated: 2026-09-14
archived_at: null
---

## Notes

S-04 / FR-011. Event creator can change start/finish or delete their session only while `ends_at > now`. Logged-out → login; other user → 403. After delete, drop the pin if no events remain and `spot.creator_id` is the current user. Entry: chrome “Moje sesje” (`/moje`) → `/sesja/[id]/edytuj`. Public `/sesja/[id]` stays session-free. No spot name/place editor.
