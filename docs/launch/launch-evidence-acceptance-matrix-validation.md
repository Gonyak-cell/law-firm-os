# Launch Evidence Acceptance Matrix Validation

Generated at: 2026-06-18T15:48:43.598Z

Verdict: PASS

## Summary

- gate_acceptance_row_count: 31
- l9_acceptance_row_count: 5
- total_acceptance_row_count: 36
- pending_acceptance_row_count: 0
- evidence_satisfied_acceptance_row_count: 0
- owner_deferred_acceptance_row_count: 36
- missing_intake_acceptance_row_count: 0
- gate_pending_acceptance_row_count: 0
- gate_evidence_satisfied_acceptance_row_count: 0
- gate_owner_deferred_acceptance_row_count: 31
- l9_pending_acceptance_row_count: 0
- l9_evidence_satisfied_acceptance_row_count: 0
- l9_owner_deferred_acceptance_row_count: 5
- valid_decision_register_deferred_rows: 4
- coverage_eligible_valid_deferred_rows: 4
- non_coverage_valid_deferred_rows: 0
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Findings

No findings.

## Boundary

- This validation checks matrix structure and coverage only.
- It does not approve go-live or owner deferrals.
- Acceptance rows remain pending until real evidence or a valid owner-approved deferral is recorded.
