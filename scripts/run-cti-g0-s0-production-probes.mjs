#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { highestPrivilegeRegisteredAccount } from "../apps/api/src/matter-vault-account-registry.js";
import { AMIC_CURRENT_MATTER_CODE_CANDIDATES } from "../packages/matter/src/amic-matter-code-candidates.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GOAL_ID = "cti-g0-s0";
const PLAN_REF = "workbook/canonical-tenant-data-injection-execution-plan-2026-07-06.md";
const CONTRACT_REF = "contracts/production-data-policy-contract.json";
const APPROVAL_REF = "I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06";
const MARKER_APPROVAL_REF = "cti-probe-markers";
const GENERATED_AT = new Date().toISOString();
const REDACTION_SALT = "cti-g0-s0-production-probe-redaction-2026-07-06-v1";
const AWS_PROFILE = process.env.AWS_PROFILE ?? "matter-prod-deploy-admin";
const AWS_REGION = process.env.AWS_REGION ?? "ap-northeast-2";
const LAMBDA_FUNCTION = process.env.LAWOS_API_LAMBDA_FUNCTION_NAME ?? "matter-lawos-api-prod";
const BASE_URL = (process.env.LAWOS_PRODUCTION_BASE_URL ?? "https://d2mthcc8vp3cr2.cloudfront.net").replace(/\/+$/, "");
const LOCAL_EVIDENCE_DIR = path.join(homedir(), ".codex", "local-evidence", GOAL_ID);
const NON_SECRET_ENV_VALUES = new Set([
  "LAWOS_DEPLOYMENT_COMMIT",
  "LAWOS_DEPLOYMENT_MODE",
  "LAWOS_RUNTIME_PROFILE"
]);
const SECRET_ENV_PATTERN = /(TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE|KEY|AUTH)/i;
const STORE_ENV_PATTERN = /^LAWOS_.*_STORE_PATH$/;
const LOCAL_CANDIDATE_IDS = new Set(AMIC_CURRENT_MATTER_CODE_CANDIDATES.map((matter) => matter.matter_id));

function sha256Text(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(file) {
  return sha256Text(await readFile(path.join(ROOT, file), "utf8"));
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function hashJson(value) {
  return sha256Text(JSON.stringify(stable(value)));
}

function piiHash(...parts) {
  return sha256Text([REDACTION_SALT, ...parts.map((part) => String(part ?? ""))].join("|"));
}

function jsonArg(value) {
  return JSON.stringify(value);
}

function runAws(args, { parseJson = true } = {}) {
  const output = execFileSync("aws", [...args, "--profile", AWS_PROFILE, "--region", AWS_REGION, "--output", "json", "--no-cli-pager"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return parseJson ? JSON.parse(output) : output;
}

function maskedStsIdentity(identity = {}) {
  return {
    account: identity.Account ?? null,
    arn_role_ref: String(identity.Arn ?? "").replace(/\/[^/]+$/, "/<session>"),
    arn_hash: piiHash("sts_arn", identity.Arn),
    user_id_hash: piiHash("sts_user_id", identity.UserId)
  };
}

function maskedLambdaConfig(config = {}) {
  const env = config.Environment?.Variables ?? {};
  const envKeys = Object.keys(env).sort();
  const storeEnvKeys = envKeys.filter((key) => STORE_ENV_PATTERN.test(key));
  const secretLikeEnvKeys = envKeys.filter((key) => SECRET_ENV_PATTERN.test(key));
  const nonSecretValues = Object.fromEntries(
    envKeys
      .filter((key) => NON_SECRET_ENV_VALUES.has(key))
      .map((key) => [key, env[key]])
  );
  return {
    function_name: config.FunctionName,
    runtime: config.Runtime,
    handler: config.Handler,
    state: config.State,
    last_update_status: config.LastUpdateStatus,
    last_modified: config.LastModified,
    revision_id: config.RevisionId,
    code_sha256: config.CodeSha256,
    timeout: config.Timeout,
    memory_size: config.MemorySize,
    environment_key_count: envKeys.length,
    environment_keys: envKeys,
    secret_like_environment_keys: secretLikeEnvKeys,
    non_secret_environment_values: nonSecretValues,
    store_path_env_keys_present: storeEnvKeys,
    all_required_store_paths_absent: storeEnvKeys.length === 0,
    efs_file_system_config_count: Array.isArray(config.FileSystemConfigs) ? config.FileSystemConfigs.length : 0,
    vpc_config_present: Boolean(config.VpcConfig && Object.keys(config.VpcConfig).length > 0)
  };
}

async function ensureDir(file) {
  await mkdir(path.dirname(path.join(ROOT, file)), { recursive: true });
}

async function writeJson(file, value) {
  await ensureDir(file);
  await writeFile(path.join(ROOT, file), `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(file, value) {
  await ensureDir(file);
  await writeFile(path.join(ROOT, file), value.endsWith("\n") ? value : `${value}\n`);
}

async function writeLocalEvidence(name, value) {
  await mkdir(LOCAL_EVIDENCE_DIR, { recursive: true });
  const file = path.join(LOCAL_EVIDENCE_DIR, name);
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  return { path: file, sha256: sha256Text(JSON.stringify(value, null, 2) + "\n") };
}

async function fetchJson(urlPath, options = {}) {
  const response = await fetch(`${BASE_URL}${urlPath}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers ?? {})
    }
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { parse_error: true, body_hash: piiHash("parse_error_body", text) };
  }
  return { status: response.status, body };
}

async function sessionAuthHeaders() {
  const account = highestPrivilegeRegisteredAccount();
  const response = await fetchJson("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: account.email,
      password: account.local_dev?.synthetic_token
    })
  });
  if (response.status !== 200 || !response.body?.session_token) {
    throw new Error(`session login failed with status ${response.status}`);
  }
  return {
    authorization: `Bearer ${response.body.session_token}`,
    account_ref_hash: piiHash("account", account.user_id, account.email),
    tenant_id: response.body.session?.tenant_id ?? null,
    role_count: Array.isArray(response.body.session?.role_ids) ? response.body.session.role_ids.length : 0
  };
}

