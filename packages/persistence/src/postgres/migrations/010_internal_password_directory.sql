ALTER TABLE lawos_identity.accounts
  ADD COLUMN IF NOT EXISTS profile jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE lawos_identity.account_memberships (
  tenant_id text NOT NULL,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  role_profile_id text,
  role_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(role_ids) = 'array'),
  group_ids jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(group_ids) = 'array'),
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(scopes) = 'array'),
  hrx_scopes jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(hrx_scopes) = 'array'),
  source_ref text,
  state_version bigint NOT NULL DEFAULT 1 CHECK (state_version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, user_id),
  FOREIGN KEY (tenant_id, user_id) REFERENCES lawos_identity.accounts (tenant_id, user_id)
);

CREATE INDEX identity_account_membership_status_index
  ON lawos_identity.account_memberships (tenant_id, status, user_id);

CREATE TABLE lawos_identity.directory_idempotency_keys (
  tenant_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE TABLE lawos_identity.directory_outbox_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  topic text NOT NULL,
  aggregate_type text,
  aggregate_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  published_at timestamptz,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE INDEX identity_directory_outbox_status_index
  ON lawos_identity.directory_outbox_events (tenant_id, status, created_at, event_id);

ALTER TABLE lawos_identity.account_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.account_memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.directory_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.directory_idempotency_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.directory_outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.directory_outbox_events FORCE ROW LEVEL SECURITY;

CREATE POLICY identity_account_memberships_tenant_policy ON lawos_identity.account_memberships
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
CREATE POLICY identity_directory_idempotency_tenant_policy ON lawos_identity.directory_idempotency_keys
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
CREATE POLICY identity_directory_outbox_tenant_policy ON lawos_identity.directory_outbox_events
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
