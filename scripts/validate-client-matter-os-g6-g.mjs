#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createClientPortalG6ClientApprovalDescriptor,
  createClientPortalG6GPortalDataRoomCloseoutDescriptor,
  createClientPortalG6PortalAuditDescriptor,
  createClientPortalG6SecureLinkViewerDescriptor,
} from "../packages/client-portal/src/index.js";
import { createDataRoomG6DataRoomAclDescriptor } from "../packages/data-room/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G6-W11-T006",
  "LFOS-G6-W11-T007",
  "LFOS-G6-W11-T008",
  "LFOS-G6-W11-T009",
  "LFOS-G6-W11-T010",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "12-risk-register.md"),
  path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"),
  path.join(ROOT, "54-g6-f-portal-rfi-foundation-report.md"),
  path.join(ROOT, "55-g6-g-portal-data-room-closeout-report.md"),
  path.resolve("contracts/client-portal-core-contract.json"),
  path.resolve("contracts/data-room-vdr-core-contract.json"),
  path.resolve("packages/client-portal/src/client-matter-g6.js"),
  path.resolve("packages/client-portal/test/client-matter-g6-portal-data-room-closeout.test.js"),
  path.resolve("packages/data-room/src/client-matter-g6.js"),
  path.resolve("packages/data-room/src/index.js"),
  path.resolve("packages/data-room/test/client-matter-g6-data-room-closeout.test.js"),
  path.resolve("scripts/validate-client-matter-os-g6-f.mjs"),
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

const tenant_id = "tenant_g6g_validator";
const matter_id = "matter_g6g_validator";
const external_user_id = "external_user_g6g_validator";
const room_id = "room_g6g_validator";

function approval(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    approval_id: "approval_g6g_validator",
    approver_external_user_id: external_user_id,
    audit_receipt_id: "audit_approval_g6g_validator",
    ...overrides,
  };
}

function secureLink(overrides = {}) {
  return {
    secure_link_id: "secure_link_g6g_validator",
    expires_at: "2026-07-01T00:00:00.000Z",
    watermark_enabled: true,
    mfa_required: true,
    ...overrides,
  };
}

function auditEvent(event_type, overrides = {}) {
  return {
    tenant_id,
    matter_id,
    external_user_id,
    event_type,
    audit_receipt_id: `audit_${event_type}_g6g_validator`,
    ...overrides,
  };
}

