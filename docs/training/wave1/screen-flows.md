# Wave 1 Screen Flow Source

Status: draft_blocked_pending_runtime_screen_validation_and_l4_w06_t02_captures
Work package: LT-L4-W06
TUW: LT-L4-W06-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This training source is IA-derived. It does not prove that the screens are
implemented, does not run a dev server, does not capture screenshots, does not
publish user training, and does not claim LT-L4-W06-T01 completion.

The flow names below must be rechecked against actual implemented UI labels
during LT-L4-W06-T02 before L7 training can use them as final material.

## Source IA Links

| Source ID | Wave 1 screen | IA source |
| --- | --- | --- |
| SRC-IA-01 | Matter Home | `docs/product-ui/ia/matter-home.md` |
| SRC-IA-02 | Work Queue | `docs/product-ui/ia/work-queue.md` |
| SRC-IA-03 | Document Workspace | `docs/product-ui/ia/document-workspace.md` |
| SRC-IA-04 | Outlook Add-in Pane | `docs/product-ui/ia/outlook-addin-pane.md` |
| SRC-IA-05 | Issue Ledger | `docs/product-ui/ia/issue-ledger.md` |
| SRC-IA-06 | Admin Console | `docs/product-ui/ia/admin-console.md` |

## Role Flow Matrix

| Flow ID | Screen | Role | Draft user flow | IA source |
| --- | --- | --- | --- | --- |
| FLOW-01 | Matter Home | lawyer | Open Matter Summary; review Today's Actions and Critical Deadlines; inspect Open Issues and Recent Documents; use Recent Emails and Client/Counterparty Pending as status cues; leave AI Candidates read-only/off. | SRC-IA-01 |
| FLOW-02 | Matter Home | staff | Open matter status; check Today's Actions, Critical Deadlines, Recent Documents, and Client Pending; avoid legal resolution fields unless assigned. | SRC-IA-01 |
| FLOW-03 | Matter Home | admin | Verify safe matter metadata, access state, and area-level denied/review_required states; do not use Matter Home as an admin mutation surface. | SRC-IA-01 |
| FLOW-04 | Work Queue | lawyer | Review My Tasks, Overdue, Review Needed, and Approval Requests; approve/reject only when assigned approver role exists; record reasons for state changes. | SRC-IA-02 |
| FLOW-05 | Work Queue | staff | Work My Tasks and Overdue items; escalate Review Needed or Approval Requests to eligible lawyers/admins; do not process HR tasks in Wave 1. | SRC-IA-02 |
| FLOW-06 | Work Queue | admin | Monitor lane health and permission-denied behavior; confirm HR lane exclusion and route stuck workflow items to support/change management. | SRC-IA-02 |
| FLOW-07 | Document Workspace | lawyer | Review document Status, Version, Source, QC Result, and Related Issue; open only authorized document metadata; treat file_ref as opaque until storage decision. | SRC-IA-03 |
| FLOW-08 | Document Workspace | staff | Check filed document status and version metadata; report missing source, QC, or related issue information through support; do not use raw links. | SRC-IA-03 |
| FLOW-09 | Document Workspace | admin | Confirm denied/review_required masking, file_ref opacity, and MAT-DEC-03 storage pending state; do not enable direct original links. | SRC-IA-03 |
| FLOW-10 | Outlook Add-in Pane | lawyer | Open email, review suggested matter, confirm matter selection, file email when runtime exists, choose follow-up task/deadline/issue, and verify Matter Home completion summary. | SRC-IA-04 |
| FLOW-11 | Outlook Add-in Pane | staff | Use read-mode filing support only when assigned; confirm matter and attachment choices with lawyer if uncertain; preserve misfiling evidence. | SRC-IA-04 |
| FLOW-12 | Outlook Add-in Pane | admin | Validate add-in state, Graph/permission boundary, and storage-pending behavior; do not request broad Graph scopes or deploy manifest from training flow. | SRC-IA-04 |
| FLOW-13 | Issue Ledger | lawyer | Triage candidate issue, link accessible source, record positions, draft proposed language, update status, and record resolution with source basis. | SRC-IA-05 |
| FLOW-14 | Issue Ledger | staff | Maintain safe issue metadata, due dates, source links, and client/counterparty input status; escalate legal proposal/resolution fields to lawyer. | SRC-IA-05 |
| FLOW-15 | Issue Ledger | admin | Review issue state taxonomy, denied/review_required masking, and source-link policy; do not finalize issue enum or overlay admission from training. | SRC-IA-05 |
| FLOW-16 | Admin Console | lawyer | Read user/permission/policy/audit summaries only when authorized; request changes through approved support or governance route. | SRC-IA-06 |
| FLOW-17 | Admin Console | staff | Use Admin Console only if assigned support/admin duty; otherwise route user or permission questions to support. | SRC-IA-06 |
| FLOW-18 | Admin Console | admin | Inspect User Directory, Permission View, Policy Read, and Audit Read; do not mutate policy/permission until runtime and approval gates exist. | SRC-IA-06 |

## Wave 2 And Wave 3 Exclusions

| Exclusion ID | Excluded or future feature | Training treatment |
| --- | --- | --- |
| EXCL-01 | AI candidates, generated summaries, Smart Alerts, AI drafting | Wave 1 shows AI dark/off or placeholder states only; no prompt/output controls in training. |
| EXCL-02 | Client/employee/candidate portals | Exclude from Wave 1 training; route portal questions to future-wave backlog. |
| EXCL-03 | HR sensitive workflows | Exclude from Wave 1 training; HR track requires separate sensitivity and rule-engine gates. |
| EXCL-04 | Obsidian/Vault export-import and marketplace extensions | Future-wave only; no export/import procedure in Wave 1 training. |
| EXCL-05 | Billing automation and payment/settlement operations | Outside the Wave 1 screen flow set unless a later owner decision changes scope. |

## Validation Still Required

| Validation ID | Required before completion | Current state |
| --- | --- | --- |
| VAL-SF-01 | Dev-server or implementation screen sample for at least 3 screens. | pending_runtime_screen_validation |
| VAL-SF-02 | UI label comparison: IA/source flow names vs rendered labels. | pending_runtime_screen_validation |
| VAL-SF-03 | Screenshot/caption package for core walkthrough. | pending_l4_w06_t02 |
| VAL-SF-04 | Link into role-based L7 training package. | pending_l4_w06_t03 |
| VAL-SF-05 | Synthetic-only data review for screenshots and examples. | pending_l4_w06_t02 |
