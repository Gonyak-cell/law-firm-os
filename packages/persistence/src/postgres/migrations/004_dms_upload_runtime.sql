CREATE SCHEMA IF NOT EXISTS lawos_dms;

CREATE TABLE lawos_dms.upload_sessions (
  tenant_id text NOT NULL,
  session_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  matter_id text NOT NULL,
  workspace_id text NOT NULL,
  document_id text NOT NULL,
  version_id text NOT NULL,
  version_number integer NOT NULL CHECK (version_number >= 1),
  object_id text NOT NULL,
  adapter_id text NOT NULL,
  title text NOT NULL,
  content_type text NOT NULL,
  expected_sha256 text NOT NULL CHECK (expected_sha256 ~ '^[a-f0-9]{64}$'),
  expected_byte_size bigint NOT NULL CHECK (expected_byte_size >= 0),
  staged_sha256 text CHECK (staged_sha256 IS NULL OR staged_sha256 ~ '^[a-f0-9]{64}$'),
  staged_byte_size bigint CHECK (staged_byte_size IS NULL OR staged_byte_size >= 0),
  permission_envelope_id text NOT NULL,
  audit_trace_id text NOT NULL,
  actor_id text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'bytes_stored', 'provider_finalizing', 'provider_finalized', 'finalized', 'failed', 'expired', 'failed_terminal')),
  retryable boolean NOT NULL DEFAULT true,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text,
  expires_at timestamptz NOT NULL,
  stage_lease_owner text,
  stage_lease_token text,
  stage_lease_expires_at timestamptz,
  provider_finalize_owner text,
  provider_finalize_token text,
  provider_finalize_lease_expires_at timestamptz,
  provider_receipt jsonb,
  provider_finalized_at timestamptz,
  reconcile_owner text,
  reconcile_lease_expires_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  reconciliation_attempt_count integer NOT NULL DEFAULT 0 CHECK (reconciliation_attempt_count >= 0),
  dead_letter_receipt jsonb,
  failed_terminal_at timestamptz,
  metadata_committed_at timestamptz,
  finalized_at timestamptz,
  orphan_deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, session_id),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, document_id, version_id),
  UNIQUE (tenant_id, object_id)
);

CREATE TABLE lawos_dms.documents (
  tenant_id text NOT NULL,
  document_id text NOT NULL,
  matter_id text NOT NULL,
  workspace_id text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_version_id text,
  permission_envelope_id text NOT NULL,
  audit_trace_id text NOT NULL,
  legal_hold_status text NOT NULL DEFAULT 'none' CHECK (legal_hold_status IN ('none', 'active', 'released')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, document_id)
);

CREATE TABLE lawos_dms.file_objects (
  tenant_id text NOT NULL,
  file_object_id text NOT NULL,
  object_id text NOT NULL,
  adapter_id text NOT NULL,
  storage_pointer_ref text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  content_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('committed', 'delete_pending', 'deleted')),
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, file_object_id),
  UNIQUE (tenant_id, object_id)
);

CREATE TABLE lawos_dms.document_versions (
  tenant_id text NOT NULL,
  version_id text NOT NULL,
  document_id text NOT NULL,
  version_number integer NOT NULL CHECK (version_number >= 1),
  file_object_id text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, version_id),
  UNIQUE (tenant_id, document_id, version_number),
  FOREIGN KEY (tenant_id, document_id)
    REFERENCES lawos_dms.documents (tenant_id, document_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, file_object_id)
    REFERENCES lawos_dms.file_objects (tenant_id, file_object_id)
    ON DELETE RESTRICT
);

CREATE TABLE lawos_dms.idempotency_keys (
  tenant_id text NOT NULL,
  idempotency_key text NOT NULL,
  operation text NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE TABLE lawos_dms.audit_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  actor_id text NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, event_id)
);

CREATE TABLE lawos_dms.outbox_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE TABLE lawos_dms.legal_holds (
  tenant_id text NOT NULL,
  legal_hold_id text NOT NULL,
  document_id text NOT NULL,
  object_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'released')),
  reason_hash text NOT NULL CHECK (reason_hash ~ '^[a-f0-9]{64}$'),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  released_at timestamptz,
  PRIMARY KEY (tenant_id, legal_hold_id),
  FOREIGN KEY (tenant_id, document_id)
    REFERENCES lawos_dms.documents (tenant_id, document_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, object_id)
    REFERENCES lawos_dms.file_objects (tenant_id, object_id)
    ON DELETE RESTRICT
);

