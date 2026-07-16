# Latest UI Desktop Release And AWS Deploy Receipt

Status: desktop release candidate and AWS deploy completed.

Generated at: 2026-07-10T12:34:26Z.

This receipt covers the latest Home/Client/Matter/People UI, durable runtime changes, macOS and Windows packaging, and AWS Web/API/Desktop runtime deployment. It does not claim a public release, company-wide go-live, `production_ready`, App Store distribution, Microsoft Store distribution, Windows Authenticode signing, or a native Windows install smoke.

## Source And Release

| Field | Value |
| --- | --- |
| Branch | `codex/lcx-vltui-owner-approval-intake` |
| Deployed source commit | `1502e6772f80fa7aa9d950da2122e9c6d1d64bc9` |
| Release ID | `matter-desktop-v0.1.10-20260710-1502e6772` |
| Channel | `formal-candidate` |
| Manifest | `apps/desktop/dist/release/matter-desktop-v0.1.10-20260710-1502e6772/release-manifest.json` |
| Checksums | `apps/desktop/dist/release/matter-desktop-v0.1.10-20260710-1502e6772/checksums.sha256` |

## Desktop Packages

| Platform | Artifact | SHA-256 | Result |
| --- | --- | --- | --- |
| macOS | `apps/desktop/dist/mac/matter-0.1.10-macos.dmg` | `7b5abaaefab48ed4be651720a44b97f9b81c78f1537d516d3020962f08d55b74` | Developer ID, strict codesign, Gatekeeper, notarization, install smoke PASS |
| macOS | `apps/desktop/dist/mac/matter-0.1.10-macos.zip` | `45694c7f3770d9171e21e407ac91aadf32a6fe5c10c913c97fb8209c7f2726bf` | formal candidate |
| Windows | `apps/desktop/dist/matter-0.1.10-win-x64.exe` | `72c7909f38f9d58106d3f2d61d8f85d294c0738637416e8ff3155a049b89c40f` | NSIS x64 package PASS; native Windows smoke not run on Darwin |
| Windows | `apps/desktop/dist/matter-0.1.10-win-x64.exe.blockmap` | `6b77970724aeb36ee27dee085b2e09e0fabf2792855b267527849c3ffd990d46` | blockmap generated |

Windows Authenticode signing remains false. The detached formal-candidate manifest signature is not an Authenticode claim.

## AWS Deployment

| Surface | Result |
| --- | --- |
| Account / profile / region | `770880870480` / `matter-prod-deploy-admin` / `ap-northeast-2` |
| Web | `s3://matter-lawos-web-prod-770880870480-apne2`; JS `assets/index-BIku680h.js`; CSS `assets/index-C0nmq8_D.css` |
| CloudFront | `E3MVAKX2DIR3CS`; invalidation `I4G759YYQ38UB8I5UMXPII6HHL` Completed |
| API Lambda | `matter-lawos-api-prod`; Active / Successful; code SHA `VrQIvtvC6V1CoUqSEwxpKZNHCqfjIejSQq2MJLfcJX4=` |
| Desktop runtime Lambda | `matter-temp-desktop-runtime`; Active / Successful; code SHA `1ImZLQFDc9PctdEh3DgA1Bb2W2xeQfrH4EaJgxM0kkI=` |
| HTTP checks | root 200; JS 200; CSS 200; `/api/health` 200; `/health` 200 |

Rollback ZIPs for both Lambdas and a 32-file pre-deploy Web snapshot were kept in the local deployment workspace. Secret environment values were neither printed nor committed.

## Validation

| Gate | Result |
| --- | --- |
| Root test suite | 4,173 / 4,173 PASS |
| Web UI suite | 74 PASS, 1 intentional skip |
| Desktop smoke | 89 / 89 PASS |
| Desktop file bridge | 17 / 17 PASS |
| Production smoke | 11 / 11 PASS |
| QA reset/login smoke | PASS under the explicit QA reset approval from this task |
| Protected super-admin reset | not performed |
| QA admin restriction | expected 403 PASS |

## Deployment Incident And Recovery

The first API code update returned 502 because the new local generation backup default resolved to Lambda's read-only home. After that was corrected, the next cold start exposed an EFS stale file handle caused by an atomic store replacement followed by an unnecessary repository reload. Both attempts were stopped and rollback code/configuration was applied. The final fix uses the configured runtime backup root, retains the committed in-memory state after a durable write, and retries EFS `ESTALE` reads.

Final direct Lambda health, CloudFront API health, and the 11-check production smoke all passed. No destructive restore, production migration, or explicit record deletion was executed during recovery.

## Claim Boundary

- GitHub publication is a prerelease/formal candidate, not a public stable release.
- AWS deployment completed, but company-wide go-live and `production_ready` are not claimed.
- Windows native installation and Authenticode remain unverified on this macOS build host.
