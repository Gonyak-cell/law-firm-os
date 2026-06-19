import assert from "node:assert/strict";
import test from "node:test";

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
} from "../src/index.js";

const tenant_id = "tenant_g4d_validator";
const matter_id = "matter_g4d";
const workspace_id = "workspace_g4d";
const sha256 = "a".repeat(64);

function workspace(overrides = {}) {
  return createDmsWorkspace({
    workspace_id,
    tenant_id,
    matter_id,
    name: "G4-D matter workspace",
    status: "active",
    permission_envelope_id: "perm_g4d_workspace",
    audit_trace_id: "audit_g4d_workspace",
    ...overrides,
  });
}

function folder(overrides = {}) {
  return createDmsFolder({
    folder_id: "folder_g4d_root",
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
    file_object_id: "file_g4d_v1",
    tenant_id,
    matter_id,
    storage_pointer_ref: "object-store-ref:g4d/file-v1",
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
    version_id: "version_g4d_v1",
    document_id: "doc_g4d",
    tenant_id,
    matter_id,
    version_number: 1,
    status: "current",
    file_object_id: "file_g4d_v1",
    permission_envelope_id: "perm_g4d_version",
    audit_trace_id: "audit_g4d_version",
    ...overrides,
  });
}

function document(overrides = {}) {
  return createDmsDocument({
    document_id: "doc_g4d",
    tenant_id,
    matter_id,
    workspace_id,
    folder_id: "folder_g4d_root",
    title: "Synthetic pleading",
    status: "active",
    current_version_id: "version_g4d_v1",
    permission_envelope_id: "perm_g4d_document",
    audit_trace_id: "audit_g4d_document",
    ...overrides,
  });
}

test("G4-D DMS workspace descriptor requires matter trace", () => {
  const descriptor = createDmsG4WorkspaceDescriptor({
    tenant_id,
    matter_id,
    workspace: workspace(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.workspace_receipt.matter_required_tested, true);
  assert.equal(descriptor.workspace_receipt.workspace_created, false);

  const blocked = createDmsG4WorkspaceDescriptor({
    tenant_id,
    matter_id,
    workspace: {
      ...workspace(),
      matter_id: "",
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_workspace_schema_validation_required"));
  assert.ok(blocked.blocked_claims.includes("dms_workspace_matter_required"));
});

test("G4-D folder path descriptor enforces path permission and traversal block", () => {
  const descriptor = createDmsG4FolderPathDescriptor({
    tenant_id,
    workspace: workspace(),
    folder: folder(),
    path_segments: ["Pleadings", "Filed"],
    path_permission_ref: "path-perm:g4d",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.folder_receipt.path_permission_tested, true);
  assert.equal(descriptor.folder_receipt.folder_created, false);

  const blocked = createDmsG4FolderPathDescriptor({
    tenant_id,
    workspace: workspace(),
    folder: folder(),
    path_segments: ["Pleadings", ".."],
    path_permission_ref: "path-perm:g4d",
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_folder_path_traversal_blocked"));
});

test("G4-D document upload descriptor requires audit and avoids object writes", () => {
  const descriptor = createDmsG4DocumentUploadDescriptor({
    tenant_id,
    workspace: workspace(),
    document: document(),
    version: version(),
    file_object: fileObject(),
    upload_audit_ref: "audit:g4d:upload",
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.upload_receipt.upload_audit_required, true);
  assert.equal(descriptor.upload_receipt.object_storage_written, false);
  assert.equal(descriptor.exposes_document_bytes, false);
  assert.equal(descriptor.sanitized_storage_pointer_ref, `dms-file-object:${tenant_id}:file_g4d_v1`);
});

test("G4-D document version descriptor blocks mutable historical versions", () => {
  const descriptor = createDmsG4DocumentVersionDescriptor({
    tenant_id,
    document: document({ current_version_id: "version_g4d_v2" }),
    version: version({ version_id: "version_g4d_v2", version_number: 2, file_object_id: "file_g4d_v2" }),
    previous_versions: [version()],
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.version_receipt.immutable_version_tested, true);
  assert.equal(descriptor.version_receipt.existing_version_mutated, false);

  const blocked = createDmsG4DocumentVersionDescriptor({
    tenant_id,
    document: document(),
    version: version({ version_number: 1 }),
    previous_versions: [version()],
    mutates_existing_version: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_document_version_immutable_required"));
  assert.ok(blocked.blocked_claims.includes("dms_document_version_number_not_incremented"));
});

test("G4-D file object descriptor blocks raw storage path leaks", () => {
  const descriptor = createDmsG4FileObjectStorageDescriptor({
    tenant_id,
    file_object: fileObject(),
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.raw_storage_pointer_exposed, false);
  assert.equal(descriptor.storage_receipt.object_storage_read, false);

  const blocked = createDmsG4FileObjectStorageDescriptor({
    tenant_id,
    file_object: fileObject({ storage_pointer_ref: "s3://secret-bucket/path/doc.pdf" }),
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_file_object_raw_storage_pointer_blocked"));
});

test("G4-D document lineage hash descriptor detects hash mismatch", () => {
  const descriptor = createDmsG4DocumentLineageHashDescriptor({
    tenant_id,
    document: document(),
    versions: [version()],
    file_objects: [fileObject()],
    expected_hashes: {
      version_g4d_v1: sha256,
    },
  });

  assert.equal(descriptor.outcome, "review_required");
  assert.equal(descriptor.lineage_entries[0].hash_matches_expected, true);
  assert.equal(descriptor.lineage_receipt.hash_mismatch_detection_tested, true);
  assert.equal(descriptor.lineage_receipt.object_storage_read, false);

  const blocked = createDmsG4DocumentLineageHashDescriptor({
    tenant_id,
    document: document(),
    versions: [version()],
    file_objects: [fileObject()],
    expected_hashes: {
      version_g4d_v1: "b".repeat(64),
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("dms_document_hash_mismatch_detected"));
});

test("G4-D closeout descriptor summarizes DMS foundation evidence", () => {
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
    document: document({ current_version_id: "version_g4d_v2" }),
    version: version({ version_id: "version_g4d_v2", version_number: 2, file_object_id: "file_g4d_v2" }),
    previous_versions: [version()],
  });
  const storageDescriptor = createDmsG4FileObjectStorageDescriptor({ tenant_id, file_object: fileObject() });
  const lineageDescriptor = createDmsG4DocumentLineageHashDescriptor({
    tenant_id,
    document: document(),
    versions: [version()],
    file_objects: [fileObject()],
    expected_hashes: { version_g4d_v1: sha256 },
  });

  const closeout = createDmsG4DWorkspaceDocumentFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [workspaceDescriptor, folderDescriptor, uploadDescriptor, versionDescriptor, storageDescriptor, lineageDescriptor],
  });

  assert.equal(closeout.outcome, "review_required");
  assert.deepEqual(closeout.tuw_coverage, [
    "LFOS-G4-W06-T001",
    "LFOS-G4-W06-T002",
    "LFOS-G4-W06-T003",
    "LFOS-G4-W06-T004",
    "LFOS-G4-W06-T005",
    "LFOS-G4-W06-T006",
  ]);
  assert.equal(closeout.workspace_required_tested, true);
  assert.equal(closeout.folder_path_permission_tested, true);
  assert.equal(closeout.document_upload_audit_tested, true);
  assert.equal(closeout.immutable_version_tested, true);
  assert.equal(closeout.raw_path_leak_tested, true);
  assert.equal(closeout.hash_lineage_tested, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
});
