import {
  createClientPortalG6ClientApprovalDescriptor,
  createClientPortalG6ExternalACLDescriptor,
  createClientPortalG6ExternalUserDescriptor,
  createClientPortalG6FPortalRfiFoundationCloseoutDescriptor,
  createClientPortalG6GPortalDataRoomCloseoutDescriptor,
  createClientPortalG6PortalAuditDescriptor,
  createClientPortalG6PortalMatterProjectionDescriptor,
  createClientPortalG6RFIRequestDescriptor,
  createClientPortalG6RFIResponseUploadDescriptor,
  createClientPortalG6SecureLinkViewerDescriptor,
} from "../../../packages/client-portal/src/index.js";
import { createDataRoomG6DataRoomAclDescriptor } from "../../../packages/data-room/src/index.js";

const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

const CLIENT_COLLABORATION_PREFIXES = Object.freeze([
  "/api/client-collaboration/runtime/evidence",
  "/api/client-collaboration/external-users",
  "/api/client-collaboration/matter-projections",
  "/api/client-collaboration/external-acls",
  "/api/client-collaboration/rfi-requests",
  "/api/client-collaboration/rfi-response-uploads",
  "/api/client-collaboration/portal-rfi-closeout",
  "/api/client-collaboration/client-approvals",
  "/api/client-collaboration/secure-links",
  "/api/client-collaboration/data-rooms",
  "/api/client-collaboration/portal-audit",
  "/api/client-collaboration/portal-data-room-closeout",
  "/api/client-collaboration/ui/client-dashboard",
  "/api/client-collaboration/shared-documents",
  "/api/client-collaboration/message-threads",
  "/api/client-collaboration/upload-security-test",
  "/api/client-collaboration/external-acl-test",
]);

export const CMP_G10_TUW_IDS = Object.freeze(
  Array.from({ length: 17 }, (_, index) => `CMP-G10-W10-T${String(index + 1).padStart(3, "0")}`),
);

export const CLIENT_COLLABORATION_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "client-collaboration",
  cmp_gate: "CMP-G10",
  cmp_work_package: "CMP-G10-W10",
  depends_on: Object.freeze([
    "CMP-G1-W01",
    "CMP-G2-W02",
    "CMP-G3-W03",
    "CMP-G4-W04",
    "CMP-G5-W05",
    "CMP-G6-W06",
    "CMP-G7-W07",
    "CMP-G8-W08",
    "CMP-G9-W09",
  ]),
  package_ref: "packages/client-portal; packages/data-room; apps/web/src",
  runtime_routes: CLIENT_COLLABORATION_PREFIXES,
  tuw_ids: CMP_G10_TUW_IDS,
  legacy_reference_tuw_ids: Object.freeze([
    "LFOS-G6-W11-T001",
    "LFOS-G6-W11-T002",
    "LFOS-G6-W11-T003",
    "LFOS-G6-W11-T004",
    "LFOS-G6-W11-T005",
    "LFOS-G6-W11-T006",
    "LFOS-G6-W11-T007",
    "LFOS-G6-W11-T008",
    "LFOS-G6-W11-T009",
    "LFOS-G6-W11-T010",
  ]),
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isClientCollaborationPath(pathname) {
  return CLIENT_COLLABORATION_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function createClientCollaborationRuntimeContext() {
  return Object.freeze({
    projection_only_runtime: true,
    external_acl_required: true,
    internal_data_exposure_allowed: false,
    object_storage_write_allowed: false,
    portal_state_persistence: false,
    data_room_persistence: false,
    upload_persistence: false,
    secure_link_persistence: false,
    message_thread_persistence: false,
  });
}

function response(status, body) {
  return { status, body };
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("Client collaboration synthetic tenant is required");
    error.safe_error_code = "CMP_G10_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function actorContext(query = {}) {
  return {
    actor_id: query.actor_id ?? "client-collaboration-runtime-actor",
    actor_type: "external_user",
    tenant_id: query.tenant_id,
  };
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G10_VALIDATION_ERROR",
    reason: error.message,
    internal_data_exposed: false,
    object_storage_written: false,
  });
}

function fail(message, safeErrorCode = "CMP_G10_VALIDATION_ERROR") {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  throw error;
}

