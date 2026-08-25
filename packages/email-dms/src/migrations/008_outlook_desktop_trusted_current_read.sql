DO $$
DECLARE raw_acl_sha256 text;
BEGIN
  IF session_user<>'lawos_admin' OR current_user<>'lawos_admin' THEN
    RAISE EXCEPTION 'outlook trusted-current migration requires lawos_admin';
  END IF;
  IF to_regprocedure(
    'lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)'
  ) IS NOT NULL THEN
    RAISE EXCEPTION 'outlook trusted-current authority exists without migration ledger';
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
    RAISE EXCEPTION 'outlook trusted-current roles are absent or unsafe';
  END IF;
  IF has_schema_privilege(
       'lawos_outlook_authority_owner','lawos_email_dms','CREATE'
     ) OR EXISTS (
    SELECT 1 FROM pg_auth_members AS membership
     WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
       AND membership.member='lawos_admin'::regrole
       AND membership.grantor='lawos_admin'::regrole
  ) THEN
    RAISE EXCEPTION 'outlook trusted-current temporary capability already exists';
  END IF;
  SELECT encode(pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object(
      'table_acl',COALESCE(relation.relacl::text,''),
      'column_acl',COALESCE((
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_array(attribute.attname,attribute.attacl::text)
          ORDER BY attribute.attnum
        )
          FROM pg_attribute AS attribute
         WHERE attribute.attrelid=relation.oid
           AND attribute.attnum>0 AND NOT attribute.attisdropped
           AND attribute.attacl IS NOT NULL
      ),'[]'::jsonb)
    )::text,'UTF8')),'hex') INTO raw_acl_sha256
    FROM pg_class AS relation
   WHERE relation.oid=to_regclass(
     'lawos_email_dms.outlook_desktop_installation_release_bindings');
  IF raw_acl_sha256 IS NULL OR has_table_privilege(
       'lawos_app',
       'lawos_email_dms.outlook_desktop_installation_release_bindings',
       'SELECT'
     ) THEN
    RAISE EXCEPTION 'outlook release-binding raw table boundary is unsafe';
  END IF;
  PERFORM pg_catalog.set_config(
    'lawos.outlook_trusted_current_read.raw_acl_sha256',raw_acl_sha256,true);
END
$$;

GRANT lawos_outlook_authority_owner TO lawos_admin
  WITH SET TRUE, INHERIT FALSE, ADMIN FALSE
  GRANTED BY lawos_admin;

GRANT USAGE,CREATE ON SCHEMA lawos_email_dms
  TO lawos_outlook_authority_owner;

SET LOCAL ROLE lawos_outlook_authority_owner;

