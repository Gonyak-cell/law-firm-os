#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GOAL_ID = "cti-cutover-preflight-go-no-go";
const CLOSEOUT_DIR = path.join(ROOT, "docs/goal-closeout/cti-cutover-preflight-go-no-go");
const PACKET_MD = path.join(ROOT, "docs/launch/cti-cutover-preflight-go-no-go-packet-2026-07-06.md");
const CROSSWALK_JSON = path.join(ROOT, "docs/launch/cti-cutover-preflight-go-no-go-crosswalk-2026-07-06.json");
const I11_REF = "I11-CTI-CUTOVER-EXECUTE-OWNER-APPROVAL-2026-07-06";
const I14_REF = "I14-CTI-CUTOVER-READONLY-EFS-SNAPSHOT-SURFACE-OWNER-APPROVAL-2026-07-06";
const I15_REF = "I15-CTI-CUTOVER-ROLLBACK-ABORT-CRITERIA-OWNER-APPROVAL-2026-07-06";
const I16_REF = "I16-CTI-CUTOVER-FREEZE-WINDOW-NOTICE-OWNER-APPROVAL-2026-07-06";
const I17_REF = "I17-CTI-S1G-AUTHENTICATED-PRODUCTION-PROBE-OWNER-APPROVAL-2026-07-06";
const I18_REF = "I18-CTI-S2-PRODUCTION-AUTH-PROBE-PRINCIPAL-OWNER-APPROVAL-2026-07-06";
const I19_REF = "I19-CTI-CUTOVER-POST-I18-SNAPSHOT-REBIND-OWNER-APPROVAL-2026-07-06";
const SUPERSEDED_SNAPSHOT_HASH = "2ce798915fccf16aff5c25746e8db4478dc5f160b7ebe7ca430833ce7735cffb";
const CURRENT_SNAPSHOT_HASH = "b4139c730895d173cf964a92fa6ba375c93cefcb13687b0f82732c4c0531da49";

const errors = [];

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(filePath) {
  if (!existsSync(filePath)) {
    errors.push(`missing file: ${rel(filePath)}`);
    return "";
  }
  return readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  const text = read(filePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`invalid JSON ${rel(filePath)}: ${error.message}`);
    return null;
  }
}

function hasApprovalReceipt(id) {
  return existsSync(path.join(ROOT, `docs/launch/cti-i${id}-owner-approval-receipt-2026-07-06.json`));
}

const packetText = read(PACKET_MD);
for (const phrase of [
  "Status: `GO_READY_NOT_EXECUTED`",
  "I1 owner mapping confirmation is recorded",
  "Current verified production snapshot hash/count receipt is recorded",
  "Restore rehearsal is tied to the current verified snapshot",
  "Rollback and abort criteria are owner-approved and snapshot-bound",
  "No-active-use attestation is recorded",
  "RECORDED_AND_EXECUTED_S1G_PASS",
  "RECORDED_SNAPSHOT_REBOUND_NOT_EXECUTED",
  "PASS_AUTHENTICATED_PRODUCTION_PROBE_AFTER_I18",
  CURRENT_SNAPSHOT_HASH,
  "security_audit_break_glass_marker",
  "Decision: `GO_READY_NOT_EXECUTED`",
]) {
  assert(packetText.includes(phrase), `packet missing phrase: ${phrase}`);
}

const i11 = readJson(path.join(ROOT, "docs/launch/cti-i11-owner-approval-receipt-2026-07-06.json"));
assert(i11?.approval_signature_ref === I11_REF, "I11 approval ref mismatch");
assert(i11?.status === "conditional_approval_recorded", "I11 must be conditional_approval_recorded");
assert(i11?.cutover_executed_by_this_receipt === false, "I11 receipt must not record cutover execution");

const i1 = readJson(path.join(ROOT, "docs/launch/cti-i1-owner-approval-receipt-2026-07-06.json"));
assert(i1?.approval_signature_ref === "I1-CTI-LAWYER-ROLE-MAPPING-OWNER-CONFIRMATION-2026-07-06", "I1 approval ref mismatch");
assert(i1?.status === "owner_mapping_confirmed_with_dropdown_normalization_required", "I1 status mismatch");
assert(i1?.row_count === 148, "I1 receipt row count must be 148");
assert(i1?.required_field_counts?.retaining_attorney_blank_rows === 0, "I1 retaining attorney blanks must be 0");
assert(i1?.required_field_counts?.responsible_attorney_blank_rows === 0, "I1 responsible attorney blanks must be 0");
assert(i1?.required_field_counts?.matter_status_blank_rows === 0, "I1 matter status blanks must be 0");
assert(i1?.validation?.invalid_status_row_count === 0, "I1 invalid status rows must be 0");
assert(i1?.validation?.repo_safe_receipt === true, "I1 receipt must be repo-safe");
assert(i1?.authority_boundary?.production_write_executed === false, "I1 receipt must not record production write");
assert(i1?.authority_boundary?.cutover_executed === false, "I1 receipt must not record cutover execution");
assert(i1?.authority_boundary?.plaintext_pii_recorded_in_repo === false, "I1 receipt must not record plaintext PII in repo");

