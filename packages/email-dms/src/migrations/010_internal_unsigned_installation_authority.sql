DO $$
DECLARE table_name text;
BEGIN
  IF session_user<>'lawos_admin' OR current_user<>'lawos_admin' THEN
    RAISE EXCEPTION 'internal unsigned installation migration requires lawos_admin';
  END IF;
  IF to_regprocedure(
       'lawos_email_dms.read_internal_unsigned_installation_proof_key(text,text,text,text)'
     ) IS NOT NULL OR to_regprocedure(
       'lawos_email_dms.apply_internal_unsigned_installation(text,jsonb)'
     ) IS NOT NULL THEN
    RAISE EXCEPTION 'internal unsigned installation authority exists without migration ledger';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
     WHERE rolname='lawos_outlook_authority_owner'
       AND NOT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb
       AND NOT rolcreaterole AND NOT rolinherit AND NOT rolreplication
       AND NOT rolbypassrls
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_roles
     WHERE rolname='lawos_app' AND rolcanlogin AND NOT rolsuper
       AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolinherit
       AND NOT rolreplication AND NOT rolbypassrls
  ) THEN
    RAISE EXCEPTION 'internal unsigned installation roles are absent or unsafe';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='lawos_outlook_control_operator'
    AND rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
    AND NOT rolinherit AND NOT rolreplication AND NOT rolbypassrls) THEN
    RAISE EXCEPTION 'internal unsigned control role absent or unsafe';
  END IF;
  IF has_schema_privilege(
       'lawos_outlook_authority_owner','lawos_email_dms','CREATE'
     ) OR EXISTS (
    SELECT 1 FROM pg_auth_members AS membership
     WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
       AND membership.member='lawos_admin'::regrole
       AND membership.grantor='lawos_admin'::regrole
  ) THEN
    RAISE EXCEPTION 'internal unsigned installation temporary capability already exists';
  END IF;
  FOREACH table_name IN ARRAY ARRAY[
    'outlook_desktop_installations',
    'outlook_desktop_installation_nonces',
    'outlook_desktop_installation_idempotency',
    'outlook_desktop_installation_audit_events'
  ] LOOP
    IF has_table_privilege(
         'lawos_app','lawos_email_dms.'||table_name,
         'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
       ) OR has_any_column_privilege(
         'lawos_app','lawos_email_dms.'||table_name,
         'SELECT,INSERT,UPDATE,REFERENCES'
       ) THEN
      RAISE EXCEPTION 'internal unsigned installation raw table boundary is unsafe: %',
        table_name;
    END IF;
  END LOOP;
END
$$;

GRANT lawos_outlook_authority_owner TO lawos_admin
  WITH SET TRUE, INHERIT FALSE, ADMIN FALSE
  GRANTED BY lawos_admin;

GRANT USAGE,CREATE ON SCHEMA lawos_email_dms
  TO lawos_outlook_authority_owner;

SET LOCAL ROLE lawos_outlook_authority_owner;

CREATE TABLE lawos_email_dms.internal_unsigned_release_authorizations (
  tenant_id text NOT NULL,
  authorization_id text NOT NULL CHECK (authorization_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'),
  grant_payload jsonb NOT NULL CHECK (jsonb_typeof(grant_payload)='object'),
  authorized_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id,authorization_id),
  CHECK ((grant_payload->>'tenant_id') IS NOT DISTINCT FROM tenant_id),
  CHECK ((grant_payload->>'authorization_id') IS NOT DISTINCT FROM authorization_id),
  CHECK ((grant_payload->>'release_authority_sha256') IS NOT DISTINCT FROM encode(
    pg_catalog.sha256(convert_to(lawos_email_dms.outlook_desktop_canonical_json_text(
      grant_payload-'release_authority_sha256'),'UTF8')),'hex'))
);

CREATE TABLE lawos_email_dms.internal_unsigned_release_revocations (
  tenant_id text NOT NULL,
  authorization_id text NOT NULL,
  revocation_id text NOT NULL CHECK (revocation_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload)='object'),
  revoked_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id,authorization_id),
  UNIQUE (tenant_id,revocation_id),
  FOREIGN KEY (tenant_id,authorization_id) REFERENCES
    lawos_email_dms.internal_unsigned_release_authorizations(tenant_id,authorization_id),
  CHECK ((payload->>'authorization_id') IS NOT DISTINCT FROM authorization_id),
  CHECK ((payload->>'revocation_id') IS NOT DISTINCT FROM revocation_id)
);

CREATE TABLE lawos_email_dms.internal_unsigned_installation_bindings (
  tenant_id text NOT NULL,
  installation_id text NOT NULL,
  authorization_id text NOT NULL,
  installation_release_binding_sha256 text NOT NULL
    CHECK (installation_release_binding_sha256 ~ '^[a-f0-9]{64}$'),
  authenticated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id,installation_id),
  UNIQUE (tenant_id,authorization_id),
  FOREIGN KEY (tenant_id,installation_id) REFERENCES
    lawos_email_dms.outlook_desktop_installations(tenant_id,installation_id),
  FOREIGN KEY (tenant_id,authorization_id) REFERENCES
    lawos_email_dms.internal_unsigned_release_authorizations(tenant_id,authorization_id)
);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'internal_unsigned_release_authorizations',
    'internal_unsigned_release_revocations',
    'internal_unsigned_installation_bindings'
  ] LOOP
    EXECUTE format('ALTER TABLE lawos_email_dms.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE lawos_email_dms.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY tenant_isolation ON lawos_email_dms.%I USING (tenant_id=lawos_security.current_tenant_id()) WITH CHECK (tenant_id=lawos_security.current_tenant_id())',table_name);
    EXECUTE format('CREATE TRIGGER immutable_rows BEFORE UPDATE OR DELETE ON lawos_email_dms.%I FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.reject_outlook_desktop_immutable_mutation()',table_name);
    EXECUTE format('CREATE TRIGGER immutable_truncate BEFORE TRUNCATE ON lawos_email_dms.%I FOR EACH STATEMENT EXECUTE FUNCTION lawos_email_dms.reject_outlook_desktop_immutable_mutation()',table_name);
    EXECUTE format('REVOKE ALL ON TABLE lawos_email_dms.%I FROM PUBLIC,lawos_app,lawos_outlook_control_operator',table_name);
  END LOOP;
