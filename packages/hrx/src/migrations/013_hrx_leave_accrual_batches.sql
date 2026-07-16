CREATE TABLE IF NOT EXISTS hrx_leave_accrual_batches (
  tenant_id TEXT NOT NULL,
  accrual_batch_id TEXT NOT NULL,
  accrual_rule_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  period_count INTEGER NOT NULL,
  source_version TEXT,
  input_hash TEXT NOT NULL,
  snapshot_hash TEXT,
  preview_batch_id TEXT,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  executed_by TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, accrual_batch_id),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, preview_batch_id),
  FOREIGN KEY (tenant_id, accrual_rule_id) REFERENCES hrx_leave_accrual_rules (tenant_id, accrual_rule_id),
  FOREIGN KEY (tenant_id, preview_batch_id) REFERENCES hrx_leave_accrual_batches (tenant_id, accrual_batch_id),
  CONSTRAINT hrx_leave_accrual_batches_mode_check CHECK (mode IN ('preview', 'execute')),
  CONSTRAINT hrx_leave_accrual_batches_status_check CHECK (status IN ('pending', 'running', 'completed', 'completed_with_errors', 'failed')),
  CONSTRAINT hrx_leave_accrual_batches_period_count_check CHECK (period_count > 0),
  CONSTRAINT hrx_leave_accrual_batches_period_range_check CHECK (period_start <= period_end),
  CONSTRAINT hrx_leave_accrual_batches_preview_ref_check CHECK (
    (mode = 'preview' AND preview_batch_id IS NULL) OR
    (mode = 'execute' AND preview_batch_id IS NOT NULL)
  ),
  CONSTRAINT hrx_leave_accrual_batches_completed_check CHECK (
    status NOT IN ('completed', 'completed_with_errors') OR
    (source_version IS NOT NULL AND snapshot_hash IS NOT NULL AND completed_at IS NOT NULL)
  ),
  CONSTRAINT hrx_leave_accrual_batches_failed_check CHECK (
    status <> 'failed' OR error_code IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS hrx_leave_accrual_batch_periods (
  tenant_id TEXT NOT NULL,
  batch_period_id TEXT NOT NULL,
  accrual_batch_id TEXT NOT NULL,
  period_index INTEGER NOT NULL,
  period_key TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  accrual_run_id TEXT,
  source_version TEXT,
  snapshot_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_code TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, batch_period_id),
  UNIQUE (tenant_id, accrual_batch_id, period_index),
  UNIQUE (tenant_id, accrual_batch_id, period_key),
  FOREIGN KEY (tenant_id, accrual_batch_id) REFERENCES hrx_leave_accrual_batches (tenant_id, accrual_batch_id),
  FOREIGN KEY (tenant_id, accrual_run_id) REFERENCES hrx_leave_accrual_runs (tenant_id, accrual_run_id),
  CONSTRAINT hrx_leave_accrual_batch_periods_index_check CHECK (period_index >= 0),
  CONSTRAINT hrx_leave_accrual_batch_periods_attempt_check CHECK (attempt_count >= 0),
  CONSTRAINT hrx_leave_accrual_batch_periods_range_check CHECK (period_start <= period_end),
  CONSTRAINT hrx_leave_accrual_batch_periods_status_check CHECK (status IN ('pending', 'running', 'completed', 'completed_with_errors', 'failed')),
  CONSTRAINT hrx_leave_accrual_batch_periods_completed_check CHECK (
    status NOT IN ('completed', 'completed_with_errors') OR
    (accrual_run_id IS NOT NULL AND source_version IS NOT NULL AND snapshot_hash IS NOT NULL)
  ),
  CONSTRAINT hrx_leave_accrual_batch_periods_failed_check CHECK (
    status <> 'failed' OR error_code IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_accrual_batches_status
  ON hrx_leave_accrual_batches (tenant_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_accrual_batch_periods_batch
  ON hrx_leave_accrual_batch_periods (tenant_id, accrual_batch_id, period_index);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_accrual_batch_periods_status
  ON hrx_leave_accrual_batch_periods (tenant_id, status, updated_at);
