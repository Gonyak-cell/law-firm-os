# AI Review Queue Operations

Status: draft_blocked_pending_l6_w04_t01_reviewer_roster_and_sla_decision
Work package: LT-L6-W04
TUW: LT-L6-W04-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This document is a Wave 2 readiness draft. It does not activate AI, does not
name reviewers, does not grant disable/rollback authority, does not set approval
or rejection SLA values, does not run a dry-run, and does not claim LT-L6-W04 or
LT-L6-W04-T02 completion.

Wave 1 remains AI off. AI features can only move toward release after the
reviewer roster/disable authority decision in `LT-L6-W04-T01` and the relevant
legal, privacy, permission, audit, regression, and rollback gates are complete.

The current LT-L6-W04-T01 decision input is
`docs/launch/ai-reviewer-roster-decision.md`. It is not an approval record and
must not be treated as a launch decision register row.

## Source Alignment

| Source | Use |
| --- | --- |
| `workbook/matter_dev_docs/07_AI_자동화_모델라우팅_검증정책.md` section 8 | AI Release Gate seven conditions. |
| `workbook/matter-post-cp-launch-plan.md` L1, L6, and L9 | Wave 1 AI off, Wave 2 AI activation, reviewer roster, disable switch, and rollback requirements. |
| `docs/launch/staffing-plan-draft.md` | AI reviewer role remains vacant/unconfirmed and needs owner approval. |
| `docs/launch/ai-reviewer-roster-decision.md` | T01 reviewer/disable authority decision input; not owner approval. |
| `docs/launch/pipa-retention-policy-draft.md` | External AI prompt/output production retention remains 0 while Wave 1 external AI is off. |

## Operating Procedure

| ID | Step | Required input | Required output | Blocked without |
| --- | --- | --- | --- | --- |
| AI-OPS-01 | Intake | AI output candidate, source references, risk label, matter/HR scope, model route | review queue item with safe metadata | approved AI runtime and source-scope validation |
| AI-OPS-02 | Assign reviewer | reviewer roster, expertise area, conflict/permission check | assigned reviewer or escalation | LT-L6-W04-T01 named reviewer decision |
| AI-OPS-03 | Review | source evidence, generated output, requested action, risk controls | approve, edit, reject, or request more source decision | source/citation availability and permission gate |
| AI-OPS-04 | Write-back decision | approved output, target object, audit hint, rollback path | write-back authorization or blocked state | LT-L2-W03 audited write path and approval governance |
| AI-OPS-05 | Close queue item | final decision, reason, reviewer, timestamps, audit reference | closed review record | durable audit event and retention policy |

## SLA Placeholders

SLA values are not approved by this draft.

| Review class | SLA status | Required decision |
| --- | --- | --- |
| High-risk legal output | pending_l6_w04_t01_and_t02 | response and resolution SLA, primary/backup reviewer |
| HR-sensitive output | pending_l6_w04_t01_and_t02 | response and resolution SLA, HR reviewer and guardrail owner |
| Low-risk summary output | pending_l6_w04_t01_and_t02 | response SLA and auto-expiry rule |
| Rejection/edit follow-up | pending_l6_w04_t01_and_t02 | resubmission SLA and escalation owner |

## AI Release Gate Signoff Form

| ID | Release gate condition | Evidence required | Signoff role | Status |
| --- | --- | --- | --- | --- |
| AI-GATE-01 | Source scope verification | Source resolver test showing only authorized sources | Security/data reviewer | pending |
| AI-GATE-02 | Permission verification | Permission checks for allow/denied/review_required contexts | Security owner | pending |
| AI-GATE-03 | Audit event verification | Audit event for prompt/run/review/write-back path | Audit owner | pending |
| AI-GATE-04 | Regression set passed | AI regression suite and no-leak checks pass | Release owner | pending |
| AI-GATE-05 | High-risk reviewer assigned | Named reviewer roster and coverage map | Launch owner / legal owner | pending_l6_w04_t01 |
| AI-GATE-06 | Rollback and disable switch provided | Disable switch smoke and rollback procedure evidence | System admin / operations owner | pending_l6_w04_t01 |
| AI-GATE-07 | User-visible AI output state | UI shows Generated, Pending Review, Approved, Rejected, or Disabled state | Product/UI owner | pending |

## Disable Switch Check Procedure

1. Confirm disable authority and backup authority from LT-L6-W04-T01.
2. Enable test-only AI surface in staging after all release gate evidence exists.
3. Trigger disable switch and record timestamp.
4. Verify new prompt/run attempts are blocked.
5. Verify pending outputs show disabled or review-blocked state.
6. Verify audit and status evidence were captured.
7. Roll back test-only enablement and keep Wave 1 production AI off unless a later release gate approves activation.

## Wave 1 Off-State Rule

| Rule | Required behavior |
| --- | --- |
| No interactive AI | No prompt submission, generated legal/HR conclusion, Smart Alert, or AI write-back in Wave 1. |
| Placeholder only | UI may show disabled or future-wave placeholders where IA requires it. |
| Zero-output KPI | KPI definitions treat Wave 1 AI reliability as a zero-output/off-state check. |
| Legal/privacy gate | External AI legal/privacy review and retention decisions must complete before production AI data leaves the system. |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| No named reviewer roster | LT-L6-W04-T01 is pending. |
| No disable authority assignment | LT-L6-W04-T01 is pending. |
| No SLA decision | Approval/rejection SLA values are not owner-approved. |
| No AI runtime activation | Wave 1 AI remains off and no runtime gate evidence is attached. |
| No dry-run | This draft does not execute an AI Review Queue dry-run. |
