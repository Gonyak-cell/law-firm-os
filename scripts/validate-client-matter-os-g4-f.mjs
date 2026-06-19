#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createDmsDocument,
  createDmsDocumentVersion,
  createDmsG4AuditCoverageDescriptor,
  createDmsG4FDmsCloseoutDescriptor,
  createDmsG4WorkspaceUiDescriptor,
} from "../packages/dms/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = ["LFOS-G4-W06-T014", "LFOS-G4-W06-T015", "LFOS-G4-W06-T016"];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "34-g4-matter-dms-entry-plan.md"),
  path.join(ROOT, "38-g4-d-dms-workspace-document-foundation-report.md"),
  path.join(ROOT, "39-g4-e-dms-security-email-search-report.md"),
  path.join(ROOT, "40-g4-f-dms-ui-audit-closeout-report.md"),
  path.resolve("packages/dms/src/client-matter-g4.js"),
  path.resolve("packages/dms/test/client-matter-g4-dms-ui-audit-closeout.test.js"),
  path.resolve("contracts/dms-core-contract.json"),
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

const tenant_id = "tenant_g4f_validator";
const actor_id = "actor_g4f_validator";
const matter_id = "matter_g4f_validator";
const workspace_id = "workspace_g4f_validator";

function document(overrides = {}) {
  return createDmsDocument({
    document_id: "doc_g4f_validator",
    tenant_id,
    matter_id,
    workspace_id,
    folder_id: "folder_g4f_validator",
    title: "Synthetic DMS UI document",
    status: "active",
    current_version_id: "version_g4f_validator_v2",
    permission_envelope_id: "perm_g4f_document",
    audit_trace_id: "audit_g4f_document",
    ...overrides,
  });
}