function hasForbiddenExternalRuntimeWrite(value = {}) {
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    if (
      current.writes_object_storage === true ||
      current.writes_internal_matter === true ||
      current.writes_dms_source === true ||
      current.internal_payload_included === true ||
      current.internal_memo === true ||
      current.conflict_memo === true ||
      current.includes_privileged_material === true ||
      current.includes_hidden_matter_details === true ||
      current.bypasses_acl === true
    ) {
      return true;
    }
    for (const nested of Object.values(current)) {
      if (nested && typeof nested === "object") stack.push(nested);
    }
  }
  return false;
}

function requireNoExternalRuntimeWrite(body = {}) {
  if (hasForbiddenExternalRuntimeWrite(body)) {
    fail("CMP-G10 blocks internal payload exposure, object-storage writes, and external ACL bypass", "CMP_G10_EXTERNAL_BOUNDARY_BLOCKED");
  }
}

function requireDescriptor(descriptor, code) {
  if (descriptor.outcome === "blocked") {
    return response(400, {
      outcome: "blocked",
      safe_error_code: code,
      descriptor,
      internal_data_exposed: false,
      object_storage_written: false,
    });
  }
  return null;
}

function okDescriptor(descriptor, code, extra = {}) {
  const blocked = requireDescriptor(descriptor, code);
  if (blocked) return blocked;
  return response(200, {
    outcome: "review_required",
    descriptor,
    internal_data_exposed: false,
    object_storage_written: false,
    ...extra,
  });
}

function defaultPortalSource({ tenantId, matterId = "matter-cmp-g10-runtime", actorId = "external-user-cmp-g10" } = {}) {
  const clientPartyId = "party-client-cmp-g10";
  const externalUserId = actorId;
  const roomId = "room-cmp-g10";
  const sharedDocumentId = "doc-cmp-g10-shared";
  return Object.freeze({
    tenantId,
    matterId,
    clientPartyId,
    externalUserId,
    roomId,
    sharedDocumentId,
    externalUser: {
      tenant_id: tenantId,
      client_party_id: clientPartyId,
      external_user_id: externalUserId,
      email_hash: "hash-cmp-g10-external",
    },
    projection: {
      tenant_id: tenantId,
      matter_id: matterId,
      projection_id: "projection-cmp-g10-client",
      visible_sections: ["status", "shared_documents", "rfi"],
    },
    sharedDocuments: [{ document_id: sharedDocumentId, shared_with_client: true, title: "Shared closing set" }],
    externalAcl: {
      external_acl_id: "acl-cmp-g10-shared",
      grants: [{ document_id: sharedDocumentId, shared_with_client: true, permission: "view" }],
    },
    rfiRequest: {
      tenant_id: tenantId,
      matter_id: matterId,
      external_user_id: externalUserId,
      rfi_request_id: "rfi-cmp-g10",
      due_date: "2026-07-01",
      status: "open",
    },
    upload: {
      tenant_id: tenantId,
      matter_id: matterId,
      external_user_id: externalUserId,
      rfi_request_id: "rfi-cmp-g10",
      upload_id: "upload-cmp-g10",
      virus_scan_placeholder: true,
      permission_checked: true,
    },
    approval: {
      tenant_id: tenantId,
      matter_id: matterId,
      approval_id: "approval-cmp-g10",
      approver_external_user_id: externalUserId,
      audit_receipt_id: "audit-cmp-g10-approval",
    },
    secureLink: {
      secure_link_id: "link-cmp-g10",
      expires_at: "2026-07-01T00:00:00.000Z",
      watermark_enabled: true,
      mfa_required: true,
    },
    dataRoom: {
      tenant_id: tenantId,
      matter_id: matterId,
      room_id: roomId,
      room_level_acl: true,
      grants: [{ room_id: roomId, external_user_id: externalUserId, shared_with_external: true }],
    },
    auditEvents: [
      { tenant_id: tenantId, matter_id: matterId, external_user_id: externalUserId, event_type: "external_view", audit_receipt_id: "audit-cmp-g10-view" },
      { tenant_id: tenantId, matter_id: matterId, external_user_id: externalUserId, event_type: "external_upload", audit_receipt_id: "audit-cmp-g10-upload" },
    ],
  });
}

function externalUserDescriptor({ tenantId, body, source }) {
  return createClientPortalG6ExternalUserDescriptor({
    tenant_id: tenantId,
    client_party_id: body.client_party_id ?? source.clientPartyId,
    external_user: body.external_user ?? source.externalUser,
    linked_internal_identity: body.linked_internal_identity,
  });
}

function projectionDescriptor({ tenantId, body, source }) {
  return createClientPortalG6PortalMatterProjectionDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    projection: body.projection ?? source.projection,
    documents: body.documents ?? source.sharedDocuments,
  });
}

