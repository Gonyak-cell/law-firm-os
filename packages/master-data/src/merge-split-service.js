export function createPartyMergeSplitService({ repository } = {}) {
  if (!repository || typeof repository.transaction !== "function") throw new TypeError("Merge/split service requires transactional repository");

  return Object.freeze({
    mergeParties({ tenant_id, source_party_id, target_party_id, reason } = {}) {
      return repository.transaction((tx) => {
        const source = tx.get({ tenant_id, model_type: "Party", id: source_party_id });
        const target = tx.get({ tenant_id, model_type: "Party", id: target_party_id });
        if (!source) throw new ReferenceError(`source Party not found: ${source_party_id}`);
        if (!target) throw new ReferenceError(`target Party not found: ${target_party_id}`);
        const merged = tx.update(
          { tenant_id, model_type: "Party", id: source_party_id },
          {
            status: "archived",
            canonical_entity_id: target.canonical_entity_id ?? target.party_id,
            audit_hint_ref: reason ?? "party_merge",
          },
        );
        return Object.freeze({ source: merged, target, merged_into_party_id: target_party_id });
      });
    },

    splitParty({ tenant_id, source_party_id, new_party } = {}) {
      return repository.transaction((tx) => {
        const source = tx.get({ tenant_id, model_type: "Party", id: source_party_id });
        if (!source) throw new ReferenceError(`source Party not found: ${source_party_id}`);
        const created = tx.create({ ...new_party, tenant_id, model_type: "Party" });
        return Object.freeze({ source, created });
      });
    },
  });
}
