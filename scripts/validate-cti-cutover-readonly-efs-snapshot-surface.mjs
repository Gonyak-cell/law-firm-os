#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const GOAL_ID = "cti-cutover-readonly-efs-snapshot-surface";
const CLOSEOUT_DIR = path.join(ROOT, "docs/goal-closeout/cti-cutover-readonly-efs-snapshot-surface");
const I14_REF = "I14-CTI-CUTOVER-READONLY-EFS-SNAPSHOT-SURFACE-OWNER-APPROVAL-2026-07-06";
const SNAPSHOT_RECEIPT = path.join(ROOT, "docs/launch/cti-cutover-current-production-snapshot-receipt-2026-07-06.json");
const CROSSWALK_JSON = path.join(ROOT, "docs/launch/cti-cutover-readonly-efs-snapshot-surface-crosswalk-2026-07-06.json");
const PASS_VERDICT = "PASS_READONLY_EFS_SNAPSHOT_SURFACE";

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

for (const file of [
  "packet.json",
  "command-evidence.json",
  "adjudication.md",
  "construction-inspection.json",
  "claude-review-result.json",
]) {
  assert(existsSync(path.join(CLOSEOUT_DIR, file)), `missing closeout file ${file}`);
}

const source = read(path.join(ROOT, "apps/api/src/lambda.js"));
for (const phrase of [
  "CTI_READONLY_EFS_SNAPSHOT_ACTION",
  "CTI_READONLY_EFS_SNAPSHOT_APPROVAL_REF",
  "isHttpLambdaEvent",
  "runIsolatedRestoreRehearsal",
  "buildCtiReadOnlyEfsSnapshotReceipt",
]) {
  assert(source.includes(phrase), `lambda source missing ${phrase}`);
}
assert(source.includes("cti_snapshot_surface_direct_invoke_only"), "lambda source must reject HTTP-shaped snapshot events");
assert(source.includes("production_write_executed: false"), "lambda source must preserve production_write_executed=false");
assert(source.includes("production_restore_executed: false"), "lambda source must preserve production_restore_executed=false");

const testSource = read(path.join(ROOT, "apps/api/test/lambda-session-secret.test.js"));
assert(testSource.includes("I14 read-only EFS snapshot direct invoke returns only hash/count evidence"), "I14 direct invoke test missing");
assert(testSource.includes("I14 read-only EFS snapshot surface is not reachable as an HTTP event"), "I14 HTTP rejection test missing");
assert(testSource.includes("assert.doesNotMatch(responseText"), "I14 plaintext non-disclosure assertion missing");

const i14 = readJson(path.join(ROOT, "docs/launch/cti-i14-owner-approval-receipt-2026-07-06.json"));
assert(i14?.approval_signature_ref === I14_REF, "I14 approval ref mismatch");
assert(i14?.goal_id === GOAL_ID, "I14 goal binding mismatch");
assert(i14?.required_method?.lambda_direct_invoke_only === true, "I14 lambda direct invoke requirement missing");
assert(i14?.required_method?.public_http_endpoint_allowed === false, "I14 public HTTP prohibition missing");
assert(i14?.required_output_boundary?.plaintext_file_content_output_allowed === false, "I14 plaintext output prohibition missing");
assert(i14?.production_write_executed_by_this_receipt === false, "I14 receipt must not execute production write");
assert(i14?.production_restore_executed_by_this_receipt === false, "I14 receipt must not execute production restore");

const snapshot = readJson(SNAPSHOT_RECEIPT);
assert(snapshot?.goal_id === GOAL_ID, "snapshot receipt goal_id mismatch");
assert(snapshot?.approval_signature_ref === I14_REF, "snapshot receipt I14 ref mismatch");
assert(snapshot?.status === "PASS", "snapshot receipt must PASS");
assert(snapshot?.direct_invoke?.public_http_endpoint === false, "snapshot receipt must be direct invoke only");
assert(snapshot?.direct_invoke?.lambda_response_status_code === 200, "snapshot Lambda response must be 200");
assert(snapshot?.current_production_snapshot?.snapshot_hash?.length === 64, "snapshot hash missing");
assert(snapshot?.current_production_snapshot?.readable_store_file_count >= 13, "readable store file count too low");
assert(snapshot?.current_production_snapshot?.read_error_count === 0, "snapshot read errors must be 0");
assert(snapshot?.current_production_snapshot?.blocked_path_count === 0, "snapshot blocked paths must be 0");
assert(snapshot?.snapshot_bound_restore_rehearsal?.status === "PASS", "restore rehearsal must PASS");
assert(
  snapshot?.snapshot_bound_restore_rehearsal?.source_file_count ===
    snapshot?.snapshot_bound_restore_rehearsal?.restored_file_count,
  "restore source/restored counts must match",
);
assert(snapshot?.snapshot_bound_restore_rehearsal?.checksum_mismatch_count === 0, "restore checksum mismatches must be 0");
assert(snapshot?.snapshot_bound_restore_rehearsal?.production_write_executed === false, "restore rehearsal production write must be false");
assert(snapshot?.snapshot_bound_restore_rehearsal?.production_restore_executed === false, "restore rehearsal production restore must be false");
assert(snapshot?.boundary?.plaintext_file_content_returned === false, "snapshot must not return plaintext file content");
assert(snapshot?.boundary?.secret_value_returned === false, "snapshot must not return secret values");
assert(snapshot?.boundary?.token_or_password_returned === false, "snapshot must not return token or password material");
assert(snapshot?.boundary?.production_write_executed === false, "snapshot production write must be false");
assert(snapshot?.boundary?.production_restore_executed === false, "snapshot production restore must be false");
assert(snapshot?.boundary?.cutover_executed === false, "snapshot cutover must be false");

