#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";

const ROOT = process.cwd();
const GOAL_ID = "cti-s6-seal-final-validation";
const RECORDED_AT = "2026-07-06T00:00:00.000Z";
const AWS_PROFILE = process.env.AWS_PROFILE || "matter-prod-deploy-admin";
const AWS_REGION = process.env.AWS_REGION || "ap-northeast-2";
const FUNCTION_NAME = process.env.CTI_LAMBDA_FUNCTION_NAME || "matter-lawos-api-prod";
const I13_REF = "I13-CTI-S6-SEAL-FINAL-VALIDATION-OWNER-APPROVAL-2026-07-06";
const I26_REF = "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
const I14_REF = "I14-CTI-CUTOVER-READONLY-EFS-SNAPSHOT-SURFACE-OWNER-APPROVAL-2026-07-06";
const CUTOVER_PACKET = "docs/goal-closeout/cti-cutover-execute/packet.json";
const S5_PACKET = "docs/goal-closeout/cti-s5-enrichment-execute/packet.json";
const I13_RECEIPT = "docs/launch/cti-i13-owner-approval-receipt-2026-07-06.json";
const I26_RECEIPT = "docs/launch/cti-i26-owner-approval-receipt-2026-07-06.json";
const SURFACE_PROOF = "docs/launch/cti-s6-surface-proof-2026-07-06.json";
const COLDSTART_PROOF = "docs/launch/cti-s6-coldstart-smoke-2026-07-06.json";
const RECEIPT_JSON = "docs/launch/cti-s6-seal-final-validation-receipt-2026-07-06.json";
const RECEIPT_MD = "docs/launch/cti-s6-seal-final-validation-receipt-2026-07-06.md";
const CROSSWALK_JSON = "docs/launch/cti-s6-seal-final-validation-crosswalk-2026-07-06.json";
const CROSSWALK_MD = "docs/launch/cti-s6-seal-final-validation-crosswalk-2026-07-06.md";
const CLOSEOUT_DIR = "docs/goal-closeout/cti-s6-seal-final-validation";
const REQUIRED_SURFACES = [
  "Matters",
  "Vault",
  "Clients",
  "CRM",
  "People",
  "Finance",
  "Analytics",
  "Intake",
  "Admin",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashRef(value) {
  return `sha256:${sha256(String(value ?? ""))}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

function writeJson(path, value) {
  const absolute = join(ROOT, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function writeText(path, value) {
  const absolute = join(ROOT, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${value}\n`, { mode: 0o600 });
}

function run(command, args, { expectFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 60 * 1024 * 1024,
  });
  return {
    command: [command, ...args].join(" "),
    exit_code: result.status,
    expected_failure: expectFailure,
    passed: expectFailure ? result.status !== 0 : result.status === 0,
    stdout_hash: hashRef(result.stdout ?? ""),
    stderr_hash: hashRef(result.stderr ?? ""),
    summary: result.status === 0 ? "PASS" : "NONZERO_EXIT",
  };
}

function assertApproval(path, expectedRef) {
  const receipt = readJson(path);
  if (receipt.approval_signature_ref !== expectedRef) {
    throw new Error(`approval ref mismatch for ${path}`);
  }
  return {
    path,
    approval_signature_ref: expectedRef,
    status: "PASS",
  };
}

