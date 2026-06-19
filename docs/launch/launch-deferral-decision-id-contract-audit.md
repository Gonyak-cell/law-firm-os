# Launch Deferral Decision ID Contract Audit

Generated at: 2026-06-18T16:44:30.569Z

Verdict: PASS

## Summary

- required_domain_count: 4
- owner_action_domain_count: 4
- coverage_row_count: 117
- accepted_decision_id_mention_count: 346
- unique_accepted_decision_id_count: 153
- unclassified_decision_id_count: 0
- domain_mismatch_count: 0
- cross_domain_decision_id_count: 0
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Domain Contract

| Domain | Coverage rows | Accepted ID mentions | Unique IDs | Unclassified | Mismatched |
| --- | ---: | ---: | ---: | ---: | ---: |
| go_live_gate_evidence | 31 | 93 | 42 | 0 | 0 |
| l9_stabilization_closure | 5 | 10 | 6 | 0 | 0 |
| blocked_work_package | 70 | 210 | 82 | 0 | 0 |
| phase_exit | 11 | 33 | 23 | 0 | 0 |

## Findings

No findings.

## Boundary

- This audit validates decision ID classification only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not create or modify launch decision register rows.
- Closed CP evidence remains read-only.