function externalAclDescriptor({ tenantId, body, source }) {
  return createClientPortalG6ExternalACLDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    external_user_id: body.external_user_id ?? source.externalUserId,
    external_acl: body.external_acl ?? source.externalAcl,
    bypasses_acl: body.bypasses_acl,
  });
}

function rfiRequestDescriptor({ tenantId, body, source }) {
  return createClientPortalG6RFIRequestDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    external_user_id: body.external_user_id ?? source.externalUserId,
    rfi_request: body.rfi_request ?? source.rfiRequest,
  });
}

function uploadDescriptor({ tenantId, body, source }) {
  return createClientPortalG6RFIResponseUploadDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    external_user_id: body.external_user_id ?? source.externalUserId,
    rfi_request_id: body.rfi_request_id ?? source.rfiRequest.rfi_request_id,
    upload: body.upload ?? source.upload,
    writes_object_storage: body.writes_object_storage,
  });
}

function approvalDescriptor({ tenantId, body, source }) {
  return createClientPortalG6ClientApprovalDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    external_user_id: body.external_user_id ?? source.externalUserId,
    approval: body.approval ?? source.approval,
  });
}

function secureLinkDescriptor({ tenantId, body, source }) {
  return createClientPortalG6SecureLinkViewerDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    external_user_id: body.external_user_id ?? source.externalUserId,
    secure_link: body.secure_link ?? source.secureLink,
  });
}

function dataRoomDescriptor({ tenantId, body, source }) {
  return createDataRoomG6DataRoomAclDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    data_room: body.data_room ?? source.dataRoom,
    unauthorized_access: body.unauthorized_access,
  });
}

function auditDescriptor({ tenantId, body, source }) {
  return createClientPortalG6PortalAuditDescriptor({
    tenant_id: tenantId,
    matter_id: body.matter_id ?? source.matterId,
    external_user_id: body.external_user_id ?? source.externalUserId,
    audit_events: body.audit_events ?? source.auditEvents,
  });
}

function createPortalRfiCloseout({ tenantId, source }) {
  return createClientPortalG6FPortalRfiFoundationCloseoutDescriptor({
    tenant_id: tenantId,
    descriptors: [
      externalUserDescriptor({ tenantId, body: {}, source }),
      projectionDescriptor({ tenantId, body: {}, source }),
      externalAclDescriptor({ tenantId, body: {}, source }),
      rfiRequestDescriptor({ tenantId, body: {}, source }),
      uploadDescriptor({ tenantId, body: {}, source }),
    ],
    ai_legal_workflows_closed: true,
  });
}

function createPortalDataRoomCloseout({ tenantId, source }) {
  return createClientPortalG6GPortalDataRoomCloseoutDescriptor({
    tenant_id: tenantId,
    descriptors: [
      approvalDescriptor({ tenantId, body: {}, source }),
      secureLinkDescriptor({ tenantId, body: {}, source }),
      dataRoomDescriptor({ tenantId, body: {}, source }),
      auditDescriptor({ tenantId, body: {}, source }),
      { tuw_id: "LFOS-G6-W11-T010", outcome: "review_required" },
    ],
    portal_rfi_foundation_closed: true,
  });
}

function createClientCollaborationDescriptors(tenantId, actorId = "external-user-cmp-g10") {
  const source = defaultPortalSource({ tenantId, actorId });
  return Object.freeze({
    source,
    descriptors: Object.freeze({
      external_user: externalUserDescriptor({ tenantId, body: {}, source }),
      matter_projection: projectionDescriptor({ tenantId, body: {}, source }),
      external_acl: externalAclDescriptor({ tenantId, body: {}, source }),
      rfi_request: rfiRequestDescriptor({ tenantId, body: {}, source }),
      rfi_response_upload: uploadDescriptor({ tenantId, body: {}, source }),
      portal_rfi_closeout: createPortalRfiCloseout({ tenantId, source }),
      client_approval: approvalDescriptor({ tenantId, body: {}, source }),
      secure_link: secureLinkDescriptor({ tenantId, body: {}, source }),
      data_room: dataRoomDescriptor({ tenantId, body: {}, source }),
      portal_audit: auditDescriptor({ tenantId, body: {}, source }),
      portal_data_room_closeout: createPortalDataRoomCloseout({ tenantId, source }),
    }),
  });
}

