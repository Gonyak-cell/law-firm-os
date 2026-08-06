import { createHash, timingSafeEqual } from "node:crypto";
import { fileEmailThreadToMatter } from "../../../packages/email-dms/src/email-filing-service.js";
import {
  createEmailThread,
  OUTLOOK_EMAIL_OBJECT_FIELDS,
} from "../../../packages/email-dms/src/email-model.js";
import {
  M365_GRAPH_CALLBACK_MODES,
  M365_GRAPH_ERROR_CODES,
  createM365GraphConnectionService,
} from "../../../packages/email-dms/src/m365-graph-connection-service.js";
import { createM365MailPort } from "../../../packages/email-dms/src/m365-graph-ports.js";
import {
  createSafeInquiryDisplayCopy,
  createInquiryEvidenceStorageService,
  INQUIRY_EVIDENCE_STORAGE_ERROR_CODES,
} from "../../../packages/email-dms/src/inquiry-evidence-storage-service.js";
import {
  createOutlookInquiryRegistrationService,
} from "./outlook-inquiry-registration-service.js";
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
    "GET /api/outlook/connection",
    "POST /api/outlook/connection/authorize",
    "POST /api/outlook/connection/complete",
    "DELETE /api/outlook/connection",
    "GET /api/outlook/inquiries",
    "POST /api/outlook/inquiries",
    "POST /api/outlook/inquiries/message/resolve",
    "GET /api/outlook/inquiries/evidence/:evidence_id/content",
    "GET /api/outlook/matters",
    "GET /api/outlook/matters/:matter_id/timeline",
    "GET /api/outlook/matters/:matter_id/documents",
    "POST /api/outlook/email/file",
    "POST /api/outlook/sent/file",
    "POST /api/outlook/attachments/save",
    "POST /api/outlook/followups",
    "POST /api/outlook/smart-alerts/evaluate",
  ]),
  data_source:
    "matter_runtime_repository+dms_runtime_repository+email_dms_runtime_repository",
  runtime_persistence: "file_or_postgres_domain_repositories",
  runtime_write_ready: true,
  m365_provider_runtime_enabled: false,
  entra_admin_consent_receipt_required: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const OUTLOOK_ADDIN_ERROR_CODES = Object.freeze({
  connection_validation_error: "M365_CONNECTION_VALIDATION_ERROR",
  tenant_required: "OUTLOOK_ADDIN_TENANT_REQUIRED",
  permission_required: "OUTLOOK_ADDIN_PERMISSION_REQUIRED",
  validation_error: "OUTLOOK_ADDIN_VALIDATION_ERROR",
  attachment_provenance_mismatch: "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH",
  email_identity_conflict: "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT",
  sent_message_provenance_mismatch: "OUTLOOK_ADDIN_SENT_MESSAGE_PROVENANCE_MISMATCH",
  matter_not_found: "OUTLOOK_ADDIN_MATTER_NOT_FOUND",
  email_not_found: "OUTLOOK_ADDIN_EMAIL_NOT_FOUND",
});
export const OUTLOOK_ADDIN_MAX_MIME_BYTES = 3 * 1024 * 1024;
export const OUTLOOK_ADDIN_MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

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

function bytesForAttachment(attachment = {}, { required = true } = {}) {
  let bytes = null;
  if (typeof attachment.content_base64 === "string" && attachment.content_base64.trim()) {
    const encoded = attachment.content_base64.replace(/\s+/gu, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/u.test(encoded) || encoded.length % 4 !== 0) {
      throw new TypeError("attachment.content_base64 must be valid base64");
    }
    bytes = Buffer.from(encoded, "base64");
    if (bytes.toString("base64").replace(/=+$/u, "") !== encoded.replace(/=+$/u, "")) {
      throw new TypeError("attachment.content_base64 must be valid base64");
    }
  } else if (typeof attachment.content_text === "string") {
    bytes = Buffer.from(attachment.content_text);
  }
  if (!bytes) {
    if (required) throw new TypeError("attachment bytes are required");
    return null;
  }
  if (bytes.byteLength > OUTLOOK_ADDIN_MAX_ATTACHMENT_BYTES) {
    throw new TypeError("attachment bytes must not exceed 2 MiB");
  }
  return bytes;
}

function attachmentMetadata(attachment = {}) {
  const bytes = bytesForAttachment(attachment, { required: false });
  const declaredSize = Number(attachment.size ?? attachment.byte_size);
  const size = bytes?.byteLength
    ?? (Number.isSafeInteger(declaredSize) && declaredSize >= 0 ? declaredSize : null);
  const declaredSha256 = optionalString(attachment.sha256)?.toLowerCase() ?? null;
  return Object.freeze({
    attachment_id: optionalString(attachment.attachment_id ?? attachment.id, `att:${safeId(attachment.name)}`),
    name: optionalString(attachment.name, "attachment"),
    content_type: optionalString(attachment.content_type ?? attachment.mime_type, "application/octet-stream"),
    size,
    confidentiality: optionalString(attachment.confidentiality, "internal"),
    sha256: bytes
      ? sha256Hex(bytes)
      : (/^[a-f0-9]{64}$/u.test(declaredSha256 ?? "") ? declaredSha256 : null),
    bytes_included: false,
  });
}

function attachmentProvenanceError(message, status = 409) {
  return Object.assign(new Error(message), {
    safe_error_code: OUTLOOK_ADDIN_ERROR_CODES.attachment_provenance_mismatch,
    status,
  });
}

function emailIdentityConflictError(message) {
  return Object.assign(new Error(message), {
    safe_error_code: OUTLOOK_ADDIN_ERROR_CODES.email_identity_conflict,
    status: 409,
  });
}

function sentMessageProvenanceError(message) {
  return Object.assign(new Error(message), {
    safe_error_code: OUTLOOK_ADDIN_ERROR_CODES.sent_message_provenance_mismatch,
    status: 409,
  });
}

function normalizedAttachmentName(value) {
  return requiredString(value, "attachment.name")
    .normalize("NFKC")
    .replace(/\s+/gu, " ");
}

function normalizedMessageIdentity(value, field) {
  return requiredString(value, field).normalize("NFKC").toLowerCase();
}

function normalizedOpaqueIdentity(value, field) {
  return requiredString(value, field).normalize("NFKC");
}

