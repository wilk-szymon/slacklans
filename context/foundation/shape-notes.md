---
project: Slacklans
context_type: greenfield
created: 2026-08-25
updated: 2026-08-25
product_type: web-app
target_scale:
  users: medium
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-09-14
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: pain category
      decision: coordination overhead + missing capability
    - topic: insight
      decision: build for own community/city/language; existing products are spots maps without schedules
    - topic: primary persona
      decision: slackliner who already sessions
    - topic: cost today
      decision: verbal directions, then they walk away
    - topic: project name
      decision: Slacklans
    - topic: community
      decision: Gdynia, Polish
    - topic: auth strategy
      decision: login required to share (email + password); public can view spots and schedules with no account
    - topic: role model
      decision: flat — no admin/member/guest split; unauthenticated visitors look up; logged-in slackliner adds spots, posts times, bookmarks; only the creator can edit a spot or event
    - topic: mvp scope
      decision: first ship 2026-09-14 (~3 weeks after-hours). Map + photos stay. Out of this ship: confirm-tag (FR-018), same-time tie-break ranking, independent spots catalog (FR-017). Original 4-week full flow was cut to hit the date.
    - topic: secondary success
      decision: passerby finds a session from the app name alone, no personal link
    - topic: guardrails
      decision: visitors see time and location with no account; shared pages do not demand extra personal data; skill level stays optional; users cannot edit a spot or event they did not create
    - topic: ranking rule
      decision: 14.09 ship highlights the soonest upcoming event by start time. Same-time tie-break (confirmed, more information, spot/organizer history) waits. One highlight plus a list, shown on opening the app.
    - topic: product framing
      decision: web app; dozens to a hundred users; ranking rule unchanged at 100×; hard deadline 2026-09-14; after-hours
    - topic: non-goals
      decision: not other cities/languages; not a native mobile app; not offline-first; confirm-tag, same-time tie-break, and spots-catalog out of 14.09 ship
  frs_drafted: 18
  quality_check_status: accepted
---

# Shape notes

Seed idea (verbatim): a slacklans web app that allows users to share slackline spots and schedules

## Vision & Problem Statement

People who do slackline sessions are often approached by random interested people who want to know more and experience it for the first time. The slackliner has nothing durable to hand them — today they give verbal directions, then the person walks away. The same gap shows up when telling friends where and when a meetup is, and when bookmarking spots for the next season for yourself.

Existing tools are spots maps without schedules. Slacklans is for the Gdynia slackline scene, in Polish, so a passerby, a friend, or next-season-you can look up where and when to join. At 100× this user count the ranking rule does not change.

## User & Persona

Primary: the slackliner who already sessions. They share spots and times, hand the app name to passersby, tell friends about a meetup, and bookmark spots for next season. The moment they reach for this product is during a session, when a stranger walks up and wants to try it.

### Secondary persona

- First-timer / passerby who wants to try slacklining and find where and when they can join.
- Friend of a slackliner looking up a specific meetup.
- Next-season-you remembering last year's spots.

These wait; the MVP serves the primary.

## Success Criteria

### Primary

- A logged-in slackliner creates a spot by picking a place on the map (or picks an existing spot), creates a single event with that spot, start and finish time, and photos, then shares the event page URL.
- A visitor opening that link sees a clear view of the event time and location.
- A passerby who only has the app name can find a session (where and when) without a personal link.

### Secondary

- A passerby finds a session from the app name alone, with no personal link. (Also promoted to must-have as FR-012 — treat as primary-path capability.)

### Guardrails

- Visitors see time and location with no account.
- Shared pages do not demand extra personal data from the visitor.
- Skill level stays optional.
- Users cannot edit a spot or event they did not create.

## Timeline acknowledgment

Acknowledged on 2026-08-25: 4-week MVP requires sustained dedication; user accepted.
Acknowledged on 2026-08-25: hard deadline 2026-09-14 wins; scope cut to fit (~3 weeks). Confirm-tag, same-time tie-break ranking, and independent spots catalog are out of this ship.

## User Stories

### US-01: Slackliner creates a spot and event, then shares it

- **Given** a logged-in slackliner
- **When** they create a spot by picking a place on the map (or pick an existing spot), create a single event with that spot, start and finish time, and photos, and share the event page URL
- **Then** a visitor opening the link sees a clear view of the event time and location with no account

#### Acceptance Criteria

- Description is not required
- Skill level is not required
- Visitors do not need an account or extra personal data
- Only the creator can edit the spot or event
- Recurring events are out of this story

### US-02: Passerby opens the app and sees what is next

- **Given** a passerby who has the app name and no account
- **When** they open the app
- **Then** they see the next upcoming event highlighted (soonest start time) with time and location

#### Acceptance Criteria

- No account and no extra personal data
- Highlight is the soonest start; same-time tie-break ranking is out of this ship

## Functional Requirements

### Authentication

- FR-001: Slackliner can log in. Priority: must-have
  > Socrates: Counter-argument considered: a create-link without an account, or cutting auth to save the 4-week budget. Resolution: stands as written.

### Spots

- FR-002: Slackliner can create a new spot by selecting a place on the map. Priority: must-have
  > Socrates: Counter-argument considered: "spot and event should be one step." Resolution: one UX flow, but spots stay separate so people can view spots only and pick an existing spot for new events instead of setting the same place each time.
- FR-003: Slackliner can add photos to a spot. Priority: must-have
  > Socrates: Counter-argument considered: photos are not needed to prove time + location; photos belong on the event not the spot. Resolution: stands as written.