for (const id of [1, 2, 3, 7, 8, 9, 10, 11, 17, 18, 19]) {
  assert(hasApprovalReceipt(id), `I${id} approval receipt missing`);
}
const i14 = readJson(path.join(ROOT, "docs/launch/cti-i14-owner-approval-receipt-2026-07-06.json"));
assert(i14?.approval_signature_ref === I14_REF, "I14 approval ref mismatch");
assert(i14?.goal_id === "cti-cutover-readonly-efs-snapshot-surface", "I14 goal binding mismatch");
assert(i14?.required_method?.lambda_direct_invoke_only === true, "I14 must require Lambda direct invoke only");
assert(i14?.required_method?.public_http_endpoint_allowed === false, "I14 must prohibit public HTTP endpoint");
assert(i14?.production_write_executed_by_this_receipt === false, "I14 receipt must not record production write");
assert(i14?.production_restore_executed_by_this_receipt === false, "I14 receipt must not record production restore");
const i15 = readJson(path.join(ROOT, "docs/launch/cti-i15-owner-approval-receipt-2026-07-06.json"));
assert(i15?.approval_signature_ref === I15_REF, "I15 approval ref mismatch");
assert(i15?.status === "approval_recorded", "I15 must be approval_recorded");
assert(i15?.snapshot_binding?.snapshot_hash === SUPERSEDED_SNAPSHOT_HASH, "I15 original snapshot binding mismatch");
assert(i15?.snapshot_binding?.restore_rehearsal_status === "PASS", "I15 restore rehearsal binding must PASS");
assert(i15?.conditions?.rollback_criteria_bound_to_verified_snapshot_and_restore_rehearsal === true, "I15 snapshot binding condition missing");
assert(i15?.conditions?.rollback_execution_allowed_only_if_failure_condition_occurs_during_cutover_execute === true, "I15 rollback execution condition missing");
assert(i15?.conditions?.production_restore_allowed_only_inside_cutover_execute_goal_after_criteria_match === true, "I15 production restore condition missing");
assert(i15?.cutover_executed_by_this_receipt === false, "I15 receipt must not record cutover execution");
assert(i15?.rollback_executed_by_this_receipt === false, "I15 receipt must not record rollback execution");
assert(i15?.production_restore_executed_by_this_receipt === false, "I15 receipt must not record production restore");
const i19 = readJson(path.join(ROOT, "docs/launch/cti-i19-owner-approval-receipt-2026-07-06.json"));
assert(i19?.approval_signature_ref === I19_REF, "I19 approval ref mismatch");
assert(i19?.status === "approval_recorded_snapshot_rebound", "I19 status mismatch");
assert(i19?.source_receipt === "docs/launch/cti-cutover-execute-precheck-live-snapshot-receipt-2026-07-06.json", "I19 source receipt mismatch");
assert(i19?.rebound_snapshot_boundary?.snapshot_hash === CURRENT_SNAPSHOT_HASH, "I19 rebound snapshot hash mismatch");
assert(i19?.rebound_snapshot_boundary?.readable_store_file_count === 15, "I19 readable store count mismatch");
assert(i19?.rebound_snapshot_boundary?.restore_rehearsal_status === "PASS", "I19 restore rehearsal status mismatch");
assert(i19?.rebound_snapshot_boundary?.restore_source_file_count === 15, "I19 restore source count mismatch");
assert(i19?.rebound_snapshot_boundary?.restore_restored_file_count === 15, "I19 restore restored count mismatch");
assert(i19?.rebound_snapshot_boundary?.restore_checksum_mismatch_count === 0, "I19 restore checksum mismatch count must be 0");
assert(i19?.superseded_snapshot_boundary?.snapshot_hash === SUPERSEDED_SNAPSHOT_HASH, "I19 superseded snapshot hash mismatch");
assert(i19?.approved_scope?.rebind_i15_rollback_abort_criteria_to_post_i18_snapshot === true, "I19 rebind scope missing");
assert(i19?.approved_scope?.cutover_execute_allowed_by_this_receipt === false, "I19 must not allow CUTOVER execute by receipt");
assert(i19?.boundary?.cutover_executed === false, "I19 receipt must not record cutover execution");
assert(i19?.boundary?.production_restore_executed === false, "I19 receipt must not record production restore");
assert(i19?.boundary?.production_write_executed === false, "I19 receipt must not record production write");
assert(i19?.boundary?.tenant_migration_executed === false, "I19 receipt must not record tenant migration");
assert(i19?.boundary?.account_permission_injection_executed === false, "I19 receipt must not record account injection");
assert(i19?.boundary?.password_issuance_distribution_executed === false, "I19 receipt must not record password distribution");
const i16 = readJson(path.join(ROOT, "docs/launch/cti-i16-owner-approval-receipt-2026-07-06.json"));
assert(i16?.approval_signature_ref === I16_REF, "I16 approval ref mismatch");
assert(i16?.status === "approval_recorded_no_active_use_freeze_not_required", "I16 status mismatch");
assert(i16?.conditions?.notice_and_coordination_receipt_only === true, "I16 notice-only condition missing");
assert(i16?.conditions?.freeze_state_confirmation_requires_separate_evidence === false, "I16 separate freeze confirmation must not be required under no-active-use attestation");
assert(i16?.conditions?.freeze_state_confirmation_replaced_by_no_active_use_attestation === true, "I16 freeze replacement condition missing");
assert(i16?.conditions?.cutover_execute_requires_no_active_use_recheck_before_reassessment === true, "I16 no-active-use recheck condition missing");
assert(i16?.notice_coordination_status?.notice_wording_approved === true, "I16 notice wording approval missing");
assert(i16?.notice_coordination_status?.planned_window_start_recorded === false, "I16 planned window start must remain pending");
assert(i16?.notice_coordination_status?.planned_window_end_recorded === false, "I16 planned window end must remain pending");
assert(i16?.notice_coordination_status?.notice_dispatch_receipt_recorded === false, "I16 dispatch receipt must remain pending");
assert(i16?.notice_coordination_status?.freeze_state_confirmed === false, "I16 must not confirm freeze state");
assert(i16?.notice_coordination_status?.notice_dispatch_not_required_due_to_no_active_use === true, "I16 no-active-use notice waiver missing");
assert(i16?.no_active_use_attestation?.recorded === true, "I16 no-active-use attestation missing");
assert(i16?.no_active_use_attestation?.active_production_users === false, "I16 active production users must be false");
assert(i16?.no_active_use_attestation?.active_production_writers === false, "I16 active production writers must be false");
assert(i16?.no_active_use_attestation?.freeze_notice_required === false, "I16 freeze notice required must be false");
assert(i16?.no_active_use_attestation?.freeze_state_confirmation_required === false, "I16 freeze state confirmation required must be false");
assert(i16?.cutover_executed_by_this_receipt === false, "I16 receipt must not record cutover execution");
assert(i16?.freeze_executed_by_this_receipt === false, "I16 receipt must not record freeze execution");
const freezeCoordination = readJson(path.join(ROOT, "docs/launch/cti-cutover-freeze-window-notice-coordination-2026-07-06.json"));
assert(freezeCoordination?.approval_signature_ref === I16_REF, "freeze coordination I16 ref mismatch");
assert(freezeCoordination?.status === "not_required_no_active_production_use", "freeze coordination status mismatch");
assert(freezeCoordination?.planned_freeze_window?.recorded === false, "freeze window must remain pending");
assert(freezeCoordination?.notice_dispatch?.dispatched === false, "freeze notice dispatch must remain pending");
assert(freezeCoordination?.notice_dispatch?.not_required_due_to_no_active_use === true, "freeze notice dispatch waiver missing");
assert(freezeCoordination?.freeze_state_confirmation?.confirmed === false, "freeze coordination must not confirm freeze state");
assert(freezeCoordination?.freeze_state_confirmation?.required_separate_evidence === false, "freeze state confirmation must not be required while no active use");
assert(freezeCoordination?.freeze_state_confirmation?.not_required_due_to_no_active_use === true, "freeze state waiver missing");
assert(freezeCoordination?.no_active_use_attestation?.recorded === true, "freeze coordination no-active-use attestation missing");
assert(freezeCoordination?.no_active_use_attestation?.active_production_users === false, "freeze coordination active users must be false");
assert(freezeCoordination?.no_active_use_attestation?.active_production_writers === false, "freeze coordination active writers must be false");
assert(freezeCoordination?.boundary?.notice_wording_approved === true, "freeze coordination notice wording approval missing");
assert(freezeCoordination?.boundary?.freeze_notice_required === false, "freeze notice required boundary must be false");
assert(freezeCoordination?.boundary?.freeze_state_confirmation_required === false, "freeze state confirmation required boundary must be false");
assert(freezeCoordination?.boundary?.cutover_executed === false, "freeze coordination must not record cutover");
const i17 = readJson(path.join(ROOT, "docs/launch/cti-i17-owner-approval-receipt-2026-07-06.json"));
assert(i17?.approval_signature_ref === I17_REF, "I17 approval ref mismatch");
assert(i17?.status === "approval_recorded_probe_preconditions_required", "I17 status mismatch");
assert(i17?.conditions?.probe_only_before_cutover_execute === true, "I17 probe-only condition missing");
assert(i17?.conditions?.production_migration_write_allowed === false, "I17 must not allow production migration/write");
assert(i17?.conditions?.tenant_migration_allowed === false, "I17 must not allow tenant migration");
assert(i17?.conditions?.account_permission_injection_allowed === false, "I17 must not allow account/permission injection");
assert(i17?.conditions?.operational_profile_switch_allowed === false, "I17 must not allow operational profile switch");
assert(i17?.conditions?.bridge_token_rotation_allowed === false, "I17 must not allow bridge token rotation");
assert(i17?.conditions?.password_issuance_distribution_allowed === false, "I17 must not allow password issuance/distribution");
assert(i17?.s1_g_authenticated_probe_executed_by_this_receipt === false, "I17 receipt must not record S1-G probe execution");
assert(i17?.cutover_executed_by_this_receipt === false, "I17 receipt must not record cutover execution");
assert(i17?.production_write_executed_by_this_receipt === false, "I17 receipt must not record production write");
assert(i17?.production_restore_executed_by_this_receipt === false, "I17 receipt must not record production restore");
assert(i17?.secret_values_recorded === false, "I17 receipt must not record secret values");
assert(i17?.plaintext_pii_recorded === false, "I17 receipt must not record plaintext PII");
assert(i17?.credential_material_recorded === false, "I17 receipt must not record credential material");
assert(i17?.token_material_recorded === false, "I17 receipt must not record token material");
assert(i17?.password_material_recorded === false, "I17 receipt must not record password material");
const s1gAttempt = readJson(path.join(ROOT, "docs/launch/cti-s1g-authenticated-production-probe-attempt-2026-07-06.json"));
assert(s1gAttempt?.status === "BLOCKED_PRODUCTION_PRINCIPAL_SESSION_UNAVAILABLE", "S1-G attempt status mismatch");
assert(s1gAttempt?.approval_signature_refs?.includes(I17_REF), "S1-G attempt missing I17 ref");
assert(
  s1gAttempt?.approval_signature_refs?.includes("I8-CTI-S2-S1G-AUTHENTICATED-PROBE-OWNER-APPROVAL-2026-07-06"),
  "S1-G attempt missing I8 ref",
);
assert(s1gAttempt?.precondition_evidence?.lambda_last_update_status === "Successful", "S1-G attempt Lambda status must be Successful");
assert(s1gAttempt?.precondition_evidence?.file_system_config_count >= 1, "S1-G attempt EFS config evidence missing");
assert(s1gAttempt?.precondition_evidence?.lawos_auth_credential_store_path_env_present === false, "S1-G attempt must record credential store env absent");
assert(s1gAttempt?.precondition_evidence?.lawos_api_session_secret_secret_id_env_present === true, "S1-G attempt must record session secret id env present");
assert(s1gAttempt?.precondition_evidence?.health_status_code === 200, "S1-G attempt health status must be 200");
assert(s1gAttempt?.precondition_evidence?.health_runtime_profile === "operational", "S1-G attempt health runtime profile mismatch");
assert(s1gAttempt?.precondition_evidence?.health_synthetic_login_enabled === false, "S1-G attempt must record synthetic login disabled");
assert(s1gAttempt?.precondition_evidence?.s2_production_auth_code_deployment_recorded === false, "S1-G attempt must record S2 production auth deployment missing");
assert(s1gAttempt?.precondition_evidence?.production_credential_store_write_recorded === false, "S1-G attempt must record credential store write missing");
assert(s1gAttempt?.precondition_evidence?.approved_production_probe_principal_recorded === false, "S1-G attempt must record approved probe principal missing");
assert(s1gAttempt?.precondition_evidence?.actual_password_issuance_distribution_recorded === false, "S1-G attempt must record password issuance/distribution absent");
assert(s1gAttempt?.probe_execution?.authenticated_marker_audit_readback_executed === false, "S1-G attempt must not record authenticated probe execution");
assert(s1gAttempt?.probe_execution?.debug_endpoint_used === false, "S1-G attempt must not use debug endpoint");
assert(s1gAttempt?.probe_execution?.direct_token_mint_used === false, "S1-G attempt must not use direct token mint");
assert(s1gAttempt?.probe_execution?.temporary_backdoor_principal_used === false, "S1-G attempt must not use temporary backdoor principal");
assert(s1gAttempt?.probe_execution?.secret_value_lookup_or_output_used === false, "S1-G attempt must not use/output secret value");
assert(s1gAttempt?.probe_execution?.token_password_output_recorded === false, "S1-G attempt must not record token/password output");
assert(s1gAttempt?.probe_execution?.production_write_executed === false, "S1-G attempt must not record production write");
assert(s1gAttempt?.probe_execution?.production_migration_executed === false, "S1-G attempt must not record production migration");
assert(s1gAttempt?.probe_execution?.cutover_executed === false, "S1-G attempt must not record cutover");
assert(s1gAttempt?.non_qualifying_read_probe?.unauthenticated_matters_result_used_as_s1g_evidence === false, "Unauthenticated read probe must not be used as S1-G evidence");
for (const blocker of [
  "production auth code deployment is not recorded",
  "LAWOS_AUTH_CREDENTIAL_STORE_PATH is absent from production Lambda environment",
  "production credential store write is not recorded",
  "approved real production probe principal/credential is not recorded",
]) {
  assert(s1gAttempt?.blocking_conditions?.includes(blocker), `S1-G attempt missing blocker: ${blocker}`);
}
const i18 = readJson(path.join(ROOT, "docs/launch/cti-i18-owner-approval-receipt-2026-07-06.json"));
assert(i18?.approval_signature_ref === I18_REF, "I18 approval ref mismatch");
assert(i18?.status === "approval_recorded_and_executed", "I18 must be approval_recorded_and_executed");
assert(i18?.approved_scope?.s2_auth_code_path_production_deploy === true, "I18 S2 production deploy scope missing");
assert(i18?.approved_scope?.credential_store_create_update_limited_to_probe_principal_count === 1, "I18 credential store principal limit mismatch");
assert(i18?.execution_summary?.lambda_function_name === "matter-lawos-api-prod", "I18 Lambda function mismatch");
assert(i18?.execution_summary?.lambda_last_update_status === "Successful", "I18 Lambda update status mismatch");
assert(i18?.execution_summary?.lambda_code_sha256 === "FjmpI+t+zyB4YToT9IPzL8HddRgalcSbcV5CgLO78iM=", "I18 Lambda code hash mismatch");
assert(i18?.execution_summary?.lawos_auth_credential_store_path_env_present === true, "I18 credential store env must be present");
assert(i18?.execution_summary?.credential_records_after_count === 1, "I18 credential record count mismatch");
assert(i18?.execution_summary?.target_credential_rev === 2, "I18 credential revision mismatch");
assert(i18?.execution_summary?.login_status === 200, "I18 login status mismatch");
assert(i18?.execution_summary?.session_status === 200, "I18 session status mismatch");
assert(i18?.execution_summary?.marker_mode === "security_audit_break_glass_marker", "I18 marker mode mismatch");
assert(i18?.execution_summary?.marker_status === 201, "I18 marker status mismatch");
assert(i18?.execution_summary?.matching_marker_audit_count === 1, "I18 audit match count mismatch");
assert(i18?.execution_summary?.matching_marker_readback_count === 1, "I18 marker readback count mismatch");
assert(i18?.execution_summary?.probe_receipt_status === "PASS", "I18 probe receipt status mismatch");
assert(i18?.conditions?.direct_invoke_only === true, "I18 must require direct invoke");
assert(i18?.conditions?.public_http_endpoint_allowed === false, "I18 must prohibit public HTTP endpoint");
assert(i18?.conditions?.debug_endpoint_allowed === false, "I18 must prohibit debug endpoint");
assert(i18?.conditions?.direct_token_mint_allowed === false, "I18 must prohibit direct token mint");
assert(i18?.conditions?.temporary_backdoor_principal_allowed === false, "I18 must prohibit temporary backdoor principal");
assert(i18?.conditions?.secret_value_output_allowed === false, "I18 must prohibit secret value output");
assert(i18?.conditions?.token_or_password_output_allowed === false, "I18 must prohibit token/password output");
assert(i18?.boundary?.credential_store_write_executed_for_probe_principal === true, "I18 must record probe-principal credential store write");
assert(i18?.boundary?.s1_g_authenticated_production_probe_executed === true, "I18 must record S1-G probe execution");
assert(i18?.boundary?.production_migration_executed === false, "I18 must not record production migration");
assert(i18?.boundary?.tenant_migration_executed === false, "I18 must not record tenant migration");
assert(i18?.boundary?.account_permission_injection_executed === false, "I18 must not record account/permission injection");
assert(i18?.boundary?.operational_profile_switch_executed === false, "I18 must not record operational profile switch");
assert(i18?.boundary?.bridge_token_rotation_executed === false, "I18 must not record bridge token rotation");
assert(i18?.boundary?.password_issuance_distribution_executed === false, "I18 must not record password issuance/distribution");
assert(i18?.boundary?.production_restore_executed === false, "I18 must not record production restore");
assert(i18?.boundary?.cutover_executed === false, "I18 must not record cutover");
assert(i18?.boundary?.production_ready_claim === false, "I18 must not record production_ready claim");
assert(i18?.boundary?.go_live_claim === false, "I18 must not record go-live claim");
assert(i18?.boundary?.secret_value_recorded === false, "I18 must not record secret values");
assert(i18?.boundary?.token_material_recorded === false, "I18 must not record token material");
assert(i18?.boundary?.plaintext_password_recorded === false, "I18 must not record plaintext password");
assert(i18?.boundary?.plaintext_pii_recorded === false, "I18 must not record plaintext PII");
assert(i18?.boundary?.credential_material_recorded === false, "I18 must not record credential material");
const s1gPass = readJson(path.join(ROOT, "docs/launch/cti-s1g-authenticated-production-probe-receipt-2026-07-06.json"));
assert(s1gPass?.approval_signature_ref === I18_REF, "S1-G PASS receipt I18 ref mismatch");
assert(s1gPass?.status === "PASS", "S1-G PASS receipt status mismatch");
assert(s1gPass?.lambda?.function_name === "matter-lawos-api-prod", "S1-G PASS Lambda function mismatch");
assert(s1gPass?.lambda?.last_update_status === "Successful", "S1-G PASS Lambda update status mismatch");
assert(s1gPass?.lambda?.code_sha256 === "FjmpI+t+zyB4YToT9IPzL8HddRgalcSbcV5CgLO78iM=", "S1-G PASS Lambda code hash mismatch");
assert(s1gPass?.lambda?.lawos_auth_credential_store_path_env_present === true, "S1-G PASS credential store env missing");
assert(s1gPass?.direct_invoke?.status_code === 200, "S1-G PASS direct invoke status mismatch");
assert(s1gPass?.direct_invoke?.function_error === null, "S1-G PASS direct invoke function error must be null");
assert(s1gPass?.direct_invoke?.public_http_endpoint === false, "S1-G PASS must not be public HTTP");
assert(s1gPass?.credential_store?.records_after_count === 1, "S1-G PASS credential record count mismatch");
assert(s1gPass?.credential_store?.target_credential_rev === 2, "S1-G PASS credential revision mismatch");
assert(s1gPass?.credential_store?.plaintext_password_returned === false, "S1-G PASS must not return plaintext password");
assert(s1gPass?.credential_store?.password_hash_digest_returned === false, "S1-G PASS must not return password hash digest");
assert(s1gPass?.credential_store?.password_hash_salt_returned === false, "S1-G PASS must not return password salt");
assert(s1gPass?.probe_principal?.email_recorded === false, "S1-G PASS must not record plaintext email");
assert(s1gPass?.probe_principal?.plaintext_identifier_recorded === false, "S1-G PASS must not record plaintext identifier");
assert(s1gPass?.probe_results?.login?.status === 200, "S1-G PASS login status mismatch");
assert(s1gPass?.probe_results?.login?.token_material_returned_to_caller === false, "S1-G PASS must not return token material");
assert(s1gPass?.probe_results?.session?.status === 200, "S1-G PASS session status mismatch");
assert(s1gPass?.probe_results?.matter_readback?.status === 200, "S1-G PASS matter readback status mismatch");
assert(s1gPass?.probe_results?.matter_readback?.item_count === 0, "S1-G PASS matter readback count should document zero matters");
assert(s1gPass?.probe_results?.marker?.status === 201, "S1-G PASS marker status mismatch");
assert(s1gPass?.probe_results?.marker?.marker_mode === "security_audit_break_glass_marker", "S1-G PASS marker mode mismatch");
assert(s1gPass?.probe_results?.audit_readback?.matching_marker_audit_count === 1, "S1-G PASS audit match count mismatch");
assert(s1gPass?.probe_results?.marker_readback?.matching_marker_readback_count === 1, "S1-G PASS marker readback count mismatch");
assert(s1gPass?.boundary?.direct_invoke_only === true, "S1-G PASS must be direct invoke only");
assert(s1gPass?.boundary?.real_login_flow_used === true, "S1-G PASS must use real login flow");
assert(s1gPass?.boundary?.debug_endpoint_used === false, "S1-G PASS must not use debug endpoint");
assert(s1gPass?.boundary?.direct_token_mint_used === false, "S1-G PASS must not use direct token mint");
assert(s1gPass?.boundary?.temporary_backdoor_principal_used === false, "S1-G PASS must not use temporary backdoor principal");
assert(s1gPass?.boundary?.credential_store_write_executed === true, "S1-G PASS must record credential store write");
assert(s1gPass?.boundary?.credential_store_write_principal_count === 1, "S1-G PASS credential store write principal count mismatch");
assert(s1gPass?.boundary?.security_audit_marker_used_because_matter_count_was_zero === true, "S1-G PASS must document security audit marker fallback");
assert(s1gPass?.boundary?.token_or_password_returned === false, "S1-G PASS must not return token/password");
assert(s1gPass?.boundary?.secret_value_recorded === false, "S1-G PASS must not record secret values");
assert(s1gPass?.boundary?.production_migration_executed === false, "S1-G PASS must not record production migration");
assert(s1gPass?.boundary?.tenant_migration_executed === false, "S1-G PASS must not record tenant migration");
assert(s1gPass?.boundary?.account_permission_injection_executed === false, "S1-G PASS must not record account/permission injection");
assert(s1gPass?.boundary?.operational_profile_switch_executed === false, "S1-G PASS must not record operational profile switch");
assert(s1gPass?.boundary?.bridge_token_rotation_executed === false, "S1-G PASS must not record bridge token rotation");
assert(s1gPass?.boundary?.password_issuance_distribution_executed === false, "S1-G PASS must not record password distribution");
assert(s1gPass?.boundary?.production_restore_executed === false, "S1-G PASS must not record production restore");
assert(s1gPass?.boundary?.cutover_executed === false, "S1-G PASS must not record cutover");
assert(s1gPass?.boundary?.production_ready_claimed === false, "S1-G PASS must not record production_ready claim");
assert(s1gPass?.boundary?.go_live_claimed === false, "S1-G PASS must not record go-live claim");
const i4Packet = read(path.join(ROOT, "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md"));
assert(i4Packet.includes("I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06"), "I4 ratification ref missing");
const s1Execute = readJson(path.join(ROOT, "docs/goal-closeout/cti-s1-foundation-execute/packet.json"));
assert(
  s1Execute?.approval_signature_refs?.includes("I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06"),
  "I5 approval ref missing from S1 execute packet",
);
assert(
  s1Execute?.approval_signature_refs?.includes("I6-CTI-S1-SECRETSMANAGER-VPCE-IAM-OWNER-APPROVAL-2026-07-06"),
  "I6 approval ref missing from S1 execute packet",
);
assert(
  s1Execute?.local_foundation_evidence?.backup_restore_v0_2_isolated_rehearsal_test_passed === true,
  "S1 restore rehearsal evidence missing",
);

