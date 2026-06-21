# Launch Decision Register Import Application Audit

Generated at: 2026-06-19T00:25:42.471Z

Verdict: PASS

## Summary

- import_candidate_count: 2
- applied_candidate_count: 0
- pending_application_count: 2
- mismatched_application_count: 0
- duplicate_register_row_count: 0
- decision_register_total_rows: 0
- decision_register_valid_deferred_rows: 0
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Candidate Application Rows

| Decision ID | Application state | Field mismatches |
| --- | --- | ---: |
| COVERAGE-ALL-GO-LIVE | pending_manual_application | 0 |
| COVERAGE-L9-STABILIZATION | pending_manual_application | 0 |

## Findings

No findings.

## Boundary

- This audit checks decision-register import candidate application only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not modify the launch decision register.
- Pending import application does not count as owner approval.
- Empty import-candidate state is valid but does not count as owner approval.
- Full Claude review remains waived and is not valid review evidence.
- Closed CP evidence remains read-only.
