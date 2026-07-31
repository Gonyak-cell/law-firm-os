ALTER TABLE hrx_payroll_payment_items
  ADD COLUMN provider_result_state TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE hrx_payroll_payment_items
  ADD COLUMN safe_error_code TEXT;

ALTER TABLE hrx_payroll_payment_items
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE hrx_payroll_payment_items
  ADD COLUMN last_attempt_at TEXT;

ALTER TABLE hrx_payroll_filing_jobs
  ADD COLUMN provider_result_state TEXT NOT NULL DEFAULT 'not_submitted';

ALTER TABLE hrx_payroll_filing_jobs
  ADD COLUMN safe_error_code TEXT;

ALTER TABLE hrx_payroll_filing_jobs
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE hrx_payroll_filing_jobs
  ADD COLUMN provider_submission_key TEXT;

ALTER TABLE hrx_payroll_delivery_receipts
  ADD COLUMN provider_result_state TEXT NOT NULL DEFAULT 'queued';

ALTER TABLE hrx_payroll_delivery_receipts
  ADD COLUMN safe_error_code TEXT;

ALTER TABLE hrx_payroll_delivery_receipts
  ADD COLUMN last_attempt_at TEXT;

UPDATE hrx_payroll_delivery_receipts
SET
  provider_result_state = CASE
    WHEN viewed_at IS NOT NULL OR state = 'viewed' THEN 'read'
    WHEN delivered_at IS NOT NULL OR state = 'delivered' THEN 'delivered'
    WHEN failed_at IS NOT NULL OR state = 'failed' THEN 'failed'
    ELSE 'queued'
  END,
  safe_error_code = CASE
    WHEN failed_at IS NOT NULL OR state = 'failed'
      THEN COALESCE(safe_error_code, 'LEGACY_DELIVERY_FAILED')
    ELSE safe_error_code
  END,
  attempt_count = CASE
    WHEN (
      viewed_at IS NOT NULL
      OR delivered_at IS NOT NULL
      OR failed_at IS NOT NULL
      OR state IN ('delivered', 'viewed', 'failed')
    ) AND attempt_count < 1
      THEN 1
    ELSE attempt_count
  END,
  last_attempt_at = CASE
    WHEN (
      viewed_at IS NOT NULL
      OR delivered_at IS NOT NULL
      OR failed_at IS NOT NULL
      OR state IN ('delivered', 'viewed', 'failed')
    )
      THEN COALESCE(viewed_at, delivered_at, failed_at, updated_at, created_at)
    ELSE last_attempt_at
  END;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_payroll_filing_provider_receipt
  ON hrx_payroll_filing_jobs (tenant_id, provider_receipt_ref)
  WHERE provider_receipt_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_payroll_filing_submission_key
  ON hrx_payroll_filing_jobs (tenant_id, provider_submission_key)
  WHERE provider_submission_key IS NOT NULL;