const buildPacket = readJson(path.join(ROOT, "docs/goal-closeout/cti-build-s3-s4-code-prep/packet.json"));
assert(buildPacket?.build_g?.status === "PASS", "BUILD-G PASS evidence missing");
assert(buildPacket?.authority_boundary?.cutover_executed === false, "BUILD-G packet must not record cutover execution");

const s2Packet = readJson(path.join(ROOT, "docs/goal-closeout/cti-s2-authentication-execute/packet.json"));
assert(
  s2Packet?.i8_s1_g_authenticated_probe?.status === "BLOCKED_CONDITIONS_UNMET",
  "S2 execute packet must record I8/S1-G production probe blocked",
);
assert(s2Packet?.authority_boundary?.cutover_executed === false, "S2 execute packet must not record cutover execution");

const s0Snapshot = readJson(path.join(ROOT, "docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json"));
assert(s0Snapshot?.cti_item === "S0-T04", "S0-T04 snapshot receipt missing");
assert(s0Snapshot?.readback_snapshot?.sha256, "S0-T04 snapshot hash missing");
assert(s0Snapshot?.execution_boundary?.product_state_write_performed === false, "S0-T04 must be read-only");

const currentSnapshot = readJson(path.join(ROOT, "docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.json"));
assert(currentSnapshot?.status === "PASS", "current production snapshot receipt must PASS");
assert(currentSnapshot?.approval_signature_ref === I14_REF, "current production snapshot I14 ref mismatch");
assert(currentSnapshot?.direct_invoke?.public_http_endpoint === false, "current production snapshot must be direct invoke only");
assert(currentSnapshot?.direct_invoke?.lambda_response_status_code === 200, "current production snapshot Lambda response must be 200");
assert(currentSnapshot?.current_production_snapshot?.snapshot_hash === SUPERSEDED_SNAPSHOT_HASH, "superseded production snapshot hash mismatch");
assert(currentSnapshot?.current_production_snapshot?.readable_store_file_count >= 13, "current production snapshot readable store count too low");
assert(currentSnapshot?.current_production_snapshot?.read_error_count === 0, "current production snapshot read errors must be 0");
assert(currentSnapshot?.current_production_snapshot?.blocked_path_count === 0, "current production snapshot blocked paths must be 0");
assert(currentSnapshot?.snapshot_bound_restore_rehearsal?.status === "PASS", "snapshot-bound restore rehearsal must PASS");
assert(
  currentSnapshot?.snapshot_bound_restore_rehearsal?.restored_file_count ===
    currentSnapshot?.snapshot_bound_restore_rehearsal?.source_file_count,
  "restore rehearsal restored/source file counts must match",
);
assert(currentSnapshot?.snapshot_bound_restore_rehearsal?.checksum_mismatch_count === 0, "restore rehearsal checksum mismatches must be 0");
assert(currentSnapshot?.boundary?.production_write_executed === false, "current snapshot must not record production write");
assert(currentSnapshot?.boundary?.production_restore_executed === false, "current snapshot must not record production restore");
assert(currentSnapshot?.boundary?.plaintext_file_content_returned === false, "current snapshot must not return plaintext file content");
const postI18Snapshot = readJson(path.join(ROOT, "docs/launch/cti-cutover-execute-precheck-live-snapshot-receipt-2026-07-06.json"));
assert(postI18Snapshot?.status === "BLOCKED_SNAPSHOT_HASH_MISMATCH", "post-I18 live snapshot source status mismatch");
assert(postI18Snapshot?.live_snapshot?.snapshot_hash === CURRENT_SNAPSHOT_HASH, "post-I18 live snapshot hash mismatch");
assert(postI18Snapshot?.live_snapshot?.readable_store_file_count === 15, "post-I18 live snapshot readable store count mismatch");
assert(postI18Snapshot?.live_snapshot?.read_error_count === 0, "post-I18 live snapshot read errors must be 0");
assert(postI18Snapshot?.live_snapshot?.blocked_path_count === 0, "post-I18 live snapshot blocked paths must be 0");
assert(postI18Snapshot?.live_snapshot?.restore_rehearsal_status === "PASS", "post-I18 restore rehearsal must PASS");
assert(postI18Snapshot?.live_snapshot?.restore_source_file_count === 15, "post-I18 restore source count mismatch");
assert(postI18Snapshot?.live_snapshot?.restore_restored_file_count === 15, "post-I18 restore restored count mismatch");
assert(postI18Snapshot?.live_snapshot?.restore_checksum_mismatch_count === 0, "post-I18 restore checksum mismatch must be 0");
assert(postI18Snapshot?.boundary?.production_write_executed === false, "post-I18 snapshot must not record production write");
assert(postI18Snapshot?.boundary?.production_restore_executed === false, "post-I18 snapshot must not record production restore");
assert(postI18Snapshot?.boundary?.cutover_executed === false, "post-I18 snapshot must not record CUTOVER");

