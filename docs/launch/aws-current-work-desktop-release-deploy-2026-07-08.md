# Current Work Desktop Release And AWS Deploy Receipt

Status: desktop release candidate and AWS deploy completed.

This receipt covers the July 8, 2026 request to package the current work for macOS and Windows and deploy the current web/API build to AWS. It is a release/deploy receipt only. It does not claim public release, production go-live, `production_ready`, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Source State

| Field | Value |
| --- | --- |
| Branch | `codex/lcx-vltui-owner-approval-intake` |
| HEAD | `51fd7f14fd0d5d28f12897c2a99f29486bb5ecc8` |
| Worktree | `dirty-current-worktree` |
| Commit created | false |
| Commit note | No broad staging was performed because the worktree contains many unrelated modified and untracked files. |

## Desktop Release Candidate

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.10-current-20260708` |
| Channel | `formal-candidate` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708/checksums.sha256` |
| Formal receipt | `docs/desktop/matter-desktop-formal-release-receipt.md` |
| Artifact count | 9 |

### macOS

| Artifact | Value |
| --- | --- |
| App bundle | `apps/desktop/dist/mac/matter.app` |
| ZIP | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| ZIP SHA-256 | `d9476cd43937a9f22b10a64f0c0077280762024f82967952204f3980d1e9c40a` |
| DMG | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| DMG SHA-256 | `53f735752b56164b22ddcb9beee80a2f5eb0a12e577dcc611693301415cfd27b` |
| Developer ID signing | applied |
| Signing identity | `Developer ID Application: Jiwon Suh (LHDXU66NX3)` |
| codesign verify | pass |
| strict codesign verify | pass |
| gatekeeper assess | pass |
| notarization | `submitted_and_accepted_by_notarytool` |
| install smoke | pass |

### Windows

| Artifact | Value |
| --- | --- |
| Installer | `apps/desktop/dist/matter-0.1.10-win-x64.exe` |
| Installer SHA-256 | `482ffdaf17b36efb084bd2bdec22dccdc6fe8b01dcea80a93b3f58628e39510e` |
| Installer bytes | 107918318 |
| Blockmap | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |
| Blockmap SHA-256 | `98f78d23a8aa30777bccb2c54c85dd565de01388b09d29eef879bd7641a8dffb` |
| Formal manifest | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Formal manifest SHA-256 | `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5` |
| Manifest signature | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json.sig` |
| Signing identity | `matter-formal-candidate-nonproduction-signing-key` |
| Windows Authenticode signing | false |
| Windows native install smoke | `not_run_on_darwin` |

## AWS Deploy

| Surface | Result |
| --- | --- |
| AWS profile | `matter-prod-deploy-admin` |
| Region | `ap-northeast-2` |
| Web bucket | `s3://matter-lawos-web-prod-770880870480-apne2` |
| CloudFront distribution | `E3MVAKX2DIR3CS` |
| CloudFront URL | `https://d2mthcc8vp3cr2.cloudfront.net` |
| CloudFront invalidation | `I3OR2IXWWSVG25MBE3FUNJEEHZ` |
| Web JS asset | `dist/assets/index-D0_pUF9C.js` |
| Web CSS asset | `dist/assets/index-BOiUIWl9.css` |

| Lambda | State | Last update | Deployment commit | Code SHA-256 |
| --- | --- | --- | --- | --- |
| `matter-lawos-api-prod` | Active | Successful | `51fd7f14fd0d5d28f12897c2a99f29486bb5ecc8-dirty-current-20260708T022442Z` | `nCV+vwC6cDEn0eMK2R6ZFeedua62WILjsAbs+NW+tbs=` |
| `matter-temp-desktop-runtime` | Active | Successful | `51fd7f14fd0d5d28f12897c2a99f29486bb5ecc8-dirty-current-20260708T021942Z` | `pNdDWKmFi5TCXurR1UaHIX8DW46bKhmXp/ZWxvKBeWY=` |

## Direct Rerun Validation

| Command | Exit | Result |
| --- | ---: | --- |
| `npm test` | 0 | 4157/4157 tests passed |
| `npm run build` | 0 | web build completed |
| `npm --workspace apps/api test` | 0 | 292/292 tests passed |
| `node --test apps/api/test/lambda-session-secret.test.js apps/api/test/session-auth-api.test.js` | 0 | 27/27 tests passed |
| `npm run lcx:vltui:production-smoke` | 0 | PASS; 11 production smoke checks |
| `MATTER_DESKTOP_RUNTIME_BASE_URL=https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging npm run matter-desktop:aws-runtime:smoke` | 0 | PASS; account_count 11, protected reset denied, QA login/reset pass |
| `MATTER_DESKTOP_RUNTIME_BASE_URL=https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.10-current-20260708 MATTER_DESKTOP_RELEASE_CHANNEL=formal npm run matter-desktop:formal-release` | 0 | formal release candidate generated and validated |
| `aws lambda get-function-configuration --function-name matter-lawos-api-prod --profile matter-prod-deploy-admin --region ap-northeast-2` | 0 | Active / Successful |
| `aws lambda get-function-configuration --function-name matter-temp-desktop-runtime --profile matter-prod-deploy-admin --region ap-northeast-2` | 0 | Active / Successful |
| `npm run canonical-tenant:production-ready` | 1 | Expected boundary failure; `production_ready` and go-live claims not permitted |

## Production Smoke

| Field | Value |
| --- | --- |
| Artifact JSON | `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json` |
| Artifact MD | `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.md` |
| Verdict | PASS |
| Base URL | `https://d2mthcc8vp3cr2.cloudfront.net` |
| Check count | 11 |
| Production web deployed | true |
| Production API redeployed | true |
| Vault bridge remote write executed | false |
| Vault bridge blocked | true |
| Real client data used | false |
| Synthetic session login used | false |
| Direct authenticated probe used | true |
| Public release claim | false |
| Owner final approval claim | false |
| Company-wide go-live claim | false |

## Not Verified Or Not Claimed

| Item | State |
| --- | --- |
| Public release / go-live | not claimed |
| `production_ready` | not claimed; validator still fails by design |
| Windows native install smoke | not run on Darwin |
| Windows Authenticode signing | not claimed |
| Vault bridge remote writes | not executed because bridge remains disabled |
| Commit | not created because the worktree contains unrelated dirty files |
