const SECRET_FIELDS = Object.freeze(["access_key", "secret_key", "session_token", "password", "client_secret"]);

export function createS3StorageAdapterPlaceholder(config = {}) {
  for (const field of SECRET_FIELDS) {
    if (config[field]) throw new TypeError(`S3 adapter accepts credential_ref only, not ${field}`);
  }
  if (!config.credential_ref) throw new TypeError("credential_ref is required");
  return Object.freeze({
    adapter_id: config.adapter_id ?? "s3-placeholder",
    provider: "s3",
    credential_ref: config.credential_ref,
    secret_material_exposed: false,
    putObject() {
      throw new Error("DMS_S3_ADAPTER_NOT_CONFIGURED");
    },
    getObject() {
      throw new Error("DMS_S3_ADAPTER_NOT_CONFIGURED");
    },
    statObject() {
      throw new Error("DMS_S3_ADAPTER_NOT_CONFIGURED");
    },
  });
}