const preflightPacket = readJson(path.join(ROOT, "docs/goal-closeout/cti-cutover-preflight-go-no-go/packet.json"));
assert(preflightPacket?.evidence_status?.verified_production_snapshot === "PASS_CURRENT_VERIFIED_SNAPSHOT_RECORDED", "preflight must record current snapshot PASS");
assert(preflightPacket?.evidence_status?.restore_rehearsal === "PASS_CURRENT_SNAPSHOT_BOUND_ISOLATED_REHEARSAL", "preflight must record restore rehearsal PASS");
assert(!preflightPacket?.blocking_conditions?.includes("current verified production snapshot hash/count receipt missing"), "preflight must not retain missing snapshot blocker");
assert(!preflightPacket?.blocking_conditions?.includes("restore rehearsal not tied to current verified snapshot"), "preflight must not retain restore blocker");
assert(preflightPacket?.preflight_decision?.go === false, "preflight must remain no-go");

const packet = readJson(path.join(CLOSEOUT_DIR, "packet.json"));
assert(packet?.goal_id === GOAL_ID, "closeout packet goal_id mismatch");
assert(packet?.closeout_verdict === PASS_VERDICT, "closeout verdict mismatch");
assert(packet?.approval_signature_refs?.includes(I14_REF), "closeout missing I14 ref");
assert(packet?.snapshot_result?.status === "PASS", "closeout snapshot result must PASS");
assert(packet?.restore_rehearsal_result?.status === "PASS", "closeout restore result must PASS");
for (const [key, value] of Object.entries(packet?.authority_boundary ?? {})) {
  assert(value === false, `closeout authority boundary ${key} must be false`);
}

const commandEvidence = readJson(path.join(CLOSEOUT_DIR, "command-evidence.json"));
assert(commandEvidence?.goal_id === GOAL_ID, "command evidence goal_id mismatch");
assert(commandEvidence?.closeout_decision === PASS_VERDICT, "command evidence decision mismatch");
for (const requiredStatus of [
  "LOCAL_TEST_PASS",
  "LAMBDA_DEPLOY_PASS",
  "DIRECT_INVOKE_PASS",
  "HTTP_SHAPED_EVENT_REJECT_PASS",
  "SNAPSHOT_RESTORE_PASS",
  "VALIDATOR_PASS",
]) {
  assert(commandEvidence?.commands?.some((entry) => entry.status === requiredStatus), `command evidence missing ${requiredStatus}`);
}
for (const [key, value] of Object.entries(commandEvidence?.boundary ?? {})) {
  assert(value === false, `command evidence boundary ${key} must be false`);
}

const construction = readJson(path.join(CLOSEOUT_DIR, "construction-inspection.json"));
assert(construction?.verdict === PASS_VERDICT, "construction verdict mismatch");
assert(construction?.inspections?.some((entry) => entry.id === "I14-DIRECT-INVOKE-SURFACE" && entry.status === "PASS"), "construction missing direct-invoke PASS");
assert(construction?.inspections?.some((entry) => entry.id === "I14-SNAPSHOT-RESTORE" && entry.status === "PASS"), "construction missing snapshot/restore PASS");

const adjudication = read(path.join(CLOSEOUT_DIR, "adjudication.md"));
for (const phrase of [
  PASS_VERDICT,
  "13 readable store files",
  "No production write",
  "No CUTOVER",
]) {
  assert(adjudication.includes(phrase), `adjudication missing ${phrase}`);
}

const claudeReview = readJson(path.join(CLOSEOUT_DIR, "claude-review-result.json"));
assert(claudeReview?.status === "not_required_for_i14_readonly_snapshot_surface_closeout", "Claude review status mismatch");
assert(claudeReview?.production_ready_claim === false, "Claude review production_ready must be false");
assert(claudeReview?.go_live_claim === false, "Claude review go_live must be false");

const crosswalk = readJson(CROSSWALK_JSON);
assert(crosswalk?.goal_id === GOAL_ID, "crosswalk goal_id mismatch");
assert(crosswalk?.work_package === "LT-PRE-W17", "crosswalk work package mismatch");
assert(crosswalk?.decision === PASS_VERDICT, "crosswalk decision mismatch");
assert(crosswalk?.validator === "scripts/validate-cti-cutover-readonly-efs-snapshot-surface.mjs", "crosswalk validator mismatch");
assert(crosswalk?.non_execution_boundary?.cutover_executed === false, "crosswalk cutover boundary must be false");

const ledger = readJson(path.join(ROOT, "workbook/launch-tuw/launch-tuw-ledger.json"));
assert(ledger?.work_packages?.some((wp) => wp.wp_id === "LT-PRE-W17" && wp.goal_id === GOAL_ID), "launch-TUW missing LT-PRE-W17");
for (let index = 1; index <= 6; index += 1) {
  assert(ledger?.tuws?.some((tuw) => tuw.id === `LT-PRE-W17-T0${index}`), `launch-TUW missing LT-PRE-W17-T0${index}`);
}

if (errors.length > 0) {
  console.error("CTI CUTOVER read-only EFS snapshot surface validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify({
  schema_version: "law-firm-os.cti-cutover-readonly-efs-snapshot-surface-validator.v0.1",
  goal_id: GOAL_ID,
  verdict: "PASS",
  closeout_decision: PASS_VERDICT,
  snapshot_hash: snapshot.current_production_snapshot.snapshot_hash,
  readable_store_file_count: snapshot.current_production_snapshot.readable_store_file_count,
  restore_rehearsal_status: snapshot.snapshot_bound_restore_rehearsal.status,
  preflight_decision: preflightPacket.preflight_decision,
}, null, 2));
