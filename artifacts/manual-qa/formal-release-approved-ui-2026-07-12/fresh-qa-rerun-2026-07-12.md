# Formal release fresh QA rerun

> Superseded verifier-environment result. This rerun executed in a restricted reviewer environment with zero valid signing identities and impaired host trust. The user's parent macOS session subsequently passed repeated strict codesign, Gatekeeper, stapler, ZIP extraction, DMG install, and live-app checks. See `parent-host-runtime-verification.md` and `environment-distinction-re-review-2026-07-12.md`.

Date: 2026-07-12 (Asia/Seoul)
Scope: read-only verification of formal candidate `matter-desktop-v0.1.15-approved-ui-20260712`.
No accounts were reset, no external state was mutated, and no product files were edited.

## Verdict

**FAIL for current executable release verification.** The receipt and manifest document prior PASS results, and the supplied screenshot is visually acceptable for the claimed People-directory state, but current independent signature/Gatekeeper/notary checks do not reproduce those PASS results.

## Evidence reviewed

- Receipt: `approval-execution-receipt.md`
- Manifest: `apps/desktop/dist/release/matter-desktop-v0.1.15-approved-ui-20260712/release-manifest.json`
- Screenshot inspected: `01-formal-people-1024x700.png`
- Current source HEAD: `66a4eb20e6a83f82f5ae0b8254b18d1844f40bec`

The screenshot file is 2272x1624 device pixels; its filename and receipt identify the captured CSS viewport as 1024x700. It shows the signed People directory: Forest sidebar, People route selected, active employee tab, visible roster headers and rows, and no obvious UI clipping in the captured viewport. This is evidence for that prior captured state only; it is not a fresh runtime launch.

## Fresh read-only command results

| Check | Exact invocation | Result |
|---|---|---|
| Bundle identity inspection | `codesign -dv --verbose=4 apps/desktop/dist/mac/matter.app` | Command returned 0 and reported `TeamIdentifier=LHDXU66NX3`, `Notarization Ticket=stapled`, but `Authority=(unavailable)` and an invalid entitlements blob warning was observed. |
| Current app signature | `codesign --verify --deep --strict --verbose=2 apps/desktop/dist/mac/matter.app` | **FAIL**: `invalid signature (code or signature have been modified)`; arm64. |
| Current app Gatekeeper | `spctl --assess --type execute --verbose=4 apps/desktop/dist/mac/matter.app` | **FAIL**: `internal error in Code Signing subsystem`. |
| Current app stapling | `xcrun stapler validate apps/desktop/dist/mac/matter.app` | **FAIL/BLOCKED**: `NSOSStatusErrorDomain Code=256`, underlying `-10813 kLSDataUnavailableErr`. |
| Notary status query | `xcrun notarytool info 472a8d29-c7f9-43b8-8eb5-de2c3fa7b1b0 --keychain-profile matter-notary` | **BLOCKED**: keychain access error, `One or more parameters passed to a function were not valid`. |
| Manifest checksums | `shasum -a 256 -c apps/desktop/dist/release/matter-desktop-v0.1.15-approved-ui-20260712/checksums.sha256` | **PASS**: all listed artifacts and receipts returned `OK`. |
| DMG image integrity | `hdiutil verify apps/desktop/dist/mac/matter-0.1.15-macos.dmg` | **PASS**: checksum reported `VALID`. |
| DMG readonly attach | `hdiutil attach -readonly -nobrowse -noautoopen -mountpoint <temporary mount> apps/desktop/dist/mac/matter-0.1.15-macos.dmg` | **BLOCKED**: `hdiutil: attach failed - device not configured`; mounted-app checks could not run. |
| Signed ZIP payload | Extracted `matter-0.1.15-macos.zip` to a temporary directory, then ran `codesign --verify --deep --strict` and `spctl --assess --type execute` on the extracted app | **FAIL**: same invalid-signature and Code Signing subsystem errors as the current app. |
| Host signing trust | `security find-identity -v -p codesigning` | **BLOCKED**: `0 valid identities found`; system binaries also returned `CSSMERR_TP_NOT_TRUSTED`, so host trust/keychain state is impaired. |

## Publication boundary

No GitHub release was created. Current local status remains `50` modified/deleted entries and `38` untracked entries (`git status --short`), so the current HEAD tag would not reproduce the approved binary. No public-release, production-go-live, or owner-approval claim is made.

## Required disposition

Do not convert the prior receipt into a current formal-release PASS until the signing/keychain environment is restored and the exact manifest-matched ZIP/DMG artifacts independently pass deep strict codesign, Gatekeeper, stapler/notary verification, and DMG install smoke.
