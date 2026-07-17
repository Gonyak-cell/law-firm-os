CREATE SCHEMA IF NOT EXISTS lawos_runtime;

CREATE TABLE lawos_runtime.records (
  tenant_id text NOT NULL,
  record_type text NOT NULL,
  record_id text NOT NULL,
  state_version bigint NOT NULL CHECK (state_version >= 1),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, record_type, record_id)
);

CREATE TABLE lawos_runtime.idempotency_keys (
  tenant_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE TABLE lawos_runtime.audit_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  actor_id text,
  object_type text,
  object_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, event_id)
);

CREATE TABLE lawos_runtime.outbox_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  topic text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE FUNCTION lawos_runtime.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit events are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON lawos_runtime.audit_events
FOR EACH ROW EXECUTE FUNCTION lawos_runtime.reject_audit_mutation();

CREATE INDEX records_type_index ON lawos_runtime.records (tenant_id, record_type, updated_at DESC);
CREATE INDEX audit_object_index ON lawos_runtime.audit_events (tenant_id, object_type, object_id, created_at DESC);
CREATE INDEX outbox_pending_index ON lawos_runtime.outbox_events (tenant_id, created_at) WHERE status = 'pending';

ALTER TABLE lawos_runtime.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_runtime.records FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_runtime.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_runtime.idempotency_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_runtime.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_runtime.audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_runtime.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_runtime.outbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY records_tenant_policy ON lawos_runtime.records
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY idempotency_tenant_policy ON lawos_runtime.idempotency_keys
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY audit_tenant_policy ON lawos_runtime.audit_events
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY outbox_tenant_policy ON lawos_runtime.outbox_events
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
