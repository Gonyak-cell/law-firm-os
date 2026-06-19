import { validateDmsCoreRecord } from "./validators.js";

export const DMS_G4D_SAFE_STORAGE_POINTER_PREFIXES = Object.freeze([
  "object-store-ref:",
  "reserved-object-ref:",
  "dms-file-object:",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function freezeObject(value) {
  return Object.freeze({ ...(value ?? {}) });
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function noWriteBoundary(tuwId) {
  return {
    tuw_id: tuwId,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    executes_file_upload: false,
    executes_file_download: false,
    executes_object_storage_write: false,
    executes_object_storage_read: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_raw_storage_path: false,
    g4_runtime_readiness_claim: "open",
    dms_runtime_readiness_claim: "open",
  };
}

function hasRawStoragePointer(pointer) {
  const value = String(pointer ?? "");
  if (value.startsWith("/") || value.startsWith("~") || value.includes("..")) return true;
  if (value.includes("://")) return true;
  return !DMS_G4D_SAFE_STORAGE_POINTER_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function safeStoragePointer(fileObject = {}) {
  return `dms-file-object:${fileObject.tenant_id ?? "tenant"}:${fileObject.file_object_id ?? "unknown"}`;
}

export function createDmsG4WorkspaceDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "matter_id", "workspace"], request);
  const workspace = request.workspace ?? {};
  const blockedClaims = [];
  const workspaceValidation = validateDmsCoreRecord("DmsWorkspace", workspace);

  if (missing.length > 0) blockedClaims.push("dms_workspace_required_context_missing");
  if (!workspaceValidation.valid) blockedClaims.push("dms_workspace_schema_validation_required");
  if (request.matter_id && workspace.matter_id && request.matter_id !== workspace.matter_id) {
    blockedClaims.push("dms_workspace_matter_trace_mismatch");
  }
  if (!workspace.matter_id) blockedClaims.push("dms_workspace_matter_required");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T001"),
    descriptor_type: "dms_g4_workspace_descriptor",
    tenant_id: request.tenant_id ?? workspace.tenant_id ?? null,
    matter_id: request.matter_id ?? workspace.matter_id ?? null,
    workspace_id: workspace.workspace_id ?? null,
    workspace_validation: workspaceValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    workspace_receipt: freezeRecord({
      matter_required_tested: true,
      workspace_created: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4FolderPathDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "workspace", "folder", "path_permission_ref"], request);
  const workspace = request.workspace ?? {};
  const folder = request.folder ?? {};
  const pathSegments = freezeArray(request.path_segments);
  const blockedClaims = [];
  const workspaceValidation = validateDmsCoreRecord("DmsWorkspace", workspace);
  const folderValidation = validateDmsCoreRecord("DmsFolder", folder);

  if (missing.length > 0) blockedClaims.push("dms_folder_path_required_context_missing");
  if (!workspaceValidation.valid) blockedClaims.push("dms_folder_workspace_schema_validation_required");
  if (!folderValidation.valid) blockedClaims.push("dms_folder_schema_validation_required");
  if (workspace.workspace_id && folder.workspace_id && workspace.workspace_id !== folder.workspace_id) {
    blockedClaims.push("dms_folder_workspace_trace_mismatch");
  }
  if (workspace.matter_id && folder.matter_id && workspace.matter_id !== folder.matter_id) {
    blockedClaims.push("dms_folder_matter_trace_mismatch");
  }
  if (pathSegments.some((segment) => ["", ".", ".."].includes(String(segment)))) {
    blockedClaims.push("dms_folder_path_traversal_blocked");
  }

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T002"),
    descriptor_type: "dms_g4_folder_path_descriptor",
    tenant_id: request.tenant_id ?? folder.tenant_id ?? workspace.tenant_id ?? null,
    matter_id: folder.matter_id ?? workspace.matter_id ?? null,
    workspace_id: folder.workspace_id ?? workspace.workspace_id ?? null,
    folder_id: folder.folder_id ?? null,
    path_segments: pathSegments,
    path_permission_ref: request.path_permission_ref ?? null,
    workspace_validation: workspaceValidation,
    folder_validation: folderValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    folder_receipt: freezeRecord({
      path_permission_tested: true,
      folder_created: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4DocumentUploadDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "workspace", "document", "version", "file_object", "upload_audit_ref"], request);
  const workspace = request.workspace ?? {};
  const document = request.document ?? {};
  const version = request.version ?? {};
  const fileObject = request.file_object ?? {};
  const blockedClaims = [];
  const workspaceValidation = validateDmsCoreRecord("DmsWorkspace", workspace);
  const documentValidation = validateDmsCoreRecord("DmsDocument", document);
  const versionValidation = validateDmsCoreRecord("DmsDocumentVersion", version);
  const fileObjectValidation = validateDmsCoreRecord("DmsFileObject", fileObject);

  if (missing.length > 0) blockedClaims.push("dms_document_upload_required_context_missing");
  if (!workspaceValidation.valid) blockedClaims.push("dms_upload_workspace_schema_validation_required");
  if (!documentValidation.valid) blockedClaims.push("dms_upload_document_schema_validation_required");
  if (!versionValidation.valid) blockedClaims.push("dms_upload_version_schema_validation_required");
  if (!fileObjectValidation.valid) blockedClaims.push("dms_upload_file_object_schema_validation_required");
  if (workspace.workspace_id && document.workspace_id && workspace.workspace_id !== document.workspace_id) {
    blockedClaims.push("dms_upload_workspace_trace_mismatch");
  }
  if (document.document_id && version.document_id && document.document_id !== version.document_id) {
    blockedClaims.push("dms_upload_document_version_trace_mismatch");
  }
  if (version.file_object_id && fileObject.file_object_id && version.file_object_id !== fileObject.file_object_id) {
    blockedClaims.push("dms_upload_version_file_object_trace_mismatch");
  }
  if (hasRawStoragePointer(fileObject.storage_pointer_ref)) blockedClaims.push("dms_file_object_raw_storage_pointer_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T003"),
    descriptor_type: "dms_g4_document_upload_descriptor",
    tenant_id: request.tenant_id ?? document.tenant_id ?? null,
    matter_id: document.matter_id ?? version.matter_id ?? fileObject.matter_id ?? null,
    workspace_id: document.workspace_id ?? workspace.workspace_id ?? null,
    document_id: document.document_id ?? null,
    version_id: version.version_id ?? null,
    file_object_id: fileObject.file_object_id ?? null,
    upload_audit_ref: request.upload_audit_ref ?? null,
    sanitized_storage_pointer_ref: safeStoragePointer(fileObject),
    workspace_validation: workspaceValidation,
    document_validation: documentValidation,
    version_validation: versionValidation,
    file_object_validation: fileObjectValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    upload_receipt: freezeRecord({
      upload_audit_required: true,
      document_metadata_persisted: false,
      version_metadata_persisted: false,
      object_storage_written: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4DocumentVersionDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "document", "version"], request);
  const document = request.document ?? {};
  const version = request.version ?? {};
  const previousVersions = freezeArray(request.previous_versions);
  const blockedClaims = [];
  const documentValidation = validateDmsCoreRecord("DmsDocument", document);
  const versionValidation = validateDmsCoreRecord("DmsDocumentVersion", version);
  const maxPreviousVersion = previousVersions.reduce((max, item) => Math.max(max, Number(item.version_number ?? 0)), 0);

  if (missing.length > 0) blockedClaims.push("dms_document_version_required_context_missing");
  if (!documentValidation.valid) blockedClaims.push("dms_version_document_schema_validation_required");
  if (!versionValidation.valid) blockedClaims.push("dms_version_schema_validation_required");
  if (document.document_id && version.document_id && document.document_id !== version.document_id) {
    blockedClaims.push("dms_version_document_trace_mismatch");
  }
  if (request.mutates_existing_version === true) blockedClaims.push("dms_document_version_immutable_required");
  if (previousVersions.length > 0 && Number(version.version_number ?? 0) <= maxPreviousVersion) {
    blockedClaims.push("dms_document_version_number_not_incremented");
  }

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T004"),
    descriptor_type: "dms_g4_document_version_descriptor",
    tenant_id: request.tenant_id ?? version.tenant_id ?? document.tenant_id ?? null,
    matter_id: version.matter_id ?? document.matter_id ?? null,
    document_id: version.document_id ?? document.document_id ?? null,
    version_id: version.version_id ?? null,
    previous_version_count: previousVersions.length,
    previous_max_version_number: maxPreviousVersion,
    document_validation: documentValidation,
    version_validation: versionValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    version_receipt: freezeRecord({
      immutable_version_tested: true,
      existing_version_mutated: false,
      version_metadata_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4FileObjectStorageDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "file_object"], request);
  const fileObject = request.file_object ?? {};
  const blockedClaims = [];
  const fileObjectValidation = validateDmsCoreRecord("DmsFileObject", fileObject);
  const rawPointerBlocked = hasRawStoragePointer(fileObject.storage_pointer_ref) || request.expose_raw_storage_path === true;

  if (missing.length > 0) blockedClaims.push("dms_file_object_required_context_missing");
  if (!fileObjectValidation.valid) blockedClaims.push("dms_file_object_schema_validation_required");
  if (rawPointerBlocked) blockedClaims.push("dms_file_object_raw_storage_pointer_blocked");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T005"),
    descriptor_type: "dms_g4_file_object_storage_descriptor",
    tenant_id: request.tenant_id ?? fileObject.tenant_id ?? null,
    matter_id: fileObject.matter_id ?? null,
    file_object_id: fileObject.file_object_id ?? null,
    sanitized_storage_pointer_ref: safeStoragePointer(fileObject),
    raw_storage_pointer_exposed: false,
    file_object_validation: fileObjectValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    storage_receipt: freezeRecord({
      no_raw_path_leak_tested: true,
      object_storage_read: false,
      object_storage_write: false,
      document_bytes_loaded: false,
    }),
  });
}

