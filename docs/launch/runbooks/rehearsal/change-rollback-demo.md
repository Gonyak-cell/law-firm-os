# Change And Rollback Tabletop Demo

Status: tabletop_scaffold_blocked_pending_real_change_ci_deploy_regression_and_pipeline_rollback
Work package: LT-L6-W05
TUW: LT-L6-W05-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This record is a synthetic tabletop scaffold only. It does not process a real
change, does not record owner approval, does not run CI, does not deploy, does
not execute rollback, does not alter product state, and does not claim
LT-L6-W05-T02 completion.

## Synthetic Demo Change

| Field | Value |
| --- | --- |
| Change ID | SYN-CM-2026-06-18-001 |
| Change type | low-risk documentation/tabletop sample |
| Affected modules | docs-only synthetic rehearsal record |
| Risk class | B tabletop only |
| Real deployment target | none |
| Product-state write | false |
| Real approval evidence | missing |
| CI evidence | missing |
| Deployment evidence | missing |
| Regression evidence | missing |
| Rollback execution evidence | missing |

## Procedure Evidence Slots

| Slot ID | Required evidence | Current state | Blocking dependency |
| --- | --- | --- | --- |
| CM-DEMO-01 | Approval record with owner and risk class | missing_real_evidence | LT-L1-W05 approval governance |
| CM-DEMO-02 | CI green log for required gates | missing_real_evidence | LT-L3-W02 PR/CI pipeline |
| CM-DEMO-03 | Deployment log and version identifier | missing_real_evidence | LT-L3-W02 deployment pipeline |
| CM-DEMO-04 | Regression checklist and pass/fail record | missing_real_evidence | runtime environment and approved test suite |
| CM-DEMO-05 | Rollback tabletop record | tabletop_scaffold_present | LT-L6-W05-T02 actual tabletop session |

## Timestamp Order Template

The expected order is recorded for later evidence reconciliation. The timestamps
below are placeholders and are not real execution times.

| Order ID | Procedure step | Expected order | Current evidence |
| --- | --- | ---: | --- |
| CM-ORDER-01 | Approval | 1 | placeholder_only |
| CM-ORDER-02 | CI | 2 | placeholder_only |
| CM-ORDER-03 | Deploy | 3 | placeholder_only |
| CM-ORDER-04 | Regression | 4 | placeholder_only |
| CM-ORDER-05 | Closure or rollback decision | 5 | placeholder_only |

## Rollback Tabletop Scenario

| Scenario ID | Scenario | Decision criteria applied | Expected path | Current state |
| --- | --- | --- | --- | --- |
| RR-TABLETOP-01 | Post-deploy smoke fails before user exposure | RR-DECISION-03 | Standard rollback path | scaffold_only |
| RR-TABLETOP-02 | S2 functional outage with no safe workaround | RR-DECISION-02 | Emergency rollback path | scaffold_only |
| RR-TABLETOP-03 | Suspected permission leak after release | RR-DECISION-01 | Emergency rollback path and incident review | scaffold_only |

## Rollback Verification Checklist

| Verification ID | Required evidence | Current state |
| --- | --- | --- |
| RR-CHECK-01 | Version/artifact comparison | missing_real_evidence |
| RR-CHECK-02 | Health/smoke output | missing_real_evidence |
| RR-CHECK-03 | Permission safety check | missing_real_evidence |
| RR-CHECK-04 | Audit availability check | missing_real_evidence |
| RR-CHECK-05 | Data consistency check | missing_real_evidence |
| RR-CHECK-06 | User communication record | missing_real_evidence |

## Gap And Revision Log

| Gap ID | Gap | Required resolution |
| --- | --- | --- |
| CM-GAP-01 | Real change evidence does not exist. | Run owner-approved low-risk change after LT-L3-W02 pipeline exists. |
| CM-GAP-02 | Rollback tabletop has not been conducted with participants. | Conduct tabletop and record participants, scenario, decisions, and findings. |
| CM-GAP-03 | No actual rollback command or pipeline action exists. | Use LT-L3-W02 deployment/rollback pipeline evidence. |
| CM-GAP-04 | No regression result exists. | Attach runtime regression checklist and outputs. |

## Completion Requirements

LT-L6-W05-T02 can close only after all four required real evidence classes
exist: approval, CI, deployment, and regression, plus a conducted rollback
tabletop record. This scaffold is useful as a checklist but is not a substitute
for those receipts.
