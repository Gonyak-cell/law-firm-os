CREATE TABLE IF NOT EXISTS lawos_email_dms.conversation_policies (
  tenant_id text NOT NULL,
  policy_id text NOT NULL,
  user_id text NOT NULL,
  entra_subject_id text NOT NULL,
  m365_connection_id text NOT NULL,
  mailbox_ref text NOT NULL,
  conversation_id text NOT NULL,
  matter_id text NOT NULL,
  seed_email_thread_id text NOT NULL,
  seed_filing_receipt_ref text NOT NULL,
  enabling_actor_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'paused', 'revoked')),
  pause_reason text,
  version bigint NOT NULL CHECK (version >= 1),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  revoked_at timestamptz,
  PRIMARY KEY (tenant_id, policy_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS conversation_policy_active_placement_uq
  ON lawos_email_dms.conversation_policies
    (tenant_id, m365_connection_id, conversation_id)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS lawos_email_dms.graph_subscriptions (
  tenant_id text NOT NULL,
  subscription_id text NOT NULL,
  user_id text NOT NULL,
  entra_subject_id text NOT NULL,
  entra_tenant_id text NOT NULL,
  m365_connection_id text NOT NULL,
  mailbox_ref text NOT NULL CHECK (mailbox_ref ~ '^[a-f0-9]{64}$'),
  resource text NOT NULL CHECK (resource IN (
    'me/mailFolders(''inbox'')/messages',
    'me/mailFolders(''sentitems'')/messages'
  )),
  change_type text NOT NULL CHECK (change_type = 'created'),
  client_state_hash text NOT NULL CHECK (client_state_hash ~ '^[a-f0-9]{64}$'),
  client_state_ref text NOT NULL CHECK (client_state_ref ~ '^client_state_ref_[a-f0-9]{32}$'),
  notification_url_hash text NOT NULL CHECK (notification_url_hash ~ '^[a-f0-9]{64}$'),
  provider_subscription_id text,
  provider_expires_at timestamptz,
  status text NOT NULL CHECK (status IN ('pending', 'active', 'reauthorization_required', 'cleanup_pending', 'expired', 'revoked')),
  provisioning_operation text CHECK (provisioning_operation IS NULL OR provisioning_operation = 'create'),
  provisioning_correlation_id uuid,
  provisioning_started_at timestamptz,
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, subscription_id),
  UNIQUE (tenant_id, m365_connection_id, resource),
  UNIQUE (tenant_id, client_state_ref),
  CHECK ((provisioning_operation IS NULL
      AND provisioning_correlation_id IS NULL
      AND provisioning_started_at IS NULL)
    OR (provisioning_operation = 'create'
      AND provisioning_correlation_id IS NOT NULL
      AND provisioning_started_at IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS graph_subscription_provider_id_uq
  ON lawos_email_dms.graph_subscriptions (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lawos_email_dms.graph_delta_cursors (
  tenant_id text NOT NULL,
  m365_connection_id text NOT NULL,
  resource text NOT NULL,
  cursor_ref text CHECK (cursor_ref IS NULL OR cursor_ref ~ '^sealed:v1:'),
  reconciliation_required_at timestamptz,
  last_reconciled_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version >= 1),
  PRIMARY KEY (tenant_id, m365_connection_id, resource)
);

CREATE TABLE IF NOT EXISTS lawos_email_dms.graph_notification_jobs (
  tenant_id text NOT NULL,
  job_id text NOT NULL,
  subscription_id text NOT NULL,
  resource text NOT NULL,
  notification_kind text NOT NULL CHECK (notification_kind IN ('message', 'lifecycle')),
  job_kind text NOT NULL CHECK (job_kind IN ('message_notification', 'delta_reconciliation', 'subscription_reconcile')),
  dedupe_key text NOT NULL,
  message_id text,
  lifecycle_event text CHECK (lifecycle_event IN ('missed', 'reauthorizationRequired', 'subscriptionRemoved')),
  subscription_expiration_at timestamptz,
  status text NOT NULL CHECK (status IN ('pending', 'leased', 'retry', 'completed', 'dead_letter')),
  available_at timestamptz NOT NULL,
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text,
  result_code text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, job_id),
  UNIQUE (tenant_id, dedupe_key),
  CHECK ((notification_kind = 'message' AND message_id IS NOT NULL AND lifecycle_event IS NULL)
      OR (notification_kind = 'lifecycle' AND message_id IS NULL AND lifecycle_event IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS lawos_email_dms.graph_notification_receipts (
  tenant_id text NOT NULL,
  receipt_id text NOT NULL,
  subscription_id text NOT NULL,
  provider_subscription_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('webhook', 'delta_reconciliation')),
  resource text NOT NULL,
  notification_kind text NOT NULL CHECK (notification_kind IN ('message', 'lifecycle')),
  message_id text,
  lifecycle_event text CHECK (lifecycle_event IN ('missed', 'reauthorizationRequired', 'subscriptionRemoved')),
  subscription_expiration_at timestamptz,
  change_type text CHECK (change_type = 'created'),
  received_at timestamptz NOT NULL,
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY (tenant_id, receipt_id),
  CHECK ((notification_kind = 'message' AND message_id IS NOT NULL AND lifecycle_event IS NULL)
      OR (notification_kind = 'lifecycle' AND message_id IS NULL AND lifecycle_event IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS lawos_email_dms.graph_sync_audit_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  object_id text NOT NULL,
  actor_id text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE TABLE IF NOT EXISTS lawos_email_dms.graph_sync_idempotency (
  tenant_id text NOT NULL,
  idempotency_key text NOT NULL,
  operation text NOT NULL,
  request_fingerprint text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, idempotency_key)
);

CREATE OR REPLACE FUNCTION lawos_email_dms.reject_graph_sync_immutable_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'graph sync receipt and audit rows are immutable';
END
$$;

GRANT USAGE ON SCHEMA lawos_email_dms TO lawos_app;
GRANT SELECT, INSERT, UPDATE ON
  lawos_email_dms.conversation_policies,
  lawos_email_dms.graph_subscriptions,
  lawos_email_dms.graph_delta_cursors,
  lawos_email_dms.graph_notification_jobs
TO lawos_app;
GRANT SELECT, INSERT ON
  lawos_email_dms.graph_notification_receipts,
  lawos_email_dms.graph_sync_audit_events,
  lawos_email_dms.graph_sync_idempotency
TO lawos_app;

DROP TRIGGER IF EXISTS graph_notification_receipts_immutable
  ON lawos_email_dms.graph_notification_receipts;
CREATE TRIGGER graph_notification_receipts_immutable
  BEFORE UPDATE OR DELETE ON lawos_email_dms.graph_notification_receipts
  FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.reject_graph_sync_immutable_mutation();

DROP TRIGGER IF EXISTS graph_sync_audit_events_immutable
  ON lawos_email_dms.graph_sync_audit_events;
CREATE TRIGGER graph_sync_audit_events_immutable
  BEFORE UPDATE OR DELETE ON lawos_email_dms.graph_sync_audit_events
  FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.reject_graph_sync_immutable_mutation();

ALTER TABLE lawos_email_dms.conversation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_delta_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_notification_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_sync_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_sync_idempotency ENABLE ROW LEVEL SECURITY;

ALTER TABLE lawos_email_dms.conversation_policies FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_delta_cursors FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_notification_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_notification_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_sync_audit_events FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_email_dms.graph_sync_idempotency FORCE ROW LEVEL SECURITY;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'conversation_policies', 'graph_subscriptions', 'graph_delta_cursors',
    'graph_notification_jobs', 'graph_notification_receipts',
    'graph_sync_audit_events', 'graph_sync_idempotency'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON lawos_email_dms.%I', table_name);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON lawos_email_dms.%I USING (tenant_id = lawos_security.current_tenant_id()) WITH CHECK (tenant_id = lawos_security.current_tenant_id())',
      table_name
    );
  END LOOP;
END
$$;
