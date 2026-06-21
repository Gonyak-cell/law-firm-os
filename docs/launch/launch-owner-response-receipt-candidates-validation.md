# Launch Owner Response Receipt Candidates Validation

Generated at: 2026-06-19T00:15:13.237Z

Verdict: PASS

## Summary

- receipt_update_candidate_count: 3
- expected_receipt_update_candidate_count: 3
- response_entry_count: 4
- real_owner_response_count: 3
- copy_allowed_response_count: 3
- target_count_by_candidates: 106
- receipt_ledger_current_real_receipt_count: 2
- receipt_ledger_current_copy_allowed_count: 2
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Findings

No findings.

## Boundary

- This validation checks receipt-update candidates only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not modify the owner approval receipt ledger.
- It does not modify the launch decision register.
- Pending owner responses are excluded from candidates.
- Closed CP evidence remains read-only.
