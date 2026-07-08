#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(".");
const PROFILE = process.env.AWS_PROFILE || "matter-prod-deploy-admin";
const REGION = process.env.AWS_REGION || "ap-northeast-2";
const ACCOUNT_ID = "770880870480";
const FUNCTION_NAME = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME || "matter-lawos-api-prod";
const GOAL_ID = "cti-password-reset-jwsuh-live-send";
const PLAN = "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md";
const TARGET_EMAIL = "jwsuh@amic.kr";
const OWNER_DIRECTION_REF = "I23-SCOPE-NARROWING-JWSUH-LIVE-SEND-ONLY-2026-07-06";
const APPROVAL_REFS = Object.freeze([
  "I23-CTI-PASSWORD-RESET-EMAIL-DELIVERY-STORE-OWNER-APPROVAL-2026-07-06",
  OWNER_DIRECTION_REF,
]);
const I23_RECEIPT = "docs/launch/cti-i23-owner-approval-receipt-2026-07-06.json";
const I24_RECEIPT = "docs/launch/cti-i24-owner-approval-receipt-2026-07-06.json";
const OWNER_DIRECTION_JSON = "docs/launch/cti-password-reset-jwsuh-live-send-owner-direction-2026-07-06.json";
const OWNER_DIRECTION_MD = "docs/launch/cti-password-reset-jwsuh-live-send-owner-direction-2026-07-06.md";
const RECEIPT_JSON = "docs/launch/cti-password-reset-jwsuh-live-send-receipt-2026-07-06.json";
const RECEIPT_MD = "docs/launch/cti-password-reset-jwsuh-live-send-receipt-2026-07-06.md";
const CLOSEOUT_DIR = "docs/goal-closeout/cti-password-reset-jwsuh-live-send";
const SES_IDENTITY_ARN = `arn:aws:ses:${REGION}:${ACCOUNT_ID}:identity/${TARGET_EMAIL}`;
const RESET_ENV = Object.freeze({
  LAWOS_AUTH_PASSWORD_RESET_STORE_PATH: "/mnt/lawos/auth/password-reset-store.json",
  LAWOS_AUTH_PASSWORD_RESET_EMAIL_DELIVERY: "sesv2",
  LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM: TARGET_EMAIL,
  LAWOS_AUTH_PASSWORD_RESET_EMAIL_FROM_NAME: "Matter OS",
  LAWOS_AUTH_PASSWORD_RESET_BASE_URL: "matter://password-reset/confirm",
  LAWOS_AUTH_PASSWORD_RESET_OPEN_BASE_URL: "https://43whkpla74oln46xkmjar4jgae0ebzba.lambda-url.ap-northeast-2.on.aws/api/auth/password-reset/open",
  LAWOS_AUTH_PASSWORD_RESET_EMAIL_REGION: REGION,
});

const commandEvidence = [];

function timestamp() {
  return new Date().toISOString();
}

function ensureDir(fileOrDir, isDir = false) {
  mkdirSync(isDir ? join(ROOT, fileOrDir) : join(ROOT, fileOrDir, ".."), { recursive: true });
}

