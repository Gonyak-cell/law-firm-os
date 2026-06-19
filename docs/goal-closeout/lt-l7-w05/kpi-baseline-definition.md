# Pilot KPI Baseline Definition

Status: draft_blocked_pending_pilot_telemetry_target_approval_dashboard_or_report_route_and_l9_measurement_run
Work package: LT-L7-W05
TUW: LT-L7-W05-T02
Prepared at: 2026-06-18
Review policy: review_waived_by_user

## Boundary

This is a KPI baseline definition draft only. It does not query pilot
telemetry, does not prove one day of collected data, does not publish a
dashboard or report, does not set numeric targets, and does not claim
LT-L7-W05-T02 or LT-L7-W05 completion.

The L6 KPI definitions and synthetic collector are valid source inputs, but
they are not pilot baseline evidence. Pilot baseline values require real
approved pilot telemetry after kickoff, with no raw sensitive fields exposed.

## Source Links

| Link ID | Target | Use |
| --- | --- | --- |
| KPI-BASE-SRC-01 | `../../launch/kpi/kpi-definitions.md` | Seven PRD KPI formulas and source fields |
| KPI-BASE-SRC-02 | `../../launch/kpi/kpi-collection-commands.md` | Synthetic and future staging collection command shape |
| KPI-BASE-SRC-03 | `../lt-l6-w06/command-evidence.json` | L6 KPI infrastructure evidence and blockers |
| KPI-BASE-SRC-04 | `pilot-kickoff-checklist.md` | Pilot start prerequisites |
| KPI-BASE-SRC-05 | `../../../workbook/matter_dev_docs/01_제품_사양명세서_PRD_SRS.md` | PRD section 7 source |
| KPI-BASE-SRC-06 | `../../../workbook/launch-tuw/20_L9.md` | L9 measurement handoff context |

## Pilot Operating Metrics

| Metric ID | Operating metric | Formula | Collection source | Minimum pilot evidence before close | Current state |
| --- | --- | --- | --- | --- | --- |
| PILOT-METRIC-01 | SLO compliance rate | compliant_checks / total_checks | Monitoring/SLO aggregate for approved pilot window | 1 day of timestamped SLO output | no_pilot_data |
| PILOT-METRIC-02 | Daily audit-chain verification | successful_daily_verifications / expected_daily_verifications | Audit-chain verification job or report | 1 daily verification result with expected and observed counts | no_pilot_data |
| PILOT-METRIC-03 | Filing success rate | successful_filings / attempted_filings | Outlook Add-in filing events and filing history | 1 day of attempted/success/failed filing counts | no_pilot_data |
| PILOT-METRIC-04 | Permission block events | blocked_permission_events and leakage_count | Permission denial/audit aggregate | 1 day of blocked count plus leakage count 0 check | no_pilot_data |

## PRD KPI Baseline Definitions

| Baseline ID | PRD KPI | Formula | Pilot collection source | Cadence | Baseline value state |
| --- | --- | --- | --- | --- | --- |
| L7-KPI-BASE-01 | Matter status visibility | visible_required_matter_home_signals / required_matter_home_signals | Matter Home read model or screen telemetry aggregate | daily during pilot | unavailable_pending_pilot_telemetry |
| L7-KPI-BASE-02 | Filing usage rate | filed_outlook_emails / eligible_outlook_emails | Outlook Add-in filing aggregate | daily during pilot | unavailable_pending_pilot_telemetry |
| L7-KPI-BASE-03 | Document integrity | qc_errors_fixed / qc_errors_detected | Document QC and issue/task resolution aggregate | weekly during pilot | unavailable_pending_pilot_telemetry |
| L7-KPI-BASE-04 | AI reliability | Wave 1 zero-output check, then source_linked_ai_outputs / total_ai_outputs after AI gate | AI disabled-state/config plus later AI Review Queue aggregate | daily zero-check during Wave 1 | unavailable_pending_ai_off_runtime_evidence |
| L7-KPI-BASE-05 | Security | blocked_unauthorized_attempts / unauthorized_attempts; audit_events_present / expected_audit_events | Permission denial and audit completeness aggregate | daily during pilot | unavailable_pending_pilot_telemetry |
| L7-KPI-BASE-06 | HR stability | blocked_hr_sensitive_attempts / hr_sensitive_attempts; rule_engine_separation_passes / rule_engine_separation_checks | HR separation synthetic checks until HR pilot approval | weekly or pre-HR pilot | unavailable_pending_hr_gate |
| L7-KPI-BASE-07 | Knowledge conversion | knowledge_packs_created / closed_matters | Matter closing and knowledge candidate handoff aggregate | monthly after close events exist | unavailable_pending_pilot_telemetry |

