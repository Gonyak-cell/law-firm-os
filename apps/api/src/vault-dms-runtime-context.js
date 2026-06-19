import { randomUUID } from "node:crypto";
import { buildAuditEventInput, createAuditLedger } from "../../../packages/audit/src/index.js";
import {
  createDmsDocument,
  createDmsDocumentVersion,
  createDmsFileObject,
  createDmsFolder,
  createDmsG4AuditCoverageDescriptor,
  createDmsG4CheckoutLockDescriptor,
  createDmsG4DWorkspaceDocumentFoundationCloseoutDescriptor,
  createDmsG4DocumentLineageHashDescriptor,
  createDmsG4DocumentUploadDescriptor,
  createDmsG4DocumentVersionDescriptor,
  createDmsG4ESecurityEmailSearchCloseoutDescriptor,
  createDmsG4EmailFilingDescriptor,
  createDmsG4FDmsCloseoutDescriptor,
  createDmsG4FileObjectStorageDescriptor,
  createDmsG4FolderPathDescriptor,
  createDmsG4OutlookPlaceholderDescriptor,
  createDmsG4PrivilegeLabelDescriptor,
  createDmsG4RedactionMetadataDescriptor,
  createDmsG4SearchAclDescriptor,
  createDmsG4SecureLinkDescriptor,
  createDmsG4WorkspaceDescriptor,
  createDmsG4WorkspaceUiDescriptor,
  createDmsWorkspace,
} from "../../../packages/dms/src/index.js";

const SYNTHETIC_TENANT = "tenant-a";
const RUNTIME_READINESS = "runtime_api_evidence_only__durable_persistence_open";

const VAULT_PREFIXES = Object.freeze([
  "/api/vault/runtime/evidence",
  "/api/vault/workspaces",
  "/api/vault/folders",
  "/api/vault/documents/upload",
  "/api/vault/documents",
  "/api/vault/file-objects",
  "/api/vault/email/filings",
  "/api/vault/outlook/placeholders",
  "/api/vault/search",
  "/api/vault/audit",
]);

export const CMP_G5_TUW_IDS = Object.freeze([
  "CMP-G5-W05-T001",
  "CMP-G5-W05-T002",
  "CMP-G5-W05-T003",
  "CMP-G5-W05-T004",
  "CMP-G5-W05-T005",
  "CMP-G5-W05-T006",
  "CMP-G5-W05-T007",
  "CMP-G5-W05-T008",
  "CMP-G5-W05-T009",
  "CMP-G5-W05-T010",
  "CMP-G5-W05-T011",
  "CMP-G5-W05-T012",
  "CMP-G5-W05-T013",
  "CMP-G5-W05-T014",
  "CMP-G5-W05-T015",
  "CMP-G5-W05-T016",
  "CMP-G5-W05-T017",
  "CMP-G5-W05-T018",
  "CMP-G5-W05-T019",
  "CMP-G5-W05-T020",
  "CMP-G5-W05-T021",
  "CMP-G5-W05-T022",
  "CMP-G5-W05-T023",
  "CMP-G5-W05-T024",
  "CMP-G5-W05-T025",
  "CMP-G5-W05-T026",
  "CMP-G5-W05-T027",
  "CMP-G5-W05-T028",
  "CMP-G5-W05-T029",
  "CMP-G5-W05-T030",
  "CMP-G5-W05-T031",
  "CMP-G5-W05-T032",
]);

export const VAULT_DMS_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "vault-dms",
  cmp_gate: "CMP-G5",
  cmp_work_package: "CMP-G5-W05",
  depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04"]),
  package_ref: "packages/dms",
  source_boundary_refs: Object.freeze(["packages/search", "packages/email-dms", "packages/data-room"]),
  runtime_routes: VAULT_PREFIXES,
  tuw_ids: CMP_G5_TUW_IDS,
  legacy_reference_tuw_ids: Object.freeze([
    "LFOS-G4-W06-T001",
    "LFOS-G4-W06-T002",
    "LFOS-G4-W06-T003",
    "LFOS-G4-W06-T004",
    "LFOS-G4-W06-T005",
    "LFOS-G4-W06-T006",
    "LFOS-G4-W06-T007",
    "LFOS-G4-W06-T008",
    "LFOS-G4-W06-T009",
    "LFOS-G4-W06-T010",
    "LFOS-G4-W06-T011",
    "LFOS-G4-W06-T012",
    "LFOS-G4-W06-T013",
    "LFOS-G4-W06-T014",
    "LFOS-G4-W06-T015",
    "LFOS-G4-W06-T016",
  ]),
  runtime_readiness_claim: RUNTIME_READINESS,
});

