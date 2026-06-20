export const MATTER_VAULT_MATTER_ROUTES = Object.freeze([
  'POST /api/matters',
  'POST /api/matters/openings',
  'GET /api/matters/:id/command-center',
  'GET /api/matters/:id/vault-summary',
  'GET /api/matters/:id/timeline',
  'POST /api/matters/:id/documents',
]);

export const MATTER_ROUTES_IMPLEMENTED_IN = 'apps/api/src/matter-runtime-context.js';
