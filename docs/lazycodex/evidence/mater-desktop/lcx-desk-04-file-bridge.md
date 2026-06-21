# LCX-DESK-04 File Bridge Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P4 picker-only file bridge, backend precheck, audit mapping, no silent scan, and temp cache wipe
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P4 file bridge progress only. It does not claim production go-live, public release, owner approval, or broad filesystem authority.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P4-W01-T01 | complete | `contracts/desktop-file-bridge-contract.json`, `scripts/validate-desktop-file-bridge-contract.mjs` |
| MDT-P4-W01-T02 | complete | `apps/desktop/src/main/fileBridge.js`, `apps/desktop/src/preload/fileBridge.js`, `apps/desktop/test/file-picker-gesture.test.mjs` |
| MDT-P4-W01-T03 | complete | `docs/desktop/mater-desktop-file-bridge-audit-map.md`, `apps/desktop/src/main/fileBridge.js` |
| MDT-P4-W01-T04 | pending | not started |
| MDT-P4-W02-T01 | pending | not started |
| MDT-P4-W02-T02 | pending | not started |
| MDT-P4-W02-T03 | pending | not started |
| MDT-P4-W02-T04 | pending | not started |
| MDT-P4-W02-T05 | pending | phase terminal not reached |

## MDT-P4-W01-T01 - Finalize Desktop File Bridge Contract

Plan:

- Add the desktop file bridge contract before implementation.
- Allow only `choose_file_for_upload`, `save_document_as`, `open_temp_preview`, and `clear_temp_cache`.
- Keep implementation, production readiness, public release, and owner approval claims false.

Do:

- Added `contracts/desktop-file-bridge-contract.json`.
- Added `scripts/validate-desktop-file-bridge-contract.mjs`.

Check:

```bash
node scripts/validate-desktop-file-bridge-contract.mjs
git diff --check -- contracts/desktop-file-bridge-contract.json scripts/validate-desktop-file-bridge-contract.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-04-file-bridge.md
```

Results:

- Contract validator passed.
- The allowed action set is exact.
- Forbidden filesystem authority is recorded as out of scope.
- `git diff --check` passed.

Act:

- `MDT-P4-W01-T01` is complete.
- Next TUW is `MDT-P4-W01-T02`.

## MDT-P4-W01-T02 - Implement User Gesture File Picker Guard

Plan:

- Add a main-process file picker guard that refuses silent file selection.
- Add a preload bridge with an explicit IPC allowlist and trusted event gate.
- Test that the native picker is not called without a user gesture.

Do:

- Added `apps/desktop/src/main/fileBridge.js`.
- Added `apps/desktop/src/preload/fileBridge.js`.
- Added `apps/desktop/test/file-picker-gesture.test.mjs`.

Check:

```bash
node apps/desktop/test/file-picker-gesture.test.mjs
git diff --check -- apps/desktop/src/main/fileBridge.js apps/desktop/src/preload/fileBridge.js apps/desktop/test/file-picker-gesture.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-04-file-bridge.md
```

Results:

- File picker gesture tests passed.
- Picker is not invoked when `userGesture` is absent.
- Preload file bridge source exposes only the allowlisted trusted gesture command.
- `git diff --check` passed.

Act:

- `MDT-P4-W01-T02` is complete.
- Next TUW is `MDT-P4-W01-T03`.

## MDT-P4-W01-T03 - Add Backend Precheck and Audit Mapping

Plan:

- Document upload, download, and save-as permission precheck requirements.
- Add main-process audit event mapping for file bridge paths.
- Ensure file picker selection cannot happen before backend permission precheck succeeds.

Do:

- Added `docs/desktop/mater-desktop-file-bridge-audit-map.md`.
- Updated `apps/desktop/src/main/fileBridge.js`.
- Updated the gesture test adapter to provide an allowed backend permission precheck.

Check:

```bash
rg -n "permission precheck|audit|upload|download|save-as" docs/desktop/mater-desktop-file-bridge-audit-map.md apps/desktop/src/main/fileBridge.js
node apps/desktop/test/file-picker-gesture.test.mjs
git diff --check -- docs/desktop/mater-desktop-file-bridge-audit-map.md apps/desktop/src/main/fileBridge.js apps/desktop/test/file-picker-gesture.test.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-04-file-bridge.md
```

Results:

- File bridge audit grep passed.
- Gesture tests still passed with injected backend permission precheck.
- Upload/download/save-as audit event mapping is present.
- `git diff --check` passed.

Act:

- `MDT-P4-W01-T03` is complete.
- Next TUW is `MDT-P4-W01-T04`.
