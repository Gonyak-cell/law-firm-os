# QA-005 macOS formal package acceptance

- Status: `DONE`
- Artifact source SHA: `53854dca55c8b4c0730b57998980755bf141de58`
- Artifact source tree: `d99621ca5bf6a93130c26ab7ba08cd4836b234d3`
- Artifact source dirty: `false`
- Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
- Renderer files: `28`
- QA receipt: `formal-macos-package-qa.json`
- QA verdict: `PASS`

## Distribution verification

- App ID: `com.amic.matter.desktop`
- macOS ZIP SHA-256: `1388a8361b7d42cbf4c95b2a0b9b3172368fb106136d557fd9fbb30732c2b1f4`
- macOS DMG SHA-256: `5bbf397750206b7e1ea27195f6a0b82023e7692da9002507d1e4bb038cd483a1`
- Developer ID signature: PASS
- App strict codesign verification: PASS
- App Gatekeeper assessment: PASS (`Notarized Developer ID`)
- App stapler validation: PASS
- DMG codesign verification: PASS
- DMG Gatekeeper assessment: PASS
- DMG stapler validation: PASS
- DMG image verification: PASS
- App notary submission: `c35385d4-bf49-4c2d-bcf9-953322fec25d` (`Accepted`)
- DMG notary submission: `36ad0282-260c-4015-b08a-0405379efb27` (`Accepted`)

## Runtime and rendered QA

The signed formal app intentionally contains no bundled local API. QA therefore kept the signed bundle immutable and connected it to an isolated loopback API started from the exact artifact source SHA. The runtime used only the synthetic local fixture and performed no production, AWS, employee, bank, tax, or provider write.

- Forest login rendered: PASS
- `jwsuh@amic.kr` login: PASS
- Profile resolved as `서지원` / `user_amic_jwsuh` / `emp_amic_jwsuh`: PASS
- Generic `세션 사용자` fallback absent: PASS
- Leave rendered without page or console errors: PASS
- Payroll draft workspace rendered without page or console errors: PASS
- App restart restored the signed-in payroll session: PASS
- Screenshots visually inspected: `5/5`

## Renderer parity

The formal macOS and formal Windows package manifests both report renderer SHA-256 `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599` across `28` files. The QA receipt records `byte_identical: true`. The broader Web/candidate/macOS/Windows parity closeout remains QA-007.

## Commands and evidence

- Formal macOS build: `npm --workspace apps/desktop run build:mac`
- Formal Windows package: `npm --workspace apps/desktop run build:win`
- Formal Windows NSIS installer: `npm --workspace apps/desktop run build:win:installer`
- Formal macOS rendered QA: `node scripts/run-formal-macos-package-qa.mjs`
- Independent verification: `codesign`, `spctl`, `xcrun stapler`, `xcrun notarytool`, `hdiutil`
- Generated build receipts:
  - `docs/lazycodex/evidence/matter-desktop/artifacts/macos-build.md`
  - `docs/lazycodex/evidence/matter-desktop/artifacts/windows-build.md`

## Preserved state and limits

- Existing v0.1.16 app PID `55090` remained running from `/private/tmp/lawos-forest-v016-release`.
- User root worker PIDs `27104`, `27105`, and `27106` remained running.
- Product source directories were asserted unchanged during the formal QA run.
- The formal Windows package was generated on macOS, but native Windows install, launch, restart, uninstall, and Authenticode verification are not claimed here; those remain QA-006.
- No public release, production deployment, production go-live, or owner approval is claimed.
- The AWS device login expired and produced no deployment or external mutation.
