CREATE TABLE IF NOT EXISTS hrx_leave_promotion_evidence_receipts (
  tenant_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  event_type TEXT NOT NULL,
  evidence_hash TEXT NOT NULL,
  provider_receipt_ref TEXT,
  occurred_at TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'active',
  idempotency_key TEXT NOT NULL,
  revoked_at TEXT,
  revoked_by_actor_id TEXT,
  revocation_reason_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant_id, receipt_id),
  UNIQUE (tenant_id, idempotency_key),
  FOREIGN KEY (tenant_id, recipient_id) REFERENCES hrx_leave_promotion_recipients (tenant_id, recipient_id),
  CONSTRAINT hrx_leave_promotion_evidence_stage_check CHECK (stage IN ('first', 'second')),
  CONSTRAINT hrx_leave_promotion_evidence_event_check CHECK (event_type IN ('delivered', 'viewed', 'failed')),
  CONSTRAINT hrx_leave_promotion_evidence_state_check CHECK (state IN ('active', 'revoked'))
);

CREATE INDEX IF NOT EXISTS idx_hrx_leave_promotion_evidence_recipient
  ON hrx_leave_promotion_evidence_receipts (tenant_id, recipient_id, stage, occurred_at);
