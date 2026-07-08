#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GOAL_ID = "cti-cutover-execute";
const WORK_PACKAGE = "LT-PRE-W18";
const SNAPSHOT_HASH = "b4139c730895d173cf964a92fa6ba375c93cefcb13687b0f82732c4c0531da49";
const PARTIAL_STATE_RESUME_SNAPSHOT_HASH = "8b53d5148f69a939e8e38f9f0813befe0675f4de59c9f54dad81d5451ab53d8a";
const CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH = "4b694462d60b1483f6c2740707860ff9a69007e1b82712f309b9c9ecbfeee9d6";
const POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH = "6b66029c055ece6c3cfa6a7cd559c8eb387a958261e92f006aa67f3f48767ddd";
const I11_REF = "I11-CTI-CUTOVER-EXECUTE-OWNER-APPROVAL-2026-07-06";
const I18_REF = "I18-CTI-S2-PRODUCTION-AUTH-PROBE-PRINCIPAL-OWNER-APPROVAL-2026-07-06";
const I19_REF = "I19-CTI-CUTOVER-POST-I18-SNAPSHOT-REBIND-OWNER-APPROVAL-2026-07-06";
const I20_REF = "I20-CTI-CUTOVER-PARTIAL-STATE-RESUME-OWNER-APPROVAL-2026-07-06";
const I21_REF = "I21-CTI-CUTOVER-CURRENT-PARTIAL-RESUME-BOUNDARY-OWNER-APPROVAL-2026-07-06";
const I22_REF = "I22-CTI-CUTOVER-POST-I21-PARTIAL-RESUME-BOUNDARY-OWNER-APPROVAL-2026-07-06";
const CLOSEOUT_DIR = path.join(ROOT, "docs/goal-closeout/cti-cutover-execute");
const RECEIPT_JSON = path.join(ROOT, "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.json");
const CROSSWALK_JSON = path.join(ROOT, "docs/launch/cti-cutover-execute-crosswalk-2026-07-06.json");

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

function includesAll(values = [], expected = [], label = "array") {
  for (const item of expected) assert(values.includes(item), `${label} missing ${item}`);
}

const preflight = readJson(path.join(ROOT, "docs/goal-closeout/cti-cutover-preflight-go-no-go/packet.json"));
assert(preflight?.closeout_verdict === "GO_READY_NOT_EXECUTED", "preflight must remain GO_READY_NOT_EXECUTED");
assert(preflight?.preflight_decision?.go === true, "preflight go must be true");
assert(preflight?.current_production_snapshot?.snapshot_hash === SNAPSHOT_HASH, "preflight snapshot hash mismatch");
includesAll(preflight?.approval_signature_refs ?? [], [I11_REF, I18_REF, I19_REF], "preflight approval refs");

const receipt = readJson(RECEIPT_JSON);
const resumeFromPartialState = receipt?.resume_from_partial_state === true;
const resumeFromCurrentPartialState = receipt?.resume_from_current_partial_state === true;
const resumeFromPostI21PartialState = receipt?.resume_from_post_i21_partial_state === true;
function activeSnapshotHashForReceipt() {
  if (resumeFromPostI21PartialState) return POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH;
  if (resumeFromCurrentPartialState) return CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH;
  if (resumeFromPartialState) return PARTIAL_STATE_RESUME_SNAPSHOT_HASH;
  return SNAPSHOT_HASH;
}
function expectedApprovalRefsForReceipt() {
  if (resumeFromPostI21PartialState) return [I11_REF, I18_REF, I19_REF, I22_REF];
  if (resumeFromCurrentPartialState) return [I11_REF, I18_REF, I19_REF, I21_REF];
  if (resumeFromPartialState) return [I11_REF, I18_REF, I19_REF, I20_REF];
  return [I11_REF, I18_REF, I19_REF];
}
const activeSnapshotHash = activeSnapshotHashForReceipt();
const expectedApprovalRefs = expectedApprovalRefsForReceipt();
assert(receipt?.schema_version === "law-firm-os.cti.cutover-execute-retry.operator-receipt.v0.1", "receipt schema mismatch");
assert(receipt?.goal_id === GOAL_ID, "receipt goal_id mismatch");