export function createClientCollaborationCmpG10RuntimeEvidence(context, tenantId, actorId = "external-user-cmp-g10") {
  const evidence = createClientCollaborationDescriptors(tenantId, actorId);
  return Object.freeze({
    cmp_gate: "CMP-G10",
    cmp_work_package: "CMP-G10-W10",
    bounded_context: "client-collaboration",
    tuw_ids: CMP_G10_TUW_IDS,
    depends_on: CLIENT_COLLABORATION_BOUNDED_CONTEXT.depends_on,
    implemented_runtime_routes: CLIENT_COLLABORATION_PREFIXES,
    projection_only_runtime: context.projection_only_runtime,
    external_acl_required: context.external_acl_required,
    internal_data_exposure_allowed: context.internal_data_exposure_allowed,
    object_storage_write_allowed: context.object_storage_write_allowed,
    portal_state_persistence: context.portal_state_persistence,
    data_room_persistence: context.data_room_persistence,
    upload_persistence: context.upload_persistence,
    secure_link_persistence: context.secure_link_persistence,
    message_thread_persistence: context.message_thread_persistence,
    internal_data_exposed: false,
    object_storage_written: false,
    runtime_readiness: RUNTIME_READINESS,
    durable_persistence_open: true,
    descriptor_evidence: evidence.descriptors,
  });
}