export function isVaultDmsPath(pathname) {
  return VAULT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function response(status, body) {
  return { status, body };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function key(tenantId, id) {
  return `${tenantId}:${id}`;
}

function requireTenant(query = {}) {
  if (query.tenant_id !== SYNTHETIC_TENANT) {
    const error = new Error("Vault/DMS synthetic tenant is required");
    error.safe_error_code = "CMP_G5_TENANT_REQUIRED";
    throw error;
  }
  return query.tenant_id;
}

function actorContext(query = {}) {
  return {
    actor_id: query.actor_id ?? "vault-dms-runtime-actor",
    actor_type: "user",
    tenant_id: query.tenant_id,
  };
}

function safeError(error) {
  return response(400, {
    outcome: "blocked",
    safe_error_code: error.safe_error_code ?? "CMP_G5_VALIDATION_ERROR",
    reason: error.message,
  });
}

function notFound(code, reason = "not_found") {
  return response(404, { outcome: "not_found", safe_error_code: code, reason });
}

function makeSha(seed) {
  return `cmp-g5-sha256-${String(seed ?? "fixture").replace(/[^a-zA-Z0-9]/g, "-")}`;
}

function appendVaultAudit(context, { tenant_id, actor_id, action, object_type, object_id, reason, matter_id, document_version_id = null, evidence_refs = [] }) {
  const event = context.auditLedger.append(
    buildAuditEventInput({
      tenant_id,
      actor: { actor_id, actor_type: "user" },
      action,
      object: { object_type, object_id },
      outcome: "success",
      decision: "allow",
      reason_code: reason,
      source_service: "@law-firm-os/api:vault-dms-runtime",
      request: {
        request_id: `cmp_g5_req_${randomUUID()}`,
        trace_id: `cmp_g5_trace_${matter_id ?? object_id}`,
        span_id: "cmp_g5_runtime",
        idempotency_key: `${tenant_id}:${action}:${object_id}:${matter_id ?? "tenant"}`,
      },
      matter_id,
      document_version_id,
      evidence_refs,
      permission_decision_id: `cmp_g5_permission_${object_type}_${object_id}`,
    }),
  );
  return clone(event);
}

function requirePermissionBeforeSearch(body = {}) {
  if (!body.permission_decision_id || body.permission_effect !== "allow") {
    const error = new Error("Vault/DMS search requires allow permission evidence before query execution");
    error.safe_error_code = "CMP_G5_PERMISSION_BEFORE_SEARCH_REQUIRED";
    throw error;
  }
  return Object.freeze({
    permission_decision_id: body.permission_decision_id,
    permission_effect: body.permission_effect,
    permission_evidence_ref: body.permission_evidence_ref ?? body.permission_decision_id,
  });
}

function getWorkspace(context, tenantId, workspaceId) {
  return context.workspaces.get(key(tenantId, workspaceId)) ?? null;
}

function getFolder(context, tenantId, folderId) {
  return context.folders.get(key(tenantId, folderId)) ?? null;
}

function getDocumentEntry(context, tenantId, documentId) {
  return context.documents.get(key(tenantId, documentId)) ?? null;
}

function getFileObject(context, tenantId, fileObjectId) {
  return context.fileObjects.get(key(tenantId, fileObjectId)) ?? null;
}

function publicFileObject(fileObject, descriptor = null) {
  return {
    file_object_id: fileObject.file_object_id,
    tenant_id: fileObject.tenant_id,
    matter_id: fileObject.matter_id,
    sha256: fileObject.sha256,
    byte_size: fileObject.byte_size,
    mime_type: fileObject.mime_type,
    sanitized_storage_pointer_ref: descriptor?.sanitized_storage_pointer_ref ?? `dms-file-object:${fileObject.tenant_id}:${fileObject.file_object_id}`,
    raw_storage_path_exposed: false,
    document_bytes_exposed: false,
  };
}

function publicDocumentProjection(entry) {
  return {
    document_id: entry.document.document_id,
    tenant_id: entry.document.tenant_id,
    matter_id: entry.document.matter_id,
    workspace_id: entry.document.workspace_id,
    folder_id: entry.document.folder_id,
    title: entry.document.title,
    status: entry.document.status,
    current_version_id: entry.document.current_version_id,
    privilege_label: entry.privilege_label ?? null,
    raw_storage_path_exposed: false,
    document_bytes_exposed: false,
    extracted_text_exposed: false,
  };
}

function createWorkspaceRecord({ tenantId, body }) {
  const workspaceId = body.workspace_id ?? `workspace-cmp-g5-${randomUUID()}`;
  return createDmsWorkspace({
    workspace_id: workspaceId,
    tenant_id: tenantId,
    matter_id: body.matter_id,
    name: body.name ?? "CMP G5 Vault Workspace",
    status: body.status ?? "active",
    permission_envelope_id: body.permission_envelope_id ?? `perm-${workspaceId}`,
    audit_trace_id: body.audit_trace_id ?? `audit-${workspaceId}`,
  });
}

function createFolderRecord({ tenantId, workspace, body }) {
  const folderId = body.folder_id ?? `folder-cmp-g5-${randomUUID()}`;
  return createDmsFolder({
    folder_id: folderId,
    tenant_id: tenantId,
    matter_id: body.matter_id ?? workspace.matter_id,
    workspace_id: workspace.workspace_id,
    parent_folder_id: body.parent_folder_id,
    name: body.name ?? "Client Documents",
    status: body.status ?? "active",
    permission_envelope_id: body.permission_envelope_id ?? `${workspace.permission_envelope_id}:folder`,
    audit_trace_id: body.audit_trace_id ?? `${workspace.audit_trace_id}:folder`,
  });
}

function createDocumentSet({ tenantId, workspace, folder, body }) {
  const documentId = body.document_id ?? `doc-cmp-g5-${randomUUID()}`;
  const versionId = body.version_id ?? `version-${documentId}-001`;
  const fileObjectId = body.file_object_id ?? `file-${documentId}-001`;
  const document = createDmsDocument({
    document_id: documentId,
    tenant_id: tenantId,
    matter_id: body.matter_id ?? workspace.matter_id,
    workspace_id: workspace.workspace_id,
    folder_id: folder?.folder_id,
    title: body.title ?? "CMP G5 Runtime Document",
    status: body.status ?? "active",
    current_version_id: versionId,
    permission_envelope_id: body.permission_envelope_id ?? `${workspace.permission_envelope_id}:document`,
    audit_trace_id: body.audit_trace_id ?? `${workspace.audit_trace_id}:document`,
    source_policy: "source_required",
  });
  const fileObject = createDmsFileObject({
    file_object_id: fileObjectId,
    tenant_id: tenantId,
    matter_id: document.matter_id,
    storage_pointer_ref: body.storage_pointer_ref ?? `object-store-ref:cmp-g5/${fileObjectId}`,
    sha256: body.sha256 ?? makeSha(fileObjectId),
    byte_size: Number(body.byte_size ?? 2048),
    mime_type: body.mime_type ?? "application/pdf",
    permission_envelope_id: body.permission_envelope_id ?? `${document.permission_envelope_id}:file`,
    audit_trace_id: body.audit_trace_id ?? `${document.audit_trace_id}:file`,
  });
  const version = createDmsDocumentVersion({
    version_id: versionId,
    document_id: documentId,
    tenant_id: tenantId,
    matter_id: document.matter_id,
    version_number: Number(body.version_number ?? 1),
    status: body.version_status ?? "current",
    file_object_id: fileObject.file_object_id,
    permission_envelope_id: body.permission_envelope_id ?? `${document.permission_envelope_id}:version`,
    audit_trace_id: body.audit_trace_id ?? `${document.audit_trace_id}:version`,
    hash_algorithm: "sha256",
  });
  return { document, version, fileObject };
}

function createNextVersionSet({ tenantId, entry, body }) {
  const maxVersionNumber = entry.versions.reduce((max, version) => Math.max(max, Number(version.version_number ?? 0)), 0);
  const versionNumber = Number(body.version_number ?? maxVersionNumber + 1);
  const versionId = body.version_id ?? `version-${entry.document.document_id}-${String(versionNumber).padStart(3, "0")}`;
  const fileObjectId = body.file_object_id ?? `file-${entry.document.document_id}-${String(versionNumber).padStart(3, "0")}`;
  const fileObject = createDmsFileObject({
    file_object_id: fileObjectId,
    tenant_id: tenantId,
    matter_id: entry.document.matter_id,
    storage_pointer_ref: body.storage_pointer_ref ?? `object-store-ref:cmp-g5/${fileObjectId}`,
    sha256: body.sha256 ?? makeSha(fileObjectId),
    byte_size: Number(body.byte_size ?? 4096),
    mime_type: body.mime_type ?? "application/pdf",
    permission_envelope_id: body.permission_envelope_id ?? `${entry.document.permission_envelope_id}:file:${versionNumber}`,
    audit_trace_id: body.audit_trace_id ?? `${entry.document.audit_trace_id}:file:${versionNumber}`,
  });
  const version = createDmsDocumentVersion({
    version_id: versionId,
    document_id: entry.document.document_id,
    tenant_id: tenantId,
    matter_id: entry.document.matter_id,
    version_number: versionNumber,
    status: body.version_status ?? "current",
    file_object_id: fileObject.file_object_id,
    permission_envelope_id: body.permission_envelope_id ?? `${entry.document.permission_envelope_id}:version:${versionNumber}`,
    audit_trace_id: body.audit_trace_id ?? `${entry.document.audit_trace_id}:version:${versionNumber}`,
    hash_algorithm: "sha256",
  });
  return { version, fileObject };
}

export function createVaultDmsRuntimeContext() {
  return {
    workspaces: new Map(),
    folders: new Map(),
    documents: new Map(),
    fileObjects: new Map(),
    emailFilings: [],
    outlookPlaceholders: [],
    searchRuns: [],
    auditCoverageDescriptors: [],
    auditLedger: createAuditLedger(),
  };
}

function createEvidenceRecords(tenantId) {
  const workspace = createWorkspaceRecord({
    tenantId,
    body: {
      workspace_id: "workspace-cmp-g5-evidence",
      matter_id: "matter-cmp-g4-runtime",
      name: "CMP G5 Evidence Workspace",
    },
  });
  const folder = createFolderRecord({
    tenantId,
    workspace,
    body: {
      folder_id: "folder-cmp-g5-evidence",
      path_segments: ["Matters", "CMP-G5"],
    },
  });
  const { document, version, fileObject } = createDocumentSet({
    tenantId,
    workspace,
    folder,
    body: {
      document_id: "doc-cmp-g5-evidence",
      title: "CMP G5 Evidence Document",
      version_id: "version-doc-cmp-g5-evidence-001",
      file_object_id: "file-doc-cmp-g5-evidence-001",
    },
  });
  return {
    workspace,
    folder,
    document,
    versions: [version],
    fileObjects: [fileObject],
    privilege_label: { label_id: "priv-cmp-g5-evidence", classification: "confidential", ai_search_excluded: true },
  };
}

function firstEvidenceEntry(context, tenantId) {
  const stored = [...context.documents.values()].find((entry) => entry.document.tenant_id === tenantId);
  if (stored) {
    return {
      workspace: getWorkspace(context, tenantId, stored.document.workspace_id),
      folder: stored.document.folder_id ? getFolder(context, tenantId, stored.document.folder_id) : null,
      document: stored.document,
      versions: stored.versions,
      fileObjects: stored.fileObjects,
      privilege_label: stored.privilege_label,
      checkout_lock: stored.checkout_lock,
      redactions: stored.redactions ?? [],
      secure_links: stored.secure_links ?? [],
    };
  }
  return createEvidenceRecords(tenantId);
}

function buildVaultDescriptors(context, tenantId) {
  const entry = firstEvidenceEntry(context, tenantId);
  const currentVersion = entry.versions.find((version) => version.version_id === entry.document.current_version_id) ?? entry.versions.at(-1);
  const currentFile = entry.fileObjects.find((fileObject) => fileObject.file_object_id === currentVersion?.file_object_id) ?? entry.fileObjects.at(-1);
  const privilegeLabel = entry.privilege_label ?? {
    label_id: "priv-cmp-g5-runtime",
    classification: "confidential",
    ai_search_excluded: true,
  };
  const redactions = entry.redactions?.length > 0 ? entry.redactions : [{ redaction_id: "redaction-cmp-g5-runtime", page: 1, reason: "privilege" }];
  const auditEvents = [
    { event_type: "view", document_id: entry.document.document_id },
    { event_type: "download", document_id: entry.document.document_id },
    { event_type: "share", document_id: entry.document.document_id },
  ];

  const workspace = createDmsG4WorkspaceDescriptor({
    tenant_id: tenantId,
    matter_id: entry.document.matter_id,
    workspace: entry.workspace,
  });
  const folder = createDmsG4FolderPathDescriptor({
    tenant_id: tenantId,
    workspace: entry.workspace,
    folder: entry.folder,
    path_permission_ref: "permission:cmp-g5:path",
    path_segments: ["Matters", entry.document.matter_id, "Client Documents"],
  });
  const upload = createDmsG4DocumentUploadDescriptor({
    tenant_id: tenantId,
    workspace: entry.workspace,
    document: entry.document,
    version: currentVersion,
    file_object: currentFile,
    upload_audit_ref: "audit:cmp-g5:upload",
  });
  const version = createDmsG4DocumentVersionDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    version: currentVersion,
    previous_versions: entry.versions.filter((item) => item.version_id !== currentVersion.version_id),
  });
  const storage = createDmsG4FileObjectStorageDescriptor({
    tenant_id: tenantId,
    file_object: currentFile,
  });
  const lineage = createDmsG4DocumentLineageHashDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    versions: entry.versions,
    file_objects: entry.fileObjects,
  });
  const lock = createDmsG4CheckoutLockDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g5-runtime-evidence",
    document: entry.document,
    lock_request: { lock_id: "lock-cmp-g5-runtime", status: "active" },
    existing_lock: entry.checkout_lock,
  });
  const privilege = createDmsG4PrivilegeLabelDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    privilege_label: privilegeLabel,
  });
  const redaction = createDmsG4RedactionMetadataDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    redactions,
    export_redacted: true,
  });
  const link = createDmsG4SecureLinkDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    link_policy: {
      expires_at: "2030-01-01T00:00:00.000Z",
      mfa_required: true,
      watermark_required: true,
    },
  });
  const email = createDmsG4EmailFilingDescriptor({
    tenant_id: tenantId,
    matter_id: entry.document.matter_id,
    email_thread: {
      email_thread_id: "email-thread-cmp-g5-runtime",
      matter_id: entry.document.matter_id,
      message_ids: ["message-cmp-g5-runtime"],
      subject: "CMP G5 runtime filing",
    },
    dms_document_ref: entry.document.document_id,
    filing_audit_ref: "audit:cmp-g5:email-filing",
  });
  const outlook = createDmsG4OutlookPlaceholderDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g5-runtime-evidence",
    placeholder_request: {
      placeholder_id: "outlook-placeholder-cmp-g5-runtime",
      matter_id: entry.document.matter_id,
      document_id: entry.document.document_id,
    },
  });
  const search = createDmsG4SearchAclDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g5-runtime-evidence",
    query: "cmp g5",
    search_results: [
      {
        document_id: entry.document.document_id,
        version_id: currentVersion.version_id,
        title: entry.document.title,
        snippet: "metadata-only result",
        actor_can_view: true,
        permission_decision: "allow",
      },
      {
        document_id: "doc-cmp-g5-denied",
        title: "Denied document",
        actor_can_view: false,
        permission_decision: "deny",
      },
    ],
  });
  const ui = createDmsG4WorkspaceUiDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g5-runtime-evidence",
    document: entry.document,
    current_version: currentVersion,
    privilege_label: privilegeLabel,
    ui_state: {
      displayed_version_id: currentVersion.version_id,
      visible_privilege_label: privilegeLabel.classification,
      unauthorized_count_visible: false,
    },
  });
  const audit = createDmsG4AuditCoverageDescriptor({
    tenant_id: tenantId,
    actor_id: "cmp-g5-runtime-evidence",
    document: entry.document,
    audit_events: auditEvents,
  });

  return { workspace, folder, upload, version, storage, lineage, lock, privilege, redaction, link, email, outlook, search, ui, audit };
}