function digestMatches(expected, actual) {
  if (!/^[a-f0-9]{64}$/u.test(expected) || !/^[a-f0-9]{64}$/u.test(actual)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
}

function canonicalEmailThreadId({ tenantId, immutableMessageId, internetMessageId }) {
  return `thread:${sha256Hex(JSON.stringify([
    tenantId,
    normalizedOpaqueIdentity(immutableMessageId, "provider.immutable_message_id"),
    normalizedMessageIdentity(internetMessageId, "provider.internet_message_id"),
  ]))}`;
}

function safeStorageReceipt(receipt = {}) {
  const {
    storage_pointer_ref: _storagePointerRef,
    raw_path: _rawPath,
    local_path: _localPath,
    ...safe
  } = receipt ?? {};
  return Object.freeze({
    ...safe,
    storage_pointer_ref_included: false,
    raw_path_exposed: false,
  });
}

async function resolveCanonicalMessage({ thread, context, runtime }) {
  const result = await m365MailPort(runtime).getOwnMessageMime({
    ...m365Principal(context, thread.tenant_id),
    rest_message_id: thread.graph_message_id,
  });
  const mimeBytes = Buffer.from(result.mime_bytes);
  if (mimeBytes.byteLength > OUTLOOK_ADDIN_MAX_MIME_BYTES) {
    throw attachmentProvenanceError(
      "Microsoft Graph MIME exceeds the 3 MiB Outlook filing limit",
      413,
    );
  }
  const metadata = result.message_metadata ?? {};
  if (
    normalizedMessageIdentity(
      result.internet_message_id ?? metadata.internet_message_id,
      "provider.internet_message_id",
    ) !== normalizedMessageIdentity(thread.internet_message_id, "internet_message_id")
    || normalizedOpaqueIdentity(
      metadata.conversation_id,
      "provider.conversation_id",
    ) !== normalizedOpaqueIdentity(thread.conversation_id, "conversation_id")
    || requiredString(metadata.subject, "provider.subject").normalize("NFKC")
      !== thread.subject.normalize("NFKC")
  ) {
    throw attachmentProvenanceError("Microsoft Graph message identity does not match the filed Outlook email");
  }
  const canonicalInternetMessageId = requiredString(
    result.internet_message_id ?? metadata.internet_message_id,
    "provider.internet_message_id",
  );
  const immutableMessageId = requiredString(
    result.immutable_message_id,
    "provider.immutable_message_id",
  );
  const canonicalAttachments = createSafeInquiryDisplayCopy({
    mime_bytes: mimeBytes,
    message_metadata: metadata,
    max_display_bytes: 1,
  }).attachment_manifest;
  const canonicalAttachmentBytes = canonicalAttachments.reduce(
    (total, attachment) => total + Number(attachment.byte_size ?? 0),
    0,
  );
  if (canonicalAttachmentBytes > OUTLOOK_ADDIN_MAX_ATTACHMENT_BYTES) {
    throw attachmentProvenanceError(
      "Microsoft Graph attachments exceed the 2 MiB Outlook filing limit",
      413,
    );
  }
  if (canonicalAttachments.length !== thread.attachment_metadata.length) {
    throw attachmentProvenanceError(
      "Outlook attachment list does not reconcile with the complete Microsoft Graph MIME manifest",
    );
  }
  const usedCanonicalIndexes = new Set();
  const messageRef = sha256Hex(immutableMessageId);
  const providerRequestRef = result.provider_request_id
    ? sha256Hex(result.provider_request_id)
    : null;
  const attachmentMetadata = thread.attachment_metadata.map((sourceAttachment) => {
    const sourceName = normalizedAttachmentName(sourceAttachment.name);
    let matches = canonicalAttachments
      .map((attachment, index) => ({ attachment, index }))
      .filter(({ attachment, index }) => (
        !usedCanonicalIndexes.has(index)
        && normalizedAttachmentName(attachment.file_name) === sourceName
      ));
    if (Number.isSafeInteger(sourceAttachment.size) && sourceAttachment.size >= 0) {
      matches = matches.filter(({ attachment }) => attachment.byte_size === sourceAttachment.size);
    }
    if (/^[a-f0-9]{64}$/u.test(sourceAttachment.sha256 ?? "")) {
      matches = matches.filter(({ attachment }) => digestMatches(attachment.sha256, sourceAttachment.sha256));
    }
    if (matches.length === 0) {
      throw attachmentProvenanceError("Outlook attachment metadata does not match Microsoft Graph MIME");
    }
    const [{ attachment: canonical, index }] = matches;
    if (
      !Number.isSafeInteger(canonical.byte_size)
      || canonical.byte_size < 0
      || canonical.byte_size > OUTLOOK_ADDIN_MAX_ATTACHMENT_BYTES
      || !/^[a-f0-9]{64}$/u.test(canonical.sha256)
    ) {
      throw attachmentProvenanceError("Microsoft Graph attachment provenance is invalid or exceeds 2 MiB");
    }
    usedCanonicalIndexes.add(index);
    return Object.freeze({
      ...sourceAttachment,
      name: canonical.file_name,
      content_type: canonical.mime_type,
      size: canonical.byte_size,
      sha256: canonical.sha256,
      source_provenance: Object.freeze({
        authority: "microsoft_graph_mime",
        sha256: canonical.sha256,
        byte_size: canonical.byte_size,
        message_ref: messageRef,
        provider_request_ref: providerRequestRef,
        occurrence: index,
        raw_bytes_included: false,
      }),
    });
  });
  if (usedCanonicalIndexes.size !== canonicalAttachments.length) {
    throw attachmentProvenanceError(
      "Outlook attachment list does not cover the complete Microsoft Graph MIME manifest",
    );
  }
  const emailThreadId = canonicalEmailThreadId({
    tenantId: thread.tenant_id,
    immutableMessageId,
    internetMessageId: canonicalInternetMessageId,
  });
  const internalEmailDomain = emailDomain(result.mailbox_address);
  const canonicalRecipients = (recipientType) => safeRecipients(
    (Array.isArray(metadata.recipients) ? metadata.recipients : [])
      .filter((recipient) => recipient.recipient_type === recipientType),
    { internalEmailDomain },
  );
  return Object.freeze({
    thread: Object.freeze({
      ...thread,
      email_thread_id: emailThreadId,
      email_id: `email:${safeId(immutableMessageId)}`,
      graph_message_id: immutableMessageId,
      internet_message_id: canonicalInternetMessageId,
      conversation_id: requiredString(metadata.conversation_id, "provider.conversation_id"),
      message_ids: Object.freeze([immutableMessageId, canonicalInternetMessageId]),
      from: metadata.from
        ? safePerson(metadata.from, { internalEmailDomain })
        : Object.freeze({}),
      to: canonicalRecipients("to"),
      cc: canonicalRecipients("cc"),
      bcc: canonicalRecipients("bcc"),
      attachment_metadata: Object.freeze(attachmentMetadata),
    }),
    mime_bytes: mimeBytes,
    mime_sha256: sha256Hex(mimeBytes),
    mailbox_address: result.mailbox_address,
    sender_address: metadata.sender?.address ?? null,
    from_address: metadata.from?.address ?? null,
    is_in_sent_items: metadata.is_in_sent_items,
    is_draft: metadata.is_draft,
  });
}

async function originalMimeDocumentState({ runtime, tenantId, documentId }) {
  if (typeof runtime.dmsRuntime.upload_runtime?.getDocumentState === "function") {
    return await runtime.dmsRuntime.upload_runtime.getDocumentState({
      tenant_id: tenantId,
      document_id: documentId,
    });
  }
  const document = runtime.dmsRuntime.repository.get({
    tenant_id: tenantId,
    model_type: "DmsDocument",
    document_id: documentId,
  });
  if (!document) return null;
  const version = runtime.dmsRuntime.repository.get({
    tenant_id: tenantId,
    model_type: "DmsDocumentVersion",
    version_id: document.current_version_id,
  });
  return Object.freeze({ document, versions: Object.freeze(version ? [version] : []) });
}

const OUTLOOK_ORIGINAL_MIME_INTENT_WINDOW_MS = 60 * 60 * 1_000;

function phasedOriginalMimeUploadRuntime(runtime) {
  const uploadRuntime = runtime.dmsRuntime.upload_runtime;
  if (!uploadRuntime) return null;
  const phasedMethods = [
    "createUploadSession",
    "finalizeUpload",
    "getDocumentState",
    "resolveUploadIntentGeneration",
    "rolloverExpiredUploadIntent",
    "getUploadSession",
    "stageUpload",
  ];
  if (phasedMethods.every((method) => typeof uploadRuntime[method] === "function")) {
    return uploadRuntime;
  }
  throw Object.assign(
    new Error("Outlook original MIME requires the phased durable upload runtime"),
    { safe_error_code: "DMS_UPLOAD_RUNTIME_INVALID", status: 503 },
  );
}

function assertOriginalMimeUploadIntent(session, expected) {
  const expiresAt = Date.parse(session?.expires_at);
  if (
    session?.tenant_id !== expected.tenant_id
    || session?.session_id !== expected.session_id
    || session?.idempotency_key !== expected.idempotency_key
    || session?.matter_id !== expected.matter_id
    || session?.workspace_id !== expected.workspace_id
    || session?.document_id !== expected.document_id
    || session?.version_id !== expected.version_id
    || Number(session?.version_number) !== 1
    || session?.object_id !== expected.object_id
    || session?.title !== expected.title
    || session?.content_type !== "message/rfc822"
    || session?.expected_sha256 !== expected.expected_sha256
    || Number(session?.expected_byte_size) !== expected.expected_byte_size
    || session?.permission_envelope_id !== expected.permission_envelope_id
    || session?.audit_trace_id !== expected.audit_trace_id
    || session?.actor_id !== expected.actor_id
    || (expected.expires_at && session?.expires_at !== expected.expires_at)
    || !Number.isFinite(expiresAt)
  ) {
    throw emailIdentityConflictError(
      "Durable Outlook MIME upload intent conflicts with the canonical message",
    );
  }
  return session;
}

async function ensureOriginalMimeUploadIntent({
  uploadRuntime,
  document,
  bytes,
  actorId,
  sourceIdentity,
  now = new Date(),
} = {}) {
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) throw new TypeError("Outlook MIME upload intent clock is invalid");
  const currentWindow = Math.floor(nowMs / OUTLOOK_ORIGINAL_MIME_INTENT_WINDOW_MS);
  const nextExpiresAt = () => new Date(
    (currentWindow + 25) * OUTLOOK_ORIGINAL_MIME_INTENT_WINDOW_MS,
  ).toISOString();
  const mimeSha256 = sha256Hex(bytes);
  const familyId = `outlook-mime:${sha256Hex(JSON.stringify([
    document.tenant_id,
    requiredString(sourceIdentity?.graph_message_id, "sourceIdentity.graph_message_id"),
    requiredString(sourceIdentity?.internet_message_id, "sourceIdentity.internet_message_id")
      .normalize("NFKC")
      .toLowerCase(),
    mimeSha256,
  ]))}`;
  const identityHash = sha256Hex(JSON.stringify([
    document.tenant_id,
    document.matter_id,
    document.workspace_id,
    document.document_id,
    requiredString(sourceIdentity?.graph_message_id, "sourceIdentity.graph_message_id")
      .normalize("NFKC"),
    requiredString(sourceIdentity?.internet_message_id, "sourceIdentity.internet_message_id")
      .normalize("NFKC")
      .toLowerCase(),
    requiredString(sourceIdentity?.conversation_id, "sourceIdentity.conversation_id")
      .normalize("NFKC"),
    mimeSha256,
    bytes.byteLength,
    document.title,
    actorId,
    document.permission_envelope_id,
    document.audit_trace_id,
  ]));
  let generation = await uploadRuntime.resolveUploadIntentGeneration({
    tenant_id: document.tenant_id,
    family_id: familyId,
    document_id: document.document_id,
    identity_hash: identityHash,
  });
  const expectedForGeneration = (resolved) => Object.freeze({
    tenant_id: document.tenant_id,
    session_id: resolved.session_id,
    idempotency_key: resolved.idempotency_key,
    matter_id: document.matter_id,
    workspace_id: document.workspace_id,
    document_id: document.document_id,
    version_id: resolved.version_id,
    object_id: resolved.object_id,
    title: document.title,
    expected_sha256: mimeSha256,
    expected_byte_size: bytes.byteLength,
    permission_envelope_id: document.permission_envelope_id,
    audit_trace_id: document.audit_trace_id,
    actor_id: actorId,
  });
  let expected = expectedForGeneration(generation);
  let session;
  try {
    session = await uploadRuntime.getUploadSession({
      tenant_id: expected.tenant_id,
      session_id: expected.session_id,
    });
  } catch (error) {
    if (
      error?.safe_error_code !== "DMS_UPLOAD_SESSION_NOT_FOUND"
      && error?.code !== "LAWOS_DMS_UPLOAD_SESSION_NOT_FOUND"
    ) {
      throw error;
    }
  }
  if (session) {
    session = assertOriginalMimeUploadIntent(session, expected);
    if (
      ["expired", "failed_terminal"].includes(session.state)
      || Date.parse(session.expires_at) <= nowMs
    ) {
      if (session.state === "failed_terminal" || !session.orphan_deleted_at) {
        throw Object.assign(new Error("Durable Outlook MIME upload intent is awaiting safe cleanup"), {
          code: "LAWOS_DMS_UPLOAD_SESSION_EXPIRED",
          safe_error_code: "DMS_UPLOAD_SESSION_EXPIRED",
          status: 409,
        });
      }
      const rollover = await uploadRuntime.rolloverExpiredUploadIntent({
        tenant_id: expected.tenant_id,
        family_id: familyId,
        identity_hash: identityHash,
        session_id: session.session_id,
        expected,
      });
      generation = await uploadRuntime.resolveUploadIntentGeneration({
        tenant_id: document.tenant_id,
        family_id: familyId,
        document_id: document.document_id,
        identity_hash: identityHash,
      });
      if (
        generation.generation !== rollover.next_generation
        || generation.session_id !== rollover.next_session_id
        || generation.idempotency_key !== rollover.next_idempotency_key
        || generation.version_id !== rollover.next_version_id
        || generation.object_id !== rollover.next_object_id
      ) {
        throw emailIdentityConflictError(
          "Durable Outlook MIME upload intent rollover did not converge",
        );
      }
      expected = expectedForGeneration(generation);
      session = null;
    }
  }
  if (!session) {
    const expiresAt = nextExpiresAt();
    const created = await uploadRuntime.createUploadSession({
      ...expected,
      version_number: 1,
      content_type: "message/rfc822",
      expires_at: expiresAt,
      initial_next_attempt_at: expiresAt,
    });
    session = assertOriginalMimeUploadIntent(created?.session, {
      ...expected,
      expires_at: expiresAt,
    });
  }
  document.current_version_id = session.version_id;
  return Object.freeze({
    session,
    expected,
    family_id: familyId,
    identity_hash: identityHash,
    generation: generation.generation,
  });
}

