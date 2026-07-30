CREATE SCHEMA IF NOT EXISTS lawos_email_dms;

CREATE TABLE IF NOT EXISTS lawos_email_dms.m365_connections (
  tenant_id text NOT NULL,
  m365_connection_id text NOT NULL,
  user_id text NOT NULL,
  entra_subject_id text NOT NULL,
  mailbox_address_hash text NOT NULL
    CHECK (mailbox_address_hash ~ '^[a-f0-9]{64}$'),
  credential_ref text NOT NULL,
  granted_scopes text[] NOT NULL
    CHECK (
      cardinality(granted_scopes) >= 1
      AND granted_scopes <@ ARRAY[
        'Mail.Read',
        'Calendars.ReadWrite',
        'offline_access'
      ]::text[]
    ),
  consented_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  state_version bigint NOT NULL CHECK (state_version >= 1),
  connection_authority text NOT NULL DEFAULT 'delegated'
    CHECK (connection_authority = 'delegated'),
  mailbox_scope text NOT NULL DEFAULT 'me'
    CHECK (mailbox_scope = 'me'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, m365_connection_id),
  UNIQUE (tenant_id, user_id),
  CHECK (expires_at > consented_at),
  CHECK (revoked_at IS NULL OR revoked_at >= consented_at)
);

ALTER TABLE lawos_email_dms.m365_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.m365_connections FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
  ON lawos_email_dms.m365_connections;
CREATE POLICY tenant_isolation
  ON lawos_email_dms.m365_connections
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
