function decision(kind, operationId) {
  return Object.freeze({
    effect: "allow",
    decision_ref: `vault-export-${kind}:${operationId}`,
  });
}

function decisions(operationId) {
  return Object.freeze({
    permission: decision("permission", operationId),
    ethical_wall: decision("ethical-wall", operationId),
    records: decision("records", operationId),
    dlp: decision("dlp", operationId),
  });
}

function exactVersion({ document, version, fileObject }) {
  return Object.freeze({
    document_id: document.document_id,
    version_id: version.version_id,
    file_object_id: fileObject.file_object_id,
    sha256: version.sha256,
    byte_size: Number(fileObject.byte_size),
    mime_type: fileObject.mime_type,
  });
}

function sameExact(left, right) {
  return [
    "document_id",
    "version_id",
    "file_object_id",
    "sha256",
    "byte_size",
    "mime_type",
  ].every((field) => left?.[field] === right?.[field]);
}

export function createTestAmicVaultExportProvider({
  repository,
  storage,
  tenantId,
  actorId = "user_amic_jwsuh",
  now = Date.now,
} = {}) {
  const calls = [];
  const grants = new Map();
  const authorityRef = "amic-vault-api:test-export-revision-1";
  const providerRevision = "amic-vault-source:5a04cc31";

  return Object.freeze({
    authority_kind: "amic-vault-api",
    calls,
    grants,
    async authorizeExactExport(input) {
      calls.push(Object.freeze({ method: "authorizeExactExport", input }));
      const requested = input.requested_exact_version;
      const document = repository.get({
        tenant_id: tenantId,
        model_type: "DmsDocument",
        document_id: requested.document_id,
      });
      const version = repository.get({
        tenant_id: tenantId,
        model_type: "DmsDocumentVersion",
        version_id: requested.version_id,
      });
      const fileObject = repository.get({
        tenant_id: tenantId,
        model_type: "DmsFileObject",
        file_object_id: requested.file_object_id,
      });
      if (!document
          || !version
          || !fileObject
          || version.document_id !== document.document_id
          || version.file_object_id !== fileObject.file_object_id
          || document.matter_id !== `vault-${input.lawos_matter_id}`) {
        throw Object.assign(new Error("test Vault exact export target unavailable"), {
          safe_error_code: "VAULT_EXPORT_TARGET_DENIED",
          status: 403,
        });
      }
      const exact = exactVersion({ document, version, fileObject });
      if (!sameExact(exact, requested)) {
        throw Object.assign(new Error("test Vault exact export target changed"), {
          safe_error_code: "VAULT_EXPORT_EXACT_VERSION_MISMATCH",
          status: 409,
        });
      }
      const providerExportRef = `vault-export:${input.operation_id}`;
      const authorization = Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: providerRevision,
        state: "authorized",
        provider_export_ref: providerExportRef,
        expires_at: new Date(now() + 45_000).toISOString(),
        exact_version: exact,
        attachment_name: document.filename,
        decisions: decisions(input.operation_id),
        audit: Object.freeze({
          event_id: `vault-export-authorized:${input.operation_id}`,
          correlation_id: input.correlation_id,
        }),
      });
      const current = grants.get(providerExportRef);
      if (current && !sameExact(current.authorization.exact_version, exact)) {
        throw Object.assign(new Error("test Vault export grant conflict"), {
          safe_error_code: "VAULT_OPERATION_IDEMPOTENCY_CONFLICT",
          status: 409,
        });
      }
      if (!current) grants.set(providerExportRef, {
        state: "authorized",
        authorization,
        objectId: fileObject.vault_object_id,
        lawosMatterId: input.lawos_matter_id,
        installationRefSha256: input.installation_ref_sha256,
        composeTargetSha256: input.compose_target_sha256,
        operationId: input.operation_id,
        correlationId: input.correlation_id,
      });
      return current?.authorization ?? authorization;
    },
    async downloadExactExport(input) {
      calls.push(Object.freeze({ method: "downloadExactExport", input }));
      const grant = grants.get(input.authorization.provider_export_ref);
      if (!grant
          || grant.state !== "authorized"
          || grant.operationId !== input.operation.operation_id
          || grant.lawosMatterId !== input.lawos_matter_id
          || grant.installationRefSha256 !== input.installation_ref_sha256
          || grant.composeTargetSha256 !== input.compose_target_sha256) {
        throw Object.assign(new Error("test Vault export grant already consumed"), {
          safe_error_code: "VAULT_EXPORT_ALREADY_CONSUMED",
          status: 409,
        });
      }
      if (Date.parse(grant.authorization.expires_at) <= now()) {
        throw Object.assign(new Error("test Vault export grant expired"), {
          safe_error_code: "VAULT_EXPORT_GRANT_EXPIRED",
          status: 410,
        });
      }
      grant.state = "downloaded";
      const object = storage.getObject({
        tenant_id: tenantId,
        object_id: grant.objectId,
      });
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: providerRevision,
        state: "downloaded",
        provider_export_ref: grant.authorization.provider_export_ref,
        exact_version: grant.authorization.exact_version,
        attachment_name: grant.authorization.attachment_name,
        body: object.bytes,
        audit: Object.freeze({
          event_id: `vault-export-downloaded:${grant.operationId}`,
          correlation_id: grant.correlationId,
        }),
      });
    },
    async readbackExactExport(input) {
      calls.push(Object.freeze({ method: "readbackExactExport", input }));
      const grant = grants.get(input.authorization.provider_export_ref);
      if (!grant
          || !new Set(["downloaded", "consumed"]).has(grant.state)
          || grant.lawosMatterId !== input.lawos_matter_id
          || grant.installationRefSha256 !== input.installation_ref_sha256
          || grant.composeTargetSha256 !== input.compose_target_sha256) {
        throw Object.assign(new Error("test Vault export download was not observed"), {
          safe_error_code: "VAULT_EXPORT_READBACK_INCOMPLETE",
          status: 409,
        });
      }
      const digest = storage.digestObject({ tenant_id: tenantId, object_id: grant.objectId });
      if (digest?.sha256 !== grant.authorization.exact_version.sha256
          || digest?.byte_size !== grant.authorization.exact_version.byte_size) {
        throw Object.assign(new Error("test Vault export readback mismatch"), {
          safe_error_code: "VAULT_EXPORT_EXACT_VERSION_MISMATCH",
          status: 409,
        });
      }
      grant.state = "consumed";
      return Object.freeze({
        authority_kind: "amic-vault-api",
        authority_ref: authorityRef,
        provider_revision: providerRevision,
        state: "consumed",
        provider_export_ref: grant.authorization.provider_export_ref,
        exact_version: grant.authorization.exact_version,
        decisions: decisions(grant.operationId),
        audit: Object.freeze({
          event_id: `vault-export-consumed:${grant.operationId}`,
          correlation_id: grant.correlationId,
        }),
      });
    },
  });
}
