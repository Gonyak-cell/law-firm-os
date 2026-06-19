# Launch Closure Dependency Graph

Generated at: 2026-06-18T15:52:27.865Z

Verdict: PASS

## Summary

- phase_node_count: 11
- blocked_phase_node_count: 11
- failed_gate_node_count: 10
- gate_acceptance_node_count: 31
- l9_closure_node_count: 5
- pending_acceptance_node_count: 35
- evidence_satisfied_acceptance_node_count: 1
- owner_deferred_acceptance_node_count: 0
- missing_intake_acceptance_node_count: 0
- blocked_wp_node_count: 70
- owner_approved_deferrals_present: false
- coverage_eligible_valid_deferred_rows: 0
- non_coverage_valid_deferred_rows: 0
- go_live_all_pass: false
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Phase Exit Nodes

| Phase | Exit gate | Status | Blocked WP | Gate blockers |
| --- | --- | --- | ---: | --- |
| PRE | PRE-EXIT | blocked_missing_owner_approved_deferrals | 6 | none |
| L0 | L0-EXIT | blocked_missing_owner_approved_deferrals | 5 | G1, G2, G3 |
| L1 | L1-EXIT | blocked_missing_owner_approved_deferrals | 10 | G10, G7 |
| L2 | L2-EXIT | blocked_missing_owner_approved_deferrals | 7 | G2, G3 |
| L3 | L3-EXIT | blocked_missing_owner_approved_deferrals | 10 | G4, G5, G6 |
| L4 | L4-EXIT | blocked_missing_owner_approved_deferrals | 6 | none |
| L5 | L5-EXIT | blocked_missing_owner_approved_deferrals | 7 | G3, G4, G7 |
| L6 | L6-EXIT | blocked_missing_owner_approved_deferrals | 6 | G6, G7 |
| L7 | L7-EXIT | blocked_missing_owner_approved_deferrals | 6 | G8 |
| L8 | L8-EXIT | blocked_missing_owner_approved_deferrals | 2 | G1, G10, G2, G3, G4, G5, G6, G7, G8, G9 |
| L9 | L9-EXIT | blocked_missing_owner_approved_deferrals | 5 | none |

## Failed Gate Nodes

| Gate | Status | Acceptance rows | Related blocked WP | Related phases |
| --- | --- | ---: | ---: | --- |
| G1 | fail | 2 | 5 | L0, L8 |
| G2 | fail | 3 | 7 | L0, L2, L8 |
| G3 | fail | 4 | 7 | L0, L2, L5, L8 |
| G4 | fail | 4 | 8 | L3, L5, L8 |
| G5 | fail | 3 | 5 | L3, L8 |
| G6 | fail | 4 | 7 | L3, L6, L8 |
| G7 | fail | 3 | 5 | L1, L5, L6, L8 |
| G8 | fail | 3 | 4 | L7, L8 |
| G9 | fail | 2 | 2 | L8 |
| G10 | fail | 3 | 3 | L1, L8 |

## L9 Closure Nodes

| Acceptance | Criterion | Status | Intake |
| --- | --- | --- | --- |
| ACC-L9-C01 | Last 14 days P0/P1 count equals zero | blocked_not_measured | L9-C01 |
| ACC-L9-C02 | Four consecutive weeks SLO met | blocked_not_measured | L9-C02 |
| ACC-L9-C03 | Four weeks audit completeness green | blocked_not_measured | L9-C03 |
| ACC-L9-C04 | Every incident has post-analysis link | blocked_not_measured | L9-C04 |
| ACC-L9-C05 | Owner signoff | missing | L9-C05 |

## Acceptance Resolution State

- Pending acceptance nodes: 35
- Evidence-satisfied acceptance nodes: 1
- Owner-deferred acceptance nodes: 0
- Missing-intake acceptance nodes: 0
- Coverage-eligible valid deferred rows: 0

## Findings

No findings.

## Boundary

- This graph records dependency topology only.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not convert pending intake rows into satisfied evidence.
- Full Claude review remains waived by user instruction and is not valid review evidence.
- Closed CP evidence remains read-only.