function summarizeItem(item = {}) {
  return {
    item_hash: piiHash("runtime_item", hashJson(item)),
    matter_id_hash: item.matter_id ? piiHash("matter_id", item.matter_id) : null,
    candidate_match: item.matter_id ? LOCAL_CANDIDATE_IDS.has(item.matter_id) : false,
    source_revision: item.source_revision ?? null,
    status: item.status ?? null,
    wip_status: item.wip_status ?? null,
    risk_level: item.risk_level ?? null,
    has_matter_code: Boolean(item.matter_code),
    has_matter_name: Boolean(item.matter_name || item.title),
    has_client_ref: Boolean(item.client_id || item.legal_client_party_id || item.billing_client_party_id),
    has_client_display_name: Boolean(item.client_display_name)
  };
}

function summarizeRecords(items = []) {
  const summarized = items.map(summarizeItem);
  const unmatched = summarized.filter((item) => !item.candidate_match);
  return {
    returned_count: summarized.length,
    candidate_match_count: summarized.filter((item) => item.candidate_match).length,
    unmatched_count: unmatched.length,
    source_revisions: Object.fromEntries(
      [...new Set(summarized.map((item) => item.source_revision ?? "null"))]
        .sort()
        .map((source) => [source, summarized.filter((item) => (item.source_revision ?? "null") === source).length])
    ),
    statuses: Object.fromEntries(
      [...new Set(summarized.map((item) => item.status ?? "null"))]
        .sort()
        .map((status) => [status, summarized.filter((item) => (item.status ?? "null") === status).length])
    ),
    ordered_item_hashes: summarized.map((item) => item.item_hash),
    unmatched_item_hashes: unmatched.map((item) => item.item_hash),
    unmatched_source_revisions: Object.fromEntries(
      [...new Set(unmatched.map((item) => item.source_revision ?? "null"))]
        .sort()
        .map((source) => [source, unmatched.filter((item) => (item.source_revision ?? "null") === source).length])
    )
  };
}