function assertOriginalMimeDocument(state, {
  tenantId,
  matterId,
  workspaceId,
  folderId,
  documentId,
  permissionEnvelopeId,
  auditTraceId,
  mimeSha256,
}) {
  const document = state?.document;
  const version = state?.versions?.find((item) => item.version_id === document?.current_version_id)
    ?? state?.version;
  if (
    document?.tenant_id !== tenantId
    || document?.matter_id !== matterId
    || (workspaceId && document?.workspace_id !== workspaceId)
    || (folderId && document?.folder_id !== undefined && document?.folder_id !== folderId)
    || document?.document_id !== documentId
    || (permissionEnvelopeId && document?.permission_envelope_id !== permissionEnvelopeId)
    || (auditTraceId && document?.audit_trace_id !== auditTraceId)
    || (document.latest_sha256 ?? version?.sha256) !== mimeSha256
  ) {
    throw emailIdentityConflictError("Stored original Outlook MIME does not match the canonical message");
  }
}

function verifySourceAttachmentBytes(sourceAttachment, bytes) {
  const provenance = sourceAttachment?.source_provenance;
  if (
    provenance?.authority !== "microsoft_graph_mime"
    || !Number.isSafeInteger(provenance.byte_size)
    || provenance.byte_size < 0
    || !/^[a-f0-9]{64}$/u.test(provenance.sha256 ?? "")
  ) {
    throw attachmentProvenanceError("Filed Outlook attachment has no server-verified source provenance");
  }
  const sha256 = sha256Hex(bytes);
  if (bytes.byteLength !== provenance.byte_size || !digestMatches(provenance.sha256, sha256)) {
    throw attachmentProvenanceError("Attachment bytes do not match the server-verified Outlook source");
  }
  return sha256;
}

function emailDomain(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  const separator = normalized.lastIndexOf("@");
  return separator > 0 && separator < normalized.length - 1
    ? normalized.slice(separator + 1)
    : null;
}

function safePerson(value = {}, { internalEmailDomain = null } = {}) {
  const isExternal = (email) => {
    const domain = emailDomain(email);
    return domain !== null && internalEmailDomain !== null && domain !== internalEmailDomain;
  };
  if (typeof value === "string") return Object.freeze({ display_name: null, address_ref: value, external: isExternal(value) });
  return Object.freeze({
    display_name: optionalString(value.display_name ?? value.name),
    address_ref: optionalString(value.address_ref ?? value.email ?? value.address, "unknown"),
    external: value.external === true || isExternal(value.email ?? value.address_ref ?? value.address),
  });
}

