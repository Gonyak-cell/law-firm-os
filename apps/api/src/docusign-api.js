import { createHash } from "node:crypto";
import { uploadDocument } from "../../../packages/dms/src/document-service.js";

export const DOCUSIGN_WEBHOOK_PATH = "/api/integrations/docusign/webhook";
export const DOCUSIGN_OUTLOOK_REQUESTS_PATH = "/api/outlook/esign-requests";
const DOCUSIGN_SEND_PATH = /^\/api\/outlook\/esign-requests\/([^/]+)\/send$/u;
const DOCUSIGN_RECONCILE_PATH = /^\/api\/outlook\/esign-requests\/([^/]+)\/reconcile$/u;

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

export function isDocusignOutlookRoute(method, pathname) {
  const verb = String(method ?? "").toUpperCase();
  return (pathname === DOCUSIGN_OUTLOOK_REQUESTS_PATH && ["GET", "POST"].includes(verb))
    || (verb === "POST" && (DOCUSIGN_SEND_PATH.test(pathname) || DOCUSIGN_RECONCILE_PATH.test(pathname)));
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
        tenant_id: document.tenant_id,
        matter_id: document.matter_id,
        workspace_id: document.workspace_id,
        permission_envelope_id: document.permission_envelope_id,
        audit_trace_id: document.audit_trace_id,
        request_id: requestId,
        envelope_id: requiredText(input.envelope_id, "envelope_id"),
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
  const items = await envelopeService.listRequests({ principal: serverPrincipal, matter_id: matterId });
  return response(200, {
    request_id: requestId,
    outcome: "ok",
    items,
    provider_credentials_returned: false,
    provider_payload_returned: false,
    production_ready_claim: false,
  });
}

function routeError(error, requestId) {
  const validation = error instanceof TypeError;
  const status = validation ? 400 : [400, 401, 403, 404, 409, 503].includes(error?.status) ? error.status : 503;
  return blocked(status, requestId, validation ? "DOCUSIGN_REQUEST_INVALID" : error?.safe_error_code ?? "DOCUSIGN_RUNTIME_UNAVAILABLE");
}

async function authorize(runtime, principal, matterId, action) {
  if (typeof runtime?.authorizeMatter !== "function") throw Object.assign(new Error("DocuSign Matter authorization is unavailable"), { status: 503, safe_error_code: "DOCUSIGN_AUTHORIZATION_UNAVAILABLE" });
  const result = await runtime.authorizeMatter({ principal, matter_id: matterId, action });
  if (result !== true && result?.allowed !== true) throw Object.assign(new Error("DocuSign Matter access denied"), { status: 403, safe_error_code: "DOCUSIGN_MATTER_ACCESS_DENIED" });
  return result;
}

