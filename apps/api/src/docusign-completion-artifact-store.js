import { createHash } from "node:crypto";
import { uploadDocument } from "../../../packages/dms/src/document-service.js";
import { bindApprovedDocusignSource, normalizeDocusignAuthorityBinding } from "../../../packages/integrations-core/src/docusign-envelope-authority.js";
import { normalizeCompletionAuthorityExpectation } from "../../../packages/integrations-core/src/docusign-completion-authority.js";

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredAuthority(input, options) {
  const expected = options.expected_authority ?? (options.expected_permission_envelope_id || options.expected_audit_trace_id || options.expected_fencing_generation != null
    ? {
        tenant_id: input.tenant_id,
        matter_id: input.matter_id,
        workspace_id: input.workspace_id,
        request_id: input.request_id,
        kind: input.kind,
        sha256: input.sha256,
        permission_envelope_id: options.expected_permission_envelope_id ?? input.permission_envelope_id,
        audit_trace_id: options.expected_audit_trace_id ?? input.audit_trace_id,
        fencing_generation: options.expected_fencing_generation ?? options.fencing_generation,
        idempotency_key: options.idempotency_key,
        object_id: options.object_id,
      }
    : null);
  if (!expected) throw new Error("DocuSign completion authority expectation is required");
  return normalizeCompletionAuthorityExpectation(expected);
}

function assertReceipt(receipt, input, digest, documentId, versionId) {
  if (receipt?.sha256 !== digest || receipt?.document_id !== documentId || receipt?.version_id !== versionId || receipt?.immutable !== true) {
    throw new Error("DMS did not confirm the immutable completion artifact");
  }
  for (const field of ["tenant_id", "matter_id", "workspace_id", "permission_envelope_id", "audit_trace_id", "request_id", "envelope_id"]) {
    if (receipt[field] !== input[field]) throw new Error("DMS completion artifact authority does not match the request");
  }
  return receipt;
}

