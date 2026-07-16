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
  for (const needle of needles) assert(text.includes(needle), `${label} missing ${needle}`);
}

const closeoutDir = "docs/goal-closeout/cti-s1-foundation-execute";
const expectedFiles = [
  `${closeoutDir}/packet.json`,
  `${closeoutDir}/command-evidence.json`,
  `${closeoutDir}/adjudication.md`,
  `${closeoutDir}/construction-inspection.json`,
  `${closeoutDir}/claude-review-result.json`,
  "docs/launch/cti-s1-foundation-execute-blocker-register-2026-07-06.md",
  "docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.json",
  "docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.md",
];

for (const file of expectedFiles) assert(existsSync(file), `Expected S1 execute artifact is missing: ${file}`);

const packet = readJson(`${closeoutDir}/packet.json`);
const commandEvidence = readJson(`${closeoutDir}/command-evidence.json`);
const construction = readJson(`${closeoutDir}/construction-inspection.json`);
const claudeReview = readJson(`${closeoutDir}/claude-review-result.json`);
const crosswalk = readJson("docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.json");
const ledger = readJson("workbook/launch-tuw/launch-tuw-ledger.json");

const blockerText = readText("docs/launch/cti-s1-foundation-execute-blocker-register-2026-07-06.md");
const adjudicationText = readText(`${closeoutDir}/adjudication.md`);
const crosswalkText = readText("docs/launch/cti-s1-foundation-execute-crosswalk-2026-07-06.md");
const preText = readText("workbook/launch-tuw/10_PRE.md");
const storeManifest = readText("apps/api/src/store-path-manifest.js");
const sessionAuth = readText("apps/api/src/session-auth.js");
const lambdaBootstrap = readText("apps/api/src/lambda.js");
const backupRestore = readText("scripts/drill-matter-vault-backup-restore.mjs");
const catalog = readText("docs/runbooks/store-env-catalog.md");

const i5Ref = "I5-CTI-S1-FOUNDATION-UNBLOCK-PACKET-OWNER-APPROVAL-2026-07-06";
const i6Ref = "I6-CTI-S1-SECRETSMANAGER-VPCE-IAM-OWNER-APPROVAL-2026-07-06";
const verdict = "BLOCKED_S1_G_AUTHENTICATED_PROBE_REQUIRES_S2_OR_APPROVED_PROBE_PRINCIPAL";
const status = "blocked_s1_g_authenticated_probe_requires_s2_or_approved_probe_principal";

assert(packet?.goal_id === "cti-s1-foundation-execute", "packet goal_id mismatch");
assert(packet?.status === status, "packet status mismatch");
assert(packet?.closeout_verdict === verdict, "packet verdict mismatch");
assert(packet?.approval_signature_refs?.includes(i5Ref), "packet missing I5 approval ref");
assert(packet?.approval_signature_refs?.includes(i6Ref), "packet missing I6 approval ref");
assert(packet?.i5_approval_status === "approved", "packet I5 approval status mismatch");
assert(packet?.i6_approval_status === "approved", "packet I6 approval status mismatch");
assert(packet?.stop_condition?.triggered === true, "stop condition must be triggered");
assert(packet?.stop_condition?.trigger === "authenticated_production_marker_and_audit_probe_unavailable_before_s2", "stop condition trigger mismatch");
assert(packet?.stop_condition?.followup_s2_s3_allowed === false, "follow-up S2/S3 must be blocked by this closeout");
assert(packet?.stop_condition?.migration_or_restore_allowed === false, "migration/restore must be blocked");
assert(packet?.s0_inputs?.s0_t04_snapshot_sha256 === "c98b45752806109a644b82fbb958912821bfae5aaab58aaff36b138908b209ea", "S0-T04 snapshot hash mismatch");

for (const key of [
  "lawos_audit_store_path_manifested",
  "lawos_audit_store_path_preflight_passed",
  "durable_security_audit_restart_test_passed",
  "runtime_session_secret_secret_id_bootstrap_test_passed",
  "fixed_session_secret_cold_start_test_passed",
  "matter_reseed_guard_test_passed",
  "backup_restore_v0_2_isolated_rehearsal_test_passed",
]) {
  assert(packet?.local_foundation_evidence?.[key] === true, `local foundation evidence must be true: ${key}`);
}
assert(packet?.local_foundation_evidence?.store_path_manifest_core_store_paths === 13, "core STORE_PATH count mismatch");
assert(packet?.local_foundation_evidence?.store_path_manifest_total_entries_including_audit === 14, "manifest total count mismatch");
assert(packet?.local_foundation_evidence?.secret_value_fetched === false, "local evidence must not fetch secret values");

