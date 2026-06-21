# Launch Decision Register Validation

Generated at: 2026-06-18T15:13:59.707Z

Verdict: PASS

## Summary

- register_exists: true
- total_rows: 4
- decided_rows: 0
- deferred_rows: 4
- valid_decided_rows: 0
- valid_deferred_rows: 4
- coverage_eligible_valid_deferred_rows: 4
- non_coverage_valid_deferred_rows: 0
- invalid_decision_rows: 0
- owner_approved_deferrals_present: true
- deferral_coverage_key_rules_documented: true
- missing_deferral_coverage_key_rule_count: 0
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Findings

No findings.

## Boundary

- This validation checks launch decision register structure only.
- It does not approve go-live.
- It does not approve or create owner deferrals.
- Only complete `deferred(시한 명기)` rows with owner, basis, target date or revisit gate, and approval signature count as owner-approved deferrals.
