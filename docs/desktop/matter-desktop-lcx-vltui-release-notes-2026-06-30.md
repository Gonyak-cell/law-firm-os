# matter Desktop LCX VLTUI Prerelease Notes

Tag: `matter-desktop-v0.1.0-lcx-vltui-20260630`

Source branch: `codex/lcx-vltui-desktop-release-20260630`

## 포함 내용

- production에 반영된 LCX VLTUI 기반 Client, Matter, Vault 연결 UI를 데스크톱 패키지에 포함했습니다.
- 데스크톱 로그인 후 웹 UI handoff가 브라우저 저장소를 쓰지 않고 참조값 URL 파라미터만 사용하도록 고정했습니다.
- Matter, Client, Vault 세 축의 tenant/session context가 데스크톱 패키지 안에서 fail-closed 권한 검증을 통과하도록 정렬했습니다.
- macOS `matter.app`, ZIP, DMG를 새로 생성했습니다.
- macOS Developer ID signing, strict codesign, Gatekeeper, notarization을 통과했습니다.
- Windows formal installer manifest와 detached signature receipt를 새로 생성했습니다.
- packaged desktop screen QA 결과와 스크린샷을 함께 첨부합니다.

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
- `npm --workspace apps/web run test:ui`: PASS 17/17
- `npm --workspace apps/web run build`: PASS
- `npm --workspace apps/desktop run test:file-bridge`: PASS 17/17
- `npm run matter-desktop:aws-runtime:smoke`: PASS
- `MATTER_DESKTOP_RELEASE_CHANNEL=formal MATTER_NOTARY_KEYCHAIN_PROFILE=matter-notary MATTER_DESKTOP_SIGN=developer-id MATTER_DESKTOP_NOTARIZE=1 npm --workspace apps/desktop run build:mac`: PASS
- `MATTER_DESKTOP_RELEASE_CHANNEL=formal npm --workspace apps/desktop run build:win`: PASS
- `MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.0-lcx-vltui-20260630 npm run matter-desktop:formal-release:validate`: PASS
- `npm run matter-desktop:screen-qa`: PASS
- `node scripts/validate-matter-desktop-no-public-release-claim.mjs`: PASS
- `node scripts/validate-matter-desktop-release-boundary.mjs`: PASS for the internal release boundary fixture
- `python3 /Users/jws/Applications/ai-slop-taxonomy/scripts/sloplint.py --repo "$PWD" --changed`: completed with existing weak glow/blur style notices in the desktop login surface
- `git diff --check`: PASS

## 경계

- GitHub prerelease입니다.
- Production go-live: false
- Owner final approval: false
- App Store distribution: false
- Microsoft Store distribution: false
- Windows Authenticode signing: false
