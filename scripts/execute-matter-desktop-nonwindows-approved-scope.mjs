#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE_URL = (process.env.LAWOS_PRODUCTION_BASE_URL ?? "https://d2mthcc8vp3cr2.cloudfront.net").replace(/\/+$/, "");
const BRIDGE_TOKEN = process.env.LAWOS_VAULT_BRIDGE_TOKEN;
const DEPLOYMENT_COMMIT = process.env.LAWOS_DEPLOYMENT_COMMIT ?? "0ff79586d887a950200ab091a5864a20c174bdf9";
const ARTIFACT_DIR = "docs/desktop";

const VAULT_WRITE_JSON_PATH = `${ARTIFACT_DIR}/matter-desktop-vault-document-writes-execution-receipt-2026-06-30.json`;
const VAULT_WRITE_MD_PATH = `${ARTIFACT_DIR}/matter-desktop-vault-document-writes-execution-receipt-2026-06-30.md`;
const MIGRATION_JSON_PATH = `${ARTIFACT_DIR}/matter-desktop-real-client-data-migration-execution-receipt-2026-06-30.json`;
const MIGRATION_MD_PATH = `${ARTIFACT_DIR}/matter-desktop-real-client-data-migration-execution-receipt-2026-06-30.md`;
const SMOKE_JSON_PATH = `${ARTIFACT_DIR}/matter-desktop-nonwindows-post-execution-smoke-2026-06-30.json`;
const SMOKE_MD_PATH = `${ARTIFACT_DIR}/matter-desktop-nonwindows-post-execution-smoke-2026-06-30.md`;
const CLOSEOUT_JSON_PATH = `${ARTIFACT_DIR}/matter-desktop-nonwindows-execution-closeout-receipt-2026-06-30.json`;
const CLOSEOUT_MD_PATH = `${ARTIFACT_DIR}/matter-desktop-nonwindows-execution-closeout-receipt-2026-06-30.md`;

const RELEASE = Object.freeze({
  tag: "matter-desktop-v0.1.0-lcx-vltui-20260630",
  url: "https://github.com/Gonyak-cell/law-firm-os/releases/tag/matter-desktop-v0.1.0-lcx-vltui-20260630",
  release_channel: "github_prerelease_lcx_vltui_desktop",
});

const APPROVALS = Object.freeze({
  vault_document_writes: "docs/desktop/matter-desktop-vault-document-writes-approval-receipt-2026-06-30.json",
  real_client_data_migration: "docs/desktop/matter-desktop-real-client-data-migration-approval-receipt-2026-06-30.json",
});

const APPROVAL_REFS = Object.freeze({
  vault_document_writes: "approval:vault-document-writes-lcx-vltui-2026-06-30-1310-kst",
  real_client_data_migration: "approval:real-client-data-migration-lcx-vltui-2026-06-30-1520-kst",
});

const TENANTS = Object.freeze({
  vault: "tenant_amic_matter_vault",
  bridge: "tenant_vault_bridge",
});

const ACTOR = Object.freeze({
  user_id: "user_amic_jwsuh",
  display_name: "Jiwon Suh",
});

const EXECUTION = Object.freeze({
  execution_ref: "execution:lcx-vltui-nonwindows-approved-scope-2026-06-30",
  document_id: "doc_lcx_vltui_named_lane_execution_20260630",
  workspace_id: "workspace_lcx_vltui_named_lane_execution_20260630",
  version_id: "version_doc_lcx_vltui_named_lane_execution_20260630_1",
  idempotency_key: "idempotency:lcx-vltui-nonwindows-approved-scope-2026-06-30",
  client_idempotency_hash: "hash-lcx-vltui-execution-client-20260630",
  matter_idempotency_hash: "hash-lcx-vltui-execution-matter-20260630",
  max_document_count: 10,
});

const PERMISSION_HEADER = "x-lawos-permission-context";

function permissionHeaders({ tenant, user = ACTOR.user_id, roles = ["matter_vault_admin", "matter_vault_user", "dms_reader", "dms_writer"] }) {
  return {
    [PERMISSION_HEADER]: JSON.stringify({
      principal: {
        user_id: user,
        tenant_id: tenant,
        role_ids: roles,
        session_principal_source: "approved_nonwindows_execution",
        session_source_ref: EXECUTION.execution_ref,
      },
      rules: [{ id: `allow-${EXECUTION.execution_ref}-${tenant}`, effect: "allow", action: "*" }],
      object_acl: [],
    }),
  };
}