export async function handleClientCollaborationApiRequest({ pathname, method, query = {}, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actor = actorContext({ ...query, tenant_id: tenantId });
    const source = defaultPortalSource({ tenantId, actorId: query.external_user_id ?? actor.actor_id, matterId: body.matter_id ?? query.matter_id });

    if (pathname === "/api/client-collaboration/runtime/evidence" && method === "GET") {
      return response(200, {
        outcome: "ok",
        evidence: createClientCollaborationCmpG10RuntimeEvidence(context, tenantId, source.externalUserId),
        tuw_ids: CMP_G10_TUW_IDS,
        route_tuw_ids: ["CMP-G10-W10-T017"],
      });
    }
    if (pathname === "/api/client-collaboration/ui/client-dashboard" && method === "GET") {
      return response(200, {
        outcome: "ok",
        dashboard: {
          external_user_id: source.externalUserId,
          tenant_id: tenantId,
          matter_id: query.matter_id ?? source.matterId,
          projection_only: true,
          internal_memo_visible: false,
          conflict_memo_visible: false,
          privileged_material_visible: false,
          tiles: ["status", "shared_documents", "rfi", "approvals"],
        },
        tuw_ids: ["CMP-G10-W10-T012"],
      });
    }
    if (pathname === "/api/client-collaboration/shared-documents" && method === "GET") {
      return response(200, {
        outcome: "ok",
        documents: source.sharedDocuments.map((document) => ({
          document_id: document.document_id,
          title: document.title,
          shared_with_client: true,
          raw_path_visible: false,
          internal_metadata_visible: false,
        })),
        internal_data_exposed: false,
        tuw_ids: ["CMP-G10-W10-T013"],
      });
    }
    if (pathname === "/api/client-collaboration/message-threads" && method === "GET") {
      return response(200, {
        outcome: "ok",
        message_thread: {
          thread_id: "thread-cmp-g10",
          projection_only: true,
          internal_notes_visible: false,
          message_thread_persisted: false,
          external_acl_required: true,
        },
        internal_data_exposed: false,
        tuw_ids: ["CMP-G10-W10-T014"],
      });
    }

    if (method !== "POST") {
      return response(405, { outcome: "blocked", safe_error_code: "CMP_G10_METHOD_NOT_ALLOWED", reason: "method_not_allowed" });
    }

    if (pathname !== "/api/client-collaboration/upload-security-test" && pathname !== "/api/client-collaboration/external-acl-test") {
      requireNoExternalRuntimeWrite(body);
    }

    if (pathname === "/api/client-collaboration/external-users") {
      return okDescriptor(externalUserDescriptor({ tenantId, body, source }), "CMP_G10_EXTERNAL_USER_BLOCKED", {
        external_user: { external_user_persisted: false, linked_internal_identity: false },
        tuw_ids: ["CMP-G10-W10-T001"],
      });
    }
    if (pathname === "/api/client-collaboration/matter-projections") {
      return okDescriptor(projectionDescriptor({ tenantId, body, source }), "CMP_G10_PROJECTION_BLOCKED", {
        projection: {
          projection_persisted: false,
          internal_memo_visible: false,
          conflict_memo_visible: false,
          privileged_material_visible: false,
        },
        tuw_ids: ["CMP-G10-W10-T002"],
      });
    }
    if (pathname === "/api/client-collaboration/external-acls") {
      return okDescriptor(externalAclDescriptor({ tenantId, body, source }), "CMP_G10_EXTERNAL_ACL_BLOCKED", {
        external_acl: { shared_only_access: true, external_acl_persisted: false },
        tuw_ids: ["CMP-G10-W10-T003"],
      });
    }
    if (pathname === "/api/client-collaboration/rfi-requests") {
      return okDescriptor(rfiRequestDescriptor({ tenantId, body, source }), "CMP_G10_RFI_REQUEST_BLOCKED", {
        rfi_request: { due_date_status_tested: true, rfi_request_persisted: false },
        tuw_ids: ["CMP-G10-W10-T004"],
      });
    }
    if (pathname === "/api/client-collaboration/rfi-response-uploads") {
      return okDescriptor(uploadDescriptor({ tenantId, body, source }), "CMP_G10_UPLOAD_BLOCKED", {
        upload: { virus_scan_placeholder: true, permission_checked: true, upload_persisted: false, object_storage_written: false },
        tuw_ids: ["CMP-G10-W10-T005"],
      });
    }
    if (pathname === "/api/client-collaboration/portal-rfi-closeout") {
      return okDescriptor(createPortalRfiCloseout({ tenantId, source }), "CMP_G10_PORTAL_RFI_CLOSEOUT_BLOCKED", {
        closeout: { portal_runtime_opened: false, internal_data_exposed: false },
        tuw_ids: ["CMP-G10-W10-T006"],
      });
    }
    if (pathname === "/api/client-collaboration/client-approvals") {
      return okDescriptor(approvalDescriptor({ tenantId, body, source }), "CMP_G10_CLIENT_APPROVAL_BLOCKED", {
        approval: { approval_audit_tested: true, approval_persisted: false },
        tuw_ids: ["CMP-G10-W10-T007"],
      });
    }
    if (pathname === "/api/client-collaboration/secure-links") {
      return okDescriptor(secureLinkDescriptor({ tenantId, body, source }), "CMP_G10_SECURE_LINK_BLOCKED", {
        secure_link: { expiry_tested: true, watermark_tested: true, mfa_tested: true, secure_link_persisted: false },
        tuw_ids: ["CMP-G10-W10-T008"],
      });
    }
    if (pathname === "/api/client-collaboration/data-rooms") {
      return okDescriptor(dataRoomDescriptor({ tenantId, body, source }), "CMP_G10_DATA_ROOM_BLOCKED", {
        data_room: { room_level_acl_tested: true, data_room_persisted: false },
        tuw_ids: ["CMP-G10-W10-T009"],
      });
    }
    if (pathname === "/api/client-collaboration/portal-audit") {
      return okDescriptor(auditDescriptor({ tenantId, body, source }), "CMP_G10_PORTAL_AUDIT_BLOCKED", {
        portal_audit: { external_view_upload_events_tested: true, audit_event_persisted: false },
        tuw_ids: ["CMP-G10-W10-T010"],
      });
    }
    if (pathname === "/api/client-collaboration/portal-data-room-closeout") {
      return okDescriptor(createPortalDataRoomCloseout({ tenantId, source }), "CMP_G10_PORTAL_DATA_ROOM_CLOSEOUT_BLOCKED", {
        closeout: { data_room_runtime_opened: false, internal_data_exposed: false },
        tuw_ids: ["CMP-G10-W10-T011"],
      });
    }
    if (pathname === "/api/client-collaboration/upload-security-test") {
      const descriptor = uploadDescriptor({ tenantId, body, source });
      const blocked = requireDescriptor(descriptor, "CMP_G10_UPLOAD_SECURITY_BLOCKED");
      if (blocked) return blocked;
      return response(200, {
        outcome: "review_required",
        upload_security_tested: true,
        object_storage_written: false,
        descriptor,
        tuw_ids: ["CMP-G10-W10-T015"],
      });
    }
    if (pathname === "/api/client-collaboration/external-acl-test") {
      const descriptor = externalAclDescriptor({ tenantId, body, source });
      const blocked = requireDescriptor(descriptor, "CMP_G10_EXTERNAL_ACL_TEST_BLOCKED");
      if (blocked) return blocked;
      return response(200, {
        outcome: "review_required",
        external_acl_tested: true,
        internal_data_exposed: false,
        descriptor,
        tuw_ids: ["CMP-G10-W10-T016"],
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "CMP_G10_NOT_FOUND", reason: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}
