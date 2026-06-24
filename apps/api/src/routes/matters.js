export const MATTER_VAULT_MATTER_ROUTES = Object.freeze([
  'POST /api/matters',
  'POST /api/matters/openings',
  'GET /api/matters/:id/command-center',
  'GET /api/matters/:id/vault-summary',
  'GET /api/matters/:id/timeline',
  'GET /api/matters/list-views',
  'GET /api/matters/recently-viewed',
  'PATCH /api/matters/:id',
  'POST /api/matters/:id/documents',
  'POST /api/matters/list-views',
  'POST /api/matters/bulk/status-transitions',
  'POST /api/matters/:id/owner-change',
  'POST /api/matters/:id/status-transitions',
  'POST /api/matters/:id/team-members',
  'POST /api/matters/:id/recently-viewed',
]);

export const MATTER_ROUTES_IMPLEMENTED_IN = 'apps/api/src/matter-runtime-context.js';
