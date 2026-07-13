ALTER TABLE hrx_leave_sync_outbox ADD COLUMN last_error_code TEXT;
ALTER TABLE hrx_leave_sync_outbox ADD COLUMN updated_at TEXT;

CREATE TABLE IF NOT EXISTS hrx_leave_integration_deliveries (
  tenant_id TEXT NOT NULL,
  delivery_id TEXT NOT NULL,
  outbox_event_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  provider_mode TEXT NOT NULL,
  event_type TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending_sync',
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error_code TEXT,
  provider_receipt_ref TEXT,
  delivered_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, delivery_id),
  UNIQUE (tenant_id, outbox_event_id, provider_kind),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, outbox_event_id) REFERENCES hrx_leave_sync_outbox (tenant_id, outbox_event_id),
  CONSTRAINT hrx_leave_integration_provider_check CHECK (provider_kind IN ('schedule', 'attendance', 'payroll', 'notification')),
  CONSTRAINT hrx_leave_integration_state_check CHECK (state IN ('pending_sync', 'delivered', 'failed', 'not_configured')),
  CONSTRAINT hrx_leave_integration_attempt_check CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_integration_delivery_state
  ON hrx_leave_integration_deliveries (tenant_id, state, updated_at);
