# Launch Deferral Action Crosswalk Audit

Generated at: 2026-06-18T16:48:11.004Z

Verdict: PASS

## Summary

- missing_deferral_target_count: 115
- crosswalk_row_count: 115
- action_linked_count: 115
- missing_action_source_count: 0
- gate_manual_intake_link_count: 29
- l9_manual_intake_link_count: 5
- blocked_wp_owner_action_link_count: 70
- phase_exit_link_count: 11
- finding_count: 0
- p0_count: 0
- p1_count: 0

## Domain Summary

| Domain | Count |
| --- | ---: |
| blocked_work_package | 70 |
| go_live_gate_evidence | 29 |
| phase_exit | 11 |
| l9_stabilization_closure | 5 |

## Missing Deferral Crosswalk

| Domain | Coverage | Action source | Action ref | Accepted decision IDs |
| --- | --- | --- | --- | --- |
| go_live_gate_evidence | ACC-GL-G2-G2-E01 | manual_intake_and_failed_gate_action | GL-G2-G2-E01 | ACC-GL-G2-G2-E01<br>COVERAGE-GATE-G2<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G2-G2-E02 | manual_intake_and_failed_gate_action | GL-G2-G2-E02 | ACC-GL-G2-G2-E02<br>COVERAGE-GATE-G2<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G2-G2-E03 | manual_intake_and_failed_gate_action | GL-G2-G2-E03 | ACC-GL-G2-G2-E03<br>COVERAGE-GATE-G2<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G3-G3-E01 | manual_intake_and_failed_gate_action | GL-G3-G3-E01 | ACC-GL-G3-G3-E01<br>COVERAGE-GATE-G3<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G3-G3-E02 | manual_intake_and_failed_gate_action | GL-G3-G3-E02 | ACC-GL-G3-G3-E02<br>COVERAGE-GATE-G3<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G3-G3-E03 | manual_intake_and_failed_gate_action | GL-G3-G3-E03 | ACC-GL-G3-G3-E03<br>COVERAGE-GATE-G3<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G3-G3-E04 | manual_intake_and_failed_gate_action | GL-G3-G3-E04 | ACC-GL-G3-G3-E04<br>COVERAGE-GATE-G3<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G4-G4-E01 | manual_intake_and_failed_gate_action | GL-G4-G4-E01 | ACC-GL-G4-G4-E01<br>COVERAGE-GATE-G4<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G4-G4-E02 | manual_intake_and_failed_gate_action | GL-G4-G4-E02 | ACC-GL-G4-G4-E02<br>COVERAGE-GATE-G4<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G4-G4-E03 | manual_intake_and_failed_gate_action | GL-G4-G4-E03 | ACC-GL-G4-G4-E03<br>COVERAGE-GATE-G4<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G4-G4-E04 | manual_intake_and_failed_gate_action | GL-G4-G4-E04 | ACC-GL-G4-G4-E04<br>COVERAGE-GATE-G4<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G5-G5-E01 | manual_intake_and_failed_gate_action | GL-G5-G5-E01 | ACC-GL-G5-G5-E01<br>COVERAGE-GATE-G5<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G5-G5-E02 | manual_intake_and_failed_gate_action | GL-G5-G5-E02 | ACC-GL-G5-G5-E02<br>COVERAGE-GATE-G5<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G5-G5-E03 | manual_intake_and_failed_gate_action | GL-G5-G5-E03 | ACC-GL-G5-G5-E03<br>COVERAGE-GATE-G5<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G6-G6-E01 | manual_intake_and_failed_gate_action | GL-G6-G6-E01 | ACC-GL-G6-G6-E01<br>COVERAGE-GATE-G6<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G6-G6-E02 | manual_intake_and_failed_gate_action | GL-G6-G6-E02 | ACC-GL-G6-G6-E02<br>COVERAGE-GATE-G6<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G6-G6-E03 | manual_intake_and_failed_gate_action | GL-G6-G6-E03 | ACC-GL-G6-G6-E03<br>COVERAGE-GATE-G6<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G6-G6-E04 | manual_intake_and_failed_gate_action | GL-G6-G6-E04 | ACC-GL-G6-G6-E04<br>COVERAGE-GATE-G6<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G7-G7-E01 | manual_intake_and_failed_gate_action | GL-G7-G7-E01 | ACC-GL-G7-G7-E01<br>COVERAGE-GATE-G7<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G7-G7-E02 | manual_intake_and_failed_gate_action | GL-G7-G7-E02 | ACC-GL-G7-G7-E02<br>COVERAGE-GATE-G7<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G7-G7-E03 | manual_intake_and_failed_gate_action | GL-G7-G7-E03 | ACC-GL-G7-G7-E03<br>COVERAGE-GATE-G7<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G8-G8-E01 | manual_intake_and_failed_gate_action | GL-G8-G8-E01 | ACC-GL-G8-G8-E01<br>COVERAGE-GATE-G8<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G8-G8-E02 | manual_intake_and_failed_gate_action | GL-G8-G8-E02 | ACC-GL-G8-G8-E02<br>COVERAGE-GATE-G8<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G8-G8-E03 | manual_intake_and_failed_gate_action | GL-G8-G8-E03 | ACC-GL-G8-G8-E03<br>COVERAGE-GATE-G8<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G9-G9-E01 | manual_intake_and_failed_gate_action | GL-G9-G9-E01 | ACC-GL-G9-G9-E01<br>COVERAGE-GATE-G9<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G9-G9-E03 | manual_intake_and_failed_gate_action | GL-G9-G9-E03 | ACC-GL-G9-G9-E03<br>COVERAGE-GATE-G9<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G10-G10-E01 | manual_intake_and_failed_gate_action | GL-G10-G10-E01 | ACC-GL-G10-G10-E01<br>COVERAGE-GATE-G10<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G10-G10-E02 | manual_intake_and_failed_gate_action | GL-G10-G10-E02 | ACC-GL-G10-G10-E02<br>COVERAGE-GATE-G10<br>COVERAGE-ALL-GO-LIVE |
| go_live_gate_evidence | ACC-GL-G10-G10-E03 | manual_intake_and_failed_gate_action | GL-G10-G10-E03 | ACC-GL-G10-G10-E03<br>COVERAGE-GATE-G10<br>COVERAGE-ALL-GO-LIVE |
| l9_stabilization_closure | ACC-L9-C01 | l9_manual_intake | L9-C01 | ACC-L9-C01<br>COVERAGE-L9-STABILIZATION |
| l9_stabilization_closure | ACC-L9-C02 | l9_manual_intake | L9-C02 | ACC-L9-C02<br>COVERAGE-L9-STABILIZATION |
| l9_stabilization_closure | ACC-L9-C03 | l9_manual_intake | L9-C03 | ACC-L9-C03<br>COVERAGE-L9-STABILIZATION |
| l9_stabilization_closure | ACC-L9-C04 | l9_manual_intake | L9-C04 | ACC-L9-C04<br>COVERAGE-L9-STABILIZATION |
| l9_stabilization_closure | ACC-L9-C05 | l9_manual_intake | L9-C05 | ACC-L9-C05<br>COVERAGE-L9-STABILIZATION |
| blocked_work_package | WP-LT-PRE-W01 | owner_action_package | docs/goal-closeout/lt-pre-w01 | WP-LT-PRE-W01<br>COVERAGE-PHASE-PRE<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-PRE-W02 | owner_action_package | docs/goal-closeout/lt-pre-w02 | WP-LT-PRE-W02<br>COVERAGE-PHASE-PRE<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-PRE-W03 | owner_action_package | docs/goal-closeout/lt-pre-w03 | WP-LT-PRE-W03<br>COVERAGE-PHASE-PRE<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-PRE-W04 | owner_action_package | docs/goal-closeout/lt-pre-w04 | WP-LT-PRE-W04<br>COVERAGE-PHASE-PRE<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-PRE-W05 | owner_action_package | docs/goal-closeout/lt-pre-w05 | WP-LT-PRE-W05<br>COVERAGE-PHASE-PRE<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-PRE-W06 | owner_action_package | docs/goal-closeout/lt-pre-w06 | WP-LT-PRE-W06<br>COVERAGE-PHASE-PRE<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L0-W01 | owner_action_package | docs/goal-closeout/lt-l0-w01 | WP-LT-L0-W01<br>COVERAGE-PHASE-L0<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L0-W02 | owner_action_package | docs/goal-closeout/lt-l0-w02 | WP-LT-L0-W02<br>COVERAGE-PHASE-L0<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L0-W03 | owner_action_package | docs/goal-closeout/lt-l0-w03 | WP-LT-L0-W03<br>COVERAGE-PHASE-L0<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L0-W04 | owner_action_package | docs/goal-closeout/lt-l0-w04 | WP-LT-L0-W04<br>COVERAGE-PHASE-L0<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L0-W05 | owner_action_package | docs/goal-closeout/lt-l0-w05 | WP-LT-L0-W05<br>COVERAGE-PHASE-L0<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W01 | owner_action_package | docs/goal-closeout/lt-l1-w01 | WP-LT-L1-W01<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W02 | owner_action_package | docs/goal-closeout/lt-l1-w02 | WP-LT-L1-W02<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W03 | owner_action_package | docs/goal-closeout/lt-l1-w03 | WP-LT-L1-W03<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W04 | owner_action_package | docs/goal-closeout/lt-l1-w04 | WP-LT-L1-W04<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W05 | owner_action_package | docs/goal-closeout/lt-l1-w05 | WP-LT-L1-W05<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W06 | owner_action_package | docs/goal-closeout/lt-l1-w06 | WP-LT-L1-W06<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W07 | owner_action_package | docs/goal-closeout/lt-l1-w07 | WP-LT-L1-W07<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W08 | owner_action_package | docs/goal-closeout/lt-l1-w08 | WP-LT-L1-W08<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W09 | owner_action_package | docs/goal-closeout/lt-l1-w09 | WP-LT-L1-W09<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L1-W10 | owner_action_package | docs/goal-closeout/lt-l1-w10 | WP-LT-L1-W10<br>COVERAGE-PHASE-L1<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L2-W01 | owner_action_package | docs/goal-closeout/lt-l2-w01 | WP-LT-L2-W01<br>COVERAGE-PHASE-L2<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L2-W02 | owner_action_package | docs/goal-closeout/lt-l2-w02 | WP-LT-L2-W02<br>COVERAGE-PHASE-L2<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L2-W03 | owner_action_package | docs/goal-closeout/lt-l2-w03 | WP-LT-L2-W03<br>COVERAGE-PHASE-L2<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L2-W04 | owner_action_package | docs/goal-closeout/lt-l2-w04 | WP-LT-L2-W04<br>COVERAGE-PHASE-L2<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L2-W05 | owner_action_package | docs/goal-closeout/lt-l2-w05 | WP-LT-L2-W05<br>COVERAGE-PHASE-L2<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L2-W06 | owner_action_package | docs/goal-closeout/lt-l2-w06 | WP-LT-L2-W06<br>COVERAGE-PHASE-L2<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L2-W07 | owner_action_package | docs/goal-closeout/lt-l2-w07 | WP-LT-L2-W07<br>COVERAGE-PHASE-L2<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W01 | owner_action_package | docs/goal-closeout/lt-l3-w01 | WP-LT-L3-W01<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W02 | owner_action_package | docs/goal-closeout/lt-l3-w02 | WP-LT-L3-W02<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W03 | owner_action_package | docs/goal-closeout/lt-l3-w03 | WP-LT-L3-W03<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W04 | owner_action_package | docs/goal-closeout/lt-l3-w04 | WP-LT-L3-W04<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W05 | owner_action_package | docs/goal-closeout/lt-l3-w05 | WP-LT-L3-W05<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W06 | owner_action_package | docs/goal-closeout/lt-l3-w06 | WP-LT-L3-W06<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W07 | owner_action_package | docs/goal-closeout/lt-l3-w07 | WP-LT-L3-W07<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W08 | owner_action_package | docs/goal-closeout/lt-l3-w08 | WP-LT-L3-W08<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W09 | owner_action_package | docs/goal-closeout/lt-l3-w09 | WP-LT-L3-W09<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L3-W10 | owner_action_package | docs/goal-closeout/lt-l3-w10 | WP-LT-L3-W10<br>COVERAGE-PHASE-L3<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L4-W01 | owner_action_package | docs/goal-closeout/lt-l4-w01 | WP-LT-L4-W01<br>COVERAGE-PHASE-L4<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L4-W02 | owner_action_package | docs/goal-closeout/lt-l4-w02 | WP-LT-L4-W02<br>COVERAGE-PHASE-L4<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L4-W03 | owner_action_package | docs/goal-closeout/lt-l4-w03 | WP-LT-L4-W03<br>COVERAGE-PHASE-L4<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L4-W04 | owner_action_package | docs/goal-closeout/lt-l4-w04 | WP-LT-L4-W04<br>COVERAGE-PHASE-L4<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L4-W05 | owner_action_package | docs/goal-closeout/lt-l4-w05 | WP-LT-L4-W05<br>COVERAGE-PHASE-L4<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L4-W06 | owner_action_package | docs/goal-closeout/lt-l4-w06 | WP-LT-L4-W06<br>COVERAGE-PHASE-L4<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L5-W01 | owner_action_package | docs/goal-closeout/lt-l5-w01 | WP-LT-L5-W01<br>COVERAGE-PHASE-L5<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L5-W02 | owner_action_package | docs/goal-closeout/lt-l5-w02 | WP-LT-L5-W02<br>COVERAGE-PHASE-L5<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L5-W03 | owner_action_package | docs/goal-closeout/lt-l5-w03 | WP-LT-L5-W03<br>COVERAGE-PHASE-L5<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L5-W04 | owner_action_package | docs/goal-closeout/lt-l5-w04 | WP-LT-L5-W04<br>COVERAGE-PHASE-L5<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L5-W05 | owner_action_package | docs/goal-closeout/lt-l5-w05 | WP-LT-L5-W05<br>COVERAGE-PHASE-L5<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L5-W06 | owner_action_package | docs/goal-closeout/lt-l5-w06 | WP-LT-L5-W06<br>COVERAGE-PHASE-L5<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L5-W07 | owner_action_package | docs/goal-closeout/lt-l5-w07 | WP-LT-L5-W07<br>COVERAGE-PHASE-L5<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L6-W01 | owner_action_package | docs/goal-closeout/lt-l6-w01 | WP-LT-L6-W01<br>COVERAGE-PHASE-L6<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L6-W02 | owner_action_package | docs/goal-closeout/lt-l6-w02 | WP-LT-L6-W02<br>COVERAGE-PHASE-L6<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L6-W03 | owner_action_package | docs/goal-closeout/lt-l6-w03 | WP-LT-L6-W03<br>COVERAGE-PHASE-L6<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L6-W04 | owner_action_package | docs/goal-closeout/lt-l6-w04 | WP-LT-L6-W04<br>COVERAGE-PHASE-L6<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L6-W05 | owner_action_package | docs/goal-closeout/lt-l6-w05 | WP-LT-L6-W05<br>COVERAGE-PHASE-L6<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L6-W06 | owner_action_package | docs/goal-closeout/lt-l6-w06 | WP-LT-L6-W06<br>COVERAGE-PHASE-L6<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L7-W01 | owner_action_package | docs/goal-closeout/lt-l7-w01 | WP-LT-L7-W01<br>COVERAGE-PHASE-L7<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L7-W02 | owner_action_package | docs/goal-closeout/lt-l7-w02 | WP-LT-L7-W02<br>COVERAGE-PHASE-L7<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L7-W03 | owner_action_package | docs/goal-closeout/lt-l7-w03 | WP-LT-L7-W03<br>COVERAGE-PHASE-L7<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L7-W04 | owner_action_package | docs/goal-closeout/lt-l7-w04 | WP-LT-L7-W04<br>COVERAGE-PHASE-L7<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L7-W05 | owner_action_package | docs/goal-closeout/lt-l7-w05 | WP-LT-L7-W05<br>COVERAGE-PHASE-L7<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L7-W06 | owner_action_package | docs/goal-closeout/lt-l7-w06 | WP-LT-L7-W06<br>COVERAGE-PHASE-L7<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L8-W02 | owner_action_package | docs/goal-closeout/lt-l8-w02 | WP-LT-L8-W02<br>COVERAGE-PHASE-L8<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L8-W03 | owner_action_package | docs/goal-closeout/lt-l8-w03 | WP-LT-L8-W03<br>COVERAGE-PHASE-L8<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L9-W01 | owner_action_package | docs/goal-closeout/lt-l9-w01 | WP-LT-L9-W01<br>COVERAGE-PHASE-L9<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L9-W02 | owner_action_package | docs/goal-closeout/lt-l9-w02 | WP-LT-L9-W02<br>COVERAGE-PHASE-L9<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L9-W03 | owner_action_package | docs/goal-closeout/lt-l9-w03 | WP-LT-L9-W03<br>COVERAGE-PHASE-L9<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L9-W04 | owner_action_package | docs/goal-closeout/lt-l9-w04 | WP-LT-L9-W04<br>COVERAGE-PHASE-L9<br>COVERAGE-ALL-BLOCKED-WP |
| blocked_work_package | WP-LT-L9-W05 | owner_action_package | docs/goal-closeout/lt-l9-w05 | WP-LT-L9-W05<br>COVERAGE-PHASE-L9<br>COVERAGE-ALL-BLOCKED-WP |
| phase_exit | PHASE-PRE | phase_exit_readiness_audit | PRE-EXIT | PHASE-PRE<br>PHASE-PRE-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L0 | phase_exit_readiness_audit | L0-EXIT | PHASE-L0<br>PHASE-L0-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L1 | phase_exit_readiness_audit | L1-EXIT | PHASE-L1<br>PHASE-L1-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L2 | phase_exit_readiness_audit | L2-EXIT | PHASE-L2<br>PHASE-L2-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L3 | phase_exit_readiness_audit | L3-EXIT | PHASE-L3<br>PHASE-L3-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L4 | phase_exit_readiness_audit | L4-EXIT | PHASE-L4<br>PHASE-L4-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L5 | phase_exit_readiness_audit | L5-EXIT | PHASE-L5<br>PHASE-L5-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L6 | phase_exit_readiness_audit | L6-EXIT | PHASE-L6<br>PHASE-L6-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L7 | phase_exit_readiness_audit | L7-EXIT | PHASE-L7<br>PHASE-L7-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L8 | phase_exit_readiness_audit | L8-EXIT | PHASE-L8<br>PHASE-L8-EXIT<br>COVERAGE-ALL-PHASE-EXITS |
| phase_exit | PHASE-L9 | phase_exit_readiness_audit | L9-EXIT | PHASE-L9<br>PHASE-L9-EXIT<br>COVERAGE-ALL-PHASE-EXITS |

## Findings

No findings.

## Boundary

- This audit links missing deferral targets to existing owner/intake/phase action records.
- It does not approve go-live.
- It does not approve owner deferrals.
- It does not create or modify launch decision register rows.
- It does not replace real runtime, security, M365, legal, pilot, UAT, or hypercare evidence.
- Closed CP evidence remains read-only.
