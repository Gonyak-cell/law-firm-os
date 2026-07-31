CREATE TABLE IF NOT EXISTS hrx_offboarding_evidence_receipts (
  tenant_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  evidence_ref TEXT NOT NULL,
  offboarding_id TEXT NOT NULL,
  category TEXT NOT NULL,
  subject_ref TEXT NOT NULL,
  state TEXT NOT NULL,
  source_version TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  recorded_by_actor_id TEXT NOT NULL,
  PRIMARY KEY (tenant_id, receipt_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_offboarding_evidence_case
  ON hrx_offboarding_evidence_receipts (tenant_id, offboarding_id, category, subject_ref, recorded_at);

CREATE INDEX IF NOT EXISTS idx_hrx_offboarding_evidence_ref
  ON hrx_offboarding_evidence_receipts (tenant_id, evidence_ref);

CREATE TRIGGER IF NOT EXISTS trg_hrx_offboarding_evidence_immutable_update
BEFORE UPDATE ON hrx_offboarding_evidence_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_offboarding_evidence_receipts is append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_offboarding_evidence_immutable_delete
BEFORE DELETE ON hrx_offboarding_evidence_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_offboarding_evidence_receipts is append-only');
END;