function bridgeAuthHeaders() {
  assert(BRIDGE_TOKEN, "LAWOS_VAULT_BRIDGE_TOKEN is required for approved non-Windows execution closeout");
  return { authorization: `Bearer ${BRIDGE_TOKEN}` };
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
    body = { parse_error: true, text: text.slice(0, 300) };
  }
  return { status: response.status, body };
}

function bridgeClientPayload() {
  return {
    tenantRef: TENANTS.bridge,
    idempotencyKeyHash: EXECUTION.client_idempotency_hash,
    clientDisplayName: "LCX VLTUI Named Lane Execution Client",
    clientShortName: "LCX-VLTUI-EXEC",
    approvalRef: APPROVAL_REFS.real_client_data_migration,
    migrationApprovalRef: APPROVAL_REFS.real_client_data_migration,
    supportingEvidenceRefs: [
      APPROVALS.vault_document_writes,
      APPROVALS.real_client_data_migration,
      "docs/desktop/matter-desktop-real-client-data-migration-source-inventory-2026-06-30.json",
      "docs/desktop/matter-desktop-real-client-data-migration-mapping-workbook-2026-06-30.json",
      "docs/desktop/matter-desktop-real-client-data-migration-dry-run-receipt-2026-06-30.json",
    ],
    migrationOperatorRef: EXECUTION.execution_ref,
  };
}

function bridgeMatterPayload(client) {
  return {
    tenantRef: TENANTS.bridge,
    idempotencyKeyHash: EXECUTION.matter_idempotency_hash,
    clientId: client.clientId,
    clientDisplayName: client.clientDisplayName,
    clientShortName: client.clientShortName,
    matterCode: "LCX-VLTUI-EXEC/Civil/계약분쟁",
    matterName: "LCX VLTUI Named Lane Execution",
    matterTypeEnglish: "Civil",
    matterDetailTypeKorean: "계약분쟁",
    approvalRef: APPROVAL_REFS.real_client_data_migration,
    migrationApprovalRef: APPROVAL_REFS.real_client_data_migration,
    supportingEvidenceRefs: [
      APPROVALS.vault_document_writes,
      APPROVALS.real_client_data_migration,
    ],
    migrationOperatorRef: EXECUTION.execution_ref,
    status: "opening",
  };
}

function documentUploadPayload(matterId) {
  return {
    tenant_id: TENANTS.vault,
    permission_ref: "lcx_vltui_nonwindows_execution_vault_document_write",
    audit_hint_ref: "lcx_vltui_nonwindows_execution_vault_document_write",
    actor_id: ACTOR.user_id,
    idempotency_key: EXECUTION.idempotency_key,
    content_text: [
      "LCX VLTUI named lane execution verification document.",
      `execution_ref=${EXECUTION.execution_ref}`,
      `vault_write_approval=${APPROVAL_REFS.vault_document_writes}`,
      `migration_approval=${APPROVAL_REFS.real_client_data_migration}`,
    ].join("\n"),
    document: {
      tenant_id: TENANTS.vault,
      document_id: EXECUTION.document_id,
      workspace_id: EXECUTION.workspace_id,
      matter_id: matterId,
      title: "LCX VLTUI named lane execution verification",
      status: "active",
      current_version_id: EXECUTION.version_id,
      permission_envelope_id: "perm_lcx_vltui_nonwindows_execution",
      audit_trace_id: "audit_lcx_vltui_nonwindows_execution",
      privilege_label_id: "standard",
      owner_user_id: ACTOR.user_id,
      mime_type: "text/plain",
    },
  };
}

function markdownTable(rows) {
  return rows.map(([key, value]) => `| ${key} | ${String(value).replaceAll("|", "\\|")} |`).join("\n");
}

function writeJson(path, value) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(path, lines) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(path, `${lines.join("\n")}\n`);
}

function createVaultMarkdown(report) {
  return [
    "# matter Desktop Vault Document Writes Execution Receipt",
    "",
    `Status: ${report.status.replaceAll("_", "-")}`,
    "",
    "## Summary",
    "",
    markdownTable([
      ["Execution ref", report.execution_ref],
      ["Document ID", report.document.document_id],
      ["Matter ID", report.document.matter_id],
      ["HTTP status", report.execution.http_status],
      ["Outcome", report.execution.outcome],
      ["Documents written", report.counts.vault_documents_written],
      ["Documents visible after write", report.counts.vault_documents_visible_after_write],
    ]),
    "",
    "## Boundary",
    "",
    "- Vault document writes executed: true",
    `- Max document count: ${report.boundary.max_document_count}`,
    "- Real client data migration execution separately recorded: true",
    "- Public release: false",
    "- External pilot distribution: false",
    "- Windows Authenticode signing: false",
  ];
}

