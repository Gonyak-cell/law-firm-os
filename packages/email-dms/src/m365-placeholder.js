const SECRET_FIELDS = Object.freeze(["access_token", "refresh_token", "client_secret", "password"]);

export function createM365ConnectorPlaceholder(config = {}) {
  for (const field of SECRET_FIELDS) {
    if (config[field]) throw new TypeError(`M365 placeholder accepts credential_ref only, not ${field}`);
  }
  if (!config.credential_ref) throw new TypeError("credential_ref is required");
  return Object.freeze({
    connector_id: config.connector_id ?? "m365-placeholder",
    credential_ref: config.credential_ref,
    provider: "microsoft-365",
    credential_material_included: false,
    runtime_enabled: false,
  });
}