CREATE TABLE lawos_dms.retention_policies (
  tenant_id text NOT NULL,
  retention_policy_id text NOT NULL,
  document_id text NOT NULL,
  object_id text NOT NULL,
  retain_until timestamptz NOT NULL,
  disposition text NOT NULL DEFAULT 'review_before_delete',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, retention_policy_id),
  FOREIGN KEY (tenant_id, document_id)
    REFERENCES lawos_dms.documents (tenant_id, document_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, object_id)
    REFERENCES lawos_dms.file_objects (tenant_id, object_id)
    ON DELETE RESTRICT
);

CREATE TABLE lawos_dms.delete_intents (
  tenant_id text NOT NULL,
  delete_intent_id text NOT NULL,
  idempotency_key text NOT NULL,
  document_id text NOT NULL,
  object_id text NOT NULL,
  file_object_id text NOT NULL,
  expected_version_id text NOT NULL,
  expected_sha256 text NOT NULL CHECK (expected_sha256 ~ '^[a-f0-9]{64}$'),
  requested_by text NOT NULL,
  state text NOT NULL CHECK (state IN ('pending', 'provider_deleted', 'completed', 'failed_terminal')),
  lease_owner text,
  lease_token text,
  lease_expires_at timestamptz,
  provider_receipt jsonb,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_error_code text,
  dead_letter_receipt jsonb,
  failed_terminal_at timestamptz,
  provider_deleted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, delete_intent_id),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, object_id),
  FOREIGN KEY (tenant_id, document_id)
    REFERENCES lawos_dms.documents (tenant_id, document_id)
    ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, file_object_id)
    REFERENCES lawos_dms.file_objects (tenant_id, file_object_id)
    ON DELETE RESTRICT
);

CREATE FUNCTION lawos_dms.reject_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'DMS evidence record is immutable' USING ERRCODE = '55000';
END;
$$;