END
$$;

CREATE FUNCTION lawos_email_dms.authorize_internal_unsigned_release(
  bound_tenant_id text,
  bound_grant jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE grant_keys constant text[] := ARRAY[
  'tenant_id','authorization_id','user_id','entra_subject_id',
  'device_key_fingerprint','installed_receipt_sha256','app_id','platform',
  'architecture','channel','release_id','release_sequence','version',
  'source_sha','source_tree','installer_sha256','installer_bytes',
  'installer_version_id','bootstrap_marker_sha256','owner_approval_sha256',
  'valid_from','valid_until','release_authority_sha256'
];
DECLARE key_name text;
DECLARE now_at timestamptz;
DECLARE starts_at timestamptz;
DECLARE ends_at timestamptz;
DECLARE release_authorization lawos_email_dms.internal_unsigned_release_authorizations%ROWTYPE;
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'internal unsigned release control role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_grant) IS DISTINCT FROM 'object'
     OR NOT bound_grant ?& grant_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_grant) AS key WHERE key<>ALL(grant_keys))
     OR EXISTS (SELECT 1 FROM jsonb_each(bound_grant) AS member
       WHERE jsonb_typeof(member.value) IS DISTINCT FROM
         CASE WHEN member.key IN ('release_sequence','installer_bytes') THEN 'number' ELSE 'string' END)
     OR bound_grant->>'tenant_id' IS DISTINCT FROM bound_tenant_id THEN
    RAISE EXCEPTION 'internal unsigned release grant shape invalid' USING ERRCODE='LIU07';
  END IF;
  FOREACH key_name IN ARRAY ARRAY['authorization_id','user_id','entra_subject_id','release_id'] LOOP
    IF bound_grant->>key_name !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$' THEN
      RAISE EXCEPTION 'internal unsigned release identifier invalid' USING ERRCODE='LIU07';
    END IF;
  END LOOP;
  FOREACH key_name IN ARRAY ARRAY['device_key_fingerprint','installed_receipt_sha256',
    'installer_sha256','bootstrap_marker_sha256','owner_approval_sha256','release_authority_sha256'] LOOP
    IF bound_grant->>key_name !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'internal unsigned release digest invalid' USING ERRCODE='LIU07';
    END IF;
  END LOOP;
  IF bound_grant->>'app_id'<>'com.amic.matter.desktop.internal'
     OR bound_grant->>'platform'<>'win32' OR bound_grant->>'architecture'<>'x64'
     OR bound_grant->>'channel'<>'internal-unsigned'
     OR bound_grant->>'version' !~ '^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$'
     OR char_length(bound_grant->>'version')>64
     OR bound_grant->>'source_sha' !~ '^[a-f0-9]{40}$'
     OR bound_grant->>'source_tree' !~ '^[a-f0-9]{40}$'
     OR bound_grant->>'release_sequence' !~ '^[1-9][0-9]{0,15}$'
     OR bound_grant->>'installer_bytes' !~ '^[1-9][0-9]{0,15}$'
     OR (bound_grant->>'release_sequence')::numeric>9007199254740991
     OR (bound_grant->>'installer_bytes')::numeric>2147483648
     OR char_length(bound_grant->>'installer_version_id') NOT BETWEEN 1 AND 1024
     OR bound_grant->>'installer_version_id' !~ '^[A-Za-z0-9][A-Za-z0-9._+=/-]*$'
     OR bound_grant->>'installer_version_id'='null'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_grant->>'valid_from')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_grant->>'valid_until')
     OR bound_grant->>'release_authority_sha256'<>encode(pg_catalog.sha256(convert_to(
       lawos_email_dms.outlook_desktop_canonical_json_text(bound_grant-'release_authority_sha256'),'UTF8')),'hex') THEN
    RAISE EXCEPTION 'internal unsigned release grant binding invalid' USING ERRCODE='LIU08';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'internal-release'||chr(31)||(bound_grant->>'authorization_id'),0));
  now_at := date_trunc('milliseconds',clock_timestamp());
  starts_at := (bound_grant->>'valid_from')::timestamptz;
  ends_at := (bound_grant->>'valid_until')::timestamptz;
  IF starts_at>now_at OR ends_at<=now_at OR ends_at<=starts_at
     OR ends_at-starts_at>interval '31 days' THEN
    RAISE EXCEPTION 'internal unsigned release grant time invalid' USING ERRCODE='LIU08';
  END IF;
  SELECT * INTO release_authorization FROM lawos_email_dms.internal_unsigned_release_authorizations
    WHERE tenant_id=bound_tenant_id AND authorization_id=bound_grant->>'authorization_id';
  IF FOUND THEN
    IF release_authorization.grant_payload IS DISTINCT FROM bound_grant THEN
      RAISE EXCEPTION 'internal unsigned release grant idempotency conflict' USING ERRCODE='LIU01';
    END IF;
    IF EXISTS (SELECT 1 FROM lawos_email_dms.internal_unsigned_release_revocations
      WHERE tenant_id=bound_tenant_id AND authorization_id=release_authorization.authorization_id) THEN
      RAISE EXCEPTION 'internal unsigned release revoked' USING ERRCODE='LIU06';
    END IF;
  ELSE
    INSERT INTO lawos_email_dms.internal_unsigned_release_authorizations
      (tenant_id,authorization_id,grant_payload,authorized_at)
    VALUES (bound_tenant_id,bound_grant->>'authorization_id',bound_grant,now_at)
    RETURNING * INTO release_authorization;
  END IF;
  RETURN jsonb_build_object('authorization_id',release_authorization.authorization_id,
    'release_authority_sha256',release_authorization.grant_payload->>'release_authority_sha256',
    'authorized_at',release_authorization.authorized_at);
END
$$;