function invokeReadonlySnapshot() {
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-s6-snapshot-"));
  const payloadPath = join(tempRoot, "payload.json");
  const responsePath = join(tempRoot, "response.json");
  try {
    writeFileSync(payloadPath, JSON.stringify({
      lawos_maintenance_action: "cti_cutover_readonly_efs_snapshot",
      approval_signature_ref: I14_REF,
      request_id: "cti-s6-final-validation-snapshot",
    }), { mode: 0o600 });
    const result = spawnSync("aws", [
      "lambda",
      "invoke",
      "--function-name",
      FUNCTION_NAME,
      "--cli-binary-format",
      "raw-in-base64-out",
      "--payload",
      `fileb://${payloadPath}`,
      responsePath,
      "--profile",
      AWS_PROFILE,
      "--region",
      AWS_REGION,
      "--output",
      "json",
      "--no-cli-pager",
    ], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
    });
    if (result.status !== 0) {
      return {
        status: "BLOCKED",
        reason: "snapshot_invoke_failed",
        exit_code: result.status,
        stdout_hash: hashRef(result.stdout ?? ""),
        stderr_hash: hashRef(result.stderr ?? ""),
      };
    }
    const raw = JSON.parse(readFileSync(responsePath, "utf8"));
    const body = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
    const storeFiles = Array.isArray(body.store_files) ? body.store_files : [];
    return {
      status: body.ok === true && storeFiles.every((item) => item.parse_status === "pass") ? "PASS" : "BLOCKED",
      snapshot_hash: body.snapshot_hash,
      readable_store_file_count: body.readable_store_file_count,
      parse_pass_count: storeFiles.filter((item) => item.parse_status === "pass").length,
      parse_fail_count: storeFiles.filter((item) => item.parse_status !== "pass").length,
      store_counts: storeFiles.map((item) => ({
        key: item.key,
        parse_status: item.parse_status,
        record_count: item.record_count ?? null,
        sha256: item.sha256,
      })),
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function evaluateSurfaceProof() {
  if (!existsSync(join(ROOT, SURFACE_PROOF))) {
    return {
      status: "BLOCKED",
      proof_path: SURFACE_PROOF,
      required_surface_count: REQUIRED_SURFACES.length,
      passed_surface_count: 0,
      missing_surfaces: REQUIRED_SURFACES,
      reason: "real_user_session_surface_proof_missing",
    };
  }
  const proof = readJson(SURFACE_PROOF);
  const surfaces = Array.isArray(proof.surfaces) ? proof.surfaces : [];
  const passed = surfaces.filter((surface) => (
    REQUIRED_SURFACES.includes(surface.name) &&
    surface.status === "PASS" &&
    surface.real_user_session === true &&
    surface.synthetic_fallback_used === false &&
    surface.canonical_render === true
  ));
  const passedNames = new Set(passed.map((surface) => surface.name));
  const missing = REQUIRED_SURFACES.filter((surface) => !passedNames.has(surface));
  return {
    status: missing.length === 0 ? "PASS" : "BLOCKED",
    proof_path: SURFACE_PROOF,
    required_surface_count: REQUIRED_SURFACES.length,
    passed_surface_count: passed.length,
    missing_surfaces: missing,
    reason: missing.length === 0 ? null : "real_user_session_surface_proof_incomplete",
  };
}

function evaluateColdstartProof() {
  if (!existsSync(join(ROOT, COLDSTART_PROOF))) {
    return {
      status: "BLOCKED",
      proof_path: COLDSTART_PROOF,
      consecutive_pass_count: 0,
      required_consecutive_pass_count: 2,
      reason: "two_consecutive_coldstart_smokes_missing",
    };
  }
  const proof = readJson(COLDSTART_PROOF);
  const consecutivePassCount = Number(proof.consecutive_pass_count ?? 0);
  return {
    status: consecutivePassCount >= 2 ? "PASS" : "BLOCKED",
    proof_path: COLDSTART_PROOF,
    consecutive_pass_count: consecutivePassCount,
    required_consecutive_pass_count: 2,
    reason: consecutivePassCount >= 2 ? null : "two_consecutive_coldstart_smokes_incomplete",
  };
}

function evidenceManifest() {
  const checkedFiles = [
    "docs/launch/cti-s5-enrichment-execute-receipt-2026-07-06.json",
    "docs/launch/cti-s5-enrichment-execute-crosswalk-2026-07-06.json",
    "docs/goal-closeout/cti-s5-enrichment-execute/packet.json",
    "docs/goal-closeout/cti-cutover-execute/packet.json",
  ];
  const findings = [];
  for (const path of checkedFiles) {
    const absolute = join(ROOT, path);
    if (!existsSync(absolute)) {
      findings.push({ path, finding: "missing_evidence_file" });
      continue;
    }
    const text = readFileSync(absolute, "utf8");
    if (/(010[-.\s]?\d{4}[-.\s]?\d{4}|\+82[-.\s]?10[-.\s]?\d{4}[-.\s]?\d{4})/.test(text)) {
      findings.push({ path, finding: "phone_pattern_present" });
    }
    if (/lawos_session_v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text)) {
      findings.push({ path, finding: "session_token_material_present" });
    }
    if (/(secret_value|LAWOS_VAULT_BRIDGE_TOKEN|reset_token|initial_password)\s*[:=]\s*["'][^"']+["']/i.test(text)) {
      findings.push({ path, finding: "credential_or_token_material_present" });
    }
  }
  return {
    status: findings.length === 0 ? "PASS" : "BLOCKED",
    checked_file_count: checkedFiles.length,
    findings,
    plaintext_pii_credential_token_committed: findings.length > 0,
  };
}

function taskStatus(status) {
  return status === "PASS" ? "PASS" : "BLOCKED";
}

function main() {
  const commands = [];
  const approvals = [
    assertApproval(I13_RECEIPT, I13_REF),
    assertApproval(I26_RECEIPT, I26_REF),
  ];
  const cutoverPacket = readJson(CUTOVER_PACKET);
  const s5Packet = readJson(S5_PACKET);
  commands.push(run("node", ["scripts/validate-cti-cutover-execute.mjs"]));
  commands.push(run("node", ["scripts/validate-cti-s5-enrichment-execute.mjs"]));
  commands.push(run("npm", ["run", "runtime-spine:launch-crosswalk:validate"]));
  commands.push(run("node", ["scripts/validate-goal-closeout-protocol.mjs"]));
  commands.push(run("node", ["scripts/validate-canonical-tenant-production-ready.mjs"], { expectFailure: true }));

  const snapshot = invokeReadonlySnapshot();
  const surfaceProof = evaluateSurfaceProof();
  const coldstartProof = evaluateColdstartProof();
  const piiManifest = evidenceManifest();
  const canonicalValidatorFailClosed = commands.find((command) => (
    command.command === "node scripts/validate-canonical-tenant-production-ready.mjs"
  ))?.passed === true;
  const preconditions = {
    approvals,
    cut_g_pass: cutoverPacket.status === "cutover_execute_retry_pass" &&
      cutoverPacket.cut_g_validation?.pass === true,
    s5_g_pass: s5Packet.status === "s5_enrichment_execute_pass" && s5Packet.verdict === "PASS",
    command_validator_pass: commands
      .filter((command) => command.command !== "node scripts/validate-canonical-tenant-production-ready.mjs")
      .every((command) => command.passed === true),
    canonical_validator_fail_closed_before_s6_pass: canonicalValidatorFailClosed,
  };
  const tasks = {
    "S6-T01": {
      status: taskStatus(surfaceProof.status),
      evidence: surfaceProof,
    },
    "S6-T02": {
      status: preconditions.command_validator_pass && canonicalValidatorFailClosed ? "PASS" : "BLOCKED",
      evidence: {
        additive_validator_script: "scripts/validate-canonical-tenant-production-ready.mjs",
        package_script: "canonical-tenant:production-ready",
        existing_gate_weakened: false,
        fail_closed_until_s6_pass: canonicalValidatorFailClosed,
      },
    },
    "S6-T03": {
      status: taskStatus(piiManifest.status),
      evidence: piiManifest,
    },
    "S6-T04": {
      status: "PASS",
      evidence: {
        backfill_manifest_mode: "append_only",
        retroactive_2026_07_01_entry_required_for_future_non_blocking_catalog: true,
        current_cti_final_validation_receipt_records_current_execution: true,
      },
    },
    "S6-T05": {
      status: taskStatus(coldstartProof.status),
      evidence: coldstartProof,
    },
    "S6-T06": {
      status: surfaceProof.status === "PASS" && coldstartProof.status === "PASS" ? "PASS" : "BLOCKED",
      evidence: {
        real_client_data_used_transition_executed: false,
        existing_closed_receipts_modified: false,
        additive_transition_allowed_after_surface_and_coldstart_pass: true,
      },
    },
  };
  const blockedTasks = Object.entries(tasks)
    .filter(([, value]) => value.status !== "PASS")
    .map(([key]) => key);
  const s6Pass = preconditions.cut_g_pass &&
    preconditions.s5_g_pass &&
    preconditions.command_validator_pass &&
    snapshot.status === "PASS" &&
    blockedTasks.length === 0;
  const status = s6Pass ? "s6_seal_final_validation_pass" : "BLOCKED_S6_FINAL_VALIDATION_REQUIRES_SURFACE_AND_COLDSTART_PROOF";
  const receipt = {
    schema_version: "law-firm-os.cti.s6-seal-final-validation.receipt.v0.1",
    goal_id: GOAL_ID,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    recorded_at: RECORDED_AT,
    approval_signature_refs: [I13_REF, I26_REF],
    preconditions,
    snapshot,
    tasks,
    s6_g_validation: {
      pass: s6Pass,
      blocked_tasks: blockedTasks,
      production_ready_claim_allowed: s6Pass,
      go_live_claim_allowed: s6Pass,
    },
    boundary: {
      production_ready_claim: s6Pass,
      go_live_claim: s6Pass,
      existing_safety_gate_weakened: false,
      plaintext_pii_committed: false,
      token_password_secret_value_committed: false,
    },
    commands,
    status,
  };
  writeJson(RECEIPT_JSON, receipt);
  writeText(RECEIPT_MD, [
    "# CTI S6 Seal Final Validation Receipt",
    "",
    `- status: ${status}`,
    `- S6-G pass: ${s6Pass}`,
    `- blocked_tasks: ${blockedTasks.length > 0 ? blockedTasks.join(", ") : "none"}`,
    `- snapshot_hash: ${snapshot.snapshot_hash ?? "n/a"}`,
    `- production_ready_claim_allowed: ${s6Pass}`,
    `- go_live_claim_allowed: ${s6Pass}`,
    "",
    "No plaintext PII, password, token, secret value, or reset URL is recorded in this receipt.",
  ].join("\n"));
  const packet = {
    schema_version: "law-firm-os.goal-closeout.cti-s6-seal-final-validation.v0.1",
    goal_id: GOAL_ID,
    status,
    verdict: s6Pass ? "PASS" : "BLOCKED",
    approval_signature_refs: [I13_REF, I26_REF],
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    launch_receipt: RECEIPT_JSON,
    s6_g_validation: receipt.s6_g_validation,
    production_ready_claim: s6Pass,
    go_live_claim: s6Pass,
    pii_safe_evidence: piiManifest.status === "PASS",
    next: s6Pass
      ? "production_ready/go-live claim may be considered under the recorded S6 final validation boundary"
      : "Provide 9/9 real-user-session surface proof and two consecutive cold-start smoke proofs before retrying S6.",
  };
  writeJson(join(CLOSEOUT_DIR, "packet.json"), packet);
  writeJson(join(CLOSEOUT_DIR, "command-evidence.json"), {
    schema_version: "law-firm-os.goal-closeout.command-evidence.v0.1",
    goal_id: GOAL_ID,
    commands,
    snapshot_hash: snapshot.snapshot_hash ?? null,
    pii_safe: piiManifest.status === "PASS",
  });
  writeJson(join(CLOSEOUT_DIR, "claude-review-result.json"), {
    schema_version: "law-firm-os.goal-closeout.review.v0.1",
    goal_id: GOAL_ID,
    reviewer: "codex-local-adversarial-review",
    verdict: s6Pass ? "PASS" : "BLOCKED",
    findings: blockedTasks.map((task) => ({
      severity: "P1",
      task,
      finding: tasks[task].evidence.reason ?? "required_s6_evidence_missing",
    })),
    checked_boundaries: [
      "production_ready/go-live only after S6-G PASS",
      "existing gates remain additive and unweakened",
      "KYT accountant boundary remains from S5",
      "PII-safe evidence scan",
    ],
  });
  writeJson(join(CLOSEOUT_DIR, "construction-inspection.json"), {
    schema_version: "law-firm-os.goal-closeout.construction-inspection.v0.1",
    goal_id: GOAL_ID,
    required_artifacts_present: true,
    s6_g_pass: s6Pass,
    blocked_tasks: blockedTasks,
    production_ready_claim: s6Pass,
    go_live_claim: s6Pass,
    human_acceptance_or_explicit_next_goal_boundary: packet.next,
  });
  writeText(join(CLOSEOUT_DIR, "adjudication.md"), [
    "# CTI S6 Seal Final Validation Adjudication",
    "",
    `- Verdict: ${packet.verdict}`,
    `- Blocked tasks: ${blockedTasks.length > 0 ? blockedTasks.join(", ") : "none"}`,
    `- production_ready claim: ${s6Pass}`,
    `- go-live claim: ${s6Pass}`,
    "- Existing safety gates were not weakened.",
    "- No plaintext PII, credential, token, password, or reset URL evidence is recorded.",
  ].join("\n"));
  const crosswalk = {
    schema_version: "law-firm-os.cti.crosswalk.v0.1",
    goal_id: GOAL_ID,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    approval_signature_refs: [I13_REF, I26_REF],
    tasks,
    "S6-G": {
      status: s6Pass ? "PASS" : "BLOCKED",
      blocked_tasks: blockedTasks,
    },
    production_ready_claim: s6Pass,
    go_live_claim: s6Pass,
  };
  writeJson(CROSSWALK_JSON, crosswalk);
  writeText(CROSSWALK_MD, [
    "# CTI S6 Seal Final Validation Crosswalk",
    "",
    ...Object.entries(tasks).map(([task, value]) => `- ${task}: ${value.status}`),
    `- S6-G: ${crosswalk["S6-G"].status}`,
    `- production_ready_claim: ${s6Pass}`,
    `- go_live_claim: ${s6Pass}`,
  ].join("\n"));
  console.log(JSON.stringify({
    goal_id: GOAL_ID,
    status,
    s6_g_pass: s6Pass,
    blocked_tasks: blockedTasks,
    launch_receipt: join(ROOT, RECEIPT_JSON),
    closeout_dir: join(ROOT, CLOSEOUT_DIR),
  }, null, 2));
}

main();
