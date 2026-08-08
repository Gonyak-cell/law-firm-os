CREATE TABLE IF NOT EXISTS lawos_email_dms.email_filing_placements (
  tenant_id text NOT NULL,
  placement_id text NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('original', 'correction')),
  correction_id text NOT NULL,
  email_thread_id text NOT NULL,
  document_id text NOT NULL,
  mime_sha256 text NOT NULL CHECK (mime_sha256 ~ '^[a-f0-9]{64}$'),
  original_receipt_id text NOT NULL,
  source_matter_id text NOT NULL,
  target_matter_id text NOT NULL,
  reason text NOT NULL CHECK (reason !~ E'[\r\n]' AND length(reason) <= 500),
  reason_hash text NOT NULL CHECK (reason_hash ~ '^[a-f0-9]{64}$'),
  actor_id text NOT NULL,
  occurred_at timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  payload_fingerprint text NOT NULL CHECK (payload_fingerprint ~ '^[a-f0-9]{64}$'),
  prior_placement_id text,
  status text NOT NULL CHECK (status IN ('original', 'applied')),
  PRIMARY KEY (tenant_id, placement_id),
  UNIQUE (tenant_id, correction_id),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (
    tenant_id,
    placement_id,
    email_thread_id,
    document_id,
    mime_sha256,
    original_receipt_id,
    target_matter_id
  ),
  FOREIGN KEY (
    tenant_id,
    prior_placement_id,
    email_thread_id,
    document_id,
    mime_sha256,
    original_receipt_id,
    source_matter_id
  ) REFERENCES lawos_email_dms.email_filing_placements (
    tenant_id,
    placement_id,
    email_thread_id,
    document_id,
    mime_sha256,
    original_receipt_id,
    target_matter_id
  ) DEFERRABLE INITIALLY DEFERRED,
  CHECK (
    (event_kind = 'original'
      AND prior_placement_id IS NULL
      AND source_matter_id = target_matter_id
      AND status = 'original')
    OR
    (event_kind = 'correction'
      AND prior_placement_id IS NOT NULL
      AND source_matter_id <> target_matter_id
      AND reason <> ''
      AND status = 'applied')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS email_filing_original_uq
  ON lawos_email_dms.email_filing_placements (tenant_id, email_thread_id)
  WHERE event_kind = 'original';

CREATE UNIQUE INDEX IF NOT EXISTS email_filing_prior_placement_uq
  ON lawos_email_dms.email_filing_placements (tenant_id, prior_placement_id)
  WHERE prior_placement_id IS NOT NULL;

CREATE OR REPLACE FUNCTION lawos_email_dms.reject_email_filing_placement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'email filing placements are append-only';
END;
$$;

DROP TRIGGER IF EXISTS email_filing_placements_append_only
  ON lawos_email_dms.email_filing_placements;
CREATE TRIGGER email_filing_placements_append_only
  BEFORE UPDATE OR DELETE ON lawos_email_dms.email_filing_placements
  FOR EACH ROW
  EXECUTE FUNCTION lawos_email_dms.reject_email_filing_placement_mutation();

ALTER TABLE lawos_email_dms.email_filing_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.email_filing_placements FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
  ON lawos_email_dms.email_filing_placements;
CREATE POLICY tenant_isolation
  ON lawos_email_dms.email_filing_placements
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());

CREATE OR REPLACE VIEW lawos_email_dms.email_filing_current_placements
WITH (security_invoker = true)
AS
SELECT placement.*
FROM lawos_email_dms.email_filing_placements AS placement
WHERE NOT EXISTS (
  SELECT 1
  FROM lawos_email_dms.email_filing_placements AS child
  WHERE child.tenant_id = placement.tenant_id
    AND child.prior_placement_id = placement.placement_id
);