function safeRecipients(value, options) {
  return Object.freeze((Array.isArray(value) ? value : []).map((person) => safePerson(person, options)));
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

function permissionContextForResource(context, resourceId) {
  return {
    ...context,
    object_acl: (context?.object_acl ?? []).filter((entry) => (
      entry.resource_id === undefined
      || (resourceId !== null && entry.resource_id === resourceId)
    )),
  };
}

function inquiryEvidenceNotFoundResponse({ requestId, auditHintRef }) {
  return errorResponse(
    404,
    requestId,
    [INQUIRY_EVIDENCE_STORAGE_ERROR_CODES.not_found],
    {
      audit_hint_ref: auditHintRef,
      ui_state: "empty",
    },
  );
}

function m365Principal(context, requestedTenantId) {
  const principal = context?.principal ?? {};
  const tenantId = requiredString(principal.tenant_id, "principal.tenant_id");
  if (
    requestedTenantId
    && requiredString(requestedTenantId, "tenant_id") !== tenantId
  ) {
    throw Object.assign(
      new Error("M365 connection tenant must match the signed session"),
      {
        safe_error_code: "M365_CONNECTION_TENANT_MISMATCH",
        status: 403,
      },
    );
  }
  return Object.freeze({
    tenant_id: tenantId,
    user_id: requiredString(principal.user_id, "principal.user_id"),
    entra_subject_id: principal.entra_subject_id,
  });
}

function m365RouteGate({
  context,
  principal,
  requestId,
  action,
  auditHintRef,
}) {
  const decision = evaluateOutlookPermission({
    context,
    tenant_id: principal.tenant_id,
    resource_type: "m365_connection",
    resource_id: principal.user_id,
    action,
  });
  return decision.effect === "allow"
    ? null
    : permissionDeniedResponse({
      requestId,
      decision,
      auditHintRef,
    });
}

function m365Service(runtime) {
  return createM365GraphConnectionService({
    repository: runtime?.emailDmsRuntime?.repository,
    ...(runtime?.m365GraphConfig ?? {}),
    request_failure_compensator:
      runtime?.emailDmsRuntime?.request_failure_compensator,
  });
}

function m365MailPort(runtime) {
  return createM365MailPort({
    repository: runtime?.emailDmsRuntime?.repository,
    ...(runtime?.m365GraphConfig ?? {}),
  });
}

function inquiryEvidenceStorageService(runtime) {
  if (
    typeof runtime?.emailDmsRuntime?.evidence_storage_service
      ?.readEvidenceContent === "function"
  ) {
    return runtime.emailDmsRuntime.evidence_storage_service;
  }
  return createInquiryEvidenceStorageService({
    repository: runtime?.emailDmsRuntime?.repository,
    storage: runtime?.emailDmsRuntime?.storage,
    ...(runtime?.emailDmsRuntime?.evidence_storage_config ?? {}),
  });
}

function inquiryRegistrationService(runtime) {
  if (
    typeof runtime?.emailDmsRuntime?.inquiry_registration_service
      ?.register === "function"
  ) {
    return runtime.emailDmsRuntime.inquiry_registration_service;
  }
  return createOutlookInquiryRegistrationService({
    emailDmsRepository: runtime?.emailDmsRuntime?.repository,
    masterDataRepository:
      runtime?.crmIntakeRuntime?.masterDataRepository,
    crmRepository: runtime?.crmIntakeRuntime?.crmRepository,
    mailPort: m365MailPort(runtime),
    evidenceStorageService: inquiryEvidenceStorageService(runtime),
    clock: runtime?.m365GraphConfig?.clock,
  });
}

function m365ErrorResponse(error, requestId, auditHintRef) {
  const safeCode = typeof error?.safe_error_code === "string"
    && /^[A-Z0-9_]+$/u.test(error.safe_error_code)
    ? error.safe_error_code
    : OUTLOOK_ADDIN_ERROR_CODES.connection_validation_error;
  return errorResponse(error?.status ?? 400, requestId, [safeCode], {
    audit_hint_ref: auditHintRef,
    ui_state: "blocked",
    credential_material_included: false,
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

function inquirySummary(record = {}) {
  return Object.freeze({
    lead_id: record.lead_id,
    party_id: record.party_id,
    display_name: record.display_name ?? "이름 없는 문의",
    status: record.status,
    inquiry_status: record.inquiry_status,
    source: record.source,
    received_at: record.received_at,
    production_ready_claim: false,
  });
}

function searchLinkableInquiries({
  repository,
  tenant_id,
  query = "",
  context,
} = {}) {
  const needle = String(query ?? "").trim().toLowerCase();
  const records = repository
    .list({ tenant_id, model_type: "Lead" })
    .filter((lead) => (
      lead.party_id
      && ["draft", "active", "review_required"]
        .includes(lead.status)
    ))
    .filter((lead) => (
      !needle
      || [lead.lead_id, lead.display_name]
        .filter(Boolean)
        .some((value) => (
          String(value).toLowerCase().includes(needle)
        ))
    ))
    .sort((left, right) => (
      String(right.received_at ?? "")
        .localeCompare(String(left.received_at ?? ""))
    ));
  const { allowed, omittedCount } = trimItemsByPermission({
    context,
    items: records.map((record) => ({
      ...record,
      resource_id: record.lead_id,
    })),
    action: "crm:inquiry:read",
    resourceType: "crm_inquiry",
  });
  return Object.freeze({
    items: Object.freeze(allowed.map(inquirySummary)),
    omitted_count: omittedCount,
    count_leak_prevented: true,
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
  const internetMessageId = requiredString(email.internet_message_id ?? email.internetMessageId, "internet_message_id");
  const conversationId = requiredString(email.conversation_id ?? email.conversationId, "conversation_id");
  const emailThreadId = `thread:${sha256Hex(JSON.stringify([
    tenant_id,
    graphMessageId.normalize("NFKC"),
    internetMessageId.normalize("NFKC").toLowerCase(),
  ]))}`;
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
    attachment_metadata: Object.freeze(attachments.map(attachmentMetadata)),
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

function matterDmsAuthority({ matter } = {}) {
  const workspaceId = `workspace:${matter.matter_id}`;
  const rootFolderId = `folder:${workspaceId}:root`;
  const permissionEnvelopeId = matter.permission_envelope_id ?? "perm:outlook:dms";
  const auditTraceId = matter.audit_trace_id ?? "audit:outlook:dms";
  const folders = Object.freeze(MATTER_FOLDER_NAMES.map((name) => Object.freeze({
    folder_id: `folder:${matter.matter_id}:${name}`,
    name,
    parent_folder_id: rootFolderId,
  })));
  return Object.freeze({
    tenant_id: matter.tenant_id,
    matter_id: matter.matter_id,
    workspace_id: workspaceId,
    root_folder_id: rootFolderId,
    email_folder_id: folders.find((folder) => folder.name === "00_Email").folder_id,
    permission_envelope_id: permissionEnvelopeId,
    audit_trace_id: auditTraceId,
    folders,
  });
}

function assertMatterDmsAuthorityRecord(record, expected, {
  kind,
  idField,
  id,
  name,
  parentFolderId,
  requireFolderId = false,
} = {}) {
  if (!record) return null;
  if (
    record.tenant_id !== expected.tenant_id
    || record.matter_id !== expected.matter_id
    || record.workspace_id !== expected.workspace_id
    || record.permission_envelope_id !== expected.permission_envelope_id
    || record.audit_trace_id !== expected.audit_trace_id
    || (idField && id !== undefined && record[idField] !== id)
    || (name !== undefined && record.name !== name)
    || (parentFolderId !== undefined && record.parent_folder_id !== parentFolderId)
    || (requireFolderId && !record.folder_id)
  ) {
    throw emailIdentityConflictError(
      `Existing Matter DMS ${kind ?? "record"} authority conflicts with the Outlook filing`,
    );
  }
  return record;
}

function validateMatterDmsAuthority({ repository, matter, documentId } = {}) {
  const expected = matterDmsAuthority({ matter });
  const canonicalWorkspaceIds = new Set([expected.workspace_id]);
  const workspaces = repository.list({
    tenant_id: expected.tenant_id,
    model_type: "DmsWorkspace",
  }).filter((record) => (
    record.matter_id === expected.matter_id
    || canonicalWorkspaceIds.has(record.workspace_id)
  ));
  for (const workspaceRecord of workspaces) {
    const workspace = workspaceRecord;
    assertMatterDmsAuthorityRecord(workspace, expected, {
      kind: "workspace",
      idField: "workspace_id",
      id: expected.workspace_id,
    });
    if (workspace.root_folder_id !== expected.root_folder_id) {
      throw emailIdentityConflictError(
        "Existing Matter DMS workspace root conflicts with the Outlook filing",
      );
    }
  }
  const workspace = workspaces.find((record) => record.workspace_id === expected.workspace_id) ?? null;

  const canonicalFolderIds = new Set([
    expected.root_folder_id,
    ...expected.folders.map((folder) => folder.folder_id),
  ]);
  const folders = repository.list({
    tenant_id: expected.tenant_id,
    model_type: "DmsFolder",
  }).filter((record) => (
    record.matter_id === expected.matter_id
    || canonicalFolderIds.has(record.folder_id)
  ));
  const existingRoot = folders.find((folder) => folder.folder_id === expected.root_folder_id);
  if (existingRoot) {
    assertMatterDmsAuthorityRecord(existingRoot, expected, {
      kind: "root folder",
      idField: "folder_id",
      id: expected.root_folder_id,
      name: "Root",
      parentFolderId: null,
      requireFolderId: true,
    });
  }
  const foldersById = new Map(folders.map((folder) => [folder.folder_id, folder]));
  for (const folder of folders) {
    const canonical = expected.folders.find((item) => item.folder_id === folder.folder_id);
    assertMatterDmsAuthorityRecord(folder, expected, {
      kind: "folder",
      idField: "folder_id",
      id: folder.folder_id,
      name: canonical?.name,
      parentFolderId: folder.folder_id === expected.root_folder_id
        ? null
        : canonical?.parent_folder_id,
      requireFolderId: true,
    });
    if (!canonical && folder.folder_id !== expected.root_folder_id) {
      const seen = new Set();
      let cursor = folder;
      while (cursor.folder_id !== expected.root_folder_id) {
        if (seen.has(cursor.folder_id)) {
          throw emailIdentityConflictError(
            "Existing Matter DMS folder ancestry conflicts with the Outlook filing",
          );
        }
        seen.add(cursor.folder_id);
        cursor = foldersById.get(cursor.parent_folder_id);
        if (!cursor) {
          throw emailIdentityConflictError(
            "Existing Matter DMS folder ancestry conflicts with the Outlook filing",
          );
        }
      }
    }
  }

  const document = documentId
    ? repository.get({
      tenant_id: expected.tenant_id,
      model_type: "DmsDocument",
      document_id: documentId,
    })
    : null;
  if (document) {
    assertMatterDmsAuthorityRecord(document, expected, {
      kind: "document",
      idField: "document_id",
      id: documentId,
    });
    if (document.folder_id !== undefined && document.folder_id !== expected.email_folder_id) {
      throw emailIdentityConflictError(
        "Existing Matter DMS document folder conflicts with the Outlook filing",
      );
    }
  }
  return Object.freeze({ expected, workspace, folders, document });
}

function ensureMatterFolders({ repository, matter, actor_id } = {}) {
  const authority = validateMatterDmsAuthority({ repository, matter });
  const { expected } = authority;
  const workspaceId = expected.workspace_id;
  let workspace = authority.workspace;
  if (!workspace) {
    workspace = repository.create({
      ...createDmsWorkspace({
        workspace_id: workspaceId,
        tenant_id: matter.tenant_id,
        matter_id: matter.matter_id,
        name: matter.title ?? matter.matter_id,
        status: "active",
        permission_envelope_id: expected.permission_envelope_id,
        audit_trace_id: expected.audit_trace_id,
      }),
      model_type: "DmsWorkspace",
    });
  }
  const rootFolderId = expected.root_folder_id;
  const existingRoot = authority.folders.find((folder) => folder.folder_id === rootFolderId);
  if (!existingRoot) {
    repository.create({
      ...createDmsFolder({
        folder_id: rootFolderId,
        tenant_id: matter.tenant_id,
        matter_id: matter.matter_id,
        workspace_id: workspaceId,
        name: "Root",
        status: "active",
        permission_envelope_id: expected.permission_envelope_id,
        audit_trace_id: expected.audit_trace_id,
      }),
      model_type: "DmsFolder",
    });
  }
  const folders = expected.folders.map(({ name, folder_id: folderId }) => {
    const existing = authority.folders.find((folder) => folder.folder_id === folderId)
      ?? repository.get({ tenant_id: matter.tenant_id, model_type: "DmsFolder", folder_id: folderId });
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
        permission_envelope_id: expected.permission_envelope_id,
        audit_trace_id: expected.audit_trace_id,
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

function safeMatterDocument(document = {}) {
  return Object.freeze({
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
  });
}

function listMatterDocuments({ repository, tenant_id, matter_id } = {}) {
  return Object.freeze(
    repository
      .list({ tenant_id, model_type: "DmsDocument", matter_id })
      .map(safeMatterDocument),
  );
}

function safeEmailThreadSnapshot(thread = {}) {
  const snapshot = clone(thread);
  if (typeof snapshot.body_preview === "string") {
    snapshot.body_preview_sha256 = bodyHash(snapshot.body_preview);
    delete snapshot.body_preview;
  }
  snapshot.raw_body_included = false;
  snapshot.credential_material_included = false;
  return Object.freeze(snapshot);
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

function handleM365ConnectionStatus({
  query,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, query.tenant_id);
    const gated = m365RouteGate({
      context,
      principal,
      requestId,
      action: "outlook:connection:read",
      auditHintRef: query.audit_hint_ref,
    });
    if (gated) return gated;
    const service = m365Service(runtime);
    const result = service.getConnectionStatus(principal);
    const authorizationAttempt = query.attempt_ref
      ? service.getAuthorizationAttemptStatus({
          ...principal,
          attempt_ref: query.attempt_ref,
        })
      : null;
    return success(200, {
      request_id: requestId,
      outcome: "passed",
      item: authorizationAttempt
        ? Object.freeze({
            ...result,
            authorization_attempt: authorizationAttempt,
          })
        : result,
      audit_hint_ref: query.audit_hint_ref,
      credential_material_included: false,
    });
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      query.audit_hint_ref,
    );
  }
}

export async function handleClientOutlookAuthorizationCallback({
  code,
  state,
  requestId,
  runtime,
} = {}) {
  try {
    const resolver = runtime?.m365GraphConfig?.provider
      ?.resolveDelegatedAuthorizationState;
    if (typeof resolver !== "function") {
      throw Object.assign(
        new Error("Microsoft authorization provider is unavailable"),
        {
          safe_error_code: M365_GRAPH_ERROR_CODES.provider_runtime_disabled,
          status: 503,
        },
      );
    }
    const principal = resolver({ state });
    if (principal.callback_mode !== M365_GRAPH_CALLBACK_MODES.server_complete) {
      throw Object.assign(
        new Error("Microsoft authorization callback mode is not server-complete"),
        {
          safe_error_code: M365_GRAPH_ERROR_CODES.provider_invalid,
          status: 400,
        },
      );
    }
    const principalAuthority = runtime?.sessionAuth
      ?.verifyOutlookCallbackPrincipal;
    if (typeof principalAuthority !== "function") {
      throw Object.assign(
        new Error("Outlook callback identity authority is unavailable"),
        {
          safe_error_code: M365_GRAPH_ERROR_CODES.entra_session_required,
          status: 503,
        },
      );
    }
    const verified = await principalAuthority({
      tenant_id: principal.tenant_id,
      user_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      federated_tenant_id:
        runtime.m365GraphConfig?.office_sso_provider
          ?.public_config?.tenant_id,
    });
    if (verified?.ok !== true) {
      throw Object.assign(
        new Error("Outlook callback identity binding is inactive"),
        {
          safe_error_code:
            verified?.safe_error_code
            ?? M365_GRAPH_ERROR_CODES.entra_session_required,
          status: verified?.status ?? 403,
        },
      );
    }
    const result = await m365Service(runtime).completeAuthorization({
      ...principal,
      code,
      state,
      redirect_uri: principal.redirect_uri,
    });
    return success(200, {
      request_id: requestId,
      outcome: result.outcome,
      item: result,
      credential_material_included: false,
    });
  } catch (error) {
    return m365ErrorResponse(error, requestId, null);
  }
}

async function handleM365ConnectionAuthorize({
  body,
  headers,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, body.tenant_id);
    const gated = m365RouteGate({
      context,
      principal,
      requestId,
      action: "outlook:connection:create",
      auditHintRef: body.audit_hint_ref,
    });
    if (gated) return gated;
    const result = await m365Service(runtime).beginAuthorization({
      ...principal,
      redirect_uri: body.redirect_uri,
      callback_mode:
        String(headers?.["x-lawos-outlook-callback-mode"] ?? "").trim()
        || undefined,
    });
    return success(200, {
      request_id: requestId,
      outcome: "authorization_started",
      item: result,
      audit_hint_ref: body.audit_hint_ref,
      credential_material_included: false,
    });
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      body.audit_hint_ref,
    );
  }
}

async function handleM365ConnectionComplete({
  body,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, body.tenant_id);
    const gated = m365RouteGate({
      context,
      principal,
      requestId,
      action: "outlook:connection:create",
      auditHintRef: body.audit_hint_ref,
    });
    if (gated) return gated;
    const result = await m365Service(runtime).completeAuthorization({
      ...principal,
      code: body.code,
      state: body.state,
      redirect_uri: body.redirect_uri,
    });
    return success(200, {
      request_id: requestId,
      outcome: result.outcome,
      item: result,
      audit_hint_ref: body.audit_hint_ref,
      credential_material_included: false,
    });
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      body.audit_hint_ref,
    );
  }
}

async function handleM365ConnectionDelete({
  query,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, query.tenant_id);
    const gated = m365RouteGate({
      context,
      principal,
      requestId,
      action: "outlook:connection:delete",
      auditHintRef: query.audit_hint_ref,
    });
    if (gated) return gated;
    const result = await m365Service(runtime).revokeConnection({
      ...principal,
      expected_state_version: Number(query.expected_state_version),
      reason: query.reason,
    });
    return success(200, {
      request_id: requestId,
      outcome: result.outcome,
      item: result,
      audit_hint_ref: query.audit_hint_ref,
      credential_material_included: false,
    });
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      query.audit_hint_ref,
    );
  }
}

async function handleOutlookInquiryMessageResolve({
  body,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, body.tenant_id);
    const gated = m365RouteGate({
      context,
      principal,
      requestId,
      action: "outlook:inquiry:capture",
      auditHintRef: body.audit_hint_ref,
    });
    if (gated) return gated;
    const restMessageId = requiredString(
      body.rest_message_id,
      "rest_message_id",
    );
    const result = await m365MailPort(runtime).getOwnMessageMime({
      ...body,
      ...principal,
      rest_message_id: restMessageId,
    });
    const mimeSha256 = sha256Hex(result.mime_bytes);
    const messageRef = sha256Hex(result.immutable_message_id);
    const providerRequestRef = result.provider_request_id
      ? sha256Hex(result.provider_request_id)
      : null;
    const occurredAt =
      typeof runtime?.m365GraphConfig?.clock === "function"
        ? new Date(runtime.m365GraphConfig.clock()).toISOString()
        : new Date().toISOString();
    runtime.emailDmsRuntime.repository.appendAudit({
      tenant_id: principal.tenant_id,
      event_id:
        `outlook.inquiry.mime-resolved:${sha256Hex(requestId).slice(0, 32)}`,
      event_type: "outlook.inquiry.mime_resolved",
      actor_id: principal.user_id,
      object_type: "MicrosoftGraphMessage",
      object_id: `message:${messageRef}`,
      payload: {
        message_ref: messageRef,
        provider_request_ref: providerRequestRef,
        mime_sha256: mimeSha256,
        mime_byte_size: result.mime_bytes.byteLength,
        mailbox_scope: "me",
        raw_content_included: false,
        credential_material_included: false,
      },
      created_at: occurredAt,
    });
    return success(200, {
      request_id: requestId,
      outcome: "message_resolved",
      item: {
        graph_immutable_message_id: result.immutable_message_id,
        internet_message_id: result.internet_message_id,
        mime_sha256: mimeSha256,
        mime_byte_size: result.mime_bytes.byteLength,
        provider_request_ref: providerRequestRef,
        mailbox_scope: "me",
        source_id_type: result.source_id_type,
        target_id_type: result.target_id_type,
        raw_mime_included: false,
        message_body_included: false,
        credential_material_included: false,
        product_record_created: false,
        production_ready_claim: false,
      },
      audit_hint_ref: body.audit_hint_ref,
      credential_material_included: false,
    });
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      body.audit_hint_ref,
    );
  }
}

async function handleOutlookInquiryRegistration({
  body,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, body.tenant_id);
    const captureGate = m365RouteGate({
      context,
      principal,
      requestId,
      action: "outlook:inquiry:capture",
      auditHintRef: body.audit_hint_ref,
    });
    if (captureGate) return captureGate;
    const writeDecision = evaluateOutlookPermission({
      context,
      tenant_id: principal.tenant_id,
      resource_type: "crm_inquiry",
      resource_id: body.existing_lead_id ?? "new",
      action: "crm:inquiry:create",
    });
    if (writeDecision.effect !== "allow") {
      return permissionDeniedResponse({
        requestId,
        decision: writeDecision,
        auditHintRef: body.audit_hint_ref,
      });
    }
    const result = await inquiryRegistrationService(runtime).register({
      ...body,
      tenant_id: principal.tenant_id,
      actor_id: principal.user_id,
      entra_subject_id: principal.entra_subject_id,
      rest_message_id: requiredString(
        body.rest_message_id,
        "rest_message_id",
      ),
      idempotency_key: requiredString(
        body.idempotency_key,
        "idempotency_key",
      ),
    });
    return success(result.idempotent_replay ? 200 : 201, {
      request_id: requestId,
      outcome: result.outcome,
      item: result,
      audit_hint_ref: body.audit_hint_ref,
      credential_material_included: false,
    });
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      body.audit_hint_ref,
    );
  }
}