CREATE FUNCTION lawos_email_dms.read_trusted_current_outlook_desktop_installation(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE now_at timestamptz;
DECLARE trusted_count bigint;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required'
      USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  now_at := date_trunc('milliseconds',clock_timestamp());

  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id
     AND user_id=bound_user_id
     AND entra_subject_id=bound_entra_subject_id
   ORDER BY CASE
              WHEN retired_at IS NULL AND lease_expires_at>now_at THEN 0
              WHEN retired_at IS NULL THEN 1
              ELSE 2
            END,
            last_seen_at DESC,registered_at DESC,installation_id DESC
   LIMIT 1;

  IF NOT FOUND OR installation.retired_at IS NOT NULL
     OR installation.lease_expires_at<=now_at
     OR installation.state_version<1 THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO trusted_count
    FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
    JOIN lawos_email_dms.outlook_desktop_activation_authorizations AS activation
      ON activation.tenant_id=binding.tenant_id
     AND activation.activation_authorization_id=
         binding.activation_authorization_id
    JOIN lawos_email_dms.outlook_desktop_release_artifacts AS artifact
      ON artifact.tenant_id=binding.tenant_id
     AND artifact.release_artifact_id=binding.release_artifact_id
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
      ON audit.tenant_id=binding.tenant_id
     AND audit.event_id=binding.approval_audit_event_id
     AND audit.release_artifact_id=binding.release_artifact_id
     AND audit.event_type='approved'
   WHERE binding.tenant_id=bound_tenant_id
     AND binding.installation_id=installation.installation_id
     AND activation.installation_id=installation.installation_id
     AND activation.consumed_installation_id=installation.installation_id
     AND activation.consumed_at IS NOT NULL
     AND activation.consumed_at=binding.authenticated_at
     AND activation.user_id=installation.user_id
     AND activation.entra_subject_id=installation.entra_subject_id
     AND activation.device_key_fingerprint=
         installation.device_key_fingerprint
     AND activation.device_public_key_spki_sha256=
         installation.device_key_fingerprint
     AND activation.valid_from<=activation.consumed_at
     AND activation.valid_until>activation.consumed_at
     AND activation.release_artifact_id=artifact.release_artifact_id
     AND activation.release_ticket_bytes_sha256=
         artifact.embedded_release_ticket_sha256
     AND activation.release_ticket_owner_signature_sha256=
         artifact.embedded_release_ticket_signature_sha256
     AND activation.approval_audit_event_id=audit.event_id
     AND activation.approval_audit_event_binding_sha256=
         audit.event_binding_sha256
     AND activation.release_authority_sha256=
         lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
           bound_tenant_id,artifact.release_artifact_id)
     AND activation.authorization_binding_sha256=
         lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
           'lawos.outlook-desktop-activation-authorization.v2',
           activation.tenant_id,activation.activation_authorization_id,
           activation.installation_id,activation.user_id,
           activation.entra_subject_id,activation.device_key_fingerprint,
           activation.device_public_key_spki_sha256,
           activation.device_proof_request_sha256,
           activation.device_proof_transcript_sha256,
           activation.server_nonce_sha256,activation.device_signature_sha256,
           activation.issued_challenge_sha256,
           activation.evidence_binding_sha256,
           activation.activation_receipt_sha256,
           activation.owner_operator_packet_sha256,
           activation.evidence_receipt_sha256,activation.proof_id,
           activation.request_id,activation.event_id,
           activation.idempotency_key,activation.request_fingerprint,
           activation.release_artifact_id,
           activation.release_ticket_bytes_sha256,
           activation.release_ticket_owner_signature_sha256,
           activation.approval_audit_event_id,
           activation.approval_audit_event_binding_sha256,
           activation.release_authority_sha256,
           activation.local_measurement_evidence_sha256,
           ((extract(epoch FROM activation.proof_issued_at)*1000)::bigint)::text,
           ((extract(epoch FROM activation.proof_expires_at)*1000)::bigint)::text,
           ((extract(epoch FROM activation.authorized_at)*1000)::bigint)::text,
           ((extract(epoch FROM activation.valid_from)*1000)::bigint)::text,
           ((extract(epoch FROM activation.valid_until)*1000)::bigint)::text
         ])
     AND artifact.revoked_at IS NULL
     AND artifact.valid_from<=now_at AND artifact.valid_until>now_at
     AND ROW(binding.platform,binding.channel,binding.app_version,
             binding.app_id,binding.arch,binding.source_sha,
             binding.source_tree,binding.embedded_build_manifest_sha256,
             binding.measured_inner_artifact_sha256,
             binding.measured_inner_artifact_bytes,
             binding.registered_final_artifact_sha256,
             binding.registered_final_artifact_bytes,
             binding.approval_sha256,
             binding.macos_technical_evidence_sha256,
             binding.trust_registry_sha256,binding.trust_registry_serial,
             binding.release_valid_until)
         IS NOT DISTINCT FROM
         ROW(artifact.platform,artifact.channel,artifact.app_version,
             artifact.app_id,artifact.arch,artifact.source_sha,
             artifact.source_tree,artifact.embedded_build_manifest_sha256,
             artifact.embedded_inner_artifact_sha256,
             artifact.embedded_inner_artifact_bytes,
             artifact.final_artifact_sha256,artifact.final_artifact_bytes,
             artifact.approval_sha256,
             artifact.macos_technical_evidence_sha256,
             artifact.trust_registry_sha256,artifact.trust_registry_serial,
             artifact.valid_until)
     AND ROW(binding.platform,binding.app_version,binding.source_sha)
         IS NOT DISTINCT FROM
         ROW(installation.platform,installation.app_version,
             installation.source_sha)
     AND ROW(binding.release_ticket_id,binding.release_ticket_sha256,
             binding.release_ticket_signature_sha256,
             binding.approval_audit_event_id,
             binding.approval_audit_event_binding_sha256)
         IS NOT DISTINCT FROM
         ROW(artifact.release_ticket_id,
             artifact.embedded_release_ticket_sha256,
             artifact.embedded_release_ticket_signature_sha256,
             audit.event_id,audit.event_binding_sha256)
     AND ROW(binding.device_proof_request_sha256,
             binding.device_public_key_spki_sha256,
             binding.server_nonce_sha256,binding.device_signature_sha256,
             binding.activation_receipt_sha256,
             binding.local_measurement_evidence_sha256)
         IS NOT DISTINCT FROM
         ROW(activation.device_proof_request_sha256,
             activation.device_public_key_spki_sha256,
             activation.server_nonce_sha256,activation.device_signature_sha256,
             activation.activation_receipt_sha256,
             activation.local_measurement_evidence_sha256)
     AND ROW(audit.release_ticket_sha256,audit.final_artifact_sha256,
             audit.approval_sha256,audit.occurred_at)
         IS NOT DISTINCT FROM
         ROW(artifact.embedded_release_ticket_sha256,
             artifact.final_artifact_sha256,artifact.approval_sha256,
             artifact.approved_at)
     AND audit.event_binding_sha256=
         lawos_email_dms.outlook_desktop_release_audit_binding_sha256(
           audit.tenant_id,audit.event_id,audit.release_artifact_id,
           audit.event_type,audit.release_ticket_sha256,
           audit.final_artifact_sha256,audit.approval_sha256,
           audit.occurred_at)
     AND binding.installation_release_binding_sha256=
         lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
           'lawos.outlook-desktop-installation-release-binding.v2',
           binding.tenant_id,installation.installation_id,
           installation.user_id,installation.entra_subject_id,
           installation.device_key_fingerprint,
           activation.activation_authorization_id,
           activation.authorization_binding_sha256,
           activation.device_public_key_spki_sha256,
           artifact.release_artifact_id,
           artifact.embedded_release_ticket_sha256,
           artifact.embedded_release_ticket_signature_sha256,
           artifact.embedded_inner_artifact_sha256,
           artifact.final_artifact_sha256,artifact.approval_sha256,
           audit.event_binding_sha256,
           ((extract(epoch FROM binding.authenticated_at)*1000)::bigint)::text
         ])
     AND NOT EXISTS (
       SELECT 1
         FROM lawos_email_dms.outlook_desktop_release_trust_audit_events
              AS revocation
        WHERE revocation.tenant_id=artifact.tenant_id
          AND revocation.release_artifact_id=artifact.release_artifact_id
          AND revocation.event_type='revoked'
     );

  IF trusted_count<>1 THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'installation_id',installation.installation_id,
    'status','active',
    'state_version',installation.state_version,
    'lease_expires_at',installation.lease_expires_at,
    'retired_at',NULL,
    'release_trusted',true,
    'authority_snapshot_at',now_at
  );