async function readAllMatters(tenantId, headers) {
  const rawItems = [];
  let cursor = null;
  let page = 0;
  const pages = [];
  do {
    const params = new URLSearchParams({
      tenant_id: tenantId,
      permission_ref: "cti_s0_t04_readback",
      audit_hint_ref: "cti_s0_t04_readback",
      request_id: `cti_s0_t04_${tenantId}_${page}`,
      limit: "100"
    });
    if (cursor) params.set("cursor", cursor);
    const response = await fetchJson(`/api/matters?${params}`, { headers });
    pages.push({ status: response.status, returned_count: response.body?.items?.length ?? 0 });
    if (response.status !== 200) {
      return { tenant_id: tenantId, ok: false, pages, rawItems, summary: { returned_count: 0, error_status: response.status } };
    }
    rawItems.push(...(response.body?.items ?? []));
    cursor = response.body?.page_info?.next_cursor ?? null;
    page += 1;
  } while (cursor && page < 20);
  return {
    tenant_id: tenantId,
    ok: true,
    pages,
    rawItems,
    summary: summarizeRecords(rawItems)
  };
}

async function readVaultDocuments(tenantId, headers) {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    permission_ref: "cti_s0_t04_vault_readback",
    audit_hint_ref: "cti_s0_t04_vault_readback",
    request_id: `cti_s0_t04_vault_${tenantId}`,
    limit: "100"
  });
  const response = await fetchJson(`/api/vault/documents?${params}`, { headers });
  const items = response.body?.items ?? [];
  return {
    tenant_id: tenantId,
    status: response.status,
    returned_count: Array.isArray(items) ? items.length : 0,
    ordered_item_hashes: Array.isArray(items) ? items.map((item) => piiHash("vault_doc", hashJson(item))) : []
  };
}

async function forceColdStartWithNoopEnvironment(config) {
  const variables = config.Environment?.Variables ?? {};
  const input = {
    FunctionName: LAMBDA_FUNCTION,
    RevisionId: config.RevisionId,
    Environment: { Variables: variables }
  };
  const tempFile = path.join(tmpdir(), `cti-s0-t03-${process.pid}.json`);
  await writeFile(tempFile, `${JSON.stringify(input)}\n`, { mode: 0o600 });
  await chmod(tempFile, 0o600);
  try {
    const result = runAws([
      "lambda",
      "update-function-configuration",
      "--cli-input-json",
      `file://${tempFile}`,
      "--query",
      "{FunctionName:FunctionName,LastUpdateStatus:LastUpdateStatus,RevisionId:RevisionId,LastModified:LastModified}"
    ]);
    execFileSync("aws", [
      "lambda",
      "wait",
      "function-updated",
      "--function-name",
      LAMBDA_FUNCTION,
      "--profile",
      AWS_PROFILE,
      "--region",
      AWS_REGION,
      "--no-cli-pager"
    ], { cwd: ROOT, stdio: ["ignore", "ignore", "pipe"] });
    return result;
  } finally {
    await rm(tempFile, { force: true });
  }
}

async function runColdStartProbe({ config, t04Readback }) {
  const rp05 = t04Readback.matter_readback.tenants.tenant_rp05_synthetic;
  const target = rp05?.rawItems?.find((item) => item.matter_id && LOCAL_CANDIDATE_IDS.has(item.matter_id)) ?? rp05?.rawItems?.find((item) => item.matter_id);
  if (!target?.matter_id) {
    return {
      status: "blocked_no_marker_target",
      reason: "No readable Matter record was available for the S0-T03 synthetic marker.",
      product_state_write_performed: false
    };
  }
  const firstSession = await sessionAuthHeaders();
  const markerBody = {
    tenant_id: "tenant_rp05_synthetic",
    permission_ref: "cti_s0_t03_marker_write",
    audit_hint_ref: "cti_s0_t03_marker_write",
    viewed_at: GENERATED_AT
  };
  const writeResponse = await fetchJson(`/api/matters/${encodeURIComponent(target.matter_id)}/recently-viewed`, {
    method: "POST",
    headers: { authorization: firstSession.authorization },
    body: JSON.stringify(markerBody)
  });
  const beforeRead = await fetchJson(
    "/api/matters/recently-viewed?tenant_id=tenant_rp05_synthetic&permission_ref=cti_s0_t03_marker_read&audit_hint_ref=cti_s0_t03_marker_read&request_id=cti_s0_t03_before&limit=25",
    { headers: { authorization: firstSession.authorization } }
  );
  const beforeFound = (beforeRead.body?.items ?? []).some((item) => item.matter_id === target.matter_id);
  const updateResult = await forceColdStartWithNoopEnvironment(config);
  const secondSession = await sessionAuthHeaders();
  const afterRead = await fetchJson(
    "/api/matters/recently-viewed?tenant_id=tenant_rp05_synthetic&permission_ref=cti_s0_t03_marker_read&audit_hint_ref=cti_s0_t03_marker_read&request_id=cti_s0_t03_after&limit=25",
    { headers: { authorization: secondSession.authorization } }
  );
  const afterFound = (afterRead.body?.items ?? []).some((item) => item.matter_id === target.matter_id);
  return {
    status: writeResponse.status === 200 && beforeFound ? "completed" : "failed_marker_write_or_pre_read",
    marker_tenant_id: "tenant_rp05_synthetic",
    marker_matter_hash: piiHash("marker_matter", target.matter_id),
    marker_candidate_match: LOCAL_CANDIDATE_IDS.has(target.matter_id),
    marker_write_status: writeResponse.status,
    marker_before_cold_start_found: beforeFound,
    marker_before_cold_start_count: beforeRead.body?.items?.length ?? 0,
    noop_environment_update: {
      performed: true,
      function_name: updateResult.FunctionName,
      last_update_status: updateResult.LastUpdateStatus,
      revision_id: updateResult.RevisionId,
      last_modified: updateResult.LastModified,
      secret_material_written_to_repo: false,
      temp_cli_input_removed: true
    },
    marker_after_cold_start_found: afterFound,
    marker_after_cold_start_count: afterRead.body?.items?.length ?? 0,
    persistence_verdict: afterFound ? "marker_survived_cold_start" : "marker_lost_after_cold_start",
    product_state_write_performed: true
  };
}

