# matter Desktop v0.1.1 LCX Openable Operating-Fit Prerelease 2026-06-30

Status: GitHub prerelease candidate
Tag: `matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630`
Branch: `codex/lcx-vltui-owner-approval-intake`

## Version Correction

This prerelease supersedes the `v0.1.0` LCX openable operating-fit package because the prior package reused the desktop app version even though the GitHub release assets had been refreshed. The app package version, root workspace version, native package names, formal manifest, checksums, and release receipt now all resolve to `0.1.1`.

## Scope

This prerelease records the repo-openable Law Firm OS UI reconciliation after the LCX dual-axis implementation gate.

Completion is recognized only when both gates pass:

- original `Client CRM/intake -> Matter ERP/legal operations -> People HRX` Matter-first concept fit
- Korean SaaS operating-fit coverage

## Packaged Desktop Artifacts

- `apps/desktop/dist/mac/matter-0.1.1-macos.dmg`
- `apps/desktop/dist/mac/matter-0.1.1-macos.zip`
- `apps/desktop/dist/matter-0.1.1-win-x64.exe`
- `apps/desktop/dist/matter-0.1.1-win-x64.exe.blockmap`
- `apps/desktop/dist/win/matter-0.1.1-win-installer-manifest.json`
- `apps/desktop/dist/win/matter-0.1.1-win-installer-manifest.json.sig`
- `apps/desktop/dist/release/matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630/release-manifest.json`
- `apps/desktop/dist/release/matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630/checksums.sha256`
- `docs/desktop/matter-desktop-formal-release-receipt.md`

## Package Checksums

- macOS DMG: `b9c67c29903cac95f04cfaa81e610b955d5029fb56ea1b0c933795bcba993e12`
- macOS ZIP: `c73c387760a438dcf07e8c37bd7b800f1079f8688039dea0c04b568297abe234`
- Windows installer: `f44312f454e430cc6b65c8cc0f24306f69180fcfa4a0381fea5b1cf445e64143`
- Windows installer blockmap: `dc173c696dcfeadd97ec23edc10988e7ad1433975fc37b8da03de379ff4ef251`

## Validation

- `MATTER_DESKTOP_RELEASE_CHANNEL=formal MATTER_NOTARY_KEYCHAIN_PROFILE=matter-notary MATTER_DESKTOP_SIGN=developer-id MATTER_DESKTOP_NOTARIZE=1 npm --workspace apps/desktop run build:mac`: PASS
- `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:win`: PASS
- `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:win:installer`: PASS
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630 node scripts/release-matter-desktop-formal.mjs`: PASS
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.1-lcx-openable-operating-fit-20260630 npm run matter-desktop:formal-release:validate`: PASS
- `file apps/desktop/dist/matter-0.1.1-win-x64.exe`: `PE32 executable (GUI) Intel 80386, for MS Windows, Nullsoft Installer self-extracting archive`
- `npm run lcx:full:pr00:validate`: PASS
- `npm run lcx:full:operating-fit-final:validate`: PASS
- `npm run lcx:full:pr01a:validate`: PASS
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`: PASS
- `git diff --check`: PASS

## Openable UI Result

| Status | Count |
| --- | ---: |
| `closed_repo_implemented` | 46 |
| `closed_request_only` | 49 |
| `closed_dry_run_only` | 7 |
| `blocked_external_receipt_required` | 3 |

Openable row count: 105.

## Evidence

- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-concept-fit-validation.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-korea-saas-fit-validation.json`
- `docs/lazycodex/evidence/matter-web/artifacts/lcx-full-21-operating-fit-final-validation.json`
- `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md`
- `docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md`

## Release Boundary

This prerelease does not claim:

- production go-live
- final public/go-live approval
- provider production writes
- production Vault writes
- real migration/import execution
- external tax or Hometax issue
- external payment, payroll movement, or disbursement
- external e-sign/send completion
- Windows Authenticode signing
- App Store or Microsoft Store distribution

Release preflight truth remains preserved:

- `LCX-FULL-19.01`: failed
- `LCX-FULL-19.03`: blocked