if (receipt?.verdict === "BLOCKED_I20_RESUME_SNAPSHOT_DRIFT") {
  includesAll(receipt?.approval_signature_refs ?? [], [I11_REF, I18_REF, I19_REF, I20_REF], "blocked receipt approval refs");
  assert(receipt?.resume_from_partial_state === true, "blocked receipt must record partial resume");
  assert(receipt?.i20_resume_snapshot_hash === PARTIAL_STATE_RESUME_SNAPSHOT_HASH, "blocked receipt I20 snapshot mismatch");
  assert(receipt?.current_snapshot_hash && receipt.current_snapshot_hash !== PARTIAL_STATE_RESUME_SNAPSHOT_HASH, "blocked receipt must record drifted current snapshot");
  assert(receipt?.current_snapshot?.readable_store_file_count === 15, "blocked receipt readable store count mismatch");
  assert(receipt?.current_snapshot?.matter_store_record_count === 503, "blocked receipt matter store count mismatch");
  assert(receipt?.current_snapshot?.auth_credential_store_record_count === 1, "blocked receipt auth store count mismatch");
  assert(receipt?.partial_state_assessment?.auth_credential_store_still_not_injected === true, "blocked receipt must record missing credential injection");
  assert(receipt?.first_login_validation?.production_login_pass_count === 0, "blocked receipt must not claim first-login pass");
  assert(receipt?.cut_g_validation?.pass === false, "blocked receipt must not claim CUT-G pass");
  assert(Array.isArray(receipt?.blocking_conditions) && receipt.blocking_conditions.length > 0, "blocked receipt must include blockers");
  assert(receipt?.boundary?.production_restore_executed === false, "blocked receipt production restore must remain false");
  assert(receipt?.boundary?.s5_enrichment_executed === false, "blocked receipt S5 must remain false");
  assert(receipt?.boundary?.s6_final_seal_executed === false, "blocked receipt S6 must remain false");
  assert(receipt?.boundary?.oidc_implementation_executed === false, "blocked receipt OIDC must remain false");
  assert(receipt?.boundary?.db_conversion_executed === false, "blocked receipt DB conversion must remain false");
  assert(receipt?.boundary?.production_ready_claim === false, "blocked receipt production_ready claim must remain false");
  assert(receipt?.boundary?.go_live_claim === false, "blocked receipt go-live claim must remain false");
  assert(receipt?.boundary?.credential_material_recorded === false, "blocked receipt credential material must remain false");
  assert(receipt?.boundary?.token_material_recorded === false, "blocked receipt token material must remain false");

  for (const file of ["packet.json", "command-evidence.json", "adjudication.md", "construction-inspection.json", "claude-review-result.json"]) {
    assert(existsSync(path.join(CLOSEOUT_DIR, file)), `missing closeout file: ${file}`);
  }

  const packet = readJson(path.join(CLOSEOUT_DIR, "packet.json"));
  assert(packet?.goal_id === GOAL_ID, "blocked packet goal_id mismatch");
  assert(packet?.closeout_verdict === receipt.verdict, "blocked packet closeout verdict mismatch");
  assert(packet?.current_snapshot_hash === receipt.current_snapshot_hash, "blocked packet current snapshot mismatch");
  assert(packet?.i20_resume_snapshot_hash === PARTIAL_STATE_RESUME_SNAPSHOT_HASH, "blocked packet I20 snapshot mismatch");
  assert(packet?.next_allowed_goal?.s5_enrichment_allowed_after_owner_confirms_password_handoff === false, "blocked packet must not allow S5");
  assert(packet?.next_allowed_goal?.production_ready_claim_allowed === false, "blocked packet must not allow production_ready");
  assert(packet?.next_allowed_goal?.go_live_claim_allowed === false, "blocked packet must not allow go-live");

  const commandEvidence = readJson(path.join(CLOSEOUT_DIR, "command-evidence.json"));
  assert(commandEvidence?.decision === receipt.verdict, "blocked command evidence decision mismatch");
  assert(commandEvidence?.private_handoff?.plaintext_password_recorded_in_repo === false, "blocked command evidence must not record plaintext passwords");

  const construction = readJson(path.join(CLOSEOUT_DIR, "construction-inspection.json"));
  assert(construction?.verdict === receipt.verdict, "blocked construction verdict mismatch");
  assert(construction?.inspections?.some((inspection) => inspection.status === "BLOCKED"), "blocked construction inspection must include a blocker");

  const review = readJson(path.join(CLOSEOUT_DIR, "claude-review-result.json"));
  assert(review?.verdict === receipt.verdict, "blocked review verdict mismatch");
  assert(Array.isArray(review?.findings) && review.findings.length > 0, "blocked review findings missing");

  const crosswalk = readJson(CROSSWALK_JSON);
  assert(crosswalk?.goal_id === GOAL_ID, "blocked crosswalk goal_id mismatch");
  assert(crosswalk?.work_package === WORK_PACKAGE, "blocked crosswalk work package mismatch");
  assert(crosswalk?.decision === receipt.verdict, "blocked crosswalk decision mismatch");
  assert(crosswalk?.evidence?.current_snapshot_hash === receipt.current_snapshot_hash, "blocked crosswalk current snapshot mismatch");
  assert(crosswalk?.evidence?.i20_resume_snapshot_hash === PARTIAL_STATE_RESUME_SNAPSHOT_HASH, "blocked crosswalk I20 snapshot mismatch");
  assert(crosswalk?.non_execution_boundary?.production_ready_claim === false, "blocked crosswalk production_ready boundary mismatch");
  assert(crosswalk?.non_execution_boundary?.go_live_claim === false, "blocked crosswalk go-live boundary mismatch");

  const ledger = readJson(path.join(ROOT, "workbook/launch-tuw/launch-tuw-ledger.json"));
  assert(ledger?.work_packages?.some((wp) => wp.wp_id === WORK_PACKAGE && wp.goal_id === GOAL_ID), "launch-TUW ledger missing W18 work package");

  if (errors.length > 0) {
    console.error("CTI CUTOVER execute blocked-closeout validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(JSON.stringify({
    schema_version: "law-firm-os.cti-cutover-execute-validator.v0.3",
    goal_id: GOAL_ID,
    verdict: "PASS",
    decision: receipt.verdict,
    i20_resume_snapshot_hash: PARTIAL_STATE_RESUME_SNAPSHOT_HASH,
    current_snapshot_hash: receipt.current_snapshot_hash,
    auth_credential_store_record_count: receipt.current_snapshot.auth_credential_store_record_count,
    production_ready_claim: false,
    go_live_claim: false,
  }, null, 2));
  process.exit(0);
}