export function createVaultDmsCmpG5RuntimeEvidence(context, tenantId = SYNTHETIC_TENANT) {
  const descriptors = buildVaultDescriptors(context, tenantId);
  const tenantDocuments = [...context.documents.values()].filter((entry) => entry.document.tenant_id === tenantId);
  return Object.freeze({
    cmp_gate: "CMP-G5",
    cmp_work_package: "CMP-G5-W05",
    depends_on: Object.freeze(["CMP-G1-W01", "CMP-G2-W02", "CMP-G3-W03", "CMP-G4-W04"]),
    tuw_ids: CMP_G5_TUW_IDS,
    legacy_reference_tuw_ids: VAULT_DMS_BOUNDED_CONTEXT.legacy_reference_tuw_ids,
    runtime_routes: VAULT_DMS_BOUNDED_CONTEXT.runtime_routes,
    runtime_readiness: RUNTIME_READINESS,
    durable_persistence_open: true,
    permission_before_search_enforced: true,
    raw_storage_path_exposed: false,
    document_bytes_exposed: false,
    extracted_text_exposed: false,
    unauthorized_search_count_exposed: false,
    workspace_count: [...context.workspaces.values()].filter((workspace) => workspace.tenant_id === tenantId).length,
    document_count: tenantDocuments.length,
    search_run_count: context.searchRuns.filter((run) => run.tenant_id === tenantId).length,
    descriptor_closeouts: Object.freeze({
      workspace_document_foundation: createDmsG4DWorkspaceDocumentFoundationCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: [descriptors.workspace, descriptors.folder, descriptors.upload, descriptors.version, descriptors.storage, descriptors.lineage],
      }),
      security_email_search: createDmsG4ESecurityEmailSearchCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: [
          descriptors.lock,
          descriptors.privilege,
          descriptors.redaction,
          descriptors.link,
          descriptors.email,
          descriptors.outlook,
          descriptors.search,
        ],
      }),
      ui_audit_closeout: createDmsG4FDmsCloseoutDescriptor({
        tenant_id: tenantId,
        descriptors: [descriptors.ui, descriptors.audit],
      }),
    }),
  });
}

