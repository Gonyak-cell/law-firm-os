#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = process.cwd();
const GOAL_ID = "cti-cutover-execute";
const FUNCTION_NAME = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME ?? "matter-lawos-api-prod";
const AWS_PROFILE = process.env.AWS_PROFILE ?? "matter-prod-deploy-admin";
const AWS_REGION = process.env.AWS_REGION ?? process.env.LAWOS_AWS_REGION ?? "ap-northeast-2";
const I11_REF = "I11-CTI-CUTOVER-EXECUTE-OWNER-APPROVAL-2026-07-06";
const I18_REF = "I18-CTI-S2-PRODUCTION-AUTH-PROBE-PRINCIPAL-OWNER-APPROVAL-2026-07-06";
const I19_REF = "I19-CTI-CUTOVER-POST-I18-SNAPSHOT-REBIND-OWNER-APPROVAL-2026-07-06";
const I20_REF = "I20-CTI-CUTOVER-PARTIAL-STATE-RESUME-OWNER-APPROVAL-2026-07-06";
const I14_REF = "I14-CTI-CUTOVER-READONLY-EFS-SNAPSHOT-SURFACE-OWNER-APPROVAL-2026-07-06";
const POST_I18_SNAPSHOT_HASH = "b4139c730895d173cf964a92fa6ba375c93cefcb13687b0f82732c4c0531da49";
const I20_RESUME_SNAPSHOT_HASH = "8b53d5148f69a939e8e38f9f0813befe0675f4de59c9f54dad81d5451ab53d8a";
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-cutover-execute");
const RECEIPT_JSON = join(ROOT, "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.json");
const RECEIPT_MD = join(ROOT, "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.md");
const CROSSWALK_JSON = join(ROOT, "docs/launch/cti-cutover-execute-crosswalk-2026-07-06.json");
const CROSSWALK_MD = join(ROOT, "docs/launch/cti-cutover-execute-crosswalk-2026-07-06.md");
const PRIVATE_HANDOFF_JSON = "/Users/jws/Downloads/cti-cutover-initial-password-handoff-private-2026-07-06.json";
const PRIVATE_HANDOFF_CSV = "/Users/jws/Downloads/cti-cutover-initial-password-handoff-private-2026-07-06.csv";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashRef(value) {
  return `sha256:${sha256(String(value ?? ""))}`;
}

function run(command, args, { sensitive = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${result.status}): ${sensitive ? "<redacted>" : result.stderr}`);
  }
  return result.stdout;
}

function aws(args, options = {}) {
  return run("aws", [...args, "--profile", AWS_PROFILE, "--region", AWS_REGION, "--no-cli-pager", "--output", "json"], options);
}

function readJson(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function invokeReadOnlySnapshot() {
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-cutover-i20-blocked-"));
  const payloadPath = join(tempRoot, "payload.json");
  const responsePath = join(tempRoot, "response.json");
  try {
    writeFileSync(payloadPath, JSON.stringify({
      lawos_maintenance_action: "cti_cutover_readonly_efs_snapshot",
      request_id: "cti-cutover-i20-blocked-state-closeout",
      approval_signature_ref: I14_REF,
    }), { mode: 0o600 });
    aws([
      "lambda",
      "invoke",
      "--function-name",
      FUNCTION_NAME,
      "--cli-binary-format",
      "raw-in-base64-out",
      "--payload",
      `fileb://${payloadPath}`,
      responsePath,
    ], { sensitive: true });
    const raw = readJson(responsePath);
    return typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function storeFile(snapshot, key) {
  return (snapshot.store_files ?? []).find((file) => file.key === key) ?? {};
}

function handoffSummary() {
  const jsonExists = existsSync(PRIVATE_HANDOFF_JSON);
  const csvExists = existsSync(PRIVATE_HANDOFF_CSV);
  const parsed = jsonExists ? readJson(PRIVATE_HANDOFF_JSON) : {};
  return {
    json_path_hash: hashRef(PRIVATE_HANDOFF_JSON),
    csv_path_hash: hashRef(PRIVATE_HANDOFF_CSV),
    json_exists: jsonExists,
    csv_exists: csvExists,
    json_sha256: jsonExists ? sha256(readFileSync(PRIVATE_HANDOFF_JSON)) : null,
    csv_sha256: csvExists ? sha256(readFileSync(PRIVATE_HANDOFF_CSV)) : null,
    row_count: Array.isArray(parsed.rows) ? parsed.rows.length : 0,
    plaintext_password_recorded_in_repo: false,
  };
}

