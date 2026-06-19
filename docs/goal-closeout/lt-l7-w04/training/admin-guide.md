# Admin Training Guide

Status: draft_blocked_pending_l4_w06_walkthrough_captures_handson_environment_and_pilot_roster
Work package: LT-L7-W04
TUW: LT-L7-W04-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a role-based training draft for admin users. It does not publish
training, does not prove screen implementation, does not include walkthrough
screenshots, does not conduct a hands-on session, and does not claim
LT-L7-W04-T01 or LT-L7-W04 completion.

The final training pack must be rechecked after LT-L4-W06 runtime screen
captures and walkthrough validation exist. All examples must remain synthetic
and must not include client, matter, personal, HR, or privileged content.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| ADMIN-SRC-01 | `../../../training/wave1/index.md` | Wave 1 training source index |
| ADMIN-SRC-02 | `../../../training/wave1/screen-flows.md` | Screen and role-flow references |
| ADMIN-SRC-03 | `../../../product-ui/glossary.md` | Canonical UI terms |
| ADMIN-SRC-04 | `../../../launch/support/faq-onboarding.md` | Support intake and FAQ route |
| ADMIN-SRC-05 | `../../../launch/runbooks/permission-request-procedure.md` | Permission request route |
| ADMIN-SRC-06 | `../../../launch/runbooks/incident-response-runbook.md` | Incident route |
| ADMIN-SRC-07 | `../../../launch/runbooks/break-glass-runbook.md` | Emergency access boundary |
| ADMIN-SRC-08 | `../../../launch/runbooks/change-management.md` | Change request route |

## Admin Module Coverage

| Module ID | Module | Screen reference | Practice objective | Draft completion check |
| --- | --- | --- | --- | --- |
| TRAIN-ADMIN-MODULE-01 | Admin Console | FLOW-18 | Inspect User Directory, Permission View, Policy Read, and Audit Read surfaces. | Trainee can identify read-only admin surfaces and avoids mutation claims. |
| TRAIN-ADMIN-MODULE-02 | Permissions | FLOW-03, FLOW-06, FLOW-09 | Confirm permission denied, review_required, HR-lane exclusion, and `file_ref` opacity behavior. | Trainee can route changes through the permission request procedure and avoids direct DB, script, or fixture edits. |
| TRAIN-ADMIN-MODULE-03 | Audit | FLOW-18 | Read safe audit references and confirm required audit fields for permission, break-glass, and incident paths. | Trainee can preserve evidence and route audit gaps without exposing raw payloads. |

## Module Practice Steps

| Step ID | Module | Step | Evidence to capture during final session |
| --- | --- | --- | --- |
| ADMIN-PRACTICE-01 | Admin Console | Open the synthetic Admin Console and identify User Directory, Permission View, Policy Read, and Audit Read. | Screen checklist mark after L4 captures exist. |
| ADMIN-PRACTICE-02 | Admin Console | Confirm that policy or permission mutation is not part of Wave 1 training. | Training acknowledgement. |
| ADMIN-PRACTICE-03 | Permissions | Review a permission denied or review_required state and route access change through the permission request procedure. | Request route id. |
| ADMIN-PRACTICE-04 | Permissions | Confirm `file_ref` is opaque while the storage/link decision remains pending. | Training checklist mark. |
| ADMIN-PRACTICE-05 | Audit | Identify required audit fields: actor, target, before/after, reason, approval reference, and rollback note. | Audit field checklist mark. |
| ADMIN-PRACTICE-06 | Audit | Preserve incident, break-glass, or misfiling evidence without pasting protected content into support notes. | Safe evidence reference. |

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
| ADMIN-CHECK-01 | All source links resolve inside the repository. | draft_checked_by_command |
| ADMIN-CHECK-02 | FLOW-03, FLOW-06, FLOW-09, and FLOW-18 are rechecked against runtime screenshots. | pending_l4_w06_t02 |
| ADMIN-CHECK-03 | Hands-on environment contains only synthetic data. | pending_lt_l7_w04_t02 |
| ADMIN-CHECK-04 | Admin attendees and training completion are recorded. | pending_lt_l7_w04_t03_t04 |