function dataRoom(overrides = {}) {
  return {
    tenant_id,
    matter_id,
    room_id,
    room_level_acl: true,
    grants: [{ room_id, external_user_id, shared_with_external: true }],
    ...overrides,
  };
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G6-G validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const riskRegister = await readText(path.join(ROOT, "12-risk-register.md"));
  const plan = await readText(path.join(ROOT, "48-g6-analytics-ai-portal-entry-plan.md"));
  const g6fReport = await readText(path.join(ROOT, "54-g6-f-portal-rfi-foundation-report.md"));
  const report = await readText(path.join(ROOT, "55-g6-g-portal-data-room-closeout-report.md"));
  const clientPortalSource = await readText(path.resolve("packages/client-portal/src/client-matter-g6.js"));
  const clientPortalTest = await readText(path.resolve("packages/client-portal/test/client-matter-g6-portal-data-room-closeout.test.js"));
  const dataRoomSource = await readText(path.resolve("packages/data-room/src/client-matter-g6.js"));
  const dataRoomIndex = await readText(path.resolve("packages/data-room/src/index.js"));
  const dataRoomTest = await readText(path.resolve("packages/data-room/test/client-matter-g6-data-room-closeout.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const portalContract = await readJson(path.resolve("contracts/client-portal-core-contract.json"));
  const dataRoomContract = await readJson(path.resolve("contracts/data-room-vdr-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G6-G TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G6-G TUW missing from G6 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G6-G TUW missing from G6-G report.");
  }

  requireIncludes(plan, "G6-G", "G6_PLAN_DEPENDENCY", "G6-G must build on G6 entry plan evidence.");
  requireIncludes(g6fReport, "G6-F Portal RFI Foundation Report", "G6F_DEPENDENCY", "G6-G must depend on G6-F portal RFI evidence.");
  requireIncludes(riskRegister, "R-007", "R007_DEPENDENCY", "G6-G must preserve portal overexposure controls.");
  requireIncludes(riskRegister, "R-015", "R015_DEPENDENCY", "G6-G must preserve descriptor/runtime confusion controls.");

  for (const phrase of [
    "G6-G Portal Data Room Closeout Report",
    "This slice does not claim G6 runtime readiness",
    "client approval audit",
    "secure-link viewer controls",
    "DataRoom room-level ACLs",
    "portal external view/upload audit coverage",
    "Client Portal and Data Room descriptor-only boundaries",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G6-G report missing required boundary or scope phrase.");
  }

  for (const symbol of [
    "CLIENT_PORTAL_G6G_TUW_COVERAGE",
    "createClientPortalG6ClientApprovalDescriptor",
    "createClientPortalG6SecureLinkViewerDescriptor",
    "createClientPortalG6PortalAuditDescriptor",
    "createClientPortalG6GPortalDataRoomCloseoutDescriptor",
  ]) {
    requireIncludes(clientPortalSource, `export ${symbol === "CLIENT_PORTAL_G6G_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_CLIENT_PORTAL_EXPORT", "G6-G client portal export missing.");
    requireIncludes(clientPortalTest, symbol, "MISSING_CLIENT_PORTAL_TEST_MARKER", "G6-G client portal export missing test coverage.");
  }
  for (const symbol of ["DATA_ROOM_G6G_TUW_COVERAGE", "createDataRoomG6DataRoomAclDescriptor"]) {
    requireIncludes(dataRoomSource, `export ${symbol === "DATA_ROOM_G6G_TUW_COVERAGE" ? "const" : "function"} ${symbol}`, "MISSING_DATA_ROOM_EXPORT", "G6-G data room export missing.");
    requireIncludes(dataRoomTest, symbol, "MISSING_DATA_ROOM_TEST_MARKER", "G6-G data room export missing test coverage.");
  }
  requireIncludes(dataRoomIndex, "export * from \"./client-matter-g6.js\";", "MISSING_DATA_ROOM_INDEX_EXPORT", "G6-G Data Room helper must be exported from package index.");

  for (const marker of [
    "client_approval_audit_required",
    "secure_link_expiry_required",
    "secure_link_watermark_required",
    "secure_link_mfa_required",
    "portal_audit_external_view_upload_events_required",
    "g6_portal_data_room_closeout_evidence_required",
    "g6_portal_data_room_requires_rfi_foundation_handoff",
  ]) {
    requireIncludes(clientPortalSource, marker, "MISSING_CLIENT_PORTAL_MARKER", "G6-G client portal source missing required marker.");
  }
  for (const marker of ["data_room_room_level_acl_required", "data_room_unauthorized_access_blocked"]) {
    requireIncludes(dataRoomSource, marker, "MISSING_DATA_ROOM_MARKER", "G6-G data room source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g6g:validate"] !== "node scripts/validate-client-matter-os-g6-g.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g6g:validate.");
  }

  if (
    portalContract.program?.program_id !== "RP19" ||
    portalContract.program?.descriptor_only !== true ||
    portalContract.no_write_attestation?.dispatches_client_portal_runtime !== false ||
    portalContract.no_write_attestation?.writes_product_state !== false
  ) {
    addFinding("CLIENT_PORTAL_CONTRACT_BOUNDARY", "RP19 Client Portal contract must remain descriptor-only no-runtime evidence.");
  }
  if (
    dataRoomContract.program?.program_id !== "RP20" ||
    dataRoomContract.program?.descriptor_only !== true ||
    dataRoomContract.program?.runtime_opened !== false
  ) {
    addFinding("DATA_ROOM_CONTRACT_BOUNDARY", "RP20 Data Room contract must remain descriptor-only no-runtime evidence.");
  }

  const approvalDescriptor = createClientPortalG6ClientApprovalDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    approval: approval(),
  });
  const secureLinkDescriptor = createClientPortalG6SecureLinkViewerDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    secure_link: secureLink(),
  });
  const dataRoomDescriptor = createDataRoomG6DataRoomAclDescriptor({
    tenant_id,
    matter_id,
    data_room: dataRoom(),
  });
  const portalAuditDescriptor = createClientPortalG6PortalAuditDescriptor({
    tenant_id,
    matter_id,
    external_user_id,
    audit_events: [auditEvent("external_view"), auditEvent("external_upload")],
  });
  const closeout = createClientPortalG6GPortalDataRoomCloseoutDescriptor({
    tenant_id,
    descriptors: [
      approvalDescriptor,
      secureLinkDescriptor,
      dataRoomDescriptor,
      portalAuditDescriptor,
      { tuw_id: "LFOS-G6-W11-T010", outcome: "review_required" },
    ],
    portal_rfi_foundation_closed: true,
  });

  if (approvalDescriptor.outcome !== "review_required" || approvalDescriptor.client_approval_receipt.approval_audit_tested !== true) {
    addFinding("CLIENT_APPROVAL", "Client approval descriptor must require audit evidence.");
  }
  if (secureLinkDescriptor.outcome !== "review_required" || secureLinkDescriptor.secure_link_receipt.mfa_tested !== true) {
    addFinding("SECURE_LINK", "Secure link descriptor must require expiry, watermark, and MFA evidence.");
  }
  if (dataRoomDescriptor.outcome !== "review_required" || dataRoomDescriptor.data_room_acl_receipt.room_level_acl_tested !== true) {
    addFinding("DATA_ROOM_ACL", "DataRoom descriptor must require room-level ACL evidence.");
  }
  if (portalAuditDescriptor.outcome !== "review_required" || portalAuditDescriptor.portal_audit_receipt.external_view_upload_events_tested !== true) {
    addFinding("PORTAL_AUDIT", "Portal audit descriptor must require external view/upload event evidence.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 5 ||
    closeout.no_internal_data_exposure_tested !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G6G_CLOSEOUT", "G6-G closeout must summarize five TUWs while keeping runtime readiness open and internal exposure closed.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G6-G validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G6-G validation passed.");
console.log("g6g_tuws: LFOS-G6-W11-T006/LFOS-G6-W11-T007/LFOS-G6-W11-T008/LFOS-G6-W11-T009/LFOS-G6-W11-T010");
console.log("client_approval: approval_audit_required");
console.log("secure_link: expiry_watermark_mfa_required");
console.log("data_room: room_level_acl_required");
console.log("portal_audit: external_view_upload_events_required");
console.log("g6_portal_closeout: no_internal_data_exposure");
console.log("g6_runtime_readiness_claim: open");
