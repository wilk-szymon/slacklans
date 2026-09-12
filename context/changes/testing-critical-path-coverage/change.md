---
change_id: testing-critical-path-coverage
title: Critical-path coverage
status: impl_reviewed
created: 2026-09-09
updated: 2026-09-09
archived_at: null
---

## Notes

Open a change folder for rollout Phase 1 of context/foundation/test-plan.md: "Critical-path coverage".
Risks covered: #1 (secret leakage), #2 (unauthenticated write), #3 (public pages die when session lookup throws). Test types planned: unit + integration.
Risk response intent: secrets stay off the wire; writes require a live session; public pages survive auth failure.
After creating the folder, follow the downstream continuation rule.
