export const CLIENT_PORTAL_G6F_TUW_COVERAGE = Object.freeze([
  "LFOS-G6-W11-T001",
  "LFOS-G6-W11-T002",
  "LFOS-G6-W11-T003",
  "LFOS-G6-W11-T004",
  "LFOS-G6-W11-T005",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

function noRuntimeBoundary(tuwId) {
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
    executes_ui_runtime: false,
    dispatches_client_portal_runtime: false,
    dispatches_secure_link_runtime: false,
    dispatches_watermark_runtime: false,
    dispatches_client_review_runtime: false,
    reads_object_storage: false,
    writes_object_storage: false,
    g6_runtime_readiness_claim: "open",
    client_portal_runtime_readiness_claim: "open",
  };
}

export function createClientPortalG6ExternalUserDescriptor(request = {}) {
  const externalUser = request.external_user ?? {};
  const linkedInternalIdentity =
    Boolean(externalUser.internal_user_id) || Boolean(externalUser.employee_id) || request.linked_internal_identity === true;
  const runtimeDispatch = request.dispatched_runtime === true || externalUser.dispatched_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "client_party_id", "external_user"], request).length > 0) {
    blockedClaims.push("external_user_required_context_missing");
  }
  if (!externalUser.external_user_id) blockedClaims.push("external_user_id_required");
  if (externalUser.tenant_id && externalUser.tenant_id !== request.tenant_id) blockedClaims.push("external_user_cross_tenant_blocked");
  if (externalUser.client_party_id && externalUser.client_party_id !== request.client_party_id) {
    blockedClaims.push("external_user_client_party_trace_mismatch");
  }
  if (linkedInternalIdentity) blockedClaims.push("external_user_internal_identity_separation_required");
  if (runtimeDispatch) blockedClaims.push("external_user_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W11-T001"),
    descriptor_type: "client_portal_g6_external_user_descriptor",
    tenant_id: request.tenant_id ?? externalUser.tenant_id ?? null,
    client_party_id: request.client_party_id ?? externalUser.client_party_id ?? null,
    external_user_id: externalUser.external_user_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    external_user_receipt: freezeRecord({
      user_employee_separation_tested: Boolean(externalUser.external_user_id) && !linkedInternalIdentity,
      linked_internal_identity: linkedInternalIdentity,
      external_user_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createClientPortalG6PortalMatterProjectionDescriptor(request = {}) {
  const projection = request.projection ?? {};
  const documents = freezeArray(request.documents);
  const visibleSections = freezeArray(projection.visible_sections ?? request.visible_sections);
  const runtimeDispatch = request.dispatched_runtime === true || projection.dispatched_runtime === true;
  const includesInternalMemo = visibleSections.includes("internal_memo") || projection.includes_internal_memo === true;
  const includesConflictMemo = visibleSections.includes("conflict_memo") || projection.includes_conflict_memo === true;
  const includesPrivilegedMaterial = projection.includes_privileged_material === true;
  const includesHiddenMatterDetails = projection.includes_hidden_matter_details === true;
  const nonSharedDocumentIncluded = documents.some((document) => document?.shared_with_client !== true);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "projection"], request).length > 0) {
    blockedClaims.push("portal_projection_required_context_missing");
  }
  if (!projection.projection_id) blockedClaims.push("portal_projection_id_required");
  if (projection.tenant_id && projection.tenant_id !== request.tenant_id) blockedClaims.push("portal_projection_cross_tenant_blocked");
  if (projection.matter_id && projection.matter_id !== request.matter_id) blockedClaims.push("portal_projection_matter_trace_mismatch");
  if (includesInternalMemo || includesConflictMemo) blockedClaims.push("portal_projection_internal_memo_excluded_required");
  if (includesPrivilegedMaterial) blockedClaims.push("portal_projection_privileged_material_excluded_required");
  if (includesHiddenMatterDetails) blockedClaims.push("portal_projection_hidden_matter_details_excluded_required");
  if (nonSharedDocumentIncluded) blockedClaims.push("portal_projection_shared_only_documents_required");
  if (runtimeDispatch) blockedClaims.push("portal_projection_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W11-T002"),
    descriptor_type: "client_portal_g6_portal_matter_projection_descriptor",
    tenant_id: request.tenant_id ?? projection.tenant_id ?? null,
    matter_id: request.matter_id ?? projection.matter_id ?? null,
    projection_id: projection.projection_id ?? null,
    shared_document_count: documents.filter((document) => document?.shared_with_client === true).length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    portal_projection_receipt: freezeRecord({
      internal_memo_excluded_tested: !includesInternalMemo && !includesConflictMemo,
      privileged_material_excluded_tested: !includesPrivilegedMaterial,
      hidden_matter_details_excluded_tested: !includesHiddenMatterDetails,
      shared_only_documents_tested: documents.length > 0 && !nonSharedDocumentIncluded,
      projection_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createClientPortalG6ExternalACLDescriptor(request = {}) {
  const acl = request.external_acl ?? {};
  const grants = freezeArray(acl.grants ?? request.grants);
  const runtimeDispatch = request.dispatched_runtime === true || acl.dispatched_runtime === true;
  const sharedOnly = grants.length > 0 && grants.every((grant) => grant?.shared_with_client === true && grant?.internal_only !== true);
  const aclBypass = request.bypasses_acl === true || acl.bypasses_acl === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "external_user_id", "external_acl"], request).length > 0) {
    blockedClaims.push("external_acl_required_context_missing");
  }
  if (!acl.external_acl_id) blockedClaims.push("external_acl_id_required");
  if (grants.length === 0 || !sharedOnly) blockedClaims.push("external_acl_shared_only_access_required");
  if (aclBypass) blockedClaims.push("external_acl_bypass_blocked");
  if (runtimeDispatch) blockedClaims.push("external_acl_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W11-T003"),
    descriptor_type: "client_portal_g6_external_acl_descriptor",
    tenant_id: request.tenant_id ?? null,
    matter_id: request.matter_id ?? null,
    external_user_id: request.external_user_id ?? null,
    external_acl_id: acl.external_acl_id ?? null,
    grant_count: grants.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    external_acl_receipt: freezeRecord({
      shared_only_access_tested: sharedOnly,
      acl_bypass_blocked: aclBypass,
      external_acl_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createClientPortalG6RFIRequestDescriptor(request = {}) {
  const rfiRequest = request.rfi_request ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || rfiRequest.dispatched_runtime === true;
  const validStatus = ["draft", "open", "submitted", "closed"].includes(rfiRequest.status);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "external_user_id", "rfi_request"], request).length > 0) {
    blockedClaims.push("rfi_request_required_context_missing");
  }
  if (!rfiRequest.rfi_request_id) blockedClaims.push("rfi_request_id_required");
  if (!rfiRequest.due_date || !validStatus) blockedClaims.push("rfi_request_due_date_status_required");
  if (rfiRequest.tenant_id && rfiRequest.tenant_id !== request.tenant_id) blockedClaims.push("rfi_request_cross_tenant_blocked");
  if (rfiRequest.matter_id && rfiRequest.matter_id !== request.matter_id) blockedClaims.push("rfi_request_matter_trace_mismatch");
  if (runtimeDispatch) blockedClaims.push("rfi_request_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W11-T004"),
    descriptor_type: "client_portal_g6_rfi_request_descriptor",
    tenant_id: request.tenant_id ?? rfiRequest.tenant_id ?? null,
    matter_id: request.matter_id ?? rfiRequest.matter_id ?? null,
    external_user_id: request.external_user_id ?? rfiRequest.external_user_id ?? null,
    rfi_request_id: rfiRequest.rfi_request_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    rfi_request_receipt: freezeRecord({
      due_date_status_tested: Boolean(rfiRequest.due_date && validStatus),
      rfi_request_persisted: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createClientPortalG6RFIResponseUploadDescriptor(request = {}) {
  const upload = request.upload ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || upload.dispatched_runtime === true;
  const writesStorage = request.writes_object_storage === true || upload.writes_object_storage === true;
  const securityPlaceholder = upload.virus_scan_placeholder === true && upload.permission_checked === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "matter_id", "external_user_id", "rfi_request_id", "upload"], request).length > 0) {
    blockedClaims.push("rfi_response_upload_required_context_missing");
  }
  if (!upload.upload_id) blockedClaims.push("rfi_response_upload_id_required");
  if (!securityPlaceholder) blockedClaims.push("rfi_response_upload_security_placeholder_required");
  if (writesStorage) blockedClaims.push("rfi_response_upload_object_storage_write_blocked");
  if (runtimeDispatch) blockedClaims.push("rfi_response_upload_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W11-T005"),
    descriptor_type: "client_portal_g6_rfi_response_upload_descriptor",
    tenant_id: request.tenant_id ?? upload.tenant_id ?? null,
    matter_id: request.matter_id ?? upload.matter_id ?? null,
    external_user_id: request.external_user_id ?? upload.external_user_id ?? null,
    rfi_request_id: request.rfi_request_id ?? upload.rfi_request_id ?? null,
    upload_id: upload.upload_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    rfi_response_upload_receipt: freezeRecord({
      upload_security_placeholder_tested: securityPlaceholder,
      upload_persisted: false,
      object_storage_written: writesStorage,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createClientPortalG6FPortalRfiFoundationCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const blockedClaims = [];

  for (const tuwId of CLIENT_PORTAL_G6F_TUW_COVERAGE) {
    if (!descriptorTuws.has(tuwId)) blockedClaims.push("g6_portal_rfi_foundation_closeout_evidence_required");
  }
  if (request.ai_legal_workflows_closed !== true) blockedClaims.push("g6_portal_requires_ai_legal_workflows_handoff");
  if (descriptors.some((descriptor) => descriptor?.outcome !== "review_required")) {
    blockedClaims.push("g6_portal_rfi_blocked_descriptor_present");
  }

  const outcome = outcomeFor(blockedClaims);

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G6-W11-T001..LFOS-G6-W11-T005"),
    descriptor_type: "client_portal_g6f_portal_rfi_foundation_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    slice_id: "G6-F",
    tuw_coverage: CLIENT_PORTAL_G6F_TUW_COVERAGE,
    descriptor_count: descriptors.length,
    outcome,
    blocked_claims: freezeArray(blockedClaims),
    external_user_separation_tested: descriptorTuws.has("LFOS-G6-W11-T001"),
    internal_memo_excluded_tested: descriptorTuws.has("LFOS-G6-W11-T002"),
    shared_only_access_tested: descriptorTuws.has("LFOS-G6-W11-T003"),
    rfi_due_status_tested: descriptorTuws.has("LFOS-G6-W11-T004"),
    upload_security_placeholder_tested: descriptorTuws.has("LFOS-G6-W11-T005"),
    closeout_receipt: freezeRecord({
      runtime_readiness_claim: "open",
      client_portal_runtime_opened: false,
      rfi_upload_persisted: false,
      internal_data_exposed: false,
      draft_pr_self_merged: false,
    }),
  });
}
