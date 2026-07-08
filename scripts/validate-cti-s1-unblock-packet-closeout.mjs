#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const errors = [];

function err(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) err(message);
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

function includesAll(text, needles, label) {
  for (const needle of needles) {
    assert(text.includes(needle), `${label} missing ${needle}`);
  }
}

const requiredApprovalRef = "I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06";
const closeoutDir = "docs/goal-closeout/cti-s1-foundation-unblock-packet";
const packetPath = "docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md";
const crosswalkJsonPath = "docs/launch/cti-s1-foundation-unblock-crosswalk-2026-07-06.json";

const requiredFiles = [
  packetPath,
  crosswalkJsonPath,
  "docs/launch/cti-s1-foundation-unblock-crosswalk-2026-07-06.md",
  `${closeoutDir}/packet.json`,
  `${closeoutDir}/command-evidence.json`,
  `${closeoutDir}/adjudication.md`,
  `${closeoutDir}/construction-inspection.json`,
  `${closeoutDir}/claude-review-result.json`
];

for (const file of requiredFiles) {
  assert(existsSync(file), `Expected unblock artifact is missing: ${file}`);
}

const packetText = readText(packetPath);
const closeoutPacket = readJson(`${closeoutDir}/packet.json`);
const commandEvidence = readJson(`${closeoutDir}/command-evidence.json`);
const construction = readJson(`${closeoutDir}/construction-inspection.json`);
const claudeReview = readJson(`${closeoutDir}/claude-review-result.json`);
const crosswalk = readJson(crosswalkJsonPath);
const ledger = readJson("workbook/launch-tuw/launch-tuw-ledger.json");

includesAll(
  packetText,
  [
    requiredApprovalRef,
    "matter-lawos-prod-cti-s1-efs",
    "vpc-038f70d924a774bea",
    "subnet-0a718a221e621715f",
    "subnet-0af415c198603de77",
    "matter-lawos-prod-lambda-sg",
    "matter-lawos-prod-efs-sg",
    "matter-lawos-prod-runtime-ap",
    "/lawos-runtime",
    "/mnt/lawos",
    "LAWOS_AUDIT_STORE_PATH",
    "/mnt/lawos/audit/security-audit-events.ndjson",
    "LAWOS_API_SESSION_SECRET_SECRET_ID",
    "/amic-vault/prod/api/session-signing",
    "law-firm-os.matter-vault-runtime-backup.v0.2",
    "law-firm-os.matter-vault-runtime-restore.v0.2",
    "law-firm-os.matter-vault-runtime-backup-restore-drill.v0.2",
    "/mnt/lawos/restore-rehearsals/<timestamp>",
    "real_client_data_used",
    "I5 승인합니다"
  ],
  "unblock packet"
);

const storeEnvMappings = [
  "LAWOS_HRX_STORE_PATH",
  "LAWOS_MASTER_DATA_STORE_PATH",
  "LAWOS_MATTER_STORE_PATH",
  "LAWOS_DMS_STORE_PATH",
  "LAWOS_CRM_STORE_PATH",
  "LAWOS_INTAKE_STORE_PATH",
  "LAWOS_CRM_MASTER_DATA_STORE_PATH",
  "LAWOS_FINANCE_STORE_PATH",
  "LAWOS_ANALYTICS_STORE_PATH",
  "LAWOS_AI_STORE_PATH",
  "LAWOS_PORTAL_STORE_PATH",
  "LAWOS_UI_READINESS_STORE_PATH",
  "LAWOS_ENTERPRISE_READINESS_STORE_PATH"
];
for (const env of storeEnvMappings) {
  assert(packetText.includes(`\`${env}\``), `STORE_PATH mapping missing ${env}`);
}

assert(closeoutPacket?.status === "owner_approved_for_s1_execute", "closeout packet status mismatch");
assert(closeoutPacket?.required_approval_ref === requiredApprovalRef, "required approval ref mismatch");
assert(closeoutPacket?.approval_status === "approved", "approval status mismatch");
assert(closeoutPacket?.approval_signature_ref === requiredApprovalRef, "approval signature ref mismatch");
assert(closeoutPacket?.selected_choices?.durable_store_target?.target_type === "aws_efs_access_point_for_lambda", "durable target choice mismatch");
assert(closeoutPacket?.selected_choices?.durable_store_target?.lambda_mount_path === "/mnt/lawos", "lambda mount path mismatch");
assert(closeoutPacket?.selected_choices?.audit_store?.env === "LAWOS_AUDIT_STORE_PATH", "audit env mismatch");
assert(closeoutPacket?.selected_choices?.session_secret?.injection_method === "runtime_secrets_manager_fetch", "session secret method mismatch");
assert(closeoutPacket?.selected_choices?.session_secret?.secret_value_fetched === false, "packet must not fetch secret values");
assert(closeoutPacket?.selected_choices?.backup_restore_v0_2?.real_client_data_used === true, "backup v0.2 must be honest about real_client_data_used");
assert(closeoutPacket?.store_path_mapping_count === 13, "store path mapping count must be 13");
assert(closeoutPacket?.authority_boundary?.efs_creation_executed === false, "EFS creation must not be executed");
assert(closeoutPacket?.authority_boundary?.lambda_configuration_mutation_executed === false, "Lambda config mutation must not be executed");
assert(closeoutPacket?.authority_boundary?.secret_value_fetched === false, "Secret value must not be fetched");
assert(closeoutPacket?.authority_boundary?.production_store_migration_executed === false, "Production migration must not be executed");
assert(closeoutPacket?.authority_boundary?.restore_execution_performed === false, "Restore execution must not be performed");
assert(closeoutPacket?.authority_boundary?.s1_execute_authorized === true, "S1 execute should be authorized by I5");
assert(closeoutPacket?.s1_execute_boundary === "AUTHORIZED_BY_I5_WITH_STOP_CONDITIONS", "S1 execute boundary mismatch");

