# LCX-DESK-01 Shell Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P1 desktop shell skeleton, hardened window defaults, origin policy, and startup smoke
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P1 desktop shell progress only. It does not claim file bridge readiness, auth token storage readiness, signed packaging, pilot approval, production go-live, public release, or owner approval.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P1-W01-T01 | complete | `apps/desktop/package.json`, `apps/desktop/src/main/` |
| MDT-P1-W01-T02 | pending | not started |
| MDT-P1-W01-T03 | pending | not started |
| MDT-P1-W01-T04 | pending | not started |
| MDT-P1-W01-T05 | pending | terminal not reached |
| MDT-P1-W02-T01 | pending | not started |
| MDT-P1-W02-T02 | pending | not started |
| MDT-P1-W02-T03 | pending | not started |
| MDT-P1-W02-T04 | pending | not started |

## MDT-P1-W01-T01 - Create apps/desktop Package Skeleton

Plan:

- Create the desktop workspace only after P0 is closed.
- Add a minimal Electron package skeleton and `src/main/` entry point.
- Keep file bridge, auth token storage, and update channel unavailable.

Do:

- Added `apps/desktop/package.json`.
- Added `apps/desktop/src/main/main.js`.
- Updated `package-lock.json` with the new workspace and Electron package metadata via package-lock-only install.

Check:

```bash
npm view electron version
npm install --package-lock-only --workspace apps/desktop
test -f apps/desktop/package.json && rg -n "electron|nodeIntegration|contextIsolation|sandbox" apps/desktop
git diff --check -- apps/desktop/package.json apps/desktop/src/main/main.js package-lock.json
```

Results:

- Current npm registry Electron version observed: `42.4.1`.
- Package-lock-only install completed with `found 0 vulnerabilities`.
- Desktop skeleton grep passed for `electron`, `nodeIntegration`, `contextIsolation`, and `sandbox`.
- `git diff --check` passed.
- No file bridge, auth token storage, or update channel implementation was added.

Act:

- `MDT-P1-W01-T01` is complete.
- Next TUW is `MDT-P1-W01-T02`.
