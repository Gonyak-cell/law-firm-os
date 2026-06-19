#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createIntegrationsG7ConnectorRegistryDescriptor,
  createIntegrationsG7CredentialReferenceDescriptor,
  createIntegrationsG7DIntegrationMigrationFoundationCloseoutDescriptor,
  createIntegrationsG7ReconciliationRunDescriptor,
  createIntegrationsG7SyncCursorDescriptor,
  createIntegrationsG7SyncJobDescriptor,
} from "../packages/integrations-core/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G7-W14-T001",
  "LFOS-G7-W14-T002",
  "LFOS-G7-W14-T003",
  "LFOS-G7-W14-T004",
  "LFOS-G7-W14-T005",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"),
  path.join(ROOT, "59-g7-c-hrx-people-guardrails-report.md"),
  path.join(ROOT, "60-g7-d-integrations-migration-foundation-report.md"),
  path.resolve("contracts/external-integrations-i-contract.json"),
  path.resolve("contracts/migration-platform-contract.json"),
  path.resolve("packages/integrations-core/src/client-matter-g7.js"),
  path.resolve("packages/integrations-core/src/index.js"),
  path.resolve("packages/integrations-core/test/client-matter-g7-integrations-migration-foundation.test.js"),
];

const findings = [];

function addFinding(code, message, details = {}) {
  findings.push({ code, message, details });
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function requireIncludes(text, value, code, message) {
  if (!text.includes(value)) addFinding(code, message, { value });
}

function hasKeyValue(value, key, expected) {
  if (!value || typeof value !== "object") return false;
  if (value[key] === expected) return true;
  return Object.values(value).some((child) => hasKeyValue(child, key, expected));
}

const tenant_id = "tenant_g7d_validator";
const connection_id = "connection_g7d_validator";

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G7-D validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"));
  const g7cReport = await readText(path.join(ROOT, "59-g7-c-hrx-people-guardrails-report.md"));
  const report = await readText(path.join(ROOT, "60-g7-d-integrations-migration-foundation-report.md"));
  const source = await readText(path.resolve("packages/integrations-core/src/client-matter-g7.js"));
  const index = await readText(path.resolve("packages/integrations-core/src/index.js"));
  const test = await readText(path.resolve("packages/integrations-core/test/client-matter-g7-integrations-migration-foundation.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const rp22Contract = await readJson(path.resolve("contracts/external-integrations-i-contract.json"));
  const rp25Contract = await readJson(path.resolve("contracts/migration-platform-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G7-D TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G7-D TUW missing from G7 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G7-D TUW missing from G7-D report.");
  }

  requireIncludes(g7cReport, "G7-C HRX People Guardrails Report", "MISSING_G7C_HANDOFF", "G7-D must retain the G7-C handoff report dependency.");

  for (const phrase of [
    "G7-D Integrations Migration Foundation Report",
    "This slice does not claim G7 runtime readiness",
    "connector registry",
    "credential reference model",
    "sync job model",
    "sync cursor model",
    "reconciliation run",
    "mismatch report tests",
    "go-live approval",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G7-D report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "INTEGRATIONS_G7D_TUW_COVERAGE",
    "createIntegrationsG7ConnectorRegistryDescriptor",
    "createIntegrationsG7CredentialReferenceDescriptor",
    "createIntegrationsG7SyncJobDescriptor",
    "createIntegrationsG7SyncCursorDescriptor",
    "createIntegrationsG7ReconciliationRunDescriptor",
    "createIntegrationsG7DIntegrationMigrationFoundationCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "INTEGRATIONS_G7D_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_INTEGRATIONS_SOURCE_EXPORT", "G7-D integrations export missing.");
    requireIncludes(test, symbol, "MISSING_INTEGRATIONS_TEST_MARKER", "G7-D integrations export missing test coverage.");
  }

  requireIncludes(index, "client-matter-g7.js", "MISSING_INTEGRATIONS_INDEX_EXPORT", "Integrations index must export G7 Client-Matter descriptors.");

  for (const marker of [
    "connector_registry_credential_exposure_blocked",
    "credential_reference_secret_not_returned_required",
    "credential_reference_secret_material_blocked",
    "sync_job_retry_policy_required",
    "sync_job_idempotency_required",
    "sync_cursor_resumable_sync_required",
    "sync_cursor_value_exposure_blocked",
    "reconciliation_run_mismatch_report_required",
    "reconciliation_run_auto_resolve_blocked",
    "integration_migration_foundation_tuw_coverage_required",
    "integration_migration_foundation_go_live_claim_blocked",
  ]) {
    requireIncludes(source, marker, "MISSING_INTEGRATIONS_SOURCE_MARKER", "G7-D integrations source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g7d:validate"] !== "node scripts/validate-client-matter-os-g7-d.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g7d:validate.");
  }

  if (
    rp22Contract.program?.program_id !== "RP22" ||
    rp22Contract.program?.descriptor_only !== true ||
    rp22Contract.program?.authority_boundaries?.external_api_runtime_opened !== false ||
    rp22Contract.program?.authority_boundaries?.credential_persistence_opened !== false
  ) {
    addFinding("RP22_CONTRACT_BOUNDARY", "RP22 External Integrations I contract must remain descriptor-only no-runtime evidence.");
  }

  if (
    rp25Contract.program_contract?.program_id !== "RP25" ||
    !hasKeyValue(rp25Contract, "descriptor_only", true) ||
    !hasKeyValue(rp25Contract, "runtime_import_opened", false) ||
    !hasKeyValue(rp25Contract, "external_credential_included", false)
  ) {
    addFinding("RP25_CONTRACT_BOUNDARY", "RP25 Migration Platform contract must remain descriptor-only no-runtime evidence.");
  }

  const connector = createIntegrationsG7ConnectorRegistryDescriptor({
    tenant_id,
    connector_registry: {
      tenant_id,
      connection_id,
      provider: "microsoft_365",
      matter_scope_ref: "matter_scope_g7d_validator",
      permission_decision_ref: "permission_g7d_validator",
      permission_scope_reviewed: true,
    },
  });
  const credential = createIntegrationsG7CredentialReferenceDescriptor({
    tenant_id,
    credential_ref: {
      credential_ref_id: "credential_g7d_validator",
      connection_id,
      secret_storage_ref: "vault_ref_g7d_validator",
      rotation_status: "reviewed",
      last_reviewed_at: "2026-06-19",
    },
  });
  const syncJob = createIntegrationsG7SyncJobDescriptor({
    tenant_id,
    sync_job: {
      sync_job_id: "sync_job_g7d_validator",
      connection_id,
      retry_policy_ref: "retry_policy_g7d_validator",
      retry_attempt_limit: 3,
      idempotency_key: "idempotency_g7d_validator",
      duplicate_command_safe: true,
    },
  });
  const cursor = createIntegrationsG7SyncCursorDescriptor({
    tenant_id,
    sync_cursor: {
      cursor_id: "cursor_g7d_validator",
      sync_job_id: "sync_job_g7d_validator",
      previous_cursor_ref: "cursor_previous_g7d_validator",
      resume_token_ref: "resume_ref_g7d_validator",
      resumable_sync_tested: true,
    },
  });
  const reconciliation = createIntegrationsG7ReconciliationRunDescriptor({
    tenant_id,
    reconciliation_run: {
      reconciliation_run_id: "reconciliation_g7d_validator",
      connection_id,
      mismatch_report_ref: "mismatch_report_g7d_validator",
      mismatch_report_tested: true,
      human_review_required: true,
    },
  });
  const closeout = createIntegrationsG7DIntegrationMigrationFoundationCloseoutDescriptor({
    tenant_id,
    g7c_handoff_validated: true,
    rp22_contract_validated: true,
    rp25_contract_validated: true,
    descriptors: [connector, credential, syncJob, cursor, reconciliation],
  });

  if (connector.outcome !== "review_required" || connector.connector_registry_receipt.tenant_matter_scope_tested !== true) {
    addFinding("CONNECTOR_REGISTRY", "Connector registry descriptor must require tenant/matter scope evidence.");
  }
  if (credential.outcome !== "review_required" || credential.credential_reference_receipt.secret_ref_only_tested !== true) {
    addFinding("CREDENTIAL_REFERENCE", "Credential reference descriptor must require secret-ref-only evidence.");
  }
  if (syncJob.outcome !== "review_required" || syncJob.sync_job_receipt.idempotency_tested !== true) {
    addFinding("SYNC_JOB", "Sync job descriptor must require idempotency evidence.");
  }
  if (cursor.outcome !== "review_required" || cursor.sync_cursor_receipt.resumable_sync_tested !== true) {
    addFinding("SYNC_CURSOR", "Sync cursor descriptor must require resumable sync evidence.");
  }
  if (reconciliation.outcome !== "review_required" || reconciliation.reconciliation_run_receipt.mismatch_report_tested !== true) {
    addFinding("RECONCILIATION_RUN", "Reconciliation run descriptor must require mismatch report evidence.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 5 ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open" ||
    closeout.closeout_receipt.go_live_approval_claimed !== false
  ) {
    addFinding("G7D_CLOSEOUT", "G7-D closeout must summarize five TUWs while keeping readiness and go-live open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G7-D validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G7-D validation passed.");
console.log("g7d_tuws: LFOS-G7-W14-T001/LFOS-G7-W14-T002/LFOS-G7-W14-T003/LFOS-G7-W14-T004/LFOS-G7-W14-T005");
console.log("connector_registry: no_credential_exposure");
console.log("credential_reference: secret_not_returned");
console.log("sync_job: retry_idempotency_required");
console.log("sync_cursor: resumable_sync_required");
console.log("reconciliation_run: mismatch_report_human_review_required");
console.log("integration_migration_foundation: runtime_readiness_open_go_live_open");
