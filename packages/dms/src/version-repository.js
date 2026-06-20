export function listVersionsForDocument({ repository, tenant_id, document_id } = {}) {
  return repository.list({ tenant_id, model_type: 'DmsDocumentVersion', document_id });
}

export function putDocumentVersion({ repository, version } = {}) {
  return repository.upsert({ ...version, model_type: 'DmsDocumentVersion' });
}
