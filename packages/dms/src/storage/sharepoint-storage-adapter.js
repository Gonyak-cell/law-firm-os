const SECRET_FIELDS = Object.freeze(["access_token", "refresh_token", "client_secret", "password"]);

export function createSharePointStorageAdapterPlaceholder(config = {}) {
  for (const field of SECRET_FIELDS) {
    if (config[field]) throw new TypeError(`SharePoint adapter accepts credential_ref only, not ${field}`);
  }
  if (!config.credential_ref) throw new TypeError("credential_ref is required");
  return Object.freeze({
    adapter_id: config.adapter_id ?? "sharepoint-placeholder",
    provider: "sharepoint-onedrive",
    credential_ref: config.credential_ref,
    secret_material_exposed: false,
    putObject() {
      throw new Error("DMS_SHAREPOINT_ADAPTER_NOT_CONFIGURED");
    },
    getObject() {
      throw new Error("DMS_SHAREPOINT_ADAPTER_NOT_CONFIGURED");
    },
    statObject() {
      throw new Error("DMS_SHAREPOINT_ADAPTER_NOT_CONFIGURED");
    },
  });
}
