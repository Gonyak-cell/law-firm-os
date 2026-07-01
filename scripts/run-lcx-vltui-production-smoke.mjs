#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { readLambdaEnvironmentWithSsoAutoLogin } from "./lib/aws-sso-lambda-env.mjs";

const BASE_URL = (process.env.LAWOS_PRODUCTION_BASE_URL ?? "https://d2mthcc8vp3cr2.cloudfront.net").replace(/\/+$/, "");
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-production-smoke-2026-06-29.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-production-smoke-2026-06-29.md`;
const AWS_PROFILE = process.env.LAWOS_VAULT_BRIDGE_AWS_PROFILE ?? process.env.AWS_PROFILE ?? "matter-prod-deploy-admin";
const AWS_SSO_LOGIN_PROFILE = process.env.LAWOS_VAULT_BRIDGE_SSO_LOGIN_PROFILE ?? "amic-vault-staging-admin";
const AWS_REGION = process.env.LAWOS_AWS_REGION ?? process.env.AWS_REGION ?? "ap-northeast-2";
const API_LAMBDA_FUNCTION = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME ?? "matter-lawos-api-prod";
const BRIDGE_TOKEN_INFO = resolveBridgeToken();
const BRIDGE_TOKEN = BRIDGE_TOKEN_INFO.token;
const COMMIT = process.env.LAWOS_DEPLOYMENT_COMMIT ?? BRIDGE_TOKEN_INFO.deploymentCommit ?? "unknown";

const PERMISSION_HEADER = "x-lawos-permission-context";

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function resolveBridgeToken() {
  const explicitToken = nonEmpty(process.env.LAWOS_VAULT_BRIDGE_TOKEN);
  if (explicitToken) return { token: explicitToken, source: "process_env" };
  if (process.env.LAWOS_VAULT_BRIDGE_TOKEN_AUTO_FETCH === "0") {
    return {
      token: "",
      source: "not_configured",
      code: "LAWOS_VAULT_BRIDGE_TOKEN_REQUIRED",
      blockedReason: "LAWOS_VAULT_BRIDGE_TOKEN is required because Lambda token auto-fetch is disabled",
      missingRequiredEnv: ["LAWOS_VAULT_BRIDGE_TOKEN"]
    };
  }

  const lambdaEnvResult = readLambdaEnvironmentWithSsoAutoLogin({
    awsProfile: AWS_PROFILE,
    awsRegion: AWS_REGION,
    lambdaFunctionName: API_LAMBDA_FUNCTION,
    ssoLoginProfile: AWS_SSO_LOGIN_PROFILE
  });
  const lambdaEnv = lambdaEnvResult.values;
  const token = nonEmpty(lambdaEnv.LAWOS_VAULT_BRIDGE_TOKEN);
  if (token) {
    return {
      token,
      source: "lambda_environment",
      awsProfile: AWS_PROFILE,
      awsRegion: AWS_REGION,
      lambdaFunctionName: API_LAMBDA_FUNCTION,
      deploymentCommit: nonEmpty(lambdaEnv.LAWOS_DEPLOYMENT_COMMIT) || null,
      ssoLogin: lambdaEnvResult.ssoLogin
    };
  }

  return {
    token: "",
    source: "lambda_environment",
    awsProfile: AWS_PROFILE,
    awsRegion: AWS_REGION,
    lambdaFunctionName: API_LAMBDA_FUNCTION,
    code: lambdaEnvResult.code,
    blockedReason: lambdaEnvResult.error,
    missingRequiredEnv: lambdaEnvResult.missingRequiredEnv,
    ssoLogin: lambdaEnvResult.ssoLogin
  };
}

function permissionHeaders({ tenant, user = "lcx_vltui_production_smoke", roles = ["matter_runtime_user"], effect = "allow" }) {
  const rules = effect === "allow" ? [{ id: `lcx-vltui-production-${tenant}`, effect: "allow", action: "*" }] : [];
  return {
    [PERMISSION_HEADER]: JSON.stringify({
      principal: {
        user_id: user,
        tenant_id: tenant,
        role_ids: roles,
        session_principal_source: "production_smoke",
        session_source_ref: "lcx-vltui-production-smoke"
      },
      rules,
      object_acl: []
    })
  };
}

async function readText(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  const text = await response.text();
  return { status: response.status, text };
}

async function readJson(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { parse_error: true, text: text.slice(0, 200) };
  }
  return { status: response.status, body };
}

function record(checks, id, passed, details = {}) {
  checks.push({ id, passed, details });
  assert.equal(passed, true, id);
}

function safeCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

function bridgeAuthHeaders() {
  assert(BRIDGE_TOKEN, "LAWOS_VAULT_BRIDGE_TOKEN is required for production bridge smoke");
  return { authorization: `Bearer ${BRIDGE_TOKEN}` };
}

function clientBridgePayload() {
  return {
    tenantRef: "tenant_vault_bridge",
    idempotencyKeyHash: `hash-lcx-vltui-production-client-${COMMIT.slice(0, 12)}`,
    clientDisplayName: "LCX VLTUI Production Smoke Client",
    clientShortName: "LCX-VLTUI-PROD",
    approvalRef: `lcx-vltui-production-smoke-${COMMIT.slice(0, 12)}`,
    migrationApprovalRef: `lcx-vltui-production-smoke-${COMMIT.slice(0, 12)}`,
    supportingEvidenceRefs: ["docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json"],
    migrationOperatorRef: "codex-production-smoke"
  };
}

function matterBridgePayload(client) {
  return {
    tenantRef: "tenant_vault_bridge",
    idempotencyKeyHash: `hash-lcx-vltui-production-matter-${COMMIT.slice(0, 12)}`,
    clientId: client.clientId,
    clientDisplayName: client.clientDisplayName,
    clientShortName: client.clientShortName,
    matterCode: "LCX-VLTUI-PROD/LIT/CIV/계약분쟁",
    matterName: "LCX VLTUI Production Smoke",
    matterTypeEnglish: "LIT",
    matterLitigationAxis: "CIV",
    matterDetailTypeKorean: "계약분쟁",
    approvalRef: `lcx-vltui-production-smoke-${COMMIT.slice(0, 12)}`,
    migrationApprovalRef: `lcx-vltui-production-smoke-${COMMIT.slice(0, 12)}`,
    supportingEvidenceRefs: ["docs/lazycodex/evidence/matter-web/artifacts/lcx-vltui-production-smoke-2026-06-29.json"],
    migrationOperatorRef: "codex-production-smoke",
    status: "opening"
  };
}

function preflightPayload(matterId) {
  return {
    tenant_id: "tenant_vault_bridge",
    permission_ref: "lcx_vltui_production_upload_preflight",
    audit_hint_ref: "lcx_vltui_production_upload_preflight_probe",
    action: "upload_preflight",
    selected_matter_ref: `matter:${matterId}`,
    matter_id: matterId,
    matter_code: "LCX-VLTUI-PROD/LIT/CIV/계약분쟁",
    source_mode: "matter_app_api",
    runtime_write_ready: true,
    repository_durable: true,
    production_ready_claim: false,
    permission_check_only: true,
    idempotency_key_hash: `hash-lcx-vltui-production-preflight-${COMMIT.slice(0, 12)}`
  };
}

function renderMarkdown(report) {
  const lines = [
    "# LCX-VLTUI Production Smoke",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    `Base URL: ${report.base_url}`,
    "",
    `Deployment commit: ${report.deployment_commit}`,
    "",
    `Bridge token source: ${report.bridge_token_resolution?.source ?? "not_configured"}`,
    "",
    ...(report.blocked_reason ? [`Blocked reason: ${report.blocked_reason}`, ""] : []),
    "| Check | Passed | Detail |",
    "| --- | --- | --- |"
  ];
  for (const check of report.checks) {
    lines.push(`| ${check.id} | ${check.passed} | ${String(check.details.summary ?? "").replaceAll("|", "\\|")} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- CloudFront web, Lambda API, Client CRM, Matter runtime, Vault DMS, and Vault bridge routes were checked.");
  lines.push("- Bridge writes are synthetic idempotent Client/Matter upserts only.");
  lines.push("- Upload preflight remains permission-check-only and does not write document bytes.");
  lines.push("- No public release, owner final approval, real-client-data import, or company-wide go-live is claimed by this smoke.");
  return `${lines.join("\n")}\n`;
}