export async function handleVaultDmsApiRequest({ pathname, method, query = {}, body = {}, context }) {
  try {
    const tenantId = requireTenant(query);
    const actor = actorContext({ ...query, tenant_id: tenantId });

    if (pathname === "/api/vault/runtime/evidence" && method === "GET") {
      return response(200, { outcome: "ok", evidence: createVaultDmsCmpG5RuntimeEvidence(context, tenantId), tuw_ids: CMP_G5_TUW_IDS });
    }

    if (pathname === "/api/vault/workspaces" && method === "POST") {
      const workspace = createWorkspaceRecord({ tenantId, body });
      const descriptor = createDmsG4WorkspaceDescriptor({ tenant_id: tenantId, matter_id: workspace.matter_id, workspace });
      if (descriptor.outcome === "blocked") {
        return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_WORKSPACE_BLOCKED", descriptor });
      }
      context.workspaces.set(key(tenantId, workspace.workspace_id), workspace);
      const audit_event = appendVaultAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "vault.workspace.create",
        object_type: "DmsWorkspace",
        object_id: workspace.workspace_id,
        reason: "matter_scoped_workspace_validated",
        matter_id: workspace.matter_id,
      });
      return response(201, { outcome: "created", workspace, descriptor, audit_event, tuw_ids: ["CMP-G5-W05-T001", "CMP-G5-W05-T016"] });
    }

    if (pathname === "/api/vault/folders" && method === "POST") {
      const workspace = getWorkspace(context, tenantId, body.workspace_id);
      if (!workspace) return notFound("CMP_G5_WORKSPACE_NOT_FOUND");
      const folder = createFolderRecord({ tenantId, workspace, body });
      const descriptor = createDmsG4FolderPathDescriptor({
        tenant_id: tenantId,
        workspace,
        folder,
        path_permission_ref: body.path_permission_ref ?? "permission:cmp-g5:path",
        path_segments: body.path_segments ?? ["Matters", workspace.matter_id, folder.name],
      });
      if (descriptor.outcome === "blocked") {
        return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_FOLDER_BLOCKED", descriptor });
      }
      context.folders.set(key(tenantId, folder.folder_id), folder);
      const audit_event = appendVaultAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "vault.folder.create",
        object_type: "DmsFolder",
        object_id: folder.folder_id,
        reason: "folder_path_permission_validated",
        matter_id: folder.matter_id,
      });
      return response(201, { outcome: "created", folder, descriptor, audit_event, tuw_ids: ["CMP-G5-W05-T002", "CMP-G5-W05-T016"] });
    }

    if (pathname === "/api/vault/documents/upload" && method === "POST") {
      const workspace = getWorkspace(context, tenantId, body.workspace_id);
      if (!workspace) return notFound("CMP_G5_WORKSPACE_NOT_FOUND");
      const folder = body.folder_id ? getFolder(context, tenantId, body.folder_id) : null;
      const { document, version, fileObject } = createDocumentSet({ tenantId, workspace, folder, body });
      const descriptor = createDmsG4DocumentUploadDescriptor({
        tenant_id: tenantId,
        workspace,
        document,
        version,
        file_object: fileObject,
        upload_audit_ref: body.upload_audit_ref ?? "audit:cmp-g5:upload",
      });
      if (descriptor.outcome === "blocked") {
        return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_DOCUMENT_UPLOAD_BLOCKED", descriptor });
      }
      const storage = createDmsG4FileObjectStorageDescriptor({ tenant_id: tenantId, file_object: fileObject });
      const entry = {
        document,
        versions: [version],
        fileObjects: [fileObject],
        privilege_label: null,
        checkout_lock: null,
        redactions: [],
        secure_links: [],
      };
      context.documents.set(key(tenantId, document.document_id), entry);
      context.fileObjects.set(key(tenantId, fileObject.file_object_id), fileObject);
      const audit_event = appendVaultAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "vault.document.upload",
        object_type: "DmsDocument",
        object_id: document.document_id,
        reason: "document_metadata_upload_validated",
        matter_id: document.matter_id,
        evidence_refs: [descriptor.upload_audit_ref],
      });
      return response(201, {
        outcome: "created",
        document: publicDocumentProjection(entry),
        version,
        file_object: publicFileObject(fileObject, storage),
        descriptor,
        storage,
        audit_event,
        tuw_ids: ["CMP-G5-W05-T003", "CMP-G5-W05-T004", "CMP-G5-W05-T005", "CMP-G5-W05-T017"],
      });
    }

    const versionMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/versions$/);
    if (versionMatch && method === "POST") {
      return handleDocumentVersionCreate({
        tenantId,
        actor,
        documentId: decodeURIComponent(versionMatch[1]),
        body,
        context,
      });
    }

    const storageMatch = pathname.match(/^\/api\/vault\/file-objects\/([^/]+)\/storage$/);
    if (storageMatch && method === "GET") {
      const fileObject = getFileObject(context, tenantId, decodeURIComponent(storageMatch[1]));
      if (!fileObject) return notFound("CMP_G5_FILE_OBJECT_NOT_FOUND");
      const descriptor = createDmsG4FileObjectStorageDescriptor({ tenant_id: tenantId, file_object: fileObject });
      const audit_event = appendVaultAudit(context, {
        tenant_id: tenantId,
        actor_id: actor.actor_id,
        action: "download",
        object_type: "DmsFileObject",
        object_id: fileObject.file_object_id,
        reason: "metadata_only_storage_descriptor_viewed",
        matter_id: fileObject.matter_id,
      });
      return response(200, {
        outcome: "ok",
        storage: descriptor,
        file_object: publicFileObject(fileObject, descriptor),
        audit_event,
        tuw_ids: ["CMP-G5-W05-T005", "CMP-G5-W05-T030"],
      });
    }

    const lineageMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/lineage$/);
    if (lineageMatch && method === "GET") {
      const entry = getDocumentEntry(context, tenantId, decodeURIComponent(lineageMatch[1]));
      if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
      const descriptor = createDmsG4DocumentLineageHashDescriptor({
        tenant_id: tenantId,
        document: entry.document,
        versions: entry.versions,
        file_objects: entry.fileObjects,
      });
      return response(200, { outcome: "ok", lineage: descriptor, tuw_ids: ["CMP-G5-W05-T006", "CMP-G5-W05-T018"] });
    }

    const lockMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/checkout-locks$/);
    if (lockMatch && method === "POST") {
      return handleCheckoutLock({ tenantId, actor, documentId: decodeURIComponent(lockMatch[1]), body, context });
    }

    const privilegeMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/privilege-label$/);
    if (privilegeMatch && method === "POST") {
      return handlePrivilegeLabel({ tenantId, actor, documentId: decodeURIComponent(privilegeMatch[1]), body, context });
    }

    const redactionMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/redactions$/);
    if (redactionMatch && method === "POST") {
      return handleRedactions({ tenantId, actor, documentId: decodeURIComponent(redactionMatch[1]), body, context });
    }

    const secureLinkMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/secure-links$/);
    if (secureLinkMatch && method === "POST") {
      return handleSecureLink({ tenantId, actor, documentId: decodeURIComponent(secureLinkMatch[1]), body, context });
    }

    if (pathname === "/api/vault/email/filings" && method === "POST") {
      return handleEmailFiling({ tenantId, actor, body, context });
    }

    if (pathname === "/api/vault/outlook/placeholders" && method === "POST") {
      return handleOutlookPlaceholder({ tenantId, actor, body, context });
    }

    if (pathname === "/api/vault/search" && method === "POST") {
      return handleVaultSearch({ tenantId, actor, body, context });
    }

    const uiMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/ui-state$/);
    if (uiMatch && method === "GET") {
      return handleUiState({ tenantId, actor, documentId: decodeURIComponent(uiMatch[1]), context });
    }

    const auditCoverageMatch = pathname.match(/^\/api\/vault\/documents\/([^/]+)\/audit-coverage$/);
    if (auditCoverageMatch && method === "GET") {
      return handleAuditCoverage({ tenantId, actor, documentId: decodeURIComponent(auditCoverageMatch[1]), context });
    }

    if (pathname === "/api/vault/audit" && method === "GET") {
      return response(200, {
        outcome: "ok",
        events: context.auditLedger.list({ tenant_id: tenantId }).map(clone),
        verification: context.auditLedger.verify({ tenant_id: tenantId }),
        tuw_ids: ["CMP-G5-W05-T030", "CMP-G5-W05-T031", "CMP-G5-W05-T032"],
      });
    }

    return response(404, { outcome: "blocked", safe_error_code: "CMP_G5_NOT_FOUND", reason: "not_found" });
  } catch (error) {
    return safeError(error);
  }
}

