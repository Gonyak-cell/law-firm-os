# Launch Blocker Surface Audit

Generated at: 2026-06-18T15:39:47.991Z

Verdict: PASS

## Summary

- blocked_work_package_count: 70
- recorded_work_package_count: 2
- failed_gate_count: 10
- failed_gate_evidence_slot_count: 31
- l9_stabilization_closure_slot_count: 5
- total_manual_intake_row_count: 36
- pending_manual_intake_row_count: 36
- evidence_satisfied_manual_intake_row_count: 0
- owner_deferred_manual_intake_row_count: 0
- phase_count: 11
- blocked_phase_count: 11
- all_phase_exits_closed_or_owner_deferred: false
- owner_approved_deferrals_present: false
- coverage_eligible_valid_deferred_rows: 0
- non_coverage_valid_deferred_rows: 0
- manual_intake_validation_pass: true
- owner_action_validation_pass: true
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Phase Blockers

| Phase | Status | Blocked WP | Recorded WP | Missing evidence |
| --- | --- | ---: | ---: | ---: |
| PRE | blocked_missing_owner_approved_deferrals | 6 | 1 | 0 |
| L0 | blocked_missing_owner_approved_deferrals | 5 | 0 | 0 |
| L1 | blocked_missing_owner_approved_deferrals | 10 | 0 | 0 |
| L2 | blocked_missing_owner_approved_deferrals | 7 | 0 | 0 |
| L3 | blocked_missing_owner_approved_deferrals | 10 | 0 | 0 |
| L4 | blocked_missing_owner_approved_deferrals | 6 | 0 | 0 |
| L5 | blocked_missing_owner_approved_deferrals | 7 | 0 | 0 |
| L6 | blocked_missing_owner_approved_deferrals | 6 | 0 | 0 |
| L7 | blocked_missing_owner_approved_deferrals | 6 | 0 | 0 |
| L8 | blocked_missing_owner_approved_deferrals | 2 | 1 | 0 |
| L9 | blocked_missing_owner_approved_deferrals | 5 | 0 | 0 |

## Failed Gate Surface

| Gate | Status | Failed evidence slots | Manual intake rows | Related blocked WP |
| --- | --- | ---: | ---: | ---: |
| G1 | fail | 2 | 2 | 5 |
| G2 | fail | 3 | 3 | 7 |
| G3 | fail | 4 | 4 | 7 |
| G4 | fail | 4 | 4 | 8 |
| G5 | fail | 3 | 3 | 5 |
| G6 | fail | 4 | 4 | 7 |
| G7 | fail | 3 | 3 | 5 |
| G8 | fail | 3 | 3 | 4 |
| G9 | fail | 2 | 2 | 2 |
| G10 | fail | 3 | 3 | 3 |

## Manual Intake Resolution State

- Pending manual intake rows: 36
- Evidence-satisfied manual intake rows: 0
- Owner-deferred manual intake rows: 0
- Coverage-eligible valid deferred rows: 0

## Blocker Categories

| Category | Count |
| --- | ---: |
| runtime_or_operational_evidence | 36 |
| owner_decision_or_signature | 31 |
| policy_or_scope_decision | 16 |
| external_dependency | 10 |
| evidence_completion | 6 |

## Findings

No findings.

## Boundary

- This audit summarizes the current blocker surface only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not replace real runtime, security, M365, legal, pilot, UAT, or hypercare evidence.
- Full Claude review remains waived by user instruction and is not valid review evidence.
- Closed CP evidence remains read-only.
