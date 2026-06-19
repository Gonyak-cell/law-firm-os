# Break-Glass Runbook

Status: draft_blocked_pending_l1_w05_approval_governance_and_l5_w02_validation
Work package: LT-L6-W03
TUW: LT-L6-W03-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This runbook is an operating draft only. It does not grant break-glass access,
does not create an emergency override runtime, does not assign approvers, does
not run a tabletop exercise, and does not mutate permissions. Production
break-glass remains prohibited until owner-approved runtime, tabletop, and
governance evidence exists.

Break-glass is not partner override. Partner override policy belongs to OQ-010;
break-glass remains an L6 emergency procedure with separate approval, time
limit, audit trail, expiry, and post-incident review.

## Required Five Elements

| Element ID | Required element | Draft treatment | Current state |
| --- | --- | --- | --- |
| BG-ELEM-01 | Activation conditions | Narrow emergency conditions only; convenience access is prohibited. | drafted_pending_approval |
| BG-ELEM-02 | Approver | Must align to LT-L1-W05 approval governance and named real-person roles. | pending_l1_w05 |
| BG-ELEM-03 | Time limit | Must be time-boxed at activation and no longer than owner-approved RP16 limit. | pending_owner_approved_limit |
| BG-ELEM-04 | Post-audit review | Mandatory review after revocation with audit evidence and corrective actions. | drafted_pending_l5_w02 |
| BG-ELEM-05 | Record form | Required fields listed in this runbook; final form pending tabletop. | drafted_pending_tabletop |

## Activation Conditions

Break-glass may be requested only when normal access/request paths are
insufficient and delay creates client, legal, security, or operational harm.

| Condition ID | Allowed trigger | Minimum proof before request |
| --- | --- | --- |
| BG-COND-01 | S1 incident response requires restricted matter/document access to stop active harm. | Incident ID, affected system, and why normal access cannot wait. |
| BG-COND-02 | Ethical Wall false-positive blocks urgent client/legal duty and matter owner cannot complete normal approval in time. | Matter-safe reference, denied action, and urgency basis. |
| BG-COND-03 | Audit/security investigation requires temporary read-only evidence access. | Security owner request and evidence scope. |
| BG-COND-04 | Recovery/rollback requires scoped admin access during a declared outage. | Change or incident reference and rollback scope. |
| BG-COND-05 | Court, regulator, or client-imposed deadline requires urgent evidence preservation. | Deadline reference and preservation scope. |
| BG-COND-06 | Partner preference, convenience, broad exploration, AI context expansion, HR-sensitive access, or portal access bypass. | Prohibited; route to normal approval or owner decision. |

## Procedure

Each step must produce an audit or evidence record before tabletop completion.
The procedure is not executable until LT-L5-W02 validation and LT-L1-W05
approval governance are complete.

| Step ID | Step | Required output | Expected audit event |
| --- | --- | --- | --- |
| BG-STEP-01 | Open break-glass request with reason, scope, urgency, and affected matter/object safe identifiers. | request record | break_glass.requested |
| BG-STEP-02 | Confirm normal permission request path is insufficient for the emergency. | normal-path insufficiency note | break_glass.normal_path_bypassed_with_reason |
| BG-STEP-03 | Obtain approval from the owner-approved break-glass approver role. | approval record | break_glass.approved |
| BG-STEP-04 | Set the minimum access scope, action set, and expiry time before access is granted. | scoped grant specification | break_glass.scope_defined |
| BG-STEP-05 | Grant temporary access through the approved runtime path only after approval and TTL exist. | temporary grant record | break_glass.activated |
| BG-STEP-06 | Notify incident/security owner and affected matter owner role where confidentiality permits. | notification record | break_glass.notification_sent |
| BG-STEP-07 | Monitor usage during the active window and preserve access/use events. | usage event list | break_glass.usage_observed |
| BG-STEP-08 | Revoke access at expiry or earlier when emergency purpose is complete. | revocation record | break_glass.revoked |
| BG-STEP-09 | Verify the same actor is denied again after revocation. | post-revocation deny evidence | break_glass.post_revoke_verified |
| BG-STEP-10 | Complete post-audit review with root cause, necessity, proportionality, and corrective actions. | post-audit review | break_glass.review_completed |

