CREATE TABLE IF NOT EXISTS hrx_leave_job_outbox (
  tenant_id TEXT NOT NULL,
  job_event_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  schedule_key TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  available_at TEXT NOT NULL,
  cursor_before TEXT,
  cursor_after TEXT,
  last_error_code TEXT,
  result_json TEXT NOT NULL DEFAULT '{}',
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, job_event_id),
  UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT hrx_leave_job_outbox_type_check CHECK (job_type = 'leave_entitlement_expiration'),
  CONSTRAINT hrx_leave_job_outbox_state_check CHECK (state IN ('pending', 'running', 'completed', 'failed')),
  CONSTRAINT hrx_leave_job_outbox_attempt_check CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_job_outbox_state
  ON hrx_leave_job_outbox (state, available_at, tenant_id);
