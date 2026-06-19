# Pilot Operations Log

Status: template_blocked_pending_pilot_start_weekly_feedback_sessions_incident_tracking_metric_snapshots_and_misfiling_records
Work package: LT-L7-W05
TUW: LT-L7-W05-T03
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a pilot operations log template only. It does not start the pilot,
schedule or conduct weekly feedback, open a fix track, create incidents, record
metric snapshots, process misfiling events, or claim LT-L7-W05-T03 or
LT-L7-W05 completion.

S1/S2 zero cannot be claimed from the absence of a pilot period. The final log
must cover the actual pilot window and either show zero S1/S2 incidents during
that window or prove every S1/S2 was resolved and post-reviewed.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| OPS-SRC-01 | `pilot-kickoff-checklist.md` | Pilot start prerequisite |
| OPS-SRC-02 | `kpi-baseline-definition.md` | Metric snapshot definitions |
| OPS-SRC-03 | `metrics-collection-check.md` | Metrics collection evidence slots |
| OPS-SRC-04 | `../lt-l7-w04/training/session-records.md` | Training questions and FAQ handoff source |
| OPS-SRC-05 | `../lt-l7-w04/training/lawyer-guide.md` | Misfiling correction source |
| OPS-SRC-06 | `../../launch/runbooks/incident-response-runbook.md` | S1-S4 incident handling source |
| OPS-SRC-07 | `../../launch/runbooks/change-management.md` | P0/P1 fix and change route |
| OPS-SRC-08 | `../../../workbook/matter_dev_docs/23_Risk_Register_Open_Questions.md` | RISK-004 misfiling source |

## Pilot Window

| Window Field ID | Required value | Current state |
| --- | --- | --- |
| PILOT-WINDOW-01 | pilot start timestamp | pending_pilot_kickoff |
| PILOT-WINDOW-02 | pilot end timestamp or planned duration | pending_pilot_kickoff |
| PILOT-WINDOW-03 | final pilot roster reference | pending_l1_w10_t02 |
| PILOT-WINDOW-04 | support/on-call route | pending_l6_support_ready |
| PILOT-WINDOW-05 | metric collection route | pending_l7_w05_t02_runtime_route |

## Weekly Feedback Session Slots

| Session Slot ID | Required record | Minimum evidence | Current state |
| --- | --- | --- | --- |
| PILOT-WEEKLY-01 | Week 1 feedback session | date, attendees, discussion, action items | not_conducted |
| PILOT-WEEKLY-02 | Week 2 feedback session | date, attendees, discussion, action items | not_conducted |
| PILOT-WEEKLY-03 | Week 3 feedback session if pilot runs 3+ weeks | date, attendees, discussion, action items | not_conducted |
| PILOT-WEEKLY-04 | Week 4 feedback session if pilot runs 4 weeks | date, attendees, discussion, action items | not_conducted |

## P0/P1 Immediate Fix Track Fields

| Fix Field ID | Required value |
| --- | --- |
| PILOT-FIX-FIELD-01 | issue id |
| PILOT-FIX-FIELD-02 | severity P0 or P1 |
| PILOT-FIX-FIELD-03 | discovery timestamp |
| PILOT-FIX-FIELD-04 | affected workflow |
| PILOT-FIX-FIELD-05 | safe evidence reference |
| PILOT-FIX-FIELD-06 | owner |
| PILOT-FIX-FIELD-07 | mitigation or rollback action |
| PILOT-FIX-FIELD-08 | fix commit or change reference |
| PILOT-FIX-FIELD-09 | verification evidence |
| PILOT-FIX-FIELD-10 | closed timestamp or blocker |

## Incident Ledger Fields

| Incident Field ID | Required value |
| --- | --- |
| PILOT-INCIDENT-FIELD-01 | incident id |
| PILOT-INCIDENT-FIELD-02 | severity S1, S2, S3, or S4 |
| PILOT-INCIDENT-FIELD-03 | start timestamp |
| PILOT-INCIDENT-FIELD-04 | end timestamp |
| PILOT-INCIDENT-FIELD-05 | affected surfaces |
| PILOT-INCIDENT-FIELD-06 | evidence source |
| PILOT-INCIDENT-FIELD-07 | containment action |
| PILOT-INCIDENT-FIELD-08 | resolution state |
| PILOT-INCIDENT-FIELD-09 | post-incident review state |
| PILOT-INCIDENT-FIELD-10 | corrective actions |
| PILOT-INCIDENT-FIELD-11 | owner and due date |
| PILOT-INCIDENT-FIELD-12 | S1/S2 gate disposition |

## Weekly Metric Snapshot Slots

| Snapshot Slot ID | Required metrics | Current state |
| --- | --- | --- |
| PILOT-METRIC-SNAPSHOT-01 | Week 1 SLO, audit-chain, filing, permission-block metrics | not_collected |
| PILOT-METRIC-SNAPSHOT-02 | Week 2 SLO, audit-chain, filing, permission-block metrics | not_collected |
| PILOT-METRIC-SNAPSHOT-03 | Week 3 metrics if pilot runs 3+ weeks | not_collected |
| PILOT-METRIC-SNAPSHOT-04 | Week 4 metrics if pilot runs 4 weeks | not_collected |

## Misfiling Handling Fields

| Misfiling Field ID | Required value |
| --- | --- |
| PILOT-MISFILE-FIELD-01 | misfiling id |
| PILOT-MISFILE-FIELD-02 | discovery timestamp |
| PILOT-MISFILE-FIELD-03 | reporter role |
| PILOT-MISFILE-FIELD-04 | safe matter/email/document references |
| PILOT-MISFILE-FIELD-05 | correction route: support, incident, or change |
| PILOT-MISFILE-FIELD-06 | evidence preserved before correction |
| PILOT-MISFILE-FIELD-07 | correction action and audit reference |
| PILOT-MISFILE-FIELD-08 | final disposition or not_applicable if zero events after pilot window |

## Current Evidence State

| Evidence ID | T03 criterion | Current value |
| --- | --- | --- |
| PILOT-OPS-EVIDENCE-01 | Weekly feedback sessions recorded | 0 |
| PILOT-OPS-EVIDENCE-02 | P0/P1 findings tracked and closed | not_available_no_pilot_period |
| PILOT-OPS-EVIDENCE-03 | S1/S2 zero or all resolved/post-reviewed | not_claimed_no_pilot_period |
| PILOT-OPS-EVIDENCE-04 | Weekly metric snapshots preserved | 0 |
| PILOT-OPS-EVIDENCE-05 | Misfiling events processed or not-applicable after pilot | not_available_no_pilot_period |

## Closeout Rules

1. Do not claim S1/S2 zero before a dated pilot window exists.
2. Do not close a P0/P1 row without fix or mitigation verification evidence.
3. Do not omit metric snapshots for weeks included in the actual pilot window.
4. Do not mark misfiling as not applicable until the pilot window has ended and
   event records confirm zero occurrences.
5. Do not paste privileged content into feedback, incident, or support notes.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| LT-L7-W05-T01 | Pilot kickoff evidence must exist. |
| EXT-PILOT-TEAM | Pilot team must attend weekly feedback and report issues. |
| L6 support/incident routes | Support and incident channels must accept pilot records. |
| L7-W05-T02 metrics route | Weekly metric snapshots need a reproducible collection route. |