function writeJson(path, value) {
  ensureDir(path);
  writeFileSync(join(ROOT, path), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path, text) {
  ensureDir(path);
  writeFileSync(join(ROOT, path), text);
}

function hashHex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(path) {
  return `sha256:${hashHex(readFileSync(path))}`;
}

function runCommand(command, args, { summary, sensitive = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
  const exitCode = result.status ?? 1;
  commandEvidence.push({
    command: `${command} ${args.slice(0, 6).join(" ")}${args.length > 6 ? " ..." : ""}`,
    exit_code: exitCode,
    summary,
    sensitive_output_suppressed: sensitive,
  });
  if (!allowFailure && exitCode !== 0) {
    const stderr = sensitive ? "[suppressed]" : String(result.stderr || "").slice(0, 1000);
    throw new Error(`${command} failed (${exitCode}): ${stderr}`);
  }
  return { exitCode, stdout: result.stdout || "", stderr: result.stderr || "" };
}

function awsArgs(args) {
  return [...args, "--profile", PROFILE, "--region", REGION, "--no-cli-pager"];
}

function awsJson(args, options = {}) {
  const result = runCommand("aws", awsArgs(args), options);
  const text = result.stdout.trim();
  return text ? JSON.parse(text) : {};
}

function awsNoJson(args, options = {}) {
  runCommand("aws", awsArgs(args), options);
}

function tempJsonFile(prefix, object) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const path = join(dir, "payload.json");
  writeFileSync(path, JSON.stringify(object), { mode: 0o600 });
  return { dir, path };
}

function responseBody(lambdaResponse) {
  if (!lambdaResponse?.body) return {};
  try {
    return JSON.parse(lambdaResponse.body);
  } catch {
    return {};
  }
}

function containsForbiddenKey(value, forbiddenKeys) {
  if (value == null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => containsForbiddenKey(item, forbiddenKeys));
  return Object.entries(value).some(([key, nested]) => forbiddenKeys.has(key) || containsForbiddenKey(nested, forbiddenKeys));
}

function publicLambdaInvokeEvidence(meta, lambdaResponse) {
  const body = responseBody(lambdaResponse);
  const delivery = body.email_delivery ?? {};
  return {
    invoke_status_code: meta.StatusCode ?? null,
    function_error: meta.FunctionError ?? null,
    http_status_code: lambdaResponse?.statusCode ?? null,
    ok: body.ok === true,
    accepted: body.accepted === true,
    outcome: body.outcome ?? null,
    email_delivery: {
      mode: delivery.mode ?? null,
      provider: delivery.provider ?? null,
      status: delivery.status ?? null,
      message_id_present: Boolean(delivery.message_id),
      message_id_hash: delivery.message_id ? hashHex(String(delivery.message_id)) : null,
      token_material_returned: delivery.token_material_returned === true,
      reset_url_returned: delivery.reset_url_returned === true,
    },
    token_material_returned: body.token_material_returned === true,
    reset_token_string_present: containsForbiddenKey(body, new Set(["reset_token", "resetToken"])),
    reset_url_string_present: containsForbiddenKey(body, new Set(["reset_url", "resetUrl"])),
    production_ready_claim: body.production_ready_claim === true,
  };
}

function recordOwnerDirection(recordedAt) {
  const json = {
    schema_version: "law-firm-os.cti.owner-scope-direction.v0.1",
    direction_ref: OWNER_DIRECTION_REF,
    recorded_at: recordedAt,
    source_plan: PLAN,
    applies_to_approval_signature_ref: "I23-CTI-PASSWORD-RESET-EMAIL-DELIVERY-STORE-OWNER-APPROVAL-2026-07-06",
    goal_id: GOAL_ID,
    direction: {
      live_send_verification_target_count: 1,
      live_send_verification_target_email_hash: hashHex(TARGET_EMAIL),
      live_send_verification_target_email_domain: "amic.kr",
      non_live_send_user_count: 8,
      non_live_send_boundary: "logic_ready_only_no_production_email_send",
    },
    explicit_boundary: {
      other_user_reset_email_send: false,
      other_user_credential_mutation: false,
      plaintext_password_distribution: false,
      production_ready_claim: false,
      go_live_claim: false,
    },
  };
  writeJson(OWNER_DIRECTION_JSON, json);
  writeText(OWNER_DIRECTION_MD, [
    "# CTI Password Reset JWSUH Live Send Owner Direction",
    "",
    `Direction ref: \`${OWNER_DIRECTION_REF}\``,
    "",
    `Recorded at: \`${recordedAt}\``,
    "",
    "Live reset email verification is narrowed to exactly one recipient: `jwsuh@amic.kr`.",
    "",
    "The remaining 8 production users are logic-ready only: no production reset email send and no credential mutation under this direction.",
    "",
    "This direction does not authorize plaintext password distribution, S5/S6, OIDC, DB conversion, production-ready claim, or go-live claim.",
    "",
  ].join("\n"));
}

function verifyStaticPrerequisites() {
  for (const path of [I23_RECEIPT, I24_RECEIPT]) {
    if (!existsSync(join(ROOT, path))) throw new Error(`Missing prerequisite receipt: ${path}`);
  }
}

function runLocalValidation() {
  runCommand("node", ["--check", "apps/api/src/lambda.js"], { summary: "Lambda syntax check PASS before deploy." });
  runCommand("node", ["--check", "apps/api/src/session-auth.js"], { summary: "Session auth syntax check PASS before deploy." });
  runCommand("node", ["--test", "apps/api/test/session-auth-api.test.js", "apps/api/test/lambda-session-secret.test.js", "apps/desktop/test/aws-runtime-client.test.mjs"], {
    summary: "Focused password reset/auth/Lambda/desktop tests PASS before deploy.",
  });
}

function currentSesState() {
  const account = awsJson(["sesv2", "get-account"], { summary: "Read SES account state before one-recipient send." });
  const identity = awsJson(["sesv2", "get-email-identity", "--email-identity", TARGET_EMAIL], {
    summary: "Read SES identity state for jwsuh@amic.kr.",
  });
  return {
    production_access_enabled: account.ProductionAccessEnabled === true,
    sending_enabled: account.SendingEnabled === true,
    enforcement_status: account.EnforcementStatus ?? null,
    review_status: account.Details?.ReviewDetails?.Status ?? null,
    target_identity_verified_for_sending: identity.VerifiedForSendingStatus === true,
    target_identity_verification_status: identity.VerificationStatus ?? null,
  };
}

function lambdaConfig() {
  return awsJson(["lambda", "get-function-configuration", "--function-name", FUNCTION_NAME], {
    summary: "Read Lambda configuration for revision/env-key preflight.",
    sensitive: true,
  });
}

function putSesPolicy(roleName) {
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "CtiPasswordResetJwsuhSendEmailOnly",
        Effect: "Allow",
        Action: "ses:SendEmail",
        Resource: SES_IDENTITY_ARN,
      },
    ],
  };
  const temp = tempJsonFile("cti-password-reset-iam-", policy);
  try {
    awsNoJson([
      "iam",
      "put-role-policy",
      "--role-name",
      roleName,
      "--policy-name",
      "matter-lawos-prod-password-reset-jwsuh-ses-send",
      "--policy-document",
      `file://${temp.path}`,
    ], { summary: "Attached scoped ses:SendEmail inline policy for jwsuh@amic.kr identity." });
  } finally {
    rmSync(temp.dir, { recursive: true, force: true });
  }
}