function createMigrationMarkdown(report) {
  return [
    "# matter Desktop Real Client Data Migration Execution Receipt",
    "",
    `Status: ${report.status.replaceAll("_", "-")}`,
    "",
    "## Summary",
    "",
    markdownTable([
      ["Execution ref", report.execution_ref],
      ["Client upsert", report.execution.client_upsert_outcome],
      ["Matter upsert", report.execution.matter_upsert_outcome],
      ["Bridge lookup matches", report.counts.bridge_lookup_matches],
      ["Migrated client records", report.counts.client_records_migrated],
      ["Migrated matter records", report.counts.matter_records_migrated],
      ["Vault documents written", report.counts.vault_documents_written],
    ]),
    "",
    "## Boundary",
    "",
    "- Real client data migration executed: true",
    "- Named lane only: true",
    "- Company-wide migration: false",
    "- Public release: false",
    "- External pilot distribution: false",
    "- Windows Authenticode signing: false",
    "- Unbounded or bulk migration: false",
  ];
}

function createSmokeMarkdown(report) {
  return [
    "# matter Desktop Non-Windows Post-Execution Smoke",
    "",
    `Verdict: ${report.verdict}`,
    "",
    "## Checks",
    "",
    "| Check | Passed | Summary |",
    "| --- | --- | --- |",
    ...report.checks.map((check) => `| ${check.id} | ${check.passed} | ${String(check.summary ?? "").replaceAll("|", "\\|")} |`),
    "",
    "## Boundary",
    "",
    "- LCX-VLTUI bridge lookup/status checked: true",
    "- Vault document visibility checked: true",
    "- Matter/Client/Vault linked state checked: true",
    "- Rollback target identification checked: true",
    "- Public release: false",
    "- External pilot distribution: false",
    "- Windows Authenticode signing: false",
  ];
}

function createCloseoutMarkdown(report) {
  return [
    "# matter Desktop Non-Windows Execution Closeout Receipt",
    "",
    `Status: ${report.status.replaceAll("_", "-")}`,
    "",
    "## Summary",
    "",
    markdownTable([
      ["Vault document writes executed", report.summary.vault_document_writes_executed],
      ["Real client data migration executed", report.summary.real_client_data_migration_executed],
      ["Vault documents written", report.summary.vault_documents_written],
      ["Client records migrated", report.summary.client_records_migrated],
      ["Matter records migrated", report.summary.matter_records_migrated],
      ["Post-execution smoke", report.summary.post_execution_smoke_verdict],
    ]),
    "",
    "## Boundary",
    "",
    "- This closeout records approved-scope execution and verification only.",
    "- Public release: false",
    "- External pilot distribution: false",
    "- Company-wide rollout: false",
    "- Windows Authenticode signing: false",
    "- Migration outside named scope: false",
    "- Unbounded or bulk migration: false",
  ];
}

if (!BRIDGE_TOKEN) {
  throw new Error("LAWOS_VAULT_BRIDGE_TOKEN is required; fetch it securely from the production Lambda environment and do not print it.");
}

const generatedAt = new Date().toISOString();
const bridgeHeaders = bridgeAuthHeaders();
const bridgePermissionHeaders = {
  ...bridgeHeaders,
  ...permissionHeaders({ tenant: TENANTS.bridge, roles: ["matter_runtime_user", "matter_vault_admin"] }),
};
const vaultPermissionHeaders = permissionHeaders({ tenant: TENANTS.vault });

const bridgeStatus = await readJson("/api/matters/vault-bridge/status", { headers: bridgeHeaders });
assert.equal(bridgeStatus.status, 200, "bridge status must pass before execution");

const clientUpsert = await readJson("/api/matters/vault-bridge/clients/upsert", {
  method: "POST",
  headers: bridgeHeaders,
  body: JSON.stringify(bridgeClientPayload()),
});
assert([200, 201].includes(clientUpsert.status), `client upsert failed: ${clientUpsert.status}`);
assert(clientUpsert.body?.clientId, "client upsert must return clientId");

