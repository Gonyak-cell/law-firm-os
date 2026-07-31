ALTER TABLE hrx_payroll_delivery_receipts
  ADD COLUMN provider_id TEXT;

ALTER TABLE hrx_payroll_delivery_receipts
  ADD COLUMN provider_receipt_id TEXT;

ALTER TABLE hrx_payroll_delivery_receipts
  ADD COLUMN attempt_started_at TEXT;

UPDATE hrx_payroll_delivery_receipts
SET provider_id = CASE
  WHEN channel = 'self_service' THEN 'lawos-internal'
  ELSE 'legacy-unverified'
END
WHERE provider_id IS NULL
  AND provider_receipt_ref IS NOT NULL
  AND provider_result_state IN ('sent', 'delivered', 'read');

UPDATE hrx_payroll_delivery_receipts
SET attempt_started_at = last_attempt_at
WHERE attempt_started_at IS NULL
  AND last_attempt_at IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_payroll_delivery_provider_receipt
  ON hrx_payroll_delivery_receipts (tenant_id, provider_receipt_ref)
  WHERE provider_receipt_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_payroll_delivery_provider_receipt_id
  ON hrx_payroll_delivery_receipts (tenant_id, provider_id, provider_receipt_id)
  WHERE provider_id IS NOT NULL AND provider_receipt_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS hrx_payroll_statement_provider_events (
  tenant_id TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  delivery_receipt_id TEXT NOT NULL,
  statement_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_receipt_ref TEXT NOT NULL,
  provider_event_state TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  event_occurred_at TEXT NOT NULL,
  received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, provider_event_id),
  FOREIGN KEY (tenant_id, delivery_receipt_id)
    REFERENCES hrx_payroll_delivery_receipts (tenant_id, delivery_receipt_id),
  FOREIGN KEY (tenant_id, statement_id)
    REFERENCES hrx_payroll_statements (tenant_id, statement_id),
  CONSTRAINT hrx_payroll_statement_provider_events_state_check
    CHECK (provider_event_state IN ('accepted', 'sent', 'delivered', 'read', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_hrx_payroll_statement_provider_events_receipt
  ON hrx_payroll_statement_provider_events
    (tenant_id, delivery_receipt_id, event_occurred_at);