export function createDmsG4DocumentLineageHashDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "document", "versions", "file_objects"], request);
  const document = request.document ?? {};
  const versions = freezeArray(request.versions);
  const fileObjects = freezeArray(request.file_objects);
  const expectedHashes = freezeObject(request.expected_hashes);
  const blockedClaims = [];
  const documentValidation = validateDmsCoreRecord("DmsDocument", document);
  const versionValidations = versions.map((version) => validateDmsCoreRecord("DmsDocumentVersion", version));
  const fileObjectValidations = fileObjects.map((fileObject) => validateDmsCoreRecord("DmsFileObject", fileObject));
  const fileObjectsById = new Map(fileObjects.map((fileObject) => [fileObject.file_object_id, fileObject]));

  if (missing.length > 0) blockedClaims.push("dms_document_lineage_required_context_missing");
  if (!documentValidation.valid) blockedClaims.push("dms_lineage_document_schema_validation_required");
  if (versionValidations.some((validation) => !validation.valid)) blockedClaims.push("dms_lineage_version_schema_validation_required");
  if (fileObjectValidations.some((validation) => !validation.valid)) blockedClaims.push("dms_lineage_file_object_schema_validation_required");

  const lineageEntries = versions.map((version) => {
    const fileObject = fileObjectsById.get(version.file_object_id);
    const expectedHash = expectedHashes[version.version_id] ?? expectedHashes[version.file_object_id] ?? fileObject?.sha256 ?? null;
    const hashMatchesExpected = Boolean(fileObject?.sha256 && expectedHash && fileObject.sha256 === expectedHash);
    if (!fileObject) blockedClaims.push("dms_document_lineage_file_object_missing");
    if (version.hash_algorithm !== "sha256") blockedClaims.push("dms_document_lineage_hash_algorithm_invalid");
    if (fileObject && expectedHash && !hashMatchesExpected) blockedClaims.push("dms_document_hash_mismatch_detected");
    return freezeRecord({
      version_id: version.version_id ?? null,
      file_object_id: version.file_object_id ?? null,
      sha256: fileObject?.sha256 ?? null,
      expected_sha256: expectedHash,
      hash_matches_expected: hashMatchesExpected,
    });
  });

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T006"),
    descriptor_type: "dms_g4_document_lineage_hash_descriptor",
    tenant_id: request.tenant_id ?? document.tenant_id ?? null,
    matter_id: document.matter_id ?? null,
    document_id: document.document_id ?? null,
    lineage_entries: freezeArray(lineageEntries),
    document_validation: documentValidation,
    version_validations: freezeArray(versionValidations),
    file_object_validations: freezeArray(fileObjectValidations),
    outcome,
    blocked_claims: freezeArray([...new Set(blockedClaims)]),
    lineage_receipt: freezeRecord({
      hash_mismatch_detection_tested: true,
      lineage_persisted: false,
      object_storage_read: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4DWorkspaceDocumentFoundationCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const blockedCount = descriptors.filter((descriptor) => descriptor.outcome === "blocked").length;
  const tuwCoverage = freezeArray([
    "LFOS-G4-W06-T001",
    "LFOS-G4-W06-T002",
    "LFOS-G4-W06-T003",
    "LFOS-G4-W06-T004",
    "LFOS-G4-W06-T005",
    "LFOS-G4-W06-T006",
  ]);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T006"),
    descriptor_type: "dms_g4d_workspace_document_foundation_closeout_descriptor",
    slice: "G4-D",
    tenant_id: request.tenant_id ?? null,
    branch: "codex/lawos-g4-dms-workspace-document-foundation",
    tuw_coverage: tuwCoverage,
    descriptor_count: descriptors.length,
    blocked_descriptor_count: blockedCount,
    workspace_required_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_workspace_descriptor"),
    folder_path_permission_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_folder_path_descriptor"),
    document_upload_audit_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_document_upload_descriptor"),
    immutable_version_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_document_version_descriptor"),
    raw_path_leak_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_file_object_storage_descriptor"),
    hash_lineage_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_document_lineage_hash_descriptor"),
    outcome: blockedCount > 0 ? "blocked" : "review_required",
    closeout_receipt: freezeRecord({
      command_output_recorded: false,
      draft_pr_required: true,
      human_review_required: true,
      runtime_readiness_claim: "open",
    }),
  });
}
