ALTER TABLE lawos_identity.sessions
  ADD COLUMN IF NOT EXISTS membership_state_version bigint;

UPDATE lawos_identity.sessions AS sessions
   SET membership_state_version = memberships.state_version
  FROM lawos_identity.account_memberships AS memberships
 WHERE memberships.tenant_id = sessions.tenant_id
   AND memberships.user_id = sessions.user_id
   AND sessions.membership_state_version IS NULL;

-- A legacy session without a current tenant membership has no authority to
-- survive this migration. Removing only those ephemeral sessions keeps the
-- new NOT NULL contract fail-closed instead of inventing membership state.
DELETE FROM lawos_identity.sessions
 WHERE membership_state_version IS NULL;

ALTER TABLE lawos_identity.sessions
  ALTER COLUMN membership_state_version SET NOT NULL;

ALTER TABLE lawos_identity.sessions
  DROP CONSTRAINT IF EXISTS identity_session_membership_state_version_check;

ALTER TABLE lawos_identity.sessions
  ADD CONSTRAINT identity_session_membership_state_version_check
  CHECK (membership_state_version >= 1);

CREATE TABLE lawos_identity.password_reset_jobs (
  tenant_id text NOT NULL,
  job_id text NOT NULL,
  email text NOT NULL,
  request_id text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'processing', 'completed', 'dropped', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_owner text,
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, job_id)
);

CREATE INDEX identity_password_reset_jobs_claim_index
  ON lawos_identity.password_reset_jobs (tenant_id, state, available_at, created_at)
  WHERE state IN ('pending', 'processing');

ALTER TABLE lawos_identity.password_reset_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.password_reset_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY identity_password_reset_jobs_tenant_policy ON lawos_identity.password_reset_jobs
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