export async function handleDocusignOutlookRequest({ method, pathname, query = {}, body = {}, principal, requestId, runtime } = {}) {
  if (!isDocusignOutlookRoute(method, pathname)) return blocked(404, requestId, "DOCUSIGN_ROUTE_NOT_FOUND");
  if (String(method).toUpperCase() === "GET") {
    try { return await handleDocusignOutlookRead({ method, pathname, query, principal, requestId, runtime }); }
    catch (error) { return routeError(error, requestId); }
  }
  const service = runtime?.envelope_service ?? runtime?.outbox;
  if (!service) return blocked(503, requestId, "DOCUSIGN_RUNTIME_UNAVAILABLE");
  const sendMatch = pathname.match(DOCUSIGN_SEND_PATH);
  const reconcileMatch = pathname.match(DOCUSIGN_RECONCILE_PATH);
  if (!sendMatch && !reconcileMatch && runtime?.readiness?.().authority_state === "blocked") {
    return blocked(503, requestId, "DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED");
  }
  try {
    const serverPrincipal = Object.freeze({
      tenant_id: requiredText(principal?.tenant_id, "principal.tenant_id"),
      actor_id: requiredText(principal?.user_id ?? principal?.actor_id, "principal.actor_id"),
    });
    requiredText(body.idempotency_key, "idempotency_key");
    if (body.explicit_human_action !== true) throw Object.assign(new Error("Explicit human action is required"), { status: 400, safe_error_code: "DOCUSIGN_EXPLICIT_ACTION_REQUIRED" });
    if (sendMatch) {
      const requestIdValue = decodeURIComponent(sendMatch[1]);
      const matterId = requiredText(body.matter_id, "matter_id");
      await authorize(runtime, serverPrincipal, matterId, "docusign:request:send");
      if (typeof service.listRequests !== "function") throw Object.assign(new Error("DocuSign request lookup is unavailable"), { status: 503, safe_error_code: "DOCUSIGN_RUNTIME_UNAVAILABLE" });
      const authorizedRequests = await service.listRequests({ principal: serverPrincipal, matter_id: matterId });
      if (!authorizedRequests.some((item) => item.request_id === requestIdValue)) {
        throw Object.assign(new Error("DocuSign request was not found"), { status: 404, safe_error_code: "DOCUSIGN_REQUEST_NOT_FOUND" });
      }
      const result = await service.sendApprovedRequest({ principal: serverPrincipal, request_id: requestIdValue, explicit_human_action: true, action_idempotency_key: body.idempotency_key });
      return response(result.outcome === "in_progress" ? 202 : 200, { request_id: requestId, outcome: result.outcome, item: result.request, safe_error_codes: result.safe_error_code ? [result.safe_error_code] : [], production_ready_claim: false });
    }
    if (reconcileMatch) {
      const requestIdValue = decodeURIComponent(reconcileMatch[1]);
      const matterId = requiredText(body.matter_id, "matter_id");
      await authorize(runtime, serverPrincipal, matterId, "docusign:request:reconcile");
      if (typeof service.listRequests !== "function" || typeof service.reconcileRequest !== "function") throw Object.assign(new Error("DocuSign reconciliation is unavailable"), { status: 503, safe_error_code: "DOCUSIGN_RECONCILIATION_UNAVAILABLE" });
      const authorizedRequests = await service.listRequests({ principal: serverPrincipal, matter_id: matterId });
      if (!authorizedRequests.some((item) => item.request_id === requestIdValue)) throw Object.assign(new Error("DocuSign request was not found"), { status: 404, safe_error_code: "DOCUSIGN_REQUEST_NOT_FOUND" });
      const result = await service.reconcileRequest({ principal: serverPrincipal, request_id: requestIdValue, explicit_human_action: true, action_idempotency_key: body.idempotency_key });
      return response(result.outcome === "in_progress" ? 202 : 200, { request_id: requestId, outcome: result.outcome, item: result.request, safe_error_codes: result.safe_error_code ? [result.safe_error_code] : [], production_ready_claim: false });
    }
    const matterId = requiredText(body.matter_id, "matter_id");
    const authorization = await authorize(runtime, serverPrincipal, matterId, "docusign:request:queue");
    if (!authorization?.authority_binding) throw Object.assign(new Error("Approved document authority is unavailable"), { status: 503, safe_error_code: "DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED" });
    const result = await service.queueApprovedRequest({
      principal: serverPrincipal,
      tenant_id: serverPrincipal.tenant_id,
      matter_id: matterId,
      request_id: requiredText(body.request_id, "request_id"),
      connection_id: requiredText(body.connection_id, "connection_id"),
      approved_artifact_id: requiredText(body.approved_artifact_id, "approved_artifact_id"),
      idempotency_key: body.idempotency_key,
      explicit_human_action: true,
      authority_binding: authorization.authority_binding,
    });
    return response(result.outcome === "created" ? 201 : 200, { request_id: requestId, outcome: result.outcome, item: result.request, safe_error_codes: [], production_ready_claim: false });
  } catch (error) { return routeError(error, requestId); }
}
