CREATE SCHEMA IF NOT EXISTS lawos_domain;

CREATE TABLE lawos_domain.records (
  tenant_id text NOT NULL,
  domain_id text NOT NULL CHECK (domain_id ~ '^[a-z][a-z0-9-]*$'),
  record_type text NOT NULL,
  record_id text NOT NULL,
  state_version bigint NOT NULL CHECK (state_version >= 1),
  unique_key text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  append_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, domain_id, record_type, record_id)
);

CREATE UNIQUE INDEX domain_record_unique_key
  ON lawos_domain.records (tenant_id, domain_id, record_type, unique_key)
  WHERE unique_key IS NOT NULL;

CREATE TABLE lawos_domain.record_references (
  tenant_id text NOT NULL,
  source_domain_id text NOT NULL,
  source_record_type text NOT NULL,
  source_record_id text NOT NULL,
  reference_name text NOT NULL,
  target_domain_id text NOT NULL,
  target_record_type text NOT NULL,
  target_record_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (
    tenant_id,
    source_domain_id,
    source_record_type,
    source_record_id,
    reference_name,
    target_domain_id,
    target_record_type,
    target_record_id
  ),
  FOREIGN KEY (tenant_id, source_domain_id, source_record_type, source_record_id)
    REFERENCES lawos_domain.records (tenant_id, domain_id, record_type, record_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, target_domain_id, target_record_type, target_record_id)
    REFERENCES lawos_domain.records (tenant_id, domain_id, record_type, record_id)
    ON DELETE RESTRICT
);

CREATE TABLE lawos_domain.idempotency_keys (
  tenant_id text NOT NULL,
  domain_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, domain_id, idempotency_key)
);

CREATE TABLE lawos_domain.audit_events (
  tenant_id text NOT NULL,
  domain_id text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  actor_id text,
  object_type text,
  object_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, domain_id, event_id)
);

CREATE TABLE lawos_domain.import_receipts (
  tenant_id text NOT NULL,
  domain_id text NOT NULL,
  receipt_id text NOT NULL,
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  source_count integer NOT NULL CHECK (source_count >= 0),
  target_count integer NOT NULL CHECK (target_count >= 0),
  rejected_count integer NOT NULL CHECK (rejected_count >= 0),
  invariant_hash text NOT NULL CHECK (invariant_hash ~ '^[a-f0-9]{64}$'),
  rollback_cutoff text NOT NULL CHECK (rollback_cutoff = 'pre_authority'),
  status text NOT NULL CHECK (status = 'source_imported'),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, domain_id, receipt_id),
  UNIQUE (tenant_id, domain_id, source_hash)
);

CREATE TABLE lawos_domain.shadow_receipts (
  tenant_id text NOT NULL,
  domain_id text NOT NULL,
  receipt_id text NOT NULL,
  source_hash text NOT NULL CHECK (source_hash ~ '^[a-f0-9]{64}$'),
  target_hash text NOT NULL CHECK (target_hash ~ '^[a-f0-9]{64}$'),
  source_count integer NOT NULL CHECK (source_count >= 0),
  target_count integer NOT NULL CHECK (target_count >= 0),
  difference_count integer NOT NULL CHECK (difference_count >= 0),
  invariant_hash text NOT NULL CHECK (invariant_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('equal', 'different')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, domain_id, receipt_id)
);

CREATE TABLE lawos_domain.rehearsal_receipts (
  tenant_id text NOT NULL,
  domain_id text NOT NULL,
  receipt_id text NOT NULL,
  import_receipt_id text NOT NULL,
  shadow_receipt_id text NOT NULL,
  smoke_hash text NOT NULL CHECK (smoke_hash ~ '^[a-f0-9]{64}$'),
  rollback_cutoff text NOT NULL CHECK (rollback_cutoff = 'pre_authority'),
  status text NOT NULL CHECK (status = 'source_ready'),
  production_migrated boolean NOT NULL DEFAULT false CHECK (production_migrated = false),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, domain_id, receipt_id),
  FOREIGN KEY (tenant_id, domain_id, import_receipt_id)
    REFERENCES lawos_domain.import_receipts (tenant_id, domain_id, receipt_id),
  FOREIGN KEY (tenant_id, domain_id, shadow_receipt_id)
    REFERENCES lawos_domain.shadow_receipts (tenant_id, domain_id, receipt_id)
);

CREATE FUNCTION lawos_domain.reject_append_only_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.append_only THEN
    RAISE EXCEPTION 'domain record is append-only' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER domain_records_append_only
BEFORE UPDATE OR DELETE ON lawos_domain.records
FOR EACH ROW EXECUTE FUNCTION lawos_domain.reject_append_only_record_mutation();

CREATE FUNCTION lawos_domain.reject_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'domain ledger evidence is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER domain_audit_append_only
BEFORE UPDATE OR DELETE ON lawos_domain.audit_events
FOR EACH ROW EXECUTE FUNCTION lawos_domain.reject_immutable_mutation();
CREATE TRIGGER domain_import_receipt_append_only
BEFORE UPDATE OR DELETE ON lawos_domain.import_receipts
FOR EACH ROW EXECUTE FUNCTION lawos_domain.reject_immutable_mutation();
CREATE TRIGGER domain_shadow_receipt_append_only
BEFORE UPDATE OR DELETE ON lawos_domain.shadow_receipts
FOR EACH ROW EXECUTE FUNCTION lawos_domain.reject_immutable_mutation();
CREATE TRIGGER domain_rehearsal_receipt_append_only
BEFORE UPDATE OR DELETE ON lawos_domain.rehearsal_receipts
FOR EACH ROW EXECUTE FUNCTION lawos_domain.reject_immutable_mutation();

CREATE INDEX domain_records_type_index
  ON lawos_domain.records (tenant_id, domain_id, record_type, updated_at DESC);
CREATE INDEX domain_reference_target_index
  ON lawos_domain.record_references (tenant_id, target_domain_id, target_record_type, target_record_id);
CREATE INDEX domain_audit_object_index
  ON lawos_domain.audit_events (tenant_id, domain_id, object_type, object_id, created_at DESC);

ALTER TABLE lawos_domain.records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.records FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.record_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.record_references FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.idempotency_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.import_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.import_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.shadow_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.shadow_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.rehearsal_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_domain.rehearsal_receipts FORCE ROW LEVEL SECURITY;

CREATE POLICY domain_records_tenant_policy ON lawos_domain.records
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY domain_references_tenant_policy ON lawos_domain.record_references
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY domain_idempotency_tenant_policy ON lawos_domain.idempotency_keys
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY domain_audit_tenant_policy ON lawos_domain.audit_events
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY domain_import_receipts_tenant_policy ON lawos_domain.import_receipts
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY domain_shadow_receipts_tenant_policy ON lawos_domain.shadow_receipts
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY domain_rehearsal_receipts_tenant_policy ON lawos_domain.rehearsal_receipts
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
