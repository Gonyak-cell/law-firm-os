#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const errors = [];
const warn = [];

function err(message) {
  errors.push(message);
}

function readText(path) {
  if (!existsSync(path)) {
    err(`Missing file: ${path}`);
    return "";
  }
  return readFileSync(path, "utf8");
}

function readJson(path) {
  const text = readText(path);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    err(`Invalid JSON: ${path}: ${error.message}`);
    return null;
  }
}

function sha256(path) {
  return createHash("sha256").update(readText(path)).digest("hex");
}

function assert(condition, message) {
  if (!condition) err(message);
}

function includesAll(haystack, needles, label) {
  for (const needle of needles) {
    assert(haystack.includes(needle), `${label} missing ${needle}`);
  }
}

const approvalRef = "I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06";
const expectedSnapshotHash = "c98b45752806109a644b82fbb958912821bfae5aaab58aaff36b138908b209ea";
const expectedFiles = [
  "docs/goal-closeout/cti-s1-foundation/packet.json",
  "docs/goal-closeout/cti-s1-foundation/command-evidence.json",
  "docs/goal-closeout/cti-s1-foundation/adjudication.md",
  "docs/goal-closeout/cti-s1-foundation/construction-inspection.json",
  "docs/goal-closeout/cti-s1-foundation/claude-review-result.json",
  "docs/launch/cti-s1-foundation-aws-inventory-2026-07-06.json",
  "docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md",
  "docs/launch/cti-s1-tuw-crosswalk-2026-07-06.json",
  "docs/launch/cti-s1-tuw-crosswalk-2026-07-06.md"
];

for (const file of expectedFiles) {
  assert(existsSync(file), `Expected S1 closeout artifact is missing: ${file}`);
}

const packet = readJson("docs/goal-closeout/cti-s1-foundation/packet.json");
const commandEvidence = readJson("docs/goal-closeout/cti-s1-foundation/command-evidence.json");
const construction = readJson("docs/goal-closeout/cti-s1-foundation/construction-inspection.json");
const claudeReview = readJson("docs/goal-closeout/cti-s1-foundation/claude-review-result.json");
const awsInventory = readJson("docs/launch/cti-s1-foundation-aws-inventory-2026-07-06.json");
const crosswalk = readJson("docs/launch/cti-s1-tuw-crosswalk-2026-07-06.json");

const g0Packet = readJson("docs/goal-closeout/cti-g0-s0/packet.json");
const s0t01 = readJson("docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json");
const s0t03 = readJson("docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json");
const s0t04 = readJson("docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json");

assert(g0Packet?.approval_signature_ref === approvalRef, "G0/S0 packet does not carry the expected I4 approval ref");
assert(g0Packet?.closeout_verdict === "COMPLETE_G0_S0_ONLY", "G0/S0 closeout verdict is not COMPLETE_G0_S0_ONLY");
assert(s0t01?.lambda_configuration?.efs_file_system_config_count === 0, "S0-T01 EFS config count is not 0");
assert(Array.isArray(s0t01?.lambda_configuration?.store_path_env_keys_present), "S0-T01 store_path_env_keys_present missing");
assert(s0t01?.lambda_configuration?.store_path_env_keys_present?.length === 0, "S0-T01 STORE_PATH env key count is not 0");
assert(s0t03?.cold_start_probe?.persistence_verdict === "marker_lost_after_cold_start", "S0-T03 did not record marker_lost_after_cold_start");
assert(s0t04?.readback_snapshot?.sha256 === expectedSnapshotHash, "S0-T04 snapshot hash mismatch");

assert(packet?.status === "blocked_s1_stop_condition", "S1 packet status is not blocked_s1_stop_condition");
assert(packet?.approval_signature_ref === approvalRef, "S1 packet approval ref mismatch");
assert(packet?.closeout_verdict === "BLOCKED_S1_STOP_CONDITION", "S1 packet closeout verdict mismatch");
assert(packet?.stop_condition?.triggered === true, "S1 packet stop condition is not triggered");
assert(packet?.stop_condition?.durable_store_target_present === false, "S1 packet unexpectedly reports durable store target present");
assert(packet?.stop_condition?.durable_audit_path_present === false, "S1 packet unexpectedly reports durable audit path present");
assert(packet?.stop_condition?.rollback_restore_path_present === false, "S1 packet unexpectedly reports rollback/restore path present");
assert(packet?.s0_inputs?.s0_t04_non_git_snapshot_sha256 === expectedSnapshotHash, "S1 packet S0-T04 snapshot hash mismatch");
assert(packet?.s0_inputs?.cold_start_persistence_verdict === "marker_lost_after_cold_start", "S1 packet S0-T03 input mismatch");
assert(packet?.s1_items?.length === 6, "S1 packet must classify S1-T01a through S1-T05");
assert(packet?.non_claims?.includes("s1_foundation_complete"), "S1 packet must explicitly non-claim S1 completion");

assert(awsInventory?.s1_readiness_verdict?.production_credential_access_present === true, "AWS inventory should confirm production credential access");
assert(awsInventory?.lambda_configuration?.file_system_config_count === 0, "AWS inventory Lambda file system config count is not 0");
assert(awsInventory?.lambda_configuration?.vpc_config_present === false, "AWS inventory Lambda VPC config should be absent");
assert(awsInventory?.lambda_configuration?.store_path_env_key_count === 0, "AWS inventory STORE_PATH env key count is not 0");
assert(awsInventory?.lambda_configuration?.lawos_api_session_secret_env_present === false, "AWS inventory unexpectedly shows LAWOS_API_SESSION_SECRET env present");
assert(awsInventory?.efs_inventory?.file_system_count === 0, "AWS inventory EFS file system count is not 0");
assert(awsInventory?.efs_inventory?.access_point_count === 0, "AWS inventory EFS access point count is not 0");
assert(awsInventory?.secret_inventory?.session_signing_secret_exists === true, "AWS inventory should report session signing secret exists");
assert(awsInventory?.secret_inventory?.secret_value_fetched === false, "AWS inventory must not fetch secret values");
assert(awsInventory?.s1_readiness_verdict?.verdict === "BLOCKED_MISSING_S1_DURABLE_TARGETS", "AWS inventory verdict mismatch");