const rollbackCriteria = read(path.join(ROOT, "docs/launch/cutover-rollback-criteria.md"));
assert(rollbackCriteria.includes("Status: approved_for_cti_cutover_post_i18_snapshot_rebind"), "rollback criteria must be rebound for CTI preflight");
assert(rollbackCriteria.includes(I15_REF), "rollback criteria I15 ref missing");
assert(rollbackCriteria.includes(I19_REF), "rollback criteria I19 ref missing");
assert(rollbackCriteria.includes(CURRENT_SNAPSHOT_HASH), "rollback criteria current snapshot hash missing");
assert(rollbackCriteria.includes(SUPERSEDED_SNAPSHOT_HASH), "rollback criteria superseded snapshot hash missing");
assert(rollbackCriteria.includes("production restore, production write, CUTOVER"), "rollback criteria non-execution boundary missing");
const cutoverLog = read(path.join(ROOT, "docs/launch/cutover-execution-log.md"));
assert(cutoverLog.includes("Status: blocked_not_executed"), "cutover execution log must remain blocked_not_executed");
assert(cutoverLog.includes("1 Change Freeze") && cutoverLog.includes("blocked_not_executed"), "freeze execution state must be blocked_not_executed");
const legacyFreeze = read(path.join(ROOT, "docs/launch/legacy-freeze-record.md"));
assert(legacyFreeze.includes("Status: blocked_not_executed"), "legacy freeze must remain blocked_not_executed");

