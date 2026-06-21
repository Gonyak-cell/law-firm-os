export function assertLegalHoldAllowsAction({ document, action } = {}) {
  const blocked = new Set(['delete', 'share', 'export']);
  if ((document?.legal_hold_id || document?.legal_hold_status === 'active') && blocked.has(action)) {
    throw new Error('legal hold blocks delete/share/export');
  }
  return true;
}
