# AI Reviewer Roster And Disable Authority Decision Brief

Status: decision_brief_blocked_pending_owner_approval_l1_w08_staffing_and_wave2_gate_inputs
Work package: LT-L6-W04
TUW: LT-L6-W04-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief is a decision input only. It does not name reviewers, does not grant
rollback or disable switch authority, does not activate AI, does not update
`docs/launch/launch-decision-register.md`, and does not claim LT-L6-W04-T01
completion.

Wave 1 remains AI off. Any Wave 2 AI opening must pass the later L9-W04 gate
and separate legal/privacy/provider prerequisites before activation.

## Required Inputs Before Approval

| Input ID | Required input | Current state |
| --- | --- | --- |
| AI-ROSTER-IN-01 | Owner-approved high-risk AI reviewer names and coverage areas | pending_owner_decision |
| AI-ROSTER-IN-02 | L1-W08 staffing decision for AI reviewer and backups | pending_human_decision |
| AI-ROSTER-IN-03 | Primary and backup disable switch authority | pending_owner_decision |
| AI-ROSTER-IN-04 | Primary and backup rollback authority | pending_owner_decision |
| AI-ROSTER-IN-05 | AI review SLA decision for response, edit/reject, and escalation | pending_owner_decision |
| AI-ROSTER-IN-06 | Register row ID/key authority for L6 AI human-review staffing decisions | pending_owner_or_governance_decision |

## Reviewer Coverage Slots

No person is assigned by this brief. Each row is a required coverage slot for
the owner-approved roster.

| Slot ID | Coverage area | Minimum named role required | Current state |
| --- | --- | --- | --- |
| AI-REVIEWER-01 | High-risk legal drafting or legal conclusion output | Named lawyer/reviewer with privilege and source-review authority | pending_owner_decision |
| AI-REVIEWER-02 | Privilege, confidentiality, or client-sensitive output | Named confidentiality reviewer or security/legal owner | pending_owner_decision |
| AI-REVIEWER-03 | HR-sensitive, candidate, salary, or evaluation output | Named HR/legal reviewer; Wave 1 remains off | pending_owner_decision |
| AI-REVIEWER-04 | M365/DMS source-scope and citation disputes | Named source/data reviewer | pending_owner_decision |
| AI-REVIEWER-05 | Permission, audit, and no-leak review | Named security/audit owner | pending_owner_decision |
| AI-REVIEWER-06 | Product/release decision for AI output state and UX | Named product or release owner | pending_owner_decision |

## Disable And Rollback Authority Slots

| Authority ID | Authority | Minimum named role required | Current state |
| --- | --- | --- | --- |
| AI-AUTH-01 | Primary disable switch authority | Named person/role allowed to disable AI feature access | pending_owner_decision |
| AI-AUTH-02 | Backup disable switch authority | Named backup with conflict/absence coverage | pending_owner_decision |
| AI-AUTH-03 | Primary rollback authority | Named release/operations owner allowed to invoke rollback path | pending_owner_decision |
| AI-AUTH-04 | Backup rollback authority | Named backup for rollback decision and execution coordination | pending_owner_decision |

## L9-W04 Wave 2 Opening Mapping

| L9-W04 item | T01 roster/authority input | Mapping state |
| --- | --- | --- |
| Provider DPA | Not owned by T01; must be linked before Wave 2 opening. | mapped_external_dependency |
| Sensitive-data routing block | Security/audit reviewer coverage plus legal/privacy gate evidence. | mapped_to_AI-REVIEWER-02_and_AI-REVIEWER-05 |
| Regression set passed | Product/release owner plus AI regression evidence before opening. | mapped_to_AI-REVIEWER-06 |
| Reviewer roster | High-risk reviewer coverage slots. | mapped_to_AI-REVIEWER-01_through_AI-REVIEWER-06 |
| Rollback/disable confirmation | Disable and rollback authority slots. | mapped_to_AI-AUTH-01_through_AI-AUTH-04 |
| Output status UI | Product/release owner plus L9 output-state evidence. | mapped_to_AI-REVIEWER-06 |

## AI Release Gate Seven-Condition Mapping

| Gate ID | Release gate condition | T01 dependency | Current state |
| --- | --- | --- | --- |
| AI-GATE-01 | Source scope verification | source/data reviewer coverage | pending_named_reviewer |
| AI-GATE-02 | Permission verification | security/audit owner coverage | pending_named_reviewer |
| AI-GATE-03 | Audit event verification | security/audit owner coverage | pending_named_reviewer |
| AI-GATE-04 | Regression set passed | product/release owner coverage | pending_named_reviewer |
| AI-GATE-05 | High-risk reviewer assigned | reviewer roster slots | pending_named_reviewer |
| AI-GATE-06 | Rollback and disable switch provided | disable/rollback authority slots | pending_named_authority |
| AI-GATE-07 | User-visible AI output state | product/release owner coverage | pending_named_reviewer |

## Decision Register Draft Input

Do not paste this into `docs/launch/launch-decision-register.md` until owner
evidence exists and the register key/row ID is approved.

| Field | Draft input |
| --- | --- |
| Proposed title | AI human-review roster and disable/rollback authority |
| Proposed owner | pending_owner_role |
| Proposed decision | pending_named_roster_and_authority_assignment |
| Basis | LT-L1-W08 staffing plan, LT-L6-W04 AI review operations, LT-L9-W04 Wave 2 opening gate |
| Date | pending_owner_approval_date |
| Approval signature | pending_owner_signature_reference |
| Status | not_registerable_until_owner_evidence_exists |

## Runbook Update Procedure After Approval

1. Add the owner-evidenced register row with approved row ID and approval
   signature reference.
2. Replace pending reviewer references in
   `docs/launch/runbooks/ai-review-operations.md` with approved roles or names.
3. Record primary and backup disable/rollback authority in the operations
   runbook.
4. Add approved AI review SLA values if the owner decision includes them, or
   keep SLA as a separate explicit blocker.
5. Update `docs/goal-closeout/lt-l6-w04/command-evidence.json` with the
   approval reference and roster/authority verification output.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| Named reviewer roster | Owner-approved names and coverage areas. |
| Disable/rollback authority | Owner-approved primary and backup authority slots. |
| L1-W08 staffing | Staffing decision must supply the AI reviewer/backup basis. |
| Register row authority | Approve how L6 AI staffing rows are represented in the launch decision register. |
| AI review SLA | Owner-approved response, edit/reject, and escalation values. |
