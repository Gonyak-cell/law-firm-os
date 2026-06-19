# Critical OQ And PRD Section 8 Decision Round Brief

Status: blocked_pending_owner_decisions
Work package: LT-L1-W02
TUW: LT-L1-W02 decision-round preparation
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief prepares the LT-L1-W02 decision round. It does not add rows to
`docs/launch/launch-decision-register.md`, does not mark any OQ or PRD8 item as decided or deferred, and does not grant Microsoft 365, AI, HR, Obsidian, legal data, or Outlook deployment authority.

The launch decision register permits only `decided` or timed `deferred` states.
All pending state remains in this brief and in
`docs/goal-closeout/lt-l1-w02/command-evidence.json` until owner evidence exists.

## Required Register Rows

| Register key | TUW | Decision subject | Allowed decision shape | Blocking dependency |
| --- | --- | --- | --- | --- |
| OQ-001 | LT-L1-W02-T01 | SharePoint site/library topology | matter별 / practice별 / hybrid | MAT-DEC-03 storage disposition and owner approval |
| OQ-002 | LT-L1-W02-T02 | Microsoft Graph scope and admin consent range | complete scope list with one rationale per scope and no out-of-list requests | OQ-001 plus EXT-M365-ADMIN |
| OQ-003 | LT-L1-W02-T03 | External AI treatment for privileged/customer confidential data | per-class allow/block/mask table plus Wave 1 AI-off boundary | EXT-LEGAL-AI |
| OQ-006 | LT-L1-W02-T04 | HR payroll functional scope | compensation record / payroll explanation / payroll calculation inclusion boundary | PRE-W05 enum decision and owner HR scope decision |
| OQ-010 | LT-L1-W02-T05 | Role hierarchy and partner override | role hierarchy plus partner override conditions, procedure, and audit duty | owner approval |
| OQ-014 | LT-L1-W02-T06 | AI prompt/output retention and masking | numeric retention periods plus masking classes and Wave 2 effective gate | EXT-LEGAL-AI and L1-W03 policy alignment |
| PRD8-2 | LT-L1-W02-T07 | Outlook Add-in deployment and manifest format | organization central deployment or sideload plus manifest format | OQ-002 |
| PRD8-5 | LT-L1-W02-T08 | Legal/statute/case/public disclosure data source | decided source set or timed deferral with revisit gate | owner/legal product decision |
| PRD8-6 | LT-L1-W02-T08 | Obsidian local vault connector OS and sync mode | decided OS/sync scope or timed deferral with revisit gate | storage decision and RISK-005 boundary |

## PRD Section 8 Mapping

| PRD Section 8 item | Register mapping | Required disposition |
| --- | --- | --- |
| PRD §8-1 storage/topology-related item | OQ-001 | decided only after MAT-DEC-03 alignment |
| PRD §8-2 Outlook Add-in deployment | PRD8-2 | decided after OQ-002 scope boundary |
| PRD §8-3 external AI policy | OQ-003 | decided only with EXT-LEGAL-AI result |
| PRD §8-4 HR/payroll boundary | OQ-006 | decided after HR separation and enum scope alignment |
| PRD §8-5 legal/statute/case/public disclosure data source | PRD8-5 | decided or timed deferred |
| PRD §8-6 Obsidian connector OS/sync mode | PRD8-6 | decided or timed deferred |

## Decision Field Checklist

Every `OQ-*` or `PRD8-*` register row must include:

| Field | Requirement |
| --- | --- |
| owner(실명 역할) | Real-person role supplied by the owner, not inferred by Codex. |
| decision | One allowed value or explicitly bounded table matching the TUW criteria. |
| basis | Source artifact references, prerequisite decision references, and risk rationale. |
| date | Owner-supplied decision date. |
| approval signature | Signature document, ticket, email, or equivalent owner-approved evidence reference. |
| status | `decided` or `deferred(시한 명기)` only. |

## Blocked Dependency Matrix

| Register key | Current block |
| --- | --- |
| OQ-001 | MAT-DEC-03 storage decision is not owner-approved in the launch register. |
| OQ-002 | OQ-001 and M365 admin confirmation are not complete. |
| OQ-003 | EXT-LEGAL-AI legal review result is not supplied. |
| OQ-006 | HR payroll boundary owner decision is not supplied. |
| OQ-010 | Role hierarchy and override owner decision is not supplied. |
| OQ-014 | EXT-LEGAL-AI result and AI retention/masking owner decision are not supplied. |
| PRD8-2 | OQ-002 scope and consent range are not decided. |
| PRD8-5 | Legal/statute/case data-source owner decision or timed deferral is not supplied. |
| PRD8-6 | Obsidian connector OS/sync owner decision or timed deferral is not supplied. |

## Non-Weakening Notes

| Topic | Guardrail |
| --- | --- |
| Microsoft Graph | No broad scope request may be introduced without per-scope least-privilege rationale and admin consent evidence. |
| External AI | Wave 1 remains AI-off; OQ-003 and OQ-014 cannot enable external AI without EXT-LEGAL-AI and later Wave 2 gate evidence. |
| HR payroll | HR sensitive and payroll runtime remain out of production until HR separation, deterministic rule-engine, and owner scope gates are met. |
| Partner override | Partner override cannot become emergency break-glass; break-glass remains L6-governed with time limit and audit review. |
| Obsidian | Obsidian cannot become the source of truth; export/import/sync must preserve matter DB and SharePoint/OneDrive source boundaries. |

## Register Draft Input

Do not paste these rows into the launch decision register until owner evidence exists.

| 결정ID | 제목 | owner(실명 역할) | 결정 | 근거 | 일자 | 승인 서명 | 상태 |
|---|---|---|---|---|---|---|---|
| OQ-001 | SharePoint topology | owner_supplied_real_person_role_required | owner_decision_required | MAT-DEC-03 alignment required | owner_date_required | owner_signature_reference_required | decided_only |
| OQ-002 | Graph scope/admin consent | owner_supplied_real_person_role_required | owner_decision_required | OQ-001 + EXT-M365-ADMIN required | owner_date_required | owner_signature_reference_required | decided_only |
| OQ-003 | External AI confidential-data policy | owner_supplied_real_person_role_required | owner_decision_required | EXT-LEGAL-AI result required | owner_date_required | owner_signature_reference_required | decided_only |
| OQ-006 | HR payroll boundary | owner_supplied_real_person_role_required | owner_decision_required | HR separation and PRE-W05 alignment required | owner_date_required | owner_signature_reference_required | decided_only |
| OQ-010 | Role hierarchy/partner override | owner_supplied_real_person_role_required | owner_decision_required | Role model and audit basis required | owner_date_required | owner_signature_reference_required | decided_only |
| OQ-014 | AI prompt/output retention and masking | owner_supplied_real_person_role_required | owner_decision_required | EXT-LEGAL-AI + L1-W03 alignment required | owner_date_required | owner_signature_reference_required | decided_only |
| PRD8-2 | Outlook Add-in deployment | owner_supplied_real_person_role_required | owner_decision_required | OQ-002 required | owner_date_required | owner_signature_reference_required | decided_only |
| PRD8-5 | Legal data source | owner_supplied_real_person_role_required | owner_decision_or_timed_deferral_required | Wave cutoff alignment required | owner_date_required | owner_signature_reference_required | decided_or_timed_deferred_only |
| PRD8-6 | Obsidian connector OS/sync | owner_supplied_real_person_role_required | owner_decision_or_timed_deferral_required | RISK-005 and storage alignment required | owner_date_required | owner_signature_reference_required | decided_or_timed_deferred_only |
