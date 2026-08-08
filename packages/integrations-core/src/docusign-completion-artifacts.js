import { docusignFailure, docusignInfrastructureFailure, docusignNow, docusignRequiredText, projectDocusignRequestSafe } from "./docusign-envelope-model.js";
import { docusignRawBytes, docusignSha256 } from "./docusign-event-model.js";

function validateArtifact(receipt, expectedSha256) {
  if (receipt?.immutable !== true || docusignRequiredText(receipt?.sha256, "artifact sha256").toLowerCase() !== expectedSha256) {
    throw docusignInfrastructureFailure("DOCUSIGN_COMPLETION_ARTIFACT_NOT_IMMUTABLE");
  }
  return Object.freeze({
    document_id: docusignRequiredText(receipt.document_id, "artifact document_id"),
    version_id: docusignRequiredText(receipt.version_id, "artifact version_id"),
    sha256: expectedSha256,
    immutable: true,
  });
}

async function updateRequest(repository, request, mutate) {
  return repository.transact({ tenant_id: request.tenant_id }, (state) => {
    const index = state.requests.findIndex((item) => item.tenant_id === request.tenant_id && item.request_id === request.request_id);
    if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
    state.requests[index] = mutate(state.requests[index]);
    return state.requests[index];
  });
}

export async function completeDocusignArtifacts({ repository, request, connection, adapter, artifactStore, clock }) {
  if (request.state === "completed") return Object.freeze({ outcome: "completed", request: projectDocusignRequestSafe(request) });
  if (request.state !== "completed_artifacts_pending") return Object.freeze({ outcome: "ignored", request: projectDocusignRequestSafe(request) });
  const descriptors = [
    { key: "signed_pdf", document_id: "combined", title_suffix: "서명 완료본" },
    { key: "certificate", document_id: "certificate", title_suffix: "서명 인증서" },
  ];
  let current = request;
  try {
    for (const descriptor of descriptors) {
      if (current.completion_artifacts?.[descriptor.key]) continue;
      const bytes = Buffer.from(await adapter.downloadDocument({ connection, envelope_id: current.envelope_id, document_id: descriptor.document_id }) ?? []);
      if (bytes.length === 0) throw docusignInfrastructureFailure("DOCUSIGN_COMPLETION_DOWNLOAD_UNAVAILABLE");
      const digest = docusignSha256(bytes);
      const stored = validateArtifact(await artifactStore.ingest({
        tenant_id: current.tenant_id, matter_id: current.matter_id,
        workspace_id: current.document.workspace_id, permission_envelope_id: current.document.permission_envelope_id,
        audit_trace_id: current.document.audit_trace_id, requested_by_actor_id: current.requested_by_actor_id,
        request_id: current.request_id, envelope_id: current.envelope_id, kind: descriptor.key,
        title: `${current.document.filename} - ${descriptor.title_suffix}.pdf`, mime_type: "application/pdf", bytes, sha256: digest,
      }), digest);
      current = await updateRequest(repository, current, (fresh) => {
        if (fresh.state !== "completed_artifacts_pending") return fresh;
        return { ...fresh, completion_artifacts: { ...fresh.completion_artifacts, [descriptor.key]: stored }, last_safe_error_code: null, updated_at: docusignNow(clock) };
      });
    }
    current = await updateRequest(repository, current, (fresh) => {
      if (fresh.state !== "completed_artifacts_pending" || !fresh.completion_artifacts?.signed_pdf || !fresh.completion_artifacts?.certificate) return fresh;
      return { ...fresh, state: "completed", attempt_phase: "completed", last_safe_error_code: null, updated_at: docusignNow(clock) };
    });
    return Object.freeze({ outcome: current.state === "completed" ? "completed" : "ignored", request: projectDocusignRequestSafe(current) });
  } catch (error) {
    current = await updateRequest(repository, current, (fresh) => fresh.state === "completed_artifacts_pending"
      ? { ...fresh, last_safe_error_code: "DOCUSIGN_COMPLETION_ARTIFACT_PENDING", updated_at: docusignNow(clock) }
      : fresh);
    const safe = docusignInfrastructureFailure("DOCUSIGN_COMPLETION_ARTIFACT_PENDING");
    safe.request = projectDocusignRequestSafe(current);
    throw safe;
  }
}

export function createDocusignWebhookReceiptStore({ storage } = {}) {
  if (!storage || storage.protected !== true || storage.immutable !== true || storage.content_addressed !== true || typeof storage.putObject !== "function" || typeof storage.statObject !== "function") {
    throw new TypeError("protected immutable content-addressed receipt storage is required");
  }
  return Object.freeze({
    async put({ tenant_id, request_id, bytes, sha256: expectedSha256 } = {}) {
      const buffer = docusignRawBytes(bytes);
      const digest = docusignSha256(buffer);
      if (digest !== docusignRequiredText(expectedSha256, "receipt sha256").toLowerCase()) throw docusignInfrastructureFailure("DOCUSIGN_WEBHOOK_RECEIPT_HASH_MISMATCH");
      const objectId = `docusign-connect:${docusignRequiredText(request_id, "request_id")}:${digest}`;
      let receipt;
      try {
        receipt = await storage.statObject({ tenant_id, object_id: objectId }) ?? await storage.putObject({ tenant_id, object_id: objectId, bytes: buffer, content_type: "application/json" });
      } catch { throw docusignInfrastructureFailure("DOCUSIGN_WEBHOOK_RECEIPT_STORAGE_UNAVAILABLE"); }
      if (receipt?.sha256 !== digest || receipt?.immutable !== true || receipt?.tenant_id !== tenant_id || receipt?.object_id !== objectId || receipt?.content_type !== "application/json") {
        throw docusignInfrastructureFailure("DOCUSIGN_WEBHOOK_RECEIPT_HASH_MISMATCH");
      }
      return Object.freeze({ receipt_ref: `docusign-connect-receipt:${digest}`, sha256: digest, immutable: true });
    },
  });
}
