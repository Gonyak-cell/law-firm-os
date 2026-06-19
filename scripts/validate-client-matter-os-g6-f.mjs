#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createClientPortalG6ExternalACLDescriptor,
  createClientPortalG6ExternalUserDescriptor,
  createClientPortalG6FPortalRfiFoundationCloseoutDescriptor,
  createClientPortalG6PortalMatterProjectionDescriptor,
  createClientPortalG6RFIRequestDescriptor,
  createClientPortalG6RFIResponseUploadDescriptor,
} from "../packages/client-portal/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G6-W11-T001",
  "LFOS-G6-W11-T002",
  "LFOS-G6-W11-T003",
  "LFOS-G6-W11-T004",
  "LFOS-G6-W11-T005",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"),
  path.join(ROOT, "53-g6-e-ai-legal-workflows-closeout-report.md"),
  path.join(ROOT, "54-g6-f-portal-rfi-foundation-report.md"),
  path.resolve("contracts/client-portal-core-contract.json"),
  path.resolve("packages/client-portal/src/client-matter-g6.js"),
  path.resolve("packages/client-portal/src/index.js"),
  path.resolve("packages/client-portal/test/client-matter-g6-portal-rfi-foundation.test.js"),
  path.resolve("scripts/validate-client-matter-os-g6-e.mjs"),
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

const tenant_id = "tenant_g6f_validator";
const matter_id = "matter_g6f_validator";
const client_party_id = "party_client_g6f_validator";
const external_user_id = "external_user_g6f_validator";
const rfi_request_id = "rfi_g6f_validator";

function externalUser(overrides = {}) {
  return {
    tenant_id,
    client_party_id,
    external_user_id,
    email_hash: "hash_g6f_validator",
    ...overrides,
  };
}

function projection(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    projection_id: "projection_g6f_validator",
    visible_sections: ["status", "shared_documents"],
    ...overrides,
  };
}

function externalAcl(overrides = {}) {
  return {
    external_acl_id: "acl_g6f_validator",
    grants: [{ document_id: "doc_g6f_validator", shared_with_client: true, permission: "view" }],
    ...overrides,
  };
}

function rfiRequest(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    due_date: "2026-07-01",
    status: "open",
    ...overrides,
  };
}

