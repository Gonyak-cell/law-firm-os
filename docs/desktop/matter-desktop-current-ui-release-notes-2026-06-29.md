# matter Desktop Current UI Prerelease Notes

Tag: `matter-desktop-v0.1.0-current-ui-20260629`

Source branch: `codex/home-utility-menu-style`

## 포함 내용

- production에 반영된 현재 Client/Matter UI를 데스크톱 패키지에 포함했습니다.
- Client `denied` / `review` 상태가 generic load error 대신 권한/검토 안내로 보이도록 고정했습니다.
- macOS `matter.app`, ZIP, DMG를 새로 생성했습니다.
- macOS Developer ID signing, strict codesign, Gatekeeper, notarization을 통과했습니다.
- Windows formal installer manifest와 detached signature receipt를 새로 생성했습니다.
- desktop screen QA 결과와 스크린샷을 함께 첨부합니다.

## 주요 산출물

- `matter-0.1.0-macos.dmg`
- `matter-0.1.0-macos.zip`
- `matter-0.1.0-win-installer-manifest.json`
- `matter-0.1.0-win-installer-manifest.json.sig`
- `release-manifest.json`
- `checksums.sha256`
- `matter-desktop-formal-release-receipt.md`
- `desktop-screen-qa-result.json`
- `desktop-screen-qa.png`
- `desktop-initial-login-ui.png`
- `desktop-super-admin-product-ui.png`

## 검증

- `npm --workspace apps/desktop run test:smoke`: PASS 59/59
- `npm --workspace apps/desktop run test:file-bridge`: PASS 17/17
- `npm run matter-desktop:aws-runtime:smoke`: PASS
- `MATTER_DESKTOP_RELEASE_CHANNEL=formal MATTER_NOTARY_KEYCHAIN_PROFILE=matter-notary MATTER_DESKTOP_SIGN=developer-id MATTER_DESKTOP_NOTARIZE=1 npm --workspace apps/desktop run build:mac`: PASS
- `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:win`: PASS
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.0-current-ui-20260629 npm run matter-desktop:formal-release:validate`: PASS
- `npm run matter-desktop:screen-qa`: PASS
- `node scripts/validate-matter-desktop-no-public-release-claim.mjs`: PASS
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`: PASS

## 경계

- GitHub prerelease입니다.
- Production go-live: false
- Owner final approval: false
- App Store distribution: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
