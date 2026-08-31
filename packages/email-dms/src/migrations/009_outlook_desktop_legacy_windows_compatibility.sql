DO $$
DECLARE table_name text;
BEGIN
  IF session_user<>'lawos_admin' OR current_user<>'lawos_admin' THEN
    RAISE EXCEPTION 'legacy Windows compatibility migration requires lawos_admin';
  END IF;
  IF to_regprocedure(
       'lawos_email_dms.read_legacy_windows_outlook_desktop_proof_key(text,text,text,text)'
     ) IS NOT NULL OR to_regprocedure(
       'lawos_email_dms.apply_legacy_windows_outlook_desktop_lifecycle(text,jsonb)'
     ) IS NOT NULL THEN
    RAISE EXCEPTION 'legacy Windows compatibility authority exists without migration ledger';
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
    RAISE EXCEPTION 'legacy Windows compatibility roles are absent or unsafe';
  END IF;
  IF has_schema_privilege(
       'lawos_outlook_authority_owner','lawos_email_dms','CREATE'
     ) OR EXISTS (
    SELECT 1 FROM pg_auth_members AS membership
     WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
       AND membership.member='lawos_admin'::regrole
       AND membership.grantor='lawos_admin'::regrole
  ) THEN
    RAISE EXCEPTION 'legacy Windows compatibility temporary capability already exists';
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
      RAISE EXCEPTION 'legacy Windows compatibility raw table boundary is unsafe: %',
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

CREATE FUNCTION lawos_email_dms.read_legacy_windows_outlook_desktop_proof_key(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text,
  bound_installation_id text
) RETURNS jsonb
LANGUAGE plpgsql STABLE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required'
      USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_user_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_entra_subject_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_installation_id !~ '^odi_[A-Za-z0-9_-]{20,128}$' THEN
    RAISE EXCEPTION 'legacy Windows proof-key input invalid'
      USING ERRCODE='LWC07';
  END IF;
  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id
     AND installation_id=bound_installation_id
     AND user_id=bound_user_id
     AND entra_subject_id=bound_entra_subject_id
     AND platform='win32'
     AND app_version='0.1.29'
     AND source_sha='4df77e1848b52ea455f20b41b9b1c64961bfa1cf';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'device_public_key',installation.device_public_key,
    'device_key_fingerprint',installation.device_key_fingerprint
  );
END
$$;

