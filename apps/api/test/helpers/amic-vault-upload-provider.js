import { createHash } from "node:crypto";

import { uploadDocument } from "../../../../packages/dms/src/document-service.js";

function decision(kind, operationId, effect = "allow") {
  return Object.freeze({
    effect,
    decision_ref: `vault-${kind}:${operationId}`,
  });
}

function decisions(operationId) {
  return Object.freeze({
    permission: decision("permission", operationId),
    ethical_wall: decision("ethical-wall", operationId),
    records: decision("records", operationId),
    dlp: decision("dlp", operationId, "deferred"),
  });
}

function exactFromUpload(result) {
  return Object.freeze({
    document_id: result.document.document_id,
    version_id: result.version.version_id,
    file_object_id: result.file_object.file_object_id,
    sha256: result.version.sha256,
    byte_size: Number(result.file_object.byte_size),
    mime_type: result.file_object.mime_type,
  });
}

export function createTestAmicVaultUploadProvider({
  repository,
  storage,
  tenantId,
  actorId = "user_amic_jwsuh",
  now = Date.now,
  readbackStates = ["readback_verified"],
} = {}) {
  const calls = [];
  const commits = new Map();
  const stagedTransfers = new Map();
  const readbackCountByOperation = new Map();
  const authorityRef = "amic-vault-api:test-revision-1";
  const providerRevision = "amic-vault-source:5a04cc31";
  const commitUploaded = (input, method) => {
    calls.push(Object.freeze({ method, input }));
    let committed = commits.get(input.operation.operation_id);
    if (!committed) {
      const documentId = `doc_desktop_${input.operation.operation_id.slice("vaultop_".length)}`;
      const versionId = `version_${documentId}_1`;
      const result = uploadDocument({
        repository,
        storage,
        document: {
          document_id: documentId,
          tenant_id: tenantId,
          matter_id: input.preflight.resolved.vault_matter_id,
          workspace_id: input.preflight.resolved.vault_workspace_id,
          folder_id: input.preflight.resolved.vault_folder_id,
          title: input.file.filename,
          filename: input.file.filename,
          status: "active",
          current_version_id: versionId,
          permission_envelope_id: `perm:${input.preflight.resolved.vault_workspace_id}`,
          audit_trace_id: input.operation.correlation_id,
          mime_type: input.file.mime_type,
        },
        bytes: input.file.bytes,
        actor_id: actorId,
        idempotency_key: input.operation.idempotency_key,
      });
      const exact = exactFromUpload(result);
      committed = Object.freeze({
        exact,
        response: Object.freeze({
          authority_kind: "amic-vault-api",
          authority_ref: authorityRef,
          provider_revision: providerRevision,
          state: "quarantined",
          provider_operation_ref: `vault-upload:${input.operation.operation_id}`,
          accepted: Object.freeze({
            sha256: input.file.sha256,
            byte_size: input.file.byte_size,
            mime_type: input.file.mime_type,
          }),
          exact_version: null,
          retry_after_ms: 1_000,
          audit: Object.freeze({
            event_id: result.audit_event.event_id,
            correlation_id: input.operation.correlation_id,
          }),
        }),
      });
      commits.set(input.operation.operation_id, committed);
    }
    return committed.response;
  };
  return Object.freeze({
    authority_kind: "amic-vault-api",
    calls,
    async preflightUpload(input) {
      calls.push(Object.freeze({ method: "preflightUpload", input }));
      const workspace = repository.list({
        tenant_id: tenantId,
        model_type: "DmsWorkspace",
        matter_id: input.lawos_matter_id,
      }).find((item) => item.status === "active"
        && (input.requested_workspace_id == null
          || item.workspace_id === input.requested_workspace_id));
      if (!workspace) throw Object.assign(new Error("test Vault workspace unavailable"), {
        safe_error_code: "VAULT_PROVIDER_SCOPE_MISMATCH",
        status: 409,
      });
      const folderId = input.requested_folder_id ?? null;
      if (folderId && !repository.list({
        tenant_id: tenantId,
        model_type: "DmsFolder",
        workspace_id: workspace.workspace_id,
      }).some((item) => item.folder_id === folderId && item.status === "active")) {
        throw Object.assign(new Error("test Vault folder unavailable"), {
          safe_error_code: "VAULT_PROVIDER_SCOPE_MISMATCH",
          status: 409,
        });
      }
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: providerRevision,
        preflight_ref: `vault-preflight:${input.operation_id}`,
        expires_at: new Date(now() + 5 * 60 * 1000).toISOString(),
        resolved: Object.freeze({
          vault_tenant_id: tenantId,
          vault_actor_id: actorId,
          vault_matter_id: `vault-${input.lawos_matter_id}`,
          vault_workspace_id: workspace.workspace_id,
          vault_folder_id: folderId,
        }),
        decisions: decisions(input.operation_id),
        audit: Object.freeze({
          event_id: `vault-preflight-audit:${input.operation_id}`,
          correlation_id: input.correlation_id,
        }),
      });
    },
    async commitUpload(input) {
      return commitUploaded(input, "commitUpload");
    },
    async prepareStagedUpload(input) {
      calls.push(Object.freeze({ method: "prepareStagedUpload", input }));
      const transferRef = `vault-transfer:${input.operation.operation_id}`;
      const current = stagedTransfers.get(transferRef);
      const expected = Object.freeze({ ...input.file });
      if (current
          && (current.file.filename !== expected.filename
            || current.file.byte_size !== expected.byte_size
            || current.file.mime_type !== expected.mime_type)) {
        throw Object.assign(new Error("test Vault transfer binding changed"), {
          safe_error_code: "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
          status: 409,
        });
      }
      stagedTransfers.set(transferRef, Object.freeze({
        file: expected,
        bytes: current?.bytes ?? null,
      }));
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: providerRevision,
        state: "transfer_ready",
        transfer_ref: transferRef,
        expires_at: new Date(now() + 60 * 60 * 1000).toISOString(),
        method: "PUT",
        upload_url: `https://vault-upload.example.test/${encodeURIComponent(transferRef)}?X-Amz-Signature=${"a".repeat(64)}`,
        required_headers: Object.freeze({
          "content-length": String(expected.byte_size),
          "content-type": expected.mime_type,
          "if-none-match": "*",
        }),
        file: expected,
        max_upload_bytes: 1024 * 1024 * 1024,
      });
    },
    async acceptStagedUpload({ transferRef, bytes }) {
      const staged = stagedTransfers.get(transferRef);
      const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes ?? []);
      if (!staged || body.byteLength !== staged.file.byte_size) {
        throw new Error("test Vault staged bytes are mismatched");
      }
      stagedTransfers.set(transferRef, Object.freeze({ ...staged, bytes: body }));
    },
    async completeStagedUpload(input) {
      const staged = stagedTransfers.get(input.transfer?.transfer_ref);
      const bytes = staged?.bytes;
      if (!staged
          || !Buffer.isBuffer(bytes)
          || staged.file.filename !== input.file.filename
          || staged.file.byte_size !== input.file.byte_size
          || staged.file.mime_type !== input.file.mime_type
          || createHash("sha256").update(bytes).digest("hex") !== input.file.sha256) {
        throw Object.assign(new Error("test Vault staged upload is incomplete"), {
          safe_error_code: "VAULT_PROVIDER_COMMIT_MISMATCH",
          status: 409,
        });
      }
      return commitUploaded(Object.freeze({
        ...input,
        file: Object.freeze({ ...input.file, bytes }),
      }), "completeStagedUpload");
    },
    async readbackUpload(input) {
      calls.push(Object.freeze({ method: "readbackUpload", input }));
      const count = readbackCountByOperation.get(input.operation.operation_id) ?? 0;
      const state = readbackStates[Math.min(count, readbackStates.length - 1)];
      readbackCountByOperation.set(input.operation.operation_id, count + 1);
      const exact = commits.get(input.operation.operation_id)?.exact;
      const document = repository.get({
        tenant_id: tenantId,
        model_type: "DmsDocument",
        document_id: exact.document_id,
      });
      const version = repository.get({
        tenant_id: tenantId,
        model_type: "DmsDocumentVersion",
        version_id: exact.version_id,
      });
      const fileObject = repository.get({
        tenant_id: tenantId,
        model_type: "DmsFileObject",
        file_object_id: exact.file_object_id,
      });
      const stat = storage.statObject({ tenant_id: tenantId, object_id: fileObject?.vault_object_id });
      const digest = storage.digestObject({ tenant_id: tenantId, object_id: fileObject?.vault_object_id });
      if (!document || !version || !fileObject || !stat || !digest
          || document.current_version_id !== exact.version_id
          || version.sha256 !== exact.sha256
          || fileObject.sha256 !== exact.sha256
          || stat.sha256 !== exact.sha256
          || digest.sha256 !== exact.sha256) {
        throw Object.assign(new Error("test Vault readback mismatch"), {
          safe_error_code: "VAULT_PROVIDER_READBACK_MISMATCH",
          status: 409,
        });
      }
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: providerRevision,
        state,
        provider_operation_ref: input.commit.provider_operation_ref,
        exact_version: new Set(["promoted", "readback_verified"]).has(state) ? exact : null,
        retry_after_ms: state === "readback_verified" ? null : 500,
        decisions: decisions(input.operation.operation_id),
        audit: Object.freeze({
          event_id: `vault-readback-audit:${input.operation.operation_id}`,
          correlation_id: input.operation.correlation_id,
        }),
      });
    },
  });
}