const aws = packet?.aws_resource_evidence ?? {};
assert(aws?.efs?.file_system_id === "fs-01e9f68b22b23e9f3", "EFS id mismatch");
assert(aws?.efs?.access_point_id === "fsap-0be58113c42e109fe", "EFS access point mismatch");
assert(aws?.efs?.mount_path === "/mnt/lawos", "EFS mount path mismatch");
assert(aws?.efs?.backup_policy === "ENABLED", "EFS backup policy must be enabled");
assert((aws?.efs?.mount_targets ?? []).length === 2, "expected two EFS mount targets");
assert(aws?.network?.secretsmanager_vpce_id === "vpce-0e91b4dc91f85e4a5", "Secrets Manager VPCE id mismatch");
assert(aws?.network?.secretsmanager_private_dns_enabled === true, "Secrets Manager private DNS must be enabled");
assert(aws?.network?.lambda_sg === "sg-0f555cc1f1708fc22", "Lambda SG mismatch");
assert(aws?.network?.efs_sg === "sg-027ca875653ea68ff", "EFS SG mismatch");
assert(aws?.network?.secretsmanager_vpce_sg === "sg-09686a354faa5f019", "VPCE SG mismatch");
assert(aws?.lambda_role_attached_policies?.includes("AWSLambdaVPCAccessExecutionRole"), "Lambda VPC access policy missing");
assert(aws?.lambda_role_inline_policies?.includes("matter-lawos-prod-cti-s1-efs-client"), "Lambda EFS inline policy missing");
assert(aws?.lambda_role_inline_policies?.includes("matter-lawos-prod-cti-s1-session-secret-read"), "Lambda session secret inline policy missing");
for (const key of [
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
  "LAWOS_ENTERPRISE_READINESS_STORE_PATH",
  "LAWOS_AUDIT_STORE_PATH",
  "LAWOS_API_SESSION_SECRET_SECRET_ID",
]) {
  assert(aws?.lambda_environment_keys_observed?.includes(key), `Lambda env key missing: ${key}`);
}

const runtimeProbe = packet?.production_runtime_probe ?? {};
assert(runtimeProbe.health_status === 200, "production health status mismatch");
assert(runtimeProbe.health_runtime_profile === "operational", "production runtime profile mismatch");
assert(runtimeProbe.health_synthetic_login_enabled === false, "synthetic login must be disabled");
assert(runtimeProbe.synthetic_login_probe_status === 403, "synthetic login probe status mismatch");
assert(runtimeProbe.synthetic_login_probe_safe_error_codes?.includes("AUTH_SYNTHETIC_LOGIN_DISABLED"), "synthetic login disabled code missing");
assert(runtimeProbe.audit_without_session_status === 401, "audit without session status mismatch");
assert(runtimeProbe.audit_without_session_safe_error_codes?.includes("AUTH_SESSION_REQUIRED"), "audit session required code missing");
assert(runtimeProbe.secret_values_recorded === false, "runtime probe must not record secret values");

const boundary = packet?.production_mutation_boundary ?? {};
for (const key of [
  "production_infrastructure_mutation_executed",
  "efs_created",
  "efs_access_point_created",
  "efs_mount_target_created",
  "security_groups_created",
  "secretsmanager_vpc_endpoint_created",
  "lambda_role_mutated",
  "lambda_code_deployed",
  "lambda_configuration_mutated",
  "store_path_env_applied",
  "lawos_audit_store_path_applied",
  "lawos_api_session_secret_secret_id_applied",
]) {
  assert(boundary[key] === true, `production boundary must be true: ${key}`);
}
for (const key of [
  "secret_value_fetched",
  "authenticated_production_marker_probe_executed",
  "production_store_migration_executed",
  "restore_execution_performed",
  "password_issuance_performed",
  "cutover_executed",
  "s2_authentication_implemented",
  "s3_tenant_migration_executed",
  "oidc_implemented",
  "db_conversion_executed",
  "production_ready_claim",
  "go_live_claim",
]) {
  assert(boundary[key] === false, `production boundary must be false: ${key}`);
}

