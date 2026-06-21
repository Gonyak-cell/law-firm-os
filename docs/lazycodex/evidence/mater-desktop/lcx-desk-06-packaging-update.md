# LCX-DESK-06 Packaging and Update Evidence

Status: in_progress
Branch: `codex/mater-desktop-69-tuw-implementation`
Scope: P6 internal packaging, signed update policy, rollback, SBOM, and release non-claims
Source ledger: `docs/desktop/mater-desktop-loop-tuw-ledger.json`

## Boundary

This evidence file records P6 packaging and update progress only. It does not claim production go-live, public release, public publish channel, store approval, or owner approval.

## TUW Status

| TUW | Status | Evidence |
| --- | --- | --- |
| MDT-P6-W01-T01 | complete | `docs/desktop/mater-desktop-packaging-decision.md` |
| MDT-P6-W01-T02 | complete | `apps/desktop/electron-builder.yml`, `scripts/validate-mater-desktop-packaging.mjs`, `apps/desktop/build/icon.svg` |
| MDT-P6-W01-T03 | pending | not started |
| MDT-P6-W01-T04 | pending | not started |
| MDT-P6-W02-T01 | pending | not started |
| MDT-P6-W02-T02 | pending | not started |
| MDT-P6-W02-T03 | pending | not started |
| MDT-P6-W02-T04 | pending | phase terminal not reached |

## MDT-P6-W01-T01 - Record Internal App ID Decision

Plan:

- Record the internal desktop app ID decision.
- Separate internal app ID from any future public release app ID.
- Keep owner decision, public release, and production go-live claims false.

Do:

- Added `docs/desktop/mater-desktop-packaging-decision.md`.

Check:

```bash
rg -n "app ID|internal|public release|owner decision" docs/desktop/mater-desktop-packaging-decision.md
git diff --check -- docs/desktop/mater-desktop-packaging-decision.md docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md
```

Results:

- Packaging decision grep passed.
- Internal app ID is separated from future public release app ID.
- Owner decision and public release approval remain false.
- `git diff --check` passed.

Act:

- `MDT-P6-W01-T01` is complete.
- Next TUW is `MDT-P6-W01-T02`.

## MDT-P6-W01-T02 - Add Packaging Configuration

Plan:

- Add internal desktop packaging configuration.
- Include app ID, product name, icon, file allowlist, and test exclusions.
- Disable public publish channel.

Do:

- Added `apps/desktop/electron-builder.yml`.
- Added `apps/desktop/build/icon.svg`.
- Added `scripts/validate-mater-desktop-packaging.mjs`.

Check:

```bash
node scripts/validate-mater-desktop-packaging.mjs
git diff --check -- apps/desktop/electron-builder.yml apps/desktop/build/icon.svg scripts/validate-mater-desktop-packaging.mjs docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md
```

Results:

- Packaging validator passed.
- Config includes internal app ID, product name, icons, files, and no public publish channel.
- `git diff --check` passed.

Act:

- `MDT-P6-W01-T02` is complete.
- Next TUW is `MDT-P6-W01-T03`.
