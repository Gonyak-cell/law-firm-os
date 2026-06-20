export function appendMatterTimelineEvent({ repository, event } = {}) {
  return repository.upsert({ ...event, model_type: 'MatterTimelineEvent', raw_storage_path_included: false, document_bytes_included: false });
}

export function listMatterTimelineEvents({ repository, tenant_id, matter_id } = {}) {
  return repository.list({ tenant_id, model_type: 'MatterTimelineEvent', matter_id });
}
