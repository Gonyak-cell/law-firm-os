CREATE TABLE lawos_identity.tenants (
  tenant_id text PRIMARY KEY CHECK (tenant_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$'),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 200),
  deployment_mode text NOT NULL CHECK (deployment_mode = 'tenant-pinned'),
  staff_auth_authority text NOT NULL CHECK (staff_auth_authority IN ('internal-password', 'entra-oidc')),
  federated_tenant_id text,
  status text NOT NULL DEFAULT 'provisioning' CHECK (status IN ('provisioning', 'active', 'disabled')),
  member_count integer NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  state_version bigint NOT NULL DEFAULT 1 CHECK (state_version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (staff_auth_authority = 'entra-oidc' AND federated_tenant_id IS NOT NULL)
    OR (staff_auth_authority = 'internal-password' AND federated_tenant_id IS NULL)
  ),
  CHECK (
    federated_tenant_id IS NULL
    OR federated_tenant_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  )
);

CREATE UNIQUE INDEX identity_external_tenant_federation_index
  ON lawos_identity.tenants (federated_tenant_id)
  WHERE federated_tenant_id IS NOT NULL;

CREATE TABLE lawos_identity.tenant_provisioning_requests (
  tenant_id text NOT NULL,
  idempotency_key_hash text NOT NULL CHECK (idempotency_key_hash ~ '^[a-f0-9]{64}$'),
  request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  operator_ref_hash text NOT NULL CHECK (operator_ref_hash ~ '^[a-f0-9]{64}$'),
  requested_member_count integer NOT NULL CHECK (requested_member_count >= 1),
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  receipt jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  PRIMARY KEY (tenant_id, idempotency_key_hash),
  FOREIGN KEY (tenant_id) REFERENCES lawos_identity.tenants (tenant_id),
  CHECK (
    (status = 'in_progress' AND receipt IS NULL AND completed_at IS NULL)
    OR (status = 'completed' AND receipt IS NOT NULL AND completed_at IS NOT NULL)
  )
);

ALTER TABLE lawos_identity.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.tenants FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.tenant_provisioning_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_identity.tenant_provisioning_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY identity_tenants_tenant_policy ON lawos_identity.tenants
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
CREATE POLICY identity_tenant_provisioning_requests_tenant_policy
  ON lawos_identity.tenant_provisioning_requests
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
