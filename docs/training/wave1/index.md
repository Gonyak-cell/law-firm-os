# Wave 1 Training Source Index

Status: draft_blocked_pending_l4_w06_t02_captures_walkthrough_and_final_link_check
Work package: LT-L4-W06
TUW: LT-L4-W06-T03
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a training package index draft only. It does not publish role-based
training, does not include walkthrough screenshots, does not prove links to
future L7 materials, and does not claim LT-L4-W06-T03 or LT-L4-W06 completion.

The product-ui glossary now exists at `docs/product-ui/glossary.md`; this index
links it as a source reference but does not prove rendered UI copy compliance.

## Package Links

| Link ID | Target | Purpose |
| --- | --- | --- |
| PKG-LINK-01 | `docs/training/wave1/screen-flows.md` | Six-screen role flow source |
| PKG-LINK-02 | `docs/launch/support/faq-onboarding.md` | FAQ, onboarding, support intake draft |
| PKG-LINK-03 | `docs/launch/runbooks/permission-request-procedure.md` | Permission request route |
| PKG-LINK-04 | `docs/launch/runbooks/incident-response-runbook.md` | Escalation and incident route |
| PKG-LINK-05 | `docs/launch/runbooks/break-glass-runbook.md` | Emergency access boundary |
| PKG-LINK-06 | `docs/product-ui/glossary.md` | Product UI terminology reference |

## Role-Based Table Of Contents

| TOC ID | Role | Modules |
| --- | --- | --- |
| ROLE-TOC-01 | Lawyer | Matter Home; Work Queue review/approval; Outlook filing confirmation; Issue Ledger legal review; Document Workspace source/QC review; support and escalation. |
| ROLE-TOC-02 | Staff | Work Queue task handling; Document Workspace status/version checks; Outlook filing assistance; Issue metadata maintenance; support intake and safe evidence capture. |
| ROLE-TOC-03 | Admin | Admin Console read surfaces; permission request routing; audit read basics; support triage; break-glass boundary; change/rollback escalation. |

## Prohibited Actions

| Prohibited ID | Rule |
| --- | --- |
| PROHIBIT-01 | Do not use real client, matter, personal, HR, or privileged text in screenshots, examples, support requests, or training drafts. |
| PROHIBIT-02 | Do not bypass permission denied or review_required states. |
| PROHIBIT-03 | Do not manually edit database rows, fixtures, or local files to change access. |
| PROHIBIT-04 | Do not use raw file paths, object keys, signed URLs, or direct Graph links while MAT-DEC-03 is pending. |
| PROHIBIT-05 | Do not activate AI prompts, AI summaries, Smart Alerts, or drafting in Wave 1. |
| PROHIBIT-06 | Do not add HR-sensitive workflows to Wave 1 training. |
| PROHIBIT-07 | Do not treat partner override as break-glass. |
| PROHIBIT-08 | Do not delete or overwrite suspected misfiling evidence before support/incident review. |

## Misfiling Correction Procedure

| Step ID | Step |
| --- | --- |
| MISFILE-STEP-01 | Stop additional filing or follow-up creation from the same email/document. |
| MISFILE-STEP-02 | Capture safe identifiers: request id, matter-safe id, timestamp, and UI state. |
| MISFILE-STEP-03 | Open support request using `docs/launch/support/faq-onboarding.md`; do not paste privileged contents. |
| MISFILE-STEP-04 | Preserve audit references and original filing history; do not delete or manually move records. |
| MISFILE-STEP-05 | Route severity: client/legal harm or disclosure risk becomes incident; routine metadata correction stays support/change path. |
| MISFILE-STEP-06 | Apply correction only through approved runtime/support procedure after permission and audit paths exist. |

## Escalation Guide

| Escalation ID | Trigger | Route |
| --- | --- | --- |
| ESC-ROUTE-01 | Permission denied or wrong access | Permission request procedure |
| ESC-ROUTE-02 | Suspected confidentiality/security issue | Incident response runbook |
| ESC-ROUTE-03 | Urgent emergency access request | Break-glass runbook after approval |
| ESC-ROUTE-04 | Wrong filing or lost document reference | Support request, then incident if legal harm risk exists |
| ESC-ROUTE-05 | Product behavior defect or change request | Change management procedure |
| ESC-ROUTE-06 | AI, portal, HR, Vault, billing, or other future-wave request | Future-wave backlog or owner decision |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L4-W06-T02 walkthrough captures | Screenshots and captions do not exist. |
| Rendered UI copy compliance | The glossary exists, but rendered Wave 1 screens have not been checked against it. |
| Final link check | Links to future walkthrough and L7 role guides cannot pass until those files exist. |
| L7 publication | Role guides and quick references are L7 work, not completed by this index. |
