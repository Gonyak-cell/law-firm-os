CREATE SCHEMA IF NOT EXISTS lawos_integrations;

CREATE TABLE lawos_integrations.docusign_requests (
  tenant_id text NOT NULL,
  request_id text NOT NULL,
  idempotency_key text NOT NULL,
  active_fingerprint text,
  envelope_id text,
  request_data jsonb NOT NULL,
  state_version bigint NOT NULL DEFAULT 1 CHECK (state_version > 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, request_id),
  UNIQUE (tenant_id, idempotency_key),
  UNIQUE (tenant_id, envelope_id),
  CHECK (active_fingerprint IS NULL OR active_fingerprint ~ '^[a-f0-9]{64}$')
);

CREATE UNIQUE INDEX docusign_requests_one_active_fingerprint
  ON lawos_integrations.docusign_requests (tenant_id, active_fingerprint)
  WHERE active_fingerprint IS NOT NULL;

CREATE TABLE lawos_integrations.docusign_webhook_receipts (
  tenant_id text NOT NULL,
  receipt_hash text NOT NULL CHECK (receipt_hash ~ '^[a-f0-9]{64}$'),
  receipt_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, receipt_hash)
);

ALTER TABLE lawos_integrations.docusign_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_integrations.docusign_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY docusign_requests_tenant_isolation
  ON lawos_integrations.docusign_requests
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());

ALTER TABLE lawos_integrations.docusign_webhook_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_integrations.docusign_webhook_receipts FORCE ROW LEVEL SECURITY;
CREATE POLICY docusign_webhook_receipts_tenant_isolation
  ON lawos_integrations.docusign_webhook_receipts
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());

REVOKE ALL ON SCHEMA lawos_integrations FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA lawos_integrations FROM PUBLIC;