for (const file of ["packet.json", "command-evidence.json", "adjudication.md", "construction-inspection.json", "claude-review-result.json"]) {
  assert(existsSync(path.join(CLOSEOUT_DIR, file)), `missing closeout file ${file}`);
}
const closeoutPacket = readJson(path.join(CLOSEOUT_DIR, "packet.json"));
assert(closeoutPacket?.goal_id === GOAL_ID, "closeout packet goal_id mismatch");
assert(closeoutPacket?.closeout_verdict === "GO_READY_NOT_EXECUTED", "closeout verdict must be GO_READY_NOT_EXECUTED");
assert(closeoutPacket?.preflight_decision?.go === true, "preflight decision go must be true");
assert(closeoutPacket?.preflight_decision?.no_go === false, "preflight decision no_go must be false");
assert(Array.isArray(closeoutPacket?.blocking_conditions) && closeoutPacket.blocking_conditions.length === 0, "closeout blockers must be empty");
assert(closeoutPacket?.approval_signature_refs?.includes(I17_REF), "closeout packet missing I17 ref");
assert(closeoutPacket?.approval_signature_refs?.includes(I18_REF), "closeout packet missing I18 ref");
assert(closeoutPacket?.approval_signature_refs?.includes(I19_REF), "closeout packet missing I19 ref");
assert(closeoutPacket?.approval_status?.I17 === "RECORDED_SUPERSEDED_BY_I18_S1G_PASS", "closeout packet I17 status mismatch");
assert(closeoutPacket?.approval_status?.I18 === "RECORDED_AND_EXECUTED_S1G_PASS", "closeout packet I18 status mismatch");
assert(closeoutPacket?.approval_status?.I19 === "RECORDED_SNAPSHOT_REBOUND_NOT_EXECUTED", "closeout packet I19 status mismatch");
assert(closeoutPacket?.evidence_status?.verified_production_snapshot === "PASS_POST_I18_REBOUND_SNAPSHOT_RECORDED", "closeout packet snapshot evidence status mismatch");
assert(closeoutPacket?.evidence_status?.restore_rehearsal === "PASS_POST_I18_SNAPSHOT_BOUND_ISOLATED_REHEARSAL", "closeout packet restore evidence status mismatch");
assert(closeoutPacket?.evidence_status?.rollback_criteria === "PASS_OWNER_APPROVED_POST_I18_SNAPSHOT_BOUND", "closeout packet rollback evidence status mismatch");
assert(
  closeoutPacket?.evidence_status?.s1_g_authenticated_production_probe === "PASS_AUTHENTICATED_PRODUCTION_PROBE_AFTER_I18",
  "closeout packet S1-G evidence status mismatch",
);
assert(closeoutPacket?.s1_g_authenticated_production_probe?.status === "PASS_AUTHENTICATED_PRODUCTION_PROBE", "closeout S1-G status mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.lawos_auth_credential_store_path_env_present === true, "closeout S1-G env present evidence mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.s2_production_auth_code_deployment_recorded === true, "closeout S1-G production deployment evidence mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.production_credential_store_write_recorded === true, "closeout S1-G credential write evidence mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.credential_store_write_principal_count === 1, "closeout S1-G credential write principal count mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.approved_production_probe_principal_recorded === true, "closeout S1-G probe principal evidence mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.authenticated_marker_audit_readback_executed === true, "closeout S1-G probe execution must be true");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.real_login_flow_used === true, "closeout S1-G real login evidence mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.login_status === 200, "closeout S1-G login status mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.session_status === 200, "closeout S1-G session status mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.marker_mode === "security_audit_break_glass_marker", "closeout S1-G marker mode mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.marker_status === 201, "closeout S1-G marker status mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.matching_marker_audit_count === 1, "closeout S1-G audit match count mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.matching_marker_readback_count === 1, "closeout S1-G marker readback count mismatch");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.debug_endpoint_used === false, "closeout S1-G debug endpoint must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.direct_token_mint_used === false, "closeout S1-G direct token mint must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.temporary_backdoor_principal_used === false, "closeout S1-G temporary backdoor must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.secret_value_lookup_or_output_used === false, "closeout S1-G secret lookup/output must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.token_or_password_returned === false, "closeout S1-G token/password return must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.secret_value_recorded === false, "closeout S1-G secret value record must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.plaintext_password_recorded === false, "closeout S1-G plaintext password record must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.credential_material_recorded === false, "closeout S1-G credential material record must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.token_material_recorded === false, "closeout S1-G token material record must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.production_write_executed === false, "closeout S1-G production write must be false");
assert(closeoutPacket?.s1_g_authenticated_production_probe?.cutover_executed === false, "closeout S1-G cutover must be false");
assert(closeoutPacket?.current_production_snapshot?.receipt === "docs/launch/cti-cutover-execute-precheck-live-snapshot-receipt-2026-07-06.json", "closeout current snapshot receipt mismatch");
assert(closeoutPacket?.current_production_snapshot?.snapshot_hash === CURRENT_SNAPSHOT_HASH, "closeout current snapshot hash mismatch");
assert(closeoutPacket?.current_production_snapshot?.superseded_snapshot_hash === SUPERSEDED_SNAPSHOT_HASH, "closeout superseded snapshot hash mismatch");
assert(closeoutPacket?.current_production_snapshot?.rebind_approval_signature_ref === I19_REF, "closeout snapshot rebind ref mismatch");
assert(closeoutPacket?.current_production_snapshot?.readable_store_file_count === 15, "closeout snapshot file count mismatch");
assert(closeoutPacket?.current_production_snapshot?.restore_rehearsal_status === "PASS", "closeout restore status mismatch");
assert(closeoutPacket?.current_production_snapshot?.restore_rehearsal_source_file_count === 15, "closeout restore source count mismatch");
assert(closeoutPacket?.current_production_snapshot?.restore_rehearsal_restored_file_count === 15, "closeout restore restored count mismatch");
assert(closeoutPacket?.current_production_snapshot?.restore_rehearsal_checksum_mismatch_count === 0, "closeout restore checksum mismatch count mismatch");
assert(closeoutPacket?.rollback_abort_criteria?.rebind_approval_signature_ref === I19_REF, "closeout rollback rebind ref mismatch");
assert(closeoutPacket?.rollback_abort_criteria?.snapshot_hash === CURRENT_SNAPSHOT_HASH, "closeout rollback snapshot hash mismatch");
assert(closeoutPacket?.rollback_abort_criteria?.superseded_snapshot_hash === SUPERSEDED_SNAPSHOT_HASH, "closeout rollback superseded snapshot hash mismatch");
for (const [key, value] of Object.entries(closeoutPacket?.authority_boundary ?? {})) {
  if (key.endsWith("_executed") || key.endsWith("_claim") || key.includes("recorded")) {
    assert(value === false, `authority boundary ${key} must be false`);
  }
}

