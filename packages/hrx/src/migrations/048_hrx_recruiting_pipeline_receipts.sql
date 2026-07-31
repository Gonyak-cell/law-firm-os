CREATE TABLE IF NOT EXISTS hrx_recruiting_pipeline_receipts (
  tenant_id TEXT NOT NULL,
  pipeline_receipt_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  job_opening_id TEXT NOT NULL,
  consent_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  application_id TEXT NOT NULL,
  interview_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, pipeline_receipt_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, job_opening_id)
    REFERENCES hrx_job_openings (tenant_id, job_opening_id),
  FOREIGN KEY (tenant_id, consent_id)
    REFERENCES hrx_candidate_consents (tenant_id, consent_id),
  FOREIGN KEY (tenant_id, candidate_id)
    REFERENCES hrx_candidates (tenant_id, candidate_id),
  FOREIGN KEY (tenant_id, application_id)
    REFERENCES hrx_applications (tenant_id, application_id),
  FOREIGN KEY (tenant_id, interview_id)
    REFERENCES hrx_interviews (tenant_id, interview_id),
  FOREIGN KEY (tenant_id, offer_id)
    REFERENCES hrx_offers (tenant_id, offer_id),
  CONSTRAINT hrx_recruiting_pipeline_receipts_key_check
    CHECK (length(trim(idempotency_key)) > 0),
  CONSTRAINT hrx_recruiting_pipeline_receipts_hash_check
    CHECK (length(input_hash) = 64)
);

CREATE TRIGGER IF NOT EXISTS trg_hrx_recruiting_pipeline_receipts_immutable_update
BEFORE UPDATE ON hrx_recruiting_pipeline_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_recruiting_pipeline_receipts rows are append-only');
END;

CREATE TRIGGER IF NOT EXISTS trg_hrx_recruiting_pipeline_receipts_immutable_delete
BEFORE DELETE ON hrx_recruiting_pipeline_receipts
BEGIN
  SELECT RAISE(ABORT, 'hrx_recruiting_pipeline_receipts rows are append-only');
END;
