# Rollback Runbook

Status: draft_blocked_pending_l3_w02_deploy_rollback_pipeline
Work package: LT-L6-W05
TUW: LT-L6-W05-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This rollback runbook is an operating draft. It does not deploy, does not roll
back, does not alter data, and does not prove rollback readiness. Deployment
and rollback evidence belongs to `LT-L3-W02-T03` and the operational tabletop
belongs to `LT-L6-W05-T02`.

## Rollback Decision Criteria

| ID | Criterion | Path |
| --- | --- | --- |
| RR-DECISION-01 | S1 incident after deployment, suspected data exposure, audit-chain failure, or critical permission failure | Emergency rollback path |
| RR-DECISION-02 | S2 functional outage with no safe feature-disable workaround | Emergency rollback path |
| RR-DECISION-03 | Failed post-deploy smoke or regression gate before user exposure | Standard rollback path |
| RR-DECISION-04 | Low-risk issue with stable workaround and no data/security concern | Forward fix or scheduled rollback by approval |

## Standard Rollback Procedure

1. Confirm rollback criterion and identify last known good version.
2. Freeze additional releases to the target environment.
3. Notify operations, support, and approval roles.
4. Run the approved pipeline rollback action when LT-L3-W02 exists.
5. Verify version identifier equals the rollback target.
6. Run health check, smoke check, and affected regression checks.
7. Attach logs and verification output to the change record.
8. Close or keep incident/change open based on post-rollback verification.

## Emergency Rollback Procedure

1. Declare severity and incident commander role.
2. Preserve evidence before rollback unless preservation increases user or data risk.
3. Disable affected feature if that is safer than full rollback.
4. Execute rollback using the shortest approved path available.
5. Verify service health and permission/audit safety first, then functional behavior.
6. Notify affected users with verified status only.
7. Open post-incident review and corrective action records.

## Rollback Verification

| ID | Verification | Required evidence |
| --- | --- | --- |
| RR-VERIFY-01 | Version | Version endpoint, image tag, commit SHA, or artifact ID matches rollback target. |
| RR-VERIFY-02 | Health | Health endpoint or smoke command returns success. |
| RR-VERIFY-03 | Permission | Unauthorized access remains denied and no protected counts/details leak. |
| RR-VERIFY-04 | Audit | Audit chain/read path remains available or incident captures audit outage explicitly. |
| RR-VERIFY-05 | Data consistency | No known partial state remains; any partial state is captured as incident follow-up. |
| RR-VERIFY-06 | User communication | Status update is issued with verified scope and next checkpoint. |

## Required Attachments

| Attachment | Required when |
| --- | --- |
| Deployment log | Every rollback |
| Rollback log | Every rollback |
| Version/commit comparison | Every rollback |
| Health/smoke output | Every rollback |
| Regression checklist | Functional or policy changes |
| Incident record | Emergency rollback |
| Post-incident review | S1/S2 or security/data-impact rollback |

## Runtime Blockers

| Blocker | Evidence |
| --- | --- |
| No deployment pipeline | LT-L3-W02 is not complete. |
| No rollback action evidence | LT-L3-W02-T03 deployment-to-rollback round trip is pending. |
| No tabletop evidence | LT-L6-W05-T02 is pending. |
| No production authority | This runbook does not grant deployment or rollback authority. |
