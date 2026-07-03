import { createHash } from "node:crypto";
import { fileEmailThreadToMatter } from "../../../packages/email-dms/src/email-filing-service.js";
import { OUTLOOK_EMAIL_OBJECT_FIELDS } from "../../../packages/email-dms/src/email-model.js";
import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { createDmsFolder, createDmsWorkspace } from "../../../packages/dms/src/model.js";
import { serializeFileObjectSafe } from "../../../packages/dms/src/file-object-service.js";
import { createMatterActivityCalendarChannelService } from "../../../packages/matter/src/index.js";
import { buildMatterTimelineReadModel } from "../../../packages/matter/src/timeline-read-model.js";
import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

export const OUTLOOK_ADDIN_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "outlook-addin",
  contract_ref: "workbook/matter_dev_docs/08_Microsoft_365_Outlook_Addin_Spec.md",
  contract_schema_version: "law-firm-os.outlook-addin-runtime.v0.1",
  endpoints: Object.freeze([
    "GET /api/outlook/bootstrap",
    "GET /api/outlook/matters",
    "GET /api/outlook/matters/:matter_id/timeline",
    "GET /api/outlook/matters/:matter_id/documents",
    "POST /api/outlook/email/file",
    "POST /api/outlook/sent/file",
    "POST /api/outlook/attachments/save",
    "POST /api/outlook/followups",
    "POST /api/outlook/smart-alerts/evaluate",
  ]),
  data_source: "matter_runtime_repository+dms_runtime_repository",
  runtime_persistence: "file_backed_repositories",
  runtime_write_ready: true,
  m365_provider_runtime_enabled: false,
  entra_admin_consent_receipt_required: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const OUTLOOK_ADDIN_ERROR_CODES = Object.freeze({
  tenant_required: "OUTLOOK_ADDIN_TENANT_REQUIRED",
  permission_required: "OUTLOOK_ADDIN_PERMISSION_REQUIRED",
  validation_error: "OUTLOOK_ADDIN_VALIDATION_ERROR",
  matter_not_found: "OUTLOOK_ADDIN_MATTER_NOT_FOUND",
  email_not_found: "OUTLOOK_ADDIN_EMAIL_NOT_FOUND",
});

const DEFAULT_LIMIT = 12;
const MATTER_FOLDER_NAMES = Object.freeze([
  "00_Email",
  "10_Pleadings",
  "20_Evidence",
  "30_Contracts",
  "40_WorkProduct",
  "90_Admin",
  "99_Archive",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function optionalString(value, fallback = null) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function safeId(value, fallback = "outlook") {
  return String(value ?? fallback)
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "_")
    .slice(0, 96);
}

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bodyHash(value) {
  return sha256Hex(String(value ?? ""));
}

function bytesForAttachment(attachment = {}) {
  if (typeof attachment.content_base64 === "string" && attachment.content_base64.trim()) {
    return Buffer.from(attachment.content_base64, "base64");
  }
  if (typeof attachment.content_text === "string") return Buffer.from(attachment.content_text);
  return Buffer.from(`Attachment placeholder: ${attachment.name ?? attachment.attachment_id ?? "unknown"}`);
}

function safePerson(value = {}) {
  if (typeof value === "string") return Object.freeze({ display_name: null, address_ref: value, external: /@/.test(value) && !value.endsWith("@amic.law") });
  return Object.freeze({
    display_name: optionalString(value.display_name ?? value.name),
    address_ref: optionalString(value.address_ref ?? value.email ?? value.address, "unknown"),
    external: value.external === true || (typeof value.email === "string" && !value.email.endsWith("@amic.law")),
  });
}

function safeRecipients(value) {
  return Object.freeze((Array.isArray(value) ? value : []).map(safePerson));
}

function success(status, body) {
  return { status, body: { safe_error_codes: [], production_ready_claim: false, ...body } };
}

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      item: null,
      safe_error_codes: codes,
      count_leak_prevented: true,
      production_ready_claim: false,
      ...extra,
    },
  };
}

function permissionDeniedResponse({ requestId, decision, auditHintRef }) {
  const code = decision.effect === "review_required" ? "OUTLOOK_ADDIN_REVIEW_REQUIRED" : "OUTLOOK_ADDIN_PERMISSION_DENIED";
  return errorResponse(decision.effect === "review_required" ? 403 : 403, requestId, [code], {
    outcome: decision.effect === "review_required" ? "review_required" : "denied",
    ui_state: decision.effect === "review_required" ? "review" : "denied",
    audit_hint_ref: auditHintRef,
    permission_decision: {
      effect: decision.effect,
      reason: decision.reason,
      matched_rule_id: decision.matched_rule_id ?? null,
    },
  });
}