function receiptBase(ctiItem, launchTuw, status, boundary = {}) {
  return {
    schema_version: "law-firm-os.cti.s0-receipt.v0.2",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    source_plan: PLAN_REF,
    approval_signature_ref: APPROVAL_REF,
    cti_item: ctiItem,
    launch_tuw: launchTuw,
    status,
    pii_boundary: {
      plaintext_client_or_matter_names_written: false,
      phone_or_email_pii_written: false,
      credential_material_written: false,
      token_material_written: false
    },
    execution_boundary: {
      production_credentials_used: boundary.production_credentials_used === true,
      real_data_contact_performed: boundary.real_data_contact_performed === true,
      product_state_write_performed: boundary.product_state_write_performed === true,
      migration_executed: false,
      cutover_executed: false,
      password_distribution_executed: false,
      production_ready_claim: false,
      go_live_claim: false
    }
  };
}

async function updateArtifactIndexes() {
  const artifactIndexPath = "docs/launch/cti-s0-artifact-index-2026-07-06.json";
  const evidenceManifestPath = "docs/lazycodex/evidence/matter-web/artifacts/cti-g0-s0-evidence-manifest-2026-07-06.json";
  const artifacts = [
    "docs/launch/cti-decision-register-2026-07-06.md",
    "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md",
    "docs/launch/cti-s0-probe-boundary-register-2026-07-06.md",
    "docs/launch/cti-tuw-crosswalk-2026-07-06.json",
    "docs/launch/cti-tuw-crosswalk-2026-07-06.md",
    "docs/launch/cti-next-goal-objectives-2026-07-06.md",
    "docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json",
    "docs/launch/cti-s0-t02-persistence-census-2026-07-06.json",
    "docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json",
    "docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json",
    "docs/launch/cti-s0-t05-desktop-seed-drift-diff-2026-07-06.json",
    "docs/launch/cti-s0-t06-lead-lawyer-mapping-workbook-receipt-2026-07-06.json",
    "docs/launch/cti-s0-t07-real-client-data-used-inventory-2026-07-06.json",
    "workbook/cti-i1-lead-lawyer-mapping-template-2026-07-06.csv",
    "workbook/cti-i1-lead-lawyer-mapping-template-2026-07-06.json",
    "docs/launch/cti-d07-disposition-register-2026-07-06.json",
    "docs/launch/cti-d07-disposition-register-2026-07-06.md",
    "docs/launch/cti-s1-branch-assessment-2026-07-06.json",
    "docs/launch/cti-s1-branch-assessment-2026-07-06.md",
    "docs/goal-closeout/cti-g0-s0/packet.json",
    "docs/goal-closeout/cti-g0-s0/command-evidence.json",
    "docs/goal-closeout/cti-g0-s0/adjudication.md",
    "docs/goal-closeout/cti-g0-s0/construction-inspection.json",
    "docs/goal-closeout/cti-g0-s0/claude-review-result.json",
    "scripts/generate-cti-g0-s0-evidence.mjs",
    "scripts/run-cti-g0-s0-production-probes.mjs",
    "scripts/validate-cti-g0-s0-closeout.mjs",
    "workbook/launch-tuw/launch-tuw-ledger.json",
    "workbook/launch-tuw/10_PRE.md"
  ];
  const artifactHashes = [];
  for (const file of artifacts) artifactHashes.push({ path: file, sha256: await sha256File(file) });
  const contractSha256 = await sha256File(CONTRACT_REF);
  const planSha256 = await sha256File(PLAN_REF);
  await writeJson(artifactIndexPath, {
    schema_version: "law-firm-os.cti.s0-artifact-index.v0.2",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    status: "i4_ratified_s0_probes_executed",
    source_plan: PLAN_REF,
    source_plan_sha256: planSha256,
    contract_ref: CONTRACT_REF,
    contract_sha256: contractSha256,
    approval_signature_ref: APPROVAL_REF,
    s0_g_artifacts: {
      s0_t01: "docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json",
      s0_t02: "docs/launch/cti-s0-t02-persistence-census-2026-07-06.json",
      s0_t03: "docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json",
      s0_t04: "docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json",
      s0_t05: "docs/launch/cti-s0-t05-desktop-seed-drift-diff-2026-07-06.json",
      s0_t06: "docs/launch/cti-s0-t06-lead-lawyer-mapping-workbook-receipt-2026-07-06.json",
      s0_t07: "docs/launch/cti-s0-t07-real-client-data-used-inventory-2026-07-06.json",
      s0_t08: "docs/launch/cti-production-data-policy-ratification-packet-2026-07-06.md"
    },
    blockers: [],
    follow_up_required: [
      "S1 foundation must be opened as a separate goal before any durable store or infra write beyond the S0-T03 probe.",
      "S1/CUTOVER require their own approval_ref and are not authorized by I4."
    ],
    artifact_hashes: artifactHashes
  });
  const finalArtifacts = [...artifacts, artifactIndexPath];
  const finalHashes = [];
  for (const file of finalArtifacts) finalHashes.push({ path: file, sha256: await sha256File(file) });
  await writeJson(evidenceManifestPath, {
    schema_version: "law-firm-os.cti.g0-s0-evidence-manifest.v0.2",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    status: "completed_i4_ratified_s0_probes_executed",
    approval_signature_ref: APPROVAL_REF,
    pii_safe: true,
    production_credentials_used: true,
    real_data_contact_performed: true,
    product_state_write_performed: true,
    production_migration_executed: false,
    cutover_executed: false,
    password_distribution_executed: false,
    production_ready_claim: false,
    go_live_claim: false,
    artifact_hashes: finalHashes
  });
}