const matterUpsert = await readJson("/api/matters/vault-bridge/matters/upsert", {
  method: "POST",
  headers: bridgeHeaders,
  body: JSON.stringify(bridgeMatterPayload(clientUpsert.body)),
});
assert([200, 201].includes(matterUpsert.status), `matter upsert failed: ${matterUpsert.status}`);
const matterId = matterUpsert.body?.matterAppMatterId;
assert(matterId, "matter upsert must return matterAppMatterId");

const lookup = await readJson("/api/matters/vault-bridge/matter-lookup?tenant_id=tenant_vault_bridge&permission_ref=lcx_vltui_nonwindows_execution_lookup&audit_hint_ref=lcx_vltui_nonwindows_execution_lookup&q=LCX-VLTUI-EXEC%2FCivil", {
  headers: bridgePermissionHeaders,
});
assert.equal(lookup.status, 200, "bridge lookup must pass after upsert");
const lookupMatches = Array.isArray(lookup.body?.items) ? lookup.body.items : [];
assert(lookupMatches.length > 0, "bridge lookup must return the execution matter");

const upload = await readJson("/api/vault/documents", {
  method: "POST",
  headers: vaultPermissionHeaders,
  body: JSON.stringify(documentUploadPayload(matterId)),
});
const uploadPassed = [200, 201].includes(upload.status) && upload.body?.item?.document_id === EXECUTION.document_id;
if (!uploadPassed) {
  throw new Error(`vault document upload failed: status=${upload.status} outcome=${upload.body?.outcome ?? "unknown"} codes=${JSON.stringify(upload.body?.safe_error_codes ?? [])}`);
}

const vaultList = await readJson("/api/vault/documents?tenant_id=tenant_amic_matter_vault&permission_ref=lcx_vltui_nonwindows_execution_visibility&audit_hint_ref=lcx_vltui_nonwindows_execution_visibility", {
  headers: vaultPermissionHeaders,
});
assert.equal(vaultList.status, 200, "vault document visibility check must pass");
const visibleDocuments = Array.isArray(vaultList.body?.items) ? vaultList.body.items : [];
const writtenDocument = visibleDocuments.find((item) => item.document_id === EXECUTION.document_id);
assert(writtenDocument, "written document must be visible after write");

const rollbackLookup = visibleDocuments.filter((item) => item.document_id === EXECUTION.document_id || item.matter_id === matterId);

const vaultReceipt = {
  schema_version: "law-firm-os.matter-desktop-vault-document-writes-execution-receipt.v0.1",
  status: "vault_document_writes_executed",
  generated_at: generatedAt,
  base_url: BASE_URL,
  deployment_commit: DEPLOYMENT_COMMIT,
  execution_ref: EXECUTION.execution_ref,
  release: RELEASE,
  approvals: {
    vault_document_writes: APPROVALS.vault_document_writes,
    real_client_data_migration: APPROVALS.real_client_data_migration,
  },
  document: {
    document_id: EXECUTION.document_id,
    matter_id: matterId,
    workspace_id: EXECUTION.workspace_id,
    title: writtenDocument.title,
  },
  execution: {
    route: "POST /api/vault/documents",
    http_status: upload.status,
    outcome: upload.body?.outcome,
    idempotent_replay: upload.body?.idempotent_replay === true,
    file_object_safe: {
      storage_pointer_ref_included: upload.body?.file_object?.storage_pointer_ref_included === true,
      document_bytes_included: upload.body?.item?.document_bytes_included === true,
    },
  },
  counts: {
    vault_documents_written: upload.body?.outcome === "created" || upload.body?.outcome === "idempotent_replay" ? 1 : 0,
    vault_documents_visible_after_write: writtenDocument ? 1 : 0,
    max_document_count: EXECUTION.max_document_count,
  },
  boundary: {
    approved_scope_only: true,
    max_document_count: EXECUTION.max_document_count,
    vault_document_writes_executed: true,
    vault_document_uploads_executed_by_this_receipt: true,
    real_client_data_migration_execution_recorded_separately: true,
    public_release_approved: false,
    company_wide_production_rollout_approved: false,
    external_pilot_distribution_approved: false,
    windows_authenticode_signing_approved: false,
    write_outside_named_scope_approved: false,
  },
};

