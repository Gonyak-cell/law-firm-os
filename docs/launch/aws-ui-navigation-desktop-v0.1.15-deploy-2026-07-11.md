# AWS UI Navigation and Desktop v0.1.15 Deployment — 2026-07-11

## Result

Commit `7e8796db4dc8c7df40f8a40906d247fbdd1dada7` was released as a desktop formal candidate and deployed to the AWS production web surface on 2026-07-11 at 18:35 KST.

- GitHub prerelease: [`matter-desktop-v0.1.15-20260711-7e8796db4`](https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.15-20260711-7e8796db4)
- Release assets: 11 uploaded
- CloudFront distribution `E3MVAKX2DIR3CS`: `Deployed`
- Invalidation `I5R6ZRI2U3BMRF73W3H3AR25T9`: `Completed`
- Root, `/api/health`, and `/health`: HTTP 200
- API Lambda `matter-lawos-api-prod`: unchanged, `Active / Successful`

## Desktop artifacts

| Artifact | SHA-256 | Verification |
|---|---|---|
| `matter-0.1.15-macos.zip` | `5762e8a6ca03f6d2cc6beaedf6a4587f602c808fbcd6c3b81a6bb275f052ae0f` | checksum pass |
| `matter-0.1.15-macos.dmg` | `96662958775fb6fd4a6e9e40c234f3261c77ef1870d8c3d69780e33a6e2e7a4c` | checksum and DMG verify pass |
| `matter-0.1.15-win-x64.exe` | `e1466c888bc00f114a81cd2079e77534204e497446aaa80da81b305d5178abd8` | checksum pass |
| `matter-0.1.15-win-x64.exe.blockmap` | `3d15c175824594a69937e7c43f8785f80c0eac0e6dcc9a8a2ebb2bbc4aaee95c` | checksum pass |

The macOS application passed strict code-sign verification, Gatekeeper, notarization stapler validation, archive validation, and packaged-app visual QA. The Windows installer was generated on macOS; Windows Authenticode and native Windows install smoke were not performed.

## Web artifacts

| Artifact | SHA-256 |
|---|---|
| `index.html` | `048bae1362e4920aa3351f02a3786dbb97b20234ed78c40b6d85a3df54d8da74` |
| `assets/index-2YWf4Myl.js` | `0cfad63a2e950d6b36a3cbbbd57befbf39fd0bd99e76d18784ba2328bcc73784` |
| `assets/index-DmbhoYKY.css` | `dc91c8447d312ea8728b5f690be9fa1f5239460498a7ee9308d3d3f22cdf3290` |

All three CloudFront files matched the local production build byte for byte. The live page rendered the current Home navigation order, unified `할 일`, and `공지사항` / `뉴스레터` tabs. New hashed assets were uploaded before `index.html`; no S3 objects were deleted.

## API boundary

This change contained web UI and desktop packaging changes only. The Lambda was deliberately not redeployed.

- Code SHA-256: `2BiLXBQmTKPi90KcdWGWjghKdCtlJIC85+0SvSCP+sU=`
- Revision ID: `f2586478-88ac-4980-a505-0a232d10f60b`
- State: `Active`
- Last update status: `Successful`

The values matched the pre-deploy state.

## Rollback

The complete pre-deploy S3 snapshot is retained at:

`/Users/jws/Library/Application Support/LawFirmOS/deploy-rollbacks/lawos-web-0.1.15-7e8796db4-20260711T093459Z`

- Snapshot files: 33
- Previous `index.html` SHA-256: `258a7e31d4ff97290cc49730dfb3278df94cbc3d904d05975cf4f2e37d2ca996`
- Snapshot checksum manifest: `predeploy-checksums.sha256`
- S3 objects after deploy: 35

Rollback restores the saved web snapshot to the production bucket, uploads the preserved `index.html` last with no-cache headers, invalidates CloudFront, and repeats the live hash and HTTP checks.

## Claim boundary

This receipt proves the GitHub formal-candidate prerelease and bounded AWS production web deployment. It does not claim Windows-native QA, a stable public desktop release, company-wide go-live, or `production_ready` status.

Machine-readable receipt: `docs/launch/aws-ui-navigation-desktop-v0.1.15-deploy-2026-07-11.json`.