CREATE FUNCTION lawos_dms.validate_upload_session_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(
    OLD.tenant_id, OLD.session_id, OLD.idempotency_key, OLD.request_hash,
    OLD.matter_id, OLD.workspace_id, OLD.document_id, OLD.version_id,
    OLD.version_number, OLD.object_id, OLD.adapter_id, OLD.title,
    OLD.content_type, OLD.expected_sha256, OLD.expected_byte_size,
    OLD.permission_envelope_id, OLD.audit_trace_id, OLD.actor_id, OLD.expires_at,
    OLD.created_at
  ) IS DISTINCT FROM ROW(
    NEW.tenant_id, NEW.session_id, NEW.idempotency_key, NEW.request_hash,
    NEW.matter_id, NEW.workspace_id, NEW.document_id, NEW.version_id,
    NEW.version_number, NEW.object_id, NEW.adapter_id, NEW.title,
    NEW.content_type, NEW.expected_sha256, NEW.expected_byte_size,
    NEW.permission_envelope_id, NEW.audit_trace_id, NEW.actor_id, NEW.expires_at,
    NEW.created_at
  ) THEN
    RAISE EXCEPTION 'DMS upload session identity is immutable' USING ERRCODE = '55000';
  END IF;
  IF NOT (
    NEW.state = OLD.state
    OR (OLD.state = 'pending' AND NEW.state IN ('bytes_stored', 'failed', 'expired', 'failed_terminal'))
    OR (OLD.state = 'failed' AND NEW.state IN ('bytes_stored', 'expired', 'failed_terminal'))
    OR (OLD.state = 'bytes_stored' AND NEW.state IN ('provider_finalizing', 'failed', 'expired', 'failed_terminal'))
    OR (OLD.state = 'provider_finalizing' AND NEW.state IN ('bytes_stored', 'provider_finalized', 'failed_terminal'))
    OR (OLD.state = 'provider_finalized' AND NEW.state IN ('finalized', 'failed_terminal'))
    OR (OLD.state = 'expired' AND NEW.state = 'failed_terminal')
  ) THEN
    RAISE EXCEPTION 'DMS upload session state transition is invalid' USING ERRCODE = '55000';
  END IF;
  IF NEW.staged_sha256 IS NOT NULL AND (
    NEW.staged_sha256 <> NEW.expected_sha256
    OR NEW.staged_byte_size IS DISTINCT FROM NEW.expected_byte_size
  ) THEN
    RAISE EXCEPTION 'DMS staged receipt does not match expected object' USING ERRCODE = '55000';
  END IF;
  IF NEW.state IN ('bytes_stored', 'provider_finalizing', 'provider_finalized', 'finalized') AND (
    NEW.staged_sha256 IS NULL OR NEW.staged_byte_size IS NULL
  ) THEN
    RAISE EXCEPTION 'DMS staged receipt is required for committed states' USING ERRCODE = '55000';
  END IF;
  IF NEW.state IN ('provider_finalized', 'finalized') AND (
    NEW.provider_receipt IS NULL OR NEW.provider_finalized_at IS NULL
  ) THEN
    RAISE EXCEPTION 'DMS provider receipt is required after provider finalize' USING ERRCODE = '55000';
  END IF;
  IF NEW.state = 'finalized' AND NEW.metadata_committed_at IS NULL THEN
    RAISE EXCEPTION 'DMS metadata commit timestamp is required' USING ERRCODE = '55000';
  END IF;
  IF OLD.metadata_committed_at IS NOT NULL AND NEW.metadata_committed_at IS DISTINCT FROM OLD.metadata_committed_at THEN
    RAISE EXCEPTION 'DMS metadata commit timestamp is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.state = 'finalized' AND NEW.finalized_at IS NULL THEN
    RAISE EXCEPTION 'DMS finalize timestamp is required' USING ERRCODE = '55000';
  END IF;
  IF OLD.finalized_at IS NOT NULL AND NEW.finalized_at IS DISTINCT FROM OLD.finalized_at THEN
    RAISE EXCEPTION 'DMS finalize timestamp is immutable' USING ERRCODE = '55000';
  END IF;
  IF NEW.orphan_deleted_at IS NOT NULL AND NEW.state <> 'expired' THEN
    RAISE EXCEPTION 'DMS orphan cleanup is allowed only for expired sessions' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION lawos_dms.validate_file_object_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DMS file objects cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF ROW(OLD.tenant_id, OLD.file_object_id, OLD.object_id, OLD.adapter_id, OLD.storage_pointer_ref,
         OLD.sha256, OLD.byte_size, OLD.content_type, OLD.created_at)
     IS DISTINCT FROM
     ROW(NEW.tenant_id, NEW.file_object_id, NEW.object_id, NEW.adapter_id, NEW.storage_pointer_ref,
         NEW.sha256, NEW.byte_size, NEW.content_type, NEW.created_at) THEN
    RAISE EXCEPTION 'DMS file object identity is immutable' USING ERRCODE = '55000';
  END IF;
  IF NOT (
    NEW.status = OLD.status
    OR (OLD.status = 'committed' AND NEW.status = 'delete_pending')
    OR (OLD.status = 'delete_pending' AND NEW.status = 'deleted')
  ) THEN
    RAISE EXCEPTION 'DMS file object status transition is invalid' USING ERRCODE = '55000';
  END IF;
  IF NEW.status = 'deleted' AND NEW.deleted_at IS NULL THEN
    RAISE EXCEPTION 'DMS deleted file object timestamp is required' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION lawos_dms.validate_legal_hold_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DMS legal hold records cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF ROW(
    OLD.tenant_id, OLD.legal_hold_id, OLD.document_id, OLD.object_id,
    OLD.reason_hash, OLD.created_by, OLD.created_at
  ) IS DISTINCT FROM ROW(
    NEW.tenant_id, NEW.legal_hold_id, NEW.document_id, NEW.object_id,
    NEW.reason_hash, NEW.created_by, NEW.created_at
  ) THEN
    RAISE EXCEPTION 'DMS legal hold identity is immutable' USING ERRCODE = '55000';
  END IF;
  IF OLD.status = 'released' OR NEW.status <> 'released' OR NEW.released_at IS NULL THEN
    RAISE EXCEPTION 'DMS legal hold may only transition once from active to released' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION lawos_dms.validate_retention_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'DMS retention policies cannot be deleted' USING ERRCODE = '55000';
  END IF;
  IF ROW(
    OLD.tenant_id, OLD.retention_policy_id, OLD.document_id, OLD.object_id,
    OLD.disposition, OLD.created_at
  ) IS DISTINCT FROM ROW(
    NEW.tenant_id, NEW.retention_policy_id, NEW.document_id, NEW.object_id,
    NEW.disposition, NEW.created_at
  ) OR NEW.retain_until < OLD.retain_until THEN
    RAISE EXCEPTION 'DMS retention policy cannot be shortened or reassigned' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dms_versions_immutable
