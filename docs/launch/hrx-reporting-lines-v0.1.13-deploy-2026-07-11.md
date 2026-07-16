# HRX Reporting Lines and Desktop v0.1.13 Deployment Receipt

Status: AWS production deployed; desktop formal candidate published

This receipt records the correction of the People reporting lines requested on 2026-07-11. It does not claim a public stable desktop release, Windows Authenticode signing, owner final approval, or company-wide go-live.

## Reporting-line Verification

- Approved relationship corrections: 3
- Authenticated production matches: 3 of 3
- Identifiable employee or manager values recorded in this receipt: false

The repository roster validator, API/Lambda tests, authenticated production readback, and macOS packaged-app People roster, employee detail, and organization screen passed with the requested relationships. The Windows workflow passed packaging and dashboard-screen QA; it did not independently inspect the People reporting lines.

## Provenance and AWS

| Field | Value |
| --- | --- |
| HRX correction commit | `e0df8f50d` |
| Desktop version/artifact source | `e9a5b285f` |
| Release tag target / Windows QA head | `b2316e9b4` |
| Deployment receipt introduction | `58cb8f3a2` |
| Release branch | `codex/lcx-vltui-owner-approval-intake` |
| Release relation to `main` | branch-only prerelease; not contained in `origin/main` |
| Lambda | `matter-lawos-api-prod` |
| State | `Active` / `Successful` |
| Code SHA-256 | `oiDeEsw+GiZSYDnUK614SZmo1yeUPhFgwK4q1t6MYWU=` |
| Revision | `d129a728-eb4a-4ac4-ac9f-c02584fe88b1` |
| Runtime generation | `2026-07-11T06:04:06Z` |
| Reserved concurrency | `1` |
| Authenticated employee/source count | `10 / 10` |
| Reporting-line readback | `3 / 3` |
| Credential store restored | true |
| Token, password, PII, or secret returned | false |

## Web

| Field | Value |
| --- | --- |
| Bucket | `matter-lawos-web-prod-770880870480-apne2` |
| CloudFront | `E3MVAKX2DIR3CS` |
| Invalidation | `I67EPOER3COKOWDJRM3KQ2E342` / `Completed` |
| JavaScript | `assets/index-CYmd0u2r.js` |
| JavaScript SHA-256 | `90bfb3999da33b8d3fb6d13d4c4c4375ce39e22c64eb0675b3c084c39cc9e2a9` |
| Root / API health | `200 / 200` |
| Unauthenticated HRX | `401` |

## Desktop Formal Candidate

Release: `matter-desktop-v0.1.13-20260711-e9a5b285f`

The annotated release tag peels to `b2316e9b4` on `codex/lcx-vltui-owner-approval-intake`. This formal candidate is not represented as a release from `main`.

| Artifact | SHA-256 / state |
| --- | --- |
| macOS ZIP | `5db2bcc7edb68f1fd2ac9a409f0554cae7d8502c3f66f99fc4d34431adef6b49` |
| macOS DMG | `b3c231ebdf287995daef3801660074292dd047517db2aecbfa0d92b3debc7bf5` |
| Windows installer | `b97c3ae048d9a720ad7fac460aa0f07df17de864a5ad5763a199a0d360bdfbad` |
| Windows blockmap | `78118a5447a360f4dd75e7abd91a2a1e69069c131769cff05c8be6c1c8cbfac4` |
| Portable checksum verification | 9 of 9 passed |
| macOS Developer ID / notarization | passed / accepted |
| Windows packaged dashboard QA | GitHub run `29142400909` passed |
| Windows Authenticode | false |
| Native Windows installer execution | not claimed |

## Rollback

- Lambda SHA-256 before this correction: `2c5e0ce12ba26ff6c00b27e834bd68c7919dad98634593d279e5887d045e4062`
- S3 rollback object count: 38
- Durable rollback root: `~/Library/Application Support/LawFirmOS/deploy-rollbacks/lawos-hrx-reporting-lines-e0df8f50d`
- The production HRX reconciliation created a store-side backup before writing.

## Claim Boundary

- AWS production deployed: true
- Desktop formal candidate published: true
- Public stable desktop release: false
- Owner final approval: false
- Company-wide go-live: false
