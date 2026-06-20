export function applyVaultObjectAcl({ document, permission_envelope_id, object_acl = [] } = {}) {
  if (!document?.document_id) throw new TypeError('document is required');
  if (!permission_envelope_id) throw new TypeError('permission_envelope_id is required');
  return Object.freeze({
    tenant_id: document.tenant_id,
    matter_id: document.matter_id,
    document_id: document.document_id,
    permission_envelope_id,
    object_acl: Object.freeze(object_acl.map((entry) => Object.freeze({ ...entry }))),
    inherited_from_matter: true,
  });
}

export function assertVaultObjectAclDecision({ decision } = {}) {
  if (!decision || !['allow', 'deny', 'review_required'].includes(decision.effect)) {
    throw new Error('Vault object ACL decision is required');
  }
  return true;
}