BEFORE UPDATE OR DELETE ON lawos_dms.document_versions
FOR EACH ROW EXECUTE FUNCTION lawos_dms.reject_immutable_mutation();
CREATE TRIGGER dms_file_objects_immutable
BEFORE UPDATE OR DELETE ON lawos_dms.file_objects
FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_file_object_update();
CREATE TRIGGER dms_idempotency_immutable
BEFORE UPDATE OR DELETE ON lawos_dms.idempotency_keys
FOR EACH ROW EXECUTE FUNCTION lawos_dms.reject_immutable_mutation();
CREATE TRIGGER dms_audit_immutable
BEFORE UPDATE OR DELETE ON lawos_dms.audit_events
FOR EACH ROW EXECUTE FUNCTION lawos_dms.reject_immutable_mutation();
CREATE TRIGGER dms_upload_session_state_guard
BEFORE UPDATE ON lawos_dms.upload_sessions
FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_upload_session_update();
CREATE TRIGGER dms_legal_hold_guard
BEFORE UPDATE OR DELETE ON lawos_dms.legal_holds
FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_legal_hold_update();
CREATE TRIGGER dms_retention_guard
BEFORE UPDATE OR DELETE ON lawos_dms.retention_policies
FOR EACH ROW EXECUTE FUNCTION lawos_dms.validate_retention_update();

CREATE INDEX dms_upload_reconciliation_index
  ON lawos_dms.upload_sessions (tenant_id, state, next_attempt_at, reconcile_lease_expires_at, expires_at, updated_at);
CREATE INDEX dms_versions_document_index
  ON lawos_dms.document_versions (tenant_id, document_id, version_number DESC);
CREATE INDEX dms_audit_object_index
  ON lawos_dms.audit_events (tenant_id, object_type, object_id, created_at DESC);
CREATE INDEX dms_outbox_pending_index
  ON lawos_dms.outbox_events (tenant_id, status, created_at)
  WHERE status <> 'published';
CREATE INDEX dms_legal_hold_object_index
  ON lawos_dms.legal_holds (tenant_id, document_id, object_id, status);
CREATE INDEX dms_retention_document_index
  ON lawos_dms.retention_policies (tenant_id, document_id, object_id, retain_until DESC);
CREATE INDEX dms_delete_intent_claim_index
  ON lawos_dms.delete_intents (tenant_id, state, next_attempt_at, lease_expires_at);

ALTER TABLE lawos_dms.upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.upload_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.file_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.file_objects FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.document_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.idempotency_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.outbox_events FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.legal_holds FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.retention_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.delete_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_dms.delete_intents FORCE ROW LEVEL SECURITY;

CREATE POLICY dms_upload_sessions_tenant_policy ON lawos_dms.upload_sessions
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_documents_tenant_policy ON lawos_dms.documents
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_file_objects_tenant_policy ON lawos_dms.file_objects
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_document_versions_tenant_policy ON lawos_dms.document_versions
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_idempotency_tenant_policy ON lawos_dms.idempotency_keys
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_audit_tenant_policy ON lawos_dms.audit_events
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_outbox_tenant_policy ON lawos_dms.outbox_events
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_legal_holds_tenant_policy ON lawos_dms.legal_holds
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_retention_tenant_policy ON lawos_dms.retention_policies
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY dms_delete_intents_tenant_policy ON lawos_dms.delete_intents
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
