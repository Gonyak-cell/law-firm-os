# mater Desktop Pilot QA Checklist

Status: P7 pilot QA ledger
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`
Scope: `MDT-P7-W01-T01`

## Status Legend

- Pass: automated or receipt-backed evidence exists in this branch.
- Fail: evidence shows a failing result.
- Blocked: manual receipt or external environment is missing.
- owner-risk: requires owner decision before pilot/public movement.

## QA Items

| ID | Area | Status | Evidence |
| --- | --- | --- | --- |
| QA-01 | mater branding, logo, splash | Pass | `docs/lazycodex/evidence/mater-desktop/lcx-desk-00-branding.md` |
| QA-02 | hardened desktop shell | Pass | `docs/lazycodex/evidence/mater-desktop/lcx-desk-01-shell.md` |
| QA-03 | auth/session cleanup | Pass | `docs/lazycodex/evidence/mater-desktop/lcx-desk-02-auth-session.md` |
| QA-04 | permission-trimmed workspace | Pass | `docs/lazycodex/evidence/mater-desktop/lcx-desk-03-workspace.md` |
| QA-05 | picker-only file bridge | Pass | `docs/lazycodex/evidence/mater-desktop/lcx-desk-04-file-bridge.md` |
| QA-06 | deep link parser and denylist | Pass | `docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md` |
| QA-07 | generic notification route intent | Pass | `docs/lazycodex/evidence/mater-desktop/lcx-desk-05-deeplink-notification.md` |
| QA-08 | internal packaging receipts | owner-risk | `docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md`; Windows native install smoke is not run on Darwin. |
| QA-09 | signed update and rollback | Pass | `apps/desktop/test/update-rollback.test.mjs` |
| QA-10 | SBOM/license audit | Pass | `docs/desktop/mater-desktop-license-audit.md` |
| QA-11 | pilot install/session screenshots | Blocked | `docs/lazycodex/evidence/mater-desktop/pilot-install-session.md`; manual GUI screenshots are not captured in this branch. |
| QA-12 | owner public release decision | owner-risk | Owner decision is not recorded; public release and production go-live remain false. |

## Owner Boundary

The checklist is repo-ready evidence, not owner approval. Public release, production go-live, external pilot distribution, and store publication remain false until owner receipt exists.