function handleDocumentVersionCreate({ tenantId, actor, documentId, body, context }) {
  const entry = getDocumentEntry(context, tenantId, documentId);
  if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
  const { version, fileObject } = createNextVersionSet({ tenantId, entry, body });
  const descriptor = createDmsG4DocumentVersionDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    version,
    previous_versions: entry.versions,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_DOCUMENT_VERSION_BLOCKED", descriptor });
  }
  const document = { ...entry.document, current_version_id: version.version_id };
  const nextEntry = {
    ...entry,
    document,
    versions: [...entry.versions.map((item) => ({ ...item, status: "superseded" })), version],
    fileObjects: [...entry.fileObjects, fileObject],
  };
  context.documents.set(key(tenantId, documentId), nextEntry);
  context.fileObjects.set(key(tenantId, fileObject.file_object_id), fileObject);
  const audit_event = appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "vault.document.version.create",
    object_type: "DmsDocumentVersion",
    object_id: version.version_id,
    reason: "immutable_document_version_created",
    matter_id: document.matter_id,
  });
  return response(201, {
    outcome: "created",
    document: publicDocumentProjection(nextEntry),
    version,
    file_object: publicFileObject(fileObject),
    descriptor,
    audit_event,
    tuw_ids: ["CMP-G5-W05-T004", "CMP-G5-W05-T006", "CMP-G5-W05-T017"],
  });
}