CREATE FUNCTION lawos_email_dms.revoke_internal_unsigned_release(
  bound_tenant_id text,
  bound_revocation jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE keys constant text[] := ARRAY['authorization_id','expected_release_authority_sha256',
  'revocation_id','reason','owner_approval_sha256'];
DECLARE release_authorization lawos_email_dms.internal_unsigned_release_authorizations%ROWTYPE;
DECLARE revocation lawos_email_dms.internal_unsigned_release_revocations%ROWTYPE;
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'internal unsigned release control role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_revocation) IS DISTINCT FROM 'object'
     OR NOT bound_revocation ?& keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_revocation) AS key WHERE key<>ALL(keys))
     OR EXISTS (SELECT 1 FROM jsonb_each(bound_revocation) AS member WHERE jsonb_typeof(member.value) IS DISTINCT FROM 'string')
     OR bound_revocation->>'authorization_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_revocation->>'revocation_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_revocation->>'reason' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_revocation->>'expected_release_authority_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_revocation->>'owner_approval_sha256' !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'internal unsigned revocation shape invalid' USING ERRCODE='LIU07';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'internal-release'||chr(31)||(bound_revocation->>'authorization_id'),0));
  SELECT * INTO release_authorization FROM lawos_email_dms.internal_unsigned_release_authorizations
    WHERE tenant_id=bound_tenant_id AND authorization_id=bound_revocation->>'authorization_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal unsigned release absent' USING ERRCODE='LIU05';
  END IF;
  IF release_authorization.grant_payload->>'release_authority_sha256'<>
      bound_revocation->>'expected_release_authority_sha256' THEN
    RAISE EXCEPTION 'internal unsigned revocation state conflict' USING ERRCODE='LIU04';
  END IF;
  SELECT * INTO revocation FROM lawos_email_dms.internal_unsigned_release_revocations
    WHERE tenant_id=bound_tenant_id AND authorization_id=release_authorization.authorization_id;
  IF FOUND THEN
    IF revocation.payload IS DISTINCT FROM bound_revocation THEN
      RAISE EXCEPTION 'internal unsigned revocation idempotency conflict' USING ERRCODE='LIU01';
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM lawos_email_dms.internal_unsigned_release_revocations
      WHERE tenant_id=bound_tenant_id AND revocation_id=bound_revocation->>'revocation_id') THEN
      RAISE EXCEPTION 'internal unsigned revocation idempotency conflict' USING ERRCODE='LIU01';
    END IF;
    INSERT INTO lawos_email_dms.internal_unsigned_release_revocations
      (tenant_id,authorization_id,revocation_id,payload,revoked_at)
    VALUES (bound_tenant_id,release_authorization.authorization_id,bound_revocation->>'revocation_id',
      bound_revocation,date_trunc('milliseconds',clock_timestamp())) RETURNING * INTO revocation;
  END IF;
  RETURN jsonb_build_object('authorization_id',revocation.authorization_id,
    'revocation_id',revocation.revocation_id,'revoked_at',revocation.revoked_at);
END
$$;

