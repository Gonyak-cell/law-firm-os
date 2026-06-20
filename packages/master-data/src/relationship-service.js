function endpointAllowed(allowedEntityIds, entityId) {
  return !allowedEntityIds || allowedEntityIds.includes(entityId);
}

export function createRelationshipService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("Relationship service requires repository");

  return Object.freeze({
    create(input) {
      if (input.from_entity_id === input.to_entity_id) {
        throw new TypeError("Relationship cannot point from and to the same entity");
      }
      return repository.create({ ...input, model_type: "Relationship" });
    },
    listForEntity({ tenant_id, entity_id, allowedEntityIds } = {}) {
      return Object.freeze(
        repository
          .list({ tenant_id, model_type: "Relationship" })
          .filter((relationship) => relationship.from_entity_id === entity_id || relationship.to_entity_id === entity_id)
          .filter(
            (relationship) =>
              endpointAllowed(allowedEntityIds, relationship.from_entity_id) &&
              endpointAllowed(allowedEntityIds, relationship.to_entity_id),
          ),
      );
    },
  });
}
