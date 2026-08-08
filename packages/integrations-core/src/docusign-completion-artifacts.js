import { docusignFailure, docusignInfrastructureFailure, docusignNow, docusignRequiredText, normalizeDocusignAuditLineage, projectDocusignRequestSafe } from "./docusign-envelope-model.js";
import { docusignRawBytes, docusignSha256 } from "./docusign-event-model.js";
import { bindApprovedDocusignSource, normalizeDocusignAuthorityBinding } from "./docusign-envelope-authority.js";

function authorityBinding(current) {
  return normalizeDocusignAuthorityBinding({
    tenant_id: current.tenant_id,
    matter_id: current.matter_id,
    workspace_id: current.document.workspace_id,
    artifact_id: current.document.artifact_id,
    document_id: current.document.document_id,
    version_id: current.document.version_id,
    sha256: current.document.sha256,
    approval_receipt_ref: current.document.approval_receipt_ref,
    permission_envelope_id: current.document.permission_envelope_id,
    audit_trace_id: current.document.audit_trace_id,
  });
}

function validateArtifact(receipt, expectedSha256, binding) {
  if (receipt?.immutable !== true || docusignRequiredText(receipt?.sha256, "artifact sha256").toLowerCase() !== expectedSha256) {
    throw docusignInfrastructureFailure("DOCUSIGN_COMPLETION_ARTIFACT_NOT_IMMUTABLE");
  }
  for (const field of ["tenant_id", "matter_id", "workspace_id", "permission_envelope_id", "audit_trace_id", "request_id", "envelope_id"]) {
    if (receipt?.[field] !== binding[field]) throw docusignInfrastructureFailure("DOCUSIGN_COMPLETION_BINDING_INVALID");
  }
  return Object.freeze({
    document_id: docusignRequiredText(receipt.document_id, "artifact document_id"),
    version_id: docusignRequiredText(receipt.version_id, "artifact version_id"),
    sha256: expectedSha256,
    permission_envelope_id: binding.permission_envelope_id,
    audit_trace_id: binding.audit_trace_id,
    immutable: true,
  });
}

function assertCompletionBinding(current) {
  const binding = {
    ...authorityBinding(current),
    request_id: current.request_id,
    envelope_id: current.envelope_id,
  };
  for (const value of Object.values(binding)) docusignRequiredText(value, "completion authority binding");
  for (const entry of current.audit_lineage ?? []) {
    if (entry.audit_trace_id !== binding.audit_trace_id) throw docusignFailure("DOCUSIGN_AUDIT_LINEAGE_CHANGED", "DocuSign audit lineage authority changed", 409);
  }
  return Object.freeze(binding);
}

function assertSameAuthority(expected, current) {
  const expectedBinding = authorityBinding(expected);
  const currentBinding = authorityBinding(current);
  for (const field of Object.keys(expectedBinding)) {
    if (currentBinding[field] !== expectedBinding[field]) {
      const code = field === "permission_envelope_id" ? "DOCUSIGN_PERMISSION_AUTHORITY_CHANGED" : field === "audit_trace_id" ? "DOCUSIGN_AUDIT_LINEAGE_CHANGED" : "DOCUSIGN_COMPLETION_BINDING_INVALID";
      throw docusignFailure(code, "DocuSign completion authority changed", 409);
    }
  }
  const priorLineage = expected.audit_lineage ?? [];
  const currentLineage = current.audit_lineage ?? [];
  if (currentLineage.length < priorLineage.length || priorLineage.some((entry, index) => JSON.stringify(entry) !== JSON.stringify(currentLineage[index]))) throw docusignFailure("DOCUSIGN_AUDIT_LINEAGE_CHANGED", "DocuSign audit lineage changed", 409);
  return currentBinding;
}

async function readCurrentRequest(repository, request) {
  const state = typeof repository.readState === "function"
    ? await repository.readState({ tenant_id: request.tenant_id })
    : typeof repository.loadState === "function" ? repository.loadState() : null;
  const current = state?.requests?.find((item) => item.tenant_id === request.tenant_id && item.request_id === request.request_id);
  if (!current) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
  return current;
}

async function assertApprovedAuthority(current, approvedDocumentResolver) {
  const binding = authorityBinding(current);
  if (typeof approvedDocumentResolver !== "function") return binding;
  const approvedSource = await approvedDocumentResolver({ ...binding });
  const bound = bindApprovedDocusignSource({ binding, source: approvedSource });
  if (bound.authority.permission_envelope_id !== binding.permission_envelope_id || bound.authority.audit_trace_id !== binding.audit_trace_id) throw docusignFailure("DOCUSIGN_APPROVED_SOURCE_MISMATCH", "Approved authority changed", 409);
  return binding;
}

