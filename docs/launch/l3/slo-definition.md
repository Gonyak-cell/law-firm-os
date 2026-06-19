# SLO Definition Draft

Status: draft_blocked_pending_monitoring_stack_threshold_approval_and_alert_fire_test
Work package: LT-L3-W06
TUW: LT-L3-W06-T03
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This document is an SLO and alert-rule draft only. It does not approve final
SLO thresholds, does not configure alert rules, does not receive a real alert,
does not create a live dashboard, and does not open support/on-call channels.

All thresholds below are candidate starting values unless the state says
`approved`. None are approved as of this draft.

## Candidate SLO Thresholds

| SLO ID | SLO | Candidate threshold | Measurement method | Current approval state |
| --- | --- | ---: | --- | --- |
| SLO-DEF-01 | API availability during business hours | >= 99.5% successful health or API checks per approved business-hours window | Count successful checks divided by total checks from the selected monitoring stack. | candidate_from_launch_plan_pending_owner_approval |
| SLO-DEF-02 | API p95 latency | <= 1000 ms p95 over 15-minute rolling window | Use request duration histogram for staging API routes and calculate p95 by route family. | candidate_pending_owner_approval |
| SLO-DEF-03 | API error rate | <= 1.0% 5xx plus handled server errors over 15-minute rolling window | Count error responses divided by total API requests for the same window. | candidate_pending_owner_approval |
| SLO-DEF-04 | Audit chain integrity daily verification | >= 1 successful verification per day and 0 failed verification runs | Scheduled read-only audit-chain verification job result with verified record count. | candidate_pending_l3_w04_and_t04 |
| SLO-DEF-05 | Graph integration status | >= 99.0% successful Graph probe results during approved monitoring window | Graph auth, filing/upload probe, and failure counter after scope/admin consent readiness. | candidate_pending_m365_readiness |
| SLO-DEF-06 | Backup success rate | 100% scheduled backup jobs successful per day and 0 missed jobs | Backup job result log with scheduled, success, failed, and missed job counts. | candidate_pending_l3_w05_t02 |

## Alert Rule Mapping

| Alert Rule ID | SLO ID | Candidate trigger | Candidate severity | Runtime dependency | Current state |
| --- | --- | --- | --- | --- | --- |
| ALERT-RULE-01 | SLO-DEF-01 | Availability below candidate threshold for one approved evaluation window. | S1/S2 by blast radius | LT-L3-W06-T02 dashboard and selected monitoring stack | not_configured |
| ALERT-RULE-02 | SLO-DEF-02 | p95 latency above candidate threshold for two consecutive windows. | S2/S3 by blast radius | LT-L3-W06-T02 staging telemetry | not_configured |
| ALERT-RULE-03 | SLO-DEF-03 | Error rate above candidate threshold for one approved evaluation window. | S2/S3 by blast radius | LT-L3-W06-T02 staging telemetry | not_configured |
| ALERT-RULE-04 | SLO-DEF-04 | Daily audit verification missing or failed. | S1 | LT-L3-W04 WORM store and LT-L3-W06-T04 job | not_configured |
| ALERT-RULE-05 | SLO-DEF-05 | Graph probe success below candidate threshold or repeated auth failures. | S2 | LT-L3-W07/L3-W09 M365 readiness | not_configured |
| ALERT-RULE-06 | SLO-DEF-06 | Any scheduled backup job fails or is missed. | S2/S3 by recovery risk | LT-L3-W05-T02 backup automation | not_configured |

## Alert Fire Test Slot

| Test Field | Required evidence before T03 can pass | Current state |
| --- | --- | --- |
| Induced threshold breach | Controlled test proving at least one alert rule fires. | pending_runtime_alert_rule |
| Received alert channel | Channel, recipient role, timestamp, and alert payload excerpt. | pending_l6_w01_t02_and_support_channel_decision |
| Correlation to SLO | Alert payload maps back to one `SLO-DEF-*` row and one `ALERT-RULE-*` row. | pending_runtime_alert_rule |
| Post-test cleanup | Alert disabled/reset or test condition removed. | pending_runtime_alert_rule |

## Required Approval Fields

| Field | Required value | Current state |
| --- | --- | --- |
| SLO owner | Real-person role accountable for operating SLO thresholds. | pending_owner_approval |
| Monitoring stack | Owner-selected stack from `docs/launch/l3/monitoring-stack-decision.md`. | pending_l3_w06_t01 |
| Threshold approval date | Date the six thresholds are approved or modified. | pending_owner_approval |
| Alert routing owner | Role receiving and acknowledging alerts. | pending_l6_w01_t02 |
| Evidence reference | Alert fire test screenshot/export or equivalent receipt. | pending_alert_fire_test |

## Open Dependencies

| Dependency | Impact |
| --- | --- |
| LT-L3-W06-T01 | Stack-specific metric names, query syntax, and alert rule syntax unknown. |
| LT-L3-W06-T02 | No live dashboard or staging telemetry evidence exists. |
| LT-L3-W04 and LT-L3-W06-T04 | Audit-chain verification SLO cannot be executed. |
| LT-L3-W05-T02 | Backup success SLO cannot be executed. |
| LT-L3-W07/L3-W09 | Graph integration SLO cannot be executed. |
| LT-L6-W01-T02 | Alert routing and on-call/SLA ownership not approved. |

## Non-Weakening Rule

Any later relaxation of approved SLO thresholds must be recorded with owner
approval and rationale. Audit-chain verification and backup-success alerts must
not be disabled silently because they feed G6 and G4 go-live evidence.
