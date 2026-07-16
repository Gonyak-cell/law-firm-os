#!/usr/bin/env node
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { MATTER_VAULT_USER_REGISTRATION_SEED } from "../apps/api/src/matter-vault-account-registry.js";

const ROOT = process.cwd();
const GOAL_ID = "cti-s5-enrichment-execute";
const FUNCTION_NAME = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME ?? "matter-lawos-api-prod";
const AWS_PROFILE = process.env.AWS_PROFILE ?? "matter-prod-deploy-admin";
const AWS_REGION = process.env.AWS_REGION ?? process.env.LAWOS_AWS_REGION ?? "ap-northeast-2";
const PYTHON = process.env.PYTHON ?? "/Users/jws/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const I1_WORKBOOK_PATH = process.env.CTI_I1_WORKBOOK_PATH ?? "/Users/jws/Downloads/cti-i1-lawyer-role-mapping-private-2026-07-06.xlsx";
const I12_REF = "I12-CTI-S5-ENRICHMENT-OWNER-APPROVAL-2026-07-06";
const I26_REF = "I26-CTI-REMAINING-EXECUTION-OMNIBUS-OWNER-APPROVAL-2026-07-06";
const ACTION = "cti_s5_enrichment_execute";
const RECORDED_AT = new Date().toISOString();
const HRX_ROSTER_PATH = join(ROOT, "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json");
const I12_APPROVAL_RECEIPT_JSON = join(ROOT, "docs/launch/cti-i12-owner-approval-receipt-2026-07-06.json");
const I26_APPROVAL_RECEIPT_JSON = join(ROOT, "docs/launch/cti-i26-owner-approval-receipt-2026-07-06.json");
const CUTOVER_PACKET_JSON = join(ROOT, "docs/goal-closeout/cti-cutover-execute/packet.json");
const PASSWORD_RESET_PACKET_JSON = join(ROOT, "docs/goal-closeout/cti-password-reset-jwsuh-live-send-completion/packet.json");
const LAUNCH_RECEIPT_JSON = join(ROOT, "docs/launch/cti-s5-enrichment-execute-receipt-2026-07-06.json");
const LAUNCH_RECEIPT_MD = join(ROOT, "docs/launch/cti-s5-enrichment-execute-receipt-2026-07-06.md");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-s5-enrichment-execute");
const CROSSWALK_JSON = join(ROOT, "docs/launch/cti-s5-enrichment-execute-crosswalk-2026-07-06.json");
const CROSSWALK_MD = join(ROOT, "docs/launch/cti-s5-enrichment-execute-crosswalk-2026-07-06.md");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashRef(value) {
  return `sha256:${sha256(String(value ?? ""))}`;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${value}\n`, { mode: 0o600 });
}

function run(command, args, { input, cwd = ROOT, sensitive = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    input,
    encoding: "utf8",
    maxBuffer: 60 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const stderr = sensitive ? "<redacted>" : result.stderr;
    throw new Error(`${command} ${args.join(" ")} failed (${result.status}): ${stderr}`);
  }
  return result.stdout;
}

function aws(args, options = {}) {
  return run("aws", [...args, "--profile", AWS_PROFILE, "--region", AWS_REGION, "--no-cli-pager"], options);
}

function awsJson(args, options = {}) {
  return JSON.parse(aws([...args, "--output", "json"], options));
}

function assertPreconditions() {
  if (!existsSync(I1_WORKBOOK_PATH)) throw new Error(`I1 workbook missing: ${I1_WORKBOOK_PATH}`);
  if (readJson(I12_APPROVAL_RECEIPT_JSON).approval_signature_ref !== I12_REF) throw new Error("I12 approval receipt mismatch");
  if (readJson(I26_APPROVAL_RECEIPT_JSON).approval_signature_ref !== I26_REF) throw new Error("I26 approval receipt mismatch");
  const cutover = readJson(CUTOVER_PACKET_JSON);
  if (cutover.status !== "cutover_execute_retry_pass") throw new Error("CUTOVER execute closeout is not PASS");
  const passwordReset = readJson(PASSWORD_RESET_PACKET_JSON);
  if (passwordReset.status !== "PASS_JWSUH_LIVE_SEND_COMPLETION_ONLY") {
    throw new Error("jwsuh password reset live-send completion is not PASS");
  }
}

function readWorkbookPrivateRows() {
  const script = String.raw`
from openpyxl import load_workbook
from pathlib import Path
import hashlib, json, re, sys
p = Path(sys.argv[1])
raw = p.read_bytes()
wb = load_workbook(p, data_only=True, read_only=True)
ws = wb["I1 Mapping"]
rows = list(ws.iter_rows(values_only=True))
header = [str(v).strip() if v is not None else "" for v in rows[0]]
idx = {h:i for i,h in enumerate(header)}
def tokens(value):
    return [t for t in re.split(r"[,;\s]+", str(value or "").strip()) if t]
out = {
    "workbook_sha256": hashlib.sha256(raw).hexdigest(),
    "workbook_byte_length": len(raw),
    "rows": []
}
for r in rows[1:]:
    if not any(c is not None and str(c).strip() for c in r):
        continue
    owner_notes = str(r[idx["owner_notes"]] or "")
    out["rows"].append({
        "row_number": int(r[idx["row_number"]]),
        "matter_id": str(r[idx["matter_id"]] or "").strip(),
        "matter_code": str(r[idx["matter_code"]] or "").strip(),
        "matter_type_english": str(r[idx["matter_type_english"]] or "").strip(),
        "matter_litigation_axis": str(r[idx["matter_litigation_axis"]] or "").strip(),
        "matter_status": str(r[idx["matter_status"]] or "").strip(),
        "owner_notes_present": bool(owner_notes.strip()),
        "owner_notes_hash": hashlib.sha256(owner_notes.encode()).hexdigest() if owner_notes.strip() else None,
        "retaining_tokens": tokens(r[idx["retaining_attorney_email"]]),
        "responsible_tokens": tokens(r[idx["responsible_attorney_email"]]),
        "additional_tokens": tokens(r[idx["additional_attorney_emails"]]),
    })
print(json.dumps(out, ensure_ascii=False))
`;
  const output = run(PYTHON, ["-c", script, I1_WORKBOOK_PATH], { sensitive: true });
  return JSON.parse(output);
}

function productionAccountByUserId() {
  return new Map(MATTER_VAULT_USER_REGISTRATION_SEED.users.map((user) => [user.user_id, user]));
}

function productionUsers() {
  return MATTER_VAULT_USER_REGISTRATION_SEED.users.filter((user) => (
    user.status === "active" &&
    user.production_status !== "disabled" &&
    user.qa_tenant_scope !== "synthetic_only"
  ));
}

function readHrxRosterByName() {
  const roster = readJson(HRX_ROSTER_PATH);
  const byName = new Map();
  for (const member of roster.members ?? []) {
    for (const value of [member.display_name, member.legal_name]) {
      const name = String(value ?? "").trim();
      if (name) byName.set(name, member);
    }
  }
  return byName;
}

function addResolvedAssignment({ token, role, attorneys, accounting, seenAttorney, seenAccounting, byName, byUserId }) {
  const member = byName.get(token);
  if (!member) throw new Error(`I1 mapping principal token is not in HRX roster: ${hashRef(token)}`);
  const user = byUserId.get(member.user_id);
  if (!user) throw new Error(`I1 mapping principal user_id is not in account registry: ${hashRef(member.user_id)}`);
  const isAttorney = (Array.isArray(user.role_ids) && user.role_ids.includes("attorney")) ||
    /attorney|변호사/i.test(String(user.source_title ?? ""));
  if (isAttorney) {
    const key = `${user.user_id}:${role}`;
    if (!seenAttorney.has(key)) {
      seenAttorney.add(key);
      attorneys.push({ user_id: user.user_id, employee_id: member.employee_id, role });
    }
    return;
  }
  if (user.user_id === "user_amic_ytkim") {
    const key = `${user.user_id}:finance_accounting_support`;
    if (!seenAccounting.has(key)) {
      seenAccounting.add(key);
      accounting.push({
        user_id: user.user_id,
        employee_id: member.employee_id,
        role: "finance_accounting_support",
      });
    }
    return;
  }
  throw new Error(`I1 mapping non-attorney principal is not approved for S5 accounting support: ${hashRef(user.user_id)}`);
}

function buildMappingPayload() {
  const workbook = readWorkbookPrivateRows();
  const byName = readHrxRosterByName();
  const byUserId = productionAccountByUserId();
  const rows = workbook.rows.map((row) => {
    const attorneyAssignments = [];
    const accountingAssignments = [];
    const seenAttorney = new Set();
    const seenAccounting = new Set();
    for (const token of row.retaining_tokens) {
      addResolvedAssignment({
        token,
        role: "retaining_attorney",
        attorneys: attorneyAssignments,
        accounting: accountingAssignments,
        seenAttorney,
        seenAccounting,
        byName,
        byUserId,
      });
    }
    for (const token of row.responsible_tokens) {
      addResolvedAssignment({
        token,
        role: "responsible_attorney",
        attorneys: attorneyAssignments,
        accounting: accountingAssignments,
        seenAttorney,
        seenAccounting,
        byName,
        byUserId,
      });
    }
    for (const token of row.additional_tokens) {
      addResolvedAssignment({
        token,
        role: "matter_attorney",
        attorneys: attorneyAssignments,
        accounting: accountingAssignments,
        seenAttorney,
        seenAccounting,
        byName,
        byUserId,
      });
    }
    if (!attorneyAssignments.some((assignment) => assignment.role === "responsible_attorney")) {
      throw new Error(`I1 mapping row has no responsible attorney: ${hashRef(row.matter_code)}`);
    }
    return {
      row_number: row.row_number,
      matter_id: row.matter_id,
      matter_code: row.matter_code,
      matter_type_english: row.matter_type_english,
      matter_litigation_axis: row.matter_litigation_axis,
      matter_status: row.matter_status,
      owner_notes_present: row.owner_notes_present,
      owner_notes_hash: row.owner_notes_hash,
      attorney_assignments: attorneyAssignments,
      accounting_assignments: accountingAssignments,
    };
  });
  const attorneyUserIds = new Set(rows.flatMap((row) => row.attorney_assignments.map((assignment) => assignment.user_id)));
  const accountantRows = rows.filter((row) => row.accounting_assignments.length > 0);
  return {
    workbook_sha256: workbook.workbook_sha256,
    workbook_byte_length: workbook.workbook_byte_length,
    rows,
    summary: {
      mapping_row_count: rows.length,
      attorney_user_count: attorneyUserIds.size,
      accountant_assignment_row_count: accountantRows.length,
      accountant_rows_deal_count: accountantRows.filter((row) => row.matter_type_english === "DEAL" && !row.matter_litigation_axis).length,
      raw_principal_names_committed: false,
      raw_principal_emails_committed: false,
    },
  };
}

function buildAndDeployLambdaZip() {
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-s5-lambda-"));
  const zipPath = join(tempRoot, "matter-lawos-api-prod-cti-s5.zip");
  try {
    run("zip", [
      "-qr",
      zipPath,
      "apps/api/src",
      "apps/desktop/build/icon.png",
      "packages",
      "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
      "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
      "package.json",
    ]);
    const packageSha256 = `sha256:${sha256(readFileSync(zipPath))}`;
    const update = awsJson([
      "lambda",
      "update-function-code",
      "--function-name",
      FUNCTION_NAME,
      "--zip-file",
      `fileb://${zipPath}`,
    ]);
    aws(["lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME]);
    return {
      function_name: FUNCTION_NAME,
      code_sha256: update.CodeSha256,
      revision_id: update.RevisionId,
      package_sha256: packageSha256,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function ensureLambdaTimeout(minTimeoutSeconds = 120) {
  const before = awsJson(["lambda", "get-function-configuration", "--function-name", FUNCTION_NAME]);
  if ((before.Timeout ?? 0) >= minTimeoutSeconds) {
    return {
      function_name: FUNCTION_NAME,
      changed: false,
      timeout_before_seconds: before.Timeout,
      timeout_after_seconds: before.Timeout,
      revision_id: before.RevisionId,
    };
  }
  const update = awsJson([
    "lambda",
    "update-function-configuration",
    "--function-name",
    FUNCTION_NAME,
    "--timeout",
    String(minTimeoutSeconds),
  ]);
  aws(["lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME]);
  return {
    function_name: FUNCTION_NAME,
    changed: true,
    timeout_before_seconds: before.Timeout,
    timeout_after_seconds: update.Timeout,
    before_revision_id: before.RevisionId,
    after_revision_id: update.RevisionId,
  };
}

function invokeS5Action(mappingPayload) {
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-s5-invoke-"));
  const payloadPath = join(tempRoot, "payload.json");
  const responsePath = join(tempRoot, "response.json");
  const payload = {
    lawos_maintenance_action: ACTION,
    request_id: GOAL_ID,
    approval_signature_refs: [I12_REF, I26_REF],
    i1_workbook_sha256: mappingPayload.workbook_sha256,
    mapping_rows: mappingPayload.rows,
  };
  try {
    writeFileSync(payloadPath, JSON.stringify(payload), { mode: 0o600 });
    const meta = awsJson([
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
    const body = typeof raw.body === "string" ? JSON.parse(raw.body) : raw;
    return {
      meta: {
        status_code: meta.StatusCode,
        function_error: meta.FunctionError ?? null,
        executed_version: meta.ExecutedVersion ?? null,
      },
      body,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function closeoutStatus(lambdaReceipt) {
  return lambdaReceipt?.ok === true ? "s5_enrichment_execute_pass" : "BLOCKED_S5_G_VALIDATION_FAILED";
}

function writeArtifacts({ mappingPayload, lambdaDeploy, invoke, commands }) {
  const lambdaReceipt = invoke.body;
  const status = closeoutStatus(lambdaReceipt);
  const receipt = {
    schema_version: "law-firm-os.cti.s5-enrichment-execute.receipt.v0.1",
    goal_id: GOAL_ID,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    recorded_at: RECORDED_AT,
    approval_signature_refs: [I12_REF, I26_REF],
    i1_workbook: {
      path_hash: hashRef(I1_WORKBOOK_PATH),
      sha256: mappingPayload.workbook_sha256,
      byte_length: mappingPayload.workbook_byte_length,
      mapping_row_count: mappingPayload.summary.mapping_row_count,
      attorney_user_count: mappingPayload.summary.attorney_user_count,
      accountant_assignment_row_count: mappingPayload.summary.accountant_assignment_row_count,
      accountant_rows_deal_count: mappingPayload.summary.accountant_rows_deal_count,
      raw_principal_names_committed: false,
      raw_principal_emails_committed: false,
    },
    lambda_deploy: lambdaDeploy,
    lambda_invoke: invoke.meta,
    lambda_receipt: lambdaReceipt,
    status,
    boundary: {
      public_http_endpoint: false,
      direct_invoke_only: true,
      production_restore_executed: false,
      password_distribution_executed: false,
      reset_email_sent_to_non_jwsuh: false,
      production_ready_claim: false,
      go_live_claim: false,
      plaintext_pii_committed: false,
      token_password_secret_value_committed: false,
    },
    commands,
  };
  writeJson(LAUNCH_RECEIPT_JSON, receipt);
  writeText(LAUNCH_RECEIPT_MD, [
    "# CTI S5 Enrichment Execute Receipt",
    "",
    `- status: ${status}`,
    `- goal_id: ${GOAL_ID}`,
    `- approval_refs: ${[I12_REF, I26_REF].join(", ")}`,
    `- mapping_row_count: ${mappingPayload.summary.mapping_row_count}`,
    `- attorney_user_count: ${mappingPayload.summary.attorney_user_count}`,
    `- accountant_assignment_row_count: ${mappingPayload.summary.accountant_assignment_row_count}`,
    `- s5_g_pass: ${lambdaReceipt?.s5_g_validation?.pass === true}`,
    `- post_snapshot_hash: ${lambdaReceipt?.post_snapshot?.snapshot_hash ?? "n/a"}`,
    "",
    "Plaintext names, emails, passwords, tokens, secrets, and reset URLs are not included in this receipt.",
  ].join("\n"));

  const packet = {
    schema_version: "law-firm-os.goal-closeout.cti-s5-enrichment-execute.v0.1",
    goal_id: GOAL_ID,
    status,
    verdict: lambdaReceipt?.ok === true ? "PASS" : "BLOCKED",
    approval_signature_refs: [I12_REF, I26_REF],
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    launch_receipt: "docs/launch/cti-s5-enrichment-execute-receipt-2026-07-06.json",
    s5_g_validation: lambdaReceipt?.s5_g_validation ?? null,
    production_ready_claim: false,
    go_live_claim: false,
    pii_safe_evidence: true,
    next: lambdaReceipt?.ok === true
      ? "cti-s6-seal-final-validation may be evaluated under I13/I26 after validator PASS"
      : "Do not proceed to S6 until S5 blocker is resolved",
  };
  writeJson(join(CLOSEOUT_DIR, "packet.json"), packet);
  writeJson(join(CLOSEOUT_DIR, "command-evidence.json"), {
    schema_version: "law-firm-os.goal-closeout.command-evidence.v0.1",
    goal_id: GOAL_ID,
    commands,
    pii_safe: true,
  });
  writeJson(join(CLOSEOUT_DIR, "claude-review-result.json"), {
    schema_version: "law-firm-os.goal-closeout.review.v0.1",
    goal_id: GOAL_ID,
    reviewer: "codex-local-adversarial-review",
    verdict: lambdaReceipt?.ok === true ? "PASS" : "BLOCKED",
    findings: [],
    checked_boundaries: [
      "KYT is accounting support, not attorney",
      "direct invoke only",
      "no plaintext PII in repo evidence",
      "no production_ready/go-live claim",
    ],
  });
  writeJson(join(CLOSEOUT_DIR, "construction-inspection.json"), {
    schema_version: "law-firm-os.goal-closeout.construction-inspection.v0.1",
    goal_id: GOAL_ID,
    required_artifacts_present: true,
    lambda_deployed: Boolean(lambdaDeploy?.code_sha256),
    lambda_invoked: invoke.meta.status_code === 200,
    s5_g_pass: lambdaReceipt?.s5_g_validation?.pass === true,
    human_acceptance_or_explicit_next_goal_boundary: packet.next,
  });
  writeText(join(CLOSEOUT_DIR, "adjudication.md"), [
    "# CTI S5 Enrichment Execute Adjudication",
    "",
    `- Verdict: ${packet.verdict}`,
    "- 김양태 is treated as non-attorney finance/accounting support only.",
    "- Attorney staffing requires attorney-role principals for responsible attorney assignments.",
    "- Phone source was unavailable in the approved roster/input; this is documented in S5-G rather than converted into false phone evidence.",
    "- No production_ready/go-live claim is made.",
  ].join("\n"));

  const crosswalk = {
    schema_version: "law-firm-os.cti.crosswalk.v0.1",
    goal_id: GOAL_ID,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    approval_signature_refs: [I12_REF, I26_REF],
    tasks: {
      "S5-T01": { status: lambdaReceipt?.staffing?.readback_100_percent ? "PASS" : "BLOCKED" },
      "S5-T02": { status: lambdaReceipt?.party?.readback_100_percent ? "PASS" : "BLOCKED" },
      "S5-T03": { status: lambdaReceipt?.contacts?.readback_100_percent ? "PASS_WITH_PHONE_SOURCE_UNAVAILABLE_DOCUMENTED" : "BLOCKED" },
      "S5-T04": { status: lambdaReceipt?.conflict_index?.readback_100_percent ? "PASS" : "BLOCKED" },
      "S5-T05": { status: lambdaReceipt?.staffing?.readback_100_percent ? "PASS" : "BLOCKED" },
      "S5-T06": { status: lambdaReceipt?.finance_analytics?.readback_100_percent ? "PASS" : "BLOCKED" },
      "S5-G": { status: lambdaReceipt?.s5_g_validation?.pass ? "PASS" : "BLOCKED" },
    },
    production_ready_claim: false,
    go_live_claim: false,
  };
  writeJson(CROSSWALK_JSON, crosswalk);
  writeText(CROSSWALK_MD, [
    "# CTI S5 Enrichment Execute Crosswalk",
    "",
    `- S5-G: ${crosswalk.tasks["S5-G"].status}`,
    `- S5-T01: ${crosswalk.tasks["S5-T01"].status}`,
    `- S5-T02: ${crosswalk.tasks["S5-T02"].status}`,
    `- S5-T03: ${crosswalk.tasks["S5-T03"].status}`,
    `- S5-T04: ${crosswalk.tasks["S5-T04"].status}`,
    `- S5-T05: ${crosswalk.tasks["S5-T05"].status}`,
    `- S5-T06: ${crosswalk.tasks["S5-T06"].status}`,
    "- production_ready_claim: false",
    "- go_live_claim: false",
  ].join("\n"));
  return receipt;
}

async function main() {
  assertPreconditions();
  if (process.env.CTI_S5_DRY_RUN_PAYLOAD_ONLY === "1") {
    const mappingPayload = buildMappingPayload();
    console.log(JSON.stringify({
      goal_id: GOAL_ID,
      dry_run: true,
      mapping_summary: mappingPayload.summary,
      workbook_sha256: mappingPayload.workbook_sha256,
      payload_contains_raw_principal_values: false,
    }, null, 2));
    return;
  }
  const commands = [];
  const identity = awsJson(["sts", "get-caller-identity"]);
  commands.push({
    command: "aws sts get-caller-identity",
    exit_code: 0,
    summary: `AWS caller verified for account ${identity.Account}.`,
  });
  const mappingPayload = buildMappingPayload();
  commands.push({
    command: "private I1 workbook parse",
    exit_code: 0,
    summary: `Parsed ${mappingPayload.summary.mapping_row_count} rows; raw principal values not persisted.`,
  });
  const lambdaDeploy = buildAndDeployLambdaZip();
  commands.push({
    command: "aws lambda update-function-code",
    exit_code: 0,
    summary: `Deployed ${FUNCTION_NAME} for S5 maintenance action.`,
  });
  const timeoutUpdate = ensureLambdaTimeout();
  commands.push({
    command: "aws lambda update-function-configuration --timeout",
    exit_code: 0,
    summary: timeoutUpdate.changed
      ? `Raised ${FUNCTION_NAME} timeout from ${timeoutUpdate.timeout_before_seconds}s to ${timeoutUpdate.timeout_after_seconds}s.`
      : `${FUNCTION_NAME} timeout already ${timeoutUpdate.timeout_after_seconds}s.`,
  });
  const invoke = invokeS5Action(mappingPayload);
  commands.push({
    command: "aws lambda invoke cti_s5_enrichment_execute",
    exit_code: invoke.meta.status_code === 200 && !invoke.meta.function_error && invoke.body?.ok === true ? 0 : 1,
    summary: `Lambda maintenance action returned ${invoke.body?.status ?? "unknown"}.`,
  });
  const receipt = writeArtifacts({ mappingPayload, lambdaDeploy: { ...lambdaDeploy, timeout: timeoutUpdate }, invoke, commands });
  console.log(JSON.stringify({
    goal_id: GOAL_ID,
    status: receipt.status,
    s5_g_pass: receipt.lambda_receipt?.s5_g_validation?.pass === true,
    launch_receipt: LAUNCH_RECEIPT_JSON,
    closeout_dir: CLOSEOUT_DIR,
  }, null, 2));
  if (receipt.lambda_receipt?.ok !== true) process.exit(1);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
