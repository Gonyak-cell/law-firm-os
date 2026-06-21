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
| MDT-P4-W01-T02 | pending | not started |
| MDT-P4-W01-T03 | pending | not started |
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