function writeReport(report) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(MD_PATH, renderMarkdown(report));
}

if (!BRIDGE_TOKEN) {
  const report = {
    schema_version: "lawos.lcx_vltui.production_smoke.v0.1",
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    deployment_commit: COMMIT,
    verdict: "BLOCKED",
    blocked_reason: BRIDGE_TOKEN_INFO.blockedReason ?? "LAWOS_VAULT_BRIDGE_TOKEN is required for production bridge smoke",
    missing_required_env: BRIDGE_TOKEN_INFO.missingRequiredEnv ?? ["LAWOS_VAULT_BRIDGE_TOKEN"],
    bridge_token_resolution: {
      source: BRIDGE_TOKEN_INFO.source ?? "not_configured",
      code: BRIDGE_TOKEN_INFO.code ?? "LAWOS_VAULT_BRIDGE_TOKEN_REQUIRED",
      aws_profile: BRIDGE_TOKEN_INFO.awsProfile ?? AWS_PROFILE,
      aws_region: BRIDGE_TOKEN_INFO.awsRegion ?? AWS_REGION,
      lambda_function_name: BRIDGE_TOKEN_INFO.lambdaFunctionName ?? API_LAMBDA_FUNCTION,
      sso_login: BRIDGE_TOKEN_INFO.ssoLogin ?? null,
      secret_value_recorded: false
    },
    checks: [],
    boundary: {
      production_web_deployed: false,
      production_api_redeployed: false,
      synthetic_bridge_writes_only: true,
      vault_document_write_enabled: false,
      real_client_data_used: false,
      public_release_claim: false,
      owner_final_approval_claim: false,
      company_wide_go_live_claim: false
    }
  };
  writeReport(report);
  console.error(JSON.stringify({
    verdict: report.verdict,
    blocked_reason: report.blocked_reason,
    missing_required_env: report.missing_required_env,
    bridge_token_resolution: report.bridge_token_resolution,
    artifact_json: JSON_PATH,
    artifact_md: MD_PATH
  }, null, 2));
  process.exit(1);
}

