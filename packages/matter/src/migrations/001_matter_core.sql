-- CMP R4 G4 Matter Core runtime substrate.
-- File-backed local tests use the JavaScript repository; this SQL captures the
-- durable table contract for production adapters.

CREATE TABLE IF NOT EXISTS matter_records (
  tenant_id TEXT NOT NULL,
  model_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, model_type, resource_id)
);

CREATE TABLE IF NOT EXISTS matter_clients (
  tenant_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_display_name TEXT NOT NULL,
  client_short_name TEXT NOT NULL,
  status TEXT NOT NULL,
  source_revision TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, client_id),
  UNIQUE (tenant_id, client_short_name)
);

CREATE TABLE IF NOT EXISTS matter_canonical_matters (
  tenant_id TEXT NOT NULL,
  matter_id TEXT NOT NULL,
  matter_code TEXT NOT NULL,
  matter_name TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_display_name TEXT,
  matter_type_english TEXT,
  matter_detail_type_korean TEXT,
  matter_number TEXT,
  source_revision TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, matter_id),
  UNIQUE (tenant_id, matter_code)
);

CREATE TABLE IF NOT EXISTS matter_idempotency_keys (
  tenant_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  operation TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS matter_audit_events (
  tenant_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  event_hash TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);
