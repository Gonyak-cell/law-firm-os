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
    executes_search_indexing: false,
    executes_email_runtime: false,
    creates_secure_link: false,
    exposes_document_bytes: false,
    exposes_extracted_text: false,
    exposes_raw_storage_path: false,
    exposes_email_credentials: false,
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

export function createDmsG4CheckoutLockDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "document", "lock_request"], request);
  const document = request.document ?? {};
  const lockRequest = freezeObject(request.lock_request);
  const existingLock = request.existing_lock ?? null;
  const blockedClaims = [];
  const documentValidation = validateDmsCoreRecord("DmsDocument", document);

  if (missing.length > 0) blockedClaims.push("dms_checkout_lock_required_context_missing");
  if (!documentValidation.valid) blockedClaims.push("dms_checkout_document_schema_validation_required");
  if (existingLock?.status === "active" && existingLock.locked_by && existingLock.locked_by !== request.actor_id) {
    blockedClaims.push("dms_checkout_concurrent_edit_blocked");
  }

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T007"),
    descriptor_type: "dms_g4_checkout_lock_descriptor",
    tenant_id: request.tenant_id ?? document.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    matter_id: document.matter_id ?? null,
    document_id: document.document_id ?? null,
    lock_request: lockRequest,
    existing_lock: existingLock ? freezeObject(existingLock) : null,
    document_validation: documentValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    lock_receipt: freezeRecord({
      concurrent_edit_tested: true,
      checkout_lock_acquired: false,
      lock_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4PrivilegeLabelDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "document", "privilege_label"], request);
  const document = request.document ?? {};
  const privilegeLabel = freezeObject(request.privilege_label);
  const blockedClaims = [];
  const documentValidation = validateDmsCoreRecord("DmsDocument", document);
  const privilegedClassifications = ["privileged", "attorney_client", "work_product", "confidential"];
  const isPrivileged = privilegedClassifications.includes(privilegeLabel.classification);

  if (missing.length > 0) blockedClaims.push("dms_privilege_label_required_context_missing");
  if (!documentValidation.valid) blockedClaims.push("dms_privilege_document_schema_validation_required");
  if (isPrivileged && privilegeLabel.ai_search_excluded !== true) blockedClaims.push("dms_privilege_ai_search_exclusion_required");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T008"),
    descriptor_type: "dms_g4_privilege_label_descriptor",
    tenant_id: request.tenant_id ?? document.tenant_id ?? null,
    matter_id: document.matter_id ?? null,
    document_id: document.document_id ?? null,
    privilege_label: privilegeLabel,
    ai_search_excluded: isPrivileged,
    search_index_allowed: !isPrivileged,
    ai_training_allowed: false,
    document_validation: documentValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    privilege_receipt: freezeRecord({
      ai_search_exclusion_tested: true,
      search_index_updated: false,
      privilege_label_persisted: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4RedactionMetadataDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "document", "redactions"], request);
  const document = request.document ?? {};
  const redactions = freezeArray(request.redactions);
  const blockedClaims = [];
  const documentValidation = validateDmsCoreRecord("DmsDocument", document);

  if (missing.length > 0) blockedClaims.push("dms_redaction_required_context_missing");
  if (!documentValidation.valid) blockedClaims.push("dms_redaction_document_schema_validation_required");
  if (redactions.length === 0) blockedClaims.push("dms_redaction_metadata_required");
  if (request.export_redacted !== true) blockedClaims.push("dms_redacted_export_required");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T009"),
    descriptor_type: "dms_g4_redaction_metadata_descriptor",
    tenant_id: request.tenant_id ?? document.tenant_id ?? null,
    matter_id: document.matter_id ?? null,
    document_id: document.document_id ?? null,
    redactions: freezeArray(redactions.map((redaction) => freezeObject(redaction))),
    document_validation: documentValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    redaction_receipt: freezeRecord({
      redacted_export_tested: true,
      redactions_applied: request.export_redacted === true,
      original_bytes_exposed: false,
      redacted_export_generated: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4SecureLinkDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "document", "link_policy"], request);
  const document = request.document ?? {};
  const linkPolicy = freezeObject(request.link_policy);
  const blockedClaims = [];
  const documentValidation = validateDmsCoreRecord("DmsDocument", document);

  if (missing.length > 0) blockedClaims.push("dms_secure_link_required_context_missing");
  if (!documentValidation.valid) blockedClaims.push("dms_secure_link_document_schema_validation_required");
  if (!linkPolicy.expires_at) blockedClaims.push("dms_secure_link_expiry_required");
  if (linkPolicy.mfa_required !== true) blockedClaims.push("dms_secure_link_mfa_required");
  if (linkPolicy.watermark_required !== true) blockedClaims.push("dms_secure_link_watermark_required");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T010"),
    descriptor_type: "dms_g4_secure_link_descriptor",
    tenant_id: request.tenant_id ?? document.tenant_id ?? null,
    matter_id: document.matter_id ?? null,
    document_id: document.document_id ?? null,
    link_policy: linkPolicy,
    document_validation: documentValidation,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    secure_link_receipt: freezeRecord({
      expiry_tested: true,
      mfa_tested: true,
      watermark_tested: true,
      secure_link_created: false,
      document_bytes_served: false,
    }),
  });
}