function version(overrides = {}) {
  return createDmsDocumentVersion({
    version_id: "version_g4f_validator_v2",
    document_id: "doc_g4f_validator",
    tenant_id,
    matter_id,
    version_number: 2,
    status: "current",
    file_object_id: "file_g4f_validator_v2",
    permission_envelope_id: "perm_g4f_version",
    audit_trace_id: "audit_g4f_version",
    ...overrides,
  });
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G4-F validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "34-g4-matter-dms-entry-plan.md"));
  const g4dReport = await readText(path.join(ROOT, "38-g4-d-dms-workspace-document-foundation-report.md"));
  const g4eReport = await readText(path.join(ROOT, "39-g4-e-dms-security-email-search-report.md"));
  const report = await readText(path.join(ROOT, "40-g4-f-dms-ui-audit-closeout-report.md"));
  const source = await readText(path.resolve("packages/dms/src/client-matter-g4.js"));
  const testSource = await readText(path.resolve("packages/dms/test/client-matter-g4-dms-ui-audit-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const dmsContract = await readJson(path.resolve("contracts/dms-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G4-F TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G4-F TUW missing from G4 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G4-F TUW missing from G4-F report.");
  }

  requireIncludes(g4dReport, "G4-D DMS Workspace Document Foundation Report", "G4D_DEPENDENCY", "G4-F must build on G4-D DMS evidence.");
  requireIncludes(g4eReport, "G4-E DMS Security Email Search Report", "G4E_DEPENDENCY", "G4-F must build on G4-E DMS evidence.");
  requireIncludes(riskRegister, "R-005", "R005_DEPENDENCY", "G4-F must preserve AI DMS permission bypass control.");
  requireIncludes(riskRegister, "R-011", "R011_DEPENDENCY", "G4-F must preserve DMS search ACL control.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G4-F must preserve descriptor/runtime confusion control.");

  for (const phrase of [
    "G4-F DMS UI Audit Closeout Report",
    "This slice does not claim G4 runtime readiness",
    "DMS workspace UI version and privilege display",
    "view/download/share audit coverage",
    "G4 DMS closeout evidence",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G4-F report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "createDmsG4WorkspaceUiDescriptor",
    "createDmsG4AuditCoverageDescriptor",
    "createDmsG4FDmsCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G4-F descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G4-F descriptor export missing test coverage.");
  }

  for (const marker of [
    "dms_ui_version_display_required",
    "dms_ui_privilege_display_required",
    "dms_ui_raw_storage_or_bytes_leak_blocked",
    "dms_audit_view_event_required",
    "dms_audit_download_event_required",
    "dms_audit_share_event_required",
    "dms_audit_sensitive_payload_leak_blocked",
    "dms_closeout_ui_evidence_required",
    "dms_closeout_audit_evidence_required",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G4-F source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g4f:validate"] !== "node scripts/validate-client-matter-os-g4-f.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g4f:validate.");
  }

  if (
    dmsContract.program?.program_id !== "RP06" ||
    dmsContract.no_write_attestation?.executes_object_storage_read !== false ||
    dmsContract.no_write_attestation?.executes_search_indexing !== false
  ) {
    addFinding("DMS_CONTRACT_BOUNDARY", "RP06 DMS contract must remain descriptor-only no-runtime evidence.");
  }

  const ui = createDmsG4WorkspaceUiDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    current_version: version(),
    privilege_label: { label_id: "priv_g4f", classification: "privileged" },
    ui_state: { displayed_version_id: "version_g4f_validator_v2", visible_privilege_label: "privileged" },
  });
  const blockedUi = createDmsG4WorkspaceUiDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    current_version: version(),
    privilege_label: { label_id: "priv_g4f", classification: "privileged" },
    ui_state: { displayed_version_id: "wrong_version", exposes_raw_storage_path: true },
  });
  const audit = createDmsG4AuditCoverageDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    audit_events: [
      { event_type: "view", document_id: "doc_g4f_validator", audit_ref: "audit:g4f:view" },
      { event_type: "download", document_id: "doc_g4f_validator", audit_ref: "audit:g4f:download" },
      { event_type: "share", document_id: "doc_g4f_validator", audit_ref: "audit:g4f:share" },
    ],
  });
  const blockedAudit = createDmsG4AuditCoverageDescriptor({
    tenant_id,
    actor_id,
    document: document(),
    audit_events: [
      { event_type: "view", document_id: "doc_g4f_validator", audit_ref: "audit:g4f:view" },
      { event_type: "download", document_id: "doc_g4f_validator", document_bytes: "secret" },
    ],
  });
  const closeout = createDmsG4FDmsCloseoutDescriptor({ tenant_id, descriptors: [ui, audit] });

  if (
    ui.outcome !== "review_required" ||
    ui.version_displayed !== true ||
    ui.privilege_label_displayed !== true ||
    ui.raw_storage_path_rendered !== false ||
    blockedUi.outcome !== "blocked" ||
    !blockedUi.blocked_claims.includes("dms_ui_version_display_required") ||
    !blockedUi.blocked_claims.includes("dms_ui_raw_storage_or_bytes_leak_blocked")
  ) {
    addFinding("DMS_UI", "Workspace UI descriptor must require version/privilege display and block leaks.");
  }
  if (
    audit.outcome !== "review_required" ||
    audit.audit_receipt.view_event_tested !== true ||
    audit.audit_receipt.download_event_tested !== true ||
    audit.audit_receipt.share_event_tested !== true ||
    audit.audit_receipt.audit_event_written !== false ||
    blockedAudit.outcome !== "blocked" ||
    !blockedAudit.blocked_claims.includes("dms_audit_share_event_required") ||
    !blockedAudit.blocked_claims.includes("dms_audit_sensitive_payload_leak_blocked")
  ) {
    addFinding("DMS_AUDIT", "Audit coverage descriptor must require view/download/share and block sensitive payload leaks.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 3 ||
    closeout.workspace_ui_tested !== true ||
    closeout.audit_coverage_tested !== true ||
    closeout.dms_runtime_evidence_recorded !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G4F_CLOSEOUT", "G4-F closeout must summarize UI/audit evidence and keep readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G4-F validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G4-F validation passed.");
console.log("g4f_tuws: LFOS-G4-W06-T014/LFOS-G4-W06-T015/LFOS-G4-W06-T016");
console.log("workspace_ui: version_privilege_display_no_bytes_or_raw_path");
console.log("audit_coverage: view_download_share_no_sensitive_payload");
console.log("dms_closeout: runtime_readiness_claim_open");