END
$$;

REVOKE ALL ON FUNCTION
  lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)
TO lawos_app;

RESET ROLE;

REVOKE CREATE ON SCHEMA lawos_email_dms
  FROM lawos_outlook_authority_owner;

REVOKE lawos_outlook_authority_owner FROM lawos_admin
  GRANTED BY lawos_admin;

DO $$
DECLARE function_oid oid;
DECLARE raw_acl_sha256 text;
BEGIN
  SELECT procedure.oid INTO function_oid
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
    JOIN pg_roles AS owner ON owner.oid=procedure.proowner
    JOIN pg_language AS language ON language.oid=procedure.prolang
   WHERE namespace.nspname='lawos_email_dms'
     AND procedure.proname=
       'read_trusted_current_outlook_desktop_installation'
     AND procedure.proargtypes='25 25 25'::oidvector
     AND procedure.prorettype='jsonb'::regtype
     AND owner.rolname='lawos_outlook_authority_owner'
     AND language.lanname='plpgsql'
     AND procedure.prokind='f'
     AND procedure.provolatile='v'
     AND procedure.proparallel='u'
     AND NOT procedure.proleakproof
     AND procedure.prosecdef
     AND procedure.proconfig=ARRAY[
       'search_path=pg_catalog, lawos_email_dms, lawos_security'
     ]::text[];
  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'outlook trusted-current function catalog mismatch';
  END IF;
  IF (
    SELECT count(*)
      FROM pg_proc AS procedure
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(procedure.proacl,
                 pg_catalog.acldefault('f',procedure.proowner))
      ) AS privilege
     WHERE procedure.oid=function_oid
       AND privilege.grantee<>procedure.proowner
  )<>1 OR NOT EXISTS (
    SELECT 1
      FROM pg_proc AS procedure
      CROSS JOIN LATERAL pg_catalog.aclexplode(
        COALESCE(procedure.proacl,
                 pg_catalog.acldefault('f',procedure.proowner))
      ) AS privilege
     WHERE procedure.oid=function_oid
       AND privilege.grantee='lawos_app'::regrole
       AND privilege.privilege_type='EXECUTE'
       AND NOT privilege.is_grantable
  ) THEN
    RAISE EXCEPTION 'outlook trusted-current function ACL mismatch';
  END IF;
  IF has_schema_privilege(
       'lawos_outlook_authority_owner','lawos_email_dms','CREATE'
     ) OR EXISTS (
    SELECT 1 FROM pg_auth_members AS membership
     WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
       AND membership.member='lawos_admin'::regrole
       AND membership.grantor='lawos_admin'::regrole
  ) THEN
    RAISE EXCEPTION 'outlook trusted-current temporary capability persisted';
  END IF;
  SELECT encode(pg_catalog.sha256(pg_catalog.convert_to(
    pg_catalog.jsonb_build_object(
      'table_acl',COALESCE(relation.relacl::text,''),
      'column_acl',COALESCE((
        SELECT pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_array(attribute.attname,attribute.attacl::text)
          ORDER BY attribute.attnum
        )
          FROM pg_attribute AS attribute
         WHERE attribute.attrelid=relation.oid
           AND attribute.attnum>0 AND NOT attribute.attisdropped
           AND attribute.attacl IS NOT NULL
      ),'[]'::jsonb)
    )::text,'UTF8')),'hex') INTO raw_acl_sha256
    FROM pg_class AS relation
   WHERE relation.oid=to_regclass(
     'lawos_email_dms.outlook_desktop_installation_release_bindings');
  IF raw_acl_sha256 IS DISTINCT FROM pg_catalog.current_setting(
       'lawos.outlook_trusted_current_read.raw_acl_sha256'
     ) OR has_table_privilege(
       'lawos_app',
       'lawos_email_dms.outlook_desktop_installation_release_bindings',
       'SELECT'
     ) THEN
    RAISE EXCEPTION 'outlook release-binding raw table ACL changed';
  END IF;
END
$$;
