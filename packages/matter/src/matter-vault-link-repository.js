import { createMatterVaultLink } from "./matter-vault-link.js";

export function persistMatterVaultLink({ repository, link } = {}) {
  const record = createMatterVaultLink(link);
  return repository.create(record);
}

export function getMatterVaultLink({ repository, tenant_id, matter_id } = {}) {
  return (
    repository
      .list({ tenant_id, model_type: "MatterVaultLink", matter_id })
      .find((link) => link.status === "active") ?? null
  );
}

export function listMatterVaultLinks({ repository, tenant_id } = {}) {
  return repository.list({ tenant_id, model_type: "MatterVaultLink" });
}
