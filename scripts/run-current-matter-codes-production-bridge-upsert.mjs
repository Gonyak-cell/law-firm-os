#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { AMIC_CURRENT_MATTER_CLIENTS, AMIC_CURRENT_MATTER_CODE_CANDIDATES } from "../packages/matter/src/amic-matter-code-candidates.js";
import { readLambdaEnvironmentWithSsoAutoLogin } from "./lib/aws-sso-lambda-env.mjs";

const BASE_URL = (process.env.LAWOS_PRODUCTION_BASE_URL ?? "https://d2mthcc8vp3cr2.cloudfront.net").replace(/\/+$/, "");
const AWS_PROFILE = process.env.LAWOS_VAULT_BRIDGE_AWS_PROFILE ?? process.env.AWS_PROFILE ?? "matter-prod-deploy-admin";
const AWS_SSO_LOGIN_PROFILE = process.env.LAWOS_VAULT_BRIDGE_SSO_LOGIN_PROFILE ?? "amic-vault-staging-admin";
const AWS_REGION = process.env.LAWOS_AWS_REGION ?? process.env.AWS_REGION ?? "ap-northeast-2";
const API_LAMBDA_FUNCTION = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME ?? "matter-lawos-api-prod";
const TENANT = process.env.LAWOS_CURRENT_MATTER_CODE_TENANT ?? "tenant_rp05_synthetic";
const SOURCE_REVISION = "amic_current_onedrive_matter_code_inventory_2026_07_01";
const APPROVAL_REF = "amic-current-matter-codes-production-bridge-2026-07-01";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const JSON_PATH = `${ARTIFACT_DIR}/amic-current-production-bridge-upsert-2026-07-01.json`;
const MD_PATH = `${ARTIFACT_DIR}/amic-current-production-bridge-upsert-2026-07-01.md`;
const VERIFY_JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-production-matter-code-verify-2026-07-01.json`;
const REQUIRED_CODES = Object.freeze([
  "제이에스테크/DEAL/Project Jade",
  "새빗켐/DEAL/Project Tempus",
  "성일하이텍/DEAL/Project S",
  "포이스/DEAL/Project Fausta",
  "위즈코어/DEAL/Project Wiz",
  "엠피닉스/DEAL/Project Phoenix",
  "유진이엔티/DEAL/Project Horizon",
  "타이탄컴퍼니/DEAL/Project Titan",
  "성진종합전기/DEAL/Project Switch",
  "귀한사람들/Advisory/retainer"
]);

function nonEmpty(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function resolveLambdaEnvironment() {
  const result = readLambdaEnvironmentWithSsoAutoLogin({
    awsProfile: AWS_PROFILE,
    awsRegion: AWS_REGION,
    lambdaFunctionName: API_LAMBDA_FUNCTION,
    ssoLoginProfile: AWS_SSO_LOGIN_PROFILE
  });
  return result.error
    ? { error: result.error, code: result.code, missingRequiredEnv: result.missingRequiredEnv, values: {}, ssoLogin: result.ssoLogin }
    : { error: "", values: result.values, ssoLogin: result.ssoLogin };
}

function authHeaders(token) {
  return { authorization: `Bearer ${token}` };
}

function permissionHeaders() {
  return {
    "x-lawos-permission-context": JSON.stringify({
      principal: {
        user_id: "amic_current_matter_code_bridge_upsert",
        tenant_id: TENANT,
        role_ids: ["matter_runtime_user"],
        session_principal_source: "production_bridge_upsert",
        session_source_ref: APPROVAL_REF
      },
      rules: [{ id: `${APPROVAL_REF}:allow`, effect: "allow", action: "*" }],
      object_acl: []
    })
  };
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

function clientPayload(client) {
  return {
    tenantRef: TENANT,
    idempotencyKeyHash: `hash-${SOURCE_REVISION}-client-${client.client_id}`,
    clientId: client.client_id,
    clientDisplayName: client.client_display_name,
    clientShortName: client.client_short_name,
    sourceRevision: SOURCE_REVISION,
    approvalRef: APPROVAL_REF,
    migrationApprovalRef: APPROVAL_REF,
    supportingEvidenceRefs: [
      "docs/lazycodex/evidence/matter-desktop/artifacts/amic-current-clients-matter-codes-2026-07-01.xlsx",
      "docs/lazycodex/evidence/matter-desktop/artifacts/amic-matter-code-candidates-2026-07-01.json"
    ],
    migrationOperatorRef: "codex-production-bridge-current-matter-codes",
    status: "active"
  };
}

function matterPayload(matter) {
  return {
    tenantRef: TENANT,
    idempotencyKeyHash: `hash-${SOURCE_REVISION}-matter-${matter.matter_id}`,
    matterAppMatterId: matter.matter_id,
    clientId: matter.client_id,
    clientDisplayName: matter.client_display_name,
    clientShortName: matter.client_short_name,
    matterCodeClientShortName: matter.matter_code.split("/")[0],
    matterCode: matter.matter_code,
    matterName: matter.matter_name,
    matterTypeEnglish: matter.matter_type_english,
    matterLitigationAxis: matter.matter_litigation_axis,
    matterDetailTypeKorean: matter.matter_detail_type_korean,
    clientCaseRole: matter.client_case_role,
    clientCaseRoleConfidence: matter.client_case_role_confidence,
    sourceRevision: SOURCE_REVISION,
    sourceUpdatedAt: "2026-07-01T00:00:00.000+09:00",
    approvalRef: APPROVAL_REF,
    migrationApprovalRef: APPROVAL_REF,
    supportingEvidenceRefs: [
      "docs/lazycodex/evidence/matter-desktop/artifacts/amic-current-clients-matter-codes-2026-07-01.xlsx",
      "docs/lazycodex/evidence/matter-desktop/artifacts/amic-matter-code-candidates-2026-07-01.json"
    ],
    migrationOperatorRef: "codex-production-bridge-current-matter-codes",
    status: matter.status ?? "opening"
  };
}

function countActions(results) {
  return results.reduce((acc, item) => {
    const key = item.action ?? item.outcome ?? "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

async function listProductionMatterCodes() {
  const items = [];
  let cursor = null;
  do {
    const query = new URLSearchParams({
      tenant_id: TENANT,
      permission_ref: `${APPROVAL_REF}:readback`,
      audit_hint_ref: `${APPROVAL_REF}:readback`,
      limit: "100"
    });
    if (cursor) query.set("cursor", cursor);
    const response = await readJson(`/api/matters?${query}`, { headers: permissionHeaders() });
    assert.equal(response.status, 200, `matter readback status=${response.status}`);
    items.push(...(response.body?.items ?? []));
    cursor = response.body?.page_info?.next_cursor ?? null;
  } while (cursor);
  return items;
}

function renderMarkdown(report) {
  const lines = [
    "# AMIC Current Matter Codes Production Bridge Upsert",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    `Base URL: ${report.base_url}`,
    "",
    `Tenant: ${report.tenant_id}`,
    "",
    `Clients: ${report.client_upserts.total}`,
    "",
    `Matters: ${report.matter_upserts.total}`,
    "",
    `Readback matters: ${report.readback.matter_count}`,
    "",
    `Secret value recorded: ${report.secret_value_recorded}`,
    "",
    "## Boundary",
    "",
    "- Remote production bridge client/matter upsert endpoints were called.",
    "- Source values are current AMIC client and matter-code inventory records only.",
    "- No document bytes, raw source document bodies, bearer values, or AWS secrets are recorded.",
    "- This receipt does not claim public external distribution or company-wide go-live."
  ];
  return `${lines.join("\n")}\n`;
}

function writeReport(report) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(MD_PATH, renderMarkdown(report));
  if (report.verdict === "PASS") {
    writeFileSync(VERIFY_JSON_PATH, `${JSON.stringify({
      schema_version: "lawos.production_matter_code_inventory_verify.v0.1",
      recorded_at: report.generated_at,
      base_url: report.base_url,
      endpoint: "/api/matters",
      tenant_id: report.tenant_id,
      deployment_commit: report.lambda_deployment_commit,
      verdict: "PASS",
      item_count: report.readback.matter_count,
      required_codes: report.readback.required_codes,
      short_axis_count: report.readback.short_axis_count,
      secret_values_recorded: false,
      boundary: {
        read_only_inventory_check: true,
        vault_document_write_enabled: false,
        real_client_document_content_used: false,
        public_release_claim: false,
        company_wide_go_live_claim: false
      }
    }, null, 2)}\n`);
  }
}

const lambdaEnv = resolveLambdaEnvironment();
const token = nonEmpty(process.env.LAWOS_VAULT_BRIDGE_TOKEN) || nonEmpty(lambdaEnv.values.LAWOS_VAULT_BRIDGE_TOKEN);
if (!token) {
  const report = {
    schema_version: "lawos.amic_current.production_bridge_upsert.v0.1",
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    tenant_id: TENANT,
    verdict: "BLOCKED",
    blocked_reason: lambdaEnv.error || "LAWOS_VAULT_BRIDGE_TOKEN could not be resolved",
    token_source: nonEmpty(process.env.LAWOS_VAULT_BRIDGE_TOKEN) ? "process_env" : "lambda_environment",
    sso_login: lambdaEnv.ssoLogin ?? null,
    secret_value_recorded: false,
    client_upserts: { total: 0 },
    matter_upserts: { total: 0 },
    readback: { matter_count: 0 }
  };
  writeReport(report);
  console.error(JSON.stringify({
    verdict: report.verdict,
    blocked_reason: report.blocked_reason,
    artifact_json: JSON_PATH,
    artifact_md: MD_PATH
  }, null, 2));
  process.exit(1);
}

const headers = authHeaders(token);
const clientResults = [];
for (const client of AMIC_CURRENT_MATTER_CLIENTS) {
  const response = await readJson("/api/matters/vault-bridge/clients/upsert", {
    method: "POST",
    headers,
    body: JSON.stringify(clientPayload(client))
  });
  clientResults.push({
    client_id: client.client_id,
    client_display_name: client.client_display_name,
    status: response.status,
    action: response.body?.action ?? response.body?.outcome ?? null,
    safe_error_codes: response.body?.safe_error_codes ?? []
  });
}

const failedClients = clientResults.filter((item) => ![200, 201].includes(item.status) || item.safe_error_codes.length);
assert.deepEqual(failedClients, [], "client bridge upserts failed");

const matterResults = [];
for (const matter of AMIC_CURRENT_MATTER_CODE_CANDIDATES) {
  const response = await readJson("/api/matters/vault-bridge/matters/upsert", {
    method: "POST",
    headers,
    body: JSON.stringify(matterPayload(matter))
  });
  matterResults.push({
    matter_id: matter.matter_id,
    matter_code: matter.matter_code,
    status: response.status,
    action: response.body?.action ?? response.body?.outcome ?? null,
    safe_error_codes: response.body?.safe_error_codes ?? []
  });
}

const failedMatters = matterResults.filter((item) => ![200, 201].includes(item.status) || item.safe_error_codes.length);
assert.deepEqual(failedMatters, [], "matter bridge upserts failed");

const readbackItems = await listProductionMatterCodes();
const readbackCodes = new Set(readbackItems.map((item) => item.matter_code));
const requiredCodeResults = REQUIRED_CODES.map((code) => ({ code, found: readbackCodes.has(code) }));
assert.deepEqual(requiredCodeResults.filter((item) => !item.found), [], "required matter codes missing from production readback");

const report = {
  schema_version: "lawos.amic_current.production_bridge_upsert.v0.1",
  generated_at: new Date().toISOString(),
  base_url: BASE_URL,
  tenant_id: TENANT,
  verdict: "PASS",
  token_source: nonEmpty(process.env.LAWOS_VAULT_BRIDGE_TOKEN) ? "process_env" : "lambda_environment",
  sso_login: lambdaEnv.ssoLogin ?? null,
  lambda_function_name: API_LAMBDA_FUNCTION,
  lambda_deployment_commit: lambdaEnv.values.LAWOS_DEPLOYMENT_COMMIT ?? null,
  source_revision: SOURCE_REVISION,
  approval_ref: APPROVAL_REF,
  secret_value_recorded: false,
  client_upserts: {
    total: clientResults.length,
    actions: countActions(clientResults),
    failed: []
  },
  matter_upserts: {
    total: matterResults.length,
    actions: countActions(matterResults),
    failed: []
  },
  readback: {
    matter_count: readbackItems.length,
    required_codes: requiredCodeResults,
    short_axis_count: readbackItems.filter((item) => /\/(ADV|DISP|DIST)\//.test(item.matter_code ?? "")).length
  },
  boundary: {
    remote_production_bridge_write_executed: true,
    real_client_matter_code_inventory_used: true,
    raw_document_content_used: false,
    vault_document_write_enabled: false,
    public_release_claim: false,
    company_wide_go_live_claim: false
  }
};

writeReport(report);

console.log(JSON.stringify({
  verdict: report.verdict,
  base_url: report.base_url,
  tenant_id: report.tenant_id,
  client_upserts: report.client_upserts,
  matter_upserts: report.matter_upserts,
  readback_matter_count: report.readback.matter_count,
  artifact_json: JSON_PATH,
  artifact_md: MD_PATH,
  verify_artifact_json: VERIFY_JSON_PATH
}, null, 2));
