# LCX-DESK-05 Deep Link and Notification Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P5 route-only deep links, denied action execution, permission/audit on open, and sensitive-safe notifications
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P5 deep link and notification progress only. It does not claim production go-live, public release, owner approval, or any link-triggered mutation authority.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P5-W01-T01 | complete | `contracts/desktop-deep-link-contract.json`, `scripts/validate-desktop-deep-link-contract.mjs` |
| MDT-P5-W01-T02 | complete | `apps/desktop/src/main/deepLinks.js`, `apps/desktop/test/deep-link-parser.test.mjs` |
| MDT-P5-W01-T03 | complete | `apps/desktop/src/main/deepLinks.js`, `apps/desktop/test/deep-link-deny.test.mjs` |
| MDT-P5-W01-T04 | complete | `apps/desktop/src/main/deepLinks.js`, `apps/desktop/test/deep-link-open-audit.test.mjs`, `docs/desktop/mater-desktop-deep-link-audit-map.md` |
| MDT-P5-W02-T01 | complete | `docs/desktop/mater-desktop-notification-policy.md` |
| MDT-P5-W02-T02 | complete | `apps/desktop/src/main/notifications.js`, `apps/desktop/test/notification-route-intent.test.mjs` |
| MDT-P5-W02-T03 | complete | `scripts/validate-mater-desktop-notification-copy.mjs` |
| MDT-P5-W02-T04 | pending | phase terminal not reached |

## MDT-P5-W01-T01 - Finalize Deep Link Contract

Plan:

- Update the desktop deep link contract to allow route intents only.
- Allow only `matter`, `document`, `task`, and `auth_callback`.
- Keep parser implementation, notification integration, production readiness, public release, and owner approval claims false.

Do:

- Updated `contracts/desktop-deep-link-contract.json`.
- Added `scripts/validate-desktop-deep-link-contract.mjs`.

Check:

```bash
node scripts/validate-desktop-deep-link-contract.mjs
git diff --check -- contracts/desktop-deep-link-contract.json scripts/validate-desktop-deep-link-contract.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md
```

Results:

- Deep link contract validator passed.
- Allowed routes are exactly `matter`, `document`, `task`, and `auth_callback`.
- Forbidden actions remain out of scope.
- `git diff --check` passed.

Act:

- `MDT-P5-W01-T01` is complete.
- Next TUW is `MDT-P5-W01-T02`.

## MDT-P5-W01-T02 - Implement Deep Link Parser

Plan:

- Add a route-only parser for `matter`, `document`, `task`, and `auth_callback`.
- Validate scheme, route type, identifier shape, and unknown query parameters.
- Keep mutation/download/upload/action execution out of parser output.

Do:

- Added `apps/desktop/src/main/deepLinks.js`.
- Added `apps/desktop/test/deep-link-parser.test.mjs`.

Check:

```bash
node apps/desktop/test/deep-link-parser.test.mjs
git diff --check -- apps/desktop/src/main/deepLinks.js apps/desktop/test/deep-link-parser.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md
```

Results:

- Deep link parser tests passed.
- Parser accepts only matter, document, task, and auth callback route intents.
- Parser rejects unsupported scheme, unsupported route type, invalid identifier shape, and unknown query parameters.
- `git diff --check` passed.

Act:

- `MDT-P5-W01-T02` is complete.
- Next TUW is `MDT-P5-W01-T03`.

## MDT-P5-W01-T03 - Deny Action Execution from Links

Plan:

- Add a deep link denylist for action execution hosts and query parameters.
- Reject mutation, download, upload, AI generation, billing write, and delivery execution links.
- Keep valid route intents route-only.

Do:

- Updated `apps/desktop/src/main/deepLinks.js`.
- Added `apps/desktop/test/deep-link-deny.test.mjs`.
- Updated parser unknown-query test to avoid overlap with the explicit action denylist.

Check:

```bash
node apps/desktop/test/deep-link-deny.test.mjs
node apps/desktop/test/deep-link-parser.test.mjs
git diff --check -- apps/desktop/src/main/deepLinks.js apps/desktop/test/deep-link-deny.test.mjs apps/desktop/test/deep-link-parser.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md
```

Results:

- Deep link deny tests passed.
- Parser tests still passed.
- Mutation, download, upload, AI generation, billing write, and delivery execution links are rejected.
- `git diff --check` passed.

Act:

- `MDT-P5-W01-T03` is complete.
- Next TUW is `MDT-P5-W01-T04`.

## MDT-P5-W01-T04 - Add Permission and Audit on Link Open

Plan:

- Add backend permission recheck for valid workspace route opens.
- Record open audit and denied audit events.
- Document deep link permission and audit mapping.
- Close only `MDT-P5-W01` because this is the work package terminal TUW.

Do:

- Updated `apps/desktop/src/main/deepLinks.js`.
- Added `apps/desktop/test/deep-link-open-audit.test.mjs`.
- Added `docs/desktop/mater-desktop-deep-link-audit-map.md`.

Check:

```bash
node apps/desktop/test/deep-link-open-audit.test.mjs
node apps/desktop/test/deep-link-parser.test.mjs
node apps/desktop/test/deep-link-deny.test.mjs
git diff --check -- apps/desktop/src/main/deepLinks.js apps/desktop/test/deep-link-open-audit.test.mjs docs/desktop/mater-desktop-deep-link-audit-map.md docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md
```

Results:

- Deep link open audit tests passed.
- Parser and deny tests still passed.
- Opening valid workspace routes rechecks backend permission and records open or denied audit.
- `git diff --check` passed.

Act:

- `MDT-P5-W01` is closed at its terminal TUW, `MDT-P5-W01-T04`.
- Next ledger TUW is `MDT-P5-W02-T01`.

## MDT-P5-W02-T01 - Define Generic Notification Policy

Plan:

- Define lock screen notification copy boundaries.
- Forbid client names, matter names, document names, snippets, sensitive deadline labels, and billing amounts.
- Keep notifications route-only.

Do:

- Added `docs/desktop/mater-desktop-notification-policy.md`.

Check:

```bash
rg -n "forbid|client names|matter names|document names|lock screen" docs/desktop/mater-desktop-notification-policy.md
git diff --check -- docs/desktop/mater-desktop-notification-policy.md docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md
```

Results:

- Notification policy grep passed.
- Policy forbids sensitive lock screen notification copy.
- `git diff --check` passed.

Act:

- `MDT-P5-W02-T01` is complete.
- Next TUW is `MDT-P5-W02-T02`.

## MDT-P5-W02-T02 - Implement Notification Click Route Intent

Plan:

- Add generic desktop notification templates.
- Convert notification clicks into route-only intents through the deep-link parser.
- Reject notification routes that attempt action execution.

Do:

- Added `apps/desktop/src/main/notifications.js`.
- Added `apps/desktop/test/notification-route-intent.test.mjs`.

Check:

```bash
node apps/desktop/test/notification-route-intent.test.mjs
node apps/desktop/test/deep-link-deny.test.mjs
git diff --check -- apps/desktop/src/main/notifications.js apps/desktop/test/notification-route-intent.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md
```

Results:

- Notification route intent tests passed.
- Deep link deny tests still passed.
- Notification click passes only the route URL through the deep-link parser.
- `git diff --check` passed.

Act:

- `MDT-P5-W02-T02` is complete.
- Next TUW is `MDT-P5-W02-T03`.

## MDT-P5-W02-T03 - Audit Notification Sensitive Text

Plan:

- Add a validator for desktop notification templates.
- Fail on sensitive placeholders for client names, matter names, document names, snippets, sensitive deadlines, and billing amounts.
- Prove the validator catches those forbidden template classes with probes.

Do:

- Added `scripts/validate-mater-desktop-notification-copy.mjs`.

Check:

```bash
node scripts/validate-mater-desktop-notification-copy.mjs
git diff --check -- scripts/validate-mater-desktop-notification-copy.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md
```

Results:

- Notification copy validator passed.
- Probes detected client names, matter names, document names, snippets, sensitive deadlines, and billing amounts.
- Current desktop notification templates have no sensitive-copy findings.
- `git diff --check` passed.

Act:

- `MDT-P5-W02-T03` is complete.
- Next TUW is `MDT-P5-W02-T04`, the P5 terminal TUW.