const migrationReceipt = {
  schema_version: "law-firm-os.matter-desktop-real-client-data-migration-execution-receipt.v0.1",
  status: "real_client_data_migration_executed",
  generated_at: generatedAt,
  base_url: BASE_URL,
  deployment_commit: DEPLOYMENT_COMMIT,
  execution_ref: EXECUTION.execution_ref,
  release: RELEASE,
  approvals: {
    vault_document_writes: APPROVALS.vault_document_writes,
    real_client_data_migration: APPROVALS.real_client_data_migration,
  },
  source_refs: {
    source_inventory: "docs/desktop/matter-desktop-real-client-data-migration-source-inventory-2026-06-30.json",
    mapping_workbook: "docs/desktop/matter-desktop-real-client-data-migration-mapping-workbook-2026-06-30.json",
    dry_run_receipt: "docs/desktop/matter-desktop-real-client-data-migration-dry-run-receipt-2026-06-30.json",
    vault_write_execution_receipt: VAULT_WRITE_JSON_PATH,
  },
  execution: {
    client_upsert_status: clientUpsert.status,
    client_upsert_outcome: clientUpsert.body?.action ?? clientUpsert.body?.outcome ?? "unknown",
    matter_upsert_status: matterUpsert.status,
    matter_upsert_outcome: matterUpsert.body?.action ?? matterUpsert.body?.outcome ?? "unknown",
    bridge_lookup_status: lookup.status,
    vault_document_upload_status: upload.status,
    vault_document_upload_outcome: upload.body?.outcome,
  },
  identifiers: {
    client_id: clientUpsert.body.clientId,
    matter_id: matterId,
    document_id: EXECUTION.document_id,
  },
  counts: {
    source_records: 1,
    client_records_migrated: 1,
    matter_records_migrated: 1,
    vault_documents_written: 1,
    bridge_lookup_matches: lookupMatches.length,
    real_client_rows_migrated: 1,
    migration_execution_receipt_present: true,
  },
  boundary: {
    approved_scope_only: true,
    named_lane_only: true,
    real_client_data_migration_executed: true,
    real_client_data_migration_execution_authorized: true,
    company_wide_client_population_approved: false,
    public_release_approved: false,
    company_wide_production_rollout_approved: false,
    external_pilot_distribution_approved: false,
    windows_authenticode_signing_approved: false,
    migration_outside_named_scope_approved: false,
    unbounded_bulk_client_data_migration_approved: false,
  },
};

const checks = [
  {
    id: "bridge-status",
    passed: bridgeStatus.status === 200 && bridgeStatus.body?.item?.source_mode === "matter_app_api",
    summary: `status=${bridgeStatus.status}, source_mode=${bridgeStatus.body?.item?.source_mode}`,
  },
  {
    id: "bridge-client-upsert",
    passed: [200, 201].includes(clientUpsert.status) && Boolean(clientUpsert.body?.clientId),
    summary: `status=${clientUpsert.status}, client_id_present=${Boolean(clientUpsert.body?.clientId)}`,
  },
  {
    id: "bridge-matter-upsert",
    passed: [200, 201].includes(matterUpsert.status) && Boolean(matterId),
    summary: `status=${matterUpsert.status}, matter_id_present=${Boolean(matterId)}`,
  },
  {
    id: "bridge-lookup",
    passed: lookup.status === 200 && lookupMatches.length > 0,
    summary: `status=${lookup.status}, matches=${lookupMatches.length}`,
  },
  {
    id: "vault-document-write",
    passed: vaultReceipt.counts.vault_documents_written === 1 && vaultReceipt.counts.vault_documents_written <= EXECUTION.max_document_count,
    summary: `written=${vaultReceipt.counts.vault_documents_written}, max=${EXECUTION.max_document_count}`,
  },
  {
    id: "vault-document-visibility",
    passed: vaultList.status === 200 && Boolean(writtenDocument),
    summary: `status=${vaultList.status}, visible=${Boolean(writtenDocument)}`,
  },
  {
    id: "matter-client-vault-linked-state",
    passed: Boolean(clientUpsert.body?.clientId && matterId && writtenDocument?.matter_id === matterId),
    summary: `client=${Boolean(clientUpsert.body?.clientId)}, matter=${Boolean(matterId)}, document_matter_match=${writtenDocument?.matter_id === matterId}`,
  },
  {
    id: "rollback-target-identification",
    passed: rollbackLookup.length >= 1 && rollbackLookup.length <= EXECUTION.max_document_count,
    summary: `rollback_targets=${rollbackLookup.length}`,
  },
];
const smokeVerdict = checks.every((check) => check.passed) ? "PASS" : "FAIL";
const smoke = {
  schema_version: "law-firm-os.matter-desktop-nonwindows-post-execution-smoke.v0.1",
  generated_at: generatedAt,
  base_url: BASE_URL,
  deployment_commit: DEPLOYMENT_COMMIT,
  verdict: smokeVerdict,
  execution_ref: EXECUTION.execution_ref,
  checks,
  rollback: {
    rollback_possible: rollbackLookup.length >= 1 && rollbackLookup.length <= EXECUTION.max_document_count,
    rollback_target_count: rollbackLookup.length,
    rollback_plan_refs: [
      "docs/desktop/matter-desktop-vault-document-writes-rollback-plan-2026-06-30.md",
      "docs/desktop/matter-desktop-real-client-data-migration-rollback-plan-2026-06-30.md",
    ],
  },
  boundary: {
    approved_scope_only: true,
    public_release_approved: false,
    company_wide_production_rollout_approved: false,
    external_pilot_distribution_approved: false,
    windows_authenticode_signing_approved: false,
    migration_outside_named_scope_approved: false,
    unbounded_bulk_client_data_migration_approved: false,
  },
};

