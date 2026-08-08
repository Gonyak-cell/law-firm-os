import { durableMimeRows } from "./durable-mime-authority.js";

export function createDmsRepositoryMimeAuthority(repository, { provider } = {}) {
  if (!repository || typeof repository.get !== "function") {
    throw new TypeError("email filing requires a DMS repository authority");
  }
  const hasProviderIntegrity = typeof provider?.statObject === "function" && typeof provider?.digestObject === "function";
  function getDocumentState({ tenant_id: tenantId, document_id: documentId }) {
    const document = repository.get({ tenant_id: tenantId, model_type: "DmsDocument", document_id: documentId });
    const version = document?.current_version_id
      ? repository.get({ tenant_id: tenantId, model_type: "DmsDocumentVersion", version_id: document.current_version_id })
      : null;
    const fileObject = version?.file_object_id
      ? repository.get({ tenant_id: tenantId, model_type: "DmsFileObject", file_object_id: version.file_object_id })
      : null;
    const { matter_id: _versionMatter, ...versionState } = version ?? {};
    const { matter_id: _fileMatter, ...fileObjectRecord } = fileObject ?? {};
    const fileObjectState = fileObjectRecord && !fileObjectRecord.object_id && fileObjectRecord.vault_object_id
      ? { ...fileObjectRecord, object_id: fileObjectRecord.vault_object_id }
      : fileObjectRecord;
    return {
      document,
      versions: version ? [versionState] : [],
      file_objects: fileObject ? [fileObjectState] : [],
      audit_events: typeof repository.listAudit === "function"
        ? repository.listAudit({ tenant_id: tenantId, object_id: documentId })
        : [],
    };
  }
  return Object.freeze({
    getDocumentState,
    async getDocumentIntegrityState(input = {}) {
      if (!hasProviderIntegrity) throw new Error("email filing provider integrity authority is unavailable");
      const state = getDocumentState(input);
      if (!state.document) return null;
      const { fileObject } = durableMimeRows(state);
      const stat = await provider.statObject({ tenant_id: input.tenant_id, object_id: fileObject?.object_id });
      const digest = await provider.digestObject({ tenant_id: input.tenant_id, object_id: fileObject?.object_id });
      const expectedMime = fileObject?.mime_type ?? fileObject?.content_type;
      const providerMime = (value) => value?.mime_type ?? value?.content_type;
      if (
        !stat
        || !digest
        || stat.object_id !== fileObject?.object_id
        || stat.sha256 !== fileObject?.sha256
        || Number(stat.byte_size) !== Number(fileObject?.byte_size)
        || digest.sha256 !== fileObject?.sha256
        || Number(digest.byte_size) !== Number(fileObject?.byte_size)
        || (providerMime(stat) !== undefined && providerMime(stat) !== expectedMime)
        || (providerMime(digest) !== undefined && providerMime(digest) !== expectedMime)
      ) throw new Error("email filing provider integrity conflicts with durable metadata");
      return Object.freeze({
        ...state,
        provider_integrity: Object.freeze({
          object_id: fileObject.object_id,
          sha256: fileObject.sha256,
          byte_size: Number(fileObject.byte_size),
          ...(expectedMime ? { mime_type: expectedMime } : {}),
        }),
      });
    },
  });
}