assert(receipt?.verdict === "PASS", "receipt verdict must be PASS");
assert(receipt?.current_snapshot_hash === activeSnapshotHash, "receipt snapshot hash mismatch");
assert(!resumeFromPartialState || receipt?.original_post_i18_snapshot_hash === SNAPSHOT_HASH, "resume receipt must preserve original post-I18 snapshot hash");
assert(!resumeFromCurrentPartialState || receipt?.current_partial_resume_snapshot_hash === CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH, "current partial resume receipt snapshot mismatch");
assert(!resumeFromPostI21PartialState || receipt?.post_i21_partial_resume_snapshot_hash === POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH, "post-I21 partial resume receipt snapshot mismatch");
includesAll(receipt?.approval_signature_refs ?? [], expectedApprovalRefs, "receipt approval refs");
assert(receipt?.runbook_steps?.preflight_reverified === true, "preflight step missing");
assert(receipt?.runbook_steps?.lambda_cutover_action_deployed === true, "lambda deploy step missing");
assert(receipt?.runbook_steps?.bridge_token_rotation_control_applied === true, "bridge control step missing");
assert(receipt?.runbook_steps?.direct_invoke_cutover_action_executed === true, "direct invoke step missing");
assert(receipt?.runbook_steps?.first_login_validation_executed === true, "first-login step missing");
assert(receipt?.lambda_receipt?.status === "PASS", "lambda cutover receipt must PASS");
assert(receipt?.lambda_receipt?.pre_snapshot?.snapshot_hash === activeSnapshotHash, "lambda pre-snapshot hash mismatch");
assert(receipt?.lambda_receipt?.matter_migration?.clients_expected === 99, "expected client count mismatch");
assert(receipt?.lambda_receipt?.matter_migration?.matters_expected === 148, "expected matter count mismatch");
assert(receipt?.lambda_receipt?.matter_migration?.canonical_client_count === 99, "canonical client count mismatch");
assert(receipt?.lambda_receipt?.matter_migration?.canonical_matter_count === 148, "canonical matter count mismatch");
assert(receipt?.lambda_receipt?.matter_migration?.synthetic_current_record_count === 0, "synthetic current residue must be 0");
assert(receipt?.lambda_receipt?.matter_migration?.canonical_synthetic_fixture_count === 0, "canonical synthetic fixture count must be 0");
assert(receipt?.lambda_receipt?.matter_migration?.readback_100_percent === true, "matter readback must be 100%");
assert(receipt?.lambda_receipt?.credential_injection?.production_user_credential_count === 9, "production credential count mismatch");
assert(receipt?.lambda_receipt?.credential_injection?.qa_disabled_credential_count === 2, "QA disabled credential count mismatch");
assert(receipt?.lambda_receipt?.credential_injection?.plaintext_password_recorded === false, "credential receipt must not record plaintext passwords");
assert(receipt?.lambda_receipt?.account_permission_injection?.registered_account_count === 11, "registered account count mismatch");
assert(receipt?.lambda_receipt?.bridge_control?.bridge_disabled_or_window_closed === true, "bridge must be disabled/window closed");
assert(receipt?.lambda_receipt?.bridge_control?.token_rotation_receipt_recorded_by_operator === true, "bridge token rotation receipt missing");
assert(receipt?.lambda_receipt?.password_issuance_distribution?.private_handoff_created_by_operator === true, "private handoff boundary missing");
assert(receipt?.first_login_validation?.production_user_count === 9, "first-login production user count mismatch");
assert(receipt?.first_login_validation?.production_login_pass_count === 9, "first-login production pass count mismatch");
assert(receipt?.first_login_validation?.must_change_count === 9, "must_change count mismatch");
assert(receipt?.first_login_validation?.qa_user_count === 2, "QA user count mismatch");
assert(receipt?.first_login_validation?.qa_rejected_count === 2, "QA rejected count mismatch");
assert(receipt?.first_login_validation?.synthetic_token_rejected === true, "synthetic token must be rejected");
assert(receipt?.first_login_validation?.plaintext_password_recorded === false, "first-login receipt must not record plaintext passwords");
assert(receipt?.first_login_validation?.token_material_recorded === false, "first-login receipt must not record token material");
assert(receipt?.private_handoff_repo_safe?.row_count === 9, "private handoff row count mismatch");
assert(receipt?.private_handoff_repo_safe?.plaintext_password_recorded_in_repo === false, "private handoff plaintext must not be in repo");
assert(receipt?.cut_g_validation?.pass === true, "CUT-G validation must pass");
assert(receipt?.blocking_conditions?.length === 0, "receipt blockers must be empty");
assert(receipt?.boundary?.production_write_executed === true, "production write must be recorded");
assert(receipt?.boundary?.production_restore_executed === false, "production restore must remain false");
assert(receipt?.boundary?.tenant_migration_executed === true, "tenant migration must be recorded");
assert(receipt?.boundary?.account_permission_injection_executed === true, "account injection must be recorded");
assert(receipt?.boundary?.bridge_token_rotation_executed === true, "bridge token rotation must be recorded");
assert(receipt?.boundary?.password_issuance_distribution_executed === true, "password issuance/distribution must be recorded");
assert(receipt?.boundary?.first_login_validation_executed === true, "first-login validation must be recorded");
assert(receipt?.boundary?.cut_g_validation_executed === true, "CUT-G validation must be recorded");
assert(receipt?.boundary?.cutover_executed === true, "cutover execution must be recorded");
assert(receipt?.boundary?.s5_enrichment_executed === false, "S5 must remain false");
assert(receipt?.boundary?.s6_final_seal_executed === false, "S6 must remain false");
assert(receipt?.boundary?.oidc_implementation_executed === false, "OIDC must remain false");
assert(receipt?.boundary?.db_conversion_executed === false, "DB conversion must remain false");
assert(receipt?.boundary?.production_ready_claim === false, "production_ready claim must remain false");
assert(receipt?.boundary?.go_live_claim === false, "go-live claim must remain false");
assert(receipt?.boundary?.plaintext_pii_recorded === false, "plaintext PII must remain false");
assert(receipt?.boundary?.credential_material_recorded === false, "credential material must remain false");
assert(receipt?.boundary?.token_material_recorded === false, "token material must remain false");

