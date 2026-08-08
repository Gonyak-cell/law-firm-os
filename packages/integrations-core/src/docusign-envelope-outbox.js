import { normalizeDocusignConnection } from "./docusign-envelope-adapter.js";
import { bindApprovedDocusignSource, normalizeDocusignAuthorityBinding } from "./docusign-envelope-authority.js";
import {
  docusignAccountBindingRef,
  docusignFailure,
  docusignHash,
  docusignNow,
  docusignRequiredText,
  normalizeDocusignPrincipal,
  normalizeDocusignRequest,
  projectDocusignRequestSafe,
} from "./docusign-envelope-model.js";
import { createDocusignEnvelopeRepository, readDocusignState, requireDocusignRepository } from "./docusign-envelope-repository.js";
import { createDocusignSendExecutor } from "./docusign-envelope-send.js";

export { DOCUSIGN_OUTBOX_SCHEMA_VERSION, DOCUSIGN_REQUEST_STATES, docusignAccountBindingRef, normalizeDocusignOutboxState, projectDocusignRequestSafe } from "./docusign-envelope-model.js";
export { createDocusignEnvelopeRepository } from "./docusign-envelope-repository.js";

function requestPayload({ tenant_id, matter_id, connection_id, document, recipients, anchor_manifest }) {
  return Object.freeze({ tenant_id, matter_id, connection_id, document, recipients, anchor_manifest });
}

function dependencyError(error) {
  if ([400, 401, 403, 404, 409, 503].includes(error?.status)) throw error;
  throw Object.assign(new Error("DocuSign dependency is unavailable"), { safe_error_code: "DOCUSIGN_DEPENDENCY_UNAVAILABLE", status: 503, retryable: true });
}

export function createDocusignEnvelopeService({
  repository = createDocusignEnvelopeRepository(), connectionResolver, approvedDocumentResolver,
  artifactReader, recipientResolver, adapter, clock = () => new Date(),
} = {}) {
  requireDocusignRepository(repository);
  if (typeof connectionResolver !== "function") throw new TypeError("connectionResolver is required");
  if (typeof approvedDocumentResolver !== "function") throw new TypeError("approvedDocumentResolver is required");
  if (typeof artifactReader !== "function") throw new TypeError("artifactReader is required");
  if (typeof recipientResolver !== "function") throw new TypeError("recipientResolver is required");
  if (!adapter || typeof adapter.createDraft !== "function" || typeof adapter.send !== "function") throw new TypeError("DocuSign envelope adapter is required");

  const sendApprovedRequest = createDocusignSendExecutor({ repository, connectionResolver, artifactReader, recipientResolver, adapter, clock });
  return Object.freeze({
    repository,
    async queueApprovedRequest(input = {}) {
      const principal = normalizeDocusignPrincipal(input.principal);
      const tenantId = docusignRequiredText(input.tenant_id, "tenant_id");
      const matterId = docusignRequiredText(input.matter_id, "matter_id");
      if (principal.tenant_id !== tenantId) throw docusignFailure("DOCUSIGN_TENANT_MISMATCH", "Tenant does not match server principal", 403);
      if (input.explicit_human_action !== true) throw docusignFailure("DOCUSIGN_EXPLICIT_QUEUE_REQUIRED", "Explicit human queue action is required", 400);
      if (input.document !== undefined || input.recipients !== undefined || input.anchor_manifest !== undefined) throw docusignFailure("DOCUSIGN_AUTHORITATIVE_SOURCE_REQUIRED", "Approved server source is required", 400);
      const binding = normalizeDocusignAuthorityBinding(input.authority_binding);
      if (binding.tenant_id !== tenantId || binding.matter_id !== matterId || binding.artifact_id !== docusignRequiredText(input.approved_artifact_id, "approved_artifact_id")) {
        throw docusignFailure("DOCUSIGN_APPROVED_SOURCE_MISMATCH", "Authenticated authority binding did not match request", 409);
      }
      let approvedSource;
      try {
        approvedSource = await approvedDocumentResolver({ ...binding });
      } catch (error) { dependencyError(error); }
      const source = bindApprovedDocusignSource({ binding, source: approvedSource });
      const connectionId = docusignRequiredText(input.connection_id, "connection_id");
      let connection;
      try {
        connection = normalizeDocusignConnection(await connectionResolver({ tenant_id: tenantId, connection_id: connectionId }));
      } catch (error) { dependencyError(error); }
      if (connection.tenant_id !== tenantId || connection.connection_id !== connectionId) throw docusignFailure("DOCUSIGN_CONNECTION_SCOPE_INVALID", "DocuSign connection scope does not match request", 403);
      const payload = requestPayload({ tenant_id: tenantId, matter_id: matterId, connection_id: connectionId, document: source.document, recipients: source.recipients, anchor_manifest: source.anchor_manifest });
      const payloadSha256 = docusignHash(payload);
      const idempotencyKey = docusignRequiredText(input.idempotency_key, "idempotency_key");
      return repository.transact({ tenant_id: tenantId }, (state) => {
        const replay = state.requests.find((request) => request.tenant_id === tenantId && request.idempotency_key === idempotencyKey);
        if (replay) {
          if (replay.payload_sha256 !== payloadSha256) throw docusignFailure("DOCUSIGN_IDEMPOTENCY_CONFLICT", "Idempotency key payload changed");
          return Object.freeze({ outcome: "replayed", request: projectDocusignRequestSafe(replay) });
        }
        const active = state.requests.find((request) => request.tenant_id === tenantId && request.active_fingerprint === payloadSha256);
        if (active) return Object.freeze({ outcome: "replayed", request: projectDocusignRequestSafe(active) });
        const createdAt = docusignNow(clock);
        const requestId = docusignRequiredText(input.request_id, "request_id");
        const request = normalizeDocusignRequest({
          request_id: requestId, tenant_id: tenantId, matter_id: matterId, connection_id: connectionId,
          account_binding_ref: docusignAccountBindingRef(connection), document: source.document,
          recipient_snapshot: source.recipients, anchor_manifest: source.anchor_manifest,
          idempotency_key: idempotencyKey, payload_sha256: payloadSha256,
          provider_correlation_ref: `docusign-correlation:${docusignHash({ request_id: requestId, payload_sha256: payloadSha256 })}`,
          requested_by_actor_id: principal.actor_id, state: "approved", completion_artifacts: {}, event_hashes: [], created_at: createdAt, updated_at: createdAt,
        });
        state.requests.push(request);
        return Object.freeze({ outcome: "created", request: projectDocusignRequestSafe(request) });
      });
    },
    sendApprovedRequest,
    async listRequests({ principal, matter_id } = {}) {
      const serverPrincipal = normalizeDocusignPrincipal(principal);
      const matterId = matter_id == null ? null : docusignRequiredText(matter_id, "matter_id");
      const state = await readDocusignState(repository, serverPrincipal.tenant_id);
      return Object.freeze(state.requests.filter((request) => request.tenant_id === serverPrincipal.tenant_id).filter((request) => !matterId || request.matter_id === matterId).map(projectDocusignRequestSafe));
    },
  });
}
