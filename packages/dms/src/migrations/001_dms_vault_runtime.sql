-- CMP-G5 Vault/DMS runtime metadata substrate.
CREATE TABLE IF NOT EXISTS dms_records (
  tenant_id TEXT NOT NULL,
  model_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  matter_id TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, model_type, resource_id)
);

CREATE TABLE IF NOT EXISTS dms_idempotency_keys (
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS dms_audit_events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  decision TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);