const commandEvidence = readJson(path.join(CLOSEOUT_DIR, "command-evidence.json"));
assert(commandEvidence?.goal_id === GOAL_ID, "command evidence goal_id mismatch");
assert(commandEvidence?.preflight_decision === "GO_READY_NOT_EXECUTED", "command evidence preflight decision mismatch");
for (const [key, value] of Object.entries(commandEvidence?.boundary ?? {})) {
  assert(value === false, `command evidence boundary ${key} must be false`);
}

const crosswalk = readJson(CROSSWALK_JSON);
assert(crosswalk?.goal_id === GOAL_ID, "crosswalk goal_id mismatch");
assert(crosswalk?.work_package === "LT-PRE-W15", "crosswalk work package mismatch");
assert(crosswalk?.decision === "GO_READY_NOT_EXECUTED", "crosswalk decision mismatch");
assert(crosswalk?.approval_signature_refs?.includes(I17_REF), "crosswalk missing I17 ref");
assert(crosswalk?.approval_signature_refs?.includes(I18_REF), "crosswalk missing I18 ref");
assert(crosswalk?.approval_signature_refs?.includes(I19_REF), "crosswalk missing I19 ref");
assert(
  crosswalk?.passed_since_prior_no_go?.includes("I17 S1-G authenticated production probe approval recorded"),
  "crosswalk missing I17 recorded evidence",
);
assert(
  crosswalk?.passed_since_prior_no_go?.includes("I18 S2 production auth/probe-principal boundary approval recorded"),
  "crosswalk missing I18 recorded evidence",
);
assert(
  crosswalk?.passed_since_prior_no_go?.includes("I19 post-I18 snapshot rebind recorded"),
  "crosswalk missing I19 snapshot rebind evidence",
);
assert(crosswalk?.passed_since_prior_no_go?.includes("S1-G authenticated production probe PASS"), "crosswalk missing S1-G PASS evidence");
assert(Array.isArray(crosswalk?.blocking_conditions) && crosswalk.blocking_conditions.length === 0, "crosswalk blockers must be empty");
assert(crosswalk?.non_execution_boundary?.cutover_execution === false, "crosswalk must record cutover_execution=false");

