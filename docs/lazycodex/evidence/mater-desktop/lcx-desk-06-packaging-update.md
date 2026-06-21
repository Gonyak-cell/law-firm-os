# LCX-DESK-06 Packaging and Update Evidence

Status: P6_complete
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
| MDT-P6-W01-T03 | complete | `docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md`, `scripts/build-mater-desktop-mac.mjs` |
| MDT-P6-W01-T04 | complete | `docs/lazycodex/evidence/mater-desktop/artifacts/windows-build.md`, `scripts/build-mater-desktop-win.mjs` |
| MDT-P6-W02-T01 | complete | `docs/desktop/mater-desktop-update-policy.md` |
| MDT-P6-W02-T02 | complete | `apps/desktop/src/main/updates.js`, `apps/desktop/test/update-rollback.test.mjs` |
| MDT-P6-W02-T03 | complete | `docs/desktop/mater-desktop-license-audit.md` |
| MDT-P6-W02-T04 | complete | P6 terminal closure recorded in this file |

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

## MDT-P6-W01-T03 - Produce macOS Internal Signed Build

Plan:

- Produce an internal macOS app bundle smoke artifact.
- Sign it with local ad-hoc codesign identity.
- Record signing identity, notarization state, install smoke result, and release non-claims.

Do:

- Added `scripts/build-mater-desktop-mac.mjs`.
- Added `build:mac` script to `apps/desktop/package.json`.
- Generated `docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md`.

Check:

```bash
npm --workspace apps/desktop run build:mac
git diff --check -- scripts/build-mater-desktop-mac.mjs apps/desktop/package.json docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md
```

Results:

- macOS internal build command passed.
- Receipt records signing identity, notarization state, and install smoke result.
- Public release, production go-live, and owner approval remain false.
- `git diff --check` passed.

Act:

- `MDT-P6-W01-T03` is complete.
- Next TUW is `MDT-P6-W01-T04`.

## MDT-P6-W01-T04 - Produce Windows Internal Signed Build

Plan:

- Produce an internal Windows build receipt from macOS without claiming public Windows distribution.
- Record signing identity, installer hash, and install smoke result.
- State that Windows native install smoke and Authenticode signing are not claimed from this Darwin environment.

Do:

- Added `scripts/build-mater-desktop-win.mjs`.
- Added `build:win` script to `apps/desktop/package.json`.
- Generated `docs/lazycodex/evidence/mater-desktop/artifacts/windows-build.md`.

Check:

```bash
npm --workspace apps/desktop run build:win
git diff --check -- scripts/build-mater-desktop-win.mjs apps/desktop/package.json docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md docs/lazycodex/evidence/mater-desktop/artifacts/windows-build.md
```

Results:

- Windows internal build command passed.
- Receipt records signing identity, installer hash, and install smoke result.
- Windows Authenticode signing, public release, production go-live, and owner approval remain false.
- `git diff --check` passed.

Act:

- `MDT-P6-W01` is closed at its terminal TUW, `MDT-P6-W01-T04`.
- Next ledger TUW is `MDT-P6-W02-T01`.

## MDT-P6-W02-T01 - Define Signed Update Channel Policy

Plan:

- Define internal, pilot, rollback, disabled-public, and key rotation rules.
- Keep public release and owner approval false.

Do:

- Added `docs/desktop/mater-desktop-update-policy.md`.

Check:

```bash
rg -n "internal|pilot|rollback|public|key rotation" docs/desktop/mater-desktop-update-policy.md
git diff --check -- docs/desktop/mater-desktop-update-policy.md docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md
```

Results:

- Update policy grep passed.
- Policy defines internal, pilot, rollback, disabled-public, and key rotation rules.
- `git diff --check` passed.

Act:

- `MDT-P6-W02-T01` is complete.
- Next TUW is `MDT-P6-W02-T02`.

## MDT-P6-W02-T02 - Smoke Signed Update and Rollback

Plan:

- Add internal signed update metadata verification.
- Add rollback to the last verified internal version.
- Keep public update channel disabled.

Do:

- Added `apps/desktop/src/main/updates.js`.
- Added `apps/desktop/test/update-rollback.test.mjs`.
- Added `test:update` script to `apps/desktop/package.json`.

Check:

```bash
npm --workspace apps/desktop run test:update
git diff --check -- apps/desktop/src/main/updates.js apps/desktop/test/update-rollback.test.mjs apps/desktop/package.json docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md
```

Results:

- Update rollback tests passed.
- Signature check and rollback path are covered.
- Public update channel remains disabled.
- `git diff --check` passed.

Act:

- `MDT-P6-W02-T02` is complete.
- Next TUW is `MDT-P6-W02-T03`.

## MDT-P6-W02-T03 - Run SBOM and License Audit

Plan:

- Record the desktop dependency and license audit state.
- Include Electron license and redistribution constraints.
- Keep public release and owner approval false.

Do:

- Added `docs/desktop/mater-desktop-license-audit.md`.
- Updated `apps/desktop/package.json` description to reflect current guarded desktop scope.

Check:

```bash
npm ls --workspace apps/desktop --json && rg -n "license|Electron|redistribution" docs/desktop/mater-desktop-license-audit.md
git diff --check -- docs/desktop/mater-desktop-license-audit.md apps/desktop/package.json docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md
```

Results:

- Dependency tree command passed.
- License audit grep passed.
- Audit records Electron, license state, and redistribution constraints.
- `git diff --check` passed.

Act:

- `MDT-P6-W02-T03` is complete.
- Next TUW is `MDT-P6-W02-T04`, the P6 terminal TUW.

## MDT-P6-W02-T04 - Close Packaging and Update Evidence

Plan:

- Close P6 only after every packaging/update TUW verification has passed in ledger order.
- Record signed internal build status, rollback coverage, license audit, and explicit public release denial.
- Keep production go-live, public release, public publish channel, and owner approval false.

Do:

- Updated this LCX-DESK-06 evidence file as the P6 terminal closeout.

Check:

```bash
node scripts/validate-mater-desktop-loop-tuw-plan.mjs
node scripts/validate-mater-desktop-packaging.mjs
npm --workspace apps/desktop run build:mac
npm --workspace apps/desktop run build:win
npm --workspace apps/desktop run test:update
npm ls --workspace apps/desktop --json && rg -n "license|Electron|redistribution" docs/desktop/mater-desktop-license-audit.md
npm --workspace apps/desktop run test:smoke
node scripts/validate-mater-desktop-security.mjs
rg -n "MDT-P6|signed|rollback|public release" docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md
git diff --check -- docs/lazycodex/evidence/mater-desktop/lcx-desk-06-packaging-update.md docs/lazycodex/evidence/mater-desktop/artifacts/macos-build.md docs/lazycodex/evidence/mater-desktop/artifacts/windows-build.md
```

Results:

- signed: macOS receipt records ad-hoc internal codesign; Windows receipt records internal detached signature and explicitly does not claim Authenticode.
- rollback: update smoke proves signature check, public channel denial, and rollback path.
- License audit records Electron, license classes, and redistribution constraints.
- public release remains false; production go-live and owner approval remain false.

Act:

- `MDT-P6-W02` is closed at its terminal TUW, `MDT-P6-W02-T04`.
- P6 is complete.
- Next ledger TUW is `MDT-P7-W01-T01`.