function evaluateOutlookPermission({ context, tenant_id, matter_id = null, resource_type, resource_id, action }) {
  return evaluateRouteDecision({
    context,
    resource: {
      tenant_id,
      matter_id,
      resource_type,
      resource_id,
    },
    action,
  });
}

function actorFrom(context, fallback = "outlook_addin_user") {
  return context?.principal?.user_id ?? fallback;
}

function matterSummary(record = {}) {
  return Object.freeze({
    tenant_id: record.tenant_id,
    matter_id: record.matter_id,
    matter_code: record.matter_code ?? null,
    title: record.title ?? record.matter_name ?? record.matter_id,
    client_display_name: record.client_display_name ?? null,
    status: record.status,
    lookup_label: record.matter_code ?? record.title ?? record.matter_id,
    selected_ref: `matter:${record.matter_id}`,
    production_ready_claim: false,
  });
}

function searchMatters({ repository, tenant_id, query = "", context } = {}) {
  const needle = String(query ?? "").trim().toLowerCase();
  const records = repository
    .list({ tenant_id, model_type: "Matter" })
    .filter((matter) => ["open", "opening", "paused"].includes(matter.status))
    .filter((matter) => {
      if (!needle) return true;
      return [matter.matter_id, matter.matter_code, matter.title, matter.matter_name, matter.client_display_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  const { allowed, omittedCount } = trimItemsByPermission({
    context,
    items: records.map((record) => ({ ...record, resource_id: record.matter_id })),
    action: "outlook:matter:read",
    resourceType: "matter",
  });
  return Object.freeze({
    items: Object.freeze(allowed.map(matterSummary)),
    omitted_count: omittedCount,
    count_leak_prevented: true,
  });
}

function findMatter({ repository, tenant_id, matter_id } = {}) {
  return repository.get({ tenant_id, model_type: "Matter", matter_id });
}

function normalizeEmailThread({ input = {}, tenant_id, matter_id, actor_id, mode = "manual" } = {}) {
  const email = input.email ?? input.thread ?? input;
  const graphMessageId = requiredString(email.graph_message_id ?? email.graphMessageId ?? email.message_id, "graph_message_id");
  const internetMessageId = optionalString(email.internet_message_id ?? email.internetMessageId, `<${graphMessageId}@outlook.local>`);
  const conversationId = optionalString(email.conversation_id ?? email.conversationId, `conversation:${safeId(graphMessageId)}`);
  const emailThreadId = optionalString(email.email_thread_id, `thread:${safeId(conversationId)}`);
  const bodyPreview = optionalString(email.body_preview ?? email.preview, "");
  const filingTime = new Date().toISOString();
  const attachments = Array.isArray(email.attachments) ? email.attachments : Array.isArray(input.attachments) ? input.attachments : [];
  return Object.freeze({
    tenant_id,
    matter_id,
    email_thread_id: emailThreadId,
    email_id: optionalString(email.email_id, `email:${safeId(graphMessageId)}`),
    graph_message_id: graphMessageId,
    internet_message_id: internetMessageId,
    conversation_id: conversationId,
    from: safePerson(email.from),
    to: safeRecipients(email.to),
    cc: safeRecipients(email.cc),
    bcc: safeRecipients(email.bcc),
    subject: requiredString(email.subject, "subject"),
    body_ref: optionalString(email.body_ref, `sha256:${bodyHash(email.body ?? bodyPreview)}`),
    body_preview: bodyPreview.slice(0, 500),
    sent_at: optionalString(email.sent_at ?? email.sentAt, filingTime),
    received_at: optionalString(email.received_at ?? email.receivedAt, filingTime),
    mailbox_ref: optionalString(email.mailbox_ref ?? email.mailbox, "mailbox:outlook:addin"),
    account_ref: optionalString(email.account_ref ?? email.account, "account:outlook:addin"),
    attachment_metadata: Object.freeze(
      attachments.map((attachment) =>
        Object.freeze({
          attachment_id: optionalString(attachment.attachment_id ?? attachment.id, `att:${safeId(attachment.name)}`),
          name: optionalString(attachment.name, "attachment"),
          content_type: optionalString(attachment.content_type ?? attachment.mime_type, "application/octet-stream"),
          size: Number(attachment.size ?? attachment.byte_size ?? bytesForAttachment(attachment).byteLength),
          confidentiality: optionalString(attachment.confidentiality, "internal"),
          sha256: optionalString(attachment.sha256, sha256Hex(bytesForAttachment(attachment))),
          bytes_included: false,
        }),
      ),
    ),
    filing_user: actor_id,
    filing_time: filingTime,
    filing_mode: mode,
    confidentiality: optionalString(email.confidentiality, "internal"),
    privilege: optionalString(email.privilege, "undetermined"),
    ai_processed: false,
    message_ids: Object.freeze([graphMessageId, internetMessageId]),
    raw_body_included: false,
    credential_material_included: false,
  });
}

function appendMatterTimeline({ repository, event } = {}) {
  const existing = repository.get({
    tenant_id: event.tenant_id,
    model_type: "MatterTimelineEvent",
    resource_id: event.event_id,
  });
  if (existing) return existing;
  return repository.create({
    model_type: "MatterTimelineEvent",
    resource_id: event.event_id,
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    matter_id: event.matter_id,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    type: event.type,
    title: event.title,
    source_ref: event.source_ref ?? null,
    source_module: "outlook-addin",
    source_object_id: event.source_object_id ?? null,
    safe_summary: Object.freeze(event.safe_summary ?? {}),
    raw_body_included: false,
    raw_provider_payload_included: false,
  });
}

function appendDmsAudit(repository, event) {
  return repository.appendAudit({
    event_id: event.event_id,
    tenant_id: event.tenant_id,
    actor_id: event.actor_id,
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    decision: "allow",
    reason: event.reason,
    occurred_at: event.occurred_at ?? new Date().toISOString(),
    metadata: {
      ...(event.metadata ?? {}),
      raw_provider_payload_included: false,
      credential_material_included: false,
    },
  });
}

function ensureMatterFolders({ repository, matter, actor_id } = {}) {
  const workspaceId = `workspace:${matter.matter_id}`;
  let workspace = repository.get({ tenant_id: matter.tenant_id, model_type: "DmsWorkspace", workspace_id: workspaceId });
  if (!workspace) {
    workspace = repository.create({
      ...createDmsWorkspace({
        workspace_id: workspaceId,
        tenant_id: matter.tenant_id,
        matter_id: matter.matter_id,
        name: matter.title ?? matter.matter_id,
        status: "active",
        permission_envelope_id: matter.permission_envelope_id ?? "perm:outlook:dms",
        audit_trace_id: matter.audit_trace_id ?? "audit:outlook:dms",
      }),
      model_type: "DmsWorkspace",
    });
  }
  const rootFolderId = workspace.root_folder_id ?? `folder:${workspaceId}:root`;
  if (!repository.get({ tenant_id: matter.tenant_id, model_type: "DmsFolder", folder_id: rootFolderId })) {
    repository.create({
      ...createDmsFolder({
        folder_id: rootFolderId,
        tenant_id: matter.tenant_id,
        matter_id: matter.matter_id,
        workspace_id: workspaceId,
        name: "Root",
        status: "active",
        permission_envelope_id: workspace.permission_envelope_id,
        audit_trace_id: workspace.audit_trace_id,
      }),
      model_type: "DmsFolder",
    });
  }
  const folders = MATTER_FOLDER_NAMES.map((name) => {
    const folderId = `folder:${matter.matter_id}:${name}`;
    const existing = repository.get({ tenant_id: matter.tenant_id, model_type: "DmsFolder", folder_id: folderId });
    if (existing) return existing;
    return repository.create({
      ...createDmsFolder({
        folder_id: folderId,
        tenant_id: matter.tenant_id,
        matter_id: matter.matter_id,
        workspace_id: workspaceId,
        parent_folder_id: rootFolderId,
        name,
        status: "active",
        permission_envelope_id: workspace.permission_envelope_id,
        audit_trace_id: workspace.audit_trace_id,
      }),
      model_type: "DmsFolder",
      created_by: actor_id,
    });
  });
  return Object.freeze({ workspace, root_folder_id: rootFolderId, folders: Object.freeze(folders) });
}

function listMatterTimeline({ repository, tenant_id, matter_id, actor } = {}) {
  const entries = repository.list({ tenant_id, model_type: "MatterTimelineEvent", matter_id });
  return buildMatterTimelineReadModel({ entries, actor, tenant_id, matter_id });
}

function listMatterDocuments({ repository, tenant_id, matter_id } = {}) {
  return Object.freeze(
    repository
      .list({ tenant_id, model_type: "DmsDocument", matter_id })
      .map((document) =>
        Object.freeze({
          document_id: document.document_id,
          matter_id: document.matter_id,
          title: document.title,
          folder_id: document.folder_id ?? null,
          current_version_id: document.current_version_id,
          latest_sha256: document.latest_sha256 ?? null,
          source_email_thread_id: document.source_email_thread_id ?? null,
          source_attachment_id: document.source_attachment_id ?? null,
          document_bytes_included: false,
          storage_pointer_ref_included: false,
          production_ready_claim: false,
        }),
      ),
  );
}

function handleBootstrap({ query, context, requestId }) {
  const tenantId = requiredString(query.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
  const decision = evaluateOutlookPermission({
    context,
    tenant_id: tenantId,
    resource_type: "outlook_addin",
    resource_id: "taskpane",
    action: "outlook:addin:bootstrap",
  });
  if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: query.audit_hint_ref });
  return success(200, {
    request_id: requestId,
    outcome: "passed",
    item: {
      taskpane_loaded: true,
      office_manifest_ready: true,
      office_js_required: true,
      auth_shell: {
        provider: "microsoft_entra_msal_or_session_bridge",
        signed_session_supported: true,
        credential_material_included: false,
      },
      external_receipt_boundary: {
        entra_admin_consent_receipt_present: false,
        outlook_web_smoke_receipt_present: false,
        outlook_new_desktop_smoke_receipt_present: false,
        provider_runtime_executed: false,
        owner_external_receipt_required: true,
      },
      smart_alerts_mode: "warning_only",
      production_ready_claim: false,
    },
  });
}

function handleMatterSearch({ query, context, requestId, runtime }) {
  const tenantId = requiredString(query.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
  const decision = evaluateOutlookPermission({
    context,
    tenant_id: tenantId,
    resource_type: "matter",
    resource_id: "matter_search",
    action: "outlook:matter:search",
  });
  if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: query.audit_hint_ref });
  const search = searchMatters({ repository: runtime.matterRuntime.repository, tenant_id: tenantId, query: query.q ?? query.query, context });
  return success(200, {
    request_id: requestId,
    outcome: "passed",
    items: search.items.slice(0, Number(query.limit ?? DEFAULT_LIMIT)),
    omitted_count: search.omitted_count,
    page_info: { limit: Number(query.limit ?? DEFAULT_LIMIT), has_more: false },
    count_leak_prevented: true,
  });
}

function fileEmail({ body, context, requestId, runtime, mode = "manual" }) {
  const tenantId = requiredString(body.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
  const matterId = requiredString(body.matter_id ?? body.matterId, "matter_id");
  const actorId = actorFrom(context);
  const decision = evaluateOutlookPermission({
    context,
    tenant_id: tenantId,
    matter_id: matterId,
    resource_type: "email_thread",
    resource_id: body.email?.graph_message_id ?? body.email_thread_id ?? "email_thread",
    action: "outlook:email:file",
  });
  if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: body.audit_hint_ref });
  const matter = findMatter({ repository: runtime.matterRuntime.repository, tenant_id: tenantId, matter_id: matterId });
  if (!matter) return errorResponse(404, requestId, [OUTLOOK_ADDIN_ERROR_CODES.matter_not_found]);
  const thread = normalizeEmailThread({ input: body, tenant_id: tenantId, matter_id: matterId, actor_id: actorId, mode });
  const result = fileEmailThreadToMatter({
    repository: runtime.dmsRuntime.repository,
    thread,
    actor_id: actorId,
    audit: {
      append: (event) =>
        appendDmsAudit(runtime.dmsRuntime.repository, {
          ...event,
          event_id: `outlook.email.file:${tenantId}:${thread.email_thread_id}`,
          occurred_at: thread.filing_time,
        }),
    },
  });
  const timelineEvent = appendMatterTimeline({
    repository: runtime.matterRuntime.repository,
    event: {
      event_id: `outlook.email.filed:${tenantId}:${matterId}:${thread.email_thread_id}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: thread.filing_time,
      type: mode === "sent" ? "outlook.email.sent_filed" : "outlook.email.filed",
      title: thread.subject,
      source_ref: thread.email_thread_id,
      source_object_id: thread.email_thread_id,
      safe_summary: {
        graph_message_id: thread.graph_message_id,
        internet_message_id: thread.internet_message_id,
        attachment_count: thread.attachment_metadata.length,
        raw_body_included: false,
      },
    },
  });
  return success(result.outcome === "created" ? 201 : 200, {
    request_id: requestId,
    outcome: result.outcome,
    item: result.thread,
    email_thread: result.thread,
    timeline_event: timelineEvent,
    matter_timeline: listMatterTimeline({
      repository: runtime.matterRuntime.repository,
      tenant_id: tenantId,
      matter_id: matterId,
      actor: context?.principal,
    }),
    idempotent_replay: result.outcome === "idempotent_replay",
    external_send_state: mode === "sent" ? "provider_gated_no_external_send_claim" : "not_applicable",
    email_object_field_contract: OUTLOOK_EMAIL_OBJECT_FIELDS,
  });
}

function saveAttachments({ body, context, requestId, runtime }) {
  const tenantId = requiredString(body.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
  const matterId = requiredString(body.matter_id ?? body.matterId, "matter_id");
  const actorId = actorFrom(context);
  const decision = evaluateOutlookPermission({
    context,
    tenant_id: tenantId,
    matter_id: matterId,
    resource_type: "email_attachment",
    resource_id: body.email_thread_id ?? "attachment_batch",
    action: "outlook:attachment:save",
  });
  if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: body.audit_hint_ref });
  const matter = findMatter({ repository: runtime.matterRuntime.repository, tenant_id: tenantId, matter_id: matterId });
  if (!matter) return errorResponse(404, requestId, [OUTLOOK_ADDIN_ERROR_CODES.matter_not_found]);
  const emailThreadId = requiredString(body.email_thread_id ?? body.emailThreadId, "email_thread_id");
  const thread = runtime.dmsRuntime.repository.get({ tenant_id: tenantId, model_type: "DmsEmailThread", email_thread_id: emailThreadId });
  if (!thread) return errorResponse(404, requestId, [OUTLOOK_ADDIN_ERROR_CODES.email_not_found]);
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  const selected = new Set(Array.isArray(body.selected_attachment_ids) ? body.selected_attachment_ids : attachments.map((item) => item.attachment_id ?? item.id));
  const folderState = ensureMatterFolders({ repository: runtime.dmsRuntime.repository, matter, actor_id: actorId });
  const emailFolder = folderState.folders.find((folder) => folder.name === "00_Email");
  const saved = [];
  const duplicates = [];
  for (const attachment of attachments) {
    const attachmentId = requiredString(attachment.attachment_id ?? attachment.id, "attachment_id");
    if (!selected.has(attachmentId)) continue;
    const bytes = bytesForAttachment(attachment);
    const sha256 = sha256Hex(bytes);
    const duplicate = runtime.dmsRuntime.repository
      .list({ tenant_id: tenantId, model_type: "DmsDocument", matter_id: matterId })
      .find((document) => document.latest_sha256 === sha256);
    if (duplicate) {
      duplicates.push(Object.freeze({ attachment_id: attachmentId, duplicate_document_id: duplicate.document_id, sha256 }));
      continue;
    }
    const documentId = `doc:${safeId(emailThreadId)}:${safeId(attachmentId)}`;
    const versionId = `version:${documentId}:1`;
    const uploaded = uploadDocument({
      repository: runtime.dmsRuntime.repository,
      storage: runtime.dmsRuntime.storage,
      document: {
        document_id: documentId,
        tenant_id: tenantId,
        matter_id: matterId,
        workspace_id: folderState.workspace.workspace_id,
        folder_id: emailFolder.folder_id,
        title: requiredString(attachment.name, "attachment.name"),
        status: "active",
        current_version_id: versionId,
        permission_envelope_id: matter.permission_envelope_id ?? "perm:outlook:attachment",
        audit_trace_id: matter.audit_trace_id ?? "audit:outlook:attachment",
        mime_type: optionalString(attachment.content_type ?? attachment.mime_type, "application/octet-stream"),
        source_email_thread_id: emailThreadId,
        source_attachment_id: attachmentId,
        source_policy: "source_required",
      },
      bytes,
      actor_id: actorId,
      idempotency_key: `outlook-attachment:${emailThreadId}:${attachmentId}:${sha256}`,
    });
    const mappingId = `email-attachment:${emailThreadId}:${attachmentId}`;
    runtime.dmsRuntime.repository.upsert({
      model_type: "DmsEmailAttachmentMapping",
      resource_id: mappingId,
      mapping_id: mappingId,
      tenant_id: tenantId,
      matter_id: matterId,
      email_thread_id: emailThreadId,
      attachment_id: attachmentId,
      document_id: uploaded.document.document_id,
      sha256,
      raw_bytes_included: false,
      storage_pointer_ref_included: false,
    });
    const timelineEvent = appendMatterTimeline({
      repository: runtime.matterRuntime.repository,
      event: {
        event_id: `outlook.attachment.saved:${tenantId}:${matterId}:${documentId}`,
        tenant_id: tenantId,
        matter_id: matterId,
        type: "outlook.attachment.saved",
        title: uploaded.document.title,
        source_ref: uploaded.document.document_id,
        source_object_id: uploaded.document.document_id,
        safe_summary: { email_thread_id: emailThreadId, sha256, folder: "00_Email" },
      },
    });
    saved.push(
      Object.freeze({
        document: uploaded.document,
        version: uploaded.version,
        file_object: serializeFileObjectSafe(uploaded.file_object),
        storage_receipt: uploaded.storage_receipt,
        timeline_event: timelineEvent,
        duplicate_detected: false,
      }),
    );
  }
  return success(201, {
    request_id: requestId,
    outcome: "attachments_saved",
    items: saved,
    duplicate_attachments: Object.freeze(duplicates),
    duplicate_count: duplicates.length,
    folder_structure: MATTER_FOLDER_NAMES,
    documents: listMatterDocuments({ repository: runtime.dmsRuntime.repository, tenant_id: tenantId, matter_id: matterId }),
    document_bytes_included: false,
  });
}

function createFollowup({ body, context, requestId, runtime }) {
  const tenantId = requiredString(body.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
  const matterId = requiredString(body.matter_id ?? body.matterId, "matter_id");
  const actorId = actorFrom(context);
  const kind = body.kind === "deadline" ? "deadline" : "task";
  const decision = evaluateOutlookPermission({
    context,
    tenant_id: tenantId,
    matter_id: matterId,
    resource_type: kind === "deadline" ? "matter_deadline" : "matter_task",
    resource_id: body.source_email_thread_id ?? "outlook_followup",
    action: "outlook:followup:create",
  });
  if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: body.audit_hint_ref });
  const service = createMatterActivityCalendarChannelService({ repository: runtime.matterRuntime.repository });
  const result =
    kind === "deadline"
      ? service.createCalendarEvent({
          tenant_id: tenantId,
          matter_id: matterId,
          actor_id: actorId,
          event: {
            event_id: optionalString(body.event_id, `deadline_${safeId(body.source_email_thread_id ?? requestId)}`),
            title: requiredString(body.title, "title"),
            starts_at: requiredString(body.due_at ?? body.starts_at, "due_at"),
            criticality: body.criticality ?? "standard",
            legal_consequence: body.legal_consequence ?? "internal",
            reminder_rule: body.reminder_rule ?? "none",
          },
        })
      : service.createActivity({
          tenant_id: tenantId,
          matter_id: matterId,
          actor_id: actorId,
          activity: {
            activity_id: optionalString(body.task_id, `task_${safeId(body.source_email_thread_id ?? requestId)}`),
            activity_type: "task",
            title: requiredString(body.title, "title"),
            due_at: body.due_at ?? null,
            assigned_to: body.assigned_to ?? actorId,
            status: "todo",
          },
        });
  return success(201, {
    request_id: requestId,
    outcome: "created",
    kind,
    item: result.item,
    audit_event: result.audit_event,
    timeline_event: result.timeline_event,
    auto_created_without_lawyer_approval: false,
  });
}

function evaluateSmartAlerts({ body, requestId }) {
  const message = body.message ?? body.email ?? body;
  const recipients = safeRecipients(message.to);
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const bodyText = String(message.body_preview ?? message.body ?? "").toLowerCase();
  const warnings = [];
  if (
    recipients.some((recipient) => recipient.external === true) &&
    attachments.some((attachment) => ["highly_confidential", "confidential"].includes(attachment.confidentiality ?? attachment.sensitivity))
  ) {
    warnings.push({
      warning_id: "external-recipient-confidential-attachment",
      severity: "warning",
      title: "외부 수신자와 기밀 첨부",
      send_blocked: false,
    });
  }
  if (/(첨부|attachment|attached|붙임)/i.test(bodyText) && attachments.length === 0) {
    warnings.push({
      warning_id: "missing-mentioned-attachment",
      severity: "warning",
      title: "첨부 언급 후 첨부 없음",
      send_blocked: false,
    });
  }
  return success(200, {
    request_id: requestId,
    outcome: "evaluated",
    item: {
      mode: "on_message_send_warning_only",
      warnings,
      warning_count: warnings.length,
      send_blocked: false,
      provider_runtime_executed: false,
      production_ready_claim: false,
    },
  });
}

function routeMatch(pathname, pattern) {
  return pathname.match(pattern);
}

export function handleOutlookAddinApiRequest({ pathname, method, query = {}, body = {}, context, requestId, runtime } = {}) {
  try {
    if (pathname === "/api/outlook/bootstrap" && method === "GET") {
      return handleBootstrap({ query, context, requestId });
    }
    if (pathname === "/api/outlook/matters" && method === "GET") {
      return handleMatterSearch({ query, context, requestId, runtime });
    }
    const timelineMatch = routeMatch(pathname, /^\/api\/outlook\/matters\/([^/]+)\/timeline$/);
    if (timelineMatch && method === "GET") {
      const matterId = decodeURIComponent(timelineMatch[1]);
      const tenantId = requiredString(query.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
      const decision = evaluateOutlookPermission({
        context,
        tenant_id: tenantId,
        matter_id: matterId,
        resource_type: "matter_timeline",
        resource_id: matterId,
        action: "outlook:matter:read",
      });
      if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: query.audit_hint_ref });
      return success(200, {
        request_id: requestId,
        outcome: "passed",
        item: listMatterTimeline({
          repository: runtime.matterRuntime.repository,
          tenant_id: tenantId,
          matter_id: matterId,
          actor: context?.principal,
        }),
      });
    }
    const documentsMatch = routeMatch(pathname, /^\/api\/outlook\/matters\/([^/]+)\/documents$/);
    if (documentsMatch && method === "GET") {
      const matterId = decodeURIComponent(documentsMatch[1]);
      const tenantId = requiredString(query.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
      const decision = evaluateOutlookPermission({
        context,
        tenant_id: tenantId,
        matter_id: matterId,
        resource_type: "dms_document",
        resource_id: matterId,
        action: "outlook:document:read",
      });
      if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: query.audit_hint_ref });
      return success(200, {
        request_id: requestId,
        outcome: "passed",
        items: listMatterDocuments({ repository: runtime.dmsRuntime.repository, tenant_id: tenantId, matter_id: matterId }),
        document_bytes_included: false,
      });
    }
    if (pathname === "/api/outlook/email/file" && method === "POST") {
      return fileEmail({ body, context, requestId, runtime, mode: "manual" });
    }
    if (pathname === "/api/outlook/sent/file" && method === "POST") {
      return fileEmail({ body, context, requestId, runtime, mode: "sent" });
    }
    if (pathname === "/api/outlook/attachments/save" && method === "POST") {
      return saveAttachments({ body, context, requestId, runtime });
    }
    if (pathname === "/api/outlook/followups" && method === "POST") {
      return createFollowup({ body, context, requestId, runtime });
    }
    if (pathname === "/api/outlook/smart-alerts/evaluate" && method === "POST") {
      return evaluateSmartAlerts({ body, requestId });
    }
    return errorResponse(404, requestId, ["OUTLOOK_ADDIN_NOT_FOUND"]);
  } catch (error) {
    return errorResponse(400, requestId, [OUTLOOK_ADDIN_ERROR_CODES.validation_error], { message: error.message });
  }
}

export function outlookAddinProofSnapshot({ runtime, tenant_id, matter_id } = {}) {
  return Object.freeze({
    email_threads: runtime.dmsRuntime.repository.list({ tenant_id, model_type: "DmsEmailThread", matter_id }).map(clone),
    documents: listMatterDocuments({ repository: runtime.dmsRuntime.repository, tenant_id, matter_id }).map(clone),
    timeline: listMatterTimeline({ repository: runtime.matterRuntime.repository, tenant_id, matter_id }).visible_entries.map(clone),
    folder_structure: MATTER_FOLDER_NAMES,
    email_object_field_contract: OUTLOOK_EMAIL_OBJECT_FIELDS,
  });
}
