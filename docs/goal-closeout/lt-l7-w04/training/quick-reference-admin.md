# Admin Quick Reference

Status: draft_blocked_pending_l4_w06_walkthrough_captures_handson_environment_and_pilot_roster
Work package: LT-L7-W04
TUW: LT-L7-W04-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This quick reference is a draft companion to `admin-guide.md`. It does not
replace the full guide, publish training, prove screens, conduct training, or
claim LT-L7-W04 completion.

## Role Flow

| Quick ID | Use when | Do | Do not |
| --- | --- | --- | --- |
| QR-ADMIN-01 | Admin Console | Inspect User Directory, Permission View, Policy Read, and Audit Read surfaces. | Do not mutate policy or permissions from training flow. |
| QR-ADMIN-02 | Permissions | Route changes through the permission request procedure and preserve before/after context. | Do not use direct DB edits, scripts, fixtures, or document-only mutations. |
| QR-ADMIN-03 | Audit | Preserve safe audit references for permission, break-glass, incident, and misfiling paths. | Do not expose raw audit payloads or protected object detail. |

## Safety Card

| Quick ID | Rule |
| --- | --- |
| QR-PROHIBIT-01 | No AI output to customers or DB write-back. |
| QR-PROHIBIT-02 | No HR salary, evaluation, or recruiting information under ordinary matter permissions. |
| QR-PROHIBIT-03 | No SharePoint sharing links without audit. |
| QR-PROHIBIT-04 | No Obsidian export without permission validation. |
| QR-PROHIBIT-05 | No broad Graph permission request in the Outlook Add-in without review. |

## Misfiling

| Quick ID | Action |
| --- | --- |
| QR-MISFILE-01 | Stop further filing from the same email or document. |
| QR-MISFILE-02 | Capture request id, matter-safe id, timestamp, and UI state. |
| QR-MISFILE-03 | Open support without privileged contents. |
| QR-MISFILE-04 | Preserve audit references and filing history. |
| QR-MISFILE-05 | Route legal harm or disclosure risk as incident. |
| QR-MISFILE-06 | Correct only through approved runtime/support procedure. |

## Escalation

| Quick ID | Trigger | Route |
| --- | --- | --- |
| QR-ESC-01 | Wrong access | Permission request procedure |
| QR-ESC-02 | Confidentiality or security concern | Incident response runbook |
| QR-ESC-03 | Emergency access | Break-glass runbook after approval |
| QR-ESC-04 | Wrong filing | Support, then incident if legal harm risk exists |
| QR-ESC-05 | Product defect or change | Change management procedure |
| QR-ESC-06 | Future-wave request | Backlog or owner decision |

## Source Pointers

| Pointer ID | Target |
| --- | --- |
| SRC-ADMIN-01 | `admin-guide.md` |
| SRC-ADMIN-02 | `../../../training/wave1/screen-flows.md` |
| SRC-ADMIN-03 | `../../../product-ui/glossary.md` |
