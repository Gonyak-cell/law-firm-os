#!/usr/bin/env node
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  createDmsDocument,
  createDmsDocumentVersion,
  createDmsFileObject,
  createDmsFolder,
  createDmsG4DWorkspaceDocumentFoundationCloseoutDescriptor,
  createDmsG4DocumentLineageHashDescriptor,
  createDmsG4DocumentUploadDescriptor,
  createDmsG4DocumentVersionDescriptor,
  createDmsG4FileObjectStorageDescriptor,
  createDmsG4FolderPathDescriptor,
  createDmsG4WorkspaceDescriptor,
  createDmsWorkspace,
} from "../packages/dms/src/index.js";

const ROOT = path.resolve("docs/reorganization/client-matter-os");
const REQUIRED_TUWS = [
  "LFOS-G4-W06-T001",
  "LFOS-G4-W06-T002",
  "LFOS-G4-W06-T003",
  "LFOS-G4-W06-T004",
  "LFOS-G4-W06-T005",
  "LFOS-G4-W06-T006",
];
const REQUIRED_FILES = [
  path.join(ROOT, "11-full-tuw-catalog.md"),
  path.join(ROOT, "34-g4-matter-dms-entry-plan.md"),
  path.join(ROOT, "37-g4-c-matter-closeout-ui-report.md"),
  path.join(ROOT, "38-g4-d-dms-workspace-document-foundation-report.md"),
  path.resolve("packages/dms/src/client-matter-g4.js"),
  path.resolve("packages/dms/src/index.js"),
  path.resolve("packages/dms/test/client-matter-g4-dms-foundation.test.js"),
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

const tenant_id = "tenant_g4d_validator";
const matter_id = "matter_g4d_validator";
const workspace_id = "workspace_g4d_validator";
const sha256 = "a".repeat(64);

function workspace(overrides = {}) {
  return createDmsWorkspace({
    workspace_id,
    tenant_id,
    matter_id,
    name: "G4-D validator workspace",
    status: "active",
    permission_envelope_id: "perm_g4d_workspace",
    audit_trace_id: "audit_g4d_workspace",
    ...overrides,
  });
}

function folder(overrides = {}) {
  return createDmsFolder({
    folder_id: "folder_g4d_validator",
    tenant_id,
    matter_id,
    workspace_id,
    name: "Pleadings",
    status: "active",
    permission_envelope_id: "perm_g4d_folder",
    audit_trace_id: "audit_g4d_folder",
    ...overrides,
  });
}

function fileObject(overrides = {}) {
  return createDmsFileObject({
    file_object_id: "file_g4d_validator",
    tenant_id,
    matter_id,
    storage_pointer_ref: "object-store-ref:g4d-validator/file",
    sha256,
    byte_size: 1024,
    mime_type: "application/pdf",
    permission_envelope_id: "perm_g4d_file",
    audit_trace_id: "audit_g4d_file",
    ...overrides,
  });
}

function version(overrides = {}) {
  return createDmsDocumentVersion({
    version_id: "version_g4d_validator_v1",
    document_id: "doc_g4d_validator",
    tenant_id,
    matter_id,
    version_number: 1,
    status: "current",
    file_object_id: "file_g4d_validator",
    permission_envelope_id: "perm_g4d_version",
    audit_trace_id: "audit_g4d_version",
    ...overrides,
  });
}

function document(overrides = {}) {
  return createDmsDocument({
    document_id: "doc_g4d_validator",
    tenant_id,
    matter_id,
    workspace_id,
    folder_id: "folder_g4d_validator",
    title: "Synthetic DMS document",
    status: "active",
    current_version_id: "version_g4d_validator_v1",
    permission_envelope_id: "perm_g4d_document",
    audit_trace_id: "audit_g4d_document",
    ...overrides,
  });
}

for (const file of REQUIRED_FILES) {
  if (!(await exists(file))) addFinding("MISSING_FILE", "Missing G4-D validation dependency.", { file });
}

if (findings.length === 0) {
  const catalog = await readText(path.join(ROOT, "11-full-tuw-catalog.md"));
  const plan = await readText(path.join(ROOT, "34-g4-matter-dms-entry-plan.md"));
  const g4cReport = await readText(path.join(ROOT, "37-g4-c-matter-closeout-ui-report.md"));
  const report = await readText(path.join(ROOT, "38-g4-d-dms-workspace-document-foundation-report.md"));
  const source = await readText(path.resolve("packages/dms/src/client-matter-g4.js"));
  const indexSource = await readText(path.resolve("packages/dms/src/index.js"));
  const testSource = await readText(path.resolve("packages/dms/test/client-matter-g4-dms-foundation.test.js"));
  const pkg = await readJson(path.resolve("package.json"));
  const contract = await readJson(path.resolve("contracts/dms-core-contract.json"));

  for (const tuwId of REQUIRED_TUWS) {
    requireIncludes(catalog, tuwId, "MISSING_CATALOG_TUW", "G4-D TUW missing from full catalog.");
    requireIncludes(plan, tuwId, "MISSING_PLAN_TUW", "G4-D TUW missing from G4 entry plan.");
    requireIncludes(report, tuwId, "MISSING_REPORT_TUW", "G4-D TUW missing from G4-D report.");
  }

  requireIncludes(g4cReport, "G4-C Matter Closeout UI Report", "G4C_DEPENDENCY", "G4-D must build on G4-C Matter evidence.");

  for (const phrase of [
    "G4-D DMS Workspace Document Foundation Report",
    "This slice does not claim G4 runtime readiness",
    "DMS workspace matter requirements",
    "folder path",
    "document upload audit requirements",
    "immutable document versioning",
    "file-object storage abstraction",
    "document hash lineage",
    "without opening runtime writes",
  ]) {
    requireIncludes(report, phrase, "MISSING_REPORT_PHRASE", "G4-D report missing required boundary or scope phrase.");
  }

  requireIncludes(indexSource, `export * from "./client-matter-g4.js";`, "MISSING_INDEX_EXPORT", "DMS package must export G4 descriptor layer.");

  for (const symbol of [
    "createDmsG4WorkspaceDescriptor",
    "createDmsG4FolderPathDescriptor",
    "createDmsG4DocumentUploadDescriptor",
    "createDmsG4DocumentVersionDescriptor",
    "createDmsG4FileObjectStorageDescriptor",
    "createDmsG4DocumentLineageHashDescriptor",
    "createDmsG4DWorkspaceDocumentFoundationCloseoutDescriptor",
  ]) {
    requireIncludes(source, `export function ${symbol}`, "MISSING_SOURCE_EXPORT", "G4-D descriptor export missing.");
    requireIncludes(testSource, symbol, "MISSING_TEST_MARKER", "G4-D descriptor export missing test coverage.");
  }

  for (const marker of [
    "DMS_G4D_SAFE_STORAGE_POINTER_PREFIXES",
    "dms_workspace_matter_required",
    "dms_folder_path_traversal_blocked",
    "dms_upload_document_version_trace_mismatch",
    "dms_document_version_immutable_required",
    "dms_file_object_raw_storage_pointer_blocked",
    "dms_document_hash_mismatch_detected",
    "dms_runtime_readiness_claim",
  ]) {
    requireIncludes(source, marker, "MISSING_SOURCE_MARKER", "G4-D source missing required marker.");
  }

  if (pkg.scripts?.["client-matter:g4d:validate"] !== "node scripts/validate-client-matter-os-g4-d.mjs") {
    addFinding("MISSING_NPM_SCRIPT", "package.json must expose client-matter:g4d:validate.");
  }

  if (contract.program?.program_id !== "RP06" || contract.no_write_attestation?.executes_object_storage_write !== false) {
    addFinding("DMS_CONTRACT_BOUNDARY", "DMS contract must remain RP06 descriptor-only no-object-storage evidence.");
  }

  const workspaceDescriptor = createDmsG4WorkspaceDescriptor({ tenant_id, matter_id, workspace: workspace() });
  const folderDescriptor = createDmsG4FolderPathDescriptor({
    tenant_id,
    workspace: workspace(),
    folder: folder(),
    path_segments: ["Pleadings"],
    path_permission_ref: "path-perm:g4d",
  });
  const uploadDescriptor = createDmsG4DocumentUploadDescriptor({
    tenant_id,
    workspace: workspace(),
    document: document(),
    version: version(),
    file_object: fileObject(),
    upload_audit_ref: "audit:g4d:upload",
  });
  const versionDescriptor = createDmsG4DocumentVersionDescriptor({
    tenant_id,
    document: document({ current_version_id: "version_g4d_validator_v2" }),
    version: version({ version_id: "version_g4d_validator_v2", version_number: 2, file_object_id: "file_g4d_validator_v2" }),
    previous_versions: [version()],
  });
  const storageDescriptor = createDmsG4FileObjectStorageDescriptor({ tenant_id, file_object: fileObject() });
  const blockedStorage = createDmsG4FileObjectStorageDescriptor({
    tenant_id,
    file_object: fileObject({ storage_pointer_ref: "s3://secret/path.pdf" }),
  });
  const lineageDescriptor = createDmsG4DocumentLineageHashDescriptor({
    tenant_id,
    document: document(),
    versions: [version()],
    file_objects: [fileObject()],
    expected_hashes: { version_g4d_validator_v1: sha256 },
  });
  const blockedLineage = createDmsG4DocumentLineageHashDescriptor({
    tenant_id,
    document: document(),
    versions: [version()],
    file_objects: [fileObject()],
    expected_hashes: { version_g4d_validator_v1: "b".repeat(64) },
  });
  const closeout = createDmsG4DWorkspaceDocumentFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [workspaceDescriptor, folderDescriptor, uploadDescriptor, versionDescriptor, storageDescriptor, lineageDescriptor],
  });

  if (
    workspaceDescriptor.outcome !== "review_required" ||
    workspaceDescriptor.workspace_receipt.matter_required_tested !== true ||
    workspaceDescriptor.workspace_receipt.workspace_created !== false
  ) {
    addFinding("WORKSPACE", "Workspace descriptor must require matter trace without creating workspace.");
  }
  if (
    folderDescriptor.outcome !== "review_required" ||
    folderDescriptor.folder_receipt.path_permission_tested !== true ||
    folderDescriptor.folder_receipt.folder_created !== false
  ) {
    addFinding("FOLDER_PATH", "Folder descriptor must prove path permission without persistence.");
  }
  if (
    uploadDescriptor.outcome !== "review_required" ||
    uploadDescriptor.upload_receipt.upload_audit_required !== true ||
    uploadDescriptor.upload_receipt.object_storage_written !== false ||
    uploadDescriptor.exposes_document_bytes !== false
  ) {
    addFinding("DOCUMENT_UPLOAD", "Upload descriptor must require audit without object storage writes or bytes exposure.");
  }
  if (
    versionDescriptor.outcome !== "review_required" ||
    versionDescriptor.version_receipt.immutable_version_tested !== true ||
    versionDescriptor.version_receipt.existing_version_mutated !== false
  ) {
    addFinding("DOCUMENT_VERSION", "Version descriptor must keep immutable version evidence.");
  }
  if (
    storageDescriptor.outcome !== "review_required" ||
    storageDescriptor.raw_storage_pointer_exposed !== false ||
    blockedStorage.outcome !== "blocked" ||
    !blockedStorage.blocked_claims.includes("dms_file_object_raw_storage_pointer_blocked")
  ) {
    addFinding("FILE_OBJECT_STORAGE", "File object descriptor must block raw storage path leaks.");
  }
  if (
    lineageDescriptor.outcome !== "review_required" ||
    lineageDescriptor.lineage_entries[0].hash_matches_expected !== true ||
    blockedLineage.outcome !== "blocked" ||
    !blockedLineage.blocked_claims.includes("dms_document_hash_mismatch_detected")
  ) {
    addFinding("LINEAGE_HASH", "Lineage descriptor must prove hash match and mismatch detection.");
  }
  if (
    closeout.outcome !== "review_required" ||
    closeout.tuw_coverage.length !== 6 ||
    closeout.workspace_required_tested !== true ||
    closeout.folder_path_permission_tested !== true ||
    closeout.document_upload_audit_tested !== true ||
    closeout.immutable_version_tested !== true ||
    closeout.raw_path_leak_tested !== true ||
    closeout.hash_lineage_tested !== true ||
    closeout.closeout_receipt.runtime_readiness_claim !== "open"
  ) {
    addFinding("G4D_CLOSEOUT", "G4-D closeout must summarize DMS foundation evidence and keep readiness open.");
  }
}

if (findings.length > 0) {
  console.error("Client-Matter OS G4-D validation failed:");
  for (const finding of findings) {
    console.error(`- ${finding.code}: ${finding.message}`);
    if (Object.keys(finding.details).length > 0) {
      console.error(`  ${JSON.stringify(finding.details)}`);
    }
  }
  process.exit(1);
}

console.log("Client-Matter OS G4-D validation passed.");
console.log("g4d_tuws: LFOS-G4-W06-T001/LFOS-G4-W06-T002/LFOS-G4-W06-T003/LFOS-G4-W06-T004/LFOS-G4-W06-T005/LFOS-G4-W06-T006");
console.log("workspace_folder: matter_required_and_path_permission");
console.log("document_upload: audit_required_no_object_write");
console.log("version_storage: immutable_version_and_no_raw_path_leak");
console.log("lineage_hash: hash_mismatch_detection");
console.log("dms_runtime_readiness_claim: open");