- FR-017: User can view spots independently of events. Priority: nice-to-have
  > Socrates: Counter-argument considered: spots-only view is a second product; spots without events recreate existing maps. Resolution: demoted to nice-to-have to hit 2026-09-14.

### Events

- FR-004: Slackliner can create a new single event. Priority: must-have
  > Socrates: Counter-argument considered: recurrence is calendar-hard; single events prove the product. Resolution: MVP is single events only; recurrence demoted to FR-016 nice-to-have.
- FR-005: Slackliner can select a spot for the event. Priority: must-have
  > Socrates: Counter-argument considered: if spots merge into events this FR disappears; events should pin a map place directly. Resolution: stands as written — pick from existing spots (aligned with FR-002).
- FR-006: Slackliner can set the session start and finish time. Priority: must-have
  > Socrates: Counter-argument considered: date-without-clock, or free-text time, would be enough. Resolution: start and finish time shall be provided. FR strengthened.
### Sharing and visiting

- FR-009: Slackliner can get a dedicated sharing-link action for the event. Priority: nice-to-have
  > Socrates: Counter-argument considered: OS share sheets / copy-URL are enough without a product 'get link' action. Resolution: dropped from MVP. The event page URL is the share link. FR-010 covers the visitor.
- FR-010: Visitor can see a clear view of the event time and location with no account and without extra personal data. Priority: must-have
  > Socrates: Counter-argument considered: public pages found by uninvited people; exact location as a safety problem. Resolution: stands as written.
- FR-012: Passerby can find a session from the app name alone, without a personal link. Priority: must-have
  > Socrates: Counter-argument considered: demoting this leaves only a private URL tool, so the walk-up story dies. Resolution: promoted to must-have.

### Editing

- FR-011: User can edit a spot or event only if they created it. Priority: must-have
  > Socrates: Counter-argument considered: someone else must fix a stale event if the creator disappears. Resolution: creator-only edit stays. Confirm-tag (FR-018) waits — ghost sessions accepted for the 14.09 ship.
- FR-018: Creator can set a confirmed tag on their event only in the week before start time; after two consecutive unconfirmed events, those events are hidden. Priority: nice-to-have
  > Socrates: Counter-argument considered: someone else must fix stale events if the creator disappears. Resolution: rule stands for later; demoted to nice-to-have to hit 2026-09-14.

### Nice-to-have

- FR-007: Slackliner can add a description to the event. Priority: nice-to-have
  > Socrates: Counter-argument considered: time and location are enough; description is nice-to-have. Resolution: demoted to nice-to-have.
- FR-008: Slackliner can set an optional skill level on the event. Priority: nice-to-have
  > Socrates: Counter-argument considered: if it is optional it is not an MVP FR. Resolution: demoted to nice-to-have.
- FR-013: User can favorite spots and events. Priority: nice-to-have
  > Socrates: Counter-argument considered: Gdynia will not have enough spots for favorites to matter; or promote because next-season-you was in the vision. Resolution: stands as written (nice-to-have).
- FR-014: User can rate spots and events and leave comments. Priority: nice-to-have
  > Socrates: Counter-argument considered: ratings will be personal drama in a small scene; or promote because recommended spots were in the seed pain. Resolution: stands as written (nice-to-have).
- FR-015: User can add photos to a recently happened event. Priority: nice-to-have
  > Socrates: Counter-argument considered: videos are a different expensive product. Resolution: videos deprioritized; consider embedding from YouTube if that is easier. Photos after the event stay nice-to-have.
- FR-016: Slackliner can create a recurring event. Priority: nice-to-have
  > Socrates: Counter-argument considered: recurrence will go stale even later; or promote back because weekly park sessions are the real schedule. Resolution: stands as written (nice-to-have).

## Non-Functional Requirements

- A visitor or slackliner who opens the app sees the highlighted next event within 2 seconds, including with no account.
- A passerby at a session can use the app on a phone outdoors.
- The UI is in Polish.
- Spot photos are visible on the event and the spot — not broken placeholders.

## Business Logic

The app highlights the next upcoming event by soonest start time.

For the 14.09.2026 ship the only ranking input is when the event starts. The output is one highlighted next event plus a list in the same order. A passerby or slackliner encounters it on opening the app — the first thing they see.

A later rule (out of this ship) tie-breaks events that share the same time by most probable: confirmed, more information, spot/organizer history of past sessions, then likes, participants, and favorites.

## Access Control

Public read, login to share. Anyone can look up spots and schedules with no account. The slackliner logs in to add spots, post session times, and bookmark spots.

Flat user model — no admin / member / guest roles. Login is email + password. Unauthenticated visitors can view; write actions require login. Users cannot edit a spot or event they did not create.

## Non-Goals

- Other cities and other languages — this MVP is Gdynia, Polish only.
- Native mobile app / app-store listing — phone-usable website only.
- Offline-first / use with no network in the park — the passerby is assumed to have a connection when they open the app.
- Confirm-tag and hiding two unconfirmed events — out of the 14.09.2026 ship (FR-018 is nice-to-have).
- Same-time tie-break ranking (history, more information, engagement) — out of this ship; first screen is next-by-time only.
- Independent spots catalog (view spots with no event) — out of this ship (FR-017 is nice-to-have).

## Open Questions

None at capture time.

## Quality cross-check

All six required elements present (greenfield). No gaps recorded.

- Access Control: present
- Business Logic: present (one-sentence rule)
- Project artifacts: present
- Timeline-cost ack: present
- Non-Goals: present
- Preserved behavior: n/a (greenfield)

## Forward: tech-stack

- Videos on events are deprioritized. If video appears later, consider embedding from YouTube if that is easier.