function handleOutlookInquiryList({
  query,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, query.tenant_id);
    const decision = evaluateOutlookPermission({
      context: {
        ...context,
        object_acl: (context?.object_acl ?? []).filter((entry) => (
          entry.resource_id === undefined
          || entry.resource_id === "inquiry_search"
        )),
      },
      tenant_id: principal.tenant_id,
      resource_type: "crm_inquiry",
      resource_id: "inquiry_search",
      action: "crm:inquiry:read",
    });
    if (decision.effect !== "allow") {
      return permissionDeniedResponse({
        requestId,
        decision,
        auditHintRef: query.audit_hint_ref,
      });
    }
    const limit = Math.min(
      50,
      Math.max(1, Number(query.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT),
    );
    const search = searchLinkableInquiries({
      repository: runtime?.crmIntakeRuntime?.crmRepository,
      tenant_id: principal.tenant_id,
      query: query.q ?? query.query,
      context,
    });
    return success(200, {
      request_id: requestId,
      outcome: "passed",
      items: search.items.slice(0, limit),
      omitted_count: search.omitted_count,
      page_info: {
        limit,
        has_more: search.items.length > limit,
      },
      count_leak_prevented: true,
    });
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      query.audit_hint_ref,
    );
  }
}

async function handleInquiryEvidenceContentRead({
  evidenceId,
  query,
  context,
  requestId,
  runtime,
}) {
  try {
    const principal = m365Principal(context, query.tenant_id);
    const decision = evaluateOutlookPermission({
      context,
      tenant_id: principal.tenant_id,
      resource_type: "inquiry_email_evidence",
      resource_id: evidenceId,
      action: "email_dms:inquiry_evidence:read",
    });
    if (decision.effect !== "allow") {
      return permissionDeniedResponse({
        requestId,
        decision,
        auditHintRef: query.audit_hint_ref,
      });
    }
    const evidenceRepository = runtime?.emailDmsRuntime?.repository;
    if (typeof evidenceRepository?.get !== "function") {
      return inquiryEvidenceNotFoundResponse({
        requestId,
        auditHintRef: query.audit_hint_ref,
      });
    }
    let evidence;
    try {
      evidence = evidenceRepository.get({
        tenant_id: principal.tenant_id,
        model_type: "InquiryEmailEvidence",
        inquiry_email_evidence_id: evidenceId,
      });
    } catch {
      return inquiryEvidenceNotFoundResponse({
        requestId,
        auditHintRef: query.audit_hint_ref,
      });
    }
    if (!evidence) {
      return inquiryEvidenceNotFoundResponse({
        requestId,
        auditHintRef: query.audit_hint_ref,
      });
    }
    if (evidence.lead_id) {
      const crmRepository = runtime?.crmIntakeRuntime?.crmRepository;
      if (typeof crmRepository?.get !== "function") {
        return inquiryEvidenceNotFoundResponse({
          requestId,
          auditHintRef: query.audit_hint_ref,
        });
      }
      let inquiry;
      try {
        inquiry = crmRepository.get({
          tenant_id: principal.tenant_id,
          model_type: "Lead",
          lead_id: evidence.lead_id,
        });
      } catch {
        return inquiryEvidenceNotFoundResponse({
          requestId,
          auditHintRef: query.audit_hint_ref,
        });
      }
      if (!inquiry) {
        return inquiryEvidenceNotFoundResponse({
          requestId,
          auditHintRef: query.audit_hint_ref,
        });
      }
      const inquiryDecision = evaluateOutlookPermission({
        context: permissionContextForResource(context, evidence.lead_id),
        tenant_id: principal.tenant_id,
        resource_type: "crm_inquiry",
        resource_id: evidence.lead_id,
        action: "crm:inquiry:read",
      });
      if (inquiryDecision.effect !== "allow") {
        return inquiryEvidenceNotFoundResponse({
          requestId,
          auditHintRef: query.audit_hint_ref,
        });
      }
    }
    const objectKind =
      query.kind === "original"
        ? "original_mime"
        : query.kind === "display"
          ? "sanitized_display"
          : null;
    if (!objectKind) {
      return errorResponse(
        400,
        requestId,
        ["INQUIRY_EVIDENCE_OBJECT_KIND_INVALID"],
        {
          audit_hint_ref: query.audit_hint_ref,
          ui_state: "blocked",
        },
      );
    }
    const content = await inquiryEvidenceStorageService(runtime)
      .readEvidenceContent({
        tenant_id: principal.tenant_id,
        inquiry_email_evidence_id: evidenceId,
        object_kind: objectKind,
        actor_id: principal.user_id,
        request_id: requestId,
      });
    const original = objectKind === "original_mime";
    return {
      ...success(200, {
        request_id: requestId,
        outcome: "passed",
        item: {
          inquiry_email_evidence_id: evidenceId,
          object_kind: objectKind,
          encoding: original ? "base64" : "utf8",
          content_base64:
            original ? content.bytes.toString("base64") : null,
          content_text:
            original ? null : content.bytes.toString("utf8"),
          content_sha256: content.sha256,
          byte_size: content.byte_size,
          mime_type: content.mime_type,
          scan_status: content.scan_status,
          raw_path_exposed: false,
          storage_pointer_ref_included: false,
          executable_preview_enabled: false,
          external_resources_loaded: false,
          production_ready_claim: false,
        },
        audit_event: {
          event_id: content.audit_event_id,
          raw_content_included: false,
        },
        audit_hint_ref: query.audit_hint_ref,
      }),
      headers: {
        "x-content-type-options": "nosniff",
        "content-security-policy":
          "default-src 'none'; sandbox",
      },
    };
  } catch (error) {
    return m365ErrorResponse(
      error,
      requestId,
      query.audit_hint_ref,
    );
  }
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

async function fileEmail({ body, context, requestId, runtime, mode = "manual" }) {
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
  const requestedThread = normalizeEmailThread({ input: body, tenant_id: tenantId, matter_id: matterId, actor_id: actorId, mode });
  let canonical;
  try {
    canonical = await resolveCanonicalMessage({
      thread: requestedThread,
      context,
      runtime,
    });
    if (mode === "sent") {
      if (!canonical.sender_address) {
        throw sentMessageProvenanceError(
          "Microsoft Graph sender is required for Sent Items filing",
        );
      }
      if (
        normalizedMessageIdentity(canonical.sender_address, "provider.sender.address")
        !== normalizedMessageIdentity(canonical.mailbox_address, "provider.mailbox_address")
      ) {
        throw sentMessageProvenanceError("Microsoft Graph sender does not match the signed-in Outlook mailbox");
      }
      if (canonical.is_in_sent_items !== true || canonical.is_draft !== false) {
        throw sentMessageProvenanceError(
          "Microsoft Graph item is not a non-draft message in the signed-in mailbox Sent Items folder",
        );
      }
    }
  } catch (error) {
    return m365ErrorResponse(error, requestId, body.audit_hint_ref);
  }
  const canonicalThread = canonical.thread;
  let existingThread = runtime.dmsRuntime.repository.get({
    tenant_id: tenantId,
    model_type: "DmsEmailThread",
    email_thread_id: canonicalThread.email_thread_id,
  });
  if (
    existingThread
    && (
      existingThread.matter_id !== matterId
      || normalizedOpaqueIdentity(existingThread.graph_message_id, "stored.graph_message_id")
        !== normalizedOpaqueIdentity(canonicalThread.graph_message_id, "provider.immutable_message_id")
      || normalizedMessageIdentity(existingThread.internet_message_id, "stored.internet_message_id")
        !== normalizedMessageIdentity(canonicalThread.internet_message_id, "provider.internet_message_id")
      || normalizedOpaqueIdentity(existingThread.conversation_id, "stored.conversation_id")
        !== normalizedOpaqueIdentity(canonicalThread.conversation_id, "provider.conversation_id")
    )
  ) {
    return m365ErrorResponse(
      emailIdentityConflictError("Filed Outlook message identity conflicts with an existing Matter record"),
      requestId,
      body.audit_hint_ref,
    );
  }
  const documentId = `doc:${canonicalThread.email_thread_id}:original-mime:${canonical.mime_sha256}`;
  const versionId = `version:${documentId}:1`;
  const workspaceId = `workspace:${matterId}`;
  const emailFolderId = `folder:${matterId}:00_Email`;
  const document = {
    document_id: documentId,
    tenant_id: tenantId,
    matter_id: matterId,
    workspace_id: workspaceId,
    folder_id: emailFolderId,
    title: `${canonicalThread.subject}.eml`,
    status: "active",
    current_version_id: versionId,
    permission_envelope_id: matter.permission_envelope_id ?? "perm:outlook:dms",
    audit_trace_id: matter.audit_trace_id ?? "audit:outlook:dms",
    mime_type: "message/rfc822",
    source_email_thread_id: canonicalThread.email_thread_id,
    source_policy: "source_required",
  };
  let dmsAuthority;
  try {
    dmsAuthority = validateMatterDmsAuthority({
      repository: runtime.dmsRuntime.repository,
      matter,
      documentId: documentId,
    });
  } catch (error) {
    return m365ErrorResponse(error, requestId, body.audit_hint_ref);
  }
  const uploadInput = {
    document,
    bytes: canonical.mime_bytes,
    actor_id: actorId,
    idempotency_key: `outlook-original-mime:${canonicalThread.email_thread_id}:${canonical.mime_sha256}`,
  };
  if (
    existingThread
    && (
      !["draft", "active"].includes(existingThread.status)
      || existingThread.filed_document_ids?.length !== 1
      || existingThread.filed_document_ids[0] !== documentId
    )
  ) {
    return m365ErrorResponse(
      emailIdentityConflictError("Filed Outlook message has an invalid or conflicting original MIME link"),
      requestId,
      body.audit_hint_ref,
    );
  }
  let documentState;
  let uploadIntent = null;
  let phasedUploadRuntime;
  try {
    phasedUploadRuntime = phasedOriginalMimeUploadRuntime(runtime);
    documentState = await originalMimeDocumentState({ runtime, tenantId, documentId });
    if (documentState) {
      assertOriginalMimeDocument(documentState, {
        tenantId,
        matterId,
        workspaceId: dmsAuthority.expected.workspace_id,
        folderId: dmsAuthority.expected.email_folder_id,
        documentId,
        permissionEnvelopeId: dmsAuthority.expected.permission_envelope_id,
        auditTraceId: dmsAuthority.expected.audit_trace_id,
        mimeSha256: canonical.mime_sha256,
      });
    } else if (phasedUploadRuntime) {
      uploadIntent = await ensureOriginalMimeUploadIntent({
        uploadRuntime: phasedUploadRuntime,
        document,
        bytes: canonical.mime_bytes,
        actorId,
        sourceIdentity: {
          graph_message_id: canonicalThread.graph_message_id,
          internet_message_id: canonicalThread.internet_message_id,
          conversation_id: canonicalThread.conversation_id,
        },
        now: typeof runtime?.m365GraphConfig?.clock === "function"
          ? runtime.m365GraphConfig.clock()
          : new Date(),
      });
    }
  } catch (error) {
    return m365ErrorResponse(error, requestId, body.audit_hint_ref);
  }
  let folderState;
  try {
    folderState = ensureMatterFolders({
      repository: runtime.dmsRuntime.repository,
      matter,
      actor_id: actorId,
    });
  } catch (error) {
    return m365ErrorResponse(error, requestId, body.audit_hint_ref);
  }
  const emailFolder = folderState.folders.find((folder) => folder.name === "00_Email");
  if (
    folderState.workspace.workspace_id !== workspaceId
    || emailFolder?.folder_id !== emailFolderId
  ) {
    return m365ErrorResponse(
      emailIdentityConflictError("Matter DMS folders conflict with the Outlook MIME upload intent"),
      requestId,
      body.audit_hint_ref,
    );
  }
  if (!existingThread) {
    const pendingThread = createEmailThread({
      ...canonicalThread,
      status: "draft",
      filed_document_ids: Object.freeze([documentId]),
    });
    try {
      existingThread = runtime.dmsRuntime.repository.create({
        ...pendingThread,
        model_type: "DmsEmailThread",
      });
    } catch (error) {
      existingThread = runtime.dmsRuntime.repository.get({
        tenant_id: tenantId,
        model_type: "DmsEmailThread",
        email_thread_id: canonicalThread.email_thread_id,
      });
      if (!existingThread) return m365ErrorResponse(error, requestId, body.audit_hint_ref);
    }
  }
  try {
    if (!documentState) {
      if (phasedUploadRuntime) {
        await phasedUploadRuntime.stageUpload({
          tenant_id: tenantId,
          session_id: uploadIntent.session.session_id,
          bytes: canonical.mime_bytes,
        });
        await phasedUploadRuntime.finalizeUpload({
          tenant_id: tenantId,
          session_id: uploadIntent.session.session_id,
        });
        documentState = await originalMimeDocumentState({ runtime, tenantId, documentId });
      } else {
        const uploaded = uploadDocument({
            repository: runtime.dmsRuntime.repository,
            storage: runtime.dmsRuntime.storage,
            ...uploadInput,
          });
        documentState = Object.freeze({
          document: uploaded.document,
          version: uploaded.version,
          versions: Object.freeze([uploaded.version]),
        });
      }
    }
    assertOriginalMimeDocument(documentState, {
      tenantId,
      matterId,
      workspaceId: dmsAuthority.expected.workspace_id,
      folderId: dmsAuthority.expected.email_folder_id,
      documentId,
      permissionEnvelopeId: dmsAuthority.expected.permission_envelope_id,
      auditTraceId: dmsAuthority.expected.audit_trace_id,
      mimeSha256: canonical.mime_sha256,
    });
  } catch (error) {
    return m365ErrorResponse(error, requestId, body.audit_hint_ref);
  }
  const result = fileEmailThreadToMatter({
    repository: runtime.dmsRuntime.repository,
    thread: existingThread,
    actor_id: actorId,
    require_original_mime_document: true,
    audit: {
      append: (event) =>
        appendDmsAudit(runtime.dmsRuntime.repository, {
          ...event,
          event_id: `outlook.email.file:${tenantId}:${canonicalThread.email_thread_id}`,
          occurred_at: existingThread.filing_time,
        }),
    },
  });
  const filedThread = result.thread;
  const timelineEvent = appendMatterTimeline({
    repository: runtime.matterRuntime.repository,
    event: {
      event_id: `outlook.email.filed:${tenantId}:${matterId}:${filedThread.email_thread_id}`,
      tenant_id: tenantId,
      matter_id: matterId,
      occurred_at: filedThread.filing_time,
      type: mode === "sent" ? "outlook.email.sent_filed" : "outlook.email.filed",
      title: filedThread.subject,
      source_ref: filedThread.email_thread_id,
      source_object_id: filedThread.email_thread_id,
      safe_summary: {
        graph_message_id: filedThread.graph_message_id,
        internet_message_id: filedThread.internet_message_id,
        filed_document_ids: filedThread.filed_document_ids,
        original_mime_document_id: filedThread.filed_document_ids[0] ?? null,
        attachment_count: filedThread.attachment_metadata.length,
        attachment_source_authority: filedThread.attachment_metadata.length > 0
          ? "microsoft_graph_mime"
          : null,
        raw_body_included: false,
        raw_mime_included: false,
        storage_pointer_ref_included: false,
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

async function saveAttachments({ body, context, requestId, runtime }) {
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
  if (!thread || thread.matter_id !== matterId || thread.status !== "active") {
    return errorResponse(404, requestId, [OUTLOOK_ADDIN_ERROR_CODES.email_not_found]);
  }
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (attachments.length !== 1) {
    throw new TypeError("exactly one attachment is required per request");
  }
  const attachment = attachments[0];
  const attachmentId = requiredString(attachment.attachment_id ?? attachment.id, "attachment_id");
  const selectedIds = Array.isArray(body.selected_attachment_ids)
    ? body.selected_attachment_ids.map((value) => requiredString(value, "selected_attachment_id"))
    : [attachmentId];
  if (selectedIds.length !== 1 || selectedIds[0] !== attachmentId) {
    throw new TypeError("exactly one selected attachment is required per request");
  }
  const sourceAttachment = thread.attachment_metadata.find(
    (item) => (item.attachment_id ?? item.id) === attachmentId,
  );
  if (!sourceAttachment) {
    throw new TypeError("attachment_id is not present on the filed Outlook email");
  }
  const verifiedBytes = bytesForAttachment(attachment);
  const verifiedSha256 = verifySourceAttachmentBytes(sourceAttachment, verifiedBytes);
  const folderState = ensureMatterFolders({ repository: runtime.dmsRuntime.repository, matter, actor_id: actorId });
  const emailFolder = folderState.folders.find((folder) => folder.name === "00_Email");
  const postgresDms = typeof runtime.dmsRuntime.upload_runtime?.uploadDocument === "function";
  const knownDocuments = postgresDms
    ? (await runtime.dmsRuntime.upload_runtime.listDocuments({ tenant_id: tenantId, actor_id: actorId }))
        .filter((entry) => entry.document.matter_id === matterId)
        .map((entry) => ({ ...entry.document, latest_sha256: entry.version?.sha256 ?? null }))
    : [...runtime.dmsRuntime.repository.list({ tenant_id: tenantId, model_type: "DmsDocument", matter_id: matterId })];
  const saved = [];
  const duplicates = [];
  for (const attachment of attachments) {
    const bytes = verifiedBytes;
    const sha256 = verifiedSha256;
    const duplicate = knownDocuments.find((document) => document.latest_sha256 === sha256);
    if (duplicate) {
      duplicates.push(Object.freeze({ attachment_id: attachmentId, duplicate_document_id: duplicate.document_id, sha256 }));
      continue;
    }
    const documentId = `doc:${safeId(emailThreadId)}:${safeId(attachmentId)}`;
    const versionId = `version:${documentId}:1`;
    const document = {
        document_id: documentId,
        tenant_id: tenantId,
        matter_id: matterId,
        workspace_id: folderState.workspace.workspace_id,
        folder_id: emailFolder.folder_id,
        title: requiredString(sourceAttachment.name, "source_attachment.name"),
        status: "active",
        current_version_id: versionId,
        permission_envelope_id: matter.permission_envelope_id ?? "perm:outlook:attachment",
        audit_trace_id: matter.audit_trace_id ?? "audit:outlook:attachment",
        mime_type: optionalString(
          sourceAttachment.content_type ?? sourceAttachment.mime_type,
          "application/octet-stream",
        ),
        source_email_thread_id: emailThreadId,
        source_attachment_id: attachmentId,
        source_policy: "source_required",
        source_provenance_authority: sourceAttachment.source_provenance.authority,
    };
    const uploaded = postgresDms
      ? await runtime.dmsRuntime.upload_runtime.uploadDocument({
          document,
          bytes,
          actor_id: actorId,
          idempotency_key: `outlook-attachment:${emailThreadId}:${attachmentId}:${sha256}`,
        })
      : uploadDocument({
          repository: runtime.dmsRuntime.repository,
          storage: runtime.dmsRuntime.storage,
          document,
          bytes,
          actor_id: actorId,
          idempotency_key: `outlook-attachment:${emailThreadId}:${attachmentId}:${sha256}`,
        });
    knownDocuments.push(uploaded.document);
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
      source_byte_size: sourceAttachment.source_provenance.byte_size,
      source_message_ref: sourceAttachment.source_provenance.message_ref,
      source_provenance_authority: sourceAttachment.source_provenance.authority,
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
        safe_summary: {
          email_thread_id: emailThreadId,
          sha256,
          byte_size: bytes.byteLength,
          folder: "00_Email",
          source_provenance_authority: sourceAttachment.source_provenance.authority,
        },
      },
    });
    saved.push(
      Object.freeze({
        document: uploaded.document,
        version: uploaded.version,
        file_object: serializeFileObjectSafe(uploaded.file_object),
        storage_receipt: safeStorageReceipt(uploaded.storage_receipt),
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
    documents: postgresDms
      ? Object.freeze(knownDocuments.map(safeMatterDocument))
      : listMatterDocuments({ repository: runtime.dmsRuntime.repository, tenant_id: tenantId, matter_id: matterId }),
    document_bytes_included: false,
  });
}

function createFollowup({ body, context, requestId, runtime }) {
  const tenantId = requiredString(body.tenant_id ?? context?.principal?.tenant_id, "tenant_id");
  const matterId = requiredString(body.matter_id ?? body.matterId, "matter_id");
  const actorId = actorFrom(context);
  const kind = body.kind === "deadline" ? "deadline" : "task";
  const sourceEmailThreadId = requiredString(body.source_email_thread_id, "source_email_thread_id");
  const decision = evaluateOutlookPermission({
    context,
    tenant_id: tenantId,
    matter_id: matterId,
    resource_type: kind === "deadline" ? "matter_deadline" : "matter_task",
    resource_id: sourceEmailThreadId,
    action: "outlook:followup:create",
  });
  if (decision.effect !== "allow") return permissionDeniedResponse({ requestId, decision, auditHintRef: body.audit_hint_ref });
  const sourceThread = runtime.dmsRuntime.repository.get({
    tenant_id: tenantId,
    model_type: "DmsEmailThread",
    email_thread_id: sourceEmailThreadId,
  });
  if (!sourceThread || sourceThread.matter_id !== matterId || sourceThread.status !== "active") {
    return errorResponse(404, requestId, [OUTLOOK_ADDIN_ERROR_CODES.email_not_found]);
  }
  const service = createMatterActivityCalendarChannelService({
    repository: runtime.matterRuntime.repository,
    peopleAssignmentAuthority: runtime.matterRuntime.peopleAssignmentAuthority,
    clock: runtime.matterRuntime.clock,
  });
  const result =
    kind === "deadline"
      ? service.createCalendarEvent({
          tenant_id: tenantId,
          matter_id: matterId,
          actor_id: actorId,
          event: {
            event_id: optionalString(body.event_id, `deadline_${safeId(sourceEmailThreadId)}`),
            title: requiredString(body.title, "title"),
            event_kind: "deadline",
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
            activity_id: optionalString(body.task_id, `task_${safeId(sourceEmailThreadId)}`),
            activity_type: "task",
            title: requiredString(body.title, "title"),
            due_at: body.due_at ?? null,
            assigned_to_user_id: body.assigned_to_user_id ?? actorId,
            status: "todo",
            source_ref: `DmsEmailThread:${sourceEmailThreadId}`,
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

function evaluateSmartAlerts({ body, context, requestId }) {
  const message = body.message ?? body.email ?? body;
  const recipients = safeRecipients(message.to, {
    internalEmailDomain: emailDomain(context?.principal?.email),
  });
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const bodyText = String(message.body_preview ?? message.body ?? "").toLowerCase();
  const attachmentMetadata = attachments.map((attachment) => ({
    attachment_id: optionalString(attachment.attachment_id ?? attachment.id, "attachment"),
    content_type: optionalString(attachment.content_type ?? attachment.mime_type, "application/octet-stream"),
    size: Number(attachment.size ?? attachment.byte_size ?? 0),
    confidentiality: optionalString(attachment.confidentiality ?? attachment.sensitivity, "internal"),
  }));
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
      message_hashes: {
        body_preview_sha256: bodyHash(bodyText),
        recipients_sha256: sha256Hex(JSON.stringify(recipients)),
        attachment_metadata_sha256: sha256Hex(JSON.stringify(attachmentMetadata)),
      },
      raw_body_included: false,
      attachment_bytes_included: false,
      credential_material_included: false,
    },
  });
}

function routeMatch(pathname, pattern) {
  return pathname.match(pattern);
}

function hasOnlyBodyFields(body, allowedFields) {
  return Boolean(body)
    && typeof body === "object"
    && !Array.isArray(body)
    && Object.keys(body).every((field) => allowedFields.includes(field));
}

export async function handleOutlookAddinApiRequest({ pathname, method, query = {}, body = {}, headers = {}, context, requestId, runtime } = {}) {
  try {
    if (pathname === "/api/outlook/bootstrap" && method === "GET") {
      return handleBootstrap({ query, context, requestId });
    }
    if (pathname === "/api/outlook/connection" && method === "GET") {
      return handleM365ConnectionStatus({
        query,
        context,
        requestId,
        runtime,
      });
    }
    if (
      pathname === "/api/outlook/connection/authorize"
      && method === "POST"
    ) {
      if (!hasOnlyBodyFields(body, [
        "actor_id",
        "audit_hint_ref",
        "redirect_uri",
        "tenant_id",
      ])) {
        return m365ErrorResponse(
          new TypeError("Microsoft authorization request contains unsupported fields"),
          requestId,
          body?.audit_hint_ref,
        );
      }
      return await handleM365ConnectionAuthorize({
        body,
        headers,
        context,
        requestId,
        runtime,
      });
    }
    if (
      pathname === "/api/outlook/connection/complete"
      && method === "POST"
    ) {
      if (!hasOnlyBodyFields(body, [
        "actor_id",
        "audit_hint_ref",
        "code",
        "redirect_uri",
        "state",
        "tenant_id",
      ])) {
        return m365ErrorResponse(
          new TypeError("Microsoft authorization completion contains unsupported fields"),
          requestId,
          body?.audit_hint_ref,
        );
      }
      return await handleM365ConnectionComplete({
        body,
        context,
        requestId,
        runtime,
      });
    }
    if (pathname === "/api/outlook/connection" && method === "DELETE") {
      return await handleM365ConnectionDelete({
        query,
        context,
        requestId,
        runtime,
      });
    }
    if (
      pathname === "/api/outlook/inquiries"
      && method === "GET"
    ) {
      return handleOutlookInquiryList({
        query,
        context,
        requestId,
        runtime,
      });
    }
    if (
      pathname === "/api/outlook/inquiries"
      && method === "POST"
    ) {
      return await handleOutlookInquiryRegistration({
        body,
        context,
        requestId,
        runtime,
      });
    }
    if (
      pathname === "/api/outlook/inquiries/message/resolve"
      && method === "POST"
    ) {
      return await handleOutlookInquiryMessageResolve({
        body,
        context,
        requestId,
        runtime,
      });
    }
    const inquiryEvidenceContentMatch = routeMatch(
      pathname,
      /^\/api\/outlook\/inquiries\/evidence\/([^/]+)\/content$/u,
    );
    if (inquiryEvidenceContentMatch && method === "GET") {
      return await handleInquiryEvidenceContentRead({
        evidenceId: decodeURIComponent(
          inquiryEvidenceContentMatch[1],
        ),
        query,
        context,
        requestId,
        runtime,
      });
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
      return await fileEmail({ body, context, requestId, runtime, mode: "manual" });
    }
    if (pathname === "/api/outlook/sent/file" && method === "POST") {
      return await fileEmail({ body, context, requestId, runtime, mode: "sent" });
    }
    if (pathname === "/api/outlook/attachments/save" && method === "POST") {
      return await saveAttachments({ body, context, requestId, runtime });
    }
    if (pathname === "/api/outlook/followups" && method === "POST") {
      return createFollowup({ body, context, requestId, runtime });
    }
    if (pathname === "/api/outlook/smart-alerts/evaluate" && method === "POST") {
      return evaluateSmartAlerts({ body, context, requestId });
    }
    return errorResponse(404, requestId, ["OUTLOOK_ADDIN_NOT_FOUND"]);
  } catch (error) {
    const safeCode = error?.safe_error_code === OUTLOOK_ADDIN_ERROR_CODES.attachment_provenance_mismatch
      ? error.safe_error_code
      : OUTLOOK_ADDIN_ERROR_CODES.validation_error;
    return errorResponse(error?.status ?? 400, requestId, [safeCode], { message: error.message });
  }
}

export function outlookAddinProofSnapshot({ runtime, tenant_id, matter_id } = {}) {
  return Object.freeze({
    email_threads: runtime.dmsRuntime.repository.list({ tenant_id, model_type: "DmsEmailThread", matter_id }).map(safeEmailThreadSnapshot),
    documents: listMatterDocuments({ repository: runtime.dmsRuntime.repository, tenant_id, matter_id }).map(clone),
    timeline: listMatterTimeline({ repository: runtime.matterRuntime.repository, tenant_id, matter_id }).visible_entries.map(clone),
    folder_structure: MATTER_FOLDER_NAMES,
    email_object_field_contract: OUTLOOK_EMAIL_OBJECT_FIELDS,
  });
}
