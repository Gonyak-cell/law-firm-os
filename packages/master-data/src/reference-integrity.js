export function validateMasterDataReferences(repository, { tenant_id, references = [] } = {}) {
  if (!repository || typeof repository.get !== "function") throw new TypeError("reference integrity requires repository");
  const stale = [];
  for (const reference of references) {
    const record = repository.get({
      tenant_id,
      model_type: reference.model_type,
      id: reference.id,
    });
    if (!record) stale.push(Object.freeze({ ...reference, reason: "not_found" }));
  }
  return Object.freeze({
    ok: stale.length === 0,
    stale_references: Object.freeze(stale),
  });
}

export function assertMasterDataReferences(repository, input = {}) {
  const validation = validateMasterDataReferences(repository, input);
  if (!validation.ok) {
    const error = new ReferenceError("stale Master Data reference blocked");
    error.safe_error_code = "MASTER_DATA_STALE_REFERENCE";
    error.stale_references = validation.stale_references;
    throw error;
  }
  return validation;
}
