# Permission Request and Change Procedure

Status: draft_blocked_pending_l2_w02_permission_runtime_and_l1_w05_approval_governance
Work package: LT-L6-W02
TUW: LT-L6-W02-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This procedure is an operating draft. It does not implement Admin Console
permission changes, does not mutate permission policy, does not grant or revoke
access, does not create audit events, and does not claim LT-L6-W02 or
LT-L6-W02-T01 completion.

Actual execution depends on `WP:LT-L2-W02` server-side permission context,
`LT-L2-W03` audited write paths, and `LT-L1-W05` approval governance. Until
those are approved and implemented, the procedure is documentation only.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/06_권한_보안_감사_거버넌스.md` sections 2, 4, 6, and 9 | Permission domains, evaluation order, Permission Change audit fields, and verification gates. |
| `workbook/matter-post-cp-launch-plan.md` L6-2 and L6-5 | Support procedure requires permission request/change flow; policy change requires approval, CI, deploy, and regression. |
| `docs/product-ui/ia/admin-console.md` | Admin Console IA limits Wave 1 admin to user directory, permission view, policy read, and audit read until runtime work exists. |
| `contracts/permission-kernel-contract.json` | Permission/audit binding remains no-write for policy mutation and audit ledger writes until later runtime work. |

## Procedure Steps

| ID | Step | Responsible role | Required input | Required output | Blocked without |
| --- | --- | --- | --- | --- | --- |
| PR-STEP-01 | Request | Requester plus support/on-call role | target user/group, target matter/object, requested action, reason, duration, urgency, source ticket | permission request record with safe identifiers only | support channel opened by LT-L6-W02-T02 |
| PR-STEP-02 | Approval | Approver role defined by LT-L1-W05 governance | request record, matter owner/security context, risk classification, emergency flag | approve, reject, or request-more-info decision with reason | owner-approved approval governance |
| PR-STEP-03 | Apply | System admin role through approved Admin Console route | approved request, pre-change permission snapshot, rollback note | applied change record or no-op rejection; no direct DB/script path allowed | LT-L2-W02 permission runtime and LT-L2-W03 audited write path |
| PR-STEP-04 | Audit confirmation | Security owner or delegated reviewer | post-change permission snapshot, audit event reference, before/after diff, reason | audit confirmation record and closure note | durable audit store/read path |

## Admin Console Route Requirement

| Rule | Required behavior |
| --- | --- |
| Single approved route | Routine permission changes must go through the future Admin Console permission-change flow after it exists. |
| No direct DB edits | Direct database updates, ad hoc scripts, console mutations, and local fixture changes are not approved operating paths. |
| No policy mutation by document | Editing this runbook, a contract JSON file, or an IA document does not change live permission policy. |
| Emergency exception | Break-glass or emergency override must use the separate approved break-glass runbook once available. |

## Audit Event Requirements

The local governance spec requires Permission Change audit fields:
`actor`, `target`, `before/after`, and `reason`.

| Field | Required rule |
| --- | --- |
| actor | The human or service principal applying the change; no shared account placeholder. |
| target | User/group and matter/object scope using safe identifiers. |
| before | Effective permission state before the change. |
| after | Effective permission state after the change. |
| reason | Business reason tied to request and approval record. |
| approval reference | Approval decision ID or ticket reference. |
| rollback note | How to revert the change if it is wrong or time-limited. |

## Regression Map for Permission Policy Changes

If a request changes permission policy behavior rather than one access grant,
the change is treated as code/deployment change, not routine support action.

| ID | Regression area | Required check |
| --- | --- | --- |
| REG-PERM-01 | UI | Permission badges, denied states, and review_required states still render fail-closed. |
| REG-PERM-02 | API | Unauthorized direct calls deny without leaking protected object detail. |
| REG-PERM-03 | Search | Restricted objects are excluded from search results and counts. |
| REG-PERM-04 | Portal | Internal notes, emails, AI output, and restricted matter data remain hidden from portal users. |
| REG-PERM-05 | AI | AI context includes only sources the actor can access; Wave 1 AI remains off. |
| REG-PERM-06 | Vault | Export/import excludes wall-restricted or unauthorized content. |
| REG-PERM-07 | HR | Salary, evaluation, candidate, and HR sensitive data remain separately gated. |

## Request Record Template

| Field | Required |
| --- | --- |
| Request ID | yes |
| Requester role | yes |
| Target user/group | yes |
| Target matter/object scope | yes |
| Requested action | yes |
| Reason | yes |
| Duration or expiry | yes |
| Risk classification | yes |
| Approver role | yes |
| Decision and reason | yes |
| Before/after audit reference | yes after runtime exists |
| Closure note | yes |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| No server-side permission mutation route | LT-L2-W02/LT-L2-W03 remain prerequisites. |
| No approved final approver model | LT-L1-W05 is still pending owner approval. |
| No support channel proof | LT-L6-W02-T02 has not opened or tested support intake. |
| No durable audit confirmation | Audit write/read path remains a later L2/L3/L5 dependency. |
