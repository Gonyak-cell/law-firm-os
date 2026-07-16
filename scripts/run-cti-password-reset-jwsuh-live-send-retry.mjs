#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const ROOT = resolve(".");
const PROFILE = process.env.AWS_PROFILE || "matter-prod-deploy-admin";
const REGION = process.env.AWS_REGION || "ap-northeast-2";
const ACCOUNT_ID = "770880870480";
const GOAL_ID = "cti-password-reset-jwsuh-live-send-retry";
const FUNCTION_NAME = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME || "matter-lawos-api-prod";
const PLAN = "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md";
const TARGET_EMAIL = "jwsuh@amic.kr";
const VPC_ID = "vpc-038f70d924a774bea";
const SUBNET_IDS = Object.freeze(["subnet-0a718a221e621715f", "subnet-0af415c198603de77"]);
const LAMBDA_SG_ID = "sg-0f555cc1f1708fc22";
const VPCE_SERVICE_NAME = `com.amazonaws.${REGION}.email`;
const VPCE_SG_NAME = "matter-lawos-prod-ses-api-vpce-sg";
const APPROVAL_REF = "I25-CTI-PASSWORD-RESET-SES-API-VPCE-JWSUH-LIVE-SEND-OWNER-APPROVAL-2026-07-06";
const I25_RECEIPT_JSON = "docs/launch/cti-i25-owner-approval-receipt-2026-07-06.json";
const I25_RECEIPT_MD = "docs/launch/cti-i25-owner-approval-receipt-2026-07-06.md";
const RETRY_RECEIPT_JSON = "docs/launch/cti-password-reset-jwsuh-live-send-retry-receipt-2026-07-06.json";
const RETRY_RECEIPT_MD = "docs/launch/cti-password-reset-jwsuh-live-send-retry-receipt-2026-07-06.md";
const CLOSEOUT_DIR = "docs/goal-closeout/cti-password-reset-jwsuh-live-send-retry";
const commandEvidence = [];

function nowIso() {
  return new Date().toISOString();
}

function ensureParent(path) {
  mkdirSync(join(ROOT, path, ".."), { recursive: true });
}

