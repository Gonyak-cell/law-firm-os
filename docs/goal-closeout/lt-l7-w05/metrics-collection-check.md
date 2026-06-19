# Pilot Metrics Collection Check

Status: draft_blocked_pending_one_day_pilot_data_dashboard_or_report_route_and_target_approval
Work package: LT-L7-W05
TUW: LT-L7-W05-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a metrics collection check draft only. It does not query staging or
production, does not collect one day of pilot data, does not publish a
dashboard, does not verify target comparison, and does not claim
LT-L7-W05-T02 or LT-L7-W05 completion.

The current executable collector is synthetic-only and documented by L6. It can
confirm output shape, not pilot readiness.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| METRICS-SRC-01 | `kpi-baseline-definition.md` | Baseline formula and L9 field mapping |
| METRICS-SRC-02 | `../../launch/kpi/kpi-collection-commands.md` | Synthetic and future collector command shapes |
| METRICS-SRC-03 | `../lt-l6-w06/command-evidence.json` | L6 synthetic collector and blockers |
| METRICS-SRC-04 | `pilot-kickoff-checklist.md` | Pilot runtime prerequisites |

## One-Day Operating Metric Evidence Slots

| Check ID | Required one-day output | Required fields | Current state |
| --- | --- | --- | --- |
| COLLECT-CHECK-01 | SLO compliance rate output | window_start, window_end, total_checks, compliant_checks, ratio | not_collected |
| COLLECT-CHECK-02 | Audit-chain daily verification output | expected_verifications, successful_verifications, missing_or_failed_count | not_collected |
| COLLECT-CHECK-03 | Filing success rate output | attempted_filings, successful_filings, failed_filings, ratio | not_collected |
| COLLECT-CHECK-04 | Permission block event output | unauthorized_attempt_count, blocked_count, leakage_count, observed_audit_count | not_collected |

## Reproducible Query Slots

| Query Slot ID | Intended command or route | Allowed data shape | Current state |
| --- | --- | --- | --- |
| METRICS-QUERY-01 | Dashboard/report export for 4 operating metrics | aggregate counts only | pending_dashboard_or_report |
| METRICS-QUERY-02 | Dashboard/report export for 7 PRD KPI baselines | L9 mapping rows with nulls allowed for blocked metrics | pending_dashboard_or_report |
| METRICS-QUERY-03 | `node apps/ops-kpi/collect.mjs --all` | synthetic aggregate only | available_synthetic_shape_check |
| METRICS-QUERY-04 | `node apps/ops-kpi/collect.mjs --all --input <approved-pilot-aggregate-kpi-input.json>` | approved aggregate pilot telemetry only | pending_approved_pilot_input |

## Current Data Availability

| Availability ID | Item | Current value |
| --- | --- | --- |
| METRICS-AVAIL-01 | One-day SLO output | absent |
| METRICS-AVAIL-02 | One-day audit-chain output | absent |
| METRICS-AVAIL-03 | One-day filing output | absent |
| METRICS-AVAIL-04 | One-day permission-block output | absent |
| METRICS-AVAIL-05 | Dashboard/report route | absent |
| METRICS-AVAIL-06 | Approved pilot aggregate input file | absent |
| METRICS-AVAIL-07 | Target comparison | absent |

## Synthetic Shape Check

The L6 synthetic collector can be used to confirm that seven KPI rows can be
rendered from aggregate inputs. It cannot satisfy the T02 requirement for one
day of pilot operating data.

| Synthetic Check ID | Expected property | Current interpretation |
| --- | --- | --- |
| METRICS-SYN-01 | kpi_count = 7 | shape check only |
| METRICS-SYN-02 | synthetic_only = true | not pilot data |
| METRICS-SYN-03 | no_real_data = true | safe for local validation |
| METRICS-SYN-04 | dashboard_published = false | dashboard route still blocked |
| METRICS-SYN-05 | auto_refresh_24h_verified = false | refresh evidence still blocked |

## Closeout Requirements Still Open

| Requirement ID | T02 requirement | Current state |
| --- | --- | --- |
| METRICS-CLOSE-01 | Four operating metrics each have at least one day of collected output. | blocked_no_pilot_data |
| METRICS-CLOSE-02 | Seven PRD KPIs have formula, source, cadence, and baseline definition. | draft_defined_pending_review_against_runtime |
| METRICS-CLOSE-03 | L9-2 input mapping is compatible and complete. | draft_defined_no_values |
| METRICS-CLOSE-04 | Query/dashboard/report route is documented and reproducible. | draft_route_only |

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| Pilot runtime | Pilot must start and produce approved aggregate telemetry. |
| Monitoring/audit/filing/permission collection | Runtime sources must expose the 4 operating metric outputs. |
| Dashboard/report route | A reproducible query, dashboard, or export must exist. |
| Target approval | Numeric targets and comparison logic remain owner-decision dependent. |
