function requireExisting(repository, tenantId, modelType, id, label) {
  if (!id) return undefined;
  const record = repository.get({ tenant_id: tenantId, model_type: modelType, id });
  if (!record) throw new ReferenceError(`${label} not found: ${id}`);
  return record;
}

export function createClientGroupService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("ClientGroup service requires repository");

  return Object.freeze({
    create(input) {
      for (const entityId of input.member_entity_ids ?? []) {
        requireExisting(repository, input.tenant_id, "Entity", entityId, "ClientGroup member entity");
      }
      for (const partyId of input.member_party_ids ?? []) {
        requireExisting(repository, input.tenant_id, "Party", partyId, "ClientGroup member party");
      }
      if (input.primary_party_id && !(input.member_party_ids ?? []).includes(input.primary_party_id)) {
        throw new TypeError("ClientGroup primary_party_id must be included in member_party_ids");
      }
      requireExisting(repository, input.tenant_id, "Party", input.primary_party_id, "ClientGroup primary party");
      return repository.create({ ...input, model_type: "ClientGroup" });
    },
  });
}