assert(construction?.final_verdict === "BLOCKED_S1_STOP_CONDITION", "Construction inspection final verdict mismatch");
assert(construction?.s1_g_status?.cold_start_marker_survives === false, "Construction inspection should not claim marker survival");
assert(construction?.s1_g_status?.audit_event_survives === false, "Construction inspection should not claim audit survival");
assert(construction?.s1_g_status?.fixed_session_secret === false, "Construction inspection should not claim fixed session secret");
assert(construction?.s1_g_status?.restore_rehearsal_passed === false, "Construction inspection should not claim restore rehearsal pass");

assert(claudeReview?.status === "not_run", "Claude review should be marked not_run for blocked closeout");
assert(claudeReview?.valid_review_evidence === false, "Claude review must not be claimed as valid evidence");

assert(crosswalk?.launch_tuw_work_package === "LT-PRE-W09", "S1 crosswalk launch TUW work package mismatch");
assert(crosswalk?.authority_boundary?.infrastructure_write_performed === false, "S1 crosswalk must not claim infra write");
assert(crosswalk?.authority_boundary?.migration_executed === false, "S1 crosswalk must not claim migration");
assert(crosswalk?.authority_boundary?.production_ready_claim === false, "S1 crosswalk must not claim production_ready");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S1-G" && entry.status === "blocked_s1_stop_condition"), "S1-G blocked mapping missing");

const blockerText = readText("docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md");
includesAll(
  blockerText,
  [
    "S1-B01",
    "S1-B02",
    "S1-B03",
    "S1-B04",
    "S1-B05",
    "aws efs create-file-system",
    "production store migration or restore rehearsal"
  ],
  "S1 blocker register"
);

const storeManifest = readText("apps/api/src/store-path-manifest.js");
const sessionAuth = readText("apps/api/src/session-auth.js");
const backupDrill = readText("scripts/drill-matter-vault-backup-restore.mjs");
assert(!storeManifest.includes("LAWOS_AUDIT_STORE_PATH"), "Validator expected LAWOS_AUDIT_STORE_PATH to remain absent for blocked closeout");
assert(sessionAuth.includes("const securityAuditEvents = [];"), "Validator expected in-memory securityAuditEvents evidence");
assert(backupDrill.includes("Matter-Vault runtime restore refuses non-synthetic backup claims"), "Validator expected synthetic-only restore refusal");
assert(backupDrill.includes("real_client_data_used: false"), "Validator expected current drill real_client_data_used=false evidence");

const commandText = JSON.stringify(commandEvidence ?? {});
includesAll(
  commandText,
  [
    "aws efs create-file-system",
    "aws lambda update-function-configuration",
    "aws secretsmanager get-secret-value",
    "S2 implementation",
    "CUTOVER",
    "production_ready or go-live claim"
  ],
  "S1 command evidence"
);

const ledger = readJson("workbook/launch-tuw/launch-tuw-ledger.json");
assert(ledger?.work_packages?.some((wp) => wp.wp_id === "LT-PRE-W09" && wp.goal_id === "cti-s1-foundation" && wp.terminal_tuw === "LT-PRE-W09-T05"), "LT-PRE-W09 work package missing or malformed");
const s1Tuws = ledger?.tuws?.filter((tuw) => String(tuw.id).startsWith("LT-PRE-W09-")) ?? [];
assert(s1Tuws.length === 5, `Expected 5 LT-PRE-W09 TUWs, got ${s1Tuws.length}`);
assert(s1Tuws.some((tuw) => tuw.id === "LT-PRE-W09-T05" && tuw.terminal === true), "LT-PRE-W09 terminal TUW missing");

const anchorChecks = {
  contract: ["contracts/production-data-policy-contract.json", packet?.contract_sha256],
  plan: ["workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md", packet?.source_plan_sha256],
  g0_packet: ["docs/goal-closeout/cti-g0-s0/packet.json", packet?.s0_inputs?.g0_s0_packet_sha256],
  s0_t01: ["docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json", packet?.s0_inputs?.s0_t01_lambda_config_sha256],
  s0_t03: ["docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json", packet?.s0_inputs?.s0_t03_coldstart_probe_sha256],
  s0_t04: ["docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json", packet?.s0_inputs?.s0_t04_store_readback_receipt_sha256]
};
for (const [label, [path, expected]] of Object.entries(anchorChecks)) {
  const actual = sha256(path);
  if (actual !== expected) {
    err(`SHA256 mismatch for ${label}: expected ${expected}, got ${actual}`);
  }
}

if (warn.length > 0) {
  console.log(`Warnings ${warn.length}:`);
  for (const item of warn) console.log(`  ! ${item}`);
}

if (errors.length > 0) {
  console.error(`CTI S1 FOUNDATION closeout validation failed with ${errors.length} error(s):`);
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      goal_id: "cti-s1-foundation",
      closeout_verdict: "BLOCKED_S1_STOP_CONDITION",
      blockers: 5,
      s1_tuws: s1Tuws.length,
      infrastructure_write_performed: false,
      migration_executed: false,
      production_ready_claim: false
    },
    null,
    2
  )
);
