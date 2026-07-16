# AWS Dashboard Web/API Deployment — 2026-07-11

## Result

Commit `067c6c51876e6d041b300c97632e370cbaef63b1` was deployed to the AWS production Web/API surfaces at 2026-07-11 01:34 KST.

- API Lambda `matter-lawos-api-prod`: `Active / Successful`
- API deployment metadata: `067c6c51876e6d041b300c97632e370cbaef63b1`
- CloudFront distribution `E3MVAKX2DIR3CS`: `Deployed`
- Invalidation `I9F9E5PCIWER2WG12QL5V5VVDJ`: `Completed`
- Root, `/api/health`, and `/health`: HTTP 200
- CRM unauthenticated boundary: HTTP 401 with `AUTH_SESSION_REQUIRED`

## Deployed artifacts

| Artifact | SHA-256 |
|---|---|
| Lambda candidate ZIP | `c1735895ca62f849588b3c7f3a078126033ea1850406b0338559b16b9c339be0` |
| `index.html` | `8eb9c7581d32a8811af07017e2131e3c57518d659d4e2244b331c9c9048d599c` |
| `assets/index-BtXlQxsV.js` | `4c383562994e6db8759c2301c929ee2ebbafbc45af85cce869b5e2a89e2421b0` |
| `assets/index-PtUyPPmI.css` | `84757131f2ecd22f24e72bc39573a147eb46b7a97b91fbfc8371387c373c0420` |

The live CloudFront files match these hashes. New hashed assets were uploaded before `index.html`; no S3 objects were deleted and the previous hashed assets remain available.

## Verification

- Home browser suite: 19 passed
- CRM API focused contract tests: 2 passed
- Desktop smoke: 89 passed
- macOS internal package dashboard QA: passed
  - Home direct sources: recent work 3, new engagements 1, monthly sales 1
  - Matter today To Do: 1
  - People rows: 7
  - forbidden internal IDs/raw enums: 0
  - horizontal overflow: 0
- Windows package dashboard QA: [GitHub Actions run 29107496228](https://github.com/Gonyak-cell/law-firm-os/actions/runs/29107496228) passed at the deployed source commit.
- AI slop review: pass

The production root was rendered after invalidation and showed the latest Home layout without horizontal overflow. No production credentials or record payloads were captured. An authenticated production record probe was intentionally not performed.

## Rollback

The pre-deploy S3 snapshot and Lambda code are retained at `/tmp/lawos-prod-deploy-2c4ad2e80-20260710T161934Z` on the deployment machine.

- S3 snapshot: 33 files
- Lambda rollback ZIP SHA-256: `56b408bedbc2e95d42a14a92130c692993470aa7e321e8d242ad8c24b7dc257e`
- Lambda ZIP integrity: passed
- S3 bucket versioning: disabled

Rollback restores the preserved Lambda ZIP and deployment-commit metadata, restores the previous `index.html`, invalidates CloudFront, and repeats the health/hash checks.

## Claim boundary

This receipt proves the bounded AWS production Web/API deployment only. It does not claim a signed desktop package release, public release, company-wide go-live, or `production_ready` status.

Machine-readable receipt: `docs/launch/aws-dashboard-web-api-deploy-2026-07-11.json`.
