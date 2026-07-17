import { DMS_STORAGE_ADAPTER_CONTRACT_VERSION } from "./storage-adapter.js";

const SECRET_FIELDS = Object.freeze(["access_key", "secret_key", "session_token", "password", "client_secret"]);

export function createS3StorageAdapterPlaceholder(config = {}) {
  for (const field of SECRET_FIELDS) {
    if (config[field]) throw new TypeError(`S3 adapter accepts credential_ref only, not ${field}`);
  }
  if (!config.credential_ref) throw new TypeError("credential_ref is required");
  const notConfigured = () => {
    throw new Error("DMS_S3_ADAPTER_NOT_CONFIGURED");
  };
  return Object.freeze({
    adapter_id: config.adapter_id ?? "s3-placeholder",
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities: Object.freeze({ staged_uploads: false, digest_verification: false, orphan_cleanup: false, provider_retention: false, conditional_delete: false }),
    provider: "s3",
    credential_ref: config.credential_ref,
    secret_material_exposed: false,
    stageObject: notConfigured,
    statStagedObject: notConfigured,
    finalizeObject: notConfigured,
    deleteOrphan: notConfigured,
    digestObject: notConfigured,
    deleteCommittedObject: notConfigured,
    putObject: notConfigured,
    getObject: notConfigured,
    statObject: notConfigured,
  });
}