export function createDmsG4EmailFilingDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "matter_id", "email_thread", "dms_document_ref", "filing_audit_ref"], request);
  const emailThread = freezeObject(request.email_thread);
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("dms_email_filing_required_context_missing");
  if (emailThread.matter_id && request.matter_id && emailThread.matter_id !== request.matter_id) {
    blockedClaims.push("dms_email_filing_matter_trace_mismatch");
  }
  if (!emailThread.message_ids || emailThread.message_ids.length === 0) blockedClaims.push("dms_email_filing_message_required");

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T011"),
    descriptor_type: "dms_g4_email_filing_descriptor",
    tenant_id: request.tenant_id ?? emailThread.tenant_id ?? null,
    matter_id: request.matter_id ?? emailThread.matter_id ?? null,
    email_thread_id: emailThread.email_thread_id ?? null,
    dms_document_ref: request.dms_document_ref ?? null,
    filing_audit_ref: request.filing_audit_ref ?? null,
    email_thread: emailThread,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    email_filing_receipt: freezeRecord({
      matter_filing_tested: true,
      email_runtime_executed: false,
      dms_document_created: false,
      audit_event_written: false,
    }),
  });
}

export function createDmsG4OutlookPlaceholderDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "placeholder_request"], request);
  const placeholderRequest = freezeObject(request.placeholder_request);
  const blockedClaims = [];
  const credentialFields = ["credential", "credentials", "access_token", "refresh_token", "client_secret"];

  if (missing.length > 0) blockedClaims.push("dms_outlook_placeholder_required_context_missing");
  if (request.include_credentials === true || credentialFields.some((field) => placeholderRequest[field])) {
    blockedClaims.push("dms_outlook_credential_leak_blocked");
  }

  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T012"),
    descriptor_type: "dms_g4_outlook_placeholder_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    placeholder_request: placeholderRequest,
    credentials_exposed: false,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    outlook_receipt: freezeRecord({
      no_credential_leak_tested: true,
      outlook_api_called: false,
      email_runtime_executed: false,
      placeholder_persisted: false,
    }),
  });
}

export function createDmsG4SearchAclDescriptor(request = {}) {
  const missing = missingFields(["tenant_id", "actor_id", "query", "search_results"], request);
  const searchResults = freezeArray(request.search_results);
  const blockedClaims = [];

  if (missing.length > 0) blockedClaims.push("dms_search_acl_required_context_missing");
  if (request.include_unauthorized_results === true) blockedClaims.push("dms_search_unauthorized_result_blocked");

  const visibleResults = searchResults
    .filter((result) => result.actor_can_view === true && result.permission_decision !== "deny" && result.search_excluded !== true)
    .map((result) =>
      freezeRecord({
        document_id: result.document_id ?? null,
        version_id: result.version_id ?? null,
        title: result.title ?? null,
        snippet: result.snippet ?? null,
      }),
    );
  const unauthorizedResultCount = searchResults.length - visibleResults.length;
  const outcome = blockedClaims.length > 0 ? "blocked" : "review_required";

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T013"),
    descriptor_type: "dms_g4_search_acl_descriptor",
    tenant_id: request.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    query: request.query ?? null,
    visible_results: freezeArray(visibleResults),
    unauthorized_result_count_internal: unauthorizedResultCount,
    unauthorized_result_count_exposed: null,
    unauthorized_result_absent: true,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    search_receipt: freezeRecord({
      unauthorized_result_absent_tested: true,
      search_index_queried: false,
      search_index_updated: false,
      permission_runtime_evaluated: false,
    }),
  });
}

export function createDmsG4ESecurityEmailSearchCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const blockedCount = descriptors.filter((descriptor) => descriptor.outcome === "blocked").length;
  const tuwCoverage = freezeArray([
    "LFOS-G4-W06-T007",
    "LFOS-G4-W06-T008",
    "LFOS-G4-W06-T009",
    "LFOS-G4-W06-T010",
    "LFOS-G4-W06-T011",
    "LFOS-G4-W06-T012",
    "LFOS-G4-W06-T013",
  ]);

  return freezeRecord({
    ...noWriteBoundary("LFOS-G4-W06-T013"),
    descriptor_type: "dms_g4e_security_email_search_closeout_descriptor",
    slice: "G4-E",
    tenant_id: request.tenant_id ?? null,
    branch: "codex/lawos-g4-dms-security-email-search",
    tuw_coverage: tuwCoverage,
    descriptor_count: descriptors.length,
    blocked_descriptor_count: blockedCount,
    checkout_lock_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_checkout_lock_descriptor"),
    privilege_search_exclusion_tested: descriptors.some(
      (descriptor) => descriptor.descriptor_type === "dms_g4_privilege_label_descriptor",
    ),
    redacted_export_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_redaction_metadata_descriptor"),
    secure_link_policy_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_secure_link_descriptor"),
    email_filing_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_email_filing_descriptor"),
    outlook_placeholder_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_outlook_placeholder_descriptor"),
    search_acl_tested: descriptors.some((descriptor) => descriptor.descriptor_type === "dms_g4_search_acl_descriptor"),
    outcome: blockedCount > 0 ? "blocked" : "review_required",
    closeout_receipt: freezeRecord({
      command_output_recorded: false,
      draft_pr_required: true,
      human_review_required: true,
      runtime_readiness_claim: "open",
    }),
  });
}
