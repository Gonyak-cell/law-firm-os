import { createVaultObjectEnvelope, readHrxVaultEnvelope } from "../../dms/src/vault-service.js";

export function fileHrDocumentToVault({ document, principal, audit } = {}) {
  if (document?.owning_context !== "HRX") {
    return Object.freeze({
      outcome: "blocked",
      safe_error_code: "DMS_HR_DOCUMENT_CONTEXT_REQUIRED",
    });
  }
  const envelope = createVaultObjectEnvelope({
    tenant_id: document.tenant_id,
    vault_object_id: document.vault_object_id,
    document_id: document.document_id,
    owning_context: "HRX",
    content_hash: document.content_hash,
    size_bytes: document.size_bytes ?? 0,
    content_type: document.content_type,
    storage_ref: document.storage_ref,
  });
  return readHrxVaultEnvelope({ envelope, principal, audit });
}
