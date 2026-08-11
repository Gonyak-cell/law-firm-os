CREATE TABLE IF NOT EXISTS lawos_email_dms.outlook_desktop_installations (
  tenant_id text NOT NULL,
  installation_id text NOT NULL
    CHECK (char_length(installation_id) BETWEEN 1 AND 200),
  user_id text NOT NULL
    CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL
    CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  device_public_key text NOT NULL
    CHECK (char_length(device_public_key) BETWEEN 40 AND 512),
  device_key_fingerprint text NOT NULL
    CHECK (device_key_fingerprint ~ '^[a-f0-9]{64}$'),
  platform text NOT NULL
    CHECK (char_length(platform) BETWEEN 1 AND 32),
  app_version text NOT NULL
    CHECK (char_length(app_version) BETWEEN 1 AND 64),
  source_sha text NOT NULL
    CHECK (source_sha ~ '^[a-f0-9]{40}$'),
  registered_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  lease_expires_at timestamptz NOT NULL,
  retired_at timestamptz,
  retire_reason text
    CHECK (
      retire_reason IS NULL
      OR char_length(retire_reason) BETWEEN 1 AND 100
    ),
  state_version bigint NOT NULL DEFAULT 1
    CHECK (state_version >= 1),
  PRIMARY KEY (tenant_id, installation_id),
  UNIQUE (tenant_id, device_key_fingerprint),
  CHECK (registered_at <= last_seen_at),
  CHECK (lease_expires_at > last_seen_at),
  CHECK (
    (retired_at IS NULL AND retire_reason IS NULL)
    OR (
      retired_at IS NOT NULL
      AND retired_at >= registered_at
      AND retire_reason IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS outlook_desktop_installations_user_active_idx
  ON lawos_email_dms.outlook_desktop_installations
    (tenant_id, user_id, lease_expires_at)
  WHERE retired_at IS NULL;

CREATE TABLE IF NOT EXISTS lawos_email_dms.outlook_desktop_installation_nonces (
  tenant_id text NOT NULL,
  installation_id text NOT NULL,
  nonce_hash text NOT NULL
    CHECK (nonce_hash ~ '^[a-f0-9]{64}$'),
  request_fingerprint text NOT NULL
    CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  idempotency_key text NOT NULL
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, installation_id, nonce_hash),
  FOREIGN KEY (tenant_id, installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_installations
      (tenant_id, installation_id)
    ON DELETE RESTRICT,
  CHECK (expires_at > issued_at),
  CHECK (consumed_at >= issued_at AND consumed_at <= expires_at)
);

CREATE INDEX IF NOT EXISTS outlook_desktop_installation_nonces_expiry_idx
  ON lawos_email_dms.outlook_desktop_installation_nonces
    (tenant_id, expires_at);

CREATE TABLE IF NOT EXISTS lawos_email_dms.outlook_desktop_installation_idempotency (
  tenant_id text NOT NULL,
  user_id text NOT NULL,
  installation_id text NOT NULL,
  idempotency_key text NOT NULL
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  operation text NOT NULL
    CHECK (operation IN ('register', 'heartbeat', 'retire')),
  request_fingerprint text NOT NULL
    CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  response_status integer NOT NULL
    CHECK (response_status BETWEEN 100 AND 599),
  response jsonb NOT NULL
    CHECK (jsonb_typeof(response) = 'object'),
  created_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, user_id, idempotency_key),
  FOREIGN KEY (tenant_id, installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_installations
      (tenant_id, installation_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS outlook_desktop_installation_idempotency_install_idx
  ON lawos_email_dms.outlook_desktop_installation_idempotency
    (tenant_id, installation_id, created_at);

CREATE TABLE IF NOT EXISTS lawos_email_dms.outlook_desktop_installation_audit_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  installation_id text NOT NULL,
  user_id text NOT NULL,
  entra_subject_id text NOT NULL,
  event_type text NOT NULL
    CHECK (event_type IN ('registered', 'heartbeat', 'resumed', 'retired')),
  request_id text NOT NULL,
  idempotency_key text NOT NULL,
  state_version bigint NOT NULL
    CHECK (state_version >= 1),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, event_id),
  FOREIGN KEY (tenant_id, installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_installations
      (tenant_id, installation_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS outlook_desktop_installation_audit_install_idx
  ON lawos_email_dms.outlook_desktop_installation_audit_events
    (tenant_id, installation_id, occurred_at);

CREATE OR REPLACE FUNCTION lawos_email_dms.reject_outlook_desktop_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'outlook desktop lifecycle receipt rows are immutable';
END
$$;

DROP TRIGGER IF EXISTS outlook_desktop_nonces_immutable
  ON lawos_email_dms.outlook_desktop_installation_nonces;
CREATE TRIGGER outlook_desktop_nonces_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_installation_nonces
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

DROP TRIGGER IF EXISTS outlook_desktop_idempotency_immutable
  ON lawos_email_dms.outlook_desktop_installation_idempotency;
CREATE TRIGGER outlook_desktop_idempotency_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_installation_idempotency
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

DROP TRIGGER IF EXISTS outlook_desktop_audit_immutable
  ON lawos_email_dms.outlook_desktop_installation_audit_events;
CREATE TRIGGER outlook_desktop_audit_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_installation_audit_events
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app;
GRANT SELECT, INSERT, UPDATE ON
  lawos_email_dms.outlook_desktop_installations
TO lawos_app;
GRANT SELECT, INSERT ON
  lawos_email_dms.outlook_desktop_installation_nonces,
  lawos_email_dms.outlook_desktop_installation_idempotency,
  lawos_email_dms.outlook_desktop_installation_audit_events
TO lawos_app;

ALTER TABLE lawos_email_dms.outlook_desktop_installations
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_installation_nonces
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_installation_idempotency
  ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_installation_audit_events
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE lawos_email_dms.outlook_desktop_installations
  FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_installation_nonces
  FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_installation_idempotency
  FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.outlook_desktop_installation_audit_events
  FORCE ROW LEVEL SECURITY;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'outlook_desktop_installations',
    'outlook_desktop_installation_nonces',
    'outlook_desktop_installation_idempotency',
    'outlook_desktop_installation_audit_events'
  ] LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON lawos_email_dms.%I',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON lawos_email_dms.%I USING (tenant_id = lawos_security.current_tenant_id()) WITH CHECK (tenant_id = lawos_security.current_tenant_id())',
      table_name
    );
  END LOOP;
END
$$;