assert(packet?.s1_g_status?.cold_start_marker_survives === "blocked_authenticated_marker_probe_requires_s2_or_approved_probe_principal", "S1-G marker status mismatch");
assert(packet?.s1_g_status?.audit_event_survives === "blocked_authenticated_audit_probe_requires_s2_or_approved_probe_principal", "S1-G audit status mismatch");
assert(packet?.s1_g_status?.fixed_session_secret?.startsWith("PASS_"), "S1-G fixed session secret should pass");
assert(packet?.s1_g_status?.restore_rehearsal_passed?.startsWith("PASS_LOCAL"), "S1-G restore rehearsal should pass locally");
assert(packet?.s0_to_s1_readback_comparison?.comparison_status === "blocked_authenticated_readback_requires_s2_or_approved_probe_principal", "S0/S1 readback comparison status mismatch");

const expectedHashes = packet?.artifact_sha256 ?? {};
for (const [label, path] of Object.entries({
  apps_api_src_lambda_js: "apps/api/src/lambda.js",
  apps_api_src_server_js: "apps/api/src/server.js",
  apps_api_src_session_auth_js: "apps/api/src/session-auth.js",
  apps_api_src_store_path_manifest_js: "apps/api/src/store-path-manifest.js",
  scripts_drill_matter_vault_backup_restore_mjs: "scripts/drill-matter-vault-backup-restore.mjs",
  docs_runbooks_store_env_catalog_md: "docs/runbooks/store-env-catalog.md",
  unblock_packet_md: "docs/launch/cti-s1-foundation-unblock-packet-2026-07-06.md",
  unblock_packet_closeout_json: "docs/goal-closeout/cti-s1-foundation-unblock-packet/packet.json",
})) {
  assert(sha256(path) === expectedHashes[label], `SHA256 mismatch for ${label}`);
}

includesAll(storeManifest, ["LAWOS_AUDIT_STORE_PATH", "securityAuditStorePath"], "store path manifest");
includesAll(sessionAuth, ["createSecurityAuditEventStore", "appendFileSync", "readEvents"], "session auth");
includesAll(lambdaBootstrap, ["LAWOS_API_SESSION_SECRET_SECRET_ID", "secretsmanager.GetSecretValue", "AWS4-HMAC-SHA256"], "lambda bootstrap");
includesAll(backupRestore, [
  "law-firm-os.matter-vault-runtime-backup.v0.2",
  "law-firm-os.matter-vault-runtime-restore.v0.2",
  "law-firm-os.matter-vault-runtime-backup-restore-drill.v0.2",
  "realClientDataUsed",
], "backup/restore v0.2");
includesAll(catalog, ["LAWOS_AUDIT_STORE_PATH", "LAWOS_API_SESSION_SECRET_SECRET_ID"], "store env catalog");

assert(construction?.final_verdict === verdict, "construction verdict mismatch");
assert(construction?.i6_approval_status === "approved", "construction I6 status mismatch");
assert(construction?.checks?.some((check) => check.id === "authenticated_marker_audit_live_probe" && check.result === "BLOCKED_REQUIRES_S2_OR_APPROVED_PROBE_PRINCIPAL"), "construction missing active S1-G block");
assert(construction?.authority_boundary?.production_infrastructure_mutation_executed === true, "construction must record production infrastructure mutation");
assert(construction?.authority_boundary?.production_store_migration_executed === false, "construction must not claim migration");
assert(construction?.authority_boundary?.restore_execution_performed === false, "construction must not claim restore");
assert(construction?.authority_boundary?.secret_value_fetched === false, "construction must not fetch secret");

assert(claudeReview?.status === "not_run", "Claude review status should be not_run");
assert(claudeReview?.valid_review_evidence === false, "Claude review must not be valid evidence");

