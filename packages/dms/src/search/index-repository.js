export function upsertVaultSearchIndex({ repository, index_row } = {}) {
  return repository.upsert({ ...index_row, model_type: 'DmsSearchIndex' });
}

export function listVaultSearchIndex({ repository, tenant_id, matter_id } = {}) {
  return repository.list({ tenant_id, model_type: 'DmsSearchIndex', matter_id });
}