function upload(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    upload_id: "upload_g6f_validator",
    virus_scan_placeholder: true,
    permission_checked: true,
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G6-F validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const g6eReport = await readText(path.join(ROOT, "53-g6-e-ai-legal-workflows-closeout-report.md"));
  const report = await readText(path.join(ROOT, "54-g6-f-portal-rfi-foundation-report.md"));
  const source = await readText(path.resolve("packages/client-portal/src/client-matter-g6.js"));
  const indexSource = await readText(path.resolve("packages/client-portal/src/index.js"));
  const testSource = await readText(path.resolve("packages/client-portal/test/client-matter-g6-portal-rfi-foundation.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const portalContract = await readJson(path.resolve("contracts/client-portal-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G6-F TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G6-F TUW missing from G6 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G6-F TUW missing from G6-F report.");
  }

  requireIncludes(plan, "G6-F", "G6_PLAN_DEPENDENCY", "G6-F must build on G6 entry plan evidence.");
  requireIncludes(g6eReport, "G6-E AI Legal Workflows Closeout Report", "G6E_DEPENDENCY", "G6-F must depend on G6-E AI legal workflow evidence.");
  requireIncludes(riskRegister, "R-007", "R007_DEPENDENCY", "G6-F must preserve portal overexposure controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G6-F must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G6-F Portal RFI Foundation Report",
    "This slice does not claim G6 runtime readiness",
    "ExternalUser identity separation",
    "PortalMatterProjection",
    "ExternalACL shared-only access",
    "RFIRequest due date/status",
    "RFIResponse upload security placeholders",
    "Client Portal descriptor-only boundaries",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G6-F report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "CLIENT_PORTAL_G6F_TUW_COVERAGE",
    "createClientPortalG6ExternalUserDescriptor",
    "createClientPortalG6PortalMatterProjectionDescriptor",
    "createClientPortalG6ExternalACLDescriptor",
    "createClientPortalG6RFIRequestDescriptor",
    "createClientPortalG6RFIResponseUploadDescriptor",
    "createClientPortalG6FPortalRfiFoundationCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export ${symbol === "CLIENT_PORTAL_G6F_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_SOURCE_EXPORT", "G6-F descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G6-F descriptor export missing test coverage.");
  }
  requireIncludes(indexSource, "export * from \"./client-matter-g6.js\";", "MISSING_INDEX_EXPORT", "G6-F helpers must be exported from package index.");

  for (const marker of [
    "external_user_internal_identity_separation_required",
    "portal_projection_internal_memo_excluded_required",
    "portal_projection_shared_only_documents_required",
    "external_acl_shared_only_access_required",
    "rfi_request_due_date_status_required",
    "rfi_response_upload_security_placeholder_required",
    "g6_portal_rfi_foundation_closeout_evidence_required",
    "g6_portal_requires_ai_legal_workflows_handoff",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G6-F source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g6f:validate"] !== "node scripts/validate-client-matter-os-g6-f.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g6f:validate.");
  }

  if (
    portalContract.program?.program_id !== "RP19" ||
    portalContract.program?.descriptor_only !== true ||
    portalContract.no_write_attestation?.dispatches_client_portal_runtime !== false ||
    portalContract.no_write_attestation?.dispatches_secure_link_runtime !== false ||
    portalContract.no_write_attestation?.dispatches_client_review_runtime !== false ||
    portalContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("CLIENT_PORTAL_CONTRACT_BOUNDARY", "RP19 Client Portal contract must remain descriptor-only no-runtime evidence.");
  }

  const externalUserDescriptor = createClientPortalG6ExternalUserDescriptor({
    tenant_id,
    client_party_id,
    external_user: externalUser(),
  });
  const projectionDescriptor = createClientPortalG6PortalMatterProjectionDescriptor({
    tenant_id,
    matter_id,
    projection: projection(),
    documents: [{ document_id: "doc_g6f_validator", shared_with_client: true }],
  });
  const aclDescriptor = createClientPortalG6ExternalACLDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    external_acl: externalAcl(),
  });
  const rfiDescriptor = createClientPortalG6RFIRequestDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request: rfiRequest(),
  });
  const uploadDescriptor = createClientPortalG6RFIResponseUploadDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    rfi_request_id,
    upload: upload(),
  });
  const closeout = createClientPortalG6FPortalRfiFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [externalUserDescriptor, projectionDescriptor, aclDescriptor, rfiDescriptor, uploadDescriptor],
    ai_legal_workflows_closed: true,
  });

  if (externalUserDescriptor.outcome !== "review_required" || externalUserDescriptor.external_user_receipt.user_employee_separation_tested !== true) {
    addFinding("EXTERNAL_USER", "ExternalUser descriptor must separate external identities from User/Employee records.");
  }
  if (projectionDescriptor.outcome !== "review_required" || projectionDescriptor.portal_projection_receipt.internal_memo_excluded_tested !== true) {
    addFinding("PORTAL_PROJECTION", "PortalMatterProjection descriptor must exclude internal memo and hidden detail evidence.");
  }
  if (aclDescriptor.outcome !== "review_required" || aclDescriptor.external_acl_receipt.shared_only_access_tested !== true) {
    addFinding("EXTERNAL_ACL", "ExternalACL descriptor must require shared-only access.");
  }
  if (rfiDescriptor.outcome !== "review_required" || rfiDescriptor.rfi_request_receipt.due_date_status_tested !== true) {
    addFinding("RFI_REQUEST", "RFIRequest descriptor must require due date and valid status evidence.");
  }
  if (uploadDescriptor.outcome !== "review_required" || uploadDescriptor.rfi_response_upload_receipt.upload_security_placeholder_tested !== true) {
    addFinding("RFI_UPLOAD", "RFIResponse upload descriptor must require upload security placeholders.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 5 ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G6F_CLOSEOUT", "G6-F closeout must summarize five TUWs while keeping runtime readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6-F validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6-F validation passed.");
console.log("g6f_tuws: LFOS-G6-W11-T001/LFOS-G6-W11-T002/LFOS-G6-W11-T003/LFOS-G6-W11-T004/LFOS-G6-W11-T005");
console.log("external_user: user_employee_separation_required");
console.log("portal_projection: internal_memo_excluded");
console.log("external_acl: shared_only_access_required");
console.log("rfi_request: due_date_status_required");
console.log("rfi_upload: security_placeholder_required");
console.log("g6_runtime_readiness_claim: open");