## Audit Mapping

| Audit ID | Procedure step | Required audit fields |
| --- | --- | --- |
| BG-AUD-01 | BG-STEP-01 | actor, requester, target scope, reason, urgency, timestamp |
| BG-AUD-02 | BG-STEP-02 | actor, normal path attempted or unavailable, insufficiency reason |
| BG-AUD-03 | BG-STEP-03 | approver, approval basis, approval timestamp, decision reference |
| BG-AUD-04 | BG-STEP-04 | scope, actions, expiry timestamp, risk classification |
| BG-AUD-05 | BG-STEP-05 | grant actor, target actor, before/after permission state, expiry |
| BG-AUD-06 | BG-STEP-06 | notified roles, timestamp, confidentiality-safe message reference |
| BG-AUD-07 | BG-STEP-07 | accessed object ids, actions, timestamps, result |
| BG-AUD-08 | BG-STEP-08 | revoke actor, revoke timestamp, reason, final state |
| BG-AUD-09 | BG-STEP-09 | denied action, actor, target scope, denial result |
| BG-AUD-10 | BG-STEP-10 | reviewer, findings, corrective actions, closure decision |

## Record Form

| Form Field ID | Required field |
| --- | --- |
| BG-FORM-01 | Request ID |
| BG-FORM-02 | Incident/change/security reference |
| BG-FORM-03 | Requester role |
| BG-FORM-04 | Target actor |
| BG-FORM-05 | Matter/object safe scope |
| BG-FORM-06 | Requested actions |
| BG-FORM-07 | Emergency reason |
| BG-FORM-08 | Approver role and approval reference |
| BG-FORM-09 | Start timestamp |
| BG-FORM-10 | Expiry timestamp |
| BG-FORM-11 | Revocation timestamp |
| BG-FORM-12 | Post-audit review link |

## L5-W02 Alignment Placeholder

| Alignment ID | Required L5-W02 evidence | Current state |
| --- | --- | --- |
| BG-L5-01 | Unauthorized override attempt denied and audited. | pending_l5_w02 |
| BG-L5-02 | Approved override activates only after approval record exists. | pending_l5_w02 |
| BG-L5-03 | Expiry or revocation restores denial. | pending_l5_w02 |
| BG-L5-04 | L5 evidence package path is cited and procedure mismatch count is 0. | pending_l5_w02 |

## Time Limit Rule

The final numeric maximum must be owner-approved under LT-L1-W05/L6 governance
and must satisfy the RP16 break-glass time-limit gate. Until that value exists,
each draft request must record `pending_owner_approved_limit` and cannot be
treated as executable production authority.

When the approved limit exists, access must expire at the earlier of:

1. the approved maximum duration,
2. the time the emergency purpose is complete,
3. manual revocation by the incident/security owner,
4. denial by post-audit reviewer or approver.

## Non-Weakening Rationale

This draft does not weaken existing Ethical Wall or permission controls because
it adds constraints rather than bypassing them: separate approval, minimum
scope, mandatory expiry, full audit mapping, post-revocation denial check, and
post-audit review. Any runtime implementation must fail closed when approval,
scope, expiry, or audit append is missing.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L1-W05 | Approval governance and real-person approver roles are not owner-approved. |
| LT-L5-W02-T02 | Emergency override validation evidence does not exist in this launch evidence tree. |
| LT-L6-W03-T02 | Tabletop activation, expiry, revocation, and post-audit evidence are not complete. |
| LT-L2-W02/LT-L2-W03 | Permission runtime and audited write paths are not ready. |
