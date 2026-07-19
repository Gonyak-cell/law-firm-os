CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS lawos_security;
REVOKE ALL ON SCHEMA lawos_security FROM PUBLIC;
GRANT USAGE ON SCHEMA lawos_security TO PUBLIC;

CREATE TABLE lawos_security.tenant_context_authorities (
  database_role name NOT NULL,
  tenant_id text NOT NULL,
  context_secret bytea NOT NULL CHECK (octet_length(context_secret) >= 32),
  synthetic_wildcard boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  rotated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (database_role, tenant_id),
  CHECK (tenant_id <> '*' OR synthetic_wildcard)
);

REVOKE ALL ON lawos_security.tenant_context_authorities FROM PUBLIC;

CREATE FUNCTION lawos_security.current_tenant_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, lawos_security, public
AS $$
DECLARE
  selected_tenant text := nullif(current_setting('app.current_tenant_id', true), '');
  context_nonce text := nullif(current_setting('app.tenant_context_nonce', true), '');
  supplied_signature text := nullif(current_setting('app.tenant_context_signature', true), '');
  authority_secret bytea;
  expected_signature text;
BEGIN
  IF selected_tenant IS NULL OR context_nonce IS NULL OR supplied_signature IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT authority.context_secret
    INTO authority_secret
    FROM lawos_security.tenant_context_authorities AS authority
   WHERE authority.database_role = session_user::name
     AND authority.active
     AND (
       authority.tenant_id = selected_tenant
       OR (
         authority.tenant_id = '*'
         AND authority.synthetic_wildcard
         AND current_setting('lawos.environment', true) = 'synthetic-test'
       )
     )
   ORDER BY (authority.tenant_id = selected_tenant) DESC
   LIMIT 1;

  IF authority_secret IS NULL THEN
    RETURN NULL;
  END IF;

  expected_signature := encode(
    public.hmac(
      convert_to(selected_tenant || chr(31) || context_nonce, 'UTF8'),
      authority_secret,
      'sha256'
    ),
    'hex'
  );
  IF supplied_signature <> expected_signature THEN
    RETURN NULL;
  END IF;
  RETURN selected_tenant;
END;
$$;

CREATE FUNCTION lawos_security.tenant_context_authority_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, lawos_security
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM lawos_security.tenant_context_authorities AS authority
     WHERE authority.database_role = session_user::name
       AND authority.active
  )
$$;

REVOKE ALL ON FUNCTION lawos_security.current_tenant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION lawos_security.tenant_context_authority_ready() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lawos_security.current_tenant_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION lawos_security.tenant_context_authority_ready() TO PUBLIC;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE qual LIKE '%current_setting(''app.current_tenant_id''%'
        OR with_check LIKE '%current_setting(''app.current_tenant_id''%'
  LOOP
    EXECUTE format(
      'ALTER POLICY %I ON %I.%I USING (tenant_id = lawos_security.current_tenant_id()) WITH CHECK (tenant_id = lawos_security.current_tenant_id())',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  END LOOP;
END;
$$;