function handleCheckoutLock({ tenantId, actor, documentId, body, context }) {
  const entry = getDocumentEntry(context, tenantId, documentId);
  if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
  const descriptor = createDmsG4CheckoutLockDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    document: entry.document,
    lock_request: {
      lock_id: body.lock_id ?? `lock-${documentId}`,
      status: body.status ?? "active",
    },
    existing_lock: entry.checkout_lock,
  });
  if (descriptor.outcome === "blocked") {
    return response(409, { outcome: "blocked", safe_error_code: "CMP_G5_CHECKOUT_LOCK_BLOCKED", descriptor });
  }
  const lock = {
    lock_id: body.lock_id ?? `lock-${documentId}`,
    locked_by: actor.actor_id,
    status: body.status ?? "active",
  };
  context.documents.set(key(tenantId, documentId), { ...entry, checkout_lock: lock });
  appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "vault.document.lock",
    object_type: "DmsDocumentLock",
    object_id: lock.lock_id,
    reason: "checkout_lock_validated",
    matter_id: entry.document.matter_id,
  });
  return response(200, { outcome: "locked", lock, descriptor, tuw_ids: ["CMP-G5-W05-T007", "CMP-G5-W05-T019"] });
}

function handlePrivilegeLabel({ tenantId, actor, documentId, body, context }) {
  const entry = getDocumentEntry(context, tenantId, documentId);
  if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
  const privilegeLabel = {
    label_id: body.label_id ?? `priv-${documentId}`,
    classification: body.classification ?? "confidential",
    ai_search_excluded: body.ai_search_excluded ?? true,
  };
  const descriptor = createDmsG4PrivilegeLabelDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    privilege_label: privilegeLabel,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_PRIVILEGE_LABEL_BLOCKED", descriptor });
  }
  context.documents.set(key(tenantId, documentId), { ...entry, privilege_label: privilegeLabel });
  appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "vault.document.privilege_label",
    object_type: "DmsPrivilegeLabel",
    object_id: privilegeLabel.label_id,
    reason: "privilege_search_exclusion_validated",
    matter_id: entry.document.matter_id,
  });
  return response(200, { outcome: "updated", privilege_label: privilegeLabel, descriptor, tuw_ids: ["CMP-G5-W05-T008", "CMP-G5-W05-T020"] });
}