const checks = [];
const root = await readText("/");
record(checks, "cloudfront-root-new-assets", root.status === 200 && root.text.includes("index-C4I169hQ.js") && root.text.includes("index-COfWDa_0.css"), {
  summary: `root=${root.status}, assets=index-C4I169hQ.js/index-COfWDa_0.css`
});

const health = await readJson("/api/health");
const contexts = health.body?.bounded_contexts?.map((item) => item.bounded_context) ?? [];
for (const context of ["profile", "matter-core", "vault-dms", "crm-intake"]) {
  record(checks, `health-context-${context}`, health.status === 200 && contexts.includes(context), {
    summary: `${context} present`
  });
}

const profile = await readJson("/api/profile/me?tenant_id=tenant_rp04_synthetic&permission_ref=ui_profile_me&audit_hint_ref=ui_profile_me_probe", {
  headers: permissionHeaders({ tenant: "tenant_rp04_synthetic", roles: ["master_data_reader", "matter_runtime_user"] })
});
record(checks, "profile-session-principal", profile.status === 200 && profile.body?.item?.secret_material_included === false, {
  summary: `status=${profile.status}, ui_state=${profile.body?.ui_state}`
});

const crmQuery = "tenant_id=tenant_cmp_g6_synthetic&permission_ref=perm_ref_cmp_g6_read&audit_hint_ref=audit_hint_cmp_g6_read";
const crmHeaders = permissionHeaders({ tenant: "tenant_cmp_g6_synthetic", roles: ["crm_intake_user", "conflict_reviewer"] });
const opportunities = await readJson(`/api/crm/opportunities?${crmQuery}`, { headers: crmHeaders });
const activities = await readJson(`/api/crm/activities?${crmQuery}`, { headers: crmHeaders });
const proposals = await readJson(`/api/crm/proposals?${crmQuery}`, { headers: crmHeaders });
record(checks, "client-crm-sections", opportunities.status === 200 && activities.status === 200 && proposals.status === 200, {
  summary: `opportunities=${safeCount(opportunities.body?.items)}, activities=${safeCount(activities.body?.items)}, proposals=${safeCount(proposals.body?.items)}`
});

const matterQuery = "tenant_id=tenant_rp05_synthetic&permission_ref=perm_ref_rp05_read&audit_hint_ref=audit_hint_rp05_read";
const matterHeaders = permissionHeaders({ tenant: "tenant_rp05_synthetic" });
const matters = await readJson(`/api/matters?${matterQuery}`, { headers: matterHeaders });
const firstMatter = matters.body?.items?.[0];
record(checks, "matter-list", matters.status === 200 && safeCount(matters.body?.items) > 0 && Boolean(firstMatter?.matter_id), {
  summary: `status=${matters.status}, matters=${safeCount(matters.body?.items)}`
});

const matterId = firstMatter.matter_id;
const commandCenter = await readJson(`/api/matters/${matterId}/command-center?${matterQuery}`, { headers: matterHeaders });
const timeline = await readJson(`/api/matters/${matterId}/timeline?${matterQuery}`, { headers: matterHeaders });
const vaultSummary = await readJson(`/api/matters/${matterId}/vault-summary?${matterQuery}`, { headers: matterHeaders });
record(checks, "matter-workspace-sections", commandCenter.status === 200 && timeline.status === 200 && vaultSummary.status === 200, {
  summary: `command_center=${commandCenter.status}, timeline=${timeline.status}, vault_summary=${vaultSummary.status}`
});

