# Launch Manual Evidence Intake Register

Generated at: 2026-06-18T15:28:12.318Z

## Boundary

- This register does not approve go-live.
- This register does not approve owner deferrals.
- Rows remain pending until real evidence or an owner-approved deferral is recorded.
- Existing manual intake evidence and deferral fields are preserved by intake ID during regeneration.
- Closed CP evidence remains read-only.
- Synthetic data boundaries remain active until policy gates allow otherwise.

## Summary

- failed_gate_count: 10
- failed_gate_evidence_slot_count: 31
- l9_stabilization_closure_slot_count: 5
- total_intake_row_count: 36
- pending_intake_count: 35
- evidence_satisfied_count: 1
- owner_deferred_count: 0
- go_live_all_pass: false
- owner_approved_deferrals_present: false
- coverage_eligible_valid_deferred_rows: 0
- non_coverage_valid_deferred_rows: 0

## Failed Gate Intake

| Intake | Gate | Evidence | Slot | Required state | Status |
| --- | --- | --- | --- | --- | --- |
| GL-G1-G1-E02 | G1 | G1-E02 | deferred_item_rejudgment_register | blocking_remaining_count_zero | evidence_satisfied |
| GL-G1-G1-E03 | G1 | G1-E03 | hardening_coverage_matrix | all_missing_cells_adjudicated_or_zero | pending_evidence_or_owner_deferral |
| GL-G2-G2-E01 | G2 | G2-E01 | wave1_runtime_ready_matrix | approved_wave1_runtime_ready_completeness_rule_satisfied | pending_evidence_or_owner_deferral |
| GL-G2-G2-E02 | G2 | G2-E02 | runtime_integration_test_output | all_tests_pass_with_timestamp | pending_evidence_or_owner_deferral |
| GL-G2-G2-E03 | G2 | G2-E03 | rtg_001_005_attestation_links | all_links_resolve | pending_evidence_or_owner_deferral |
| GL-G3-G3-E01 | G3 | G3-E01 | verification_gate_production_rerun | seven_of_seven_pass | pending_evidence_or_owner_deferral |
| GL-G3-G3-E02 | G3 | G3-E02 | ethical_wall_blocking_results | five_of_five_pass_with_audit | pending_evidence_or_owner_deferral |
| GL-G3-G3-E03 | G3 | G3-E03 | penetration_test_adjudication | open_p0_p1_zero | pending_evidence_or_owner_deferral |
| GL-G3-G3-E04 | G3 | G3-E04 | bypass_mapping_results | all_rows_green | pending_evidence_or_owner_deferral |
| GL-G4-G4-E01 | G4 | G4-E01 | backup_restore_rehearsal | meets_approved_rpo_rto | pending_evidence_or_owner_deferral |
| GL-G4-G4-E02 | G4 | G4-E02 | worm_chain_operation | hash_verify_mutation_block_and_hold_purge_block | pending_evidence_or_owner_deferral |
| GL-G4-G4-E03 | G4 | G4-E03 | deployment_rollback_roundtrip | start_end_timestamp_pairs_present | pending_evidence_or_owner_deferral |
| GL-G4-G4-E04 | G4 | G4-E04 | performance_acceptance_report | all_metrics_within_approved_thresholds | pending_evidence_or_owner_deferral |
| GL-G5-G5-E01 | G5 | G5-E01 | admin_consent_scope_reconciliation | mismatch_count_zero | pending_evidence_or_owner_deferral |
| GL-G5-G5-E02 | G5 | G5-E02 | addin_release_gate_production_results | six_of_six_pass | pending_evidence_or_owner_deferral |
| GL-G5-G5-E03 | G5 | G5-E03 | permission_sync_checker_log | injected_mismatch_detected | pending_evidence_or_owner_deferral |
| GL-G6-G6-E01 | G6 | G6-E01 | slo_dashboard_and_alert_fire | dashboard_capture_and_alert_timestamp_pair | pending_evidence_or_owner_deferral |
| GL-G6-G6-E02 | G6 | G6-E02 | runbook_tabletop_records | incident_breakglass_rollback_each_at_least_once | pending_evidence_or_owner_deferral |
| GL-G6-G6-E03 | G6 | G6-E03 | break_glass_effective_record | approved_approver_and_time_limit_present | pending_evidence_or_owner_deferral |
| GL-G6-G6-E04 | G6 | G6-E04 | support_channel_roundtrip | test_request_received_and_resolved | pending_evidence_or_owner_deferral |
| GL-G7-G7-E01 | G7 | G7-E01 | pipa_retention_policy_setting_reconciliation | mismatch_count_zero | pending_evidence_or_owner_deferral |
| GL-G7-G7-E02 | G7 | G7-E02 | ai_disabled_state_or_wave2_gate | all_wave1_ai_off_or_wave2_gate_pass | pending_evidence_or_owner_deferral |
| GL-G7-G7-E03 | G7 | G7-E03 | hr_sensitive_store_count | real_record_count_zero | pending_evidence_or_owner_deferral |
| GL-G8-G8-E01 | G8 | G8-E01 | backfill_reconciliation_report | approved_reconciliation_completeness_rule_satisfied_and_unexplained_diff_zero | pending_evidence_or_owner_deferral |
| GL-G8-G8-E02 | G8 | G8-E02 | delta_sync_latest_log | latest_run_timestamp_and_count_present | pending_evidence_or_owner_deferral |
| GL-G8-G8-E03 | G8 | G8-E03 | rollback_ready_attestation | current_owner_and_date_present | pending_evidence_or_owner_deferral |
| GL-G9-G9-E01 | G9 | G9-E01 | goal_closeout_chain_links | all_links_resolve | pending_evidence_or_owner_deferral |
| GL-G9-G9-E03 | G9 | G9-E03 | g1_through_g8_readiness_report | g1_to_g8_all_pass | pending_evidence_or_owner_deferral |
| GL-G10-G10-E01 | G10 | G10-E01 | joint_signoff_artifact | two_required_signatures_present | pending_evidence_or_owner_deferral |
| GL-G10-G10-E02 | G10 | G10-E02 | g1_through_g9_decision_table | nine_rows_and_decision_date_present | pending_evidence_or_owner_deferral |
| GL-G10-G10-E03 | G10 | G10-E03 | launch_decision_register_entry | linked_and_resolvable | pending_evidence_or_owner_deferral |

## L9 Stabilization Intake

| Intake | Closure criterion | Current status | Status |
| --- | --- | --- | --- |
| L9-C01 | Last 14 days P0/P1 count equals zero | blocked_not_measured | pending_evidence_or_owner_deferral |
| L9-C02 | Four consecutive weeks SLO met | blocked_not_measured | pending_evidence_or_owner_deferral |
| L9-C03 | Four weeks audit completeness green | blocked_not_measured | pending_evidence_or_owner_deferral |
| L9-C04 | Every incident has post-analysis link | blocked_not_measured | pending_evidence_or_owner_deferral |
| L9-C05 | Owner signoff | missing | pending_evidence_or_owner_deferral |

## Intake Rule

A row may move from `pending_evidence_or_owner_deferral` only when real evidence is linked or a structurally valid owner-approved deferral exists in the launch decision register.
