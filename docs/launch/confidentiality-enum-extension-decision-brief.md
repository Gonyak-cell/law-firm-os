# Confidentiality Enum Extension Decision Brief

Status: blocked_runtime_pending_owner_decision_resolved
Recorded at: 2026-06-18T10:11:17Z
Work package: LT-PRE-W05
Terminal TUW: LT-PRE-W05-T02

## Current Enum State

`packages/domain/src/entities.js` now defines:

```js
export const CONFIDENTIALITY_LEVELS = ["public", "internal", "confidential", "restricted", "privileged", "hr_restricted"];
```

The current enum has dedicated `privileged` and `hr_restricted` values approved by the Managing Partner/System Admin on 2026-06-19.

## Current Enum Usage Inventory

Command:

```sh
grep -rln "CONFIDENTIALITY_LEVELS" packages/ apps/ | sort
```

Output:

```text
packages/domain/src/entities.js
```

Usage file count: 1

## Related Risk Signals

The codebase already contains privilege-like redaction fields such as `privileged_note`, and the M365 runtime contract now records `privilege_classification_decision_resolved: true`. The source governance documents also call for confidentiality/privilege/HR-sensitive classification checks.

These signals support the need for a decision, but they do not themselves decide the canonical enum values.

## Candidate Value Schemes

| Option | Candidate closed list | Permission/audit impact | HR impact | Migration impact |
|---|---|---|---|---|
| Add privilege only | public, internal, confidential, restricted, privilege | Adds attorney-client privilege as a first-class permission and audit input. | HR-sensitive data still needs separate guardrails outside the enum. | Lowest enum expansion impact, but may leave HR classification split across policy fields. |
| Add privilege and hr_sensitive | public, internal, confidential, restricted, privilege, hr_sensitive | Adds privilege and HR sensitivity as explicit permission/audit inputs. | HR documents, payroll, candidate, evaluation, and leave data get a canonical classification. | Higher test/fixture impact, but aligns with HRX and PIPA-sensitive launch gating. |
| Add privilege and hr_restricted | public, internal, confidential, restricted, privilege, hr_restricted | Separates legal privilege from restricted HR data while preserving a conservative HR label. | HR-sensitive data becomes a stricter category than general restricted. | Requires explicit mapping from HR specs and fixtures. |
| Do not add privilege | public, internal, confidential, restricted | Keeps current code stable. | Leaves documented privilege/HR-sensitive controls outside enum. | Not recommended unless owner records a reason, because W05 requires a privilege-family decision. |

## Block Record

| ID | Owner role | Required decision | Blocking scope | Status |
|---|---|---|---|---|
| ESC-LT-PRE-W05-001 | Launch owner / data classification approver | Decide the closed confidentiality enum list and the application boundary before related runtime RP work | PRE-EXIT, permission/audit classification, M365 privilege field, HRX sensitive data, L2 enum alignment | resolved_owner_decision_recorded_runtime_pending |

## T02 Boundary

`docs/launch/confidentiality-enum-extension-spec.md` is now created because LT-PRE-W05-T02 has a decided value scheme. The spec records the closed list and application boundary without approving real HR or M365 runtime data use.

## Non-Weakening Boundary

This brief changes `CONFIDENTIALITY_LEVELS`, does not weaken existing four-value semantics, does not alter production fixtures, and does not claim M365/HR runtime readiness.

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
