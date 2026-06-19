# G1 Owner Decisions Receipt

Recorded on: 2026-06-19

Owner: jwsuh@amic.kr / Managing Partner/System Admin

## Boundary

- This receipt does not approve go-live.
- This receipt does not mark `G1-E02` or `G1-E03` as `evidence_satisfied`.
- This receipt does not approve any owner deferral.
- Runtime, production data, M365 admin consent, Graph scope, and hardening evidence gates remain separate.

## MAT-DEC-03

Decision: SharePoint/OneDrive is approved as the Law Firm OS document original storage.

Effect:

- The MAT-DEC-03 owner decision blocker is resolved.
- The M365 runtime contract records `storage_decision_resolved: true`.
- Storage-dependent M365 items are no longer blocked by the storage decision itself.
- M365 admin consent, Graph scope reconciliation, SharePoint/OneDrive provisioning, and runtime evidence remain required.

## MAT-DEC-08

Decision: Add `privileged` and `hr_restricted` to the canonical confidentiality enum.

Canonical enum:

| Value | Meaning |
| --- | --- |
| `public` | Public or non-sensitive material |
| `internal` | Internal firm material |
| `confidential` | Client or matter confidential material |
| `restricted` | Highly restricted non-HR/non-privilege material |
| `privileged` | Attorney-client privileged or legal privilege material |
| `hr_restricted` | HR-sensitive or employment-sensitive material |

Effect:

- The MAT-DEC-08 owner decision blocker is resolved.
- The existing four values remain valid.
- The two new values are stricter classifications.
- M365 privilege runtime evidence, HR runtime data gates, and permission/audit mapping evidence remain required.

## G1-E03

Decision: the 256 G1 hardening candidate references are authorized for verifier adjudication.

The remaining 16 gaps may be handled only by one of these concrete routes:

| Route | Meaning |
| --- | --- |
| Additional evidence | Link a real control-specific evidence reference. |
| Applicability exclusion | Record why the RP/control cell does not apply. |
| Risk acceptance with follow-up | Record owner-approved risk acceptance, follow-up owner, and revisit gate. |

This decision does not satisfy G1-E03. It only authorizes the adjudication path.
