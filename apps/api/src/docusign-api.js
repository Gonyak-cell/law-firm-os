import { createHash } from "node:crypto";
import { uploadDocument } from "../../../packages/dms/src/document-service.js";

export const DOCUSIGN_WEBHOOK_PATH = "/api/integrations/docusign/webhook";
export const DOCUSIGN_OUTLOOK_REQUESTS_PATH = "/api/outlook/esign-requests";

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function response(status, body) {
  return Object.freeze({ status, body: Object.freeze(body) });
}

function blocked(status, requestId, safeErrorCode) {
  return response(status, {
    request_id: requestId,
    outcome: "blocked",
    safe_error_codes: [safeErrorCode],
    detail_exposed: false,
    production_ready_claim: false,
  });
}

export function isDocusignWebhook(method, pathname) {
  return String(method ?? "").toUpperCase() === "POST" && pathname === DOCUSIGN_WEBHOOK_PATH;
}

export function isDocusignOutlookRead(method, pathname) {
  return String(method ?? "").toUpperCase() === "GET" && pathname === DOCUSIGN_OUTLOOK_REQUESTS_PATH;
}

export function createDocusignCompletionArtifactStore({ dmsRuntime } = {}) {
  const postgresUpload = dmsRuntime?.upload_runtime?.uploadDocument;
  const localUpload = dmsRuntime?.repository && dmsRuntime?.storage;
  if (typeof postgresUpload !== "function" && !localUpload) {
    throw new TypeError("DMS upload runtime is required for DocuSign completion artifacts");
  }
  return Object.freeze({
    async ingest(input = {}) {
      const bytes = Buffer.isBuffer(input.bytes) ? Buffer.from(input.bytes) : Buffer.from(input.bytes ?? []);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (bytes.length === 0 || digest !== requiredText(input.sha256, "sha256").toLowerCase()) {
        throw new TypeError("DocuSign completion artifact SHA-256 does not match bytes");
      }
      const kind = requiredText(input.kind, "kind");
      if (!new Set(["signed_pdf", "certificate"]).has(kind)) throw new TypeError("completion artifact kind is invalid");
      if (input.mime_type !== "application/pdf") throw new TypeError("completion artifact must be PDF");
      const requestId = requiredText(input.request_id, "request_id");
      const documentId = `docusign-completion:${requestId}:${kind}`;
      const versionId = `version:${documentId}:1`;
      const document = {
        document_id: documentId,
        tenant_id: requiredText(input.tenant_id, "tenant_id"),
        matter_id: requiredText(input.matter_id, "matter_id"),
        workspace_id: requiredText(input.workspace_id, "workspace_id"),
        title: requiredText(input.title, "title"),
        status: "active",
        current_version_id: versionId,
        permission_envelope_id: requiredText(input.permission_envelope_id, "permission_envelope_id"),
        audit_trace_id: requiredText(input.audit_trace_id, "audit_trace_id"),
        mime_type: "application/pdf",
        source_provider: "docusign",
        source_request_ref: `docusign-request:${requestId}`,
        source_artifact_kind: kind,
      };
      const actorId = requiredText(input.requested_by_actor_id, "requested_by_actor_id");
      const idempotencyKey = `docusign-completion:${requestId}:${kind}:${digest}`;
      const uploaded = typeof postgresUpload === "function"
        ? await postgresUpload.call(dmsRuntime.upload_runtime, {
            document,
            bytes,
            actor_id: actorId,
            idempotency_key: idempotencyKey,
            object_id: `object:${versionId}`,
            session_id: `dms-upload:${requestId}:${kind}:${digest}`,
            version_number: 1,
          })
        : uploadDocument({
            repository: dmsRuntime.repository,
            storage: dmsRuntime.storage,
            document,
            bytes,
            actor_id: actorId,
            idempotency_key: idempotencyKey,
          });
      const persistedSha = uploaded?.version?.sha256 ?? uploaded?.storage_receipt?.sha256;
      if (persistedSha !== digest || uploaded?.document?.document_id !== documentId || uploaded?.version?.version_id !== versionId) {
        throw new Error("DMS did not confirm the immutable completion artifact");
      }
      return Object.freeze({
        document_id: documentId,
        version_id: versionId,
        sha256: digest,
        immutable: true,
      });
    },
  });
}

export async function handleDocusignWebhook({ headers = {}, rawBody, requestId, runtime, preflightError = null } = {}) {
  if (preflightError?.status === 413) return blocked(413, requestId, "DOCUSIGN_WEBHOOK_BODY_TOO_LARGE");
  if (preflightError) return blocked(400, requestId, "DOCUSIGN_WEBHOOK_BODY_INVALID");
  const eventService = runtime?.event_service ?? runtime?.events;
  if (!eventService || typeof eventService.processWebhook !== "function") {
    return blocked(503, requestId, "DOCUSIGN_RUNTIME_UNAVAILABLE");
  }
  try {
    const result = await eventService.processWebhook({ headers, raw_body: rawBody });
    return response(202, {
      request_id: requestId,
      outcome: result.outcome,
      state: result.request?.state ?? null,
      safe_error_codes: result.safe_error_code ? [result.safe_error_code] : [],
      provider_payload_returned: false,
      production_ready_claim: false,
    });
  } catch (error) {
    if (error?.status === 503) return blocked(503, requestId, error.safe_error_code ?? "DOCUSIGN_RUNTIME_UNAVAILABLE");
    if (error?.status === 413) return blocked(413, requestId, "DOCUSIGN_WEBHOOK_BODY_TOO_LARGE");
    if (error?.status === 400) return blocked(400, requestId, "DOCUSIGN_WEBHOOK_BODY_INVALID");
    return blocked(401, requestId, "DOCUSIGN_WEBHOOK_REJECTED");
  }
}

export async function handleDocusignOutlookRead({ method, pathname, query = {}, principal, requestId, runtime } = {}) {
  if (!isDocusignOutlookRead(method, pathname)) return blocked(404, requestId, "DOCUSIGN_ROUTE_NOT_FOUND");
  const envelopeService = runtime?.envelope_service ?? runtime?.outbox;
  if (!envelopeService || typeof envelopeService.listRequests !== "function" || typeof runtime?.authorizeMatter !== "function") {
    return blocked(503, requestId, "DOCUSIGN_RUNTIME_UNAVAILABLE");
  }
  let matterId;
  try {
    matterId = requiredText(query.matter_id, "matter_id");
  } catch {
    return blocked(400, requestId, "DOCUSIGN_MATTER_REQUIRED");
  }
  const serverPrincipal = Object.freeze({
    tenant_id: requiredText(principal?.tenant_id, "principal.tenant_id"),
    actor_id: requiredText(principal?.user_id ?? principal?.actor_id, "principal.actor_id"),
  });
  const authorized = await runtime.authorizeMatter({
    principal: serverPrincipal,
    matter_id: matterId,
    action: "docusign:request:read",
  });
  if (authorized !== true && authorized?.allowed !== true) return blocked(403, requestId, "DOCUSIGN_MATTER_ACCESS_DENIED");
  const items = envelopeService.listRequests({ principal: serverPrincipal, matter_id: matterId });
  return response(200, {
    request_id: requestId,
    outcome: "ok",
    items,
    provider_credentials_returned: false,
    provider_payload_returned: false,
    production_ready_claim: false,
  });
}