CREATE FUNCTION lawos_email_dms.apply_legacy_windows_outlook_desktop_lifecycle(
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
  'app_version','device_public_key','platform','source_sha'
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
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required'
      USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_transition)<>'object'
     OR NOT bound_transition ?& top_keys
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(bound_transition) AS key
        WHERE key<>ALL(top_keys)
     ) THEN
    RAISE EXCEPTION 'legacy Windows transition input invalid'
      USING ERRCODE='LWC07';
  END IF;

  operation_value := bound_transition->>'operation';
  principal := bound_transition->'principal';
  body := bound_transition->'body';
  verified := bound_transition->'verified';
  request_id_value := bound_transition->>'request_id';
  installation_id_value := bound_transition->>'installation_id';
  IF operation_value NOT IN ('register','heartbeat','retire')
     OR jsonb_typeof(principal)<>'object'
     OR NOT principal ?& principal_keys
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(principal) AS key
        WHERE key<>ALL(principal_keys)
     )
     OR jsonb_typeof(body)<>'object'
     OR jsonb_typeof(verified)<>'object'
     OR NOT verified ?& verified_keys
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(verified) AS key
        WHERE key<>ALL(verified_keys)
     ) THEN
    RAISE EXCEPTION 'legacy Windows transition shape invalid'
      USING ERRCODE='LWC07';
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
    RAISE EXCEPTION 'legacy Windows verified transition invalid'
      USING ERRCODE='LWC07';
  END IF;

  issued_at_value := (verified->>'issued_at')::timestamptz;
  expires_at_value := (verified->>'expires_at')::timestamptz;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=issued_at_value
     OR expires_at_value-issued_at_value>interval '5 minutes'
     OR issued_at_value>now_at+interval '30 seconds'
     OR expires_at_value<=now_at THEN
    RAISE EXCEPTION 'legacy Windows proof freshness invalid'
      USING ERRCODE='LWC07';
  END IF;

  IF operation_value='register' THEN
    IF NOT body ?& register_body_keys OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(body) AS key
          WHERE key<>ALL(register_body_keys)
       )
       OR body->>'platform'<>'win32'
       OR body->>'app_version'<>'0.1.29'
       OR body->>'source_sha'<>
          '4df77e1848b52ea455f20b41b9b1c64961bfa1cf'
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
      RAISE EXCEPTION 'legacy Windows package identity invalid'
        USING ERRCODE='LWC08';
    END IF;
  ELSIF operation_value='heartbeat' THEN
    IF NOT body ?& heartbeat_body_keys OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(body) AS key
          WHERE key<>ALL(heartbeat_body_keys)
       ) OR body->>'expected_state_version' !~ '^[1-9][0-9]*$' THEN
      RAISE EXCEPTION 'legacy Windows heartbeat input invalid'
        USING ERRCODE='LWC07';
    END IF;
    expected_state_version_value :=
      (body->>'expected_state_version')::bigint;
  ELSE
    IF NOT body ?& retire_body_keys OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(body) AS key
          WHERE key<>ALL(retire_body_keys)
       ) OR body->>'expected_state_version' !~ '^[1-9][0-9]*$'
       OR body->>'retire_reason' NOT IN (
         'device_disconnect','windows_uninstall','account_removed',
         'installation_replaced'
       ) THEN
      RAISE EXCEPTION 'legacy Windows retirement input invalid'
        USING ERRCODE='LWC07';
    END IF;
    expected_state_version_value :=
      (body->>'expected_state_version')::bigint;
    retire_reason_value := body->>'retire_reason';
  END IF;

  IF operation_value='register' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      bound_tenant_id||chr(31)||fingerprint_value,0));
    SELECT * INTO installation
      FROM lawos_email_dms.outlook_desktop_installations
     WHERE tenant_id=bound_tenant_id
       AND device_key_fingerprint=fingerprint_value
     FOR UPDATE;
  ELSE
    SELECT * INTO installation
      FROM lawos_email_dms.outlook_desktop_installations
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation_id_value
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'legacy Windows installation not found'
        USING ERRCODE='LWC05';
    END IF;
  END IF;

  IF FOUND AND (
       installation.user_id<>user_id_value
       OR installation.entra_subject_id<>entra_subject_id_value
       OR installation.device_key_fingerprint<>fingerprint_value
       OR installation.platform<>'win32'
       OR installation.app_version<>'0.1.29'
       OR installation.source_sha<>
          '4df77e1848b52ea455f20b41b9b1c64961bfa1cf'
       OR (operation_value='register' AND
           installation.device_public_key<>body->>'device_public_key')
     ) THEN
    RAISE EXCEPTION 'legacy Windows installation binding mismatch'
      USING ERRCODE='LWC03';
  END IF;

  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_installation_idempotency
   WHERE tenant_id=bound_tenant_id
     AND user_id=user_id_value
     AND idempotency_key=idempotency_key_value;
  IF FOUND THEN
    IF receipt.operation<>operation_value
       OR receipt.request_fingerprint<>request_fingerprint_value THEN
      RAISE EXCEPTION 'legacy Windows idempotency conflict'
        USING ERRCODE='LWC01';
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
      'win32','0.1.29','4df77e1848b52ea455f20b41b9b1c64961bfa1cf',
      now_at,now_at,now_at+interval '7 days',NULL,NULL,1
    ) RETURNING * INTO installation;
    outcome_value := 'registered';
    event_type_value := 'registered';
    response_status_value := 201;
  ELSIF operation_value IN ('register','heartbeat') THEN
    IF installation.retired_at IS NOT NULL THEN
      RAISE EXCEPTION 'legacy Windows installation retired'
        USING ERRCODE='LWC06';
    END IF;
    IF operation_value='heartbeat'
       AND installation.state_version<>expected_state_version_value THEN
      RAISE EXCEPTION 'legacy Windows state version conflict'
        USING ERRCODE='LWC04';
    END IF;
    outcome_value := CASE WHEN installation.lease_expires_at<=now_at
      THEN 'resumed' ELSE 'heartbeat' END;
    event_type_value := outcome_value;
    UPDATE lawos_email_dms.outlook_desktop_installations
       SET last_seen_at=now_at,
           lease_expires_at=now_at+interval '7 days',
           state_version=state_version+1
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation.installation_id
       AND state_version=installation.state_version
       AND retired_at IS NULL
     RETURNING * INTO installation;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'legacy Windows state version conflict'
        USING ERRCODE='LWC04';
    END IF;
  ELSE
    IF installation.state_version<>expected_state_version_value THEN
      RAISE EXCEPTION 'legacy Windows state version conflict'
        USING ERRCODE='LWC04';
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
        RAISE EXCEPTION 'legacy Windows state version conflict'
          USING ERRCODE='LWC04';
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
    RAISE EXCEPTION 'legacy Windows nonce replay'
      USING ERRCODE='LWC02';
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
    'legacy_windows_event_'||replace(pg_catalog.gen_random_uuid()::text,'-',''),
    installation.installation_id,user_id_value,entra_subject_id_value,
    event_type_value,request_id_value,idempotency_key_value,
    installation.state_version,jsonb_build_object(
      'outcome',outcome_value,
      'installation_status',response_body#>>'{installation,status}',
      'authority','legacy_windows_0_1_29_compatibility'
    ),now_at
  );
  RETURN response_envelope;
