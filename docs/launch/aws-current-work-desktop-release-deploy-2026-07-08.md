# Current Work Desktop Release And AWS Deploy Receipt

Status: desktop release candidate and AWS deploy completed.

Generated at: 2026-07-08T07:40:43Z.

This receipt covers the July 8, 2026 request to package the current work for macOS and Windows and deploy the current web/API build to AWS. It is a release/deploy receipt only. It does not claim public release, production go-live, `production_ready`, owner final approval, App Store distribution, Microsoft Store distribution, or Windows Authenticode signing.

## Source State

| Field | Value |
| --- | --- |
| Branch | `codex/lcx-vltui-owner-approval-intake` |
| HEAD | `365325a0213b015ecfccb3b8130786605a83de93` |
| Release marker | `matter-desktop-v0.1.10-current-20260708-365325a` |
| Worktree at release start | clean |
| Receipt commit | created after validation with explicit pathspec staging |
| Commit note | Receipt files were updated after deployment; no broad staging was performed. |

## Desktop Release Candidate

| Field | Value |
| --- | --- |
| Release ID | `matter-desktop-v0.1.10-current-20260708-365325a` |
| Channel | `formal-candidate` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708-365325a/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-current-20260708-365325a/checksums.sha256` |
| Formal receipt | `docs/desktop/matter-desktop-formal-release-receipt.md` |
| Artifact count | 9 |

### macOS

| Artifact | Value |
| --- | --- |
| App bundle | `apps/desktop/dist/mac/matter.app` |
| ZIP | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` |
| ZIP SHA-256 | `770d2b26ceaca292ae396bc2fbe6fa86b06e26045069a50f8862c94146353699` |
| ZIP bytes | 131420944 |
| DMG | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` |
| DMG SHA-256 | `558188c2010c31a4a1958d41eceab4ab9bb1e5a83a0b4205a537bf260fa1b521` |
| DMG bytes | 156709669 |
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
| Installer SHA-256 | `dab2ec8cead072f199b526f19b63da56e5053b1433590d576df1edc5b0bffd86` |
| Installer bytes | 107918319 |
| Blockmap | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` |
| Blockmap SHA-256 | `4513cffcf6381ba9d323cd9e4f3e29812b2b4cb8fdef57887ae0adca228567ff` |
| Blockmap bytes | 115260 |
| Formal manifest | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json` |
| Formal manifest SHA-256 | `72bdf5f7ca55befdb9620d347e91f21051063afbda4f65d2ebf33103cb23c5c5` |
| Manifest signature | `apps/desktop/dist/win/matter-0.1.10-win-installer-manifest.json.sig` |
| Manifest signature SHA-256 | `3cf133b6d8a1a7162923cf4ce441947df5732aa6fafc3b26854c15f7a45127ed` |
| Signing identity | `matter-formal-candidate-nonproduction-signing-key` |
| Windows Authenticode signing | false |
| Windows native install smoke | `not_run_on_darwin` |

## AWS Deploy

| Surface | Result |
| --- | --- |
| AWS account | `770880870480` |
| AWS profile | `matter-prod-deploy-admin` |
| Region | `ap-northeast-2` |
| Web bucket | `s3://matter-lawos-web-prod-770880870480-apne2` |
| CloudFront distribution | `E3MVAKX2DIR3CS` |
| CloudFront URL | `https://d2mthcc8vp3cr2.cloudfront.net` |
| CloudFront invalidation | `IBVGHR1L2BM63AJQRTKQJH1VI2` |
| CloudFront invalidation status | Completed |
| Web JS asset | `dist/assets/index-D0_pUF9C.js` |
| Web CSS asset | `dist/assets/index-BOiUIWl9.css` |

| Lambda | Action | State | Last update | Deployment commit | Code SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `matter-lawos-api-prod` | verified current; no code redeploy required | Active | Successful | `365325a0213b015ecfccb3b8130786605a83de93` | `4Ib6XdunKuKJF39n6rP3fiVgf0uZf33BN2r5uxO/aWQ=` |
| `matter-temp-desktop-runtime` | redeployed current runtime zip | Active | Successful | `365325a0213b015ecfccb3b8130786605a83de93-current-20260708T073826Z` | `t31f8bIexCJbqoNm5JZf4g+0mHsOfGlIhox/lG8QRoc=` |

## Direct Rerun Validation

| Command | Exit | Result |
| --- | ---: | --- |
| `npm test` | 0 | 4157/4157 tests passed |
| `npm run build` | 0 | Vite web build completed; chunk-size warning only |
| `MATTER_DESKTOP_RUNTIME_BASE_URL=https://73o8hpqpgl.execute-api.ap-northeast-2.amazonaws.com/staging MATTER_DESKTOP_GITHUB_RELEASE_TAG=matter-desktop-v0.1.10-current-20260708-365325a MATTER_DESKTOP_RELEASE_CHANNEL=formal npm run matter-desktop:formal-release` | 0 | formal release candidate generated and validated |
| `aws lambda update-function-code --function-name matter-temp-desktop-runtime ...` | 0 | runtime zip deployed; zip SHA-256 `b77d5ff1b21ec4225baa8366e4965fe20fb4987b0e7c6948868c7f946f104687`, 25572 bytes |
| `aws s3 sync apps/web/dist s3://matter-lawos-web-prod-770880870480-apne2 --delete` | 0 | current web build uploaded |
| `aws cloudfront create-invalidation --distribution-id E3MVAKX2DIR3CS --paths '/*'` | 0 | invalidation `IBVGHR1L2BM63AJQRTKQJH1VI2` completed |
| `npm run lcx:vltui:production-smoke` | 0 | PASS; 11 production smoke checks |
| `MATTER_DESKTOP_RUNTIME_BASE_URL=https://d2mthcc8vp3cr2.cloudfront.net npm run matter-desktop:aws-runtime:smoke` | 0 | PASS; account_count 11, protected reset denied, QA login/reset pass |
| `GET https://d2mthcc8vp3cr2.cloudfront.net/` | 0 | HTTP 200 |
| `GET https://d2mthcc8vp3cr2.cloudfront.net/api/health` | 0 | HTTP 200, service `@law-firm-os/api` |
| `GET https://d2mthcc8vp3cr2.cloudfront.net/health` | 0 | HTTP 200, service `matter-temp-desktop-runtime`, registered accounts 11 |
| `aws lambda get-function-configuration --function-name matter-lawos-api-prod` | 0 | Active / Successful |
| `aws lambda get-function-configuration --function-name matter-temp-desktop-runtime` | 0 | Active / Successful |
| `npm run canonical-tenant:production-ready` | 1 | Expected boundary failure; `production_ready` and go-live claims not permitted |

## Production Smoke

| Field | Value |
| --- | --- |
| Artifact JSON | `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json` |
| Artifact MD | `docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.md` |
| Verdict | PASS |
| Base URL | `https://d2mthcc8vp3cr2.cloudfront.net` |
| Deployment commit | `365325a0213b015ecfccb3b8130786605a83de93` |
| Check count | 11 |
| Bridge token source | `lambda_environment` |
| Real client data used | false |
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
| App Store / Microsoft Store distribution | not claimed |
| API Lambda code redeploy in this pass | not executed because `matter-lawos-api-prod` already matched HEAD |
