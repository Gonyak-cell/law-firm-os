CREATE TABLE IF NOT EXISTS hrx_leave_integration_dead_letters (
  tenant_id TEXT NOT NULL,
  dead_letter_id TEXT NOT NULL,
  outbox_event_id TEXT NOT NULL,
  delivery_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL CHECK (provider_kind IN ('schedule', 'attendance', 'payroll', 'notification')),
  state TEXT NOT NULL CHECK (state IN ('open', 'requeued', 'resolved')),
  fail_count INTEGER NOT NULL CHECK (fail_count > 0),
  last_error_code TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  requeued_at TEXT,
  requeued_by_actor_id TEXT,
  resolved_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, dead_letter_id),
  UNIQUE (tenant_id, delivery_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, outbox_event_id) REFERENCES hrx_leave_sync_outbox (tenant_id, outbox_event_id),
  FOREIGN KEY (tenant_id, delivery_id) REFERENCES hrx_leave_integration_deliveries (tenant_id, delivery_id)
);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_integration_dead_letters_state
  ON hrx_leave_integration_dead_letters (tenant_id, state, updated_at);