END
$$;

REVOKE ALL ON FUNCTION
  lawos_email_dms.read_legacy_windows_outlook_desktop_proof_key(text,text,text,text),
  lawos_email_dms.apply_legacy_windows_outlook_desktop_lifecycle(text,jsonb)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  lawos_email_dms.read_legacy_windows_outlook_desktop_proof_key(text,text,text,text),
  lawos_email_dms.apply_legacy_windows_outlook_desktop_lifecycle(text,jsonb)
TO lawos_app;

RESET ROLE;

REVOKE CREATE ON SCHEMA lawos_email_dms
  FROM lawos_outlook_authority_owner;

REVOKE lawos_outlook_authority_owner FROM lawos_admin
  GRANTED BY lawos_admin;

DO $$
DECLARE function_signature text;
DECLARE table_name text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'lawos_email_dms.read_legacy_windows_outlook_desktop_proof_key(text,text,text,text)',
    'lawos_email_dms.apply_legacy_windows_outlook_desktop_lifecycle(text,jsonb)'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc AS procedure
      JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
      JOIN pg_roles AS owner ON owner.oid=procedure.proowner
     WHERE procedure.oid=to_regprocedure(function_signature)
       AND namespace.nspname='lawos_email_dms'
       AND owner.rolname='lawos_outlook_authority_owner'
       AND procedure.prokind='f'
       AND procedure.proparallel='u'
       AND NOT procedure.proleakproof
       AND procedure.prosecdef
       AND procedure.proconfig=ARRAY[
         'search_path=pg_catalog, lawos_email_dms, lawos_security'
       ]::text[]
    ) OR (
      SELECT count(*) FROM pg_proc AS procedure
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(
        procedure.proacl,pg_catalog.acldefault('f',procedure.proowner)
      )) AS privilege
     WHERE procedure.oid=to_regprocedure(function_signature)
       AND privilege.grantee<>procedure.proowner
    )<>1 OR NOT has_function_privilege(
      'lawos_app',function_signature,'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'legacy Windows compatibility function catalog mismatch: %',
        function_signature;
    END IF;
  END LOOP;
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
      RAISE EXCEPTION 'legacy Windows compatibility raw table privilege leaked: %',
        table_name;
    END IF;
  END LOOP;
  IF has_schema_privilege(
       'lawos_outlook_authority_owner','lawos_email_dms','CREATE'
     ) OR EXISTS (
    SELECT 1 FROM pg_auth_members AS membership
     WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
       AND membership.member='lawos_admin'::regrole
       AND membership.grantor='lawos_admin'::regrole
  ) THEN
    RAISE EXCEPTION 'legacy Windows compatibility temporary capability persisted';
  END IF;
END
$$;
