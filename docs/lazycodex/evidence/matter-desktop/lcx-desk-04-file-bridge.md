# LCX-DESK-04 File Bridge Evidence

Status: P4_complete
Branch: `codex/matter-desktop-69-tuw-implementation`
Scope: P4 picker-only file bridge, backend precheck, audit mapping, no silent scan, and temp cache wipe
Source ledger: `docs/desktop/matter-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P4 file bridge progress only. It does not claim production go-live, public release, owner approval, or broad filesystem authority.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P4-W01-T01 | complete | `contracts/desktop-file-bridge-contract.json`, `scripts/validate-desktop-file-bridge-contract.mjs` |
| MDT-P4-W01-T02 | complete | `apps/desktop/src/main/fileBridge.js`, `apps/desktop/src/preload/fileBridge.js`, `apps/desktop/test/file-picker-gesture.test.mjs` |
| MDT-P4-W01-T03 | complete | `docs/desktop/matter-desktop-file-bridge-audit-map.md`, `apps/desktop/src/main/fileBridge.js` |
| MDT-P4-W01-T04 | complete | `scripts/validate-matter-desktop-file-bridge.mjs` |
| MDT-P4-W02-T01 | complete | `apps/desktop/src/main/fileBridge.js`, `apps/desktop/test/file-upload-bridge.test.mjs` |
| MDT-P4-W02-T02 | complete | `apps/desktop/src/main/fileBridge.js`, `apps/desktop/test/file-save-as.test.mjs` |
| MDT-P4-W02-T03 | complete | `apps/desktop/src/main/tempPreview.js`, `apps/desktop/test/temp-preview-cleanup.test.mjs` |
| MDT-P4-W02-T04 | complete | `apps/desktop/package.json`, `apps/desktop/test/file-bridge.test.mjs` |
| MDT-P4-W02-T05 | complete | P4 terminal closure recorded in this file |

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
git diff --check -- contracts/desktop-file-bridge-contract.json scripts/validate-desktop-file-bridge-contract.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
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
git diff --check -- apps/desktop/src/main/fileBridge.js apps/desktop/src/preload/fileBridge.js apps/desktop/test/file-picker-gesture.test.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
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

- Added `docs/desktop/matter-desktop-file-bridge-audit-map.md`.
- Updated `apps/desktop/src/main/fileBridge.js`.
- Updated the gesture test adapter to provide an allowed backend permission precheck.

Check:

```bash
rg -n "permission precheck|audit|upload|download|save-as" docs/desktop/matter-desktop-file-bridge-audit-map.md apps/desktop/src/main/fileBridge.js
node apps/desktop/test/file-picker-gesture.test.mjs
git diff --check -- docs/desktop/matter-desktop-file-bridge-audit-map.md apps/desktop/src/main/fileBridge.js apps/desktop/test/file-picker-gesture.test.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
```

Results:

- File bridge audit grep passed.
- Gesture tests still passed with injected backend permission precheck.
- Upload/download/save-as audit event mapping is present.
- `git diff --check` passed.

Act:

- `MDT-P4-W01-T03` is complete.
- Next TUW is `MDT-P4-W01-T04`.

## MDT-P4-W01-T04 - Add No Silent Scan Static Guard

Plan:

- Add a static validator for forbidden desktop file bridge filesystem authority.
- Prove the validator catches directory watch, recursive scan, arbitrary path read, arbitrary path write, and path retention patterns.
- Remove selected absolute path retention from the current file bridge state.

Do:

- Added `scripts/validate-matter-desktop-file-bridge.mjs`.
- Updated `apps/desktop/src/main/fileBridge.js` to store renderer-safe metadata, not raw absolute file paths.
- Updated `apps/desktop/test/file-picker-gesture.test.mjs` for the no-retained-path expectation.

Check:

```bash
node scripts/validate-matter-desktop-file-bridge.mjs
node apps/desktop/test/file-picker-gesture.test.mjs
git diff --check -- scripts/validate-matter-desktop-file-bridge.mjs apps/desktop/src/main/fileBridge.js apps/desktop/test/file-picker-gesture.test.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
```

Results:

- File bridge static validator passed.
- Probes detected directory watch, recursive scan, arbitrary path read, arbitrary path write, and path retention.
- Gesture tests still passed.
- `git diff --check` passed.

Act:

- `MDT-P4-W01` is closed at its terminal TUW, `MDT-P4-W01-T04`.
- Next ledger TUW is `MDT-P4-W02-T01`.

## MDT-P4-W02-T01 - Implement Choose-File-For-Upload Handler

Plan:

- Return backend upload metadata only after user gesture, backend permission precheck, and native picker selection.
- Keep raw absolute paths and file bytes out of renderer-visible output.
- Prove denied permission does not open the picker.

Do:

- Updated `apps/desktop/src/main/fileBridge.js`.
- Added `apps/desktop/test/file-upload-bridge.test.mjs`.

Check:

```bash
node apps/desktop/test/file-upload-bridge.test.mjs
node scripts/validate-matter-desktop-file-bridge.mjs
git diff --check -- apps/desktop/src/main/fileBridge.js apps/desktop/test/file-upload-bridge.test.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
```

Results:

- Upload bridge tests passed.
- Denied precheck does not open the picker or return metadata.
- Renderer-visible result does not include the raw absolute path.
- File bridge static validator passed.
- `git diff --check` passed.

Act:

- `MDT-P4-W02-T01` is complete.
- Next TUW is `MDT-P4-W02-T02`.

## MDT-P4-W02-T02 - Implement Save-Document-As Handler

Plan:

- Add save-as handling behind user gesture and backend permission precheck.
- Use native save dialog before any writer adapter call.
- Prove denied and cancelled paths do not write to a default path silently.

Do:

- Updated `apps/desktop/src/main/fileBridge.js`.
- Updated `apps/desktop/src/preload/fileBridge.js`.
- Added `apps/desktop/test/file-save-as.test.mjs`.

Check:

```bash
node apps/desktop/test/file-save-as.test.mjs
node scripts/validate-matter-desktop-file-bridge.mjs
git diff --check -- apps/desktop/src/main/fileBridge.js apps/desktop/src/preload/fileBridge.js apps/desktop/test/file-save-as.test.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
```

Results:

- Save-as bridge tests passed.
- Denied precheck does not open the save dialog.
- Cancelled save dialog does not call the writer adapter.
- File bridge static validator passed.
- `git diff --check` passed.

Act:

- `MDT-P4-W02-T02` is complete.
- Next TUW is `MDT-P4-W02-T03`.

## MDT-P4-W02-T03 - Implement Temp Preview and Cache Wipe

Plan:

- Add scoped temp preview manager with backend permission precheck.
- Make temp previews time-bounded.
- Remove temp preview files on logout, tenant switch, and app quit.

Do:

- Added `apps/desktop/src/main/tempPreview.js`.
- Added `apps/desktop/test/temp-preview-cleanup.test.mjs`.

Check:

```bash
node apps/desktop/test/temp-preview-cleanup.test.mjs
node scripts/validate-matter-desktop-file-bridge.mjs
git diff --check -- apps/desktop/src/main/tempPreview.js apps/desktop/test/temp-preview-cleanup.test.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
```

Results:

- Temp preview cleanup tests passed.
- Scoped previews are time-bounded.
- Logout, tenant switch, and app quit remove temp preview cache.
- File bridge static validator passed.
- `git diff --check` passed.

Act:

- `MDT-P4-W02-T03` is complete.
- Next TUW is `MDT-P4-W02-T04`.

## MDT-P4-W02-T04 - Run Complete File Bridge Test Suite

Plan:

- Add a single package script for the complete file bridge suite.
- Include happy path, denied path, no silent scan, and cache wipe coverage.
- Keep contract and static validators in the suite.

Do:

- Updated `apps/desktop/package.json`.
- Added `apps/desktop/test/file-bridge.test.mjs`.

Check:

```bash
npm --workspace apps/desktop run test:file-bridge
git diff --check -- apps/desktop/package.json apps/desktop/test/file-bridge.test.mjs docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
```

Results:

- Complete file bridge suite passed.
- Suite covers upload happy/denied paths, save-as happy/denied/cancelled paths, temp preview cache wipe, contract validation, and no silent scan static validation.
- `git diff --check` passed.

Act:

- `MDT-P4-W02-T04` is complete.
- Next TUW is `MDT-P4-W02-T05`, the P4 terminal TUW.

## MDT-P4-W02-T05 - Close File Bridge Evidence

Plan:

- Close P4 only after every file bridge TUW verification has passed in ledger order.
- Record picker-only access, precheck, audit, cache wipe, and silent scan guard evidence.
- Keep production go-live, public release, and owner approval claims false.

Do:

- Updated this LCX-DESK-04 evidence file as the P4 terminal closeout.

Check:

```bash
node scripts/validate-matter-desktop-loop-tuw-plan.mjs
npm --workspace apps/desktop run test:file-bridge
npm --workspace apps/desktop run test:smoke
node scripts/validate-matter-desktop-security.mjs
rg -n "MDT-P4|picker|precheck|audit|cache wipe|silent scan" docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
git diff --check -- docs/lazycodex/evidence/matter-desktop/lcx-desk-04-file-bridge.md
```

Results:

- picker: file picker opens only through user gesture and trusted gesture preload path.
- precheck: upload, save-as, and temp preview paths require backend permission precheck before native picker, save dialog, writer, or preview creation.
- audit: upload, save-as, temp preview, and cache wipe paths record mapped audit events.
- cache wipe: temp previews are scoped, time-bounded, and removed on logout, tenant switch, and app quit.
- silent scan: static guard detects directory watch, recursive scan, arbitrary path read, arbitrary path write, and path retention probes while reporting no current findings.
- Non-claims remain false: production go-live, public release, owner approval, and broad filesystem authority.

Act:

- `MDT-P4-W02` is closed at its terminal TUW, `MDT-P4-W02-T05`.
- P4 is complete.
- Next ledger TUW is `MDT-P5-W01-T01`.

## Post-Review Hardening - Renderer Byte Boundary

Scope:

- Follow-up review found that `saveDocumentAs` accepted renderer-supplied `bytes` and passed them to the main-process writer.
- The contract invariant remains: renderer-visible bridge payloads must not carry file/document bytes.

Fix:

- Added a shared renderer-byte policy that rejects `bytes`, `fileBytes`, `documentBytes`, `content`, `blob`, and `arrayBuffer` fields.
- Updated upload, save-as, and temp-preview paths to reject renderer-supplied bytes before permission precheck, native dialog, provider fetch, or write.
- Updated save-as and temp-preview to fetch bytes only through main-process document provider adapters after permission approval.
- Extended the file bridge static validator with a `renderer_file_bytes` probe.

Check:

```bash
node --test apps/desktop/test/file-save-as.test.mjs apps/desktop/test/file-upload-bridge.test.mjs apps/desktop/test/file-picker-gesture.test.mjs apps/desktop/test/temp-preview-cleanup.test.mjs
node scripts/validate-matter-desktop-file-bridge.mjs
npm --workspace apps/desktop run test:file-bridge
npm --workspace apps/desktop run test:smoke
node scripts/validate-matter-desktop-security.mjs
```

Results:

- Focused file-bridge tests passed, including renderer-byte rejection before precheck/dialog/write.
- Original reproducer now returns `RENDERER_FILE_BYTES_FORBIDDEN` and performs zero writes.
- File bridge static validator passed with `renderer_file_bytes` probe detected and no findings.
- Desktop smoke suite passed.
- Production go-live, public release, and owner approval claims remain false.
