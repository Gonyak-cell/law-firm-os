export function getDocument({ repository, tenant_id, document_id } = {}) {
  return repository.get({ tenant_id, model_type: 'DmsDocument', document_id });
}

export function listDocumentsByMatter({ repository, tenant_id, matter_id } = {}) {
  return repository.list({ tenant_id, model_type: 'DmsDocument', matter_id });
}

export function putDocument({ repository, document } = {}) {
  return repository.upsert({ ...document, model_type: 'DmsDocument' });
}