function handleRedactions({ tenantId, actor, documentId, body, context }) {
  const entry = getDocumentEntry(context, tenantId, documentId);
  if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
  const redactions = body.redactions ?? [{ redaction_id: `redaction-${documentId}`, page: 1, reason: "privilege" }];
  const descriptor = createDmsG4RedactionMetadataDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    redactions,
    export_redacted: body.export_redacted,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_REDACTION_BLOCKED", descriptor });
  }
  context.documents.set(key(tenantId, documentId), { ...entry, redactions });
  appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "vault.document.redaction",
    object_type: "DmsRedaction",
    object_id: `${documentId}:redaction`,
    reason: "redacted_export_policy_validated",
    matter_id: entry.document.matter_id,
  });
  return response(200, { outcome: "updated", redactions, descriptor, tuw_ids: ["CMP-G5-W05-T009", "CMP-G5-W05-T021"] });
}

function handleSecureLink({ tenantId, actor, documentId, body, context }) {
  const entry = getDocumentEntry(context, tenantId, documentId);
  if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
  const linkPolicy = {
    expires_at: body.expires_at,
    mfa_required: body.mfa_required,
    watermark_required: body.watermark_required,
  };
  const descriptor = createDmsG4SecureLinkDescriptor({
    tenant_id: tenantId,
    document: entry.document,
    link_policy: linkPolicy,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_SECURE_LINK_BLOCKED", descriptor });
  }
  const secureLink = {
    secure_link_id: body.secure_link_id ?? `secure-link-${documentId}`,
    document_id: documentId,
    expires_at: linkPolicy.expires_at,
    mfa_required: true,
    watermark_required: true,
    document_bytes_served: false,
  };
  context.documents.set(key(tenantId, documentId), {
    ...entry,
    secure_links: [...(entry.secure_links ?? []), secureLink],
  });
  const audit_event = appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "share",
    object_type: "DmsSecureLink",
    object_id: secureLink.secure_link_id,
    reason: "secure_link_policy_validated",
    matter_id: entry.document.matter_id,
  });
  return response(201, { outcome: "created", secure_link: secureLink, descriptor, audit_event, tuw_ids: ["CMP-G5-W05-T010", "CMP-G5-W05-T022"] });
}

function handleEmailFiling({ tenantId, actor, body, context }) {
  const documentId = body.dms_document_ref ?? body.document_id;
  const entry = documentId ? getDocumentEntry(context, tenantId, documentId) : null;
  const matterId = body.matter_id ?? entry?.document.matter_id;
  const descriptor = createDmsG4EmailFilingDescriptor({
    tenant_id: tenantId,
    matter_id: matterId,
    email_thread: body.email_thread ?? {
      email_thread_id: body.email_thread_id ?? `email-thread-${documentId ?? "cmp-g5"}`,
      matter_id: matterId,
      message_ids: body.message_ids ?? ["message-cmp-g5-runtime"],
      subject: body.subject ?? "CMP G5 email filing",
    },
    dms_document_ref: documentId,
    filing_audit_ref: body.filing_audit_ref ?? "audit:cmp-g5:email-filing",
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_EMAIL_FILING_BLOCKED", descriptor });
  }
  context.emailFilings.push(descriptor);
  appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "vault.email.file",
    object_type: "DmsEmailFiling",
    object_id: descriptor.email_thread_id,
    reason: "matter_scoped_email_filing_validated",
    matter_id: matterId,
  });
  return response(201, { outcome: "filed", filing: descriptor, tuw_ids: ["CMP-G5-W05-T011", "CMP-G5-W05-T023"] });
}