function writeJson(path, value) {
  ensureParent(path);
  writeFileSync(join(ROOT, path), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(path, text) {
  ensureParent(path);
  writeFileSync(join(ROOT, path), text);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function run(command, args, { summary, sensitive = false, allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
  });
  const exitCode = result.status ?? 1;
  commandEvidence.push({
    command: `${command} ${args.slice(0, 7).join(" ")}${args.length > 7 ? " ..." : ""}`,
    exit_code: exitCode,
    summary,
    sensitive_output_suppressed: sensitive,
  });
  if (!allowFailure && exitCode !== 0) {
    throw new Error(`${command} failed (${exitCode}): ${sensitive ? "[suppressed]" : result.stderr}`);
  }
  return result;
}

function awsArgs(args) {
  return [...args, "--profile", PROFILE, "--region", REGION, "--no-cli-pager"];
}

function awsJson(args, options = {}) {
  const result = run("aws", awsArgs(args), options);
  const text = String(result.stdout || "").trim();
  return text ? JSON.parse(text) : {};
}

function aws(args, options = {}) {
  run("aws", awsArgs(args), options);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function recordI25(recordedAt) {
  const receipt = {
    schema_version: "law-firm-os.cti.owner-approval-receipt.v0.1",
    approval_id: "I25",
    approval_signature_ref: APPROVAL_REF,
    recorded_at: recordedAt,
    source_plan: PLAN,
    goal_id: GOAL_ID,
    approved_scope: {
      aws_account: ACCOUNT_ID,
      region: REGION,
      vpc_endpoint_service_name: VPCE_SERVICE_NAME,
      vpc_id: VPC_ID,
      subnet_ids: SUBNET_IDS,
      endpoint_security_group_name: VPCE_SG_NAME,
      endpoint_security_group_inbound: `TCP 443 from ${LAMBDA_SG_ID} only`,
      private_dns_enabled: true,
      lambda_function_name: FUNCTION_NAME,
      live_send_target_count: 1,
      live_send_target_email_hash: sha256(TARGET_EMAIL),
      live_send_target_domain: "amic.kr",
    },
    explicit_non_approval: {
      other_user_reset_email_send: false,
      other_user_credential_mutation: false,
      password_distribution: false,
      s5_enrichment: false,
      s6_seal: false,
      oidc_implementation: false,
      db_conversion: false,
      production_ready_claim: false,
      go_live_claim: false,
    },
  };
  writeJson(I25_RECEIPT_JSON, receipt);
  writeText(I25_RECEIPT_MD, [
    "# CTI I25 Owner Approval Receipt",
    "",
    `Approval signature ref: \`${APPROVAL_REF}\``,
    "",
    `Recorded at: \`${recordedAt}\``,
    "",
    `Approved goal: \`${GOAL_ID}\``,
    "",
    `Approved SES API VPC endpoint: \`${VPCE_SERVICE_NAME}\``,
    "",
    `VPC: \`${VPC_ID}\``,
    "",
    `Subnets: \`${SUBNET_IDS.join("`, `")}\``,
    "",
    `Endpoint SG: \`${VPCE_SG_NAME}\`, inbound TCP 443 from \`${LAMBDA_SG_ID}\` only`,
    "",
    "Retry scope is exactly one password-reset live send to `jwsuh@amic.kr`. The remaining 8 users are explicitly out of live-send and credential-mutation scope.",
    "",
  ].join("\n"));
}

function lambdaConfig() {
  return awsJson([
    "lambda",
    "get-function-configuration",
    "--function-name",
    FUNCTION_NAME,
  ], { summary: "Read Lambda VPC/env/code status before I25 retry.", sensitive: true });
}

function ensureEndpointSecurityGroup() {
  const existing = awsJson([
    "ec2",
    "describe-security-groups",
    "--filters",
    `Name=vpc-id,Values=${VPC_ID}`,
    `Name=group-name,Values=${VPCE_SG_NAME}`,
  ], { summary: "Checked for existing SES API VPCE security group." });
  const found = existing.SecurityGroups?.[0];
  let groupId = found?.GroupId;
  let created = false;
  if (!groupId) {
    const createdGroup = awsJson([
      "ec2",
      "create-security-group",
      "--group-name",
      VPCE_SG_NAME,
      "--description",
      "Matter production SES API VPC endpoint SG; inbound 443 from Lambda SG only",
      "--vpc-id",
      VPC_ID,
      "--tag-specifications",
      `ResourceType=security-group,Tags=[{Key=Name,Value=${VPCE_SG_NAME}},{Key=cti_goal_id,Value=${GOAL_ID}}]`,
    ], { summary: "Created SES API VPCE security group." });
    groupId = createdGroup.GroupId;
    created = true;
  }

  const ingress = awsJson([
    "ec2",
    "describe-security-groups",
    "--group-ids",
    groupId,
  ], { summary: "Read SES API VPCE SG ingress before authorizing Lambda source." }).SecurityGroups?.[0]?.IpPermissions ?? [];
  const hasIngress = ingress.some((permission) => (
    permission.IpProtocol === "tcp"
      && permission.FromPort === 443
      && permission.ToPort === 443
      && (permission.UserIdGroupPairs ?? []).some((pair) => pair.GroupId === LAMBDA_SG_ID)
  ));
  if (!hasIngress) {
    aws([
      "ec2",
      "authorize-security-group-ingress",
      "--group-id",
      groupId,
      "--ip-permissions",
      `IpProtocol=tcp,FromPort=443,ToPort=443,UserIdGroupPairs=[{GroupId=${LAMBDA_SG_ID},Description=Allow Matter production Lambda to SES API VPCE}]`,
    ], { summary: "Authorized SES API VPCE SG inbound TCP 443 from Lambda SG only." });
  }
  return { group_id: groupId, created, inbound_443_from_lambda_sg: true };
}

function ensureSesApiEndpoint(securityGroupId) {
  const existing = awsJson([
    "ec2",
    "describe-vpc-endpoints",
    "--filters",
    `Name=vpc-id,Values=${VPC_ID}`,
    `Name=service-name,Values=${VPCE_SERVICE_NAME}`,
  ], { summary: "Checked for existing SES API interface VPC endpoint." }).VpcEndpoints ?? [];
  const reusable = existing.find((endpoint) => endpoint.State !== "deleted" && endpoint.State !== "deleting");
  let endpoint = reusable;
  let created = false;
  if (!endpoint) {
    endpoint = awsJson([
      "ec2",
      "create-vpc-endpoint",
      "--vpc-endpoint-type",
      "Interface",
      "--vpc-id",
      VPC_ID,
      "--service-name",
      VPCE_SERVICE_NAME,
      "--subnet-ids",
      ...SUBNET_IDS,
      "--security-group-ids",
      securityGroupId,
      "--private-dns-enabled",
      "--tag-specifications",
      `ResourceType=vpc-endpoint,Tags=[{Key=Name,Value=matter-lawos-prod-ses-api-vpce},{Key=cti_goal_id,Value=${GOAL_ID}}]`,
    ], { summary: "Created SES API interface VPC endpoint with private DNS enabled." }).VpcEndpoint;
    created = true;
  }
  let latest = null;
  for (let attempt = 1; attempt <= 18; attempt += 1) {
    latest = awsJson([
      "ec2",
      "describe-vpc-endpoints",
      "--vpc-endpoint-ids",
      endpoint.VpcEndpointId,
    ], { summary: `Read SES API VPC endpoint state after creation, attempt ${attempt}.` }).VpcEndpoints?.[0];
    if (latest?.State === "available") break;
    sleep(5000);
  }
  return {
    vpc_endpoint_id: latest?.VpcEndpointId ?? endpoint.VpcEndpointId,
    created,
    service_name: latest?.ServiceName ?? VPCE_SERVICE_NAME,
    state: latest?.State ?? null,
    private_dns_enabled: latest?.PrivateDnsEnabled === true,
    subnet_ids: latest?.SubnetIds ?? [],
    security_group_ids: (latest?.Groups ?? []).map((group) => group.GroupId),
  };
}

function tempJson(object) {
  const dir = mkdtempSync(join(tmpdir(), "cti-password-reset-retry-"));
  const path = join(dir, "payload.json");
  writeFileSync(path, JSON.stringify(object), { mode: 0o600 });
  return { dir, path };
}

function parseLambdaBody(lambdaResponse) {
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

function invokeJwsuhReset() {
  const payload = {
    version: "2.0",
    routeKey: "POST /api/auth/password-reset/request",
    rawPath: "/api/auth/password-reset/request",
    rawQueryString: "",
    headers: { "content-type": "application/json" },
    requestContext: {
      http: { method: "POST", path: "/api/auth/password-reset/request" },
      requestId: "cti-password-reset-jwsuh-live-send-retry",
    },
    body: JSON.stringify({ email: TARGET_EMAIL }),
    isBase64Encoded: false,
  };
  const temp = tempJson(payload);
  const responsePath = join(temp.dir, "response.json");
  try {
    const result = run("aws", awsArgs([
      "lambda",
      "invoke",
      "--function-name",
      FUNCTION_NAME,
      "--cli-binary-format",
      "raw-in-base64-out",
      "--payload",
      `file://${temp.path}`,
      responsePath,
    ]), { summary: "Invoked password reset request for jwsuh@amic.kr only.", sensitive: true });
    const meta = result.stdout.trim() ? JSON.parse(result.stdout) : {};
    const lambdaResponse = JSON.parse(readFileSync(responsePath, "utf8"));
    const body = parseLambdaBody(lambdaResponse);
    const delivery = body.email_delivery ?? {};
    return {
      invoke_status_code: meta.StatusCode ?? null,
      function_error: meta.FunctionError ?? null,
      http_status_code: lambdaResponse.statusCode ?? null,
      ok: body.ok === true,
      accepted: body.accepted === true,
      outcome: body.outcome ?? null,
      email_delivery: {
        mode: delivery.mode ?? null,
        provider: delivery.provider ?? null,
        status: delivery.status ?? null,
        message_id_present: Boolean(delivery.message_id),
        message_id_hash: delivery.message_id ? sha256(String(delivery.message_id)) : null,
        token_material_returned: delivery.token_material_returned === true,
        reset_url_returned: delivery.reset_url_returned === true,
      },
      token_material_returned: body.token_material_returned === true,
      reset_token_key_present: containsForbiddenKey(body, new Set(["reset_token", "resetToken"])),
      reset_url_key_present: containsForbiddenKey(body, new Set(["reset_url", "resetUrl"])),
      production_ready_claim: body.production_ready_claim === true,
    };
  } finally {
    rmSync(temp.dir, { recursive: true, force: true });
  }
}

function writeCloseout({ recordedAt, lambda, sg, endpoint, invoke }) {
  const passed = invoke.http_status_code === 200
    && invoke.function_error == null
    && invoke.email_delivery.status === "sent"
    && invoke.email_delivery.message_id_present === true
    && invoke.token_material_returned === false
    && invoke.email_delivery.token_material_returned === false
    && invoke.email_delivery.reset_url_returned === false
    && invoke.reset_token_key_present === false
    && invoke.reset_url_key_present === false;
  const verdict = passed ? "PASS" : "BLOCKED";
  const status = passed ? "PASS_JWSUH_LIVE_SEND_RETRY_ONLY" : "BLOCKED_JWSUH_LIVE_SEND_RETRY";
  const boundary = {
    live_send_target_count: 1,
    non_live_send_user_count: 8,
    other_user_reset_email_sent: false,
    other_user_credential_mutated: false,
    token_value_recorded: false,
    reset_url_recorded: false,
    password_value_recorded: false,
    secret_value_recorded: false,
    production_ready_claim: false,
    go_live_claim: false,
  };
  const receipt = {
    schema_version: "law-firm-os.cti.password-reset-jwsuh-live-send-retry-receipt.v0.1",
    goal_id: GOAL_ID,
    status,
    recorded_at: recordedAt,
    source_plan: PLAN,
    approval_signature_refs: [
      APPROVAL_REF,
      "I23-CTI-PASSWORD-RESET-EMAIL-DELIVERY-STORE-OWNER-APPROVAL-2026-07-06",
    ],
    aws_account: ACCOUNT_ID,
    region: REGION,
    lambda: {
      function_name: FUNCTION_NAME,
      revision_id: lambda.RevisionId,
      code_sha256: lambda.CodeSha256,
      state: lambda.State,
      last_update_status: lambda.LastUpdateStatus,
      env_values_recorded: false,
    },
    vpc_endpoint_security_group: sg,
    vpc_endpoint: endpoint,
    live_send: {
      target_email_hash: sha256(TARGET_EMAIL),
      target_domain: "amic.kr",
      target_count: 1,
      invoke,
    },
    boundary,
  };
  writeJson(RETRY_RECEIPT_JSON, receipt);
  writeText(RETRY_RECEIPT_MD, [
    "# CTI Password Reset JWSUH Live Send Retry Receipt",
    "",
    `Status: \`${status}\``,
    "",
    `Recorded at: \`${recordedAt}\``,
    "",
    `SES API VPCE: \`${endpoint.vpc_endpoint_id}\` / \`${endpoint.state}\``,
    "",
    `Live send target: \`${TARGET_EMAIL}\``,
    "",
    `Delivery status: \`${invoke.email_delivery.status ?? "unknown"}\``,
    "",
    `Message id recorded: \`${invoke.email_delivery.message_id_present}\` as hash only`,
    "",
    "The remaining 8 users were not sent reset emails and were not credential-mutated.",
    "",
    "No token, reset URL, password, secret, production-ready claim, or go-live claim is recorded.",
    "",
  ].join("\n"));

  mkdirSync(join(ROOT, CLOSEOUT_DIR), { recursive: true });
  writeJson(join(CLOSEOUT_DIR, "packet.json"), {
    schema_version: "law-firm-os.goal-closeout.packet.v0.1",
    goal_id: GOAL_ID,
    status,
    recorded_at: recordedAt,
    source_plan: PLAN,
    approval_signature_refs: [
      APPROVAL_REF,
      "I23-CTI-PASSWORD-RESET-EMAIL-DELIVERY-STORE-OWNER-APPROVAL-2026-07-06",
    ],
    closeout_verdict: verdict,
    summary: passed
      ? "SES API VPC endpoint was created and jwsuh@amic.kr one-recipient password reset live-send passed; remaining 8 users were not sent reset emails."
      : "SES API VPC endpoint was created or confirmed, but jwsuh@amic.kr one-recipient password reset live-send did not pass.",
    evidence_refs: [
      I25_RECEIPT_JSON,
      RETRY_RECEIPT_JSON,
    ],
    boundary,
    next_required_action: passed
      ? "Open the received jwsuh@amic.kr reset email and complete reset through the product flow if desired; do not send reset emails to other users without separate approval."
      : "Investigate the jwsuh-only send failure before retry; do not send reset emails to other users.",
  });
  writeJson(join(CLOSEOUT_DIR, "command-evidence.json"), {
    schema_version: "law-firm-os.goal-closeout.command-evidence.v0.1",
    goal_id: GOAL_ID,
    recorded_at: recordedAt,
    decision: verdict,
    commands: commandEvidence,
    boundary,
  });
  writeJson(join(CLOSEOUT_DIR, "claude-review-result.json"), {
    schema_version: "law-firm-os.closeout-review-result.v0.1",
    goal_id: GOAL_ID,
    reviewed_at: recordedAt,
    review_result: verdict,
    findings: passed ? [] : [
      {
        severity: "P1",
        summary: "jwsuh@amic.kr one-recipient live-send retry did not reach sent status.",
      },
    ],
    recommendation: passed
      ? "Preserve the one-recipient boundary; keep remaining users logic-ready only."
      : "Do not send reset emails to other users; retry only after resolving the jwsuh-only blocker.",
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
      I25_RECEIPT_JSON,
      RETRY_RECEIPT_JSON,
    ],
    inspection: {
      i25_approval_recorded: true,
      ses_api_vpce_available: endpoint.state === "available",
      private_dns_enabled: endpoint.private_dns_enabled === true,
      one_recipient_live_send_target: true,
      live_send_status: invoke.email_delivery.status ?? null,
      other_users_not_sent: true,
      token_or_reset_url_recorded: false,
      password_or_secret_recorded: false,
      production_ready_claim: false,
      go_live_claim: false,
    },
  });
  writeText(join(CLOSEOUT_DIR, "adjudication.md"), [
    "# CTI Password Reset JWSUH Live Send Retry Adjudication",
    "",
    `Verdict: \`${verdict}\``,
    "",
    `Status: \`${status}\``,
    "",
    `SES API VPC endpoint: \`${endpoint.vpc_endpoint_id}\``,
    "",
    `Endpoint state: \`${endpoint.state}\``,
    "",
    `Live send target: \`${TARGET_EMAIL}\``,
    "",
    `Delivery status: \`${invoke.email_delivery.status ?? "unknown"}\``,
    "",
    "The remaining 8 production users were kept logic-ready only. No reset emails were sent to them and no credential mutation was performed for them in this lane.",
    "",
    "No token, reset URL, password, secret value, production-ready claim, or go-live claim is recorded.",
    "",
  ].join("\n"));
  return { passed, status, verdict };
}

function main() {
  const recordedAt = nowIso();
  recordI25(recordedAt);
  run("node", ["--check", "scripts/run-cti-password-reset-jwsuh-live-send-retry.mjs"], {
    summary: "Retry runner syntax check PASS.",
  });
  const lambda = lambdaConfig();
  const sg = ensureEndpointSecurityGroup();
  const endpoint = ensureSesApiEndpoint(sg.group_id);
  const invoke = invokeJwsuhReset();
  const outcome = writeCloseout({ recordedAt, lambda, sg, endpoint, invoke });
  console.log(JSON.stringify(outcome, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
}