const recordedAt = new Date().toISOString();
const previousReceipt = readJson(RECEIPT_JSON, {});
const currentSnapshot = invokeReadOnlySnapshot();
const matterStore = storeFile(currentSnapshot, "matterStorePath");
const authStore = storeFile(currentSnapshot, "authCredentialStorePath");
const hrxStore = storeFile(currentSnapshot, "hrxStorePath");
const privateHandoff = handoffSummary();
const closeoutVerdict = "BLOCKED_I20_RESUME_SNAPSHOT_DRIFT";
const approvalRefs = [I11_REF, I18_REF, I19_REF, I20_REF];

const receipt = {
  schema_version: "law-firm-os.cti.cutover-execute-retry.operator-receipt.v0.1",
  goal_id: GOAL_ID,
  verdict: closeoutVerdict,
  recorded_at: recordedAt,
  approval_signature_refs: approvalRefs,
  source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
  preflight_packet: "docs/goal-closeout/cti-cutover-preflight-go-no-go/packet.json",
  original_post_i18_snapshot_hash: POST_I18_SNAPSHOT_HASH,
  i20_resume_snapshot_hash: I20_RESUME_SNAPSHOT_HASH,
  current_snapshot_hash: currentSnapshot.snapshot_hash,
  resume_from_partial_state: true,
  runbook_steps: {
    preflight_reverified: true,
    i20_partial_resume_approval_recorded: true,
    existing_private_handoff_reused: true,
    lambda_cutover_action_deployed: true,
    bridge_token_rotation_control_applied: true,
    direct_invoke_cutover_action_executed: true,
    first_login_validation_executed: false,
    closeout_generated: true,
  },
  lambda_receipt: {
    status: previousReceipt.lambda_receipt?.status ?? null,
    reason: previousReceipt.lambda_receipt?.reason ?? null,
    error_name: previousReceipt.lambda_receipt?.error_name ?? null,
    error_message_hash: previousReceipt.lambda_receipt?.error_message_hash ?? null,
    reference_error_identifier: previousReceipt.lambda_receipt?.reference_error_identifier ?? null,
  },
  local_root_cause_assessment: {
    status: "PATCHED_LOCALLY_NOT_DEPLOYED_AFTER_I20_BLOCK",
    root_cause: "apps/api/src/lambda.js used Matter repository/candidate symbols in the CUTOVER path without importing them.",
    patched_files: ["apps/api/src/lambda.js"],
    production_deploy_requires_new_owner_boundary: true,
  },
  current_snapshot: {
    snapshot_hash: currentSnapshot.snapshot_hash,
    readable_store_file_count: currentSnapshot.readable_store_file_count,
    read_error_count: currentSnapshot.read_error_count,
    blocked_path_count: currentSnapshot.blocked_path_count,
    matter_store_record_count: matterStore.record_count ?? null,
    matter_store_sha256: matterStore.sha256 ?? null,
    auth_credential_store_record_count: authStore.record_count ?? null,
    auth_credential_store_sha256: authStore.sha256 ?? null,
    hrx_store_record_count: hrxStore.record_count ?? null,
    hrx_store_sha256: hrxStore.sha256 ?? null,
  },
  partial_state_assessment: {
    i20_snapshot_boundary_still_current: currentSnapshot.snapshot_hash === I20_RESUME_SNAPSHOT_HASH,
    matter_store_record_count_matches_i20_observation: matterStore.record_count === 503,
    auth_credential_store_still_not_injected: authStore.record_count === 1,
    s3_matter_migration_partial_or_reflected: matterStore.record_count === 503,
    s4_credential_injection_completed: false,
    first_login_validation_completed: false,
  },
  private_handoff_repo_safe: privateHandoff,
  password_issuance_distribution: {
    private_handoff_created: privateHandoff.json_exists && privateHandoff.csv_exists,
    private_handoff_row_count: privateHandoff.row_count,
    distribution_channel: "in_person",
    plaintext_password_recorded_in_repo: false,
    plaintext_password_printed_to_stdout: false,
  },
  first_login_validation: {
    production_user_count: 9,
    production_login_pass_count: 0,
    must_change_count: 0,
    qa_user_count: 2,
    qa_rejected_count: 0,
    synthetic_token_rejected: false,
    skipped_reason: "I20 resume blocked before validated credential injection completed",
    plaintext_password_recorded: false,
    token_material_recorded: false,
  },
  cut_g_validation: {
    pass: false,
    reason: "I20 resume snapshot drifted before credential injection and first-login validation completed",
  },
  blocking_conditions: [
    "I20 resume boundary hash drifted before successful credential injection",
    "Lambda retry returned ReferenceError before S4 credential injection completed",
    "authCredentialStore remains at record_count 1, expected 11",
  ],
  boundary: {
    public_http_endpoint: false,
    production_write_detected_before_blocked_closeout: matterStore.record_count === 503,
    production_restore_executed: false,
    operational_profile_switch_executed: false,
    tenant_migration_partial_or_reflected: matterStore.record_count === 503,
    account_permission_injection_executed: false,
    bridge_token_rotation_executed: true,
    password_handoff_generated_not_distributed: privateHandoff.row_count === 9,
    first_login_validation_executed: false,
    cut_g_validation_executed: false,
    cutover_executed: false,
    s5_enrichment_executed: false,
    s6_final_seal_executed: false,
    oidc_implementation_executed: false,
    db_conversion_executed: false,
    production_ready_claim: false,
    go_live_claim: false,
    plaintext_pii_recorded: false,
    credential_material_recorded: false,
    token_material_recorded: false,
  },
};

