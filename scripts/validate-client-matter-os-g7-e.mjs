#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createMigrationG7AccountingConnectorExportDescriptor,
  createMigrationG7DashboardDescriptor,
  createMigrationG7ECutoverCloseoutDescriptor,
  createMigrationG7ImportValidationFrameworkDescriptor,
  createMigrationG7MigrationBatchDescriptor,
} from "../packages/migration/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G7-W14-T006",
  "LFOS-G7-W14-T007",
  "LFOS-G7-W14-T008",
  "LFOS-G7-W14-T009",
  "LFOS-G7-W14-T010",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"),
  path.join(ROOT, "60-g7-d-integrations-migration-foundation-report.md"),
  path.join(ROOT, "61-g7-e-migration-cutover-closeout-report.md"),
  path.resolve("contracts/external-integrations-ii-contract.json"),
  path.resolve("contracts/migration-platform-contract.json"),
  path.resolve("packages/migration/src/client-matter-g7.js"),
  path.resolve("packages/migration/src/index.js"),
  path.resolve("packages/migration/test/client-matter-g7-migration-cutover-closeout.test.js"),
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

const tenant_id = "tenant_g7e_validator";
const migration_batch_id = "batch_g7e_validator";

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G7-E validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "56-g7-enterprise-hardening-entry-plan.md"));
  const g7dReport = await readText(path.join(ROOT, "60-g7-d-integrations-migration-foundation-report.md"));
  const report = await readText(path.join(ROOT, "61-g7-e-migration-cutover-closeout-report.md"));
  const source = await readText(path.resolve("packages/migration/src/client-matter-g7.js"));
  const index = await readText(path.resolve("packages/migration/src/index.js"));
  const test = await readText(path.resolve("packages/migration/test/client-matter-g7-migration-cutover-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const rp23Contract = await readJson(path.resolve("contracts/external-integrations-ii-contract.json"));
  const rp25Contract = await readJson(path.resolve("contracts/migration-platform-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G7-E TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G7-E TUW missing from G7 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G7-E TUW missing from G7-E report.");
  }

  requireIncludes(g7dReport, "G7-D Integrations Migration Foundation Report", "MISSING_G7D_HANDOFF", "G7-E must retain the G7-D handoff report dependency.");

  for (const phrase of [
    "G7-E Migration Cutover Closeout Report",
    "This slice does not claim G7 runtime readiness",
    "migration batch model",
    "import validation framework",
    "accounting connector export",
    "migration dashboard",
    "migration closeout",
    "cutover readiness evidence",
    "go-live approval",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G7-E report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "MIGRATION_G7E_TUW_COVERAGE",
    "createMigrationG7MigrationBatchDescriptor",
    "createMigrationG7ImportValidationFrameworkDescriptor",
    "createMigrationG7AccountingConnectorExportDescriptor",
    "createMigrationG7DashboardDescriptor",
    "createMigrationG7ECutoverCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "MIGRATION_G7E_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_MIGRATION_SOURCE_EXPORT", "G7-E migration export missing.");
    requireIncludes(test, symbol, "MISSING_MIGRATION_TEST_MARKER", "G7-E migration export missing test coverage.");
  }

  requireIncludes(index, "client-matter-g7.js", "MISSING_MIGRATION_INDEX_EXPORT", "Migration index must export G7 Client-Matter descriptors.");

  for (const marker of [
    "migration_batch_import_audit_required",
    "migration_batch_dry_run_only_required",
    "import_validation_duplicate_party_detection_required",
    "import_validation_auto_merge_blocked",
    "accounting_export_human_review_required",
    "accounting_export_external_send_blocked",
    "migration_dashboard_failed_row_review_required",
    "migration_dashboard_customer_data_leak_blocked",
    "migration_cutover_closeout_evidence_required",
    "migration_cutover_go_live_claim_blocked",
  ]) {
    requireIncludes(source, marker, "MISSING_MIGRATION_SOURCE_MARKER", "G7-E migration source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g7e:validate"] !== "node scripts/validate-client-matter-os-g7-e.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g7e:validate.");
  }

  if (
    rp23Contract.program_contract?.program_id !== "RP23" ||
    !hasKeyValue(rp23Contract, "descriptor_only", true) ||
    !hasKeyValue(rp23Contract, "wehago_runtime_opened", false) ||
    !hasKeyValue(rp23Contract, "douzone_runtime_opened", false) ||
    !hasKeyValue(rp23Contract, "tax_export_runtime_opened", false)
  ) {
    addFinding("RP23_CONTRACT_BOUNDARY", "RP23 External Integrations II contract must remain descriptor-only no finance-export runtime evidence.");
  }

  if (
    rp25Contract.program_contract?.program_id !== "RP25" ||
    !hasKeyValue(rp25Contract, "descriptor_only", true) ||
    !hasKeyValue(rp25Contract, "runtime_import_opened", false) ||
    !hasKeyValue(rp25Contract, "external_credential_included", false)
  ) {
    addFinding("RP25_CONTRACT_BOUNDARY", "RP25 Migration Platform contract must remain descriptor-only no-runtime evidence.");
  }

  const batch = createMigrationG7MigrationBatchDescriptor({
    tenant_id,
    migration_batch: {
      migration_batch_id,
      source_system: "sharepoint",
      source_manifest_ref: "manifest_g7e_validator",
      source_lineage_ref: "lineage_g7e_validator",
      import_audit_ref: "audit_g7e_validator",
      import_audit_tested: true,
      dry_run_only: true,
    },
  });
  const validation = createMigrationG7ImportValidationFrameworkDescriptor({
    tenant_id,
    import_validation: {
      validation_run_id: "validation_g7e_validator",
      migration_batch_id,
      duplicate_party_candidates_ref: "duplicate_candidates_g7e_validator",
      duplicate_party_detection_tested: true,
      failed_row_report_ref: "failed_rows_g7e_validator",
      schema_validation_tested: true,
      review_queue_ref: "review_queue_g7e_validator",
      human_review_required: true,
    },
  });
  const accountingExport = createMigrationG7AccountingConnectorExportDescriptor({
    tenant_id,
    accounting_export: {
      accounting_export_id: "accounting_export_g7e_validator",
      migration_batch_id,
      provider: "Douzone",
      preview_payload_ref: "preview_g7e_validator",
      preview_generated: true,
      review_approval_ref: "review_g7e_validator",
      human_review_required: true,
    },
  });
  const dashboard = createMigrationG7DashboardDescriptor({
    tenant_id,
    migration_dashboard: {
      tenant_id,
      dashboard_id: "dashboard_g7e_validator",
      tenant_scoped_query: true,
      failed_row_queue_ref: "failed_rows_g7e_validator",
      failed_row_review_tested: true,
      permission_scope_ref: "permission_g7e_validator",
      permission_scope_reviewed: true,
    },
  });
  const closeout = createMigrationG7ECutoverCloseoutDescriptor({
    tenant_id,
    g7d_handoff_validated: true,
    rp23_contract_validated: true,
    rp25_contract_validated: true,
    cutover_readiness_evidence_ref: "cutover_evidence_g7e_validator",
    cutover_rehearsal_completed: true,
    rollback_plan_ref: "rollback_plan_g7e_validator",
    human_cutover_review_required: true,
    descriptors: [
      batch,
      validation,
      accountingExport,
      dashboard,
      { tuw_id: "LFOS-G7-W14-T010", outcome: "review_required" },
    ],
  });

  if (batch.outcome !== "review_required" || batch.migration_batch_receipt.import_audit_tested !== true) {
    addFinding("MIGRATION_BATCH", "Migration batch descriptor must require import audit evidence.");
  }
  if (validation.outcome !== "review_required" || validation.import_validation_receipt.duplicate_party_detection_tested !== true) {
    addFinding("IMPORT_VALIDATION", "Import validation descriptor must require duplicate Party detection evidence.");
  }
  if (accountingExport.outcome !== "review_required" || accountingExport.accounting_export_receipt.human_review_before_export !== true) {
    addFinding("ACCOUNTING_EXPORT", "Accounting connector export descriptor must require human review before export.");
  }
  if (dashboard.outcome !== "review_required" || dashboard.migration_dashboard_receipt.failed_row_review_tested !== true) {
    addFinding("MIGRATION_DASHBOARD", "Migration dashboard descriptor must require failed-row review evidence.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 5 ||
    closeout.closeout_receipt.cutover_readiness_evidence_recorded !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open" ||
    closeout.closeout_receipt.go_live_approval_claimed !== false
  ) {
    addFinding("G7E_CLOSEOUT", "G7-E closeout must summarize five TUWs while keeping cutover and go-live open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G7-E validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G7-E validation passed.");
console.log("g7e_tuws: LFOS-G7-W14-T006/LFOS-G7-W14-T007/LFOS-G7-W14-T008/LFOS-G7-W14-T009/LFOS-G7-W14-T010");
console.log("migration_batch: import_audit_dry_run_required");
console.log("import_validation: duplicate_party_failed_row_review_required");
console.log("accounting_export: human_review_before_export_required");
console.log("migration_dashboard: failed_row_review_no_leak_required");
console.log("migration_cutover_closeout: cutover_evidence_recorded_go_live_open");
