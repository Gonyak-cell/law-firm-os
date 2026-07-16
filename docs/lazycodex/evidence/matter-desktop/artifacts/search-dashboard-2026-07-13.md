# Search Dashboard Internal Evidence Receipt

Date: 2026-07-13 (Asia/Seoul)

Status: `PASS_INTERNAL_PACKAGE`

## Source and tests

- Web full suite: 123 passed, 1 skipped, 0 failed.
- Targeted Search/web/API suite: 34 passed, 0 failed.
- DMS runtime services: 7 passed, 0 failed.
- Search descriptor package: 112 passed, 0 failed.
- Desktop smoke: 94 passed, 0 failed.
- Web typecheck: passed.
- Web production build: passed.
- AI slop review: Search surface passed; repository-wide lint reported unrelated historical/shared-style findings.

## Browser evidence

Evidence root: `output/playwright/search-dashboard-2026-07-13/`

- `search-dashboard-final-1440.png`
- `search-results-filters-final-1440.png`
- `search-results-filters-final-820.png`
- `search-results-filters-final-768.png`
- `search-document-detail-final-1440.png`
- `search-zero-final-1280.png`
- `search-denied-final-1280.png`
- `search-review-final-1280.png`
- `search-detail-final-en-1280.png`
- `search-packaged-final-1280.png`

The signed allow path used tenant `tenant_amic_matter_vault`. Denied and review screenshots use controlled permission responses to verify rendered fail-closed states; server authorization, tenant ownership, and count trimming are covered independently by API/security tests.

## Packaged runtime

- App: `apps/desktop/dist/mac/matter.app`
- Renderer build time: `2026-07-13 02:52:06`
- Running process: PID `19392`
- Remote debugging: `127.0.0.1:9223`
- Local runtime: `127.0.0.1:62402`
- Runtime health: `ok`
- Runtime profile: `local-dev`
- Secure session tenant: `tenant_amic_matter_vault`
- Secure session actor: `user_amic_jwsuh`
- Renderer token exposed: `false`
- Search/filter/result/detail: passed
- Remember/save/delete preference roundtrip: passed
- Console errors: `0`

Artifacts:

- ZIP SHA-256: `bbdb1d79171b8764c9a8f6dc24574258360e677d297fb2226515fbe09ca590f9`
- DMG SHA-256: `4c7278e82b5e92db2b64edf405fcea6c8f8135ca06f5734e2875d99e5e3cea20`
- Packaged screenshot SHA-256: `1bbf8c6d0c103cf7bacac86b3aab7cde263a4e8a03efc483b6f3e5d8babf171a`

## Claim boundary

- Internal package: passed.
- Developer ID signing: not distribution-ready.
- Notarization: not submitted; internal only.
- Public release: false.
- Go-live: false.
- Owner approval/public distribution approval: not claimed.
