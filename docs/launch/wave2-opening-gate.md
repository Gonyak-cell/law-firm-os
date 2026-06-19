# Wave 2 Opening Gate Definition

Status: draft_blocked_pending_l6_w04_roster_external_ai_prerequisites_regression_and_owner_signoff
Work package: LT-L9-W04
TUW: LT-L9-W04-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This document defines the Wave 2 AI opening gate only. It does not activate AI,
does not select or sign an AI provider DPA, does not complete legal/privacy
review, does not run regression tests, does not assign reviewers, does not
confirm rollback/disable execution, and does not provide owner signoff.

Wave 2 기능 구현은 본 게이트 범위 밖. Feature work for AI Review Queue,
Smart Alerts, and Drafting must remain in later implementation tracks after the
gate inputs exist.

## AI Release Gate Seven Conditions

| Gate ID | Release gate condition | Evidence required | Current state |
| --- | --- | --- | --- |
| AI-GATE-01 | Source scope verification | Source resolver test showing only authorized matter/document/email sources are used. | pending_runtime_evidence |
| AI-GATE-02 | Permission verification | allow/denied/review_required permission checks for AI source access and output visibility. | pending_runtime_evidence |
| AI-GATE-03 | Audit event verification | Prompt/run/review/write-back audit events with safe metadata and retention mapping. | pending_runtime_evidence |
| AI-GATE-04 | Regression set passed | AI regression set, no-leak checks, and no partial write-back failures. | pending_runtime_evidence |
| AI-GATE-05 | High-risk reviewer assigned | Owner-approved high-risk reviewer roster and coverage map from LT-L6-W04-T01. | pending_owner_decision |
| AI-GATE-06 | Rollback and disable switch provided | Disable switch smoke, rollback procedure evidence, and primary/backup authority. | pending_runtime_and_owner_evidence |
| AI-GATE-07 | User-visible AI output state | UI state for Generated, Pending Review, Approved, Rejected, and Disabled. | pending_ui_runtime_evidence |

## L9-W04 Six-Item Mapping

| Item ID | L9-W04 opening item | Mapped gate condition | Required evidence |
| --- | --- | --- | --- |
| L9-AI-ITEM-01 | Provider DPA | AI-GATE-03 and legal/privacy prerequisite | Signed provider DPA and legal/privacy review result. |
| L9-AI-ITEM-02 | Sensitive-data routing blocked | AI-GATE-01, AI-GATE-02, AI-GATE-04 | Routing test proving sensitive/HR/privileged disallowed paths are blocked. |
| L9-AI-ITEM-03 | Regression set passed | AI-GATE-04 | Regression output with pass/fail and no-leak results. |
| L9-AI-ITEM-04 | Reviewer roster | AI-GATE-05 | LT-L6-W04-T01 owner-approved reviewer roster and coverage map. |
| L9-AI-ITEM-05 | Rollback/disable confirmation | AI-GATE-06 | Disable switch and rollback confirmation evidence. |
| L9-AI-ITEM-06 | Output status UI | AI-GATE-07 | UI evidence for output state labels and review-blocked behavior. |

## Sequential Opening Order

| Sequence ID | Feature gate | Must pass before opening | Notes |
| --- | --- | --- | --- |
| W2-SEQUENCE-01 | AI Review Queue | AI-GATE-01 through AI-GATE-07, reviewer roster, disable/rollback, DPA/legal review | First Wave 2 surface because it is review-centered and can keep write-back blocked. |
| W2-SEQUENCE-02 | Smart Alerts | AI Review Queue open and stable, alert source scope and permission regression pass | Alerts must route through review/approval and cannot bypass permission checks. |
| W2-SEQUENCE-03 | Drafting | AI Review Queue and Smart Alerts stable, drafting-specific no-leak/write-back tests pass | Drafting remains last because it has the highest legal output risk. |

## Escalation Edge Operating Plan

| Edge ID | Trigger | Required action | Current state |
| --- | --- | --- | --- |
| W2-EDGE-01 | Any AI gate fails | Block feature opening and register finding. | pending_future_verdict |
| W2-EDGE-02 | Reviewer conflict or no coverage | Escalate to launch governance and keep feature disabled. | pending_LT-L6-W04_T01 |
| W2-EDGE-03 | Sensitive-data routing uncertainty | Escalate to legal/privacy owner and block provider transmission. | pending_external_review |
| W2-EDGE-04 | Disable/rollback smoke fails | Block Wave 2 opening; require rollback/disable fix and rerun. | pending_runtime_evidence |
| W2-EDGE-05 | Output status ambiguity | Block release until UI state is unambiguous and tested. | pending_ui_evidence |

## Evidence Package Contract

| Evidence ID | Required artifact before T03 verdict | Current state |
| --- | --- | --- |
| W2-EVID-01 | Gate definition with 7 AI conditions and 6 L9-W04 mappings | draft_ready |
| W2-EVID-02 | External legal review and provider DPA evidence | pending_LT-L9-W04_T02 |
| W2-EVID-03 | G3/G6/G7 dimension re-verdict | pending_LT-L9-W04_T03 |
| W2-EVID-04 | Regression, rollback/disable, and sensitive routing execution outputs | pending_LT-L9-W04_T03 |
| W2-EVID-05 | Feature-level owner signoff or blocked finding record | pending_LT-L9-W04_T03 |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L6-W04 | Reviewer roster, disable/rollback authority, SLA, and dry-run are not complete. |
| LT-L9-W04-T02 | External legal review and provider DPA evidence are not present. |
| Runtime evidence | Regression, sensitive-routing, rollback/disable, audit, permission, and source-scope tests have not run. |
| Owner signoff | No feature-level human signoff or block verdict exists. |
