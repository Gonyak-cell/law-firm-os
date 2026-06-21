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
| MDT-P5-W01-T02 | pending | not started |
| MDT-P5-W01-T03 | pending | not started |
| MDT-P5-W01-T04 | pending | not started |
| MDT-P5-W02-T01 | pending | not started |
| MDT-P5-W02-T02 | pending | not started |
| MDT-P5-W02-T03 | pending | not started |
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