CREATE FUNCTION lawos_email_dms.apply_internal_unsigned_installation(
  bound_tenant_id text,
  bound_transition jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE top_keys constant text[] := ARRAY[
  'operation','principal','request_id','installation_id','body','verified'
];
DECLARE principal_keys constant text[] := ARRAY[
  'user_id','entra_subject_id'
];
DECLARE verified_keys constant text[] := ARRAY[
  'idempotency_key','nonce_hash','request_fingerprint','issued_at',
  'expires_at','device_key_fingerprint'
];
DECLARE register_body_keys constant text[] := ARRAY[
  'release_authorization_id','device_public_key','installed_receipt_sha256'
];
DECLARE legacy_register_body_keys constant text[] := ARRAY[
  'platform','app_version','source_sha','device_public_key'
];
DECLARE heartbeat_body_keys constant text[] := ARRAY[
  'expected_state_version'
];
DECLARE retire_body_keys constant text[] := ARRAY[
  'expected_state_version','retire_reason'
];
DECLARE operation_value text;
DECLARE principal jsonb;
DECLARE body jsonb;
DECLARE verified jsonb;
DECLARE user_id_value text;
DECLARE entra_subject_id_value text;
DECLARE request_id_value text;
DECLARE installation_id_value text;
DECLARE idempotency_key_value text;
DECLARE nonce_hash_value text;
DECLARE request_fingerprint_value text;
DECLARE fingerprint_value text;
DECLARE issued_at_value timestamptz;
DECLARE expires_at_value timestamptz;
DECLARE expected_state_version_value bigint;
DECLARE now_at timestamptz;
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE receipt lawos_email_dms.outlook_desktop_installation_idempotency%ROWTYPE;
DECLARE outcome_value text;
DECLARE event_type_value text;
DECLARE response_status_value integer := 200;
DECLARE response_body jsonb;
DECLARE response_envelope jsonb;
DECLARE retire_reason_value text;
DECLARE release_authorization lawos_email_dms.internal_unsigned_release_authorizations%ROWTYPE;
DECLARE binding lawos_email_dms.internal_unsigned_installation_bindings%ROWTYPE;
DECLARE authorization_id_value text;
DECLARE installed_receipt_sha256_value text;
DECLARE legacy_registration boolean := false;
DECLARE candidate_count bigint;
DECLARE binding_sha256 text;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required'
      USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_transition) IS DISTINCT FROM 'object'
     OR NOT bound_transition ?& top_keys
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(bound_transition) AS key
        WHERE key<>ALL(top_keys)
     ) THEN
    RAISE EXCEPTION 'internal unsigned transition input invalid'
      USING ERRCODE='LIU07';
  END IF;

  operation_value := bound_transition->>'operation';
  principal := bound_transition->'principal';
  body := bound_transition->'body';
  verified := bound_transition->'verified';
  request_id_value := bound_transition->>'request_id';
  installation_id_value := bound_transition->>'installation_id';
  IF operation_value IS NULL OR operation_value NOT IN ('register','heartbeat','retire')
     OR jsonb_typeof(principal) IS DISTINCT FROM 'object'
     OR NOT principal ?& principal_keys
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(principal) AS key
        WHERE key<>ALL(principal_keys)
     )
     OR jsonb_typeof(body) IS DISTINCT FROM 'object'
     OR jsonb_typeof(verified) IS DISTINCT FROM 'object'
     OR NOT verified ?& verified_keys
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(verified) AS key
        WHERE key<>ALL(verified_keys)
     ) THEN
    RAISE EXCEPTION 'internal unsigned transition shape invalid'
      USING ERRCODE='LIU07';
  END IF;

  IF EXISTS (SELECT 1 FROM jsonb_each(principal) AS member WHERE jsonb_typeof(member.value) IS DISTINCT FROM 'string')
     OR EXISTS (SELECT 1 FROM jsonb_each(verified) AS member WHERE jsonb_typeof(member.value) IS DISTINCT FROM 'string')
     OR jsonb_typeof(bound_transition->'operation') IS DISTINCT FROM 'string'
     OR jsonb_typeof(bound_transition->'request_id') IS DISTINCT FROM 'string'
     OR jsonb_typeof(bound_transition->'installation_id') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'internal unsigned transition primitive invalid' USING ERRCODE='LIU07';
  END IF;

  user_id_value := principal->>'user_id';
  entra_subject_id_value := principal->>'entra_subject_id';
  idempotency_key_value := verified->>'idempotency_key';
  nonce_hash_value := verified->>'nonce_hash';
  request_fingerprint_value := verified->>'request_fingerprint';
  fingerprint_value := verified->>'device_key_fingerprint';
  IF user_id_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR entra_subject_id_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR request_id_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR idempotency_key_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{15,199}$'
     OR nonce_hash_value !~ '^[a-f0-9]{64}$'
     OR request_fingerprint_value !~ '^[a-f0-9]{64}$'
     OR fingerprint_value !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       verified->>'issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       verified->>'expires_at')
     OR (operation_value='register' AND installation_id_value<>'NEW')
     OR (operation_value<>'register' AND
       installation_id_value !~ '^odi_[A-Za-z0-9_-]{20,128}$') THEN
    RAISE EXCEPTION 'internal unsigned verified transition invalid'
      USING ERRCODE='LIU07';
  END IF;

  issued_at_value := (verified->>'issued_at')::timestamptz;
  expires_at_value := (verified->>'expires_at')::timestamptz;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=issued_at_value
     OR expires_at_value-issued_at_value>interval '5 minutes'
     OR issued_at_value>now_at+interval '30 seconds'
     OR expires_at_value<=now_at THEN
    RAISE EXCEPTION 'internal unsigned proof freshness invalid'
      USING ERRCODE='LIU07';
  END IF;

  IF operation_value='register' THEN
    legacy_registration := body ?& legacy_register_body_keys AND NOT EXISTS (
      SELECT 1 FROM jsonb_object_keys(body) AS key WHERE key<>ALL(legacy_register_body_keys)
    );
    IF (NOT legacy_registration AND (NOT body ?& register_body_keys OR EXISTS (
          SELECT 1 FROM jsonb_object_keys(body) AS key WHERE key<>ALL(register_body_keys)
        )))
       OR EXISTS (SELECT 1 FROM jsonb_each(body) AS member WHERE jsonb_typeof(member.value) IS DISTINCT FROM 'string')
       OR (NOT legacy_registration AND (
         body->>'release_authorization_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
         OR body->>'installed_receipt_sha256' !~ '^[a-f0-9]{64}$'))
       OR (legacy_registration AND (
         body->>'platform' NOT IN ('win32','darwin')
         OR body->>'app_version' !~ '^[0-9]+\.[0-9]+\.[0-9]+([-+][0-9A-Za-z.-]+)?$'
         OR char_length(body->>'app_version')>64
         OR body->>'source_sha' !~ '^[a-f0-9]{40}$'))
       OR char_length(body->>'device_public_key') NOT BETWEEN 40 AND 512
       OR body->>'device_public_key' !~ '^[A-Za-z0-9+/]+={0,2}$'
       OR octet_length(decode(body->>'device_public_key','base64'))<>44
       OR encode(decode(body->>'device_public_key','base64'),'base64')<>
          body->>'device_public_key'
       OR encode(substring(decode(body->>'device_public_key','base64')
                    FROM 1 FOR 12),'hex')<>'302a300506032b6570032100'
       OR encode(pg_catalog.sha256(
            decode(body->>'device_public_key','base64')),'hex')<>
          fingerprint_value THEN
      RAISE EXCEPTION 'internal unsigned package identity invalid'
        USING ERRCODE='LIU08';
    END IF;
  ELSIF operation_value='heartbeat' THEN
    IF NOT body ?& heartbeat_body_keys OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(body) AS key
          WHERE key<>ALL(heartbeat_body_keys)
       ) OR jsonb_typeof(body->'expected_state_version') IS DISTINCT FROM 'number'
       OR body->>'expected_state_version' !~ '^[1-9][0-9]{0,15}$'
       OR (body->>'expected_state_version')::numeric>9007199254740991 THEN
      RAISE EXCEPTION 'internal unsigned heartbeat input invalid'
        USING ERRCODE='LIU07';
    END IF;
    expected_state_version_value :=
      (body->>'expected_state_version')::bigint;
  ELSE
    IF NOT body ?& retire_body_keys OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(body) AS key
          WHERE key<>ALL(retire_body_keys)
       ) OR jsonb_typeof(body->'expected_state_version') IS DISTINCT FROM 'number'
       OR body->>'expected_state_version' !~ '^[1-9][0-9]{0,15}$'
       OR (body->>'expected_state_version')::numeric>9007199254740991
       OR jsonb_typeof(body->'retire_reason') IS DISTINCT FROM 'string'
       OR body->>'retire_reason' NOT IN (
         'device_disconnect','windows_uninstall','account_removed',
         'installation_replaced'
       ) THEN
      RAISE EXCEPTION 'internal unsigned retirement input invalid'
        USING ERRCODE='LIU07';
    END IF;
    expected_state_version_value :=
      (body->>'expected_state_version')::bigint;
    retire_reason_value := body->>'retire_reason';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||fingerprint_value,0));
  IF operation_value='register' THEN
    IF legacy_registration THEN
      SELECT count(*),min(authorization_id) INTO candidate_count,authorization_id_value
        FROM lawos_email_dms.internal_unsigned_release_authorizations
       WHERE tenant_id=bound_tenant_id
         AND grant_payload->>'device_key_fingerprint'=fingerprint_value;
      IF candidate_count=0 THEN
        RAISE EXCEPTION 'no applicable internal unsigned release grant' USING ERRCODE='LIU09';
      END IF;
      IF candidate_count<>1 THEN
        RAISE EXCEPTION 'internal unsigned release grant is ambiguous' USING ERRCODE='LIU08';
      END IF;
    ELSE
      authorization_id_value := body->>'release_authorization_id';
      installed_receipt_sha256_value := body->>'installed_receipt_sha256';
    END IF;
  ELSE
    SELECT authorization_id INTO authorization_id_value
      FROM lawos_email_dms.internal_unsigned_installation_bindings
     WHERE tenant_id=bound_tenant_id AND installation_id=installation_id_value;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'internal unsigned installation not found' USING ERRCODE='LIU05';
    END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'internal-release'||chr(31)||authorization_id_value,0));
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=now_at OR issued_at_value>now_at+interval '30 seconds' THEN
    RAISE EXCEPTION 'internal unsigned proof expired while waiting' USING ERRCODE='LIU07';
  END IF;
  SELECT * INTO release_authorization FROM lawos_email_dms.internal_unsigned_release_authorizations
    WHERE tenant_id=bound_tenant_id AND authorization_id=authorization_id_value;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal unsigned release absent' USING ERRCODE='LIU05';
  END IF;
  IF legacy_registration THEN
    IF release_authorization.grant_payload->>'platform'<>body->>'platform'
       OR release_authorization.grant_payload->>'version'<>body->>'app_version'
       OR release_authorization.grant_payload->>'source_sha'<>body->>'source_sha' THEN
      RAISE EXCEPTION 'internal unsigned legacy package tuple mismatch' USING ERRCODE='LIU08';
    END IF;
    installed_receipt_sha256_value := release_authorization.grant_payload->>'installed_receipt_sha256';
  END IF;
  IF release_authorization.grant_payload->>'user_id'<>user_id_value
     OR release_authorization.grant_payload->>'entra_subject_id'<>entra_subject_id_value
     OR release_authorization.grant_payload->>'device_key_fingerprint'<>fingerprint_value
     OR (operation_value='register' AND release_authorization.grant_payload->>'installed_receipt_sha256'<>
          installed_receipt_sha256_value) THEN
    RAISE EXCEPTION 'internal unsigned release principal or evidence mismatch' USING ERRCODE='LIU03';
  END IF;
  IF operation_value<>'retire' THEN
    IF (release_authorization.grant_payload->>'valid_from')::timestamptz>now_at
       OR (release_authorization.grant_payload->>'valid_until')::timestamptz<=now_at THEN
      RAISE EXCEPTION 'internal unsigned release expired' USING ERRCODE='LIU08';
    END IF;
    IF EXISTS (SELECT 1 FROM lawos_email_dms.internal_unsigned_release_revocations
      WHERE tenant_id=bound_tenant_id AND authorization_id=authorization_id_value) THEN
      RAISE EXCEPTION 'internal unsigned release revoked' USING ERRCODE='LIU06';
    END IF;
  END IF;
  IF operation_value='register' THEN
    SELECT * INTO installation FROM lawos_email_dms.outlook_desktop_installations
      WHERE tenant_id=bound_tenant_id AND device_key_fingerprint=fingerprint_value FOR UPDATE;
  ELSE
    SELECT * INTO installation FROM lawos_email_dms.outlook_desktop_installations
      WHERE tenant_id=bound_tenant_id AND installation_id=installation_id_value FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'internal unsigned installation absent' USING ERRCODE='LIU05';
    END IF;
  END IF;
  IF installation.installation_id IS NOT NULL THEN
    SELECT * INTO binding FROM lawos_email_dms.internal_unsigned_installation_bindings
      WHERE tenant_id=bound_tenant_id AND installation_id=installation.installation_id;
    IF NOT FOUND OR binding.authorization_id<>authorization_id_value
       OR installation.user_id<>user_id_value
       OR installation.entra_subject_id<>entra_subject_id_value
       OR installation.device_key_fingerprint<>fingerprint_value
       OR installation.platform<>release_authorization.grant_payload->>'platform'
       OR installation.app_version<>release_authorization.grant_payload->>'version'
       OR installation.source_sha<>release_authorization.grant_payload->>'source_sha'
       OR (operation_value='register' AND installation.device_public_key<>body->>'device_public_key') THEN
      RAISE EXCEPTION 'internal unsigned installation binding mismatch' USING ERRCODE='LIU03';
    END IF;
  END IF;

  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=now_at OR issued_at_value>now_at+interval '30 seconds' THEN
    RAISE EXCEPTION 'internal unsigned proof expired while locking installation' USING ERRCODE='LIU07';
  END IF;
  IF operation_value<>'retire' AND ((release_authorization.grant_payload->>'valid_from')::timestamptz>now_at
      OR (release_authorization.grant_payload->>'valid_until')::timestamptz<=now_at) THEN
    RAISE EXCEPTION 'internal unsigned release expired while locking installation' USING ERRCODE='LIU08';
  END IF;

  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_installation_idempotency
   WHERE tenant_id=bound_tenant_id
     AND user_id=user_id_value
     AND idempotency_key=idempotency_key_value;
  IF FOUND THEN
    IF receipt.operation<>operation_value
       OR receipt.request_fingerprint<>request_fingerprint_value
       OR receipt.installation_id IS DISTINCT FROM installation.installation_id THEN
      RAISE EXCEPTION 'internal unsigned idempotency conflict'
        USING ERRCODE='LIU01';
    END IF;
    RETURN jsonb_build_object(
      'response_status',receipt.response_status,
      'body',receipt.response
    );
  END IF;

  IF operation_value='register' AND installation.installation_id IS NULL THEN
    installation_id_value :=
      'odi_'||replace(pg_catalog.gen_random_uuid()::text,'-','');
    INSERT INTO lawos_email_dms.outlook_desktop_installations(
      tenant_id,installation_id,user_id,entra_subject_id,device_public_key,
      device_key_fingerprint,platform,app_version,source_sha,registered_at,
      last_seen_at,lease_expires_at,retired_at,retire_reason,state_version
    ) VALUES (
      bound_tenant_id,installation_id_value,user_id_value,
      entra_subject_id_value,body->>'device_public_key',fingerprint_value,
      'win32',release_authorization.grant_payload->>'version',release_authorization.grant_payload->>'source_sha',
      now_at,now_at,LEAST(now_at+interval '7 days',(release_authorization.grant_payload->>'valid_until')::timestamptz),NULL,NULL,1
    ) RETURNING * INTO installation;
    binding_sha256 := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.internal-unsigned-installation-binding.v1',bound_tenant_id,installation_id_value,
      user_id_value,entra_subject_id_value,fingerprint_value,authorization_id_value,
      release_authorization.grant_payload->>'release_authority_sha256',release_authorization.grant_payload->>'installed_receipt_sha256',
      ((extract(epoch FROM now_at)*1000)::bigint)::text]);
    INSERT INTO lawos_email_dms.internal_unsigned_installation_bindings(tenant_id,installation_id,
      authorization_id,installation_release_binding_sha256,authenticated_at)
    VALUES(bound_tenant_id,installation_id_value,authorization_id_value,binding_sha256,now_at);
    outcome_value := 'registered';
    event_type_value := 'registered';
    response_status_value := 201;
  ELSIF operation_value IN ('register','heartbeat') THEN
    IF installation.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'internal unsigned installation retired'
        USING ERRCODE='LIU06';
    END IF;
    IF operation_value='heartbeat'
       AND installation.state_version<>expected_state_version_value THEN
      RAISE EXCEPTION 'internal unsigned state version conflict'
        USING ERRCODE='LIU04';
    END IF;
    outcome_value := CASE WHEN installation.lease_expires_at<=now_at
      THEN 'resumed' ELSE 'heartbeat' END;
    event_type_value := outcome_value;
    UPDATE lawos_email_dms.outlook_desktop_installations
       SET last_seen_at=now_at,
           lease_expires_at=LEAST(now_at+interval '7 days',(release_authorization.grant_payload->>'valid_until')::timestamptz),
           state_version=state_version+1
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation.installation_id
       AND state_version=installation.state_version
       AND retired_at IS NULL
     RETURNING * INTO installation;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'internal unsigned state version conflict'
        USING ERRCODE='LIU04';
    END IF;
  ELSE
    IF installation.state_version<>expected_state_version_value THEN
      RAISE EXCEPTION 'internal unsigned state version conflict'
        USING ERRCODE='LIU04';
    END IF;
    IF installation.retired_at IS NULL THEN
      UPDATE lawos_email_dms.outlook_desktop_installations
         SET retired_at=now_at,retire_reason=retire_reason_value,
             state_version=state_version+1
       WHERE tenant_id=bound_tenant_id
         AND installation_id=installation.installation_id
         AND state_version=expected_state_version_value
         AND retired_at IS NULL
       RETURNING * INTO installation;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'internal unsigned state version conflict'
          USING ERRCODE='LIU04';
      END IF;
      outcome_value := 'retired';
    ELSE
      outcome_value := 'already_retired';
    END IF;
    event_type_value := 'retired';
  END IF;

  IF EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_installation_nonces
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation.installation_id
       AND nonce_hash=nonce_hash_value
  ) THEN
    RAISE EXCEPTION 'internal unsigned nonce replay'
      USING ERRCODE='LIU02';
  END IF;

  response_body := jsonb_build_object(
    'outcome',outcome_value,
    'installation',jsonb_build_object(
      'installation_id',installation.installation_id,
      'status',CASE WHEN installation.retired_at IS NOT NULL THEN 'retired'
                    WHEN installation.lease_expires_at<=now_at THEN 'expired'
                    ELSE 'active' END,
      'state_version',installation.state_version,
      'lease_expires_at',installation.lease_expires_at,
      'retired_at',installation.retired_at
    )
  );
  response_envelope := jsonb_build_object(
    'response_status',response_status_value,
    'body',response_body
  );

  INSERT INTO lawos_email_dms.outlook_desktop_installation_nonces(
    tenant_id,installation_id,nonce_hash,request_fingerprint,
    idempotency_key,issued_at,expires_at,consumed_at
  ) VALUES (
    bound_tenant_id,installation.installation_id,nonce_hash_value,
    request_fingerprint_value,idempotency_key_value,issued_at_value,
    expires_at_value,GREATEST(now_at,issued_at_value)
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_idempotency(
    tenant_id,user_id,installation_id,idempotency_key,operation,
    request_fingerprint,response_status,response,created_at
  ) VALUES (
    bound_tenant_id,user_id_value,installation.installation_id,
    idempotency_key_value,operation_value,request_fingerprint_value,
    response_status_value,response_body,now_at
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_audit_events(
    tenant_id,event_id,installation_id,user_id,entra_subject_id,event_type,
    request_id,idempotency_key,state_version,details,occurred_at
  ) VALUES (
    bound_tenant_id,
    'internal_unsigned_event_'||replace(pg_catalog.gen_random_uuid()::text,'-',''),
    installation.installation_id,user_id_value,entra_subject_id_value,
    event_type_value,request_id_value,idempotency_key_value,
    installation.state_version,jsonb_build_object(
      'outcome',outcome_value,
      'installation_status',response_body#>>'{installation,status}',
      'authority','internal_unsigned_owner_authorized_v1',
      'release_authorization_id',authorization_id_value,
      'release_authority_sha256',release_authorization.grant_payload->>'release_authority_sha256'
    ),now_at
  );
  RETURN response_envelope;
END
$$;

CREATE FUNCTION lawos_email_dms.read_internal_unsigned_installation_proof_key(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text,
  bound_installation_id text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE proof jsonb;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'internal unsigned application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_user_id IS NULL OR bound_user_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_entra_subject_id IS NULL OR bound_entra_subject_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_installation_id IS NULL OR bound_installation_id !~ '^odi_[A-Za-z0-9_-]{20,128}$' THEN
    RAISE EXCEPTION 'internal unsigned proof key input invalid' USING ERRCODE='LIU07';
  END IF;
  SELECT jsonb_build_object('device_public_key',installation.device_public_key,
    'device_key_fingerprint',installation.device_key_fingerprint) INTO proof
  FROM lawos_email_dms.outlook_desktop_installations AS installation
  JOIN lawos_email_dms.internal_unsigned_installation_bindings AS binding
    ON binding.tenant_id=installation.tenant_id AND binding.installation_id=installation.installation_id
  JOIN lawos_email_dms.internal_unsigned_release_authorizations AS release_authorization
    ON release_authorization.tenant_id=binding.tenant_id AND release_authorization.authorization_id=binding.authorization_id
  WHERE installation.tenant_id=bound_tenant_id AND installation.installation_id=bound_installation_id
    AND installation.user_id=bound_user_id AND installation.entra_subject_id=bound_entra_subject_id
    AND release_authorization.grant_payload->>'user_id'=installation.user_id
    AND release_authorization.grant_payload->>'entra_subject_id'=installation.entra_subject_id
    AND release_authorization.grant_payload->>'device_key_fingerprint'=installation.device_key_fingerprint
    AND release_authorization.grant_payload->>'platform'=installation.platform
    AND release_authorization.grant_payload->>'version'=installation.app_version
    AND release_authorization.grant_payload->>'source_sha'=installation.source_sha
    AND encode(pg_catalog.sha256(decode(installation.device_public_key,'base64')),'hex')=installation.device_key_fingerprint
    AND release_authorization.authorized_at<=binding.authenticated_at
    AND (release_authorization.grant_payload->>'valid_from')::timestamptz<=binding.authenticated_at
    AND (release_authorization.grant_payload->>'valid_until')::timestamptz>binding.authenticated_at
    AND binding.authenticated_at=installation.registered_at
    AND release_authorization.grant_payload->>'release_authority_sha256'=encode(pg_catalog.sha256(convert_to(
      lawos_email_dms.outlook_desktop_canonical_json_text(release_authorization.grant_payload-'release_authority_sha256'),'UTF8')),'hex')
    AND binding.installation_release_binding_sha256=lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.internal-unsigned-installation-binding.v1',installation.tenant_id,installation.installation_id,
      installation.user_id,installation.entra_subject_id,installation.device_key_fingerprint,
      release_authorization.authorization_id,release_authorization.grant_payload->>'release_authority_sha256',
      release_authorization.grant_payload->>'installed_receipt_sha256',
      ((extract(epoch FROM binding.authenticated_at)*1000)::bigint)::text]);
  IF proof IS NULL AND EXISTS (
    SELECT 1 FROM lawos_email_dms.internal_unsigned_installation_bindings
     WHERE tenant_id=bound_tenant_id AND installation_id=bound_installation_id
  ) THEN
    RAISE EXCEPTION 'internal unsigned installation proof binding mismatch' USING ERRCODE='LIU03';
  END IF;
  RETURN proof;
END
$$;

CREATE FUNCTION lawos_email_dms.read_current_internal_unsigned_installation(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE binding lawos_email_dms.internal_unsigned_installation_bindings%ROWTYPE;
DECLARE release_authorization lawos_email_dms.internal_unsigned_release_authorizations%ROWTYPE;
DECLARE now_at timestamptz;
DECLARE result jsonb;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'internal unsigned application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF current_setting('transaction_isolation')<>'serializable'
     OR current_setting('transaction_read_only')<>'on' THEN
    RAISE EXCEPTION 'internal unsigned current read requires a serializable read-only transaction'
      USING ERRCODE='LIU07';
  END IF;
  IF bound_user_id IS NULL OR bound_user_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_entra_subject_id IS NULL OR bound_entra_subject_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$' THEN
    RAISE EXCEPTION 'internal unsigned current principal invalid' USING ERRCODE='LIU07';
  END IF;
  now_at := date_trunc('milliseconds',clock_timestamp());
  SELECT * INTO installation FROM lawos_email_dms.outlook_desktop_installations
    WHERE tenant_id=bound_tenant_id AND user_id=bound_user_id AND entra_subject_id=bound_entra_subject_id
    ORDER BY CASE WHEN retired_at IS NULL AND lease_expires_at>now_at THEN 0
                  WHEN retired_at IS NULL THEN 1 ELSE 2 END,
             last_seen_at DESC,registered_at DESC,installation_id DESC
    LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO binding FROM lawos_email_dms.internal_unsigned_installation_bindings
    WHERE tenant_id=bound_tenant_id AND installation_id=installation.installation_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF installation.retired_at IS NOT NULL THEN
    RAISE EXCEPTION 'internal unsigned current installation retired' USING ERRCODE='LIU06';
  END IF;
  IF installation.lease_expires_at<=now_at THEN
    RAISE EXCEPTION 'internal unsigned current installation lease expired' USING ERRCODE='LIU08';
  END IF;
  IF installation.state_version<1 THEN
    RAISE EXCEPTION 'internal unsigned current installation state invalid' USING ERRCODE='LIU03';
  END IF;
  IF lawos_email_dms.read_internal_unsigned_installation_proof_key(
    bound_tenant_id,bound_user_id,bound_entra_subject_id,installation.installation_id) IS NULL THEN
    RAISE EXCEPTION 'internal unsigned current installation proof absent' USING ERRCODE='LIU03';
  END IF;
  SELECT * INTO release_authorization FROM lawos_email_dms.internal_unsigned_release_authorizations
    WHERE tenant_id=bound_tenant_id AND authorization_id=binding.authorization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'internal unsigned current release absent' USING ERRCODE='LIU03';
  END IF;
  IF (release_authorization.grant_payload->>'valid_from')::timestamptz>now_at
     OR (release_authorization.grant_payload->>'valid_until')::timestamptz<=now_at THEN
    RAISE EXCEPTION 'internal unsigned current release expired' USING ERRCODE='LIU08';
  END IF;
  IF EXISTS (SELECT 1 FROM lawos_email_dms.internal_unsigned_release_revocations
    WHERE tenant_id=bound_tenant_id AND authorization_id=release_authorization.authorization_id) THEN
    RAISE EXCEPTION 'internal unsigned current release revoked' USING ERRCODE='LIU06';
  END IF;
  result := jsonb_build_object(
    'installation_id',installation.installation_id,'tenant_id',bound_tenant_id,
    'app_id',release_authorization.grant_payload->>'app_id','platform',release_authorization.grant_payload->>'platform',
    'architecture',release_authorization.grant_payload->>'architecture','release_id',release_authorization.grant_payload->>'release_id',
    'release_sequence',release_authorization.grant_payload->'release_sequence','version',release_authorization.grant_payload->>'version',
    'source_sha',release_authorization.grant_payload->>'source_sha','source_tree',release_authorization.grant_payload->>'source_tree',
    'installer_sha256',release_authorization.grant_payload->>'installer_sha256','installer_bytes',release_authorization.grant_payload->'installer_bytes',
    'installer_version_id',release_authorization.grant_payload->>'installer_version_id',
    'bootstrap_marker_sha256',release_authorization.grant_payload->>'bootstrap_marker_sha256',
    'installed_receipt_sha256',release_authorization.grant_payload->>'installed_receipt_sha256',
    'state_version',installation.state_version,'lease_expires_at',installation.lease_expires_at,
    'installation_release_binding_sha256',binding.installation_release_binding_sha256,
    'release_authority_sha256',release_authorization.grant_payload->>'release_authority_sha256',
    'status','active','retired_at',NULL,'release_trusted',true,'authority_snapshot_at',now_at);
  RETURN jsonb_build_object('installation',result,'expires_at',LEAST(now_at+interval '5 minutes',
    installation.lease_expires_at,(release_authorization.grant_payload->>'valid_until')::timestamptz));
END
$$;

REVOKE ALL ON FUNCTION
  lawos_email_dms.authorize_internal_unsigned_release(text,jsonb),
  lawos_email_dms.revoke_internal_unsigned_release(text,jsonb),
  lawos_email_dms.apply_internal_unsigned_installation(text,jsonb),
  lawos_email_dms.read_internal_unsigned_installation_proof_key(text,text,text,text),
  lawos_email_dms.read_current_internal_unsigned_installation(text,text,text)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  lawos_email_dms.authorize_internal_unsigned_release(text,jsonb),
  lawos_email_dms.revoke_internal_unsigned_release(text,jsonb)
TO lawos_outlook_control_operator;
GRANT EXECUTE ON FUNCTION
  lawos_email_dms.apply_internal_unsigned_installation(text,jsonb),
  lawos_email_dms.read_internal_unsigned_installation_proof_key(text,text,text,text),
  lawos_email_dms.read_current_internal_unsigned_installation(text,text,text)
TO lawos_app;

RESET ROLE;
REVOKE CREATE ON SCHEMA lawos_email_dms FROM lawos_outlook_authority_owner;
REVOKE lawos_outlook_authority_owner FROM lawos_admin GRANTED BY lawos_admin;

DO $$
DECLARE function_signature text;
DECLARE intended_role text;
DECLARE table_name text;
DECLARE boundary_role text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'lawos_email_dms.authorize_internal_unsigned_release(text,jsonb)',
    'lawos_email_dms.revoke_internal_unsigned_release(text,jsonb)',
    'lawos_email_dms.apply_internal_unsigned_installation(text,jsonb)',
    'lawos_email_dms.read_internal_unsigned_installation_proof_key(text,text,text,text)',
    'lawos_email_dms.read_current_internal_unsigned_installation(text,text,text)'
  ] LOOP
    intended_role := CASE WHEN function_signature LIKE 'lawos_email_dms.authorize_%'
      OR function_signature LIKE 'lawos_email_dms.revoke_%'
      THEN 'lawos_outlook_control_operator' ELSE 'lawos_app' END;
    IF NOT EXISTS (SELECT 1 FROM pg_proc AS procedure
      JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
      JOIN pg_roles AS owner ON owner.oid=procedure.proowner
      JOIN pg_language AS language ON language.oid=procedure.prolang
      WHERE procedure.oid=to_regprocedure(function_signature)
        AND namespace.nspname='lawos_email_dms' AND owner.rolname='lawos_outlook_authority_owner'
        AND language.lanname='plpgsql' AND procedure.prokind='f' AND procedure.provolatile='v'
        AND procedure.proparallel='u' AND NOT procedure.proleakproof AND procedure.prosecdef
        AND procedure.prorettype='jsonb'::regtype
        AND procedure.proconfig=ARRAY['search_path=pg_catalog, lawos_email_dms, lawos_security']::text[])
      OR (SELECT count(*) FROM pg_proc AS procedure
        CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(procedure.proacl,
          pg_catalog.acldefault('f',procedure.proowner))) AS privilege
        WHERE procedure.oid=to_regprocedure(function_signature) AND privilege.grantee<>procedure.proowner)<>1
      OR NOT has_function_privilege(intended_role,function_signature,'EXECUTE') THEN
      RAISE EXCEPTION 'internal unsigned function catalog mismatch: %',function_signature;
    END IF;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY['internal_unsigned_release_authorizations',
    'internal_unsigned_release_revocations','internal_unsigned_installation_bindings',
    'outlook_desktop_installations','outlook_desktop_installation_nonces',
    'outlook_desktop_installation_idempotency','outlook_desktop_installation_audit_events'] LOOP
    FOREACH boundary_role IN ARRAY ARRAY['lawos_app','lawos_outlook_control_operator'] LOOP
      IF has_table_privilege(boundary_role,'lawos_email_dms.'||table_name,
        'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR
        has_any_column_privilege(boundary_role,'lawos_email_dms.'||table_name,'SELECT,INSERT,UPDATE,REFERENCES') THEN
        RAISE EXCEPTION 'internal unsigned raw table privilege leaked: % %',boundary_role,table_name;
      END IF;
    END LOOP;
  END LOOP;
  IF has_schema_privilege('lawos_outlook_authority_owner','lawos_email_dms','CREATE') OR EXISTS (
    SELECT 1 FROM pg_auth_members WHERE roleid='lawos_outlook_authority_owner'::regrole
      AND member='lawos_admin'::regrole AND grantor='lawos_admin'::regrole) THEN
    RAISE EXCEPTION 'internal unsigned temporary capability persisted';
  END IF;
END
$$;
