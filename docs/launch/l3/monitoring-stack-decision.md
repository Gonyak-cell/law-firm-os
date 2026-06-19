# Monitoring Stack Decision Brief

Status: blocked_pending_l1_w06_hosting_decision_and_owner_selection
Work package: LT-L3-W06
TUW: LT-L3-W06-T01
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This brief is a decision input only. It does not select a monitoring stack,
does not create logs or metrics infrastructure, does not open alert channels,
does not define final SLO thresholds, does not trigger alerts, and does not
modify `tools/progress-control-room/`. The progress control room remains a
development dashboard; L3-W06 requires a separate operations monitoring path.

LT-L3-W06-T01 remains blocked until the L1-W06 hosting/stack decision is
approved and an owner records the selected monitoring stack, basis, date, and
approval reference.

## Candidate Stack Comparison

Cost values are deliberately not priced here because the hosting model, region,
data volume, retention period, and procurement path are not approved. L1-W07
budget work must collect quote-backed values after L1-W06.

| Candidate ID | Candidate stack | Logs coverage | Metrics coverage | Alerting coverage | Cost input needed | Hosting compatibility state | Decision state |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MON-CAND-01 | Azure Monitor, Application Insights, Log Analytics, and Action Groups | API/app logs, platform logs, queryable retention if Azure is selected. | App metrics, availability, latency, dependency, custom backup/audit job metrics. | Action Groups can route alert notifications once owners/channels are approved. | Azure subscription, ingestion, retention, alerting, and export quote required. | Candidate only; naturally compatible with Azure/Entra proximity but Azure is not preselected. | pending_owner_selection |
| MON-CAND-02 | OpenTelemetry Collector, Prometheus, Loki, Grafana, and Alertmanager | Application logs through Loki or compatible backend; requires self-hosted retention design. | Prometheus metrics and custom exporters for API, audit verify, Graph, and backups. | Alertmanager routes alerts after channels and on-call are approved. | Hosting/ops capacity, storage retention, managed Grafana option, and support quote required. | Candidate only; can fit on-prem or cloud but increases operations ownership. | pending_owner_selection |
| MON-CAND-03 | Datadog or equivalent commercial observability SaaS | Hosted log ingestion and search if data residency/procurement policy allows. | Hosted APM, infrastructure, synthetics, and custom business metrics. | Hosted alert routing after tenant/admin and support-channel setup. | Vendor subscription, log volume, retention, user count, and legal/procurement review required. | Candidate only; depends on data residency, contract, and client confidentiality acceptance. | pending_owner_selection |

## Required Signal Inventory

These are required launch signals from the L3 plan. T03 must turn them into
approved thresholds and alert rules after the monitoring stack is selected.

| Signal ID | Signal | Minimum measurement method | Alert dependency | Current state |
| --- | --- | --- | --- | --- |
| SLO-SIGNAL-01 | API availability during business hours | synthetic health check plus service uptime metric | monitoring stack and alert route | threshold_pending_except_launch_starting_point_99_5_percent |
| SLO-SIGNAL-02 | API p95 latency | request duration histogram or APM trace metric | monitoring stack and traffic source | threshold_pending_owner_approval |
| SLO-SIGNAL-03 | API error rate | HTTP status/error counter over approved window | monitoring stack and traffic source | threshold_pending_owner_approval |
| SLO-SIGNAL-04 | Audit chain integrity daily verification | scheduled read-only chain verification job result | LT-L3-W04 WORM store and LT-L3-W06-T04 job | pending_l3_w04_and_t04 |
| SLO-SIGNAL-05 | Graph integration status | Graph auth/filing/upload probe and failure counter | LT-L3-W07/L3-W09 Graph readiness | pending_m365_admin_and_scope_decision |
| SLO-SIGNAL-06 | Backup success rate | backup job result log and restore-readiness signal | LT-L3-W05 backup automation | pending_l3_w05_t02 |

## Compatibility Questions For Owner Decision

| Question | Why it matters | Current answer |
| --- | --- | --- |
| Is hosting on Azure, on-prem, or hybrid? | Determines native platform monitoring, network path, and data residency. | pending_l1_w06 |
| What retention period is required for logs and metrics? | Drives ingestion/storage cost and confidentiality risk. | pending_owner_approval |
| Which alert channels are approved? | Needed before Action Groups, Alertmanager, or SaaS routing can be activated. | pending_l6_w01_t02_and_support_channel_decision |
| Who owns monitoring administration? | Required for access control, escalation, and auditability. | pending_staffing_and_oncall |
| Are external observability SaaS tools allowed for legal operational metadata? | Needed before any hosted vendor option can be selected. | pending_legal_or_owner_policy |

## Decision Registration Note

Do not paste an L3-specific row into `docs/launch/launch-decision-register.md`
until owner evidence exists and the register key rules are extended or the
decision is explicitly mapped into the approved L1-6a hosting/stack decision
family. The current register template allows L1, OQ, and PRD8 key families
only, so Codex must not invent an `L3-*` decision key.

| Required decision field | Required value before T01 can pass |
| --- | --- |
| Register key | Approved L1-6a mapping or owner-approved decision-register key extension. |
| Owner | Owner-supplied real-person role with monitoring/procurement authority. |
| Decision | Selected stack and explicit non-selection of alternatives. |
| Basis | Hosting compatibility, signal coverage, cost quote, data residency, and operations ownership. |
| Date | Owner-provided decision date. |
| Approval reference | Signature, ticket, meeting note, or equivalent approval record. |

## Blocked State

| Blocked artifact or phase | Reason |
| --- | --- |
| `infra/monitoring/` runtime configuration | Stack not selected and staging topology not active. |
| `docs/launch/l3/slo-definition.md` final thresholds | Monitoring stack and owner-approved thresholds missing. |
| Alert delivery evidence | Alert channels, on-call ownership, and monitoring runtime not configured. |
| LT-L6-W01 incident runbook activation | Live alert channels and SLA/on-call decisions remain pending. |
| G6 go-live evidence | SLO dashboard and alert fire evidence do not exist. |

## Review Policy

Per user instruction on 2026-06-18, full Claude review is waived for future
work. This waiver is recorded as `review_waived_by_user` and is not valid
review evidence.
