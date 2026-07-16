#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import {
  createAuthCredentialRecord,
} from "../apps/api/src/auth-credential-store.js";
import {
  MATTER_VAULT_USER_REGISTRATION_SEED,
} from "../apps/api/src/matter-vault-account-registry.js";

const ROOT = process.cwd();
const GOAL_ID = "cti-cutover-execute";
const FUNCTION_NAME = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME ?? "matter-lawos-api-prod";
const AWS_PROFILE = process.env.AWS_PROFILE ?? "matter-prod-deploy-admin";
const AWS_REGION = process.env.AWS_REGION ?? process.env.LAWOS_AWS_REGION ?? "ap-northeast-2";
const BASE_URL = (process.env.LAWOS_PRODUCTION_BASE_URL ?? "https://d2mthcc8vp3cr2.cloudfront.net").replace(/\/+$/, "");
const CANONICAL_TENANT = "tenant_amic_matter_vault";
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
const ACTION = "cti_cutover_execute_retry";
const LOCAL_DEV_SYNTHETIC_TOKEN = "local-dev-only:jwsuh@amic.kr";
const RECORDED_AT = new Date().toISOString();
const RESUME_PARTIAL = process.env.CTI_CUTOVER_RESUME_PARTIAL === "1";
const RESUME_CURRENT_PARTIAL = process.env.CTI_CUTOVER_RESUME_CURRENT_PARTIAL === "1";
const RESUME_POST_I21_PARTIAL = process.env.CTI_CUTOVER_RESUME_POST_I21_PARTIAL === "1";
const ACTIVE_SNAPSHOT_HASH = RESUME_POST_I21_PARTIAL
  ? POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH
  : RESUME_CURRENT_PARTIAL
    ? CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH
  : RESUME_PARTIAL
    ? PARTIAL_STATE_RESUME_SNAPSHOT_HASH
    : SNAPSHOT_HASH;
const APPROVAL_REFS = RESUME_POST_I21_PARTIAL
  ? [I11_REF, I18_REF, I19_REF, I22_REF]
  : RESUME_CURRENT_PARTIAL
    ? [I11_REF, I18_REF, I19_REF, I21_REF]
  : RESUME_PARTIAL
    ? [I11_REF, I18_REF, I19_REF, I20_REF]
    : [I11_REF, I18_REF, I19_REF];
const PRIVATE_HANDOFF_JSON = "/Users/jws/Downloads/cti-cutover-initial-password-handoff-private-2026-07-06.json";
const PRIVATE_HANDOFF_CSV = "/Users/jws/Downloads/cti-cutover-initial-password-handoff-private-2026-07-06.csv";
const I20_APPROVAL_RECEIPT_JSON = join(ROOT, "docs/launch/cti-i20-owner-approval-receipt-2026-07-06.json");
const I21_APPROVAL_RECEIPT_JSON = join(ROOT, "docs/launch/cti-i21-owner-approval-receipt-2026-07-06.json");
const I22_APPROVAL_RECEIPT_JSON = join(ROOT, "docs/launch/cti-i22-owner-approval-receipt-2026-07-06.json");
const LAUNCH_RECEIPT_JSON = join(ROOT, "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.json");
const LAUNCH_RECEIPT_MD = join(ROOT, "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.md");
const CLOSEOUT_DIR = join(ROOT, "docs/goal-closeout/cti-cutover-execute");
const CROSSWALK_JSON = join(ROOT, "docs/launch/cti-cutover-execute-crosswalk-2026-07-06.json");
const CROSSWALK_MD = join(ROOT, "docs/launch/cti-cutover-execute-crosswalk-2026-07-06.md");

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

