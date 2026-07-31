CREATE TABLE IF NOT EXISTS hrx_payroll_provider_operations (
  tenant_id TEXT NOT NULL,
  provider_operation_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'in_progress',
  attempt_count INTEGER NOT NULL DEFAULT 1,
  maximum_attempts INTEGER NOT NULL DEFAULT 3,
  provider_receipt_id TEXT,
  provider_receipt_ref TEXT,
  safe_error_code TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_by_actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, provider_operation_id),
  UNIQUE (tenant_id, provider_kind, idempotency_key),
  CONSTRAINT hrx_payroll_provider_operations_kind_check
    CHECK (provider_kind IN ('delivery', 'calendar', 'payroll', 'bank', 'filing')),
  CONSTRAINT hrx_payroll_provider_operations_state_check
    CHECK (state IN ('in_progress', 'pending', 'succeeded', 'failed', 'unknown')),
  CONSTRAINT hrx_payroll_provider_operations_attempt_check
    CHECK (attempt_count >= 1 AND maximum_attempts >= 1 AND attempt_count <= maximum_attempts),
  CONSTRAINT hrx_payroll_provider_operations_version_check CHECK (state_version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_payroll_provider_operation_receipt_id
  ON hrx_payroll_provider_operations (tenant_id, provider_kind, provider_receipt_id)
  WHERE provider_receipt_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hrx_payroll_provider_operation_receipt_ref
  ON hrx_payroll_provider_operations (tenant_id, provider_kind, provider_receipt_ref)
  WHERE provider_receipt_ref IS NOT NULL;

ALTER TABLE hrx_payroll_filing_jobs
  ADD COLUMN last_attempt_at TEXT;