assert(crosswalk?.launch_tuw_work_package === "LT-PRE-W10", "crosswalk launch TUW package mismatch");
assert(crosswalk?.required_approval_ref === requiredApprovalRef, "crosswalk approval ref mismatch");
assert(crosswalk?.approval_status === "approved", "crosswalk approval status mismatch");
assert(crosswalk?.approval_signature_ref === requiredApprovalRef, "crosswalk approval signature ref mismatch");
assert(crosswalk?.authority_boundary?.s1_execute_authorized === true, "crosswalk must authorize S1 execute after I5");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S1 execute boundary" && entry.status === "authorized_by_i5_with_stop_conditions"), "S1 execute boundary mapping missing");

assert(construction?.final_verdict === "OWNER_APPROVED_FOR_S1_EXECUTE", "construction final verdict mismatch");
assert(construction?.s1_execute_boundary === "AUTHORIZED_BY_I5_WITH_STOP_CONDITIONS", "construction S1 execute boundary mismatch");
assert(construction?.checks?.some((check) => check.id === "s1_execute_boundary" && check.result === "AUTHORIZED_WITH_STOP_CONDITIONS"), "construction must authorize S1 execute with stop conditions");

assert(claudeReview?.status === "not_run", "Claude review status should be not_run");
assert(claudeReview?.valid_review_evidence === false, "Claude review should not be claimed as valid evidence");

const commandText = JSON.stringify(commandEvidence ?? {});
includesAll(
  commandText,
  [
    "aws efs create-file-system",
    "aws lambda update-function-configuration",
    "aws secretsmanager get-secret-value",
    "production store migration",
    "restore rehearsal",
    "production_ready or go-live claim"
  ],
  "command evidence"
);

const anchorChecks = {
  source_plan_sha256: ["workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md", closeoutPacket?.source_plan_sha256],
  upstream_s1_blocker_register_sha256: ["docs/launch/cti-s1-foundation-blocker-register-2026-07-06.md", closeoutPacket?.upstream_s1_blocker_register_sha256],
  upstream_s1_aws_inventory_sha256: ["docs/launch/cti-s1-foundation-aws-inventory-2026-07-06.json", closeoutPacket?.upstream_s1_aws_inventory_sha256],
  upstream_s1_blocked_packet_sha256: ["docs/goal-closeout/cti-s1-foundation/packet.json", closeoutPacket?.upstream_s1_blocked_packet_sha256],
  store_path_manifest_sha256: ["apps/api/src/store-path-manifest.js", closeoutPacket?.store_path_manifest_sha256],
  backup_restore_drill_sha256: ["scripts/drill-matter-vault-backup-restore.mjs", closeoutPacket?.backup_restore_drill_sha256]
};
for (const [label, [path, expected]] of Object.entries(anchorChecks)) {
  assert(sha256(path) === expected, `SHA256 mismatch for ${label}`);
}

const wp = ledger?.work_packages?.find((item) => item.wp_id === "LT-PRE-W10");
assert(wp?.goal_id === "cti-s1-foundation-unblock-packet", "LT-PRE-W10 work package missing or goal_id mismatch");
assert(wp?.terminal_tuw === "LT-PRE-W10-T05", "LT-PRE-W10 terminal TUW mismatch");
const tuws = ledger?.tuws?.filter((item) => String(item.id).startsWith("LT-PRE-W10-")) ?? [];
assert(tuws.length === 5, `Expected 5 LT-PRE-W10 TUWs, got ${tuws.length}`);
assert(tuws.some((item) => item.id === "LT-PRE-W10-T05" && item.terminal === true), "LT-PRE-W10 terminal TUW missing");

if (errors.length > 0) {
  console.error(`CTI S1 unblock packet validation failed with ${errors.length} error(s):`);
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      goal_id: "cti-s1-foundation-unblock-packet",
      closeout_verdict: "OWNER_APPROVED_FOR_S1_EXECUTE",
      required_approval_ref: requiredApprovalRef,
      store_path_mappings: storeEnvMappings.length,
      s1_execute_authorized: true,
      production_write_executed: false
    },
    null,
    2
  )
);
