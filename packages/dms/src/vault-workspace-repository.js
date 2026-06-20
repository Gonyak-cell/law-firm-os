export function findWorkspaceByMatter({ repository, tenant_id, matter_id } = {}) {
  return repository.list({ tenant_id, model_type: 'DmsWorkspace', matter_id })[0] ?? null;
}

export function upsertWorkspaceByMatter({ repository, workspace } = {}) {
  const existing = findWorkspaceByMatter({ repository, tenant_id: workspace.tenant_id, matter_id: workspace.matter_id });
  if (existing) return existing;
  return repository.create({ ...workspace, model_type: 'DmsWorkspace' });
}
