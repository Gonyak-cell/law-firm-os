# Lawyer Training Guide

Status: draft_blocked_pending_l4_w06_walkthrough_captures_handson_environment_and_pilot_roster
Work package: LT-L7-W04
TUW: LT-L7-W04-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a role-based training draft for lawyers. It does not publish training,
does not prove screen implementation, does not include walkthrough screenshots,
does not conduct a hands-on session, and does not claim LT-L7-W04-T01 or
LT-L7-W04 completion.

The final training pack must be rechecked after LT-L4-W06 runtime screen
captures and walkthrough validation exist. All examples must remain synthetic
and must not include client, matter, personal, HR, or privileged content.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| LAW-SRC-01 | `../../../training/wave1/index.md` | Wave 1 training source index |
| LAW-SRC-02 | `../../../training/wave1/screen-flows.md` | Screen and role-flow references |
| LAW-SRC-03 | `../../../product-ui/glossary.md` | Canonical UI terms |
| LAW-SRC-04 | `../../../launch/support/faq-onboarding.md` | Support intake and FAQ route |
| LAW-SRC-05 | `../../../launch/runbooks/permission-request-procedure.md` | Permission request route |
| LAW-SRC-06 | `../../../launch/runbooks/incident-response-runbook.md` | Incident route |
| LAW-SRC-07 | `../../../launch/runbooks/break-glass-runbook.md` | Emergency access boundary |
| LAW-SRC-08 | `../../../launch/runbooks/change-management.md` | Change request route |

## Lawyer Module Coverage

| Module ID | Module | Screen reference | Practice objective | Draft completion check |
| --- | --- | --- | --- | --- |
| TRAIN-LAWYER-MODULE-01 | Matter Home | FLOW-01 | Review Matter Summary, Today's Actions, Critical Deadlines, Open Issues, Recent Documents, Recent Emails, Client Pending, and Counterparty Pending. | Trainee can identify status cues without opening restricted data or using AI Candidates. |
| TRAIN-LAWYER-MODULE-02 | Work Queue | FLOW-04 | Review My Tasks, Overdue, Review Needed, and approval request lanes. | Trainee can approve, reject, or defer only when the assigned approver role exists and a reason is recorded. |
| TRAIN-LAWYER-MODULE-03 | Filing | FLOW-10 | Use the Outlook Add-in Pane draft flow to confirm the matter selection, filing intent, follow-up task, deadline, or issue cue. | Trainee can describe the confirmation and misfiling-preservation steps without using real mailbox content. |
| TRAIN-LAWYER-MODULE-04 | Issue Ledger | FLOW-13 | Triage a candidate issue, link an accessible source, record positions, draft proposed language, update status, and record resolution basis. | Trainee can distinguish legal judgment fields from staff-maintained metadata and avoids final enum changes. |

## Module Practice Steps

| Step ID | Module | Step | Evidence to capture during final session |
| --- | --- | --- | --- |
| LAW-PRACTICE-01 | Matter Home | Open the synthetic matter, scan the summary, and state which action or deadline needs attention first. | Synthetic matter-safe id and checklist mark. |
| LAW-PRACTICE-02 | Matter Home | Confirm that AI Candidates are off or dark and that no generated AI output is used. | Training checklist mark. |
| LAW-PRACTICE-03 | Work Queue | Open My Tasks and Overdue, then route Review Needed or approval request items according to assigned authority. | Task id, action, and reason. |
| LAW-PRACTICE-04 | Work Queue | For an item outside authority, record why it must be escalated instead of processed. | Escalation route id. |
| LAW-PRACTICE-05 | Filing | In the Outlook Add-in Pane flow, verify suggested matter and follow-up choices before filing. | Synthetic email id and selected matter-safe id. |
| LAW-PRACTICE-06 | Filing | If the filing target looks wrong, stop, preserve evidence, and open support rather than deleting or moving the record. | MISFILE-STEP reference. |
| LAW-PRACTICE-07 | Issue Ledger | Triage a candidate issue and attach only an accessible source reference. | Issue id and source-safe id. |
| LAW-PRACTICE-08 | Issue Ledger | Record proposed language and resolution only with lawyer authority and source basis. | Proposed language note and source basis. |

## Common Safety Chapter

These five prohibitions come from source document 24 lines 58-65 and are
mandatory for every role-based guide.

| Common ID | Prohibition |
| --- | --- |
| COMMON-PROHIBIT-01 | Do not send AI output directly to a customer or write it back to the database. |
| COMMON-PROHIBIT-02 | Do not expose HR salary, evaluation, or recruiting information under ordinary matter permissions. |
| COMMON-PROHIBIT-03 | Do not create SharePoint sharing links without audit. |
| COMMON-PROHIBIT-04 | Do not provide Obsidian export without permission validation. |
| COMMON-PROHIBIT-05 | Do not request broad Graph permissions in the Outlook Add-in without review. |

## Misfiling Correction Procedure

| Common ID | Step |
| --- | --- |
| COMMON-MISFILE-01 | Stop additional filing or follow-up creation from the same email or document. |
| COMMON-MISFILE-02 | Capture safe identifiers: request id, matter-safe id, timestamp, and UI state. |
| COMMON-MISFILE-03 | Open a support request through `../../../launch/support/faq-onboarding.md`; do not paste privileged contents. |
| COMMON-MISFILE-04 | Preserve audit references and original filing history; do not delete or manually move records. |
| COMMON-MISFILE-05 | Route severity: client/legal harm or disclosure risk becomes incident; routine metadata correction stays support/change path. |
| COMMON-MISFILE-06 | Apply correction only through an approved runtime/support procedure after permission and audit paths exist. |

## Escalation Routes

| Common ID | Trigger | Route |
| --- | --- | --- |
| COMMON-ESC-01 | Permission denied or wrong access | Permission request procedure |
| COMMON-ESC-02 | Suspected confidentiality or security issue | Incident response runbook |
| COMMON-ESC-03 | Urgent emergency access request | Break-glass runbook after approval |
| COMMON-ESC-04 | Wrong filing or lost document reference | Support request, then incident if legal harm risk exists |
| COMMON-ESC-05 | Product behavior defect or change request | Change management procedure |
| COMMON-ESC-06 | AI, portal, HR, Vault, billing, or other future-wave request | Future-wave backlog or owner decision |

## Link And Screen Reference Checklist

| Check ID | Required before publication | Current state |
| --- | --- | --- |
| LAW-CHECK-01 | All source links resolve inside the repository. | draft_checked_by_command |
| LAW-CHECK-02 | FLOW-01, FLOW-04, FLOW-10, and FLOW-13 are rechecked against runtime screenshots. | pending_l4_w06_t02 |
| LAW-CHECK-03 | Hands-on environment contains only synthetic data. | pending_lt_l7_w04_t02 |
| LAW-CHECK-04 | Lawyer attendees and training completion are recorded. | pending_lt_l7_w04_t03_t04 |
