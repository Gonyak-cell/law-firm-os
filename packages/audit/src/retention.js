export function canPurgeAuditEvent({
  retention_expired,
  active_legal_hold,
  chain_verified,
  human_approval,
  export_custody_receipt_required = false,
  export_custody_receipt_present = false,
}) {
  if (active_legal_hold) return { allowed: false, reason: "legal_hold_blocks_purge" };
  if (!retention_expired) return { allowed: false, reason: "retention_not_expired" };
  if (!chain_verified) return { allowed: false, reason: "chain_not_verified" };
  if (export_custody_receipt_required && !export_custody_receipt_present) {
    return { allowed: false, reason: "export_custody_receipt_required" };
  }
  if (!human_approval) return { allowed: false, reason: "human_approval_required" };
  return { allowed: true, reason: "purge_allowed" };
}
