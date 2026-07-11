# HRX Reporting-line v0.1.14 Closeout Receipt

Status: AWS correction deployed; desktop formal candidate published

This sanitized receipt records three owner-requested reporting-line corrections without repeating identifiable employee or manager values.

## Provenance

| Boundary | Value |
| --- | --- |
| HRX idempotence correction / Lambda source | `d2bf615ee` |
| Desktop version source / Windows QA head | `c30dfe525` |
| Annotated release tag target | `66a75ebdc` |
| Closeout receipt introduction | `546632cf4` |
| Release branch | `codex/lcx-vltui-owner-approval-intake` |
| Contained in `origin/main` | false |

## Verification

| Check | Result |
| --- | --- |
| Requested relationship count | 3 |
| Authenticated production match | 3 of 3 |
| Packaged macOS People roster/detail/org QA | PASS |
| Reconciliation first run | 3 profile fingerprints updated |
| Reconciliation second run | 0 updates; before/after store hash identical |
| Manual `effective_to` preservation test | PASS |
| Unrelated manual manager preservation test | PASS |
| Positive authenticated roster gate test | PASS, 3 of 3 |
| Full repository tests | 4,173 passed |

## AWS

| Field | Value |
| --- | --- |
| Lambda | `matter-lawos-api-prod` |
| Deployment commit | `d2bf615ee` |
| State | `Active` / `Successful` |
| Code SHA-256 | `2BiLXBQmTKPi90KcdWGWjghKdCtlJIC85+0SvSCP+sU=` |
| Revision | `f2586478-88ac-4980-a505-0a232d10f60b` |
| Runtime generation | `2026-07-11T06:29:12Z` |
| Reserved concurrency | `1` |
| Credential store restored | true |
| Token, password, PII, or secret returned | false |

Rollback root: `~/Library/Application Support/LawFirmOS/deploy-rollbacks/lawos-hrx-idempotence-d2bf615ee`

## Desktop v0.1.14

Release: `matter-desktop-v0.1.14-20260711-c30dfe525`

| Artifact | SHA-256 / state |
| --- | --- |
| macOS ZIP | `b03c06706569d45077492861ccf6d6e261235c305bdce596ae8966d91f0eb016` |
| macOS DMG | `2aa55ee6eab72a44e85da42d275e8703b40cd45e470b34ff7854e8e9ad5988fc` |
| Windows installer | `89f0be0d7d8655b7cd11233dbdd5dee1e60a30aa2a1fa066497fbe771690331f` |
| Windows blockmap | `198ebeed14c71c769ad742b96f068b4517a0f96fcbb6ef1500a8830f55491fb6` |
| Portable checksum verification | 9 of 9 passed |
| macOS Developer ID / notarization | passed / accepted |
| Windows dashboard package QA | GitHub run `29142948138` passed |
| Windows People relationship QA | not independently run |
| Windows Authenticode | false |

The earlier v0.1.13 prerelease is marked superseded and must not be used for validation or rollout.

## Claim Boundary

- AWS production correction deployed: true
- Desktop formal candidate published: true
- Public stable desktop release: false
- Owner final approval: false
- Company-wide go-live: false
