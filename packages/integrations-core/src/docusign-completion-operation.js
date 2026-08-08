import { docusignFailure, docusignNow, normalizeDocusignAuditLineage } from "./docusign-envelope-model.js";

export const COMPLETION_LEASE_MS = 2 * 60 * 1000;

export function completionKind(descriptor) {
  return `ingest:${descriptor.key}`;
}

export function operationLeaseActive(operation, clock) {
  return operation?.lease_expires_at != null && Date.parse(operation.lease_expires_at) > Date.parse(docusignNow(clock));
}

export function operationDescriptor(operation, descriptors) {
  const key = String(operation?.kind ?? "").replace(/^ingest:/u, "");
  return descriptors.find((descriptor) => descriptor.key === key) ?? null;
}

export async function beginCompletionOperation(repository, expected, descriptor, digest, clock, assertSameAuthority) {
  return repository.transact({ tenant_id: expected.tenant_id }, (state) => {
    const index = state.requests.findIndex((item) => item.tenant_id === expected.tenant_id && item.request_id === expected.request_id);
    if (index < 0) throw docusignFailure("DOCUSIGN_REQUEST_NOT_FOUND", "DocuSign request was not found", 404);
    const current = state.requests[index];
    assertSameAuthority(expected, current);
    if (current.state !== "completed_artifacts_pending") return { claimed: false, reason: "state", request: current };
    if (current.completion_artifacts?.[descriptor.key]) return { claimed: false, reason: "already", request: current };
    const existing = current.completion_operation;
    if (existing && operationLeaseActive(existing, clock)) return { claimed: false, reason: "in_progress", request: current };
    const generation = Number(current.completion_operation?.fencing_generation ?? 0) + 1;
    const now = docusignNow(clock);
    const idempotencyKey = `docusign-completion:${current.request_id}:${descriptor.key}:${digest}`;
    const objectId = `object:version:docusign-completion:${current.request_id}:${descriptor.key}:1`;
    state.requests[index] = {
      ...current,
      attempt_phase: "completion_ingesting",
      completion_operation: {
        kind: completionKind(descriptor), permission_envelope_id: current.document.permission_envelope_id,
        audit_trace_id: current.document.audit_trace_id, fencing_generation: generation, started_at: now,
        lease_expires_at: new Date(Date.parse(now) + COMPLETION_LEASE_MS).toISOString(), idempotency_key: idempotencyKey,
        object_id: objectId, sha256: digest, status: "pending",
      },
      updated_at: now,
    };
    return { claimed: true, request: state.requests[index], operation: state.requests[index].completion_operation };
  });
}

export async function markCompletionUnknown(repository, request, operation, clock) {
  if (!operation) return request;
  try {
    return await repository.transact({ tenant_id: request.tenant_id }, (state) => {
      const index = state.requests.findIndex((item) => item.tenant_id === request.tenant_id && item.request_id === request.request_id);
      if (index < 0) return request;
      const fresh = state.requests[index];
      const active = fresh.completion_operation;
      if (!active || active.kind !== operation.kind || active.fencing_generation !== operation.fencing_generation) return fresh;
      const now = docusignNow(clock);
      state.requests[index] = {
        ...fresh,
        completion_operation: { ...active, status: "unknown", lease_expires_at: now },
        attempt_phase: "completion_reconciliation_required",
        last_safe_error_code: "DOCUSIGN_COMPLETION_ARTIFACT_PENDING",
        updated_at: now,
      };
      return state.requests[index];
    });
  } catch {
    return request;
  }
}

export async function readbackCompletionArtifact({ artifactStore, descriptor, digest, binding, operation, validateArtifact }) {
  const receipt = await artifactStore.readback({
    tenant_id: binding.tenant_id,
    matter_id: binding.matter_id,
    workspace_id: binding.workspace_id,
    request_id: binding.request_id,
    envelope_id: binding.envelope_id,
    kind: descriptor.key,
    sha256: digest,
    permission_envelope_id: binding.permission_envelope_id,
    audit_trace_id: binding.audit_trace_id,
    idempotency_key: operation?.idempotency_key ?? `docusign-completion:${binding.request_id}:${descriptor.key}:${digest}`,
    object_id: operation?.object_id ?? `object:version:docusign-completion:${binding.request_id}:${descriptor.key}:1`,
  });
  if (!receipt) return null;
  const expectedDocumentId = `docusign-completion:${binding.request_id}:${descriptor.key}`;
  const expectedVersionId = `version:${expectedDocumentId}:1`;
  if (receipt.document_id !== expectedDocumentId || receipt.version_id !== expectedVersionId) return null;
  return validateArtifact(receipt, digest, binding);
}

export async function persistRecoveredArtifact(repository, current, descriptor, stored, operation, clock, updateRequest) {
  return updateRequest(repository, current, (fresh) => {
    if (fresh.state !== "completed_artifacts_pending" || fresh.completion_artifacts?.[descriptor.key]) return fresh;
    const lineage = normalizeDocusignAuditLineage([...(fresh.audit_lineage ?? []), { event: `completion_artifact_recovered:${descriptor.key}`, audit_trace_id: fresh.document.audit_trace_id, actor_id: fresh.requested_by_actor_id, occurred_at: docusignNow(clock) }]);
    return { ...fresh, completion_artifacts: { ...fresh.completion_artifacts, [descriptor.key]: stored }, completion_operation: null, audit_lineage: lineage, last_safe_error_code: null, updated_at: docusignNow(clock) };
  }, operation);
}
