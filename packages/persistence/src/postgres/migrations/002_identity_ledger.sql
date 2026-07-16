CREATE SCHEMA IF NOT EXISTS lawos_identity;

CREATE TABLE lawos_identity.accounts (
  tenant_id text NOT NULL,
  user_id text NOT NULL,
  email text,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'disabled')),
  credential_provider text,
  credential_status text NOT NULL DEFAULT 'reset_required' CHECK (credential_status IN ('active', 'must_change', 'reset_required', 'locked', 'disabled')),
  credential_rev bigint NOT NULL DEFAULT 1 CHECK (credential_rev >= 1),
  password_hash jsonb NOT NULL DEFAULT '{}'::jsonb,
  failed_login_count integer NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE UNIQUE INDEX identity_account_email_index
  ON lawos_identity.accounts (tenant_id, lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE lawos_identity.sessions (
  tenant_id text NOT NULL,
  session_jti text NOT NULL,
  session_id text NOT NULL,
  user_id text NOT NULL,
  credential_rev bigint NOT NULL CHECK (credential_rev >= 1),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  revoked_by text,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, session_jti),
  FOREIGN KEY (tenant_id, user_id) REFERENCES lawos_identity.accounts (tenant_id, user_id)
);

CREATE INDEX identity_active_session_index
  ON lawos_identity.sessions (tenant_id, user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE lawos_identity.challenges (
  tenant_id text NOT NULL,
  challenge_id text NOT NULL,
  challenge_type text NOT NULL CHECK (challenge_type IN ('password_reset', 'step_up')),
  challenge_hash text NOT NULL,
  user_id text NOT NULL,
  email text,
  purpose text,
  provider_id text,
  requested_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  revoke_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, challenge_id),
  UNIQUE (tenant_id, challenge_type, challenge_hash),
  FOREIGN KEY (tenant_id, user_id) REFERENCES lawos_identity.accounts (tenant_id, user_id)
);

CREATE INDEX identity_open_challenge_index
  ON lawos_identity.challenges (tenant_id, user_id, challenge_type, expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE TABLE lawos_identity.break_glass_requests (
  tenant_id text NOT NULL,
  break_glass_request_id text NOT NULL,
  requester_user_id text NOT NULL,
  requester_label text,
  reason text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'approved', 'revoked')),
  requested_at timestamptz NOT NULL,
  decided_by text,
  decided_at timestamptz,
  PRIMARY KEY (tenant_id, break_glass_request_id),
  FOREIGN KEY (tenant_id, requester_user_id) REFERENCES lawos_identity.accounts (tenant_id, user_id)
);

CREATE TABLE lawos_identity.security_audit_events (
  tenant_id text NOT NULL,
  audit_event_id text NOT NULL,
  action text NOT NULL,
  object_id text,
  actor_id text,
  occurred_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (tenant_id, audit_event_id)
);

CREATE INDEX identity_security_audit_index
  ON lawos_identity.security_audit_events (tenant_id, occurred_at DESC, audit_event_id DESC);

CREATE FUNCTION lawos_identity.reject_security_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'security audit events are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER security_audit_events_append_only
BEFORE UPDATE OR DELETE ON lawos_identity.security_audit_events
FOR EACH ROW EXECUTE FUNCTION lawos_identity.reject_security_audit_mutation();

ALTER TABLE lawos_identity.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.challenges FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.break_glass_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.break_glass_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.security_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.security_audit_events FORCE ROW LEVEL SECURITY;

CREATE POLICY identity_accounts_tenant_policy ON lawos_identity.accounts
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY identity_sessions_tenant_policy ON lawos_identity.sessions
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY identity_challenges_tenant_policy ON lawos_identity.challenges
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY identity_break_glass_tenant_policy ON lawos_identity.break_glass_requests
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
CREATE POLICY identity_security_audit_tenant_policy ON lawos_identity.security_audit_events
  USING (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''))
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant_id', true), ''));