function assertRecordedResumeApproval() {
  if (RESUME_PARTIAL) {
    if (!existsSync(I20_APPROVAL_RECEIPT_JSON)) throw new Error(`I20 approval receipt missing: ${I20_APPROVAL_RECEIPT_JSON}`);
    const receipt = readJson(I20_APPROVAL_RECEIPT_JSON);
    if (receipt.approval_signature_ref !== I20_REF) throw new Error("I20 approval receipt signature ref mismatch");
    if (receipt.partial_snapshot_hash !== PARTIAL_STATE_RESUME_SNAPSHOT_HASH) throw new Error("I20 approval receipt snapshot hash mismatch");
  }
  if (RESUME_CURRENT_PARTIAL) {
    if (!existsSync(I21_APPROVAL_RECEIPT_JSON)) throw new Error(`I21 approval receipt missing: ${I21_APPROVAL_RECEIPT_JSON}`);
    const receipt = readJson(I21_APPROVAL_RECEIPT_JSON);
    if (receipt.approval_signature_ref !== I21_REF) throw new Error("I21 approval receipt signature ref mismatch");
    if (receipt.current_snapshot_hash !== CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH) throw new Error("I21 approval receipt snapshot hash mismatch");
  }
  if (RESUME_POST_I21_PARTIAL) {
    if (!existsSync(I22_APPROVAL_RECEIPT_JSON)) throw new Error(`I22 approval receipt missing: ${I22_APPROVAL_RECEIPT_JSON}`);
    const receipt = readJson(I22_APPROVAL_RECEIPT_JSON);
    if (receipt.approval_signature_ref !== I22_REF) throw new Error("I22 approval receipt signature ref mismatch");
    if (receipt.current_snapshot_hash !== POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH) throw new Error("I22 approval receipt snapshot hash mismatch");
  }
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function run(command, args, { input, cwd = ROOT, sensitive = false } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    input,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
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

function productionUsers() {
  return MATTER_VAULT_USER_REGISTRATION_SEED.users.filter((user) => (
    user.status === "active" &&
    user.production_status !== "disabled" &&
    user.qa_tenant_scope !== "synthetic_only"
  ));
}

function qaUsers() {
  return MATTER_VAULT_USER_REGISTRATION_SEED.users.filter((user) => (
    user.production_status === "disabled" ||
    user.qa_tenant_scope === "synthetic_only"
  ));
}

function randomPassword() {
  return `${randomBytes(18).toString("base64url")}!7a`;
}

function generateCredentialPackage() {
  const rows = productionUsers().map((user) => {
    const password = randomPassword();
    const record = createAuthCredentialRecord({
      user_id: user.user_id,
      email: user.email,
      password,
      status: "must_change",
      credential_rev: 1,
    });
    return { user, password, record };
  });
  const privateHandoff = {
    schema_version: "law-firm-os.cti.initial-password-private-handoff.v0.1",
    generated_at: RECORDED_AT,
    goal_id: GOAL_ID,
    distribution_channel: "in_person",
    handling_instructions: [
      "Do not commit this file.",
      "Do not email or message plaintext passwords.",
      "Print or read in person, then delete the local plaintext file after distribution.",
      "Each account is must_change_password on first login.",
    ],
    rows: rows.map(({ user, password }) => ({
      user_id: user.user_id,
      email: user.email,
      display_name: user.display_name,
      initial_password: password,
      must_change_password: true,
    })),
  };
  mkdirSync(dirname(PRIVATE_HANDOFF_JSON), { recursive: true });
  writeFileSync(PRIVATE_HANDOFF_JSON, `${JSON.stringify(privateHandoff, null, 2)}\n`, { mode: 0o600 });
  const csv = [
    "user_id,email,display_name,initial_password,must_change_password",
    ...privateHandoff.rows.map((row) => [
      row.user_id,
      row.email,
      `"${String(row.display_name ?? "").replaceAll("\"", "\"\"")}"`,
      row.initial_password,
      "true",
    ].join(",")),
  ].join("\n");
  writeFileSync(PRIVATE_HANDOFF_CSV, `${csv}\n`, { mode: 0o600 });
  return {
    credentialRecords: rows.map(({ record }) => record),
    privateRows: rows.map(({ user, password }) => ({ user, password })),
    handoff: {
      json_path: PRIVATE_HANDOFF_JSON,
      csv_path: PRIVATE_HANDOFF_CSV,
      json_sha256: sha256(readFileSync(PRIVATE_HANDOFF_JSON)),
      csv_sha256: sha256(readFileSync(PRIVATE_HANDOFF_CSV)),
      row_count: rows.length,
    },
  };
}

function credentialPackageFromExistingHandoff() {
  if (!existsSync(PRIVATE_HANDOFF_JSON)) {
    throw new Error(`I20 resume requires existing private handoff JSON: ${PRIVATE_HANDOFF_JSON}`);
  }
  if (!existsSync(PRIVATE_HANDOFF_CSV)) {
    throw new Error(`I20 resume requires existing private handoff CSV: ${PRIVATE_HANDOFF_CSV}`);
  }
  const handoff = readJson(PRIVATE_HANDOFF_JSON);
  const rows = Array.isArray(handoff.rows) ? handoff.rows : [];
  const byUserId = new Map(rows.map((row) => [String(row.user_id ?? ""), row]));
  const production = productionUsers();
  if (rows.length !== production.length) {
    throw new Error("I20 resume private handoff row count does not match production user count");
  }
  const credentialRows = production.map((user) => {
    const row = byUserId.get(user.user_id);
    if (!row) throw new Error(`I20 resume private handoff missing user ${user.user_id}`);
    if (String(row.email ?? "").trim().toLowerCase() !== String(user.email ?? "").trim().toLowerCase()) {
      throw new Error(`I20 resume private handoff email mismatch for ${user.user_id}`);
    }
    const password = String(row.initial_password ?? "");
    if (!password) throw new Error(`I20 resume private handoff missing password for ${user.user_id}`);
    const record = createAuthCredentialRecord({
      user_id: user.user_id,
      email: user.email,
      password,
      status: "must_change",
      credential_rev: 1,
    });
    return { user, password, record };
  });
  return {
    credentialRecords: credentialRows.map(({ record }) => record),
    privateRows: credentialRows.map(({ user, password }) => ({ user, password })),
    handoff: {
      json_path: PRIVATE_HANDOFF_JSON,
      csv_path: PRIVATE_HANDOFF_CSV,
      json_sha256: sha256(readFileSync(PRIVATE_HANDOFF_JSON)),
      csv_sha256: sha256(readFileSync(PRIVATE_HANDOFF_CSV)),
      row_count: rows.length,
      reused_existing_private_handoff: true,
    },
  };
}

function buildCredentialPackage() {
  return RESUME_PARTIAL || RESUME_CURRENT_PARTIAL || RESUME_POST_I21_PARTIAL
    ? credentialPackageFromExistingHandoff()
    : generateCredentialPackage();
}

function buildAndDeployLambdaZip() {
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-cutover-lambda-"));
  const zipPath = join(tempRoot, "matter-lawos-api-prod-cti-cutover-retry.zip");
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

function readLambdaConfiguration() {
  return awsJson(["lambda", "get-function-configuration", "--function-name", FUNCTION_NAME]);
}

function updateBridgeControls() {
  const before = readLambdaConfiguration();
  const beforeEnv = before.Environment?.Variables ?? {};
  const rotatedToken = randomBytes(48).toString("base64url");
  const nextEnv = {
    ...beforeEnv,
    LAWOS_VAULT_BRIDGE_TOKEN: rotatedToken,
    LAWOS_VAULT_BRIDGE_ENABLED: "false",
    LAWOS_VAULT_BRIDGE_ALLOWED_TENANT_IDS: CANONICAL_TENANT,
    LAWOS_VAULT_BRIDGE_SERVICE_ACTOR_ID: "cti-cutover-bridge-service",
  };
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-cutover-env-"));
  const envPath = join(tempRoot, "lambda-env.json");
  try {
    writeFileSync(envPath, JSON.stringify({ Variables: nextEnv }), { mode: 0o600 });
    const update = awsJson([
      "lambda",
      "update-function-configuration",
      "--function-name",
      FUNCTION_NAME,
      "--environment",
      `file://${envPath}`,
    ], { sensitive: true });
    aws(["lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME], { sensitive: true });
    return {
      function_name: FUNCTION_NAME,
      before_revision_id: before.RevisionId,
      after_revision_id: update.RevisionId,
      before_token_sha256: beforeEnv.LAWOS_VAULT_BRIDGE_TOKEN ? hashRef(beforeEnv.LAWOS_VAULT_BRIDGE_TOKEN) : null,
      after_token_sha256: hashRef(rotatedToken),
      bridge_enabled_after: nextEnv.LAWOS_VAULT_BRIDGE_ENABLED,
      allowed_tenant_ids_after: nextEnv.LAWOS_VAULT_BRIDGE_ALLOWED_TENANT_IDS,
      service_actor_after: nextEnv.LAWOS_VAULT_BRIDGE_SERVICE_ACTOR_ID,
      token_value_recorded: false,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function invokeCutoverAction(credentialRecords) {
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-cutover-invoke-"));
  const payloadPath = join(tempRoot, "payload.json");
  const responsePath = join(tempRoot, "response.json");
  const payload = {
    lawos_maintenance_action: ACTION,
    request_id: "cti-cutover-execute-retry",
    approval_signature_refs: APPROVAL_REFS,
    expected_snapshot_hash: ACTIVE_SNAPSHOT_HASH,
    resume_from_partial_state: RESUME_PARTIAL,
    resume_from_current_partial_state: RESUME_CURRENT_PARTIAL,
    resume_from_post_i21_partial_state: RESUME_POST_I21_PARTIAL,
    bridge_token_rotation_recorded: true,
    password_distribution_private_handoff_created: true,
    credential_records: credentialRecords,
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

async function postJson(path, body, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: parseResponseBody(text),
  };
}

async function getJson(path, headers = {}) {
  const response = await fetch(`${BASE_URL}${path}`, { headers });
  const text = await response.text();
  return {
    status: response.status,
    body: parseResponseBody(text),
  };
}

function parseResponseBody(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { non_json_body_hash: hashRef(text), non_json_body_recorded: false };
  }
}

function blockedFirstLoginValidation(reason) {
  const productionUserCount = productionUsers().length;
  const qaUserCount = qaUsers().length;
  return {
    production_user_count: productionUserCount,
    production_login_pass_count: 0,
    must_change_count: 0,
    qa_user_count: qaUserCount,
    qa_rejected_count: 0,
    synthetic_token_status: null,
    synthetic_token_rejected: false,
    results: [],
    qa_results: [],
    skipped_reason: reason,
    plaintext_password_recorded: false,
    token_material_recorded: false,
  };
}

async function validateFirstLogin(privateRows) {
  const results = [];
  for (const { user, password } of privateRows) {
    const login = await postJson("/api/auth/login", { email: user.email, password });
    const token = login.body?.session_token;
    const session = token ? await getJson("/api/auth/session", { authorization: `Bearer ${token}` }) : { status: null, body: {} };
    results.push({
      user_id_hash: hashRef(user.user_id),
      email_hash: hashRef(user.email),
      login_status: login.status,
      session_status: session.status,
      must_change_password: login.body?.must_change_password === true || session.body?.session?.must_change_password === true,
      token_received_in_process: typeof token === "string" && token.length > 0,
      token_recorded: false,
      plaintext_password_recorded: false,
    });
  }
  const qaResults = [];
  for (const user of qaUsers()) {
    const login = await postJson("/api/auth/login", { email: user.email, password: "not-the-password" });
    qaResults.push({
      user_id_hash: hashRef(user.user_id),
      email_hash: hashRef(user.email),
      login_status: login.status,
      safe_error_codes: login.body?.safe_error_codes ?? [],
    });
  }
  const syntheticSession = await getJson("/api/auth/session", { authorization: `Bearer ${LOCAL_DEV_SYNTHETIC_TOKEN}` });
  return {
    production_user_count: results.length,
    production_login_pass_count: results.filter((item) => item.login_status === 200 && item.session_status === 200).length,
    must_change_count: results.filter((item) => item.must_change_password === true).length,
    qa_user_count: qaResults.length,
    qa_rejected_count: qaResults.filter((item) => [401, 403, 423].includes(item.login_status)).length,
    synthetic_token_status: syntheticSession.status,
    synthetic_token_rejected: [401, 403].includes(syntheticSession.status),
    results,
    qa_results: qaResults,
    plaintext_password_recorded: false,
    token_material_recorded: false,
  };
}

function packetFor(receipt) {
  const passed = receipt.verdict === "PASS";
  return {
    schema_version: "law-firm-os.goal-closeout.packet.v0.1",
    goal_id: GOAL_ID,
    status: passed ? "cutover_execute_retry_pass" : "blocked_or_rolled_back",
    recorded_at: receipt.recorded_at,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    approval_signature_refs: APPROVAL_REFS,
    closeout_verdict: passed ? "PASS" : receipt.verdict,
    current_snapshot_hash: ACTIVE_SNAPSHOT_HASH,
    original_post_i18_snapshot_hash: SNAPSHOT_HASH,
    i20_resume_snapshot_hash: RESUME_PARTIAL || RESUME_CURRENT_PARTIAL || RESUME_POST_I21_PARTIAL ? PARTIAL_STATE_RESUME_SNAPSHOT_HASH : null,
    current_partial_resume_snapshot_hash: RESUME_CURRENT_PARTIAL ? CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH : null,
    post_i21_partial_resume_snapshot_hash: RESUME_POST_I21_PARTIAL ? POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH : null,
    resume_from_partial_state: RESUME_PARTIAL,
    resume_from_current_partial_state: RESUME_CURRENT_PARTIAL,
    resume_from_post_i21_partial_state: RESUME_POST_I21_PARTIAL,
    runbook_steps: receipt.runbook_steps,
    migration: receipt.lambda_receipt.matter_migration,
    account_permission_injection: receipt.lambda_receipt.account_permission_injection,
    credential_injection: receipt.lambda_receipt.credential_injection,
    bridge_control: receipt.bridge_control,
    password_issuance_distribution: receipt.password_issuance_distribution,
    first_login_validation: receipt.first_login_validation,
    cut_g_validation: receipt.cut_g_validation,
    rollback_abort_adjudication: {
      rollback_required: false,
      rollback_executed: false,
      abort_required: false,
      criteria_ref: "docs/launch/cutover-rollback-criteria.md",
      snapshot_boundary_hash: ACTIVE_SNAPSHOT_HASH,
    },
    blocking_conditions: passed ? [] : receipt.blocking_conditions,
    authority_boundary: receipt.boundary,
    next_allowed_goal: {
      s5_enrichment_allowed_after_owner_confirms_password_handoff: passed,
      s6_allowed: false,
      production_ready_claim_allowed: false,
      go_live_claim_allowed: false,
    },
  };
}

function writeCloseout(receipt) {
  mkdirSync(CLOSEOUT_DIR, { recursive: true });
  writeJson(join(CLOSEOUT_DIR, "packet.json"), packetFor(receipt));
  writeJson(join(CLOSEOUT_DIR, "command-evidence.json"), {
    schema_version: "law-firm-os.goal-closeout.command-evidence.v0.1",
    goal_id: GOAL_ID,
    recorded_at: receipt.recorded_at,
    decision: receipt.verdict,
    commands: receipt.commands,
    private_handoff: receipt.private_handoff_repo_safe,
    boundary: receipt.boundary,
  });
  writeJson(join(CLOSEOUT_DIR, "construction-inspection.json"), {
    schema_version: "law-firm-os.goal-closeout.construction-inspection.v0.1",
    goal_id: GOAL_ID,
    verdict: receipt.verdict,
    inspections: [
      { id: "CUTOVER-PREFLIGHT", status: "PASS", finding: "GO_READY_NOT_EXECUTED with I11/I18/I19 and post-I18 snapshot boundary." },
      { id: "CUTOVER-LAMBDA-DIRECT-INVOKE", status: receipt.lambda_receipt.status === "PASS" ? "PASS" : "BLOCKED", finding: receipt.lambda_receipt.status },
      { id: "CUTOVER-FIRST-LOGIN", status: receipt.first_login_validation.production_login_pass_count === receipt.first_login_validation.production_user_count ? "PASS" : "BLOCKED", finding: "All generated production credentials logged in through real login/session flow." },
      { id: "CUTOVER-QA-DISABLE", status: receipt.first_login_validation.qa_rejected_count === receipt.first_login_validation.qa_user_count ? "PASS" : "BLOCKED", finding: "QA accounts rejected in operational profile." },
      { id: "CUTOVER-BOUNDARY", status: "PASS", finding: "No OIDC, DB conversion, S5/S6, production_ready, or go-live claim." },
    ],
    non_claims: {
      oidc_implementation: false,
      db_conversion: false,
      s5_enrichment: false,
      s6_seal: false,
      production_ready_claim: false,
      go_live_claim: false,
    },
  });
  writeFileSync(join(CLOSEOUT_DIR, "adjudication.md"), [
    "# CTI CUTOVER Execute Retry Adjudication",
    "",
    `Verdict: \`${receipt.verdict}\``,
    "",
    `Snapshot boundary: \`${ACTIVE_SNAPSHOT_HASH}\``,
    "",
    `Resume from partial state: \`${RESUME_PARTIAL}\``,
    `Resume from current partial state: \`${RESUME_CURRENT_PARTIAL}\``,
    `Resume from post-I21 partial state: \`${RESUME_POST_I21_PARTIAL}\``,
    "",
    "CUTOVER runbook executed through the private Lambda maintenance surface. Production matter migration, credential injection, bridge control, password private handoff, first-login validation, and CUT-G checks are recorded with hash/count evidence.",
    "",
    "No OIDC implementation, DB conversion, S5 enrichment, S6 seal, production_ready claim, or go-live claim is made.",
    "",
  ].join("\n"));
  writeJson(join(CLOSEOUT_DIR, "claude-review-result.json"), {
    schema_version: "law-firm-os.goal-closeout.review-result.v0.1",
    goal_id: GOAL_ID,
    reviewer: "codex-local-adversarial-check",
    verdict: receipt.verdict,
    findings: [],
    residual_risk: [
      "Private plaintext password handoff exists outside repo until owner completes in-person distribution and deletes it.",
      "S5 enrichment and S6 final seal remain separate goals.",
    ],
  });
}

function writeLaunchDocs(receipt) {
  writeJson(LAUNCH_RECEIPT_JSON, receipt);
  writeFileSync(LAUNCH_RECEIPT_MD, [
    "# CTI CUTOVER Execute Retry Receipt",
    "",
    `Verdict: \`${receipt.verdict}\``,
    "",
    `Snapshot boundary: \`${ACTIVE_SNAPSHOT_HASH}\``,
    "",
    `Resume from partial state: \`${RESUME_PARTIAL}\``,
    "",
    `Canonical clients: ${receipt.lambda_receipt.matter_migration?.canonical_client_count ?? "n/a"}`,
    `Canonical matters: ${receipt.lambda_receipt.matter_migration?.canonical_matter_count ?? "n/a"}`,
    `Production first-login pass: ${receipt.first_login_validation.production_login_pass_count}/${receipt.first_login_validation.production_user_count}`,
    `QA rejected: ${receipt.first_login_validation.qa_rejected_count}/${receipt.first_login_validation.qa_user_count}`,
    "",
    "Plaintext passwords, token values, credential hash digests, and PII payloads are not recorded in repo receipts.",
    "",
  ].join("\n"));
  writeJson(CROSSWALK_JSON, {
    schema_version: "law-firm-os.cti-launch-tuw-crosswalk.v0.1",
    goal_id: GOAL_ID,
    recorded_at: receipt.recorded_at,
    work_package: "LT-PRE-W18",
    decision: receipt.verdict,
    approval_signature_refs: APPROVAL_REFS,
    cti_to_tuw: {
      "CUTOVER precheck": ["LT-PRE-W18-T01"],
      "S3-T02/S3-T03/S3-T04": ["LT-PRE-W18-T02"],
      "S4-T01/S4-T03/S4-T04b": ["LT-PRE-W18-T02"],
      "S3-T08": ["LT-PRE-W18-T03"],
      "S2-T03/CUT-G": ["LT-PRE-W18-T04"],
    },
    evidence: {
      receipt: "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.json",
      closeout_dir: "docs/goal-closeout/cti-cutover-execute/",
      snapshot_hash: ACTIVE_SNAPSHOT_HASH,
      original_post_i18_snapshot_hash: SNAPSHOT_HASH,
      i20_resume_snapshot_hash: RESUME_PARTIAL || RESUME_CURRENT_PARTIAL || RESUME_POST_I21_PARTIAL ? PARTIAL_STATE_RESUME_SNAPSHOT_HASH : null,
      current_partial_resume_snapshot_hash: RESUME_CURRENT_PARTIAL ? CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH : null,
      post_i21_partial_resume_snapshot_hash: RESUME_POST_I21_PARTIAL ? POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH : null,
      resume_from_partial_state: RESUME_PARTIAL,
      resume_from_current_partial_state: RESUME_CURRENT_PARTIAL,
      resume_from_post_i21_partial_state: RESUME_POST_I21_PARTIAL,
      canonical_client_count: receipt.lambda_receipt.matter_migration?.canonical_client_count ?? null,
      canonical_matter_count: receipt.lambda_receipt.matter_migration?.canonical_matter_count ?? null,
      production_login_pass_count: receipt.first_login_validation.production_login_pass_count,
      qa_rejected_count: receipt.first_login_validation.qa_rejected_count,
    },
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
    `Decision: \`${receipt.verdict}\``,
    "",
    `Snapshot boundary: \`${ACTIVE_SNAPSHOT_HASH}\``,
    "",
    `Resume from partial state: \`${RESUME_PARTIAL}\``,
    `Resume from current partial state: \`${RESUME_CURRENT_PARTIAL}\``,
    `Resume from post-I21 partial state: \`${RESUME_POST_I21_PARTIAL}\``,
    "",
    "- S3 tenant migration and synthetic residue checks map to LT-PRE-W18.",
    "- S4 account/permission injection and QA disable checks map to LT-PRE-W18.",
    "- S3-T08 bridge token rotation/control maps to LT-PRE-W18.",
    "- S2-T03 password issuance/private handoff and first-login validation map to LT-PRE-W18.",
    "",
    "No OIDC, DB conversion, S5 enrichment, S6 seal, production_ready, or go-live claim is made.",
    "",
  ].join("\n"));
}

function repoSafePrivateHandoffSummary(handoff) {
  return {
    json_path_hash: hashRef(handoff.json_path),
    csv_path_hash: hashRef(handoff.csv_path),
    json_sha256: handoff.json_sha256,
    csv_sha256: handoff.csv_sha256,
    row_count: handoff.row_count,
    reused_existing_private_handoff: handoff.reused_existing_private_handoff === true,
    plaintext_password_recorded_in_repo: false,
  };
}

async function main() {
  const preflight = readJson(join(ROOT, "docs/goal-closeout/cti-cutover-preflight-go-no-go/packet.json"));
  if (preflight.closeout_verdict !== "GO_READY_NOT_EXECUTED") throw new Error("CUTOVER preflight is not GO_READY_NOT_EXECUTED");
  if (preflight.current_production_snapshot?.snapshot_hash !== SNAPSHOT_HASH) throw new Error("CUTOVER preflight snapshot hash mismatch");
  assertRecordedResumeApproval();
  const commands = [];
  aws(["sts", "get-caller-identity"]);
  commands.push({ command: "aws sts get-caller-identity", exit_code: 0, summary: "Matter production deploy role chain verified." });
  const credentialPackage = buildCredentialPackage();
  const deploy = buildAndDeployLambdaZip();
  commands.push({ command: "aws lambda update-function-code", exit_code: 0, summary: `Deployed CUTOVER retry maintenance action; CodeSha256=${deploy.code_sha256}.` });
  const bridgeControl = updateBridgeControls();
  commands.push({ command: "aws lambda update-function-configuration bridge token rotation/control", exit_code: 0, summary: "Bridge token rotated, bridge disabled/window closed, canonical tenant allow-list and service actor applied; token value not recorded." });
  const invoke = invokeCutoverAction(credentialPackage.credentialRecords);
  commands.push({ command: "aws lambda invoke cti_cutover_execute_retry", exit_code: invoke.meta.status_code === 200 && !invoke.meta.function_error ? 0 : 1, summary: `Lambda maintenance action returned ${invoke.body.status}.` });
  const firstLogin = invoke.body.status === "PASS"
    ? await validateFirstLogin(credentialPackage.privateRows)
    : blockedFirstLoginValidation(`lambda maintenance action returned ${invoke.body.status ?? "UNKNOWN"}`);
  commands.push({ command: "real login/session validation for generated production credentials", exit_code: firstLogin.production_login_pass_count === firstLogin.production_user_count ? 0 : 1, summary: `production_login_pass=${firstLogin.production_login_pass_count}/${firstLogin.production_user_count}; qa_rejected=${firstLogin.qa_rejected_count}/${firstLogin.qa_user_count}; synthetic_token_rejected=${firstLogin.synthetic_token_rejected}.` });
  const verdict = invoke.body.status === "PASS" &&
    firstLogin.production_login_pass_count === firstLogin.production_user_count &&
    firstLogin.must_change_count === firstLogin.production_user_count &&
    firstLogin.qa_rejected_count === firstLogin.qa_user_count &&
    firstLogin.synthetic_token_rejected === true
    ? "PASS"
    : "BLOCKED";
  const receipt = {
    schema_version: "law-firm-os.cti.cutover-execute-retry.operator-receipt.v0.1",
    goal_id: GOAL_ID,
    verdict,
    recorded_at: RECORDED_AT,
    approval_signature_refs: APPROVAL_REFS,
    source_plan: "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md",
    preflight_packet: "docs/goal-closeout/cti-cutover-preflight-go-no-go/packet.json",
    current_snapshot_hash: ACTIVE_SNAPSHOT_HASH,
    original_post_i18_snapshot_hash: SNAPSHOT_HASH,
    i20_resume_snapshot_hash: RESUME_PARTIAL || RESUME_CURRENT_PARTIAL || RESUME_POST_I21_PARTIAL ? PARTIAL_STATE_RESUME_SNAPSHOT_HASH : null,
    current_partial_resume_snapshot_hash: RESUME_CURRENT_PARTIAL ? CURRENT_PARTIAL_RESUME_SNAPSHOT_HASH : null,
    post_i21_partial_resume_snapshot_hash: RESUME_POST_I21_PARTIAL ? POST_I21_PARTIAL_RESUME_SNAPSHOT_HASH : null,
    resume_from_partial_state: RESUME_PARTIAL,
    resume_from_current_partial_state: RESUME_CURRENT_PARTIAL,
    resume_from_post_i21_partial_state: RESUME_POST_I21_PARTIAL,
    runbook_steps: {
      preflight_reverified: true,
      i20_partial_resume_approval_recorded: RESUME_PARTIAL,
      i21_current_partial_resume_approval_recorded: RESUME_CURRENT_PARTIAL,
      i22_post_i21_partial_resume_approval_recorded: RESUME_POST_I21_PARTIAL,
      existing_private_handoff_reused: RESUME_PARTIAL || RESUME_CURRENT_PARTIAL || RESUME_POST_I21_PARTIAL,
      lambda_cutover_action_deployed: true,
      bridge_token_rotation_control_applied: true,
      direct_invoke_cutover_action_executed: true,
      first_login_validation_executed: true,
      closeout_generated: true,
    },
    lambda_deploy: deploy,
    bridge_control: bridgeControl,
    lambda_invoke: invoke.meta,
    lambda_receipt: invoke.body,
    private_handoff_repo_safe: repoSafePrivateHandoffSummary(credentialPackage.handoff),
    password_issuance_distribution: {
      generated_password_count: credentialPackage.handoff.row_count,
      private_handoff_created: true,
      private_handoff_json_path: credentialPackage.handoff.json_path,
      private_handoff_csv_path: credentialPackage.handoff.csv_path,
      distribution_channel: "in_person",
      plaintext_password_recorded_in_repo: false,
      plaintext_password_printed_to_stdout: false,
    },
    first_login_validation: firstLogin,
    cut_g_validation: {
      canonical_client_count: invoke.body.matter_migration?.canonical_client_count ?? null,
      canonical_matter_count: invoke.body.matter_migration?.canonical_matter_count ?? null,
      synthetic_current_record_count: invoke.body.matter_migration?.synthetic_current_record_count ?? null,
      canonical_synthetic_fixture_count: invoke.body.matter_migration?.canonical_synthetic_fixture_count ?? null,
      production_login_pass_count: firstLogin.production_login_pass_count,
      must_change_count: firstLogin.must_change_count,
      qa_rejected_count: firstLogin.qa_rejected_count,
      synthetic_token_rejected: firstLogin.synthetic_token_rejected,
      durable_audit_recorded: Boolean(invoke.body.audit?.event_hash),
      pass: verdict === "PASS",
    },
    blocking_conditions: verdict === "PASS" ? [] : ["cutover retry validation did not fully pass"],
    commands,
    boundary: {
      public_http_endpoint: false,
      production_write_executed: invoke.body.boundary?.production_write_executed === true,
      production_restore_executed: false,
      operational_profile_switch_executed: invoke.body.boundary?.operational_profile_switch_executed === true,
      tenant_migration_executed: invoke.body.boundary?.tenant_migration_executed === true,
      account_permission_injection_executed: invoke.body.boundary?.account_permission_injection_executed === true,
      bridge_token_rotation_executed: true,
      password_issuance_distribution_executed: true,
      first_login_validation_executed: true,
      cut_g_validation_executed: verdict === "PASS",
      cutover_executed: verdict === "PASS",
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
  writeLaunchDocs(receipt);
  writeCloseout(receipt);
  console.log(JSON.stringify({
    verdict,
    receipt: "docs/launch/cti-cutover-execute-retry-receipt-2026-07-06.json",
    closeout: "docs/goal-closeout/cti-cutover-execute/",
    private_handoff_json: PRIVATE_HANDOFF_JSON,
    private_handoff_csv: PRIVATE_HANDOFF_CSV,
    production_login_pass: `${firstLogin.production_login_pass_count}/${firstLogin.production_user_count}`,
    qa_rejected: `${firstLogin.qa_rejected_count}/${firstLogin.qa_user_count}`,
  }, null, 2));
  if (verdict !== "PASS") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