for (const file of ["packet.json", "command-evidence.json", "adjudication.md", "construction-inspection.json", "claude-review-result.json"]) {
  assert(existsSync(path.join(CLOSEOUT_DIR, file)), `missing closeout file: ${file}`);
}

const packet = readJson(path.join(CLOSEOUT_DIR, "packet.json"));
assert(packet?.goal_id === GOAL_ID, "packet goal_id mismatch");
assert(packet?.closeout_verdict === "PASS", "packet closeout verdict must be PASS");
assert(packet?.current_snapshot_hash === activeSnapshotHash, "packet snapshot hash mismatch");
assert(packet?.resume_from_partial_state === resumeFromPartialState, "packet resume boundary mismatch");
assert(packet?.resume_from_current_partial_state === resumeFromCurrentPartialState, "packet current partial resume boundary mismatch");
assert(packet?.resume_from_post_i21_partial_state === resumeFromPostI21PartialState, "packet post-I21 partial resume boundary mismatch");
assert(packet?.blocking_conditions?.length === 0, "packet blockers must be empty");
assert(packet?.migration?.canonical_client_count === 99, "packet canonical client count mismatch");
assert(packet?.migration?.canonical_matter_count === 148, "packet canonical matter count mismatch");
assert(packet?.first_login_validation?.production_login_pass_count === 9, "packet first-login pass mismatch");
assert(packet?.first_login_validation?.qa_rejected_count === 2, "packet QA rejected mismatch");
assert(packet?.authority_boundary?.production_ready_claim === false, "packet production_ready claim must remain false");
assert(packet?.authority_boundary?.go_live_claim === false, "packet go-live claim must remain false");