async function beginCompletionOperation(repository, expected, descriptor, clock) {
  return repository.transact({ tenant_id: expected.tenant_id }, (state) => {
    const index = state.requests.findIndex((item) => item.tenant_id === expected.tenant_id && item.request_id === expected.request_id);
    if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
    const current = state.requests[index];
    assertSameAuthority(expected, current);
    if (current.state !== "completed_artifacts_pending") return current;
    if (current.completion_artifacts?.[descriptor.key]) return current;
    const generation = Number(current.completion_operation?.fencing_generation ?? 0) + 1;
    const now = docusignNow(clock);
    state.requests[index] = {
      ...current,
      completion_operation: { kind: `ingest:${descriptor.key}`, permission_envelope_id: current.document.permission_envelope_id, audit_trace_id: current.document.audit_trace_id, fencing_generation: generation, started_at: now, status: "pending" },
      updated_at: now,
    };
    return state.requests[index];
  });
}

async function updateRequest(repository, request, mutate, expectedOperation = null) {
  return repository.transact({ tenant_id: request.tenant_id }, (state) => {
    const index = state.requests.findIndex((item) => item.tenant_id === request.tenant_id && item.request_id === request.request_id);
    if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
    const fresh = state.requests[index];
    assertSameAuthority(request, fresh);
    if (expectedOperation && (fresh.completion_operation?.kind !== expectedOperation.kind || fresh.completion_operation?.fencing_generation !== expectedOperation.fencing_generation)) throw docusignFailure("DOCUSIGN_COMPLETION_FENCE_LOST", "DocuSign completion fence was lost", 409);
    state.requests[index] = mutate(fresh);
    return state.requests[index];
  });
}

export async function completeDocusignArtifacts({ repository, request, connection, adapter, artifactStore, clock, approvedDocumentResolver }) {
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
      // Read the durable request and approved source after download, immediately before
      // preparing the DMS write. Never use the stale event snapshot for this boundary.
      current = await readCurrentRequest(repository, current);
      assertSameAuthority(request, current);
      await assertApprovedAuthority(current, approvedDocumentResolver);
      const binding = assertCompletionBinding(current);
      current = await beginCompletionOperation(repository, current, descriptor, clock);
      current = await readCurrentRequest(repository, current);
      assertSameAuthority(request, current);
      await assertApprovedAuthority(current, approvedDocumentResolver);
      if (current.completion_operation?.kind !== `ingest:${descriptor.key}`) throw docusignFailure("DOCUSIGN_COMPLETION_FENCE_LOST", "DocuSign completion fence was lost", 409);
      const stored = validateArtifact(await artifactStore.ingest({
        ...assertCompletionBinding(current), requested_by_actor_id: current.requested_by_actor_id, kind: descriptor.key,
        title: `${current.document.filename} - ${descriptor.title_suffix}.pdf`, mime_type: "application/pdf", bytes, sha256: digest,
      }), digest, binding);
      current = await updateRequest(repository, current, (fresh) => {
        if (fresh.state !== "completed_artifacts_pending") return fresh;
        const lineage = normalizeDocusignAuditLineage([...(fresh.audit_lineage ?? []), { event: `completion_artifact_recorded:${descriptor.key}`, audit_trace_id: fresh.document.audit_trace_id, actor_id: fresh.requested_by_actor_id, occurred_at: docusignNow(clock) }]);
        return { ...fresh, completion_artifacts: { ...fresh.completion_artifacts, [descriptor.key]: stored }, completion_operation: null, audit_lineage: lineage, last_safe_error_code: null, updated_at: docusignNow(clock) };
      }, current.completion_operation);
    }
    current = await updateRequest(repository, current, (fresh) => {
      if (fresh.state !== "completed_artifacts_pending" || !fresh.completion_artifacts?.signed_pdf || !fresh.completion_artifacts?.certificate) return fresh;
      const lineage = normalizeDocusignAuditLineage([...(fresh.audit_lineage ?? []), { event: "docusign_completed", audit_trace_id: fresh.document.audit_trace_id, actor_id: fresh.requested_by_actor_id, occurred_at: docusignNow(clock) }]);
      return { ...fresh, state: "completed", attempt_phase: "completed", completion_operation: null, audit_lineage: lineage, last_safe_error_code: null, updated_at: docusignNow(clock) };
    });
    return Object.freeze({ outcome: current.state === "completed" ? "completed" : "ignored", request: projectDocusignRequestSafe(current) });
  } catch (error) {
    try {
      current = await updateRequest(repository, current, (fresh) => fresh.state === "completed_artifacts_pending"
        ? { ...fresh, completion_operation: fresh.completion_operation ? { ...fresh.completion_operation, status: "unknown" } : null, last_safe_error_code: "DOCUSIGN_COMPLETION_ARTIFACT_PENDING", updated_at: docusignNow(clock) }
        : fresh);
    } catch {
      // Keep a current-authority mutation fail-closed; a later reconciliation can
      // inspect the durable completion operation without writing the DMS artifact.
    }
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
      if (receipt?.sha256 !== digest || receipt?.immutable !== true || receipt?.tenant_id !== tenant_id || receipt?.object_id !== objectId || receipt?.content_type !== "application/json") throw docusignInfrastructureFailure("DOCUSIGN_WEBHOOK_RECEIPT_HASH_MISMATCH");
      return Object.freeze({ receipt_ref: `docusign-connect-receipt:${digest}`, sha256: digest, immutable: true });
    },
  });
}