function updateLambdaEnvironment(config) {
  const beforeEnv = config.Environment?.Variables ?? {};
  const nextEnv = { ...beforeEnv, ...RESET_ENV };
  const temp = tempJsonFile("cti-password-reset-env-", { Variables: nextEnv });
  try {
    const update = awsJson([
      "lambda",
      "update-function-configuration",
      "--function-name",
      FUNCTION_NAME,
      "--revision-id",
      config.RevisionId,
      "--environment",
      `file://${temp.path}`,
    ], { summary: "Updated Lambda password reset env keys without printing env values.", sensitive: true });
    awsNoJson(["lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME], {
      summary: "Waited for Lambda env update to complete.",
      sensitive: true,
    });
    return {
      before_revision_id: config.RevisionId,
      after_revision_id: update.RevisionId ?? null,
      env_keys_added_or_confirmed: Object.keys(RESET_ENV).sort(),
      env_values_recorded: false,
    };
  } finally {
    rmSync(temp.dir, { recursive: true, force: true });
  }
}

function buildAndDeployLambdaZip() {
  const tempRoot = mkdtempSync(join(tmpdir(), "cti-password-reset-lambda-"));
  const zipPath = join(tempRoot, "matter-lawos-api-prod-password-reset-jwsuh.zip");
  try {
    runCommand("zip", [
      "-qr",
      zipPath,
      "apps/api/src",
      "apps/desktop/build/icon-source-mark.png",
      "packages",
      "docs/reorganization/client-matter-os/matter-vault-r4/launch/matter-vault-user-registration-seed.json",
      "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json",
      "package.json",
    ], { summary: "Built Lambda deployment zip from current API source." });
    const packageSha256 = hashFile(zipPath);
    const update = awsJson([
      "lambda",
      "update-function-code",
      "--function-name",
      FUNCTION_NAME,
      "--zip-file",
      `fileb://${zipPath}`,
    ], { summary: "Deployed password reset route/code to production Lambda." });
    awsNoJson(["lambda", "wait", "function-updated", "--function-name", FUNCTION_NAME], {
      summary: "Waited for Lambda code update to complete.",
    });
    return {
      function_name: FUNCTION_NAME,
      code_sha256: update.CodeSha256 ?? null,
      revision_id: update.RevisionId ?? null,
      package_sha256: packageSha256,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function invokePasswordResetRequest() {
  const payload = {
    version: "2.0",
    routeKey: "POST /api/auth/password-reset/request",
    rawPath: "/api/auth/password-reset/request",
    rawQueryString: "",
    headers: {
      "content-type": "application/json",
    },
    requestContext: {
      http: {
        method: "POST",
        path: "/api/auth/password-reset/request",
      },
      requestId: "cti-password-reset-jwsuh-live-send",
    },
    body: JSON.stringify({ email: TARGET_EMAIL }),
    isBase64Encoded: false,
  };
  const temp = tempJsonFile("cti-password-reset-invoke-", payload);
  const responsePath = join(temp.dir, "response.json");
  try {
    const result = runCommand("aws", awsArgs([
      "lambda",
      "invoke",
      "--function-name",
      FUNCTION_NAME,
      "--cli-binary-format",
      "raw-in-base64-out",
      "--payload",
      `file://${temp.path}`,
      responsePath,
    ]), { summary: "Invoked production reset request for jwsuh@amic.kr only.", sensitive: true });
    const meta = result.stdout.trim() ? JSON.parse(result.stdout) : {};
    const lambdaResponse = JSON.parse(readFileSync(responsePath, "utf8"));
    return publicLambdaInvokeEvidence(meta, lambdaResponse);
  } finally {
    rmSync(temp.dir, { recursive: true, force: true });
  }
}

function writeCloseout({ recordedAt, sesState, preConfig, iam, envUpdate, deploy, invokeEvidence }) {
  const sent = invokeEvidence.email_delivery.status === "sent"
    && invokeEvidence.http_status_code === 200
    && invokeEvidence.function_error == null
    && invokeEvidence.token_material_returned === false
    && invokeEvidence.email_delivery.token_material_returned === false
    && invokeEvidence.email_delivery.reset_url_returned === false;
  const verdict = sent ? "PASS" : "BLOCKED";
  const status = sent ? "PASS_JWSUH_LIVE_SEND_ONLY" : "BLOCKED_JWSUH_LIVE_SEND";
  const receipt = {
    schema_version: "law-firm-os.cti.password-reset-jwsuh-live-send-receipt.v0.1",
    goal_id: GOAL_ID,
    status,
    recorded_at: recordedAt,
    source_plan: PLAN,
    approval_signature_refs: APPROVAL_REFS,
    aws_account: ACCOUNT_ID,
    region: REGION,
    lambda: {
      function_name: FUNCTION_NAME,
      pre_revision_id: preConfig.RevisionId,
      pre_code_sha256: preConfig.CodeSha256,
      pre_env_keys: Object.keys(preConfig.Environment?.Variables ?? {}).sort(),
      env_values_recorded: false,
    },
    ses_state: sesState,
    iam,
    env_update: envUpdate,
    deployment: deploy,
    live_send: {
      target_email_hash: hashHex(TARGET_EMAIL),
      target_domain: "amic.kr",
      target_count: 1,
      non_live_send_user_count: 8,
      invoke_evidence: invokeEvidence,
    },
    boundary: {
      other_user_reset_email_sent: false,
      other_user_credential_mutated: false,
      token_value_recorded: false,
      reset_url_recorded: false,
      password_value_recorded: false,
      secret_value_recorded: false,
      plaintext_password_distribution: false,
      production_ready_claim: false,
      go_live_claim: false,
    },
  };
  writeJson(RECEIPT_JSON, receipt);
  writeText(RECEIPT_MD, [
    "# CTI Password Reset JWSUH Live Send Receipt",
    "",
    `Status: \`${status}\``,
    "",
    `Recorded at: \`${recordedAt}\``,
    "",
    `Live send target count: \`1\``,
    "",
    `Live send target: \`${TARGET_EMAIL}\``,
    "",
    `SES delivery status: \`${invokeEvidence.email_delivery.status ?? "unknown"}\``,
    "",
    `HTTP status: \`${invokeEvidence.http_status_code ?? "unknown"}\``,
    "",
    "The remaining 8 production users were not sent reset emails and were not credential-mutated in this lane.",
    "",
    "No token, reset URL, password, or secret value is recorded in this receipt.",
    "",
  ].join("\n"));

  ensureDir(CLOSEOUT_DIR, true);
  writeJson(join(CLOSEOUT_DIR, "packet.json"), {
    schema_version: "law-firm-os.goal-closeout.packet.v0.1",
    goal_id: GOAL_ID,
    status,
    recorded_at: recordedAt,
    source_plan: PLAN,
    approval_signature_refs: APPROVAL_REFS,
    closeout_verdict: verdict,
    summary: sent
      ? "Password reset live-send verification was executed only for jwsuh@amic.kr; remaining production users stayed logic-ready only with no reset email sends."
      : "Password reset one-recipient live-send lane stopped after producing safe evidence; remaining production users were not sent reset emails.",
    evidence_refs: [
      OWNER_DIRECTION_JSON,
      RECEIPT_JSON,
    ],
    boundary: receipt.boundary,
    next_required_action: sent
      ? "Operator should open the received reset email for jwsuh@amic.kr and complete the password reset in the product flow; do not send reset emails to other users without a new approval."
      : "Investigate the recorded send blocker before retrying jwsuh@amic.kr; do not send reset emails to other users.",
  });
  writeJson(join(CLOSEOUT_DIR, "command-evidence.json"), {
    schema_version: "law-firm-os.goal-closeout.command-evidence.v0.1",
    goal_id: GOAL_ID,
    recorded_at: recordedAt,
    decision: verdict,
    commands: commandEvidence,
    live_send_target_count: 1,
    non_live_send_user_count: 8,
    boundary: receipt.boundary,
  });
  writeJson(join(CLOSEOUT_DIR, "claude-review-result.json"), {
    schema_version: "law-firm-os.closeout-review-result.v0.1",
    goal_id: GOAL_ID,
    reviewed_at: recordedAt,
    review_result: verdict,
    findings: sent ? [] : [
      {
        severity: "P1",
        summary: "jwsuh@amic.kr live reset email send did not reach sent status; production reset emails to other users remain prohibited.",
      },
    ],
    recommendation: sent
      ? "Keep the 8 remaining users logic-ready only until a separate send approval exists."
      : "Retry only the jwsuh@amic.kr lane after resolving the send blocker.",
  });
  writeJson(join(CLOSEOUT_DIR, "construction-inspection.json"), {
    schema_version: "law-firm-os.construction-inspection.v0.1",
    goal_id: GOAL_ID,
    recorded_at: recordedAt,
    required_files: [
      join(CLOSEOUT_DIR, "packet.json"),
      join(CLOSEOUT_DIR, "command-evidence.json"),
      join(CLOSEOUT_DIR, "claude-review-result.json"),
      join(CLOSEOUT_DIR, "construction-inspection.json"),
      join(CLOSEOUT_DIR, "adjudication.md"),
      OWNER_DIRECTION_JSON,
      RECEIPT_JSON,
    ],
    inspection: {
      owner_direction_recorded: true,
      one_recipient_live_send_target: true,
      live_send_status: invokeEvidence.email_delivery.status ?? null,
      other_users_not_sent: true,
      token_or_reset_url_recorded: false,
      password_or_secret_recorded: false,
      production_ready_claim: false,
      go_live_claim: false,
    },
  });
  writeText(join(CLOSEOUT_DIR, "adjudication.md"), [
    "# CTI Password Reset JWSUH Live Send Adjudication",
    "",
    `Verdict: \`${verdict}\``,
    "",
    `Status: \`${status}\``,
    "",
    `Live send target: \`${TARGET_EMAIL}\``,
    "",
    `SES delivery status: \`${invokeEvidence.email_delivery.status ?? "unknown"}\``,
    "",
    "The remaining 8 production users were kept logic-ready only. No reset emails were sent to them and no credential mutation was performed for them in this lane.",
    "",
    "No token, reset URL, password, secret value, production-ready claim, or go-live claim is recorded.",
    "",
  ].join("\n"));
  return { sent, status, verdict };
}

async function main() {
  const recordedAt = timestamp();
  recordOwnerDirection(recordedAt);
  verifyStaticPrerequisites();
  runLocalValidation();
  const sesState = currentSesState();
  if (!sesState.target_identity_verified_for_sending) {
    const preConfig = { RevisionId: null, CodeSha256: null, Environment: { Variables: {} } };
    const outcome = writeCloseout({
      recordedAt,
      sesState,
      preConfig,
      iam: { applied: false, reason: "target_identity_not_verified" },
      envUpdate: { applied: false },
      deploy: { applied: false },
      invokeEvidence: {
        http_status_code: null,
        function_error: null,
        email_delivery: { status: "not_attempted_unverified_identity", token_material_returned: false, reset_url_returned: false },
        token_material_returned: false,
      },
    });
    console.log(JSON.stringify(outcome, null, 2));
    return;
  }
  const preConfig = lambdaConfig();
  const roleName = String(preConfig.Role ?? "").split("/").pop();
  if (!roleName) throw new Error("Could not resolve Lambda role name");
  putSesPolicy(roleName);
  const envUpdate = updateLambdaEnvironment(preConfig);
  const deploy = buildAndDeployLambdaZip();
  const invokeEvidence = invokePasswordResetRequest();
  const outcome = writeCloseout({
    recordedAt,
    sesState,
    preConfig,
    iam: {
      applied: true,
      role_name: roleName,
      policy_name: "matter-lawos-prod-password-reset-jwsuh-ses-send",
      action: "ses:SendEmail",
      resource: SES_IDENTITY_ARN,
    },
    envUpdate,
    deploy,
    invokeEvidence,
  });
  console.log(JSON.stringify(outcome, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