## L9 Measurement Input Mapping

The field set below is the L7-to-L9 handoff shape. L9 can ingest either a
dashboard export or report output if it preserves these fields.

| Mapping ID | KPI | Required L9 fields | Current compatibility |
| --- | --- | --- | --- |
| L9-MAP-01 | Matter status visibility | metric_id, window_start, window_end, sampled_matter_count, visible_signal_count, required_signal_count, ratio, synthetic_or_pilot_source | format_defined_no_values |
| L9-MAP-02 | Filing usage rate | metric_id, window_start, window_end, eligible_email_count, filed_email_count, failed_filing_count, ratio, filing_mode_breakdown | format_defined_no_values |
| L9-MAP-03 | Document integrity | metric_id, window_start, window_end, qc_detected_count, qc_fixed_count, final_send_blocked_count, ratio, severity_breakdown | format_defined_no_values |
| L9-MAP-04 | AI reliability | metric_id, window_start, window_end, ai_outputs_count, source_linked_count, hallucination_incident_count, ai_disabled_state | format_defined_no_values |
| L9-MAP-05 | Security | metric_id, window_start, window_end, unauthorized_attempt_count, blocked_count, leakage_count, expected_audit_count, observed_audit_count | format_defined_no_values |
| L9-MAP-06 | HR stability | metric_id, window_start, window_end, hr_sensitive_attempt_count, blocked_count, separation_check_count, separation_pass_count, ai_role_boundary_result | format_defined_no_values |
| L9-MAP-07 | Knowledge conversion | metric_id, window_start, window_end, closed_matter_count, knowledge_candidate_count, knowledge_pack_created_count, approval_state_breakdown | format_defined_no_values |

## Query And Report Routes

| Query ID | Metric or report | Draft route | Current state |
| --- | --- | --- | --- |
| KPI-QUERY-01 | Operating metrics 4-pack | Future pilot aggregate report: SLO, audit-chain, filing, permission-block events | pending_pilot_report_route |
| KPI-QUERY-02 | Seven PRD KPI baselines | Future dashboard/report export using L9 mapping fields | pending_dashboard_or_report |
| KPI-QUERY-03 | Synthetic collector smoke | `node apps/ops-kpi/collect.mjs --all` | synthetic_only_available_from_l6 |
| KPI-QUERY-04 | Future staging/pilot collector | `node apps/ops-kpi/collect.mjs --all --input <approved-pilot-aggregate-kpi-input.json>` | pending_approved_pilot_input |

## Target And Baseline Rules

1. Do not set numeric targets in this document; target approval belongs to
   owner decision evidence.
2. Do not treat synthetic collector output as pilot baseline values.
3. Do not expose raw client, matter, email body, document body, HR, privileged,
   or personal data in KPI exports.
4. Keep Wave 1 AI reliability as an off-state/zero-output check until a later
   AI release gate opens.
5. Preserve L9 mapping fields even when a KPI is unavailable, using null value
   plus blocker reason rather than dropping the row.

## Open Blockers

| Blocker | Required resolution |
| --- | --- |
| Pilot telemetry | At least 1 day of approved pilot aggregate data for 4 operating metrics. |
| Dashboard/report route | Reproducible route to query or export the pilot metrics. |
| Target approval | LT-L6-W06-T02 target decisions remain pending owner approval. |
| Runtime event gaps | L2/L3/L6 runtime collection gaps must be closed before live measurement. |
