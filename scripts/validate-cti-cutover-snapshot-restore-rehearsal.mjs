#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GOAL_ID = "cti-cutover-snapshot-restore-rehearsal";
const CLOSEOUT_DIR = path.join(ROOT, "docs/goal-closeout/cti-cutover-snapshot-restore-rehearsal");
const ATTEMPT_RECEIPT = path.join(ROOT, "docs/launch/cti-cutover-current-snapshot-attempt-receipt-2026-07-06.json");
const CROSSWALK_JSON = path.join(ROOT, "docs/launch/cti-cutover-snapshot-restore-rehearsal-crosswalk-2026-07-06.json");
const BLOCKED_VERDICT = "BLOCKED_NO_APPROVED_EFS_FILE_READ_SURFACE";

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

function approvalReceiptPath(id) {
  return path.join(ROOT, `docs/launch/cti-i${id}-owner-approval-receipt-2026-07-06.json`);
}

for (const file of [
  "packet.json",
  "command-evidence.json",
  "adjudication.md",
  "construction-inspection.json",
  "claude-review-result.json",
]) {
  assert(existsSync(path.join(CLOSEOUT_DIR, file)), `missing closeout file ${file}`);
}

for (const id of [1, 2, 3, 7, 8, 9, 10, 11]) {
  assert(existsSync(approvalReceiptPath(id)), `I${id} approval receipt missing`);
}
const i4Packet = read(path.join(ROOT, "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md"));
assert(i4Packet.includes("I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06"), "I4 ratification ref missing");
const s1Execute = readJson(path.join(ROOT, "docs/goal-closeout/cti-s1-foundation-execute/packet.json"));
assert(
  s1Execute?.approval_signature_refs?.includes("I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06"),
  "I5 approval ref missing",
);
assert(
  s1Execute?.approval_signature_refs?.includes("I6-CTI-S1-SECRETSMANAGER-VPCE-IAM-OWNER-APPROVAL-2026-07-06"),
  "I6 approval ref missing",
);
const build = readJson(path.join(ROOT, "docs/goal-closeout/cti-build-s3-s4-code-prep/packet.json"));
assert(build?.build_g?.status === "PASS", "BUILD-G PASS missing");
const i1 = readJson(approvalReceiptPath(1));
assert(i1?.status === "owner_mapping_confirmed_with_dropdown_normalization_required", "I1 owner mapping confirmation missing");
assert(i1?.required_field_counts?.matter_status_blank_rows === 0, "I1 matter status blanks must be 0");

const receipt = readJson(ATTEMPT_RECEIPT);
assert(receipt?.goal_id === GOAL_ID, "attempt receipt goal_id mismatch");
assert(receipt?.status === BLOCKED_VERDICT, "attempt receipt status mismatch");
assert(receipt?.upstream_evidence?.build_g_pass === true, "attempt receipt missing BUILD-G PASS");
assert(receipt?.upstream_evidence?.i1_owner_mapping_confirmation_recorded === true, "attempt receipt missing I1 confirmation");
assert(receipt?.current_runtime_metadata?.lambda_function_name === "matter-lawos-api-prod", "lambda function mismatch");
assert(receipt?.current_runtime_metadata?.efs_file_system_id === "fs-01e9f68b22b23e9f3", "EFS id mismatch");
assert(receipt?.current_runtime_metadata?.efs_access_point_id === "fsap-0be58113c42e109fe", "EFS access point mismatch");
assert(receipt?.current_runtime_metadata?.lambda_store_path_env_key_count >= 13, "STORE_PATH env key count too low");
assert(receipt?.current_runtime_metadata?.api_health_status_code === 200, "API health status mismatch");
assert(receipt?.current_runtime_metadata?.api_runtime_profile === "operational", "API runtime profile mismatch");
assert(receipt?.current_runtime_metadata?.api_synthetic_login_enabled === false, "synthetic login must be disabled");
assert(receipt?.current_runtime_metadata?.matters_without_session_status_code === 401, "matters unauth status mismatch");
assert(receipt?.current_runtime_metadata?.matters_without_session_safe_error_codes?.includes("AUTH_SESSION_REQUIRED"), "AUTH_SESSION_REQUIRED missing");
assert(receipt?.snapshot_result?.current_snapshot_hash_count_receipt_created === false, "snapshot must be blocked");
assert(receipt?.snapshot_result?.snapshot_hash === null, "snapshot hash must be null when blocked");
assert(receipt?.restore_rehearsal_result?.snapshot_bound_restore_rehearsal_executed === false, "restore rehearsal must be blocked");
assert(receipt?.restore_rehearsal_result?.production_restore_executed === false, "production restore must be false");
assert(receipt?.private_evidence?.sha256?.length === 64, "private evidence sha missing");

for (const [key, value] of Object.entries(receipt?.authority_boundary ?? {})) {
  assert(value === false, `attempt receipt boundary ${key} must be false`);
}