function handleOutlookPlaceholder({ tenantId, actor, body, context }) {
  const descriptor = createDmsG4OutlookPlaceholderDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    placeholder_request: body.placeholder_request ?? {
      placeholder_id: body.placeholder_id ?? "outlook-placeholder-cmp-g5",
      matter_id: body.matter_id,
      document_id: body.document_id,
    },
    include_credentials: body.include_credentials,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_OUTLOOK_PLACEHOLDER_BLOCKED", descriptor });
  }
  context.outlookPlaceholders.push(descriptor);
  appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "vault.outlook.placeholder",
    object_type: "DmsOutlookPlaceholder",
    object_id: descriptor.placeholder_request.placeholder_id ?? `outlook-placeholder-${randomUUID()}`,
    reason: "outlook_placeholder_without_credentials_validated",
    matter_id: descriptor.placeholder_request.matter_id,
  });
  return response(201, { outcome: "created", placeholder: descriptor, tuw_ids: ["CMP-G5-W05-T012", "CMP-G5-W05-T024"] });
}

function handleVaultSearch({ tenantId, actor, body, context }) {
  const permission = requirePermissionBeforeSearch(body);
  const deniedIds = new Set(body.denied_document_ids ?? []);
  const queryValue = String(body.query ?? "").toLowerCase();
  const searchResults = [...context.documents.values()]
    .filter((entry) => entry.document.tenant_id === tenantId)
    .filter((entry) => !queryValue || entry.document.title.toLowerCase().includes(queryValue))
    .map((entry) => {
      const currentVersion = entry.versions.find((version) => version.version_id === entry.document.current_version_id) ?? entry.versions.at(-1);
      const denied = deniedIds.has(entry.document.document_id);
      const searchExcluded = entry.privilege_label?.ai_search_excluded === true;
      return {
        document_id: entry.document.document_id,
        version_id: currentVersion?.version_id,
        title: entry.document.title,
        snippet: "metadata-only result",
        actor_can_view: !denied,
        permission_decision: denied ? "deny" : "allow",
        search_excluded: searchExcluded,
      };
    });
  const descriptor = createDmsG4SearchAclDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    query: body.query,
    search_results: searchResults,
    include_unauthorized_results: body.include_unauthorized_results,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_SEARCH_ACL_BLOCKED", descriptor });
  }
  context.searchRuns.push({ tenant_id: tenantId, descriptor, permission });
  const audit_event = appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "vault.search.execute",
    object_type: "DmsSearch",
    object_id: `search-${randomUUID()}`,
    reason: "permission_before_search_enforced",
    evidence_refs: [permission.permission_evidence_ref],
  });
  return response(200, {
    outcome: "ok",
    search: descriptor,
    permission_before_search_enforced: true,
    unauthorized_result_count_exposed: null,
    permission,
    audit_event,
    tuw_ids: ["CMP-G5-W05-T013", "CMP-G5-W05-T025", "CMP-G5-W05-T028", "CMP-G5-W05-T029"],
  });
}

function handleUiState({ tenantId, actor, documentId, context }) {
  const entry = getDocumentEntry(context, tenantId, documentId);
  if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
  const currentVersion = entry.versions.find((version) => version.version_id === entry.document.current_version_id) ?? entry.versions.at(-1);
  const descriptor = createDmsG4WorkspaceUiDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    document: entry.document,
    current_version: currentVersion,
    privilege_label: entry.privilege_label,
    ui_state: {
      displayed_version_id: currentVersion.version_id,
      visible_privilege_label: entry.privilege_label?.classification,
      unauthorized_count_visible: false,
    },
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_UI_STATE_BLOCKED", descriptor });
  }
  const audit_event = appendVaultAudit(context, {
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    action: "view",
    object_type: "DmsDocumentView",
    object_id: documentId,
    reason: "workspace_ui_state_viewed",
    matter_id: entry.document.matter_id,
  });
  return response(200, { outcome: "ok", ui_state: descriptor, audit_event, tuw_ids: ["CMP-G5-W05-T014", "CMP-G5-W05-T026", "CMP-G5-W05-T030"] });
}

function handleAuditCoverage({ tenantId, actor, documentId, context }) {
  const entry = getDocumentEntry(context, tenantId, documentId);
  if (!entry) return notFound("CMP_G5_DOCUMENT_NOT_FOUND");
  const auditEvents = context.auditLedger
    .list({ tenant_id: tenantId })
    .filter((event) =>
      [
        documentId,
        ...entry.fileObjects.map((fileObject) => fileObject.file_object_id),
        ...(entry.secure_links ?? []).map((link) => link.secure_link_id),
      ].includes(event.object.object_id),
    )
    .map((event) => ({ event_type: event.action, event_id: event.event_id, document_id: documentId }));
  const descriptor = createDmsG4AuditCoverageDescriptor({
    tenant_id: tenantId,
    actor_id: actor.actor_id,
    document: entry.document,
    audit_events: auditEvents,
  });
  if (descriptor.outcome === "blocked") {
    return response(400, { outcome: "blocked", safe_error_code: "CMP_G5_AUDIT_COVERAGE_BLOCKED", descriptor });
  }
  context.auditCoverageDescriptors.push(descriptor);
  return response(200, { outcome: "ok", audit_coverage: descriptor, tuw_ids: ["CMP-G5-W05-T015", "CMP-G5-W05-T027", "CMP-G5-W05-T030", "CMP-G5-W05-T031"] });
}