const commandEvidence = readJson(path.join(CLOSEOUT_DIR, "command-evidence.json"));
assert(commandEvidence?.decision === "PASS", "command evidence decision mismatch");
assert(commandEvidence?.private_handoff?.row_count === 9, "command evidence private handoff row count mismatch");
assert(commandEvidence?.private_handoff?.plaintext_password_recorded_in_repo === false, "command evidence must not record plaintext passwords");
assert(commandEvidence?.commands?.some((command) => command.command.includes("update-function-code") && command.exit_code === 0), "command evidence missing code deploy");
assert(commandEvidence?.commands?.some((command) => command.command.includes("bridge token rotation") && command.exit_code === 0), "command evidence missing bridge control");
assert(commandEvidence?.commands?.some((command) => command.command.includes("cti_cutover_execute_retry") && command.exit_code === 0), "command evidence missing cutover invoke");
assert(commandEvidence?.commands?.some((command) => command.command.includes("real login/session") && command.exit_code === 0), "command evidence missing login validation");

const construction = readJson(path.join(CLOSEOUT_DIR, "construction-inspection.json"));
assert(construction?.verdict === "PASS", "construction verdict mismatch");
assert(construction?.inspections?.every((inspection) => inspection.status === "PASS"), "all construction inspections must PASS");

