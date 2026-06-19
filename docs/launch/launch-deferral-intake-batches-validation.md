# Launch Deferral Intake Batches Validation

Generated at: 2026-06-18T17:00:30.099Z

Verdict: PASS

## Summary

- intake_target_count: 115
- source_missing_deferral_target_count: 115
- template_row_count: 115
- batch_count: 8
- non_empty_batch_count: 8
- decision_register_total_rows: 0
- decision_register_valid_deferred_rows: 0
- not_approved_target_count: 115
- template_matched_target_count: 115
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Findings

No findings.

## Boundary

- This validation checks intake routing only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It confirms the launch decision register remains unmodified by the intake package.
- Closed CP evidence remains read-only.