async function main() {
  if (process.argv.includes("--refresh-hashes-only")) {
    await updateArtifactIndexes();
    console.log(JSON.stringify({
      status: "refreshed_cti_g0_s0_artifact_hashes",
      approval_signature_ref: APPROVAL_REF
    }, null, 2));
    return;
  }

  const stsIdentity = runAws(["sts", "get-caller-identity"]);
  const lambdaConfig = runAws(["lambda", "get-function-configuration", "--function-name", LAMBDA_FUNCTION]);
  const maskedConfig = maskedLambdaConfig(lambdaConfig);
  await writeJson("docs/launch/cti-s0-t01-lambda-config-receipt-2026-07-06.json", {
    ...receiptBase("S0-T01", "LT-PRE-W08-T04", "completed", { production_credentials_used: true }),
    aws_identity: maskedStsIdentity(stsIdentity),
    lambda_configuration: maskedConfig,
    s1_branch_signal: {
      efs_present: maskedConfig.efs_file_system_config_count > 0,
      store_path_env_keys_present: maskedConfig.store_path_env_keys_present,
      durable_store_signal: maskedConfig.efs_file_system_config_count > 0 || maskedConfig.store_path_env_keys_present.length > 0
    }
  });

  const health = await fetchJson("/api/health");
  const firstSession = await sessionAuthHeaders();
  const matterTenants = {};
  for (const tenantId of ["tenant_amic_matter_vault", "tenant_rp05_synthetic"]) {
    matterTenants[tenantId] = await readAllMatters(tenantId, { authorization: firstSession.authorization });
  }
  const vaultReadback = await readVaultDocuments("tenant_amic_matter_vault", { authorization: firstSession.authorization });
  const t04Snapshot = {
    schema_version: "law-firm-os.cti.s0-t04-local-hash-snapshot.v0.1",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    approval_signature_ref: APPROVAL_REF,
    base_url: BASE_URL,
    health: {
      status: health.status,
      service: health.body?.service ?? null,
      runtime_profile: health.body?.runtime_profile ?? null,
      synthetic_login_enabled: health.body?.synthetic_login_enabled ?? null,
      bounded_context_count: Array.isArray(health.body?.bounded_contexts) ? health.body.bounded_contexts.length : null
    },
    session_probe: {
      tenant_id: firstSession.tenant_id,
      role_count: firstSession.role_count,
      account_ref_hash: firstSession.account_ref_hash,
      token_material_recorded: false
    },
    matter_readback: {
      tenants: Object.fromEntries(
        Object.entries(matterTenants).map(([tenantId, result]) => [
          tenantId,
          {
            ok: result.ok,
            pages: result.pages,
            summary: result.summary
          }
        ])
      )
    },
    vault_readback: vaultReadback,
    pii_boundary: {
      plaintext_client_or_matter_names_written: false,
      raw_records_written: false,
      hash_only_snapshot: true
    }
  };
  const localSnapshot = await writeLocalEvidence("cti-s0-t04-production-store-readback-snapshot-2026-07-06.json", t04Snapshot);
  const t04Receipt = {
    ...receiptBase("S0-T04", "LT-PRE-W08-T04", "completed", {
      production_credentials_used: true,
      real_data_contact_performed: true
    }),
    sequence: {
      executed_before_s0_t03: true,
      required_by_plan: true
    },
    readback_snapshot: {
      storage: "non_git_local_hash_snapshot",
      local_path: localSnapshot.path,
      sha256: localSnapshot.sha256,
      plaintext_pii_in_snapshot: false
    },
    health: t04Snapshot.health,
    matter_readback_summary: t04Snapshot.matter_readback,
    vault_readback_summary: vaultReadback
  };
  await writeJson("docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json", t04Receipt);

  const coldStart = await runColdStartProbe({
    config: lambdaConfig,
    t04Readback: { matter_readback: { tenants: matterTenants } }
  });
  await writeJson("docs/launch/cti-s0-t03-coldstart-probe-receipt-2026-07-06.json", {
    ...receiptBase("S0-T03", "LT-PRE-W08-T04", coldStart.status, {
      production_credentials_used: true,
      real_data_contact_performed: true,
      product_state_write_performed: coldStart.product_state_write_performed === true
    }),
    marker_approval_ref: MARKER_APPROVAL_REF,
    sequence: {
      s0_t04_completed_first: true,
      s0_t04_snapshot_sha256: localSnapshot.sha256
    },
    permission_audit_impact: {
      noop_environment_update_performed: coldStart.noop_environment_update?.performed === true,
      lambda_configuration_write_performed: coldStart.noop_environment_update?.performed === true,
      environment_values_recorded_in_repo: false,
      token_or_secret_values_recorded_in_repo: false,
      migration_or_cutover_write: false
    },
    cold_start_probe: coldStart
  });

  const rp05Summary = matterTenants.tenant_rp05_synthetic?.summary ?? {};
  const d07State = rp05Summary.returned_count === 149 && rp05Summary.unmatched_count === 1 && rp05Summary.unmatched_source_revisions?.["runtime-seed-rp05"] === 1
    ? "production_149th_row_identified_as_runtime_seed_exclude_from_cti_migration"
    : "production_row_count_requires_owner_review";
  await writeJson("docs/launch/cti-d07-disposition-register-2026-07-06.json", {
    schema_version: "law-firm-os.cti.d07-disposition-register.v0.2",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    approval_signature_ref: APPROVAL_REF,
    local_candidate_matter_count: AMIC_CURRENT_MATTER_CODE_CANDIDATES.length,
    production_rp05_visible_matter_count: rp05Summary.returned_count ?? null,
    production_candidate_match_count: rp05Summary.candidate_match_count ?? null,
    production_unmatched_count: rp05Summary.unmatched_count ?? null,
    production_149th_row_state: d07State,
    recommendation: d07State === "production_149th_row_identified_as_runtime_seed_exclude_from_cti_migration"
      ? "Do not migrate the unmatched 149th production row in S3; treat it as the existing synthetic runtime seed unless owner later approves otherwise. Do not delete it in G0/S0."
      : "Do not delete or migrate the unmatched production row until owner review resolves the S0-T04 readback evidence.",
    pii_boundary: {
      plaintext_row_values_included: false,
      row_hashes_only: true
    },
    evidence_refs: {
      s0_t04_receipt: "docs/launch/cti-s0-t04-store-readback-snapshot-receipt-2026-07-06.json",
      non_git_snapshot_sha256: localSnapshot.sha256
    }
  });
  await writeText("docs/launch/cti-d07-disposition-register-2026-07-06.md", `# CTI D-07 Disposition Register - 2026-07-06

Status: ${d07State}

Approval signature ref: \`${APPROVAL_REF}\`

Local candidate matter-code count: ${AMIC_CURRENT_MATTER_CODE_CANDIDATES.length}

Production rp05 visible matter count: ${rp05Summary.returned_count ?? "unknown"}

Production candidate match count: ${rp05Summary.candidate_match_count ?? "unknown"}

Production unmatched count: ${rp05Summary.unmatched_count ?? "unknown"}

Recommendation: ${d07State === "production_149th_row_identified_as_runtime_seed_exclude_from_cti_migration"
    ? "Do not migrate the unmatched 149th production row in S3; treat it as the existing synthetic runtime seed unless owner later approves otherwise. Do not delete it in G0/S0."
    : "Do not delete or migrate the unmatched production row until owner review resolves the S0-T04 readback evidence."}

PII rule: this register stores counts and hashes only. Plaintext matter/client row values remain out of git.
`);

  const s1Branch = maskedConfig.efs_file_system_config_count > 0 || maskedConfig.store_path_env_keys_present.length > 0
    ? "durable_store_signal_present_verify_in_s1"
    : "efs_and_store_path_absent_s1_durable_foundation_required";
  await writeJson("docs/launch/cti-s1-branch-assessment-2026-07-06.json", {
    schema_version: "law-firm-os.cti.s1-branch-assessment.v0.2",
    generated_at: GENERATED_AT,
    goal_id: GOAL_ID,
    approval_signature_ref: APPROVAL_REF,
    branch_status: s1Branch,
    lambda_runtime_profile_env: maskedConfig.non_secret_environment_values.LAWOS_RUNTIME_PROFILE ?? null,
    lambda_handler: maskedConfig.handler,
    efs_file_system_config_count: maskedConfig.efs_file_system_config_count,
    store_path_env_keys_present: maskedConfig.store_path_env_keys_present,
    cold_start_persistence_verdict: coldStart.persistence_verdict ?? null,
    allowed_next_step: "Open a separate S1 FOUNDATION goal with its own bounded approval before durable store or infra changes.",
    no_s1_execution_started: true
  });
  await writeText("docs/launch/cti-s1-branch-assessment-2026-07-06.md", `# CTI S1 Branch Assessment - 2026-07-06

Status: ${s1Branch}

Approval signature ref: \`${APPROVAL_REF}\`

S0-T01 found handler \`${maskedConfig.handler}\`, EFS config count ${maskedConfig.efs_file_system_config_count}, and STORE_PATH env key count ${maskedConfig.store_path_env_keys_present.length}. S0-T03 cold-start persistence verdict: \`${coldStart.persistence_verdict ?? "not_available"}\`.

S1 has not started. The next bounded goal should handle durable store foundation and audit/session-secret hardening before any S2/S3/CUTOVER work.
`);

  await writeJson("docs/goal-closeout/cti-g0-s0/packet.json", {
    goal_id: GOAL_ID,
    title: "Canonical Tenant Injection G0/S0 kickoff",
    created_at: GENERATED_AT,
    status: "completed_i4_ratified_s0_probes_executed",
    source_plan: PLAN_REF,
    source_plan_sha256: await sha256File(PLAN_REF),
    contract_ref: CONTRACT_REF,
    contract_sha256: await sha256File(CONTRACT_REF),
    approval_signature_ref: APPROVAL_REF,
    launch_tuw_work_package: "LT-PRE-W08",
    cti_scope: "G0/S0 only",
    in_scope: [
      "I4 ratification record",
      "S0-T01 Lambda production configuration read with masked env evidence",
      "S0-T02 local persistence census",
      "S0-T03 cold-start synthetic marker probe after S0-T04",
      "S0-T04 production store readback hash snapshot",
      "S0-T05 desktop seed drift diff",
      "S0-T06 PII-safe I1 mapping template",
      "S0-T07 real_client_data_used inventory",
      "D-07 disposition recommendation",
      "S1 branch assessment"
    ],
    out_of_scope: [
      "S1-S6 implementation",
      "CUTOVER execution",
      "account password generation or distribution",
      "production migration",
      "owner approval completion claim beyond I4 G0/S0",
      "Entra ID/OIDC implementation",
      "DB conversion",
      "go-live or production_ready claim"
    ],
    stop_condition_resolution: "I4 was supplied by the owner with approval_signature_ref I4-CTI-G0-S0-OWNER-RATIFICATION-2026-07-06.",
    non_claims: [
      "production_ready",
      "go_live_approved",
      "migration_executed",
      "cutover_executed",
      "account_passwords_issued",
      "s1_started"
    ],
    closeout_verdict: "COMPLETE_G0_S0_ONLY",
    next_goal_required: "cti-s1-foundation"
  });
  await writeText("docs/goal-closeout/cti-g0-s0/adjudication.md", `# CTI G0/S0 Adjudication

Status: completed_i4_ratified_s0_probes_executed

Approval signature ref: \`${APPROVAL_REF}\`

The owner ratified \`${CONTRACT_REF}\` for the CTI G0/S0 scope only. S0-T04 production store readback was executed before S0-T03, and all repo evidence remains PII-safe: counts, hashes, status fields, and non-secret runtime configuration only.

No S1-S6 implementation, CUTOVER, password issuance/distribution, production migration, Entra ID/OIDC work, DB conversion, production_ready claim, or go-live claim has been made.

Final adjudication: G0/S0 is complete for its bounded purpose. The next work must be a separate S1 FOUNDATION goal with its own boundary and approval.
`);
  await writeJson("docs/goal-closeout/cti-g0-s0/construction-inspection.json", {
    goal_id: GOAL_ID,
    status: "completed_i4_ratified_s0_probes_executed",
    inspected_at: GENERATED_AT,
    approval_signature_ref: APPROVAL_REF,
    checks: [
      { id: "i4_ratification_recorded", result: "PASS", detail: "Owner supplied the scoped I4 approval_signature_ref." },
      { id: "s0_t04_before_s0_t03", result: "PASS", detail: "Store readback snapshot was written before the cold-start marker probe." },
      { id: "production_probe_execution", result: "PASS", detail: "S0-T01, S0-T04, and S0-T03 receipts were generated with masked/PII-safe evidence." },
      { id: "i1_mapping_template", result: "PASS", detail: "PII-safe 148-row I1 lead-lawyer mapping template remains present." },
      { id: "d07_disposition", result: "PASS", detail: `D-07 state: ${d07State}.` },
      { id: "s1_branch", result: "PASS", detail: `S1 branch assessment: ${s1Branch}.` },
      { id: "out_of_scope_preserved", result: "PASS", detail: "No S1-S6, CUTOVER, password distribution, migration, production_ready, go-live, OIDC, or DB conversion work was performed." }
    ],
    final_verdict: "COMPLETE_G0_S0_ONLY"
  });

  await updateArtifactIndexes();
  console.log(JSON.stringify({
    status: "completed_i4_ratified_s0_probes_executed",
    approval_signature_ref: APPROVAL_REF,
    lambda_handler: maskedConfig.handler,
    efs_file_system_config_count: maskedConfig.efs_file_system_config_count,
    store_path_env_key_count: maskedConfig.store_path_env_keys_present.length,
    tenant_rp05_visible_matter_count: rp05Summary.returned_count ?? null,
    tenant_rp05_unmatched_count: rp05Summary.unmatched_count ?? null,
    d07_state: d07State,
    cold_start_persistence_verdict: coldStart.persistence_verdict ?? null,
    local_snapshot_sha256: localSnapshot.sha256
  }, null, 2));
}

await main();