const vaultQuery = "tenant_id=tenant_amic_matter_vault&permission_ref=perm_ref_rp07_read&audit_hint_ref=audit_hint_rp07_read";
const vault = await readJson(`/api/vault/documents?${vaultQuery}`, {
  headers: permissionHeaders({
    tenant: "tenant_amic_matter_vault",
    user: "user_amic_jwsuh",
    roles: ["matter_vault_admin", "matter_vault_user", "dms_reader"]
  })
});
record(checks, "vault-documents", vault.status === 200 && safeCount(vault.body?.items) > 0, {
  summary: `status=${vault.status}, documents=${safeCount(vault.body?.items)}`
});

const bridgeStatus = await readJson("/api/matters/vault-bridge/status", { headers: bridgeAuthHeaders() });
record(checks, "vault-bridge-status", bridgeStatus.status === 200 && bridgeStatus.body?.item?.source_mode === "matter_app_api", {
  summary: `status=${bridgeStatus.status}, source_mode=${bridgeStatus.body?.item?.source_mode}`
});

const clientUpsert = await readJson("/api/matters/vault-bridge/clients/upsert", {
  method: "POST",
  headers: bridgeAuthHeaders(),
  body: JSON.stringify(clientBridgePayload())
});
record(checks, "vault-bridge-client-upsert", [200, 201].includes(clientUpsert.status) && Boolean(clientUpsert.body?.clientId), {
  summary: `status=${clientUpsert.status}, action=${clientUpsert.body?.action ?? "created"}`
});

const matterUpsert = await readJson("/api/matters/vault-bridge/matters/upsert", {
  method: "POST",
  headers: bridgeAuthHeaders(),
  body: JSON.stringify(matterBridgePayload(clientUpsert.body))
});
const bridgeMatterId = matterUpsert.body?.matterAppMatterId;
record(checks, "vault-bridge-matter-upsert", [200, 201].includes(matterUpsert.status) && Boolean(bridgeMatterId), {
  summary: `status=${matterUpsert.status}, action=${matterUpsert.body?.action ?? "created"}`
});

const bridgePermissionHeaders = {
  ...bridgeAuthHeaders(),
  ...permissionHeaders({ tenant: "tenant_vault_bridge" })
};
const bridgeLookup = await readJson("/api/matters/vault-bridge/matter-lookup?tenant_id=tenant_vault_bridge&permission_ref=lcx_vltui_production_lookup&audit_hint_ref=lcx_vltui_production_lookup_probe&q=LCX-VLTUI-PROD%2FLIT%2FCIV", {
  headers: bridgePermissionHeaders
});
record(checks, "vault-bridge-lookup", bridgeLookup.status === 200 && safeCount(bridgeLookup.body?.items) > 0 && bridgeLookup.body.items.every((item) => !("document_bytes" in item) && !("storage_pointer" in item)), {
  summary: `status=${bridgeLookup.status}, matches=${safeCount(bridgeLookup.body?.items)}`
});

const preflight = await readJson("/api/matters/vault-bridge/upload-preflight", {
  method: "POST",
  headers: bridgePermissionHeaders,
  body: JSON.stringify(preflightPayload(bridgeMatterId))
});
record(checks, "vault-upload-preflight-guarded", preflight.status === 200 && preflight.body?.item?.vault_document_write_enabled === false && preflight.body?.vault_document_write_enabled === false, {
  summary: `status=${preflight.status}, allowed_next_step=${preflight.body?.item?.allowed_next_step}`
});

const report = {
  schema_version: "lawos.lcx_vltui.production_smoke.v0.1",
  generated_at: new Date().toISOString(),
  base_url: BASE_URL,
  deployment_commit: COMMIT,
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  bridge_token_resolution: {
    source: BRIDGE_TOKEN_INFO.source,
    aws_profile: BRIDGE_TOKEN_INFO.awsProfile ?? null,
    aws_region: BRIDGE_TOKEN_INFO.awsRegion ?? null,
    lambda_function_name: BRIDGE_TOKEN_INFO.lambdaFunctionName ?? null,
    sso_login: BRIDGE_TOKEN_INFO.ssoLogin ?? null,
    secret_value_recorded: false
  },
  checks,
  boundary: {
    production_web_deployed: true,
    production_api_redeployed: true,
    synthetic_bridge_writes_only: true,
    vault_document_write_enabled: false,
    real_client_data_used: false,
    public_release_claim: false,
    owner_final_approval_claim: false,
    company_wide_go_live_claim: false
  }
};

writeReport(report);

console.log(JSON.stringify({
  verdict: report.verdict,
  base_url: report.base_url,
  deployment_commit: report.deployment_commit,
  bridge_token_source: report.bridge_token_resolution.source,
  check_count: checks.length,
  artifact_json: JSON_PATH,
  artifact_md: MD_PATH
}, null, 2));
