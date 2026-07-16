const EVIDENCE_ENV = "LAWOS_DOMAIN_RECEIPT_EVIDENCE";
const EVIDENCE_PREFIX = "DOMAIN_RECEIPT_EVIDENCE";

export function reportDomainReceiptEvidence({
  source,
  imported,
  secondImport,
  shadow,
  rehearsal,
} = {}) {
  if (process.env[EVIDENCE_ENV] !== "1") return;

  const row = {
    domain_id: source.domain_id,
    import_receipt: {
      status: imported.receipt.status,
      rejected_count: imported.receipt.rejected_count,
      second_import_replayed: secondImport.replayed,
      rollback_cutoff: imported.receipt.rollback_cutoff,
      source_hash: imported.receipt.source_hash,
      snapshot_hash: imported.receipt.snapshot_hash,
      source_count: imported.receipt.source_count,
      target_count: imported.receipt.target_count,
      invariant_hash: imported.receipt.invariant_hash,
      receipt_id: imported.receipt.receipt_id,
    },
    shadow_receipt: {
      status: shadow.receipt.status,
      difference_count: shadow.receipt.difference_count,
      source_count: shadow.receipt.source_count,
      target_count: shadow.receipt.target_count,
      invariant_hash: shadow.receipt.invariant_hash,
      source_hash: shadow.receipt.source_hash,
      target_hash: shadow.receipt.target_hash,
      receipt_id: shadow.receipt.receipt_id,
    },
    rehearsal_receipt: {
      status: rehearsal.status,
      rollback_cutoff: rehearsal.rollback_cutoff,
      production_migrated: rehearsal.production_migrated,
      smoke_hash: rehearsal.smoke_hash,
      receipt_id: rehearsal.receipt_id,
    },
  };
  console.log(`${EVIDENCE_PREFIX} ${JSON.stringify(row)}`);
}