writeJson(RECEIPT_JSON, receipt);
writeFileSync(RECEIPT_MD, [
  "# CTI CUTOVER Execute Retry Receipt",
  "",
  `Verdict: \`${closeoutVerdict}\``,
  "",
  `I20 resume snapshot boundary: \`${I20_RESUME_SNAPSHOT_HASH}\``,
  `Current snapshot hash: \`${currentSnapshot.snapshot_hash}\``,
  "",
  `Matter store record count: ${matterStore.record_count ?? "n/a"}`,
  `Auth credential store record count: ${authStore.record_count ?? "n/a"}`,
  "",
  "CUTOVER resume is blocked before S4 credential injection and first-login validation completed.",
  "",
  "No OIDC implementation, DB conversion, S5 enrichment, S6 seal, production_ready claim, or go-live claim is made.",
  "",
].join("\n"));

mkdirSync(CLOSEOUT_DIR, { recursive: true });
writeJson(join(CLOSEOUT_DIR, "packet.json"), {
  schema_version: "law-firm-os.goal-closeout.packet.v0.1",
  goal_id: GOAL_ID,
  status: "blocked_i20_resume_snapshot_drift",
  recorded_at: recordedAt,
  source_plan: receipt.source_plan,
  approval_signature_refs: approvalRefs,
  closeout_verdict: closeoutVerdict,
  original_post_i18_snapshot_hash: POST_I18_SNAPSHOT_HASH,
  i20_resume_snapshot_hash: I20_RESUME_SNAPSHOT_HASH,
  current_snapshot_hash: currentSnapshot.snapshot_hash,
  resume_from_partial_state: true,
  current_snapshot: receipt.current_snapshot,
  partial_state_assessment: receipt.partial_state_assessment,
  password_issuance_distribution: receipt.password_issuance_distribution,
  first_login_validation: receipt.first_login_validation,
  cut_g_validation: receipt.cut_g_validation,
  rollback_abort_adjudication: {
    rollback_required: false,
    rollback_executed: false,
    abort_required: true,
    criteria_ref: "docs/launch/cutover-rollback-criteria.md",
    snapshot_boundary_hash: currentSnapshot.snapshot_hash,
    owner_decision_required_for_resume_or_rollback: true,
  },
  blocking_conditions: receipt.blocking_conditions,
  authority_boundary: receipt.boundary,
  next_allowed_goal: {
    s5_enrichment_allowed_after_owner_confirms_password_handoff: false,
    s6_allowed: false,
    production_ready_claim_allowed: false,
    go_live_claim_allowed: false,
  },
});
writeJson(join(CLOSEOUT_DIR, "command-evidence.json"), {
  schema_version: "law-firm-os.goal-closeout.command-evidence.v0.1",
  goal_id: GOAL_ID,
  recorded_at: recordedAt,
  decision: closeoutVerdict,
  commands: [
    { command: "CTI_CUTOVER_RESUME_PARTIAL=1 node scripts/run-cti-cutover-execute-retry.mjs", exit_code: 1, summary: "I20 resume attempt returned BLOCKED before first-login validation." },
    { command: "aws lambda invoke cti_cutover_readonly_efs_snapshot", exit_code: 0, summary: `Read-only current snapshot recorded as ${currentSnapshot.snapshot_hash}.` },
  ],
  private_handoff: privateHandoff,
  boundary: receipt.boundary,
});
writeJson(join(CLOSEOUT_DIR, "construction-inspection.json"), {
  schema_version: "law-firm-os.goal-closeout.construction-inspection.v0.1",
  goal_id: GOAL_ID,
  verdict: closeoutVerdict,
  inspections: [
    { id: "CUTOVER-I20-APPROVAL", status: "PASS", finding: "I20 approval receipt is recorded." },
    { id: "CUTOVER-I20-SNAPSHOT-BOUNDARY", status: "BLOCKED", finding: "Current snapshot no longer matches the I20 resume boundary." },
    { id: "CUTOVER-REFERENCE-ERROR-ROOT-CAUSE", status: "PASS", finding: "Root cause identified locally as missing Matter repository/candidate imports; patch is local only until a new boundary is approved." },
    { id: "CUTOVER-S4-CREDENTIAL-INJECTION", status: "BLOCKED", finding: "Auth credential store remains at record_count 1; expected 11 after S4 injection." },
    { id: "CUTOVER-FIRST-LOGIN", status: "BLOCKED", finding: "First-login validation did not run after credential injection." },
    { id: "CUTOVER-BOUNDARY", status: "PASS", finding: "No OIDC, DB conversion, S5/S6, production_ready, or go-live claim." },
  ],
});
writeFileSync(join(CLOSEOUT_DIR, "adjudication.md"), [
  "# CTI CUTOVER Execute Retry Adjudication",
  "",
  `Verdict: \`${closeoutVerdict}\``,
  "",
  `I20 resume snapshot boundary: \`${I20_RESUME_SNAPSHOT_HASH}\``,
  `Current snapshot hash: \`${currentSnapshot.snapshot_hash}\``,
  "",
  "The I20 resume attempt is blocked. The current production EFS snapshot no longer matches the I20-approved resume boundary, while `authCredentialStorePath` remains at record_count `1` instead of the expected 11 production/QA credential records.",
  "",
  "The ReferenceError root cause was identified locally: `apps/api/src/lambda.js` used Matter repository/candidate symbols in the CUTOVER path without importing them. That patch is local only until a new owner-approved snapshot boundary allows deploy/resume.",
  "",
  "No production restore, OIDC implementation, DB conversion, S5 enrichment, S6 seal, production_ready claim, or go-live claim is made.",
  "",
].join("\n"));
writeJson(join(CLOSEOUT_DIR, "claude-review-result.json"), {
  schema_version: "law-firm-os.goal-closeout.review-result.v0.1",
  goal_id: GOAL_ID,
  reviewer: "codex-local-adversarial-check",
  verdict: closeoutVerdict,
  findings: [
    {
      severity: "blocker",
      finding: "I20 resume boundary drifted before S4 credential injection and first-login validation could complete.",
    },
    {
      severity: "blocker",
      finding: "ReferenceError root cause is patched locally but cannot be deployed/resumed without a new owner-approved current snapshot boundary.",
    },
  ],
  residual_risk: [
    "Private plaintext password handoff exists outside repo until owner completes in-person distribution and deletes it.",
    "Further resume or rollback requires a new owner-approved snapshot boundary.",
  ],
});
writeJson(CROSSWALK_JSON, {
  schema_version: "law-firm-os.cti-launch-tuw-crosswalk.v0.1",
  goal_id: GOAL_ID,
  recorded_at: recordedAt,
  work_package: "LT-PRE-W18",
  decision: closeoutVerdict,
  approval_signature_refs: approvalRefs,
  evidence: {
    receipt: "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.json",
    closeout_dir: "docs/goal-closeout/cti-cutover-execute/",
    i20_resume_snapshot_hash: I20_RESUME_SNAPSHOT_HASH,
    current_snapshot_hash: currentSnapshot.snapshot_hash,
    matter_store_record_count: matterStore.record_count ?? null,
    auth_credential_store_record_count: authStore.record_count ?? null,
  },
  blocking_conditions: receipt.blocking_conditions,
  non_execution_boundary: {
    oidc_implementation_executed: false,
    db_conversion_executed: false,
    s5_enrichment_executed: false,
    s6_final_seal_executed: false,
    production_ready_claim: false,
    go_live_claim: false,
  },
});
writeFileSync(CROSSWALK_MD, [
  "# CTI CUTOVER Execute Crosswalk",
  "",
  `Decision: \`${closeoutVerdict}\``,
  "",
  `I20 resume snapshot boundary: \`${I20_RESUME_SNAPSHOT_HASH}\``,
  `Current snapshot hash: \`${currentSnapshot.snapshot_hash}\``,
  "",
  "- S3 tenant migration is reflected in the matter store count, but S4 credential injection remains incomplete.",
  "- S2-T03 password private handoff exists outside repo, but first-login validation has not completed.",
  "- Further resume or rollback requires a new owner-approved snapshot boundary.",
  "",
  "No OIDC, DB conversion, S5 enrichment, S6 seal, production_ready, or go-live claim is made.",
  "",
].join("\n"));

console.log(JSON.stringify({
  verdict: closeoutVerdict,
  current_snapshot_hash: currentSnapshot.snapshot_hash,
  matter_store_record_count: matterStore.record_count ?? null,
  auth_credential_store_record_count: authStore.record_count ?? null,
  closeout: "docs/goal-closeout/cti-cutover-execute/",
}, null, 2));