assert(crosswalk?.launch_tuw_work_package === "LT-PRE-W11", "crosswalk launch TUW mismatch");
assert(crosswalk?.approval_signature_refs?.includes(i5Ref), "crosswalk missing I5 ref");
assert(crosswalk?.approval_signature_refs?.includes(i6Ref), "crosswalk missing I6 ref");
assert(crosswalk?.status === status, "crosswalk status mismatch");
assert(crosswalk?.authority_boundary?.production_infrastructure_mutation_executed === true, "crosswalk must record infra mutation");
assert(crosswalk?.authority_boundary?.production_store_migration_executed === false, "crosswalk must not claim migration");
assert(crosswalk?.authority_boundary?.restore_execution_performed === false, "crosswalk must not claim restore");
assert(crosswalk?.mappings?.some((entry) => entry.cti_item === "S1-G" && entry.status === "blocked_authenticated_probe_requires_s2_or_approved_probe_principal"), "S1-G blocked mapping missing");
includesAll(crosswalkText, ["LT-PRE-W11", "blocked_authenticated_probe_requires_s2_or_approved_probe_principal", "Non-Claims"], "crosswalk markdown");

includesAll(blockerText, ["S1E-B01", "RESOLVED_BY_I6", "S1E-B06", "ACTIVE", i6Ref], "blocker register");
includesAll(adjudicationText, [
  verdict,
  "aws secretsmanager get-secret-value",
  "production_ready or go-live claim",
  i5Ref,
  i6Ref,
], "adjudication");
includesAll(preText, [
  "LT-PRE-W11",
  "I6-applied/S1-G-auth-probe-blocked",
  "blocked_authenticated_probe_requires_s2_or_approved_probe_principal",
], "PRE markdown");

const commandText = JSON.stringify(commandEvidence ?? {});
includesAll(commandText, [
  "aws lambda update-function-code / update-function-configuration",
  "node scripts/validate-store-path-preflight.mjs",
  "node --test apps/api/test/session-auth-api.test.js apps/api/test/admin-security-durable-audit.test.js apps/api/test/lambda-session-secret.test.js",
  "node --test scripts/test/matter-vault-backup-restore.test.mjs packages/matter/test/runtime-services.test.js",
  "safe production health/auth-boundary probe",
  "aws secretsmanager get-secret-value",
  "authenticated production marker/audit write/readback probe",
], "command evidence");
assert((commandEvidence?.commands_run ?? []).every((entry) => entry.exit_code === 0), "all recorded commands_run must have exit_code 0");

const wp = ledger?.work_packages?.find((item) => item.wp_id === "LT-PRE-W11");
assert(wp?.goal_id === "cti-s1-foundation-execute", "LT-PRE-W11 work package missing or goal_id mismatch");
assert(wp?.terminal_tuw === "LT-PRE-W11-T05", "LT-PRE-W11 terminal TUW mismatch");
assert(wp?.title === "canonical tenant injection S1 FOUNDATION execute", "LT-PRE-W11 title mismatch");
const tuws = ledger?.tuws?.filter((item) => String(item.id).startsWith("LT-PRE-W11-")) ?? [];
assert(tuws.length === 5, `Expected 5 LT-PRE-W11 TUWs, got ${tuws.length}`);
assert(tuws.some((item) => item.id === "LT-PRE-W11-T05" && item.terminal === true), "LT-PRE-W11 terminal TUW missing");
assert(tuws.find((item) => item.id === "LT-PRE-W11-T01")?.verification_contract?.vc_bindings?.includes("VC-REG-001"), "LT-PRE-W11-T01 must include VC-REG-001");
assert(tuws.find((item) => item.id === "LT-PRE-W11-T02")?.work_type === "infra", "LT-PRE-W11-T02 work_type mismatch");
assert(tuws.find((item) => item.id === "LT-PRE-W11-T03")?.work_type === "runtime_write", "LT-PRE-W11-T03 work_type mismatch");

if (errors.length > 0) {
  console.error(`CTI S1 FOUNDATION execute closeout validation failed with ${errors.length} error(s):`);
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS",
      goal_id: "cti-s1-foundation-execute",
      closeout_verdict: verdict,
      production_infrastructure_mutation_executed: true,
      production_store_migration_executed: false,
      restore_executed: false,
      secret_value_fetched: false,
      active_blocker: "S1-G authenticated marker/audit/readback requires S2 or approved probe principal",
    },
    null,
    2,
  ),
);
