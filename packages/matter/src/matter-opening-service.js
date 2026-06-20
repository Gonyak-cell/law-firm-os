export { openMatterTransaction } from './opening-service.js';
export { openMatterWithVault } from './matter-opening-orchestrator.js';

export function assertClearanceBeforeVaultWorkspace({ clearance_token } = {}) {
  if (!clearance_token || clearance_token.token_state !== 'valid' || clearance_token.outcome !== 'passed') {
    throw new Error('clearance token required before Vault workspace creation');
  }
  return Object.freeze({ clearance_before_vault_workspace: true });
}
