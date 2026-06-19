# Wave 3 Opening Gate Definition

Status: draft_blocked_pending_wave2_gate_owner_decisions_external_identity_hr_sensitivity_and_feature_signoff
Work package: LT-L9-W05
TUW: LT-L9-W05-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This document defines the Wave 3 opening gate only. It does not implement
Client Portal, Employee Portal, Candidate Portal, HR Operations, Obsidian export,
Billing automation, or Enterprise DLP. It does not authorize external users,
real employee data, payroll data, portal links, billing writes, export jobs, or
DLP enforcement.

Wave 3 기능 구현은 본 게이트 범위 밖. Feature work must remain in later
implementation tracks after the gate inputs and owner signoffs exist.

## Feature Group Checklist

| Group ID | Feature group | Required prerequisites | Current state |
| --- | --- | --- | --- |
| W3-GROUP-01 | Client/Employee/Candidate Portal | External identity model, link expiry, link revocation, watermarking, portal permission boundary, audit events, support route | pending_external_identity_and_portal_infra |
| W3-GROUP-02 | HR Operations | HR sensitivity verification, deterministic rule engine check, OQ-006 payroll scope decision, HR reviewer/owner signoff, no-leak regression | pending_hr_sensitivity_and_oq006 |
| W3-GROUP-03 | Obsidian export-only | Export-only scope, no inbound sync, redaction/export permission gate, audit trail, revocation/retention policy | pending_export_policy_and_permission_gate |
| W3-GROUP-04 | Billing automation | Billing write authority, approval path, audit event mapping, rollback plan, segregation from HR/client portal data | pending_billing_scope_and_runtime_gate |
| W3-GROUP-05 | Enterprise DLP | DLP policy owner, scan scope, exception process, enforcement telemetry, incident/escalation route | pending_dlp_policy_and_runtime_gate |

## Portal Precondition Detail

| Requirement ID | Portal prerequisite | Evidence required | Current state |
| --- | --- | --- | --- |
| W3-PORTAL-01 | External identity model | Approved model for external users and tenant boundary. | pending_owner_decision |
| W3-PORTAL-02 | Link expiry | Runtime evidence that shared links expire as configured. | pending_runtime_evidence |
| W3-PORTAL-03 | Link revocation | Runtime evidence that revoked links fail closed. | pending_runtime_evidence |
| W3-PORTAL-04 | Watermarking | UI/download evidence that external-access content is watermarked where required. | pending_runtime_evidence |
| W3-PORTAL-05 | Audit and support route | External access audit events and support/escalation workflow. | pending_l6_l7_evidence |

## HR Precondition Detail

| Requirement ID | HR prerequisite | Evidence required | Current state |
| --- | --- | --- | --- |
| W3-HR-01 | HR sensitivity verification | Classification and no-leak validation before employee/candidate data. | pending_runtime_evidence |
| W3-HR-02 | Deterministic rule engine check | Rule engine outputs are deterministic and audit-backed. | pending_runtime_evidence |
| W3-HR-03 | OQ-006 payroll scope decision | Owner-approved payroll inclusion/exclusion decision. | pending_owner_decision |
| W3-HR-04 | Real employee data gate | Explicit owner signoff after W3-HR-01 through W3-HR-03 pass. | blocked_until_prerequisites_pass |
| W3-HR-05 | HR reviewer/owner route | Named HR/legal reviewer and escalation route. | pending_staffing_decision |

## Cross-Wave Rejudgment Contract

Each feature group must be rejudged against G3, G6, and G7 before opening.

| Rejudgment ID | Dimension | Required evidence | Applies to |
| --- | --- | --- | --- |
| W3-REJUDGE-01 | G3 legal/privacy | Legal/privacy decision, data category boundary, retention/transfer stance | all_feature_groups |
| W3-REJUDGE-02 | G6 operations | Support route, incident/runbook coverage, rollback/disable or revocation path | all_feature_groups |
| W3-REJUDGE-03 | G7 AI/human-review or sensitive automation | Human-review/approval path where automation or sensitive classification applies | HR, Billing, DLP, any AI-adjacent portal feature |

## Evidence Package Contract

| Evidence ID | Required artifact before T02 verdict | Current state |
| --- | --- | --- |
| W3-EVID-01 | Gate definition with five feature groups | draft_ready |
| W3-EVID-02 | Portal external identity/link expiry/revocation/watermark evidence | pending_future_verdict |
| W3-EVID-03 | HR sensitivity, deterministic rule engine, and OQ-006 evidence | pending_future_verdict |
| W3-EVID-04 | Feature-group G3/G6/G7 rejudgment records | pending_future_verdict |
| W3-EVID-05 | Feature-level owner signoff or blocked finding record for all five groups | pending_future_verdict |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L9-W04 | Wave 2 gate definition and verdict must remain compatible with Wave 3 sequencing. |
| External identity | Portal external identity model is not approved. |
| HR sensitivity | HR sensitivity verification and deterministic rule engine evidence do not exist. |
| OQ-006 | Payroll scope decision is not owner-approved. |
| Owner signoff | No feature-group signoff or blocked verdict exists. |
