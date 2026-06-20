function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function dryRunPartyImport({ repository, rows = [] } = {}) {
  if (!repository || typeof repository.list !== "function") throw new TypeError("party import dry-run requires repository");
  const results = rows.map((row, index) => {
    const displayName = normalize(row.display_name);
    const identifierValue = normalize(row.identifier_value);
    const nameDuplicate = repository
      .list({ tenant_id: row.tenant_id })
      .find((record) => ["Party", "Person", "Organization", "Entity"].includes(record.model_type) && normalize(record.display_name) === displayName);
    const identifierDuplicate =
      row.identifier_type && identifierValue
        ? repository
            .list({ tenant_id: row.tenant_id, model_type: "PartyIdentifier" })
            .find(
              (identifier) =>
                identifier.identifier_type === row.identifier_type &&
                normalize(identifier.identifier_value) === identifierValue,
            )
        : undefined;
    const duplicate = Boolean(nameDuplicate || identifierDuplicate);
    return Object.freeze({
      row_index: index,
      import_id: row.import_id ?? `party-import-${index + 1}`,
      outcome: duplicate ? "review_required" : "ready",
      duplicate_candidate_refs: Object.freeze(
        [nameDuplicate, identifierDuplicate]
          .filter(Boolean)
          .map((record) => ({
            model_type: record.model_type,
            id:
              record.party_id ??
              record.person_id ??
              record.organization_id ??
              record.entity_id ??
              record.party_identifier_id,
          })),
      ),
    });
  });
  return Object.freeze({
    outcome: results.some((result) => result.outcome === "review_required") ? "review_required" : "ready",
    writes_product_state: false,
    rows: Object.freeze(results),
  });
}
