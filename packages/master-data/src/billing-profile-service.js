function requireExisting(repository, tenantId, modelType, id, label) {
  if (!id) return undefined;
  const record = repository.get({ tenant_id: tenantId, model_type: modelType, id });
  if (!record) throw new ReferenceError(`${label} not found: ${id}`);
  return record;
}

export function createBillingProfileService({ repository } = {}) {
  if (!repository || typeof repository.create !== "function") throw new TypeError("BillingProfile service requires repository");

  return Object.freeze({
    create(input) {
      requireExisting(repository, input.tenant_id, "Entity", input.billing_entity_id, "Billing entity");
      requireExisting(repository, input.tenant_id, "ClientGroup", input.client_group_id, "ClientGroup");
      requireExisting(repository, input.tenant_id, "Party", input.legal_client_party_id, "Legal client party");
      requireExisting(repository, input.tenant_id, "Party", input.billing_client_party_id, "Billing client party");
      if (!input.legal_client_party_id || !input.billing_client_party_id) {
        throw new TypeError("BillingProfile requires legal_client_party_id and billing_client_party_id");
      }
      return repository.create({ ...input, model_type: "BillingProfile" });
    },
  });
}
