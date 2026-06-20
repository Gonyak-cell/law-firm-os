# Launch Deferral Coverage Options

Generated at: 2026-06-18T17:03:53.470Z

## Boundary

- This is a routing-options package only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not modify `docs/launch/launch-decision-register.md`.
- Every option still requires real owner role/name, decision, basis, date or revisit gate, and approval signature reference.
- Full Claude review remains waived and is not valid review evidence.
- Closed CP evidence remains read-only.

## Summary

- missing_deferral_target_count: 117
- template_row_count: 117
- intake_target_count: 117
- minimum_bundle_decision_id_count: 4
- minimum_bundle_covered_target_count: 117
- minimum_bundle_uncovered_target_count: 0
- domain_aggregate_option_count: 4
- gate_option_count: 10
- blocked_wp_phase_option_count: 11
- phase_exit_option_count: 11
- exact_target_option_count: 117
- not_approved_option_count: 153

## Minimum All-Target Routing Bundle

| Decision ID | Domain | Targets | Owner basis required |
| --- | --- | ---: | --- |
| COVERAGE-ALL-GO-LIVE | go_live_gate_evidence | 31 | Owner accepts deferring all currently failed go-live gate evidence slots. |
| COVERAGE-L9-STABILIZATION | l9_stabilization_closure | 5 | Owner accepts deferring all currently blocked L9 stabilization closure criteria. |
| COVERAGE-ALL-BLOCKED-WP | blocked_work_package | 70 | Owner accepts deferring all currently blocked PRE-L9 launch work packages. |
| COVERAGE-ALL-PHASE-EXITS | phase_exit | 11 | Owner accepts deferring all currently blocked PRE-L9 phase exits. |

## Domain Aggregate Options

| Decision ID | Domain | Targets |
| --- | --- | ---: |
| COVERAGE-ALL-GO-LIVE | go_live_gate_evidence | 31 |
| COVERAGE-L9-STABILIZATION | l9_stabilization_closure | 5 |
| COVERAGE-ALL-BLOCKED-WP | blocked_work_package | 70 |
| COVERAGE-ALL-PHASE-EXITS | phase_exit | 11 |

## Gate Options

| Decision ID | Targets |
| --- | ---: |
| COVERAGE-GATE-G1 | 2 |
| COVERAGE-GATE-G10 | 3 |
| COVERAGE-GATE-G2 | 3 |
| COVERAGE-GATE-G3 | 4 |
| COVERAGE-GATE-G4 | 4 |
| COVERAGE-GATE-G5 | 3 |
| COVERAGE-GATE-G6 | 4 |
| COVERAGE-GATE-G7 | 3 |
| COVERAGE-GATE-G8 | 3 |
| COVERAGE-GATE-G9 | 2 |

## Phase Options

| Decision ID | Domain | Targets |
| --- | --- | ---: |
| COVERAGE-PHASE-L0 | blocked_work_package | 5 |
| COVERAGE-PHASE-L1 | blocked_work_package | 10 |
| COVERAGE-PHASE-L2 | blocked_work_package | 7 |
| COVERAGE-PHASE-L3 | blocked_work_package | 10 |
| COVERAGE-PHASE-L4 | blocked_work_package | 6 |
| COVERAGE-PHASE-L5 | blocked_work_package | 7 |
| COVERAGE-PHASE-L6 | blocked_work_package | 6 |
| COVERAGE-PHASE-L7 | blocked_work_package | 6 |
| COVERAGE-PHASE-L8 | blocked_work_package | 2 |
| COVERAGE-PHASE-L9 | blocked_work_package | 5 |
| COVERAGE-PHASE-PRE | blocked_work_package | 6 |
| PHASE-L0 | phase_exit | 1 |
| PHASE-L1 | phase_exit | 1 |
| PHASE-L2 | phase_exit | 1 |
| PHASE-L3 | phase_exit | 1 |
| PHASE-L4 | phase_exit | 1 |
| PHASE-L5 | phase_exit | 1 |
| PHASE-L6 | phase_exit | 1 |
| PHASE-L7 | phase_exit | 1 |
| PHASE-L8 | phase_exit | 1 |
| PHASE-L9 | phase_exit | 1 |
| PHASE-PRE | phase_exit | 1 |

## Copy Rule

An option can become a launch decision register row only after a real owner supplies all required decision evidence. This package is not itself approval evidence.
