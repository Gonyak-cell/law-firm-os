# Work Queue IA

Status: draft_completed_pending_l1_w01_scope_decision
Work package: LT-L4-W01
TUW: LT-L4-W01-T06
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This IA document defines the Work Queue lanes for later UI work. It does not
implement `apps/web`, does not open a Work Queue route, does not create write
APIs, and does not claim LT-L4-W01 completion. Runtime gap evidence still shows
no dedicated Work Queue API route, no persistent queue runtime, no authz-backed
Work Queue action, and no audit-backed Work Queue mutation.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/21_UI_화면_사용자흐름.md` §1 | Source row: Work Queue for internal users with my task, overdue, review needed, approval request, HR task. |
| `workbook/matter-post-cp-launch-plan.md` §5 L1-1 | Wave cutoff and HR separate-track boundary. |
| `docs/launch/runtime-gap-report.md` | Evidence that Work Queue runtime routes and writes are absent. |
| `contracts/permission-kernel-contract.json` | Permission state vocabulary and fail-closed handling. |

## Lane IA Table

| ID | Lane | Data source | Sorting | State transition actions | Permission handling | Backend WP dependency |
| --- | --- | --- | --- | --- | --- | --- |
| WQ-01 | My Tasks | Future `GET /work-queue?lane=my_tasks`; task owner = current principal; excludes HR task type in Wave 1 | Due date asc, risk desc, updated_at desc | start, pause, mark blocked, mark done, request review | allow: show only current principal tasks; denied: lane hidden; review_required: show review-required lane state without task details | LT-L2-W03 write APIs; LT-L2-W04 work queue runtime; LT-L2-W02 permission context |
| WQ-02 | Overdue | Future `GET /work-queue?lane=overdue`; due_at < now and status not done/cancelled | Due date asc, severity desc, matter priority desc | reschedule, mark blocked, escalate, request owner update | allow: show overdue tasks within accessible matters; denied: hide lane data; review_required: suppress details and show review-required state | LT-L2-W03 write APIs; LT-L2-W04 deadline/task runtime; LT-L2-W02 permission context |
| WQ-03 | Review Needed | Future `GET /work-queue?lane=review_needed`; review_required or approval_required workflow items | Risk desc, requested_at asc, deadline asc | approve, reject, return for changes, claim review | allow: reviewers see assigned/eligible reviews; denied: hide lane data; review_required: item stays pending without write-back | LT-L2-W03 review write path; LT-L2-W04 workflow runtime; LT-L1-W05 approval governance |
| WQ-04 | Approval Requests | Future `GET /work-queue?lane=approval_requests`; approval request items requiring approver role | Requested_at asc, risk desc, deadline asc | approve, reject, request more info, delegate if allowed | allow: approver role only; denied: lane count 0 and no actions; review_required: no final action controls | LT-L2-W02 role/permission context; LT-L2-W03 approval write path; LT-L1-W05 approval governance |

## HR Task Exclusion

HR task lane is Wave 1 excluded under the HR separate track.

| Rule | Required behavior |
| --- | --- |
| No HR lane | Work Queue renders exactly 4 lanes in Wave 1: My Tasks, Overdue, Review Needed, Approval Requests. |
| No HR sensitive data | HR salary, evaluation, candidate, leave, attendance, and payroll tasks do not appear in any Wave 1 lane. |
| Future gate | HR task handling requires HR sensitivity validation, deterministic rule-engine boundaries, and owner HR scope decision before activation. |
| Empty result | If the backend later returns HR task rows during Wave 1, the UI must discard them and record a blocked implementation finding. |

## State Transition Rules

| Transition family | Required behavior |
| --- | --- |
| User task actions | Status changes call a write API and refresh the lane after success. No optimistic permanent mutation is allowed before server success. |
| Review actions | Review and approval actions must require eligible reviewer/approver role and create audit evidence. |
| Failure handling | Server 4xx/5xx keeps the lane in its previous state and displays an error state. Partial state is not allowed. |
| Audit | Every successful transition must map to a non-bypassable audit event once LT-L2-W03 is implemented. |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| No dedicated Work Queue route | `docs/launch/runtime-gap-report.md` states Work Queue has no dedicated route. |
| No persistent queue runtime | Runtime gap RTG-001 for Work Queue is absent. |
| No authz-backed Work Queue action | Runtime gap RTG-002 for Work Queue is absent. |
| No audit-backed Work Queue mutation | Runtime gap RTG-003 for Work Queue is absent. |

## Permission States

| State | Screen rule |
| --- | --- |
| allow | Render lane rows and controls allowed for the current role and matter scope. |
| denied | Hide lane details and disable transition controls; for approval requests, non-approvers see item count 0. |
| review_required | Show review-required lane state and block final write-back actions. |
