# Matter Desktop Screen QA

Status: passed
Date: 2026-06-22

## Command

`npm run matter-desktop:screen-qa`

## Evidence

| Artifact | Path |
| --- | --- |
| Sanitized QA result | `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa-result.json` |
| Initial login UI capture | `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-initial-login-ui.png` |
| Screen capture | `docs/lazycodex/evidence/matter-desktop/artifacts/desktop-screen-qa.png` |

## Scope

- Packaged macOS `matter.app` window opened successfully.
- App name verified as `matter`.
- Initial login screen verified the matter wordmark, AMIC byline, and reset-email password flow panel.
- AWS temporary runtime connected in the packaged Electron desktop screen.
- `jwsuh@amic.kr` completed reset email request, password reset confirmation, password login, dashboard smoke, and admin smoke.
- `jwsuh@amic.kr` session roles include `system_super_admin`.
- `ytkim@amic.kr` completed reset email request, password reset confirmation, password login, and dashboard smoke.
- `ytkim@amic.kr` admin smoke returned `HTTP 403 deny`.
- Reset token and password fields were cleared before screenshot capture.
- Production go-live, public release, and owner final approval claims remain false.
