# Confidentiality Enum Extension Decision Brief

Status: blocked_pending_mat_dec_08
Recorded at: 2026-06-18T10:11:17Z
Work package: LT-PRE-W05
Terminal TUW: LT-PRE-W05-T02

## Current Enum State

`packages/domain/src/entities.js` currently defines:

```js
export const CONFIDENTIALITY_LEVELS = ["public", "internal", "confidential", "restricted"];
```

The current enum has no dedicated `privilege` value and no dedicated HR-sensitive value.

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

The codebase already contains privilege-like redaction fields such as `privileged_note`, and the M365 runtime contract has `privilege_classification_decision_resolved: false`. The source governance documents also call for confidentiality/privilege/HR-sensitive classification checks.

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
| ESC-LT-PRE-W05-001 | Launch owner / data classification approver | Decide the closed confidentiality enum list and the application boundary before related runtime RP work | PRE-EXIT, permission/audit classification, M365 privilege field, HRX sensitive data, L2 enum alignment | open |

## T02 Boundary

`docs/launch/confidentiality-enum-extension-spec.md` is not created by this blocked record because LT-PRE-W05-T02 depends on a decided value scheme. Without the closed list, any value-by-permission/audit/HR mapping table would be synthetic.

## Non-Weakening Boundary

This brief does not change `CONFIDENTIALITY_LEVELS`, does not weaken existing four-value semantics, does not alter fixtures, and does not claim the privilege/HR-sensitive decision is complete.

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future work. This waiver is recorded as `review_waived_by_user` and is not valid review evidence.