const packet = readJson(path.join(CLOSEOUT_DIR, "packet.json"));
assert(packet?.goal_id === GOAL_ID, "closeout packet goal_id mismatch");
assert(packet?.closeout_verdict === BLOCKED_VERDICT, "closeout verdict mismatch");
assert(packet?.stop_condition?.triggered === true, "stop condition must be triggered");
assert(packet?.stop_condition?.cutover_execute_allowed === false, "cutover must remain blocked");
assert(packet?.prerequisites?.aws_credential_read_access === true, "AWS credential read access must pass");
assert(packet?.prerequisites?.lambda_health_read_access === true, "Lambda health read access must pass");
assert(packet?.prerequisites?.efs_metadata_read_access === true, "EFS metadata read access must pass");
assert(packet?.prerequisites?.approved_efs_file_read_surface_available === false, "EFS file read surface must be unavailable");
assert(packet?.current_snapshot?.current_snapshot_hash_count_receipt_created === false, "packet snapshot must be blocked");
assert(packet?.restore_rehearsal?.snapshot_bound_restore_rehearsal_executed === false, "packet restore rehearsal must be blocked");
for (const blocker of [
  "current production snapshot hash/count receipt blocked: no approved EFS file read surface",
  "snapshot-bound restore rehearsal blocked: current snapshot hash/count receipt is missing",
]) {
  assert(packet?.blocking_conditions?.includes(blocker), `missing blocker: ${blocker}`);
}
for (const [key, value] of Object.entries(packet?.authority_boundary ?? {})) {
  assert(value === false, `closeout packet boundary ${key} must be false`);
}

const commandEvidence = readJson(path.join(CLOSEOUT_DIR, "command-evidence.json"));
assert(commandEvidence?.closeout_decision === BLOCKED_VERDICT, "command evidence decision mismatch");
assert(commandEvidence?.commands?.some((entry) => entry.command === "current EFS file hash/count snapshot" && entry.status === "NOT_RUN_BLOCKED"), "missing blocked snapshot command");
assert(commandEvidence?.commands?.some((entry) => entry.command === "snapshot-bound isolated restore rehearsal" && entry.status === "NOT_RUN_BLOCKED"), "missing blocked restore command");
for (const [key, value] of Object.entries(commandEvidence?.boundary ?? {})) {
  assert(value === false, `command evidence boundary ${key} must be false`);
}

const construction = readJson(path.join(CLOSEOUT_DIR, "construction-inspection.json"));
assert(construction?.verdict === BLOCKED_VERDICT, "construction verdict mismatch");
assert(construction?.inspections?.some((entry) => entry.id === "CUTOVER-SNAPSHOT-EFS-CONTENT" && entry.status === "BLOCKED"), "construction missing EFS content blocker");
assert(construction?.inspections?.some((entry) => entry.id === "CUTOVER-RESTORE-REHEARSAL" && entry.status === "BLOCKED"), "construction missing restore blocker");

const adjudication = read(path.join(CLOSEOUT_DIR, "adjudication.md"));
for (const phrase of [
  BLOCKED_VERDICT,
  "no approved EFS file read surface",
  "No production write",
  "No CUTOVER",
]) {
  assert(adjudication.includes(phrase), `adjudication missing ${phrase}`);
}

const claudeReview = readJson(path.join(CLOSEOUT_DIR, "claude-review-result.json"));
assert(claudeReview?.status === "not_required_for_blocked_snapshot_restore_preflight_closeout", "Claude review status mismatch");
assert(claudeReview?.production_ready_claim === false, "Claude review production_ready must be false");
assert(claudeReview?.go_live_claim === false, "Claude review go_live must be false");

const crosswalk = readJson(CROSSWALK_JSON);
assert(crosswalk?.goal_id === GOAL_ID, "crosswalk goal_id mismatch");
assert(crosswalk?.work_package === "LT-PRE-W16", "crosswalk work package mismatch");
assert(crosswalk?.decision === BLOCKED_VERDICT, "crosswalk decision mismatch");
assert(crosswalk?.validator === "scripts/validate-cti-cutover-snapshot-restore-rehearsal.mjs", "crosswalk validator mismatch");
assert(crosswalk?.non_execution_boundary?.cutover_executed === false, "crosswalk cutover boundary must be false");

const ledger = readJson(path.join(ROOT, "workbook/launch-tuw/launch-tuw-ledger.json"));
assert(ledger?.work_packages?.some((wp) => wp.wp_id === "LT-PRE-W16" && wp.goal_id === GOAL_ID), "launch-TUW missing LT-PRE-W16");
for (let index = 1; index <= 5; index += 1) {
  assert(ledger?.tuws?.some((tuw) => tuw.id === `LT-PRE-W16-T0${index}`), `launch-TUW missing LT-PRE-W16-T0${index}`);
}

if (errors.length > 0) {
  console.error("CTI CUTOVER snapshot/restore rehearsal validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  schema_version: "law-firm-os.cti-cutover-snapshot-restore-rehearsal-validator.v0.1",
  goal_id: GOAL_ID,
  verdict: "PASS",
  closeout_decision: BLOCKED_VERDICT,
  snapshot_created: false,
  restore_rehearsal_executed: false,
  blockers: packet.blocking_conditions,
}, null, 2));
