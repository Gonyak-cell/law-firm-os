# Incident SLA And On-Call Decision Brief

Status: decision_brief_blocked_pending_owner_approval_l1_w08_staffing_and_l3_w06_monitoring
Work package: LT-L6-W01
TUW: LT-L6-W01-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief is a decision input only. It does not approve S1-S4 SLA values, does
not assign named on-call staff, does not update
`docs/launch/launch-decision-register.md`, does not configure alert routing, and
does not replace the SLA placeholders in
`docs/launch/runbooks/incident-response-runbook.md`.

The launch decision register currently permits only owner-evidenced `decided`
or timed `deferred(시한 명기)` rows. Until owner evidence exists, this brief must
remain outside the register and LT-L6-W01-T02 remains open.

## Required Inputs Before Approval

| Input ID | Required input | Current state |
| --- | --- | --- |
| SLA-IN-01 | Owner selection of S1-S4 response and recovery targets | pending_owner_decision |
| SLA-IN-02 | L1-W08 staffing plan with named primary and backup roles | pending_human_decision |
| SLA-IN-03 | L3-W06 monitoring and alert-routing stack | pending_stack_decision_and_activation |
| SLA-IN-04 | Decision-register row ID/key extension for L6 operations decisions | pending_owner_or_governance_decision |
| SLA-IN-05 | Approved launch support window and after-hours policy | pending_owner_decision |

## Candidate SLA Matrix

These values are candidates for owner review. They are not approved SLA values
and must not be pasted into the incident runbook until LT-L6-W01-T02 has real
approval evidence.

| Severity | Candidate first response | Candidate mitigation/workaround | Candidate recovery target | Escalation route |
| --- | --- | --- | --- | --- |
| S1 Critical | 15 minutes inside approved support coverage; emergency route outside coverage only if approved | 1 hour containment decision | 4 hours to restore core safe operation or invoke rollback/disable path | primary on-call -> incident commander -> security/audit owner -> launch approval governance |
| S2 High | 1 hour inside approved support coverage | 4 hours workaround or rollback decision | 1 business day to restore normal operation or publish workaround | primary on-call -> operations lead -> release/rollback owner |
| S3 Medium | 1 business day | 2 business days workaround or scheduled fix decision | 5 business days or next approved maintenance window | support owner -> feature owner -> operations lead |
| S4 Low | 2 business days | Not required unless repeated or blocking training/support | backlog or documentation update by agreed priority | support owner -> documentation/training owner |

## On-Call Assignment Slots

No person is assigned by this brief. Each slot requires a named owner or named
role from the approved L1-W08 staffing plan.

| Slot ID | Assignment slot | Minimum requirement | Current state |
| --- | --- | --- | --- |
| ONCALL-01 | Primary support/on-call | Named person or named staffed role for first response | pending_l1_w08 |
| ONCALL-02 | Backup support/on-call | Named backup for absence or conflict | pending_l1_w08 |
| ONCALL-03 | Incident commander | Named role authorized to declare severity and coordinate response | pending_l1_w08 |
| ONCALL-04 | Security/audit owner | Named role for suspected leakage, audit-chain, or permission incidents | pending_l1_w08 |
| ONCALL-05 | Communications owner | Named role for user-facing updates and status cadence | pending_l1_w08 |
| ONCALL-06 | Release/rollback owner | Named role authorized to execute rollback/disable procedures after approval | pending_l1_w08 |

## Owner Decision Choices

| Choice ID | Choice | Use when | Register effect if approved |
| --- | --- | --- | --- |
| SLA-CHOICE-A | Approve the candidate matrix for pilot launch support coverage | Owner wants a lightweight 1-tenant operating model with S1/S2 urgency but no unapproved 24/7 promise | Add owner-evidenced decision row and update runbook placeholders |
| SLA-CHOICE-B | Approve business-hours-only SLA values | Owner wants a lower-coverage support promise and explicit after-hours exclusion | Add owner-evidenced decision row and adjust S1/S2 escalation language |
| SLA-CHOICE-C | Approve enhanced coverage values | Owner wants stricter response targets or after-hours coverage | Add owner-evidenced decision row, update staffing/budget dependencies, and update runbook placeholders |

## Decision Register Draft Input

Do not paste this into `docs/launch/launch-decision-register.md` until owner
evidence exists and the register key/row ID is approved.

| Field | Draft input |
| --- | --- |
| Proposed title | Incident response SLA and on-call assignment |
| Proposed owner | pending_owner_role |
| Proposed decision | pending_owner_selection_of_SLA_CHOICE_A_B_or_C |
| Basis | LT-L6-W01 incident runbook, LT-L1-W08 staffing plan, LT-L3-W06 monitoring stack, approved support coverage |
| Date | pending_owner_approval_date |
| Approval signature | pending_owner_signature_reference |
| Status | not_registerable_until_owner_evidence_exists |

## Runbook Update Procedure After Approval

1. Add the owner-evidenced register row with an approved row ID and approval
   signature reference.
2. Replace all four `SLA placeholder` rows in
   `docs/launch/runbooks/incident-response-runbook.md` with approved response
   and recovery values.
3. Add the named on-call assignment table to the incident runbook using approved
   L1-W08 staffing values.
4. Update `docs/goal-closeout/lt-l6-w01/command-evidence.json` with the
   register row, placeholder search result `0`, and the approval reference.
5. Only then schedule LT-L6-W01-T03 tabletop and simulated incident handling.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| Owner approval | Select SLA choice and provide approval evidence. |
| L1-W08 staffing | Provide named primary/backup roles and escalation owners. |
| Register row authority | Approve how L6 decision rows are represented in the launch decision register. |
| Runbook placeholder replacement | Replace placeholders only after approval. |
| L3-W06 monitoring | Alert routing must exist before SLA operation can be rehearsed. |
