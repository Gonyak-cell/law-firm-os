export { createWorkspaceForMatter as createVaultWorkspaceForMatter } from './workspace-service.js';

export function assertMatterScopedWorkspace(workspace = {}) {
  if (!workspace.matter_id) throw new Error('Matter-scoped Vault workspace requires matter_id');
  if (workspace.status !== 'active') throw new Error('Matter-scoped Vault workspace must be active after opening');
  return Object.freeze({ matter_scoped_workspace: true, workspace_id: workspace.workspace_id });
}
