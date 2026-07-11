# Matter UI, People, and Desktop v0.1.12 Deployment Receipt

Status: AWS production deployed; desktop formal candidate published

This receipt records the 2026-07-11 deployment of the current People UI/API state and the preparation of Matter Desktop `0.1.12`. It does not claim a public stable desktop release, Windows Authenticode signing, native Windows installation QA, owner final approval, or company-wide go-live.

## Source

| Field | Value |
| --- | --- |
| Release | `0.1.12` |
| Release ID | `matter-desktop-v0.1.12-20260711-2eb4e7ab6` |
| Release source commit | `2eb4e7ab6` |
| Deployed API commit | `d04ce78e9` |
| AWS account | `770880870480` |
| Region | `ap-northeast-2` |
| Profile | `matter-prod-deploy-admin` |

## Desktop Candidate

| Artifact | SHA-256 / state |
| --- | --- |
| macOS ZIP | `1039e0e0480974d51d34b7ee32747b591e5d4727ab4d58a96391e5f53ffc6789` |
| macOS DMG | `2b4732b46768f6dbeec0cb0c9aadd9f2aa425c821695e6721d48fbf53485ac62` |
| Windows installer | `f479f66b944cc8026317402ca907a93e57195f962189bac88d4638cd57c5b3a1` |
| Windows blockmap | `0a4a0aeff78d24a752bc579c662fbc829f8815f9e155df83edfd77e30715e79b` |
| Portable `shasum -c` | 9 of 9 passed |
| macOS signing and notarization | passed |
| Windows Authenticode | false |
| Native Windows install smoke | not run on Darwin |

## AWS API

| Field | Value |
| --- | --- |
| Function | `matter-lawos-api-prod` |
| Runtime | `nodejs22.x` |
| State | `Active` |
| Last update | `Successful` |
| Code SHA-256 | `LF4M4Suib/bACyfoNL1ox5GdrZhjRZPSeeWIfQReQGI=` |
| Revision | `f45bb6f5-5598-457b-a96f-0170e4f15744` |
| Deployment commit | `d04ce78e9` |
| Reserved concurrency | `1` |
| HRX write serialization | `reserved-concurrency-1` |
| Runtime generation | `2026-07-11T05:50:00Z` |

## HRX Reconciliation and Authenticated Smoke

The first post-deploy authenticated probe correctly detected that the operational HRX store still contained 9 members and one of the two required reporting lines. The approved direct-invoke reconciliation created one employee and one employment profile, reconciled nine existing profiles, and created a backup of the store before writing.

The final authenticated probe passed with:

- Login and session: HTTP 200
- HRX employee read: HTTP 200
- Employee count: 10
- Roster-source count: 10
- Required reporting lines: 2 of 2
- Credential store restored after the probe: true
- Token, password, employee PII, or secret material returned: false

Because the operational HRX store is file-backed, the Lambda was then constrained to one reserved concurrent execution and its runtime generation was advanced. After the old execution environment drained, a second reconciliation was a no-op at the store level: 10 employees remained, no employees were created or changed, and the before/after store SHA-256 values were identical (`b6f17ab449d1b146e0ea56b082011e215f9d9ee43916036c83a96516c39e7948`). Two authenticated probes, separated by ten seconds, both retained 10 employees, 10 roster-source references, and both required reporting lines. This is the deployed serialization boundary for this file-backed store; it is not a database-level concurrency guarantee.

## Web and CloudFront

| Field | Value |
| --- | --- |
| Bucket | `matter-lawos-web-prod-770880870480-apne2` |
| Distribution | `E3MVAKX2DIR3CS` |
| Invalidation | `IBMQNRDDDT33LYLILJPU8UNCE3` |
| Invalidation status | `Completed` |
| JavaScript | `assets/index-DE9ws8IM.js` |
| JavaScript SHA-256 | `7935c06dce8a9104bcaba55e676eb14013b3acf7a9502c5214378ecec05e5b97` |
| Stylesheet | `assets/index-BtzWKNPR.css` |
| Stylesheet SHA-256 | `de25a72f4c43ee4b4956ccd9bacaa75713ee0af18a20f447f859d774cf3eb72b` |

The browser smoke loaded the current JavaScript, rendered the People surface, distinguished an unauthenticated API error from an empty roster, and reported zero page or HTTP 5xx errors.

## Rollback

- Pre-deploy Lambda SHA-256: `6ce47feffa9e17538c09d15ef3efd399b0b02b7e0a68e0ccf2a6316128d39702`
- Pre-reconciliation Lambda SHA-256: `4aad4c332d57856006e295c3bf6a38d8c6306288489836bdf861298f40d7c160`
- S3 rollback object count: 37
- Durable local copy: `~/Library/Application Support/LawFirmOS/deploy-rollbacks/lawos-prod-deploy-19e47a8c4-20260711T053019Z`
- The HRX reconciliation also created a store-side backup before the write.

## Claim Boundary

- AWS production deployed: true
- Desktop formal candidate published: true
- Public stable desktop release: false
- Company-wide go-live: false
- Owner final approval: false

Companion JSON: `docs/launch/aws-ui-people-desktop-v0.1.12-deploy-2026-07-11.json`
