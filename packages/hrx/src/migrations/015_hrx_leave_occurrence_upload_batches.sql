CREATE TABLE IF NOT EXISTS hrx_leave_occurrence_upload_batches (
  tenant_id TEXT NOT NULL,
  upload_batch_id TEXT NOT NULL,
  template_version TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  preview_hash TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  execute_idempotency_key TEXT,
  schedule_only BOOLEAN NOT NULL DEFAULT FALSE,
  as_of TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'previewed',
  row_count INTEGER NOT NULL,
  ready_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  duplicate_count INTEGER NOT NULL,
  created_by_actor_id TEXT NOT NULL,
  approved_by_actor_id TEXT,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, upload_batch_id),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, execute_idempotency_key),
  CONSTRAINT hrx_leave_occurrence_upload_batches_status_check CHECK (status IN ('previewed', 'running', 'completed', 'completed_with_errors')),
  CONSTRAINT hrx_leave_occurrence_upload_batches_count_check CHECK (
    row_count >= 0 AND ready_count >= 0 AND error_count >= 0 AND duplicate_count >= 0 AND
    row_count = ready_count + error_count AND duplicate_count <= error_count
  ),
  CONSTRAINT hrx_leave_occurrence_upload_batches_execution_check CHECK (
    status = 'previewed' OR (execute_idempotency_key IS NOT NULL AND approved_by_actor_id IS NOT NULL)
  ),
  CONSTRAINT hrx_leave_occurrence_upload_batches_completed_check CHECK (
    status NOT IN ('completed', 'completed_with_errors') OR completed_at IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS hrx_leave_occurrence_upload_rows (
  tenant_id TEXT NOT NULL,
  upload_row_id TEXT NOT NULL,
  upload_batch_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  row_key TEXT,
  employee_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  preview_status TEXT NOT NULL,
  preview_error_code TEXT,
  preview_error_message TEXT,
  duplicate_of_row_number INTEGER,
  execution_status TEXT NOT NULL,
  execution_result_json TEXT NOT NULL DEFAULT '{}',
  execution_error_code TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  state_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  PRIMARY KEY (tenant_id, upload_row_id),
  UNIQUE (tenant_id, upload_batch_id, row_number),
  UNIQUE (tenant_id, upload_batch_id, row_key),
  FOREIGN KEY (tenant_id, upload_batch_id) REFERENCES hrx_leave_occurrence_upload_batches (tenant_id, upload_batch_id),
  CONSTRAINT hrx_leave_occurrence_upload_rows_number_check CHECK (row_number > 0),
  CONSTRAINT hrx_leave_occurrence_upload_rows_attempt_check CHECK (attempt_count >= 0),
  CONSTRAINT hrx_leave_occurrence_upload_rows_preview_check CHECK (preview_status IN ('ready', 'error')),
  CONSTRAINT hrx_leave_occurrence_upload_rows_execution_check CHECK (execution_status IN ('pending', 'running', 'completed', 'failed', 'invalid')),
  CONSTRAINT hrx_leave_occurrence_upload_rows_ready_check CHECK (
    preview_status <> 'ready' OR (row_key IS NOT NULL AND employee_id IS NOT NULL AND execution_status <> 'invalid')
  ),
  CONSTRAINT hrx_leave_occurrence_upload_rows_invalid_check CHECK (
    preview_status <> 'error' OR (preview_error_code IS NOT NULL AND execution_status = 'invalid')
  ),
  CONSTRAINT hrx_leave_occurrence_upload_rows_failed_check CHECK (
    execution_status <> 'failed' OR execution_error_code IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_occurrence_upload_batches_status
  ON hrx_leave_occurrence_upload_batches (tenant_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_occurrence_upload_rows_batch
  ON hrx_leave_occurrence_upload_rows (tenant_id, upload_batch_id, row_number);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_occurrence_upload_rows_status
  ON hrx_leave_occurrence_upload_rows (tenant_id, execution_status, updated_at);
