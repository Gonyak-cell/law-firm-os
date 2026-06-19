# Confidentiality Enum Extension Spec

Recorded on: 2026-06-19

Decision evidence: `docs/launch/g1-owner-decisions-2026-06-19.md#mat-dec-08`

## Closed List

| Value | Category | Boundary |
| --- | --- | --- |
| `public` | baseline | Existing value preserved. |
| `internal` | baseline | Existing value preserved. |
| `confidential` | baseline | Existing value preserved. |
| `restricted` | baseline | Existing value preserved. |
| `privileged` | stricter legal privilege | Attorney-client privileged or legal privilege material. |
| `hr_restricted` | stricter HR sensitivity | HR-sensitive or employment-sensitive material. |

## Application Boundary

- Existing records using the original four values remain valid.
- New legal privilege material should use `privileged` where a dedicated privilege classification is required.
- New HR-sensitive material should use `hr_restricted` where a dedicated HR-sensitive classification is required.
- Permission, audit, M365, and HR runtime behavior still requires separate evidence before go-live.

## Non-Weakening Rule

The added values may only preserve or increase access restrictions. They must not downgrade `restricted`, bypass matter ACL, or allow production HR/privileged data into runtime paths without the relevant launch gate evidence.