export function createDocusignCompletionArtifactStore({ dmsRuntime, approvedDocumentResolver, authorityRepository } = {}) {
  const postgresUpload = dmsRuntime?.upload_runtime?.uploadDocument;
  const localUpload = dmsRuntime?.repository && dmsRuntime?.storage;
  const authority = authorityRepository ?? dmsRuntime?.docusign_repository ?? dmsRuntime?.authority_repository;
  if (typeof approvedDocumentResolver !== "function") throw new TypeError("approvedDocumentResolver is required for completion artifacts");
  if (!authority || typeof authority.validateCompletionAuthority !== "function" || typeof authority.readCompletionAuthority !== "function") throw new TypeError("DocuSign completion authority repository is required");
  if (typeof postgresUpload !== "function" && !localUpload) throw new TypeError("DMS upload runtime is required for DocuSign completion artifacts");

  const readback = async (input = {}) => {
    const tenantId = requiredText(input.tenant_id, "tenant_id");
    const requestId = requiredText(input.request_id, "request_id");
    const kind = requiredText(input.kind, "kind");
    const digest = requiredText(input.sha256, "sha256").toLowerCase();
    const documentId = `docusign-completion:${requestId}:${kind}`;
    const versionId = `version:${documentId}:1`;
    if (typeof dmsRuntime?.upload_runtime?.getDocumentState === "function") {
      const state = await dmsRuntime.upload_runtime.getDocumentState({ tenant_id: tenantId, document_id: documentId });
      const version = state?.versions?.find((item) => item.version_id === versionId);
      const document = state?.document;
      if (!document || !version || document.tenant_id !== tenantId || document.matter_id !== input.matter_id || document.workspace_id !== input.workspace_id || document.current_version_id !== versionId || (document.latest_sha256 ?? version.sha256) !== digest || version.sha256 !== digest || document.permission_envelope_id !== input.permission_envelope_id || document.audit_trace_id !== input.audit_trace_id) return null;
    } else if (typeof dmsRuntime?.repository?.list === "function") {
      const document = dmsRuntime.repository.list({ tenant_id: tenantId, model_type: "DmsDocument", document_id: documentId })[0];
      const version = dmsRuntime.repository.list({ tenant_id: tenantId, model_type: "DmsDocumentVersion", document_id: documentId }).find((item) => item.version_id === versionId);
      if (!document || !version || document.tenant_id !== tenantId || document.matter_id !== input.matter_id || document.workspace_id !== input.workspace_id || document.current_version_id !== versionId || document.latest_sha256 !== digest || version.sha256 !== digest || document.permission_envelope_id !== input.permission_envelope_id || document.audit_trace_id !== input.audit_trace_id) return null;
    } else return null;
    return Object.freeze({ document_id: documentId, version_id: versionId, sha256: digest, tenant_id: tenantId, matter_id: requiredText(input.matter_id, "matter_id"), workspace_id: requiredText(input.workspace_id, "workspace_id"), permission_envelope_id: requiredText(input.permission_envelope_id, "permission_envelope_id"), audit_trace_id: requiredText(input.audit_trace_id, "audit_trace_id"), request_id: requestId, envelope_id: requiredText(input.envelope_id, "envelope_id"), immutable: true });
  };

  return Object.freeze({
    readback,
    async ingest(input = {}, options = {}) {
      const bytes = Buffer.isBuffer(input.bytes) ? Buffer.from(input.bytes) : Buffer.from(input.bytes ?? []);
      const digest = createHash("sha256").update(bytes).digest("hex");
      if (bytes.length === 0 || digest !== requiredText(input.sha256, "sha256").toLowerCase()) throw new TypeError("DocuSign completion artifact SHA-256 does not match bytes");
      const kind = requiredText(input.kind, "kind");
      if (!new Set(["signed_pdf", "certificate"]).has(kind)) throw new TypeError("completion artifact kind is invalid");
      if (input.mime_type !== "application/pdf") throw new TypeError("completion artifact must be PDF");
      const binding = normalizeDocusignAuthorityBinding(input);
      const requestId = requiredText(input.request_id, "request_id");
      const documentId = `docusign-completion:${requestId}:${kind}`;
      const versionId = `version:${documentId}:1`;
      const actorId = requiredText(input.requested_by_actor_id, "requested_by_actor_id");
      const idempotencyKey = `docusign-completion:${requestId}:${kind}:${digest}`;
      const expected = requiredAuthority({ ...input, sha256: digest }, options);
      if (expected.tenant_id !== binding.tenant_id || expected.matter_id !== binding.matter_id || expected.workspace_id !== binding.workspace_id || expected.permission_envelope_id !== binding.permission_envelope_id || expected.audit_trace_id !== binding.audit_trace_id || expected.request_id !== requestId || expected.kind !== kind || expected.sha256 !== digest || (expected.idempotency_key != null && expected.idempotency_key !== idempotencyKey) || (expected.object_id != null && expected.object_id !== `object:${versionId}`)) throw new Error("DocuSign completion authority expectation does not match DMS input");
      const validateAuthority = async ({ client, phase } = {}) => {
        const current = await authority.readCompletionAuthority({ expected, client });
        const sourceBinding = {
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
        };
        const source = await approvedDocumentResolver({ ...sourceBinding, phase });
        bindApprovedDocusignSource({ binding: sourceBinding, source });
        await authority.validateCompletionAuthority({ expected, client });
      };
      const validateAuthoritySync = () => authority.validateCompletionAuthority({ expected });
      const document = { document_id: documentId, tenant_id: binding.tenant_id, matter_id: binding.matter_id, workspace_id: binding.workspace_id, title: requiredText(input.title, "title"), status: "active", current_version_id: versionId, permission_envelope_id: binding.permission_envelope_id, audit_trace_id: binding.audit_trace_id, mime_type: "application/pdf", source_provider: "docusign", source_request_ref: `docusign-request:${requestId}`, source_artifact_kind: kind };
      const persist = async () => {
        await validateAuthority({});
        const uploaded = typeof postgresUpload === "function"
          ? await postgresUpload.call(dmsRuntime.upload_runtime, { document, bytes, actor_id: actorId, idempotency_key: idempotencyKey, object_id: `object:${versionId}`, session_id: `dms-upload:${requestId}:${kind}:${digest}`, version_number: 1, beforePersist: async ({ phase, ...context } = {}) => validateAuthority({ phase, ...context }) })
          : uploadDocument({ repository: dmsRuntime.repository, storage: dmsRuntime.storage, document, bytes, actor_id: actorId, idempotency_key: idempotencyKey, beforePersist: ({ phase } = {}) => { validateAuthoritySync({ phase }); } });
        const persistedSha = uploaded?.version?.sha256 ?? uploaded?.storage_receipt?.sha256;
        return assertReceipt({ document_id: uploaded?.version?.document_id ?? uploaded?.document?.document_id, version_id: uploaded?.version?.version_id, sha256: persistedSha, immutable: true, tenant_id: binding.tenant_id, matter_id: binding.matter_id, workspace_id: binding.workspace_id, permission_envelope_id: binding.permission_envelope_id, audit_trace_id: binding.audit_trace_id, request_id: requestId, envelope_id: input.envelope_id }, input, digest, documentId, versionId);
      };
      const stored = typeof postgresUpload === "function"
        ? await persist()
        : await authority.withCompletionAuthority({ expected }, persist);
      return Object.freeze({ document_id: documentId, version_id: versionId, sha256: digest, tenant_id: binding.tenant_id, matter_id: binding.matter_id, workspace_id: binding.workspace_id, permission_envelope_id: binding.permission_envelope_id, audit_trace_id: binding.audit_trace_id, request_id: requestId, envelope_id: requiredText(input.envelope_id, "envelope_id"), immutable: true, ...stored });
    },
  });
}
