# Launch Deferral Coverage Audit

Generated at: 2026-06-18T15:56:12.657Z

Verdict: PASS

## Summary

- valid_deferred_decision_count: 4
- coverage_eligible_valid_deferred_decision_count: 4
- non_coverage_valid_deferred_decision_count: 0
- all_required_deferrals_covered: true
- go_live_deferral_coverage_complete: true
- l9_deferral_coverage_complete: true
- blocked_wp_deferral_coverage_complete: true
- phase_exit_deferral_coverage_complete: true
- go_live_missing_deferral_count: 0
- l9_missing_deferral_count: 0
- blocked_wp_missing_deferral_count: 0
- phase_exit_missing_deferral_count: 0
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Coverage Domains

| Domain | Total | Covered | Missing | Complete |
| --- | ---: | ---: | ---: | --- |
| go_live_gate_evidence | 31 | 31 | 0 | true |
| l9_stabilization_closure | 5 | 5 | 0 | true |
| blocked_work_package | 70 | 70 | 0 | true |
| phase_exit | 11 | 11 | 0 | true |

## Accepted Decision ID Patterns

- Gate evidence row: exact `ACC-GL-<gate>-<evidence>` or `COVERAGE-GATE-<gate>` or `COVERAGE-ALL-GO-LIVE`.
- L9 closure row: exact `ACC-L9-C##` or `COVERAGE-L9-STABILIZATION`.
- Blocked work package: exact `WP-<wp_id>` or `COVERAGE-PHASE-<phase>` or `COVERAGE-ALL-BLOCKED-WP`.
- Phase exit: exact `PHASE-<phase>` or `PHASE-<exit_gate>` or `COVERAGE-ALL-PHASE-EXITS`.

## Missing Deferral Targets

No missing deferral targets.

## Findings

No findings.

## Boundary

- This audit validates deferral coverage only.
- It does not approve go-live.
- It does not create or approve owner deferrals.
- A valid deferral must already exist in the launch decision register.
- Full Claude review remains waived by user instruction and is not valid review evidence.
- Closed CP evidence remains read-only.
