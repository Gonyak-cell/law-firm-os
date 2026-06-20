function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createMasterDataDuplicateService({ repository } = {}) {
  if (!repository || typeof repository.list !== "function") throw new TypeError("Duplicate service requires repository");

  return Object.freeze({
    findCandidates({ tenant_id, display_name, identifier_type, identifier_value } = {}) {
      const name = normalize(display_name);
      const identifierValue = normalize(identifier_value);
      const nameMatches = name
        ? repository
            .list({ tenant_id })
            .filter((record) => ["Party", "Person", "Organization", "Entity"].includes(record.model_type))
            .filter((record) => {
              const recordName = normalize(record.display_name);
              return recordName === name || recordName.includes(name) || name.includes(recordName);
            })
        : [];
      const identifierMatches =
        identifier_type && identifierValue
          ? repository
              .list({ tenant_id, model_type: "PartyIdentifier" })
              .filter(
                (identifier) =>
                  identifier.identifier_type === identifier_type &&
                  normalize(identifier.identifier_value) === identifierValue,
              )
          : [];
      return Object.freeze({
        name_candidates: Object.freeze(nameMatches),
        identifier_candidates: Object.freeze(identifierMatches),
      });
    },
  });
}