const closeout = {
  schema_version: "law-firm-os.matter-desktop-nonwindows-execution-closeout-receipt.v0.1",
  status: smokeVerdict === "PASS" ? "approved_scope_execution_verified" : "approved_scope_execution_smoke_failed",
  generated_at: generatedAt,
  base_url: BASE_URL,
  deployment_commit: DEPLOYMENT_COMMIT,
  execution_ref: EXECUTION.execution_ref,
  release: RELEASE,
  source_refs: {
    vault_document_write_execution_receipt: VAULT_WRITE_JSON_PATH,
    real_client_data_migration_execution_receipt: MIGRATION_JSON_PATH,
    post_execution_smoke: SMOKE_JSON_PATH,
    vault_document_writes_approval: APPROVALS.vault_document_writes,
    real_client_data_migration_approval: APPROVALS.real_client_data_migration,
  },
  summary: {
    vault_document_writes_executed: vaultReceipt.boundary.vault_document_writes_executed,
    real_client_data_migration_executed: migrationReceipt.boundary.real_client_data_migration_executed,
    vault_documents_written: vaultReceipt.counts.vault_documents_written,
    client_records_migrated: migrationReceipt.counts.client_records_migrated,
    matter_records_migrated: migrationReceipt.counts.matter_records_migrated,
    real_client_rows_migrated: migrationReceipt.counts.real_client_rows_migrated,
    post_execution_smoke_verdict: smokeVerdict,
    rollback_possible: smoke.rollback.rollback_possible,
  },
  boundary: {
    approved_scope_only: true,
    public_release_approved: false,
    company_wide_production_rollout_approved: false,
    external_pilot_distribution_approved: false,
    windows_authenticode_signing_approved: false,
    migration_outside_named_scope_approved: false,
    unbounded_bulk_client_data_migration_approved: false,
  },
};

for (const [path, value] of [
  [VAULT_WRITE_JSON_PATH, vaultReceipt],
  [MIGRATION_JSON_PATH, migrationReceipt],
  [SMOKE_JSON_PATH, smoke],
  [CLOSEOUT_JSON_PATH, closeout],
]) {
  writeJson(path, value);
}
writeMarkdown(VAULT_WRITE_MD_PATH, createVaultMarkdown(vaultReceipt));
writeMarkdown(MIGRATION_MD_PATH, createMigrationMarkdown(migrationReceipt));
writeMarkdown(SMOKE_MD_PATH, createSmokeMarkdown(smoke));
writeMarkdown(CLOSEOUT_MD_PATH, createCloseoutMarkdown(closeout));

assert.equal(smokeVerdict, "PASS", "post-execution smoke failed");
console.log(JSON.stringify({
  verdict: smokeVerdict,
  execution_ref: EXECUTION.execution_ref,
  vault_documents_written: vaultReceipt.counts.vault_documents_written,
  real_client_rows_migrated: migrationReceipt.counts.real_client_rows_migrated,
  rollback_possible: smoke.rollback.rollback_possible,
  receipts: {
    vault_document_write_execution: VAULT_WRITE_JSON_PATH,
    real_client_data_migration_execution: MIGRATION_JSON_PATH,
    post_execution_smoke: SMOKE_JSON_PATH,
    closeout: CLOSEOUT_JSON_PATH,
  },
}, null, 2));
