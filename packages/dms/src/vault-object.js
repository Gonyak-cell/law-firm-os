function segment(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim().replace(/[^A-Za-z0-9_.:-]+/g, "-");
}

export function createVaultObjectId({ tenant_id, matter_id, document_id, version_id } = {}) {
  return `vault:${segment(tenant_id, "tenant_id")}:${segment(matter_id, "matter_id")}:${segment(document_id, "document_id")}:${segment(version_id, "version_id")}`;
}

export function assertVaultObjectId(id) {
  if (typeof id !== "string" || !id.startsWith("vault:")) throw new TypeError("VaultObject id must start with vault:");
  const parts = id.split(":");
  if (parts.length < 5) throw new TypeError("VaultObject id must include tenant, matter, document, and version");
  return true;
}

export function createVaultObject(input = {}) {
  const vault_object_id = input.vault_object_id ?? createVaultObjectId(input);
  assertVaultObjectId(vault_object_id);
  return Object.freeze({
    vault_object_id,
    tenant_id: segment(input.tenant_id, "tenant_id"),
    matter_id: segment(input.matter_id, "matter_id"),
    document_id: segment(input.document_id, "document_id"),
    version_id: segment(input.version_id, "version_id"),
    content_hash: segment(input.content_hash, "content_hash"),
    storage_pointer_ref: segment(input.storage_pointer_ref, "storage_pointer_ref"),
    raw_path_exposed: false,
  });
}