const ledger = readJson(path.join(ROOT, "workbook/launch-tuw/launch-tuw-ledger.json"));
assert(ledger?.work_packages?.some((wp) => wp.wp_id === "LT-PRE-W15" && wp.goal_id === GOAL_ID), "launch-TUW missing LT-PRE-W15");
for (let index = 1; index <= 5; index += 1) {
  assert(ledger?.tuws?.some((tuw) => tuw.id === `LT-PRE-W15-T0${index}`), `launch-TUW missing LT-PRE-W15-T0${index}`);
}

if (errors.length > 0) {
  console.error("CTI CUTOVER preflight go/no-go validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  schema_version: "law-firm-os.cti-cutover-preflight-go-no-go-validator.v0.1",
  goal_id: GOAL_ID,
  verdict: "PASS",
  decision: "GO_READY_NOT_EXECUTED",
  i11_ref: I11_REF,
  i14_ref: I14_REF,
  i15_ref: I15_REF,
  i16_ref: I16_REF,
  i17_ref: I17_REF,
  i18_ref: I18_REF,
  i19_ref: I19_REF,
  current_snapshot_hash: postI18Snapshot.live_snapshot.snapshot_hash,
  superseded_snapshot_hash: currentSnapshot.current_production_snapshot.snapshot_hash,
  restore_rehearsal_status: postI18Snapshot.live_snapshot.restore_rehearsal_status,
  s1_g_attempt_status: s1gAttempt.status,
  s1_g_pass_status: s1gPass.status,
  s1_g_marker_mode: s1gPass.probe_results.marker.marker_mode,
  blockers: closeoutPacket.blocking_conditions,
  boundary: commandEvidence.boundary,
}, null, 2));
