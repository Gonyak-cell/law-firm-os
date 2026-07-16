# QA-005 macOS formal package acceptance

- Status: `DONE`
- Artifact source SHA: `39ed9571b0e841e1a6480e6875fe7b6658f83465`
- Artifact source tree: `42bb94f745b329053cc14325ef1251fc7d8475cd`
- Artifact source dirty: `false`
- Renderer SHA-256: `efc12338c5f6b77e3fb1f88f0ef5285c925144dc346cdbb3ff53ab08d7199599`
- Renderer files: `28`
- QA receipt: `formal-macos-package-qa.json`
- QA verdict: `PASS`

## Distribution verification

- App ID: `com.amic.matter.desktop`
- macOS ZIP SHA-256: `2e2af3ef0a7da78ffaa6ed3d2c6500d59daf0eb70abde617d0a4272f39a38e5c`
- macOS DMG SHA-256: `66d00e1422eacddfed3a57403f9ecbacc9ae4b3ff6c2683dcf43e4ef8ad36043`
- Developer ID signature: PASS
- App strict codesign verification: PASS
- App Gatekeeper assessment: PASS (`Notarized Developer ID`)
- App stapler validation: PASS
- DMG codesign verification: PASS
- DMG Gatekeeper assessment: PASS
- DMG stapler validation: PASS
- DMG image verification: PASS
- App notary submission: `80dd3d70-2f21-4798-b5e5-3476a9880e0f` (`Accepted`)
- DMG notary submission: `0bd9eaf9-8111-4ee7-bfe3-cc5786ca49d6` (`Accepted`)

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
- Windows native install, launch, login, leave, payroll, restart, and uninstall are proven separately in QA-006. Authenticode remains blocked because both native signatures are `NotSigned` and no approved certificate/provider is configured.
- No public release, production deployment, production go-live, or owner approval is claimed.
