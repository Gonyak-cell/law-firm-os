-- Preserve the immutable release grants and change only the version-ID prefix rule.
DO $$
DECLARE table_name text;
BEGIN
  IF session_user<>'lawos_admin' OR current_user<>'lawos_admin' THEN
    RAISE EXCEPTION 'internal unsigned release version migration requires lawos_admin';
  END IF;
  IF encode(pg_catalog.sha256(convert_to(pg_catalog.pg_get_functiondef(
       to_regprocedure('lawos_email_dms.authorize_internal_unsigned_release(text,jsonb)')
     ),'UTF8')),'hex') IS DISTINCT FROM
       '95bef8686872287ada9726df999c497cf1ce948c8e3bf9ade437cfb5ba3f57f8' THEN
    RAISE EXCEPTION 'internal unsigned release version migration requires the exact prior function';
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

CREATE OR REPLACE FUNCTION lawos_email_dms.authorize_internal_unsigned_release(
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
     OR bound_grant->>'installer_version_id' !~ '^[A-Za-z0-9._+=/-]+$'
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
