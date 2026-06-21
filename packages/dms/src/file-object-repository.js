export function getFileObject({ repository, tenant_id, file_object_id } = {}) {
  return repository.get({ tenant_id, model_type: 'DmsFileObject', file_object_id });
}

export function putFileObject({ repository, file_object } = {}) {
  return repository.upsert({ ...file_object, model_type: 'DmsFileObject' });
}