const review = readJson(path.join(CLOSEOUT_DIR, "claude-review-result.json"));
assert(review?.verdict === "PASS", "review verdict mismatch");
assert(Array.isArray(review?.findings) && review.findings.length === 0, "review findings must be empty");

const crosswalk = readJson(CROSSWALK_JSON);
assert(crosswalk?.goal_id === GOAL_ID, "crosswalk goal_id mismatch");
assert(crosswalk?.work_package === WORK_PACKAGE, "crosswalk work package mismatch");
assert(crosswalk?.decision === "PASS", "crosswalk decision mismatch");
assert(crosswalk?.evidence?.snapshot_hash === activeSnapshotHash, "crosswalk snapshot hash mismatch");
assert(crosswalk?.evidence?.resume_from_partial_state === resumeFromPartialState, "crosswalk resume boundary mismatch");
assert(crosswalk?.evidence?.resume_from_current_partial_state === resumeFromCurrentPartialState, "crosswalk current partial resume boundary mismatch");
assert(crosswalk?.evidence?.resume_from_post_i21_partial_state === resumeFromPostI21PartialState, "crosswalk post-I21 partial resume boundary mismatch");
assert(crosswalk?.evidence?.canonical_client_count === 99, "crosswalk canonical client count mismatch");
assert(crosswalk?.evidence?.canonical_matter_count === 148, "crosswalk canonical matter count mismatch");
assert(crosswalk?.non_execution_boundary?.oidc_implementation_executed === false, "crosswalk OIDC boundary mismatch");
assert(crosswalk?.non_execution_boundary?.db_conversion_executed === false, "crosswalk DB boundary mismatch");
assert(crosswalk?.non_execution_boundary?.production_ready_claim === false, "crosswalk production_ready boundary mismatch");
assert(crosswalk?.non_execution_boundary?.go_live_claim === false, "crosswalk go-live boundary mismatch");

const ledger = readJson(path.join(ROOT, "workbook/launch-tuw/launch-tuw-ledger.json"));
assert(ledger?.work_packages?.some((wp) => wp.wp_id === WORK_PACKAGE && wp.goal_id === GOAL_ID), "launch-TUW ledger missing W18 work package");

if (errors.length > 0) {
  console.error("CTI CUTOVER execute retry validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  schema_version: "law-firm-os.cti-cutover-execute-validator.v0.2",
  goal_id: GOAL_ID,
  verdict: "PASS",
  decision: "CUTOVER_EXECUTE_RETRY_PASS",
  current_snapshot_hash: activeSnapshotHash,
  resume_from_partial_state: resumeFromPartialState,
  resume_from_current_partial_state: resumeFromCurrentPartialState,
  resume_from_post_i21_partial_state: resumeFromPostI21PartialState,
  canonical_client_count: receipt.lambda_receipt.matter_migration.canonical_client_count,
  canonical_matter_count: receipt.lambda_receipt.matter_migration.canonical_matter_count,
  production_login_pass_count: receipt.first_login_validation.production_login_pass_count,
  qa_rejected_count: receipt.first_login_validation.qa_rejected_count,
  boundary: receipt.boundary,
}, null, 2));
