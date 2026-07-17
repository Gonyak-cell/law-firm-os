import { DMS_STORAGE_ADAPTER_CONTRACT_VERSION } from "./storage-adapter.js";

const SECRET_FIELDS = Object.freeze(["access_token", "refresh_token", "client_secret", "password"]);

export function createSharePointStorageAdapterPlaceholder(config = {}) {
  for (const field of SECRET_FIELDS) {
    if (config[field]) throw new TypeError(`SharePoint adapter accepts credential_ref only, not ${field}`);
  }
  if (!config.credential_ref) throw new TypeError("credential_ref is required");
  const notConfigured = () => {
    throw new Error("DMS_SHAREPOINT_ADAPTER_NOT_CONFIGURED");
  };
  return Object.freeze({
    adapter_id: config.adapter_id ?? "sharepoint-placeholder",
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities: Object.freeze({ staged_uploads: false, digest_verification: false, orphan_cleanup: false, provider_retention: false, conditional_delete: false }),
    provider: "sharepoint-onedrive",
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
