# Staff Training Guide

Status: draft_blocked_pending_l4_w06_walkthrough_captures_handson_environment_and_pilot_roster
Work package: LT-L7-W04
TUW: LT-L7-W04-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a role-based training draft for staff users. It does not publish
training, does not prove screen implementation, does not include walkthrough
screenshots, does not conduct a hands-on session, and does not claim
LT-L7-W04-T01 or LT-L7-W04 completion.

The final training pack must be rechecked after LT-L4-W06 runtime screen
captures and walkthrough validation exist. All examples must remain synthetic
and must not include client, matter, personal, HR, or privileged content.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| STAFF-SRC-01 | `../../../training/wave1/index.md` | Wave 1 training source index |
| STAFF-SRC-02 | `../../../training/wave1/screen-flows.md` | Screen and role-flow references |
| STAFF-SRC-03 | `../../../product-ui/glossary.md` | Canonical UI terms |
| STAFF-SRC-04 | `../../../launch/support/faq-onboarding.md` | Support intake and FAQ route |
| STAFF-SRC-05 | `../../../launch/runbooks/permission-request-procedure.md` | Permission request route |
| STAFF-SRC-06 | `../../../launch/runbooks/incident-response-runbook.md` | Incident route |
| STAFF-SRC-07 | `../../../launch/runbooks/break-glass-runbook.md` | Emergency access boundary |
| STAFF-SRC-08 | `../../../launch/runbooks/change-management.md` | Change request route |

## Staff Module Coverage

| Module ID | Module | Screen reference | Practice objective | Draft completion check |
| --- | --- | --- | --- | --- |
| TRAIN-STAFF-MODULE-01 | Document Workspace | FLOW-08 | Check filed document Status, Version, Source, QC Result, and Related Issue metadata. | Trainee can identify missing or unclear metadata and route it through support without using raw links. |
| TRAIN-STAFF-MODULE-02 | Filing | FLOW-11 | Support Outlook filing in read-mode, confirm matter and attachment choices with a lawyer when uncertain, and preserve misfiling evidence. | Trainee can stop unsafe filing and open support with safe identifiers only. |

## Module Practice Steps

| Step ID | Module | Step | Evidence to capture during final session |
| --- | --- | --- | --- |
| STAFF-PRACTICE-01 | Document Workspace | Open a synthetic filed document row and read Status, Version, Source, QC Result, and Related Issue metadata. | Synthetic document id and checklist mark. |
| STAFF-PRACTICE-02 | Document Workspace | Confirm `file_ref` stays opaque and that no raw path, object key, signed URL, or direct Graph link is used. | Training checklist mark. |
| STAFF-PRACTICE-03 | Document Workspace | Route unclear status, QC, or related issue information to support without pasting document contents. | Support route id. |
| STAFF-PRACTICE-04 | Filing | Review suggested matter and attachment choices with the assigned lawyer when the match is uncertain. | Synthetic email id and confirmation note. |
| STAFF-PRACTICE-05 | Filing | Stop and preserve evidence when a filed email or document appears on the wrong matter. | MISFILE-STEP reference. |
| STAFF-PRACTICE-06 | Filing | Escalate legal proposal, resolution, or approval fields to a lawyer. | Escalation route id. |

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
| STAFF-CHECK-01 | All source links resolve inside the repository. | draft_checked_by_command |
| STAFF-CHECK-02 | FLOW-08 and FLOW-11 are rechecked against runtime screenshots. | pending_l4_w06_t02 |
| STAFF-CHECK-03 | Hands-on environment contains only synthetic data. | pending_lt_l7_w04_t02 |
| STAFF-CHECK-04 | Staff attendees and training completion are recorded. | pending_lt_l7_w04_t03_t04 |
