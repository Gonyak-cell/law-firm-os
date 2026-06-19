# Operations Dashboard Definition

Status: draft_blocked_pending_monitoring_stack_and_staging_runtime
Work package: LT-L3-W06
TUW: LT-L3-W06-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a dashboard definition draft only. It does not create
`infra/monitoring/`, does not configure collectors, does not ingest staging
logs, does not render a live dashboard, does not fire alerts, and does not
modify `tools/progress-control-room/`.

The progress control room remains a development status surface. The operations
dashboard must be a separate monitoring artifact after LT-L3-W06-T01 stack
selection and LT-L3-W02 staging runtime activation.

## Data Source Requirements

| Source ID | Required source | Required signal | Current state |
| --- | --- | --- | --- |
| OPS-SRC-01 | Staging API request telemetry | status code, duration, route, tenant/matter-safe reference, trace id | pending_staging_runtime |
| OPS-SRC-02 | Application log stream | structured log level, request id, error code, safe message | pending_monitoring_stack |
| OPS-SRC-03 | Audit chain verification job | last run time, result, verified record count, failure reason | pending_l3_w04_and_l3_w06_t04 |
| OPS-SRC-04 | Graph integration probe | auth result, filing/upload probe result, failure counter | pending_l3_w07_and_l3_w09 |
| OPS-SRC-05 | Backup job telemetry | scheduled job count, success count, missed/failed jobs, restore-readiness marker | pending_l3_w05_t02 |

## Dashboard Panel Inventory

| Panel ID | Panel | Primary measure | Filter or grouping | Acceptance dependency |
| --- | --- | --- | --- | --- |
| OPS-PANEL-01 | API availability | business-hours uptime or successful health checks | environment, route family | LT-L3-W06-T03 threshold approval |
| OPS-PANEL-02 | API p95 latency | p95 request duration | route family, environment | LT-L3-W06-T02 runtime traffic data |
| OPS-PANEL-03 | API error rate | 5xx and handled error percentage | route family, environment | LT-L3-W06-T03 threshold approval |
| OPS-PANEL-04 | Audit chain daily verification | last verify result and verified record count | audit store, environment | LT-L3-W06-T04 job |
| OPS-PANEL-05 | Graph integration status | Graph probe success/failure and auth failure count | mailbox/site/test tenant | LT-L3-W07/L3-W09 readiness |
| OPS-PANEL-06 | Backup success rate | successful backup jobs divided by scheduled jobs | store, schedule, environment | LT-L3-W05-T02 automation |

## Staging Log Query Slots

These query slots define the evidence expected by LT-L3-W06-T02. They are not
executed in this draft.

| Query ID | Query purpose | Required result before T02 can pass |
| --- | --- | --- |
| LOG-QUERY-01 | Fetch recent staging API request logs by route and status. | At least one staging request row with timestamp, route, status, and request id. |
| LOG-QUERY-02 | Fetch p95 latency source data for a selected staging time window. | Numeric duration values sufficient to calculate p95. |
| LOG-QUERY-03 | Fetch API error-rate source data for a selected staging time window. | Request total and error count for the same window. |
| LOG-QUERY-04 | Fetch audit chain verification job logs. | Last run status and verified record count after LT-L3-W06-T04 exists. |
| LOG-QUERY-05 | Fetch backup job result logs. | Scheduled, success, missed, and failed job counts after LT-L3-W05-T02 exists. |

## T02 Evidence Slots

| Evidence ID | Required evidence | Current state |
| --- | --- | --- |
| DASH-EV-01 | Dashboard export or screenshot containing p95 latency panel. | pending_runtime_dashboard |
| DASH-EV-02 | Dashboard export or screenshot containing error-rate panel. | pending_runtime_dashboard |
| DASH-EV-03 | Log query output returning staging request logs. | pending_staging_runtime |
| DASH-EV-04 | `git status --porcelain tools/progress-control-room/` captured to prove no dashboard overwrite. | pending_final_t02_validation |
| DASH-EV-05 | Monitoring stack data-source configuration reference. | pending_l3_w06_t01_selection |

## Blocking Dependencies

| Blocker | Why T02 cannot pass yet |
| --- | --- |
| LT-L3-W06-T01 owner-selected stack | Dashboard syntax, data-source type, and cost path are unknown. |
| LT-L3-W02-T02 staging runtime | No staging traffic exists to populate panels or log queries. |
| LT-L3-W04 WORM store and LT-L3-W06-T04 audit job | Audit chain panel cannot become live. |
| LT-L3-W05-T02 backup automation | Backup success panel cannot become live. |
| LT-L3-W07/L3-W09 Graph readiness | Graph integration panel cannot become live. |

## Non-Production Data Rule

Until the production-data gate opens, dashboard examples and query validation
must use synthetic, local, or staging telemetry only. Client names, matter
names, personal data, document contents, or privileged legal text must not be
copied into dashboard labels, logs, screenshots, or exported evidence.
