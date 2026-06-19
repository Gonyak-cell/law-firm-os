# Incident Response Runbook

Status: draft_blocked_pending_l3_w06_monitoring_stack_and_l6_w01_t02_sla_oncall
Work package: LT-L6-W01
TUW: LT-L6-W01-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This runbook is an operational draft. It does not open a monitoring channel,
does not configure alerting, does not assign named on-call staff, does not set
approved SLA numbers, and does not claim LT-L6-W01 completion.

L6 phase entry depends on `WP:LT-L3-W06` monitoring/SLO stack activation.
SLA and named on-call assignment are owned by `LT-L6-W01-T02`. Until those are
approved, all timing values below are placeholders and all escalation owners are
role placeholders only.

The current LT-L6-W01-T02 decision input is
`docs/launch/runbooks/incident-sla-oncall-decision.md`. It is not an approval
record and must not be treated as a launch decision register row.

## S1 Critical Incident

| Field | Draft rule |
| --- | --- |
| Classification criteria | Production or pilot users cannot access core matter workflows; unauthorized data exposure is suspected; audit chain integrity failure; filing or permission failure can cause client/legal harm. |
| Initial response | Open incident record, freeze risky writes if available, preserve logs/evidence, notify operations lead and security owner role, and assess whether cutover rollback or feature disable is needed. |
| Escalation path | Operations lead role -> security owner role -> system admin role -> launch approval governance role. |
| SLA placeholder | Pending LT-L6-W01-T02 approval. |

## S2 High Incident

| Field | Draft rule |
| --- | --- |
| Classification criteria | Major Wave 1 function degraded for multiple users; Outlook filing, Work Queue, document listing, or audit read is partially unavailable; no confirmed unauthorized disclosure. |
| Initial response | Triage affected surface, collect request IDs/log excerpts, identify rollback/disable option, and notify operations/support role. |
| Escalation path | Support/on-call role -> operations lead role -> system admin role. |
| SLA placeholder | Pending LT-L6-W01-T02 approval. |

## S3 Medium Incident

| Field | Draft rule |
| --- | --- |
| Classification criteria | Single workflow or subset of users affected; workaround exists; no permission, audit, or data-integrity concern is indicated. |
| Initial response | Create support record, confirm reproduction with synthetic or affected-user evidence, assign owner, and schedule fix or workaround. |
| Escalation path | Support/on-call role -> feature owner role -> operations lead role if unresolved. |
| SLA placeholder | Pending LT-L6-W01-T02 approval. |

## S4 Low Incident

| Field | Draft rule |
| --- | --- |
| Classification criteria | Cosmetic issue, documentation issue, low-impact configuration question, or non-urgent user assistance request. |
| Initial response | Log request, answer or route to backlog, and link relevant help/training material. |
| Escalation path | Support role -> documentation/training owner role if repeated. |
| SLA placeholder | Pending LT-L6-W01-T02 approval. |

## Alert Channel Trigger Mapping

These mappings are proposed triggers for `LT-L3-W06`. They are not live alert
channels and do not prove alert delivery.

| Alert source | Trigger | Severity | Runbook entry | Mapping status |
| --- | --- | --- | --- | --- |
| API availability monitor | Health check unavailable or sustained non-2xx | S1/S2 | S1 Critical or S2 High depending blast radius | pending_l3_w06 |
| Error-rate monitor | Error rate above approved SLO threshold | S2/S3 | S2 High or S3 Medium | pending_l3_w06 |
| p95 latency monitor | Latency above approved SLO threshold | S2/S3 | S2 High or S3 Medium | pending_l3_w06 |
| Audit chain integrity job | Hash-chain verification failure or missed daily verification | S1 | S1 Critical Incident | pending_l3_w06 |
| Graph integration monitor | Graph filing/upload/auth failure spike | S2 | S2 High Incident | pending_l3_w06 |
| Backup success monitor | Backup job failure or missed restore-readiness check | S2/S3 | S2 High or S3 Medium | pending_l3_w06 |
| Permission-denial anomaly monitor | Unexpected denial spike or possible ACL mismatch | S1/S2 | S1 Critical if leakage suspected; otherwise S2 High | pending_l3_w06 |

## Incident Lifecycle Procedure

1. Receive alert or support report and create an incident record with timestamp,
   reporter, affected surface, suspected severity, and evidence source.
2. Triage severity using S1-S4 criteria and document why the chosen severity
   applies.
3. Assign incident commander by role. If named on-call is not yet approved,
   record `pending_l6_w01_t02_oncall_assignment`.
4. Preserve evidence before making changes: logs, audit hints, screenshots,
   command output, and user-visible error text.
5. Contain impact using the least disruptive safe action: disable affected
   feature, pause risky writes, roll back, or keep read-only mode when available.
6. Communicate status to affected users and approval roles according to the
   severity and pending SLA model.
7. Resolve or mitigate, then verify recovery with a synthetic smoke check and
   relevant audit/permission evidence.
8. Close the incident only after the post-incident review form is completed or
   explicitly scheduled with owner and date.

## Communication Rules

| Rule | Required behavior |
| --- | --- |
| No unverified root cause | Communicate symptoms and current action until evidence supports root cause. |
| No production-data exposure | Do not paste personal, client, matter, document, or privileged content into incident channels. Use safe identifiers only. |
| Severity updates | Severity can be upgraded immediately when evidence warrants; downgrade requires incident commander note. |
| Approval path | Any rollback, production-data action, or break-glass path must follow the relevant approved runbook once available. |

## Post-Incident Review Form

| Field | Required |
| --- | --- |
| Incident ID | yes |
| Severity | yes |
| Start and end timestamps | yes |
| Affected surfaces | yes |
| Trigger source | yes |
| Customer/user impact | yes |
| Root cause summary | yes, or `not_yet_known` with owner/date |
| Detection gap | yes |
| Response timeline | yes |
| Corrective actions | yes |
| Recurrence prevention actions | yes |
| Owner and due date per action | yes |
| Evidence links | yes |

## Open Decisions

| Decision | Blocking TUW | Status |
| --- | --- | --- |
| Approved S1-S4 response and recovery SLA values | LT-L6-W01-T02 | pending_human_decision |
| Named primary/backup on-call roles | LT-L6-W01-T02 and LT-L1-W08 staffing | pending_human_decision |
| SLA/on-call decision brief | LT-L6-W01-T02 | draft_input_ready_pending_owner_decision |
| Live alert channels and routing | LT-L3-W06 | pending_monitoring_stack |
| Tabletop and simulated incident evidence | LT-L6-W01-T03 | pending_rehearsal |
