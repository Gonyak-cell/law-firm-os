function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function createPartyIdentifierService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("Party identifier service requires repository");

  return Object.freeze({
    create(input) {
      const identifierType = input.identifier_type;
      const identifierValue = normalize(input.identifier_value);
      const duplicate = repository
        .list({ tenant_id: input.tenant_id, model_type: "PartyIdentifier" })
        .find(
          (identifier) =>
            identifier.party_identifier_id !== input.party_identifier_id &&
            identifier.identifier_type === identifierType &&
            normalize(identifier.identifier_value) === identifierValue,
        );
      if (duplicate) {
        const error = new Error("PartyIdentifier identifier_type/value must be unique per tenant");
        error.safe_error_code = "MASTER_DATA_PARTY_IDENTIFIER_DUPLICATE";
        throw error;
      }
      return repository.create({ ...input, model_type: "PartyIdentifier" });
    },
  });
}
