export const MATTER_VAULT_VAULT_ROUTES = Object.freeze([
  'POST /api/vault/workspaces',
  'POST /api/vault/folders',
  'POST /api/vault/documents/upload',
  'POST /api/vault/documents/:document_id/versions',
  'GET /api/vault/file-objects/:file_object_id/download',
  'POST /api/vault/documents/:document_id/checkout-locks',
  'POST /api/vault/documents/:document_id/privilege-label',
  'POST /api/vault/documents/:document_id/legal-hold',
  'POST /api/vault/search',
]);

export const VAULT_ROUTES_REPO_NATIVE_RUNTIME = 'apps/api/src/vault-dms-runtime-context.js';
