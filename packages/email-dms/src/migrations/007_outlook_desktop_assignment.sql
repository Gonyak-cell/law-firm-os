DO $$
DECLARE
  migration_admin pg_roles%ROWTYPE;
  authority_owner pg_roles%ROWTYPE;
  control_operator pg_roles%ROWTYPE;
  assignment_worker pg_roles%ROWTYPE;
  lifecycle_verifier pg_roles%ROWTYPE;
  application_role pg_roles%ROWTYPE;
  protected_oids oid[];
  automatic_role_oids oid[];
  bootstrap_grantor_oid oid;
  app_edge_count integer;
BEGIN
  IF session_user<>'lawos_admin' OR current_user<>'lawos_admin' THEN
    RAISE EXCEPTION 'outlook authority migration requires direct lawos_admin session';
  END IF;
  IF current_setting('server_version_num')::integer/10000<>16 THEN
    RAISE EXCEPTION 'outlook authority migration requires PostgreSQL 16';
  END IF;
  IF to_regclass('pg_temp.outlook_authority_expected_receipt') IS NULL THEN
    RAISE EXCEPTION 'outlook authority expected bootstrap receipt is required';
  END IF;
  IF (SELECT count(*) FROM pg_temp.outlook_authority_expected_receipt)<>1
     OR NOT EXISTS (
       SELECT 1 FROM pg_temp.outlook_authority_expected_receipt AS expected
        WHERE expected.schema_version=
          'lawos.outlook-authority-role-bootstrap-receipt.v1'
          AND expected.role_bootstrap_sha256~'^[a-f0-9]{64}$'
          AND expected.authority_manifest_sha256~'^[a-f0-9]{64}$'
          AND expected.database_target_receipt_sha256~'^[a-f0-9]{64}$'
          AND expected.migration_catalog_sha256~'^[a-f0-9]{64}$'
     ) THEN
    RAISE EXCEPTION 'outlook authority expected digest receipt is invalid';
  END IF;
  SELECT * INTO migration_admin FROM pg_roles WHERE rolname='lawos_admin';
  IF migration_admin.oid IS NULL OR NOT migration_admin.rolcanlogin
     OR migration_admin.rolsuper OR NOT migration_admin.rolcreatedb
     OR NOT migration_admin.rolcreaterole OR migration_admin.rolreplication
     OR migration_admin.rolbypassrls THEN
    RAISE EXCEPTION 'lawos_admin migration authority is absent or unsafe';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace AS namespace
    WHERE namespace.nspname='lawos_email_dms'
      AND namespace.nspowner=migration_admin.oid
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_namespace AS namespace
    WHERE namespace.nspname='lawos_meta'
      AND namespace.nspowner=migration_admin.oid
  ) THEN
    RAISE EXCEPTION 'required schemas are not owned by lawos_admin';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('pg_catalog.sha256(bytea)',3420::oid),
      ('pg_catalog.gen_random_uuid()',3432::oid)
    ) AS expected(signature,expected_oid)
    LEFT JOIN pg_proc AS procedure
      ON procedure.oid=to_regprocedure(expected.signature)
    LEFT JOIN pg_namespace AS namespace
      ON namespace.oid=procedure.pronamespace
    WHERE procedure.oid IS NULL OR procedure.oid<>expected.expected_oid
       OR namespace.nspname<>'pg_catalog'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
    JOIN pg_language AS language ON language.oid=procedure.prolang
    WHERE procedure.oid=to_regprocedure(
      'lawos_security.current_tenant_id()')
      AND namespace.nspname='lawos_security'
      AND procedure.proowner=migration_admin.oid
      AND language.lanname='plpgsql' AND procedure.provolatile='s'
      AND procedure.prosecdef
      AND procedure.proconfig=ARRAY[
        'search_path=pg_catalog, lawos_security, public']::text[]
      AND encode(pg_catalog.sha256(pg_catalog.convert_to(
        procedure.prosrc,'UTF8')),'hex')=
        'e1e33ef1f4b60203f6b0ab68461ce85df5bc7d13d0c17fa665f8c825b4ddc260'
      AND NOT EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
        WHERE privilege.grantee<>procedure.proowner
          AND NOT (privilege.grantee=0
                   AND privilege.privilege_type='EXECUTE'
                   AND NOT privilege.is_grantable))
      AND EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
        WHERE privilege.grantee=0 AND privilege.privilege_type='EXECUTE'
          AND NOT privilege.is_grantable)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
    JOIN pg_depend AS dependency
      ON dependency.classid='pg_proc'::regclass
     AND dependency.objid=procedure.oid AND dependency.deptype='e'
    JOIN pg_extension AS extension
      ON extension.oid=dependency.refobjid
     AND dependency.refclassid='pg_extension'::regclass
    WHERE procedure.oid=to_regprocedure('public.hmac(bytea,bytea,text)')
      AND namespace.nspname='public' AND extension.extname='pgcrypto'
      AND extension.extversion='1.3'
      AND procedure.proowner NOT IN (
        'lawos_app'::regrole,'lawos_outlook_control_operator'::regrole,
        'lawos_outlook_assignment_worker'::regrole,
        'lawos_outlook_lifecycle_verifier'::regrole)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_namespace AS namespace
    WHERE namespace.nspname='lawos_security'
      AND namespace.nspowner=migration_admin.oid
      AND NOT EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
        WHERE privilege.grantee<>namespace.nspowner
          AND NOT (privilege.grantee=0
                   AND privilege.privilege_type='USAGE'
                   AND NOT privilege.is_grantable))
      AND EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
        WHERE privilege.grantee=0 AND privilege.privilege_type='USAGE'
          AND NOT privilege.is_grantable)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class AS relation
    WHERE relation.oid=
      'lawos_security.tenant_context_authorities'::regclass
      AND relation.relowner=migration_admin.oid
      AND NOT EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          relation.relacl,acldefault('r',relation.relowner))) AS privilege
        WHERE privilege.grantee<>relation.relowner)
  ) OR EXISTS (
    SELECT 1 FROM (VALUES
      ('lawos_app'),('lawos_outlook_control_operator'),
      ('lawos_outlook_assignment_worker'),
      ('lawos_outlook_lifecycle_verifier')
    ) AS runtime(role_name)
    WHERE has_schema_privilege(runtime.role_name,'public','CREATE')
  ) THEN
    RAISE EXCEPTION 'tenant context or core crypto authority is absent or unsafe';
  END IF;
  SELECT * INTO authority_owner FROM pg_roles
   WHERE rolname='lawos_outlook_authority_owner';
  SELECT * INTO control_operator FROM pg_roles
   WHERE rolname='lawos_outlook_control_operator';
  SELECT * INTO assignment_worker FROM pg_roles
   WHERE rolname='lawos_outlook_assignment_worker';
  SELECT * INTO lifecycle_verifier FROM pg_roles
   WHERE rolname='lawos_outlook_lifecycle_verifier';
  SELECT * INTO application_role FROM pg_roles WHERE rolname='lawos_app';
  IF authority_owner.oid IS NULL OR authority_owner.rolcanlogin
     OR authority_owner.rolsuper OR authority_owner.rolcreatedb
     OR authority_owner.rolcreaterole OR authority_owner.rolinherit
     OR authority_owner.rolreplication OR authority_owner.rolbypassrls THEN
    RAISE EXCEPTION 'required role lawos_outlook_authority_owner is absent or unsafe';
  END IF;
  IF control_operator.oid IS NULL OR NOT control_operator.rolcanlogin
     OR control_operator.rolsuper OR control_operator.rolcreatedb
     OR control_operator.rolcreaterole OR control_operator.rolinherit
     OR control_operator.rolreplication OR control_operator.rolbypassrls THEN
    RAISE EXCEPTION 'required role lawos_outlook_control_operator is absent or unsafe';
  END IF;
  IF assignment_worker.oid IS NULL OR NOT assignment_worker.rolcanlogin
     OR assignment_worker.rolsuper OR assignment_worker.rolcreatedb
     OR assignment_worker.rolcreaterole OR assignment_worker.rolinherit
     OR assignment_worker.rolreplication OR assignment_worker.rolbypassrls THEN
    RAISE EXCEPTION 'required role lawos_outlook_assignment_worker is absent or unsafe';
  END IF;
  IF lifecycle_verifier.oid IS NULL OR NOT lifecycle_verifier.rolcanlogin
     OR lifecycle_verifier.rolsuper OR lifecycle_verifier.rolcreatedb
     OR lifecycle_verifier.rolcreaterole OR lifecycle_verifier.rolinherit
     OR lifecycle_verifier.rolreplication OR lifecycle_verifier.rolbypassrls THEN
    RAISE EXCEPTION 'required role lawos_outlook_lifecycle_verifier is absent or unsafe';
  END IF;
  IF application_role.oid IS NULL OR NOT application_role.rolcanlogin
     OR application_role.rolsuper OR application_role.rolcreatedb
     OR application_role.rolcreaterole OR application_role.rolinherit
     OR application_role.rolreplication
     OR application_role.rolbypassrls THEN
    RAISE EXCEPTION 'required role lawos_app is absent or unsafe';
  END IF;
  SELECT array_agg(oid) INTO protected_oids FROM pg_roles WHERE rolname IN (
    'lawos_app','lawos_outlook_authority_owner',
    'lawos_outlook_control_operator','lawos_outlook_assignment_worker',
    'lawos_outlook_lifecycle_verifier'
  );
  SELECT array_agg(oid) INTO automatic_role_oids FROM pg_roles WHERE rolname IN (
    'lawos_outlook_authority_owner','lawos_outlook_control_operator',
    'lawos_outlook_assignment_worker','lawos_outlook_lifecycle_verifier'
  );
  SELECT membership.grantor INTO bootstrap_grantor_oid
    FROM pg_auth_members AS membership
   WHERE membership.member=migration_admin.oid
     AND membership.roleid=ANY(automatic_role_oids)
     AND membership.admin_option AND NOT membership.inherit_option
     AND NOT membership.set_option
   GROUP BY membership.grantor
  HAVING count(*)=4 AND count(DISTINCT membership.roleid)=4;
  IF cardinality(protected_oids)<>5 OR cardinality(automatic_role_oids)<>4
     OR bootstrap_grantor_oid IS NULL
     OR bootstrap_grantor_oid=migration_admin.oid
     OR bootstrap_grantor_oid=ANY(protected_oids) THEN
    RAISE EXCEPTION 'outlook authority bootstrap creator graph is absent or unsafe';
  END IF;
  SELECT count(*) INTO app_edge_count
    FROM pg_auth_members AS membership
   WHERE membership.roleid=application_role.oid
     AND membership.member=migration_admin.oid;
  IF app_edge_count>1 OR EXISTS (
    SELECT 1 FROM pg_auth_members AS membership
     WHERE membership.roleid=application_role.oid
       AND membership.member=migration_admin.oid
       AND (membership.grantor<>bootstrap_grantor_oid
            OR NOT membership.admin_option OR membership.inherit_option
            OR membership.set_option)
  ) OR EXISTS (
    SELECT 1 FROM pg_auth_members AS membership
     WHERE (membership.roleid=ANY(protected_oids)
            OR membership.member=ANY(protected_oids))
       AND NOT (
         membership.member=migration_admin.oid
         AND membership.grantor=bootstrap_grantor_oid
         AND membership.roleid=ANY(protected_oids)
         AND membership.admin_option AND NOT membership.inherit_option
         AND NOT membership.set_option
       )
  ) THEN
    RAISE EXCEPTION 'outlook authority roles have forbidden membership edges';
  END IF;
END
$$;

ALTER FUNCTION lawos_security.current_tenant_id()
  SET search_path=pg_catalog,lawos_security;

CREATE FUNCTION pg_temp.verify_outlook_authority_final()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE receipt record;
DECLARE current_admin jsonb;
DECLARE current_schema_owners jsonb;
DECLARE current_roles jsonb;
DECLARE current_memberships jsonb;
DECLARE protected_oids oid[];
DECLARE receipt_owner text;
DECLARE receipt_rls boolean;
DECLARE receipt_force_rls boolean;
DECLARE receipt_policy_count integer;
DECLARE receipt_trigger_count integer;
DECLARE schema_owner text;
DECLARE schema_acl_count integer;
DECLARE meta_schema_owner text;
DECLARE meta_schema_acl_count integer;
BEGIN
  IF session_user<>'lawos_admin' OR current_user<>'lawos_admin' THEN
    RAISE EXCEPTION 'outlook authority final verification identity mismatch';
  END IF;
  SELECT * INTO STRICT receipt
    FROM lawos_meta.outlook_authority_bootstrap_receipts
   WHERE database_oid=(SELECT oid FROM pg_database
                        WHERE datname=current_database())
     AND migration_catalog_id='007_outlook_desktop_assignment';
  SELECT jsonb_build_object(
    'lawos_email_dms',jsonb_build_object(
      'owner_oid',target_owner.oid,'owner_name',target_owner.rolname),
    'lawos_meta',jsonb_build_object(
      'owner_oid',meta_owner.oid,'owner_name',meta_owner.rolname)
  ) INTO STRICT current_schema_owners
    FROM pg_namespace AS target_schema
    JOIN pg_roles AS target_owner ON target_owner.oid=target_schema.nspowner
    JOIN pg_namespace AS meta_schema ON meta_schema.nspname='lawos_meta'
    JOIN pg_roles AS meta_owner ON meta_owner.oid=meta_schema.nspowner
   WHERE target_schema.nspname='lawos_email_dms';
  SELECT jsonb_build_object(
    'role_oid',role.oid,'role_name',role.rolname,
    'can_login',role.rolcanlogin,'superuser',role.rolsuper,
    'createdb',role.rolcreatedb,'createrole',role.rolcreaterole,
    'inherit',role.rolinherit,'replication',role.rolreplication,
    'bypass_rls',role.rolbypassrls,'connection_limit',role.rolconnlimit,
    'valid_until_present',role.rolvaliduntil IS NOT NULL,
    'valid_until',COALESCE(to_char(role.rolvaliduntil AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),''),
    'config_count',COALESCE(cardinality(role.rolconfig),0),
    'config_sha256',(SELECT encode(pg_catalog.sha256(COALESCE(string_agg(
      int4send(octet_length(convert_to(setting,'UTF8')))||convert_to(setting,'UTF8'),
      ''::bytea ORDER BY setting COLLATE "C"),''::bytea)),'hex')
      FROM unnest(role.rolconfig) AS config(setting))
  ) INTO STRICT current_admin FROM pg_roles AS role WHERE role.rolname='lawos_admin';
  SELECT jsonb_agg(jsonb_build_object(
    'role_oid',role.oid,'role_name',role.rolname,
    'can_login',role.rolcanlogin,'superuser',role.rolsuper,
    'createdb',role.rolcreatedb,'createrole',role.rolcreaterole,
    'inherit',role.rolinherit,'replication',role.rolreplication,
    'bypass_rls',role.rolbypassrls,'connection_limit',role.rolconnlimit,
    'valid_until_present',role.rolvaliduntil IS NOT NULL,
    'valid_until',COALESCE(to_char(role.rolvaliduntil AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),''),
    'config_count',COALESCE(cardinality(role.rolconfig),0),
    'config_sha256',(SELECT encode(pg_catalog.sha256(COALESCE(string_agg(
      int4send(octet_length(convert_to(setting,'UTF8')))||convert_to(setting,'UTF8'),
      ''::bytea ORDER BY setting COLLATE "C"),''::bytea)),'hex')
      FROM unnest(role.rolconfig) AS config(setting))
  ) ORDER BY role.rolname),array_agg(role.oid)
    INTO STRICT current_roles,protected_oids
    FROM pg_roles AS role WHERE role.rolname IN (
      'lawos_app','lawos_outlook_authority_owner',
      'lawos_outlook_control_operator','lawos_outlook_assignment_worker',
      'lawos_outlook_lifecycle_verifier'
    );
  SELECT jsonb_agg(jsonb_build_object(
    'granted_role_oid',granted.oid,'granted_role',granted.rolname,
    'member_oid',member.oid,'member',member.rolname,
    'grantor_oid',grantor.oid,'grantor',grantor.rolname,
    'admin_option',membership.admin_option,
    'inherit_option',membership.inherit_option,
    'set_option',membership.set_option
  ) ORDER BY granted.rolname,member.rolname,grantor.rolname)
    INTO STRICT current_memberships
    FROM pg_auth_members AS membership
    JOIN pg_roles AS granted ON granted.oid=membership.roleid
    JOIN pg_roles AS member ON member.oid=membership.member
    JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
   WHERE membership.roleid=ANY(protected_oids)
      OR membership.member=ANY(protected_oids);
  IF current_schema_owners IS DISTINCT FROM receipt.schema_owners
     OR receipt.digest_domain IS DISTINCT FROM
        'lawos.outlook-authority-role-bootstrap-receipt.sha256.v1'
     OR receipt.postgres_major IS DISTINCT FROM 16
     OR current_admin IS DISTINCT FROM receipt.migration_admin
     OR current_roles IS DISTINCT FROM receipt.protected_roles
     OR current_memberships IS DISTINCT FROM receipt.protected_memberships
     OR jsonb_array_length(receipt.protected_roles)<>5
     OR jsonb_array_length(receipt.protected_memberships) NOT BETWEEN 4 AND 5
     OR receipt.lawos_app_membership_present IS DISTINCT FROM (
       SELECT EXISTS (
         SELECT 1 FROM pg_auth_members
          WHERE roleid='lawos_app'::regrole AND member='lawos_admin'::regrole)
     ) OR receipt.role_bootstrap_sha256 IS DISTINCT FROM (
       SELECT expected.role_bootstrap_sha256
         FROM pg_temp.outlook_authority_expected_receipt AS expected
        WHERE expected.schema_version=receipt.schema_version
     ) OR receipt.authority_manifest_sha256 IS DISTINCT FROM (
       SELECT expected.authority_manifest_sha256
         FROM pg_temp.outlook_authority_expected_receipt AS expected
        WHERE expected.schema_version=receipt.schema_version
     ) OR receipt.database_target_receipt_sha256 IS DISTINCT FROM (
       SELECT expected.database_target_receipt_sha256
         FROM pg_temp.outlook_authority_expected_receipt AS expected
        WHERE expected.schema_version=receipt.schema_version
     ) OR receipt.migration_catalog_sha256 IS DISTINCT FROM (
       SELECT expected.migration_catalog_sha256
         FROM pg_temp.outlook_authority_expected_receipt AS expected
        WHERE expected.schema_version=receipt.schema_version
     ) OR EXISTS (
       SELECT 1 FROM pg_auth_members AS membership
        WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
          AND membership.member='lawos_admin'::regrole
          AND membership.grantor='lawos_admin'::regrole
     ) THEN
    RAISE EXCEPTION 'outlook authority final role receipt verification failed';
  END IF;
  SELECT owner.rolname,relation.relrowsecurity,relation.relforcerowsecurity,
         (SELECT count(*) FROM pg_policy WHERE polrelid=relation.oid),
         (SELECT count(*) FROM pg_trigger
           WHERE tgrelid=relation.oid AND NOT tgisinternal
             AND tgname='outlook_authority_bootstrap_receipt_immutable'
             AND tgenabled='O')
    INTO STRICT receipt_owner,receipt_rls,receipt_force_rls,
                receipt_policy_count,receipt_trigger_count
    FROM pg_class AS relation
    JOIN pg_roles AS owner ON owner.oid=relation.relowner
   WHERE relation.oid=
     'lawos_meta.outlook_authority_bootstrap_receipts'::regclass;
  IF receipt_owner<>'lawos_outlook_authority_owner'
     OR receipt_rls OR receipt_force_rls OR receipt_policy_count<>0
     OR receipt_trigger_count<>1 OR EXISTS (
       SELECT 1 FROM pg_class AS relation
       CROSS JOIN LATERAL aclexplode(COALESCE(
         relation.relacl,acldefault('r',relation.relowner))) AS privilege
       LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
       WHERE relation.oid=
         'lawos_meta.outlook_authority_bootstrap_receipts'::regclass
         AND privilege.grantee<>relation.relowner
         AND NOT (grantee.rolname='lawos_admin'
                  AND privilege.privilege_type='SELECT'
                  AND NOT privilege.is_grantable)
     ) OR NOT has_table_privilege(
       'lawos_admin','lawos_meta.outlook_authority_bootstrap_receipts','SELECT'
     ) THEN
    RAISE EXCEPTION 'outlook authority bootstrap receipt ACL verification failed';
  END IF;
  SELECT owner.rolname,count(*) FILTER (
    WHERE privilege.grantee<>namespace.nspowner)
    INTO STRICT schema_owner,schema_acl_count
    FROM pg_namespace AS namespace
    JOIN pg_roles AS owner ON owner.oid=namespace.nspowner
    CROSS JOIN LATERAL aclexplode(COALESCE(
      namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
   WHERE namespace.nspname='lawos_email_dms'
   GROUP BY owner.rolname;
  IF schema_owner<>'lawos_admin' OR schema_acl_count<>5 OR EXISTS (
    SELECT 1 FROM pg_namespace AS namespace
    CROSS JOIN LATERAL aclexplode(COALESCE(
      namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
    LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
    WHERE namespace.nspname='lawos_email_dms'
      AND privilege.grantee<>namespace.nspowner
      AND (grantee.rolname NOT IN (
        'lawos_app','lawos_outlook_authority_owner',
        'lawos_outlook_control_operator','lawos_outlook_assignment_worker',
        'lawos_outlook_lifecycle_verifier'
      ) OR privilege.privilege_type<>'USAGE' OR privilege.is_grantable)
  ) OR has_schema_privilege(
    'lawos_outlook_authority_owner','lawos_email_dms','CREATE'
  ) OR has_schema_privilege(
    'lawos_outlook_authority_owner','lawos_meta','CREATE'
  ) THEN
    RAISE EXCEPTION 'outlook authority final schema ACL verification failed';
  END IF;
  SELECT owner.rolname,count(*) FILTER (
    WHERE privilege.grantee<>namespace.nspowner)
    INTO STRICT meta_schema_owner,meta_schema_acl_count
    FROM pg_namespace AS namespace
    JOIN pg_roles AS owner ON owner.oid=namespace.nspowner
    CROSS JOIN LATERAL aclexplode(COALESCE(
      namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
   WHERE namespace.nspname='lawos_meta'
   GROUP BY owner.rolname;
  IF meta_schema_owner<>'lawos_admin' OR EXISTS (
    SELECT 1 FROM pg_namespace AS namespace
    CROSS JOIN LATERAL aclexplode(COALESCE(
      namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
    LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
    WHERE namespace.nspname='lawos_meta'
      AND privilege.grantee<>namespace.nspowner
      AND (privilege.privilege_type<>'USAGE' OR privilege.is_grantable)
  ) OR NOT has_schema_privilege('lawos_app','lawos_meta','USAGE')
     OR NOT has_schema_privilege(
       'lawos_outlook_authority_owner','lawos_meta','USAGE'
  ) OR has_schema_privilege(
    'lawos_outlook_authority_owner','lawos_meta','CREATE'
  ) THEN
    RAISE EXCEPTION 'outlook authority final meta schema ACL verification failed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('pg_catalog.sha256(bytea)',3420::oid),
      ('pg_catalog.gen_random_uuid()',3432::oid)
    ) AS expected(signature,expected_oid)
    LEFT JOIN pg_proc AS procedure
      ON procedure.oid=to_regprocedure(expected.signature)
    LEFT JOIN pg_namespace AS namespace
      ON namespace.oid=procedure.pronamespace
    WHERE procedure.oid IS NULL OR procedure.oid<>expected.expected_oid
       OR namespace.nspname<>'pg_catalog'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
    JOIN pg_language AS language ON language.oid=procedure.prolang
    WHERE procedure.oid=to_regprocedure(
      'lawos_security.current_tenant_id()')
      AND namespace.nspname='lawos_security'
      AND procedure.proowner='lawos_admin'::regrole
      AND language.lanname='plpgsql' AND procedure.provolatile='s'
      AND procedure.prosecdef
      AND procedure.proconfig=ARRAY[
        'search_path=pg_catalog, lawos_security']::text[]
      AND encode(pg_catalog.sha256(pg_catalog.convert_to(
        procedure.prosrc,'UTF8')),'hex')=
        'e1e33ef1f4b60203f6b0ab68461ce85df5bc7d13d0c17fa665f8c825b4ddc260'
      AND NOT EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
        WHERE privilege.grantee<>procedure.proowner
          AND NOT (privilege.grantee=0
                   AND privilege.privilege_type='EXECUTE'
                   AND NOT privilege.is_grantable))
      AND EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
        WHERE privilege.grantee=0 AND privilege.privilege_type='EXECUTE'
          AND NOT privilege.is_grantable)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
    JOIN pg_depend AS dependency
      ON dependency.classid='pg_proc'::regclass
     AND dependency.objid=procedure.oid AND dependency.deptype='e'
    JOIN pg_extension AS extension
      ON extension.oid=dependency.refobjid
     AND dependency.refclassid='pg_extension'::regclass
    WHERE procedure.oid=to_regprocedure('public.hmac(bytea,bytea,text)')
      AND namespace.nspname='public' AND extension.extname='pgcrypto'
      AND extension.extversion='1.3'
      AND procedure.proowner NOT IN (
        'lawos_app'::regrole,'lawos_outlook_control_operator'::regrole,
        'lawos_outlook_assignment_worker'::regrole,
        'lawos_outlook_lifecycle_verifier'::regrole)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_namespace AS namespace
    WHERE namespace.nspname='lawos_security'
      AND namespace.nspowner='lawos_admin'::regrole
      AND NOT EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
        WHERE privilege.grantee<>namespace.nspowner
          AND NOT (privilege.grantee=0
                   AND privilege.privilege_type='USAGE'
                   AND NOT privilege.is_grantable))
      AND EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
        WHERE privilege.grantee=0 AND privilege.privilege_type='USAGE'
          AND NOT privilege.is_grantable)
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_class AS relation
    WHERE relation.oid=
      'lawos_security.tenant_context_authorities'::regclass
      AND relation.relowner='lawos_admin'::regrole
      AND NOT EXISTS (
        SELECT 1 FROM aclexplode(COALESCE(
          relation.relacl,acldefault('r',relation.relowner))) AS privilege
        WHERE privilege.grantee<>relation.relowner)
  ) OR EXISTS (
    SELECT 1 FROM (VALUES
      ('lawos_app'),('lawos_outlook_control_operator'),
      ('lawos_outlook_assignment_worker'),
      ('lawos_outlook_lifecycle_verifier')
    ) AS runtime(role_name)
    WHERE has_schema_privilege(runtime.role_name,'public','CREATE')
  ) THEN
    RAISE EXCEPTION 'outlook authority final tenant context dependency failed';
  END IF;
END
$$;

CREATE TABLE lawos_meta.outlook_authority_bootstrap_receipts (
  schema_version text NOT NULL CHECK (
    schema_version='lawos.outlook-authority-role-bootstrap-receipt.v1'),
  digest_domain text NOT NULL CHECK (
    digest_domain=
      'lawos.outlook-authority-role-bootstrap-receipt.sha256.v1'),
  postgres_major integer NOT NULL CHECK (postgres_major=16),
  database_oid oid NOT NULL,
  database_name text NOT NULL,
  migration_catalog_id text NOT NULL
    CHECK (migration_catalog_id='007_outlook_desktop_assignment'),
  migration_schema_version text NOT NULL CHECK (
    migration_schema_version=
      'lawos.email-dms.outlook-desktop-assignment-migration.v1'),
  target_schema text NOT NULL CHECK (target_schema='lawos_email_dms'),
  schema_owners jsonb NOT NULL CHECK (jsonb_typeof(schema_owners)='object'),
  migration_admin jsonb NOT NULL CHECK (jsonb_typeof(migration_admin)='object'),
  bootstrap_grantor jsonb NOT NULL
    CHECK (jsonb_typeof(bootstrap_grantor)='object'),
  protected_roles jsonb NOT NULL CHECK (
    jsonb_typeof(protected_roles)='array'
    AND jsonb_array_length(protected_roles)=5),
  protected_memberships jsonb NOT NULL CHECK (
    jsonb_typeof(protected_memberships)='array'
    AND jsonb_array_length(protected_memberships) BETWEEN 4 AND 5),
  lawos_app_membership_present boolean NOT NULL,
  role_bootstrap_sha256 text NOT NULL CHECK (
    role_bootstrap_sha256~'^[a-f0-9]{64}$'),
  authority_manifest_sha256 text NOT NULL CHECK (
    authority_manifest_sha256~'^[a-f0-9]{64}$'),
  database_target_receipt_sha256 text NOT NULL CHECK (
    database_target_receipt_sha256~'^[a-f0-9]{64}$'),
  migration_catalog_sha256 text NOT NULL CHECK (
    migration_catalog_sha256~'^[a-f0-9]{64}$'),
  captured_at timestamptz NOT NULL
    CHECK (captured_at=date_trunc('milliseconds',captured_at)),
  PRIMARY KEY (database_oid,migration_catalog_id)
);

WITH captured AS MATERIALIZED (
  SELECT date_trunc('milliseconds',clock_timestamp()) AS captured_at
), role_rows AS MATERIALIZED (
  SELECT target.oid AS role_oid,target.rolname AS role_name,
         target.rolcanlogin,target.rolsuper,target.rolcreatedb,
         target.rolcreaterole,target.rolinherit,target.rolreplication,
         target.rolbypassrls,target.rolconnlimit,target.rolvaliduntil,
         target.rolvaliduntil IS NOT NULL AS valid_until_present,
         COALESCE(to_char(target.rolvaliduntil AT TIME ZONE 'UTC',
           'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'') AS valid_until,
         target.rolconfig,
         row_number() OVER (ORDER BY target.rolname) AS role_rank
    FROM (VALUES
      ('lawos_app'),('lawos_outlook_authority_owner'),
      ('lawos_outlook_control_operator'),('lawos_outlook_assignment_worker'),
      ('lawos_outlook_lifecycle_verifier')
    ) AS expected(role_name)
    JOIN pg_roles AS target ON target.rolname=expected.role_name
), membership_rows AS MATERIALIZED (
  SELECT granted.oid AS granted_role_oid,granted.rolname AS granted_role,
         member.oid AS member_oid,member.rolname AS member,
         grantor.oid AS grantor_oid,grantor.rolname AS grantor,
         membership.admin_option,membership.inherit_option,
         membership.set_option,
         row_number() OVER (ORDER BY granted.rolname,member.rolname,
                            grantor.rolname) AS membership_rank
    FROM pg_auth_members AS membership
    JOIN pg_roles AS granted ON granted.oid=membership.roleid
    JOIN pg_roles AS member ON member.oid=membership.member
    JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
   WHERE granted.oid IN (SELECT role_oid FROM role_rows)
      OR member.oid IN (SELECT role_oid FROM role_rows)
), role_catalog AS MATERIALIZED (
  SELECT jsonb_agg(jsonb_build_object(
    'role_oid',role_oid,'role_name',role_name,'can_login',rolcanlogin,
    'superuser',rolsuper,'createdb',rolcreatedb,'createrole',rolcreaterole,
    'inherit',rolinherit,'replication',rolreplication,
    'bypass_rls',rolbypassrls,'connection_limit',rolconnlimit,
    'valid_until_present',valid_until_present,'valid_until',valid_until,
    'config_count',COALESCE(cardinality(rolconfig),0),
    'config_sha256',(SELECT encode(pg_catalog.sha256(COALESCE(string_agg(
      int4send(octet_length(convert_to(setting,'UTF8')))||convert_to(setting,'UTF8'),
      ''::bytea ORDER BY setting COLLATE "C"),''::bytea)),'hex')
      FROM unnest(rolconfig) AS config(setting))
  ) ORDER BY role_name) AS value FROM role_rows
), membership_catalog AS MATERIALIZED (
  SELECT jsonb_agg(jsonb_build_object(
    'granted_role_oid',granted_role_oid,'granted_role',granted_role,
    'member_oid',member_oid,'member',member,
    'grantor_oid',grantor_oid,'grantor',grantor,
    'admin_option',admin_option,'inherit_option',inherit_option,
    'set_option',set_option
  ) ORDER BY granted_role,member,grantor) AS value FROM membership_rows
), receipt AS MATERIALIZED (
  SELECT database.oid AS database_oid,current_database() AS database_name,
         (current_setting('server_version_num')::integer/10000)::text
           AS postgres_major,
         jsonb_build_object(
           'lawos_email_dms',jsonb_build_object(
             'owner_oid',target_owner.oid,'owner_name',target_owner.rolname),
           'lawos_meta',jsonb_build_object(
             'owner_oid',meta_owner.oid,'owner_name',meta_owner.rolname)
         ) AS schema_owners,
         target_owner.oid AS target_schema_owner_oid,
         target_owner.rolname AS target_schema_owner_name,
         meta_owner.oid AS meta_schema_owner_oid,
         meta_owner.rolname AS meta_schema_owner_name,
         jsonb_build_object(
           'role_oid',migration_admin.oid,'role_name',migration_admin.rolname,
           'can_login',migration_admin.rolcanlogin,
           'superuser',migration_admin.rolsuper,
           'createdb',migration_admin.rolcreatedb,
           'createrole',migration_admin.rolcreaterole,
           'inherit',migration_admin.rolinherit,
           'replication',migration_admin.rolreplication,
           'bypass_rls',migration_admin.rolbypassrls,
           'connection_limit',migration_admin.rolconnlimit,
           'valid_until_present',migration_admin.rolvaliduntil IS NOT NULL,
           'valid_until',COALESCE(to_char(
             migration_admin.rolvaliduntil AT TIME ZONE 'UTC',
             'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),''),
           'config_count',COALESCE(cardinality(migration_admin.rolconfig),0),
           'config_sha256',(SELECT encode(pg_catalog.sha256(COALESCE(string_agg(
             int4send(octet_length(convert_to(setting,'UTF8')))||convert_to(setting,'UTF8'),
             ''::bytea ORDER BY setting COLLATE "C"),''::bytea)),'hex')
             FROM unnest(migration_admin.rolconfig) AS config(setting))
         ) AS migration_admin,
         migration_admin.oid AS migration_admin_oid,
         migration_admin.rolname AS migration_admin_name,
         migration_admin.rolcanlogin,migration_admin.rolsuper,
         migration_admin.rolcreatedb,migration_admin.rolcreaterole,
         migration_admin.rolinherit,migration_admin.rolreplication,
         migration_admin.rolbypassrls,migration_admin.rolconnlimit,
         migration_admin.rolvaliduntil IS NOT NULL
           AS migration_admin_valid_until_present,
         COALESCE(to_char(migration_admin.rolvaliduntil AT TIME ZONE 'UTC',
           'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'')
           AS migration_admin_valid_until,
         migration_admin.rolconfig AS migration_admin_config,
         jsonb_build_object('role_oid',bootstrap.oid,'role_name',bootstrap.rolname)
           AS bootstrap_grantor,
         bootstrap.oid AS bootstrap_grantor_oid,
         bootstrap.rolname AS bootstrap_grantor_name,
         role_catalog.value AS protected_roles,
         membership_catalog.value AS protected_memberships,
         EXISTS (SELECT 1 FROM membership_rows
                  WHERE granted_role='lawos_app')
           AS lawos_app_membership_present,
         captured.captured_at
    FROM pg_database AS database
    JOIN pg_roles AS migration_admin ON migration_admin.rolname='lawos_admin'
    JOIN pg_namespace AS target_schema ON target_schema.nspname='lawos_email_dms'
    JOIN pg_roles AS target_owner ON target_owner.oid=target_schema.nspowner
    JOIN pg_namespace AS meta_schema ON meta_schema.nspname='lawos_meta'
    JOIN pg_roles AS meta_owner ON meta_owner.oid=meta_schema.nspowner
    CROSS JOIN captured CROSS JOIN role_catalog CROSS JOIN membership_catalog
    JOIN pg_roles AS bootstrap ON bootstrap.oid=(
      SELECT DISTINCT grantor_oid FROM membership_rows)
   WHERE database.datname=current_database()
), segments AS MATERIALIZED (
  SELECT section,item,subitem,value
    FROM receipt CROSS JOIN LATERAL (VALUES
      (1,0,0,'lawos.outlook-authority-role-bootstrap-receipt.sha256.v1'),
      (2,0,0,'lawos.outlook-authority-role-bootstrap-receipt.v1'),
      (3,0,0,postgres_major),(4,0,1,database_oid::text),
      (4,0,2,database_name),(5,0,1,'007_outlook_desktop_assignment'),
      (5,0,2,'lawos.email-dms.outlook-desktop-assignment-migration.v1'),
      (5,0,3,'lawos_email_dms'),(6,0,1,target_schema_owner_oid::text),
      (6,0,2,target_schema_owner_name),(7,0,1,meta_schema_owner_oid::text),
      (7,0,2,meta_schema_owner_name),(8,0,1,migration_admin_oid::text),
      (8,0,2,migration_admin_name),(8,0,3,rolcanlogin::text),
      (8,0,4,rolsuper::text),(8,0,5,rolcreatedb::text),
      (8,0,6,rolcreaterole::text),(8,0,7,rolinherit::text),
      (8,0,8,rolreplication::text),(8,0,9,rolbypassrls::text),
      (8,0,10,rolconnlimit::text),
      (8,0,11,migration_admin_valid_until_present::text),
      (8,0,12,migration_admin_valid_until),
      (8,0,13,COALESCE(cardinality(migration_admin_config),0)::text),
      (9,0,1,bootstrap_grantor_oid::text),(9,0,2,bootstrap_grantor_name),
      (10,0,0,'5'),(11,0,0,lawos_app_membership_present::text)
    ) AS base(section,item,subitem,value)
  UNION ALL
  SELECT 8,0,13+config.config_rank::integer,config.setting
    FROM receipt
    CROSS JOIN LATERAL (
      SELECT setting,row_number() OVER (ORDER BY setting COLLATE "C")
        AS config_rank
        FROM unnest(migration_admin_config) AS value(setting)
    ) AS config
  UNION ALL
  SELECT 10,role_rank::integer,field.ordinal,field.value
    FROM role_rows CROSS JOIN LATERAL (VALUES
      (1,role_oid::text),(2,role_name),(3,rolcanlogin::text),
      (4,rolsuper::text),(5,rolcreatedb::text),(6,rolcreaterole::text),
      (7,rolinherit::text),(8,rolreplication::text),(9,rolbypassrls::text),
      (10,rolconnlimit::text),(11,valid_until_present::text),
      (12,valid_until),(13,COALESCE(cardinality(rolconfig),0)::text)
    ) AS field(ordinal,value)
  UNION ALL
  SELECT 10,role_rank::integer,13+config.config_rank::integer,config.setting
    FROM role_rows
    CROSS JOIN LATERAL (
      SELECT setting,row_number() OVER (ORDER BY setting COLLATE "C")
        AS config_rank
        FROM unnest(rolconfig) AS value(setting)
    ) AS config
  UNION ALL
  SELECT 12,0,0,count(*)::text FROM membership_rows
  UNION ALL
  SELECT 12,membership_rank::integer,field.ordinal,field.value
    FROM membership_rows CROSS JOIN LATERAL (VALUES
      (1,granted_role_oid::text),(2,granted_role),(3,member_oid::text),
      (4,member),(5,grantor_oid::text),(6,grantor),(7,admin_option::text),
      (8,inherit_option::text),(9,set_option::text)
    ) AS field(ordinal,value)
), authority AS MATERIALIZED (
  SELECT encode(pg_catalog.sha256(string_agg(
           int4send(octet_length(convert_to(value,'UTF8')))
             ||convert_to(value,'UTF8'),
           ''::bytea ORDER BY section,item,subitem)),'hex')
           AS role_bootstrap_sha256
    FROM segments
)
INSERT INTO lawos_meta.outlook_authority_bootstrap_receipts (
  schema_version,digest_domain,postgres_major,
  database_oid,database_name,migration_catalog_id,
  migration_schema_version,target_schema,schema_owners,migration_admin,
  bootstrap_grantor,protected_roles,protected_memberships,
  lawos_app_membership_present,role_bootstrap_sha256,
  authority_manifest_sha256,database_target_receipt_sha256,
  migration_catalog_sha256,captured_at
)
SELECT 'lawos.outlook-authority-role-bootstrap-receipt.v1',
       'lawos.outlook-authority-role-bootstrap-receipt.sha256.v1',
       postgres_major::integer,database_oid,database_name,
       '007_outlook_desktop_assignment',
       'lawos.email-dms.outlook-desktop-assignment-migration.v1',
       'lawos_email_dms',schema_owners,migration_admin,bootstrap_grantor,
       protected_roles,protected_memberships,lawos_app_membership_present,
       authority.role_bootstrap_sha256,expected.authority_manifest_sha256,
       expected.database_target_receipt_sha256,
       expected.migration_catalog_sha256,captured_at
  FROM receipt CROSS JOIN authority
  JOIN pg_temp.outlook_authority_expected_receipt AS expected
    ON expected.role_bootstrap_sha256=authority.role_bootstrap_sha256
   AND expected.schema_version=
       'lawos.outlook-authority-role-bootstrap-receipt.v1';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM lawos_meta.outlook_authority_bootstrap_receipts
     WHERE database_oid=(SELECT oid FROM pg_database
                          WHERE datname=current_database())
       AND migration_catalog_id='007_outlook_desktop_assignment'
  ) THEN
    RAISE EXCEPTION 'outlook authority expected bootstrap receipt mismatch';
  END IF;
END
$$;

CREATE TRIGGER outlook_authority_bootstrap_receipt_immutable
  BEFORE UPDATE OR DELETE ON lawos_meta.outlook_authority_bootstrap_receipts
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE OR REPLACE FUNCTION lawos_email_dms.fail_outlook_desktop_assignment_job(
  bound_tenant_id text,
  bound_failure jsonb,
  bound_max_attempts integer,
  bound_base_delay_milliseconds integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE job record;
DECLARE now_at timestamptz;
DECLARE proof jsonb;
DECLARE next_status text;
DECLARE next_remote_state text;
DECLARE required_current_removal boolean := false;
DECLARE escalated boolean := false;
DECLARE delay_milliseconds bigint;
DECLARE required_keys constant text[] := ARRAY[
  'outbox_id','worker_id','lease_token','error_code','failure_certainty',
  'permanent','non_commit_proof'
];
DECLARE proof_keys constant text[] := ARRAY[
  'schema_version','request_terminal','propagation_stabilized','receipt_sha256'
];
BEGIN
  IF session_user<>'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'outlook desktop assignment worker required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_failure)<>'object'
     OR NOT bound_failure ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_failure) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_failure->>'outbox_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_failure->>'worker_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_failure->>'lease_token' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_failure->>'error_code' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_failure->>'failure_certainty' NOT IN (
       'definitive_not_committed','ambiguous')
     OR jsonb_typeof(bound_failure->'permanent')<>'boolean'
     OR bound_max_attempts NOT BETWEEN 1 AND 100
     OR bound_base_delay_milliseconds NOT BETWEEN 100 AND 900000 THEN
    RAISE EXCEPTION 'outlook desktop assignment failure shape invalid';
  END IF;
  proof := bound_failure->'non_commit_proof';
  IF bound_failure->>'failure_certainty'='ambiguous' THEN
    IF jsonb_typeof(proof)<>'null' THEN
      RAISE EXCEPTION 'ambiguous failure cannot assert non-commit proof';
    END IF;
  ELSIF jsonb_typeof(proof)<>'null' AND (
       jsonb_typeof(proof)<>'object' OR NOT proof ?& proof_keys
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(proof) AS key
                   WHERE key<>ALL(proof_keys))
       OR proof->>'schema_version'<>
          'lawos.outlook-assignment-non-commit-proof.v1'
       OR proof->'request_terminal'<>'true'::jsonb
       OR proof->'propagation_stabilized'<>'true'::jsonb
       OR proof->>'receipt_sha256' !~ '^[a-f0-9]{64}$'
     ) THEN
    RAISE EXCEPTION 'outlook desktop assignment non-commit proof invalid';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-failure-request'||chr(31)||
    (bound_failure->>'outbox_id')||chr(31)||
    (bound_failure->>'lease_token'),0));
  SELECT * INTO job
    FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id AND outbox_id=bound_failure->>'outbox_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||job.user_id||chr(31)||job.entra_subject_id,0));
  SELECT * INTO job
    FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id AND outbox_id=bound_failure->>'outbox_id'
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR job.status<>'leased'
     OR job.lease_owner<>bound_failure->>'worker_id'
     OR job.lease_token<>bound_failure->>'lease_token'
     OR job.lease_expires_at<=now_at THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  IF job.remote_commit_state='unknown'
     AND bound_failure->>'failure_certainty'='definitive_not_committed'
     AND jsonb_typeof(proof)<>'object' THEN
    RAISE EXCEPTION 'outlook desktop assignment unknown commit requires proof';
  END IF;
  SELECT EXISTS (
    SELECT 1
      FROM lawos_email_dms.outlook_desktop_assignment_states AS state
     WHERE state.tenant_id=job.tenant_id AND state.user_id=job.user_id
       AND state.entra_subject_id=job.entra_subject_id
       AND state.provider_generation=job.provider_generation
       AND state.provider_intent_sha256=job.provider_intent_sha256
       AND NOT state.desired_assigned AND job.action='remove'
  ) INTO required_current_removal;
  escalated := required_current_removal AND (
    (bound_failure->>'permanent')::boolean
    OR job.retry_epoch_attempt_count>=bound_max_attempts
  );
  IF bound_failure->>'failure_certainty'='ambiguous' THEN
    next_remote_state := 'unknown';
    next_status := CASE
      WHEN NOT required_current_removal AND (
        (bound_failure->>'permanent')::boolean
        OR job.retry_epoch_attempt_count>=bound_max_attempts
      ) THEN 'dead_letter'
      ELSE 'ambiguous'
    END;
  ELSE
    next_remote_state := 'not_sent';
    next_status := CASE
      WHEN NOT required_current_removal AND (
        (bound_failure->>'permanent')::boolean
        OR job.retry_epoch_attempt_count>=bound_max_attempts
      ) THEN 'dead_letter'
      ELSE 'retry'
    END;
  END IF;
  delay_milliseconds := LEAST(
    900000::bigint,
    bound_base_delay_milliseconds::bigint
      * (2::bigint ^ LEAST(20,GREATEST(0,job.retry_epoch_attempt_count-1)))
  );
  UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
     SET status=next_status,remote_commit_state=next_remote_state,
         available_at=now_at+
           make_interval(secs=>delay_milliseconds::double precision/1000),
         lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,
         last_error_code=bound_failure->>'error_code',
         escalation_count=escalation_count+CASE WHEN escalated THEN 1 ELSE 0 END,
         last_escalated_at=CASE WHEN escalated THEN now_at ELSE last_escalated_at END,
         updated_at=now_at
   WHERE tenant_id=bound_tenant_id AND outbox_id=job.outbox_id
  RETURNING * INTO job;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
    tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
    provider_generation,provider_intent_sha256,details,occurred_at
  ) VALUES (
    job.tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,job.user_id,
    job.entra_subject_id,
    CASE WHEN escalated THEN 'outbox_escalated'
         ELSE 'outbox_'||next_status END,NULL,
    job.provider_generation,job.provider_intent_sha256,
    jsonb_build_object(
      'safe_error_code',bound_failure->>'error_code',
      'failure_certainty',bound_failure->>'failure_certainty',
      'non_commit_receipt_sha256',proof->>'receipt_sha256',
      'mandatory_remove',required_current_removal,
      'escalation_count',job.escalation_count
    ),now_at
  );
  RETURN jsonb_build_object('outcome',next_status,'job',to_jsonb(job));
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.extend_outlook_desktop_assignment_lease(
  bound_tenant_id text,
  bound_outbox_id text,
  bound_worker_id text,
  bound_lease_token text,
  bound_lease_milliseconds integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE job record;
DECLARE now_at timestamptz;
BEGIN
  IF session_user<>'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'outlook desktop assignment worker required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_outbox_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_lease_token !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_lease_milliseconds NOT BETWEEN 1000 AND 300000 THEN
    RAISE EXCEPTION 'outlook desktop assignment lease extension invalid';
  END IF;
  SELECT * INTO job
    FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id AND outbox_id=bound_outbox_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||job.user_id||chr(31)||job.entra_subject_id,0));
  SELECT * INTO job
    FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id AND outbox_id=bound_outbox_id
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR job.status<>'leased' OR job.lease_owner<>bound_worker_id
     OR job.lease_token<>bound_lease_token OR job.lease_expires_at<=now_at THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
     SET lease_expires_at=GREATEST(
           lease_expires_at,
           now_at+make_interval(
             secs=>bound_lease_milliseconds::double precision/1000)),
         updated_at=now_at
   WHERE tenant_id=bound_tenant_id AND outbox_id=bound_outbox_id
  RETURNING * INTO job;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
    tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
    provider_generation,provider_intent_sha256,details,occurred_at
  ) VALUES (
    job.tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,job.user_id,
    job.entra_subject_id,'outbox_lease_extended',NULL,
    job.provider_generation,job.provider_intent_sha256,'{}'::jsonb,now_at
  );
  RETURN jsonb_build_object('outcome','lease_extended','job',to_jsonb(job));
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.project_outlook_desktop_assignment_at(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text,
  bound_reason text,
  bound_now timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE policy record;
DECLARE previous record;
DECLARE projected record;
DECLARE active_count integer := 0;
DECLARE trust_revision bigint := 1;
DECLARE trust_facts text := 'none';
DECLARE trust_binding text;
DECLARE policy_binding text;
DECLARE policy_revision bigint := 0;
DECLARE policy_stage text;
DECLARE policy_current boolean := false;
DECLARE desired boolean;
DECLARE reasons jsonb;
DECLARE aggregate_sha text;
DECLARE state_revision bigint;
DECLARE provider_generation bigint;
DECLARE provider_intent text;
DECLARE previous_desired boolean := false;
DECLARE provider_changed boolean := false;
DECLARE event_id text;
DECLARE operation_id text;
DECLARE action text;
DECLARE outbox_row jsonb := NULL;
BEGIN
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_now<>date_trunc('milliseconds',bound_now)
     OR bound_user_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_entra_subject_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_reason !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$' THEN
    RAISE EXCEPTION 'outlook desktop assignment projection input invalid';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||bound_user_id||chr(31)||bound_entra_subject_id,0));
  SELECT state.* INTO previous
    FROM lawos_email_dms.outlook_desktop_assignment_states AS state
   WHERE tenant_id=bound_tenant_id AND user_id=bound_user_id
   FOR UPDATE;
  IF FOUND AND previous.entra_subject_id<>bound_entra_subject_id THEN
    RAISE EXCEPTION 'outlook desktop assignment principal binding mismatch';
  END IF;
  SELECT policy_row.*,
         approval.approval_id AS exact_approval_id
    INTO policy
    FROM lawos_email_dms.outlook_desktop_assignment_policies AS policy_row
    JOIN lawos_email_dms.outlook_desktop_assignment_policy_approvals AS approval
      ON approval.tenant_id=policy_row.tenant_id
     AND approval.approval_id=policy_row.approval_id
     AND ROW(approval.user_id,approval.entra_subject_id,
       approval.rollout_stage,approval.maximum_entitled,
       approval.rollout_authorized,approval.account_active,
       approval.release_allowed,approval.policy_revision,
       approval.roster_version,approval.roster_binding_sha256,
       approval.owner_approval_sha256,approval.policy_binding_sha256,
       approval.valid_from,approval.valid_until)
       IS NOT DISTINCT FROM ROW(policy_row.user_id,policy_row.entra_subject_id,
       policy_row.rollout_stage,policy_row.maximum_entitled,
       policy_row.rollout_authorized,policy_row.account_active,
       policy_row.release_allowed,policy_row.policy_revision,
       policy_row.roster_version,policy_row.roster_binding_sha256,
       policy_row.owner_approval_sha256,policy_row.policy_binding_sha256,
       policy_row.valid_from,policy_row.valid_until)
    JOIN lawos_email_dms.outlook_desktop_assignment_rosters AS roster
      ON roster.tenant_id=policy_row.tenant_id
     AND roster.roster_version=policy_row.roster_version
     AND roster.rollout_stage=policy_row.rollout_stage
     AND roster.roster_binding_sha256=policy_row.roster_binding_sha256
     AND roster.owner_approval_sha256=policy_row.owner_approval_sha256
    JOIN lawos_email_dms.outlook_desktop_assignment_roster_members AS member
      ON member.tenant_id=policy_row.tenant_id
     AND member.roster_version=policy_row.roster_version
     AND member.user_id=policy_row.user_id
     AND member.entra_subject_id=policy_row.entra_subject_id
   WHERE policy_row.tenant_id=bound_tenant_id
     AND policy_row.user_id=bound_user_id
     AND policy_row.entra_subject_id=bound_entra_subject_id;
  IF FOUND THEN
    policy_binding := policy.policy_binding_sha256;
    policy_revision := policy.policy_revision;
    policy_stage := policy.rollout_stage;
    policy_current := policy.maximum_entitled AND policy.rollout_authorized
      AND policy.account_active AND policy.release_allowed
      AND policy.valid_from<=bound_now AND policy.valid_until>bound_now;
  ELSE
    policy_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.outlook-desktop-assignment-policy-absent.v1',bound_tenant_id,
      bound_user_id,bound_entra_subject_id
    ]);
  END IF;
  SELECT count(*)::integer,
         COALESCE(max(GREATEST(installation.state_version,
                    binding.trust_registry_serial)),1),
         COALESCE(string_agg(
           lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
             installation.installation_id,installation.state_version::text,
             ((extract(epoch FROM installation.lease_expires_at)*1000)::bigint)::text,
             binding.installation_release_binding_sha256,
             binding.release_artifact_id,binding.release_ticket_sha256,
             binding.release_ticket_signature_sha256,
             binding.measured_inner_artifact_sha256,
             binding.registered_final_artifact_sha256,
             binding.approval_audit_event_binding_sha256,
             binding.trust_registry_sha256,binding.trust_registry_serial::text,
             activation.authorization_binding_sha256,
             activation.release_authority_sha256,
             ((extract(epoch FROM artifact.valid_until)*1000)::bigint)::text
           ]),'' ORDER BY installation.installation_id),'none')
    INTO active_count,trust_revision,trust_facts
    FROM lawos_email_dms.outlook_desktop_installations AS installation
    JOIN lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
      ON binding.tenant_id=installation.tenant_id
     AND binding.installation_id=installation.installation_id
    JOIN lawos_email_dms.outlook_desktop_activation_authorizations AS activation
      ON activation.tenant_id=binding.tenant_id
     AND activation.activation_authorization_id=binding.activation_authorization_id
     AND activation.consumed_installation_id=installation.installation_id
     AND activation.authorization_binding_sha256 IS NOT NULL
    JOIN lawos_email_dms.outlook_desktop_release_artifacts AS artifact
      ON artifact.tenant_id=binding.tenant_id
     AND artifact.release_artifact_id=binding.release_artifact_id
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
      ON audit.tenant_id=artifact.tenant_id
     AND audit.event_id=binding.approval_audit_event_id
     AND audit.event_type='approved'
     AND audit.event_binding_sha256=binding.approval_audit_event_binding_sha256
   WHERE installation.tenant_id=bound_tenant_id
     AND installation.user_id=bound_user_id
     AND installation.entra_subject_id=bound_entra_subject_id
     AND installation.retired_at IS NULL
     AND installation.lease_expires_at>bound_now
     AND artifact.revoked_at IS NULL
     AND artifact.valid_from<=bound_now AND artifact.valid_until>bound_now
     AND binding.release_valid_until=artifact.valid_until
     AND binding.release_ticket_sha256=artifact.embedded_release_ticket_sha256
     AND binding.release_ticket_signature_sha256=
         artifact.embedded_release_ticket_signature_sha256
     AND activation.approval_audit_event_id=audit.event_id
     AND activation.approval_audit_event_binding_sha256=audit.event_binding_sha256
     AND activation.release_authority_sha256=
       lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
         bound_tenant_id,artifact.release_artifact_id);
  trust_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-trusted-install-aggregate.v1',bound_tenant_id,
    bound_user_id,bound_entra_subject_id,active_count::text,trust_facts
  ]);
  desired := policy_current AND active_count>0;
  reasons := to_jsonb(array_remove(ARRAY[
    CASE WHEN policy_revision=0 THEN 'policy_absent' END,
    CASE WHEN policy_revision>0 AND NOT policy_current THEN 'policy_not_current' END,
    CASE WHEN active_count=0 THEN 'trusted_install_absent' END
  ]::text[],NULL));
  aggregate_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-assignment-aggregate.v1',bound_tenant_id,
    bound_user_id,bound_entra_subject_id,policy_revision::text,policy_binding,
    COALESCE(policy_stage,'none'),active_count::text,trust_revision::text,
    trust_binding,desired::text,reasons::text
  ]);
  IF previous.tenant_id IS NOT NULL AND previous.aggregate_sha256=aggregate_sha THEN
    UPDATE lawos_email_dms.outlook_desktop_assignment_states
       SET evaluated_at=bound_now
     WHERE tenant_id=bound_tenant_id AND user_id=bound_user_id;
    RETURN jsonb_build_object(
      'changed',false,'state',to_jsonb(previous),'outbox',NULL
    );
  END IF;
  state_revision := COALESCE(previous.state_revision,0)+1;
  previous_desired := COALESCE(previous.desired_assigned,false);
  provider_changed := desired<>previous_desired;
  provider_generation := COALESCE(previous.provider_generation,0)
    + CASE WHEN provider_changed THEN 1 ELSE 0 END;
  provider_intent := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-assignment.provider-intent.v1',bound_tenant_id,
    bound_user_id,bound_entra_subject_id,provider_generation::text,desired::text
  ]);
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_states(
    tenant_id,user_id,entra_subject_id,rollout_stage,policy_revision,
    policy_binding_sha256,active_trusted_install_count,trust_authority,
    trust_authority_revision,trust_authority_binding_sha256,desired_assigned,
    denial_reasons,aggregate_sha256,state_revision,provider_generation,
    provider_intent_sha256,evaluated_at
  ) VALUES (
    bound_tenant_id,bound_user_id,bound_entra_subject_id,policy_stage,
    policy_revision,policy_binding,active_count,'postgres-db-clock.v1',
    trust_revision,trust_binding,desired,reasons,aggregate_sha,state_revision,
    provider_generation,provider_intent,bound_now
  ) ON CONFLICT (tenant_id,user_id) DO UPDATE SET
    entra_subject_id=EXCLUDED.entra_subject_id,rollout_stage=EXCLUDED.rollout_stage,
    policy_revision=EXCLUDED.policy_revision,
    policy_binding_sha256=EXCLUDED.policy_binding_sha256,
    active_trusted_install_count=EXCLUDED.active_trusted_install_count,
    trust_authority=EXCLUDED.trust_authority,
    trust_authority_revision=EXCLUDED.trust_authority_revision,
    trust_authority_binding_sha256=EXCLUDED.trust_authority_binding_sha256,
    desired_assigned=EXCLUDED.desired_assigned,
    denial_reasons=EXCLUDED.denial_reasons,
    aggregate_sha256=EXCLUDED.aggregate_sha256,
    state_revision=EXCLUDED.state_revision,
    provider_generation=EXCLUDED.provider_generation,
    provider_intent_sha256=EXCLUDED.provider_intent_sha256,
    evaluated_at=EXCLUDED.evaluated_at
  RETURNING * INTO projected;
  event_id := 'assignment_event_'||lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-assignment.audit.v1',bound_tenant_id,bound_user_id,
    state_revision::text,aggregate_sha,bound_reason
  ]);
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
    tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
    provider_generation,provider_intent_sha256,details,occurred_at
  ) VALUES (
    bound_tenant_id,event_id,bound_user_id,bound_entra_subject_id,
    CASE WHEN provider_changed THEN 'desired_changed' ELSE 'aggregate_changed' END,
    state_revision,provider_generation,provider_intent,
    jsonb_build_object('reason',bound_reason,'aggregate_sha256',aggregate_sha),
    bound_now
  );
  IF provider_changed THEN
    action := CASE WHEN desired THEN 'add' ELSE 'remove' END;
    operation_id := 'outlook_assignment_'||
      lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
        'lawos.outlook-assignment.operation.v1',bound_tenant_id,bound_user_id,
        bound_entra_subject_id,provider_generation::text,desired::text,
        provider_intent
      ]);
    INSERT INTO lawos_email_dms.outlook_desktop_assignment_outbox(
      tenant_id,outbox_id,operation_id,user_id,entra_subject_id,
      provider_generation,desired_assigned,action,provider_intent_sha256,
      payload,status,remote_commit_state,available_at,attempt_count,
      causal_event_id,created_at,updated_at
    ) VALUES (
      bound_tenant_id,operation_id,operation_id,bound_user_id,
      bound_entra_subject_id,provider_generation,desired,action,provider_intent,
      jsonb_build_object(
        'schema_version','lawos.outlook-desktop-assignment.v1',
        'operation_id',operation_id,'tenant_id',bound_tenant_id,
        'user_id',bound_user_id,'entra_subject_id',bound_entra_subject_id,
        'provider_generation',provider_generation,'desired_assigned',desired,
        'action',action,'provider_intent_sha256',provider_intent
      ),'pending','not_sent',bound_now,0,event_id,bound_now,bound_now
    ) RETURNING to_jsonb(outlook_desktop_assignment_outbox.*) INTO outbox_row;
  END IF;
  RETURN jsonb_build_object(
    'changed',true,'state',to_jsonb(projected),'outbox',outbox_row
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.sweep_outlook_desktop_assignments(
  bound_tenant_id text,
  bound_limit integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE candidate record;
DECLARE candidate_set jsonb := '[]'::jsonb;
DECLARE now_at timestamptz;
DECLARE results jsonb := '[]'::jsonb;
BEGIN
  IF session_user<>'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'outlook desktop assignment worker required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_limit NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'outlook desktop assignment sweep limit invalid';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'user_id',selected.user_id,'entra_subject_id',selected.entra_subject_id
    ) ORDER BY selected.evaluated_at NULLS FIRST,
      selected.user_id,selected.entra_subject_id),'[]'::jsonb)
    INTO candidate_set
    FROM (
      SELECT candidates.user_id,candidates.entra_subject_id,state.evaluated_at
        FROM (
          SELECT user_id,entra_subject_id
            FROM lawos_email_dms.outlook_desktop_assignment_policies
           WHERE tenant_id=bound_tenant_id
          UNION
          SELECT user_id,entra_subject_id
            FROM lawos_email_dms.outlook_desktop_assignment_states
           WHERE tenant_id=bound_tenant_id
          UNION
          SELECT user_id,entra_subject_id
            FROM lawos_email_dms.outlook_desktop_installations
           WHERE tenant_id=bound_tenant_id
        ) AS candidates
        LEFT JOIN lawos_email_dms.outlook_desktop_assignment_states AS state
          ON state.tenant_id=bound_tenant_id
         AND state.user_id=candidates.user_id
         AND state.entra_subject_id=candidates.entra_subject_id
       ORDER BY state.evaluated_at NULLS FIRST,
                candidates.user_id,candidates.entra_subject_id
       LIMIT bound_limit
    ) AS selected;
  FOR candidate IN
    SELECT value->>'user_id' AS user_id,
           value->>'entra_subject_id' AS entra_subject_id
      FROM jsonb_array_elements(candidate_set) AS item(value)
     ORDER BY value->>'user_id',value->>'entra_subject_id'
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(
      bound_tenant_id||chr(31)||candidate.user_id||chr(31)||
      candidate.entra_subject_id,0));
  END LOOP;
  now_at := date_trunc('milliseconds',clock_timestamp());
  FOR candidate IN
    SELECT value->>'user_id' AS user_id,
           value->>'entra_subject_id' AS entra_subject_id
      FROM jsonb_array_elements(candidate_set) WITH ORDINALITY AS item(value,ordinality)
     ORDER BY ordinality
  LOOP
    results := results||jsonb_build_array(
      lawos_email_dms.project_outlook_desktop_assignment_at(
        bound_tenant_id,candidate.user_id,candidate.entra_subject_id,
        'maintenance',now_at
      )
    );
  END LOOP;
  RETURN results;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.outlook_desktop_binding_sha256(
  bound_values text[]
) RETURNS text LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
  SELECT encode(pg_catalog.sha256(convert_to(string_agg(
    octet_length(value)::text || ':' || value, '' ORDER BY position
  ), 'UTF8')), 'hex')
  FROM unnest(bound_values) WITH ORDINALITY AS binding(value, position)
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.outlook_desktop_canonical_json_text(
  value jsonb
) RETURNS text LANGUAGE plpgsql IMMUTABLE STRICT
SET search_path=pg_catalog,lawos_email_dms
AS $$
DECLARE canonical_text text;
BEGIN
  CASE jsonb_typeof(value)
    WHEN 'object' THEN
      SELECT '{'||coalesce(string_agg(
        to_json(member.key)::text||':'||
          lawos_email_dms.outlook_desktop_canonical_json_text(member.value),
        ',' ORDER BY member.key COLLATE "C"), '')||'}'
        INTO canonical_text
        FROM jsonb_each(value) AS member;
    WHEN 'array' THEN
      SELECT '['||coalesce(string_agg(
        lawos_email_dms.outlook_desktop_canonical_json_text(member.value),
        ',' ORDER BY member.ordinality), '')||']'
        INTO canonical_text
        FROM jsonb_array_elements(value) WITH ORDINALITY AS member(value,ordinality);
    ELSE
      canonical_text := value::text;
  END CASE;
  RETURN canonical_text;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.outlook_desktop_assert_tenant(
  bound_tenant_id text
) RETURNS void
LANGUAGE plpgsql STABLE
SET search_path=pg_catalog,lawos_security
AS $$
BEGIN
  IF bound_tenant_id IS NULL
     OR bound_tenant_id IS DISTINCT FROM lawos_security.current_tenant_id() THEN
    RAISE EXCEPTION 'outlook desktop tenant authority mismatch' USING ERRCODE='42501';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.outlook_desktop_exact_millisecond_utc(
  value text
) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT SET search_path=pg_catalog AS $$
  SELECT value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
     AND to_char(value::timestamptz AT TIME ZONE 'UTC',
                 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')=value
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
  bound_tenant_id text,
  bound_release_artifact_id text
) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE artifact lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
DECLARE approval lawos_email_dms.outlook_desktop_release_trust_audit_events%ROWTYPE;
BEGIN
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  SELECT * INTO artifact
    FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=bound_release_artifact_id;
  SELECT * INTO approval
    FROM lawos_email_dms.outlook_desktop_release_trust_audit_events
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=bound_release_artifact_id
     AND event_type='approved';
  IF artifact.tenant_id IS NULL OR approval.tenant_id IS NULL THEN
    RAISE EXCEPTION 'outlook desktop release authority is incomplete';
  END IF;
  RETURN lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-release-artifact-authority.v2',
    artifact.tenant_id,artifact.release_artifact_id,artifact.release_ticket_id,
    artifact.release_ticket_key_id,artifact.platform,artifact.channel,
    artifact.app_version,artifact.app_id,artifact.arch,artifact.source_sha,
    artifact.source_tree,artifact.embedded_build_manifest_sha256,
    artifact.embedded_inner_artifact_sha256,
    artifact.embedded_inner_artifact_bytes::text,
    artifact.embedded_release_ticket_sha256,
    artifact.embedded_release_ticket_signature_sha256,
    artifact.final_artifact_sha256,artifact.final_artifact_bytes::text,
    artifact.approval_sha256,artifact.trust_registry_sha256,
    artifact.trust_registry_serial::text,artifact.signature_algorithm,
    CASE WHEN artifact.macos_team_id IS NULL THEN '0:'
         ELSE '1:'||artifact.macos_team_id END,
    CASE WHEN artifact.macos_certificate_sha256 IS NULL THEN '0:'
         ELSE '1:'||artifact.macos_certificate_sha256 END,
    CASE WHEN artifact.macos_certificate_valid_from IS NULL THEN '0:'
         ELSE '1:'||((extract(epoch FROM artifact.macos_certificate_valid_from)
                      *1000000)::bigint)::text END,
    CASE WHEN artifact.macos_certificate_valid_until IS NULL THEN '0:'
         ELSE '1:'||((extract(epoch FROM artifact.macos_certificate_valid_until)
                      *1000000)::bigint)::text END,
    CASE WHEN artifact.macos_signature_valid IS NULL THEN '0:'
         ELSE '1:'||artifact.macos_signature_valid::text END,
    CASE WHEN artifact.macos_notarized IS NULL THEN '0:'
         ELSE '1:'||artifact.macos_notarized::text END,
    CASE WHEN artifact.macos_stapled IS NULL THEN '0:'
         ELSE '1:'||artifact.macos_stapled::text END,
    artifact.macos_gatekeeper_status,
    CASE WHEN artifact.macos_technical_evidence_sha256 IS NULL THEN '0:'
         ELSE '1:'||artifact.macos_technical_evidence_sha256 END,
    CASE WHEN artifact.macos_evidence_observed_at IS NULL THEN '0:'
         ELSE '1:'||((extract(epoch FROM artifact.macos_evidence_observed_at)
                      *1000000)::bigint)::text END,
    CASE WHEN artifact.macos_evidence_expires_at IS NULL THEN '0:'
         ELSE '1:'||((extract(epoch FROM artifact.macos_evidence_expires_at)
                      *1000000)::bigint)::text END,
    artifact.windows_authenticode_status,
    ((extract(epoch FROM artifact.ticket_issued_at)*1000000)::bigint)::text,
    ((extract(epoch FROM artifact.ticket_expires_at)*1000000)::bigint)::text,
    ((extract(epoch FROM artifact.approved_at)*1000000)::bigint)::text,
    ((extract(epoch FROM artifact.valid_from)*1000000)::bigint)::text,
    ((extract(epoch FROM artifact.valid_until)*1000000)::bigint)::text,
    approval.tenant_id,approval.event_id,approval.release_artifact_id,
    approval.event_type,approval.release_ticket_sha256,
    approval.final_artifact_sha256,approval.approval_sha256,
    approval.event_binding_sha256,
    ((extract(epoch FROM approval.occurred_at)*1000000)::bigint)::text
  ]);
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.outlook_desktop_release_revocation_authority_sha256(
  bound_tenant_id text,
  bound_release_artifact_id text
) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE artifact lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
DECLARE revocation lawos_email_dms.outlook_desktop_release_trust_audit_events%ROWTYPE;
DECLARE artifact_authority text;
BEGIN
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  artifact_authority :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,bound_release_artifact_id);
  SELECT * INTO artifact
    FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=bound_release_artifact_id;
  SELECT * INTO revocation
    FROM lawos_email_dms.outlook_desktop_release_trust_audit_events
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=bound_release_artifact_id
     AND event_type='revoked';
  IF artifact.revoked_at IS NULL OR artifact.revocation_reason IS NULL
     OR revocation.tenant_id IS NULL THEN
    RAISE EXCEPTION 'outlook desktop release revocation authority is incomplete';
  END IF;
  RETURN lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-release-revocation-authority.v1',
    artifact_authority,
    ((extract(epoch FROM artifact.revoked_at)*1000000)::bigint)::text,
    artifact.revocation_reason,revocation.tenant_id,revocation.event_id,
    revocation.release_artifact_id,revocation.event_type,
    revocation.release_ticket_sha256,revocation.final_artifact_sha256,
    revocation.approval_sha256,revocation.event_binding_sha256,
    ((extract(epoch FROM revocation.occurred_at)*1000000)::bigint)::text
  ]);
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.consume_outlook_desktop_activation_authorization_at(
  bound_tenant_id text,
  bound_consumption jsonb,
  bound_now timestamptz
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE activation_row record;
DECLARE installation record;
DECLARE release record;
DECLARE binding record;
DECLARE reservation record;
DECLARE lifecycle_authorization record;
DECLARE now_at timestamptz := bound_now;
DECLARE binding_sha text;
DECLARE expected_authority_sha text;
DECLARE required_keys constant text[] := ARRAY[
  'activation_authorization_id','installation_id','user_id','entra_subject_id',
  'device_key_fingerprint','device_public_key_spki_sha256',
  'device_proof_request_sha256','server_nonce_sha256',
  'device_signature_sha256','lifecycle_authorization_id'
];
BEGIN
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF now_at<>date_trunc('milliseconds',now_at) THEN
    RAISE EXCEPTION 'outlook desktop activation consumption time invalid';
  END IF;
  IF jsonb_typeof(bound_consumption)<>'object'
     OR NOT bound_consumption ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_consumption) AS key
                 WHERE key<>ALL(required_keys)) THEN
    RAISE EXCEPTION 'outlook desktop activation consumption shape invalid';
  END IF;
  SELECT * INTO activation_row
    FROM lawos_email_dms.outlook_desktop_activation_authorizations
   WHERE tenant_id=bound_tenant_id
     AND activation_authorization_id=bound_consumption->>'activation_authorization_id'
   FOR UPDATE;
  IF NOT FOUND OR ROW(
       activation_row.user_id,activation_row.entra_subject_id,
       activation_row.device_key_fingerprint,
       activation_row.device_public_key_spki_sha256,
       activation_row.device_proof_request_sha256,
       activation_row.server_nonce_sha256,activation_row.device_signature_sha256
     ) IS DISTINCT FROM ROW(
       bound_consumption->>'user_id',bound_consumption->>'entra_subject_id',
       bound_consumption->>'device_key_fingerprint',
       bound_consumption->>'device_public_key_spki_sha256',
       bound_consumption->>'device_proof_request_sha256',
       bound_consumption->>'server_nonce_sha256',
       bound_consumption->>'device_signature_sha256'
     ) THEN
    RAISE EXCEPTION 'outlook desktop activation consumption mismatch';
  END IF;
  IF activation_row.consumed_at IS NOT NULL THEN
    IF activation_row.consumed_installation_id<>
       bound_consumption->>'installation_id' THEN
      RAISE EXCEPTION 'outlook desktop activation authorization already consumed';
    END IF;
    SELECT * INTO binding
      FROM lawos_email_dms.outlook_desktop_installation_release_bindings
     WHERE tenant_id=bound_tenant_id
       AND installation_id=activation_row.consumed_installation_id;
    IF NOT FOUND OR binding.activation_authorization_id<>
       activation_row.activation_authorization_id THEN
      RAISE EXCEPTION 'outlook desktop activation replay binding missing';
    END IF;
    SELECT * INTO reservation
      FROM lawos_email_dms.outlook_desktop_activation_challenges
     WHERE tenant_id=bound_tenant_id
       AND activation_reference=activation_row.activation_authorization_id;
    IF reservation.state<>'consumed'
       OR reservation.lifecycle_registration_consumption->>
          'lifecycle_authorization_id'<>
          bound_consumption->>'lifecycle_authorization_id' THEN
      RAISE EXCEPTION 'outlook desktop activation replay consumption missing';
    END IF;
    RETURN jsonb_build_object(
      'outcome','replayed','trusted',true,
      'release_artifact_id',binding.release_artifact_id,
      'installation_release_binding_sha256',binding.installation_release_binding_sha256
    );
  END IF;
  IF activation_row.valid_from>now_at OR activation_row.valid_until<=now_at THEN
    RAISE EXCEPTION 'outlook desktop activation authorization expired';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    activation_row.release_artifact_id,0));
  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id
     AND installation_id=bound_consumption->>'installation_id'
   FOR UPDATE;
  IF NOT FOUND OR ROW(installation.user_id,installation.entra_subject_id,
       installation.device_key_fingerprint)
     IS DISTINCT FROM ROW(bound_consumption->>'user_id',
       bound_consumption->>'entra_subject_id',
       bound_consumption->>'device_key_fingerprint') THEN
    RAISE EXCEPTION 'outlook desktop activation installation mismatch';
  END IF;
  SELECT artifact.*,
         audit.event_id AS approval_audit_event_id,
         audit.event_binding_sha256 AS approval_audit_event_binding_sha256
    INTO release
    FROM lawos_email_dms.outlook_desktop_release_artifacts AS artifact
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
      ON audit.tenant_id=artifact.tenant_id
     AND audit.release_artifact_id=artifact.release_artifact_id
     AND audit.event_type='approved'
   WHERE artifact.tenant_id=bound_tenant_id
     AND artifact.release_artifact_id=activation_row.release_artifact_id
     AND artifact.revoked_at IS NULL
     AND artifact.valid_from<=now_at AND artifact.valid_until>now_at
     AND artifact.platform=installation.platform
     AND artifact.app_version=installation.app_version
     AND artifact.source_sha=installation.source_sha
     AND artifact.embedded_release_ticket_sha256=
         activation_row.release_ticket_bytes_sha256
     AND artifact.embedded_release_ticket_signature_sha256=
         activation_row.release_ticket_owner_signature_sha256
   FOR UPDATE OF artifact;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop activation release is not current';
  END IF;
  expected_authority_sha :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,release.release_artifact_id);
  IF activation_row.approval_audit_event_id<>release.approval_audit_event_id
     OR activation_row.approval_audit_event_binding_sha256<>
        release.approval_audit_event_binding_sha256
     OR activation_row.release_authority_sha256<>expected_authority_sha THEN
    RAISE EXCEPTION 'outlook desktop activation release authority binding mismatch';
  END IF;
  binding_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-installation-release-binding.v2',bound_tenant_id,
    installation.installation_id,installation.user_id,
    installation.entra_subject_id,installation.device_key_fingerprint,
    activation_row.activation_authorization_id,
    activation_row.authorization_binding_sha256,
    activation_row.device_public_key_spki_sha256,release.release_artifact_id,
    release.embedded_release_ticket_sha256,
    release.embedded_release_ticket_signature_sha256,
    release.embedded_inner_artifact_sha256,
    release.final_artifact_sha256,release.approval_sha256,
    release.approval_audit_event_binding_sha256,
    ((extract(epoch FROM now_at)*1000)::bigint)::text
  ]);
  INSERT INTO lawos_email_dms.outlook_desktop_installation_release_bindings(
    tenant_id,installation_id,activation_authorization_id,release_artifact_id,
    release_ticket_id,release_ticket_sha256,release_ticket_signature_sha256,
    platform,channel,app_version,app_id,arch,source_sha,source_tree,
    embedded_build_manifest_sha256,measured_inner_artifact_sha256,
    measured_inner_artifact_bytes,registered_final_artifact_sha256,
    registered_final_artifact_bytes,approval_sha256,approval_audit_event_id,
    approval_audit_event_binding_sha256,macos_technical_evidence_sha256,
    trust_registry_sha256,trust_registry_serial,release_valid_until,
    device_proof_request_sha256,device_public_key_spki_sha256,
    server_nonce_sha256,device_signature_sha256,
    activation_receipt_sha256,local_measurement_evidence_sha256,
    installation_release_binding_sha256,authenticated_at
  ) VALUES (
    bound_tenant_id,installation.installation_id,
    activation_row.activation_authorization_id,release.release_artifact_id,
    release.release_ticket_id,release.embedded_release_ticket_sha256,
    release.embedded_release_ticket_signature_sha256,release.platform,
    release.channel,release.app_version,release.app_id,release.arch,
    release.source_sha,release.source_tree,release.embedded_build_manifest_sha256,
    release.embedded_inner_artifact_sha256,release.embedded_inner_artifact_bytes,
    release.final_artifact_sha256,release.final_artifact_bytes,
    release.approval_sha256,release.approval_audit_event_id,
    release.approval_audit_event_binding_sha256,
    release.macos_technical_evidence_sha256,release.trust_registry_sha256,
    release.trust_registry_serial,release.valid_until,
    activation_row.device_proof_request_sha256,
    activation_row.device_public_key_spki_sha256,
    activation_row.server_nonce_sha256,
    activation_row.device_signature_sha256,activation_row.activation_receipt_sha256,
    activation_row.local_measurement_evidence_sha256,binding_sha,now_at
  ) RETURNING * INTO binding;
  UPDATE lawos_email_dms.outlook_desktop_activation_authorizations
     SET consumed_at=now_at,consumed_installation_id=installation.installation_id
   WHERE tenant_id=bound_tenant_id
     AND activation_authorization_id=activation_row.activation_authorization_id;
  SELECT * INTO lifecycle_authorization
    FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         bound_consumption->>'lifecycle_authorization_id';
  IF lifecycle_authorization.consumed_at<>now_at
     OR lifecycle_authorization.resulting_state_version<>
        installation.state_version
     OR lifecycle_authorization.activation_authorization_id<>
        activation_row.activation_authorization_id THEN
    RAISE EXCEPTION 'outlook desktop activation lifecycle consumption mismatch';
  END IF;
  UPDATE lawos_email_dms.outlook_desktop_activation_challenges
     SET state='consumed',consumed_at=now_at,
         lifecycle_registration_consumption=jsonb_build_object(
           'activation_reference',activation_row.activation_authorization_id,
           'installation_id',installation.installation_id,
           'lifecycle_authorization_id',
             lifecycle_authorization.lifecycle_authorization_id,
           'resulting_state_version',installation.state_version,
           'consumed_at',to_char(now_at AT TIME ZONE 'UTC',
             'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
         )
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=activation_row.activation_authorization_id
     AND state='authorized';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop activation consumption snapshot stale'
      USING ERRCODE='40001';
  END IF;
  RETURN jsonb_build_object(
    'outcome','consumed','trusted',true,
    'release_artifact_id',binding.release_artifact_id,
    'installation_release_binding_sha256',binding.installation_release_binding_sha256
  );
END
$$;

ALTER TABLE lawos_email_dms.outlook_desktop_release_artifacts
  ADD CONSTRAINT outlook_desktop_release_approved_at_milliseconds
  CHECK (approved_at=date_trunc('milliseconds', approved_at));

CREATE OR REPLACE FUNCTION lawos_email_dms.reject_outlook_desktop_immutable_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE'
     AND TG_TABLE_NAME IN (
       'outlook_desktop_release_import_receipts',
       'outlook_desktop_release_revocation_receipts'
     )
     AND to_jsonb(OLD)->'response_text'='null'::jsonb
     AND to_jsonb(NEW)->'response_text'<>'null'::jsonb
     AND (to_jsonb(NEW)-'response_text') IS NOT DISTINCT FROM
         (to_jsonb(OLD)-'response_text') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'outlook desktop lifecycle receipt rows are immutable';
END
$$;

CREATE TABLE lawos_email_dms.outlook_desktop_release_import_receipts (
  tenant_id text NOT NULL,
  request_id text NOT NULL CHECK (char_length(request_id) BETWEEN 1 AND 200),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text CHECK (response_text IS NULL OR response_text<>''),
  created_at timestamptz NOT NULL CHECK (created_at=date_trunc('milliseconds',created_at)),
  PRIMARY KEY (tenant_id, request_id)
);

CREATE TABLE lawos_email_dms.outlook_desktop_release_revocation_receipts (
  tenant_id text NOT NULL,
  request_id text NOT NULL CHECK (char_length(request_id) BETWEEN 1 AND 200),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text CHECK (response_text IS NULL OR response_text<>''),
  created_at timestamptz NOT NULL CHECK (created_at=date_trunc('milliseconds',created_at)),
  PRIMARY KEY (tenant_id, request_id)
);

CREATE TRIGGER outlook_desktop_release_import_receipt_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_release_import_receipts
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();
CREATE TRIGGER outlook_desktop_release_revocation_receipt_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_release_revocation_receipts
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE TABLE lawos_email_dms.outlook_desktop_activation_issue_authorities (
  tenant_id text NOT NULL,
  release_artifact_id text NOT NULL,
  request_id text NOT NULL CHECK (char_length(request_id) BETWEEN 1 AND 200),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  pilot_policy jsonb NOT NULL CHECK (jsonb_typeof(pilot_policy)='object'),
  macos_code_directory_sha256 text NOT NULL
    CHECK (macos_code_directory_sha256 ~ '^[a-f0-9]{64}$'),
  macos_designated_requirement_sha256 text NOT NULL
    CHECK (macos_designated_requirement_sha256 ~ '^[a-f0-9]{64}$'),
  release_ticket_base64 text NOT NULL
    CHECK (char_length(release_ticket_base64) BETWEEN 4 AND 87384),
  release_ticket_signature_base64 text NOT NULL
    CHECK (char_length(release_ticket_signature_base64)=88),
  release_ticket_bytes_sha256 text NOT NULL
    CHECK (release_ticket_bytes_sha256 ~ '^[a-f0-9]{64}$'),
  release_ticket_owner_signature_sha256 text NOT NULL
    CHECK (release_ticket_owner_signature_sha256 ~ '^[a-f0-9]{64}$'),
  approval_audit_event_id text NOT NULL,
  approval_audit_event_binding_sha256 text NOT NULL
    CHECK (approval_audit_event_binding_sha256 ~ '^[a-f0-9]{64}$'),
  policy_binding_sha256 text NOT NULL
    CHECK (policy_binding_sha256 ~ '^[a-f0-9]{64}$'),
  release_authority_sha256 text NOT NULL
    CHECK (release_authority_sha256 ~ '^[a-f0-9]{64}$'),
  authority_binding_sha256 text NOT NULL
    CHECK (authority_binding_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text NOT NULL CHECK (response_text::jsonb IS NOT NULL),
  published_at timestamptz NOT NULL
    CHECK (published_at=date_trunc('milliseconds',published_at)),
  valid_until timestamptz NOT NULL
    CHECK (valid_until=date_trunc('milliseconds',valid_until)),
  PRIMARY KEY (tenant_id,release_artifact_id),
  UNIQUE (tenant_id,request_id),
  FOREIGN KEY (tenant_id,release_artifact_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_artifacts
      (tenant_id,release_artifact_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id,approval_audit_event_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_trust_audit_events
      (tenant_id,event_id) ON DELETE RESTRICT,
  CHECK (valid_until>published_at)
);

CREATE TRIGGER outlook_desktop_activation_issue_authority_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_activation_issue_authorities
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE TABLE lawos_email_dms.outlook_desktop_activation_challenges (
  tenant_id text NOT NULL,
  activation_reference text NOT NULL
    CHECK (activation_reference ~ '^oda_[A-Za-z0-9_-]{24}$'),
  installation_id text NOT NULL
    CHECK (installation_id ~ '^odi_[A-Za-z0-9_-]{20,128}$'),
  issue_request_id text NOT NULL
    CHECK (issue_request_id ~ '^oar_[A-Za-z0-9_-]{20,128}$'),
  registration_event_id text NOT NULL
    CHECK (registration_event_id ~ '^oae_[a-f0-9]{32}$'),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  device_key_fingerprint text NOT NULL CHECK (device_key_fingerprint ~ '^[a-f0-9]{64}$'),
  device_public_key_spki_sha256 text NOT NULL
    CHECK (device_public_key_spki_sha256 ~ '^[a-f0-9]{64}$'),
  release_artifact_id text NOT NULL,
  approval_audit_event_id text NOT NULL,
  approval_audit_event_binding_sha256 text NOT NULL
    CHECK (approval_audit_event_binding_sha256 ~ '^[a-f0-9]{64}$'),
  release_authority_sha256 text NOT NULL CHECK (release_authority_sha256 ~ '^[a-f0-9]{64}$'),
  release_ticket_base64 text NOT NULL
    CHECK (char_length(release_ticket_base64) BETWEEN 4 AND 87384),
  release_ticket_signature_base64 text NOT NULL
    CHECK (char_length(release_ticket_signature_base64)=88),
  release_ticket_bytes_sha256 text NOT NULL
    CHECK (release_ticket_bytes_sha256 ~ '^[a-f0-9]{64}$'),
  release_ticket_owner_signature_sha256 text NOT NULL
    CHECK (release_ticket_owner_signature_sha256 ~ '^[a-f0-9]{64}$'),
  challenge_nonce_base64url text NOT NULL
    CHECK (challenge_nonce_base64url ~ '^[A-Za-z0-9_-]{43}$'),
  challenge_nonce_sha256 text NOT NULL CHECK (challenge_nonce_sha256 ~ '^[a-f0-9]{64}$'),
  issued_challenge jsonb NOT NULL CHECK (jsonb_typeof(issued_challenge)='object'),
  issued_challenge_base64 text NOT NULL
    CHECK (char_length(issued_challenge_base64) BETWEEN 4 AND 87384),
  issued_challenge_sha256 text NOT NULL CHECK (issued_challenge_sha256 ~ '^[a-f0-9]{64}$'),
  issue_request_sha256 text NOT NULL CHECK (issue_request_sha256 ~ '^[a-f0-9]{64}$'),
  issue_response_text text NOT NULL CHECK (issue_response_text::jsonb IS NOT NULL),
  issue_public_response_base64 text NOT NULL
    CHECK (char_length(issue_public_response_base64) BETWEEN 4 AND 174764),
  attachment_request_id text CHECK (
    attachment_request_id IS NULL OR char_length(attachment_request_id) BETWEEN 1 AND 200),
  attachment_request_sha256 text CHECK (
    attachment_request_sha256 IS NULL OR attachment_request_sha256 ~ '^[a-f0-9]{64}$'),
  attachment_response_text text CHECK (
    attachment_response_text IS NULL OR attachment_response_text::jsonb IS NOT NULL),
  operator_receipt_base64 text CHECK (
    operator_receipt_base64 IS NULL OR char_length(operator_receipt_base64) BETWEEN 4 AND 87384),
  operator_receipt_sha256 text CHECK (
    operator_receipt_sha256 IS NULL OR operator_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  operator_signature_base64 text CHECK (
    operator_signature_base64 IS NULL OR char_length(operator_signature_base64)=88),
  operator_signature_sha256 text CHECK (
    operator_signature_sha256 IS NULL OR operator_signature_sha256 ~ '^[a-f0-9]{64}$'),
  local_measurement_evidence_sha256 text NOT NULL
    CHECK (local_measurement_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  device_command_sha256 text CHECK (
    device_command_sha256 IS NULL OR device_command_sha256 ~ '^[a-f0-9]{64}$'),
  device_proof_transcript_sha256 text CHECK (
    device_proof_transcript_sha256 IS NULL
    OR device_proof_transcript_sha256 ~ '^[a-f0-9]{64}$'),
  device_signature_sha256 text CHECK (
    device_signature_sha256 IS NULL OR device_signature_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_binding_sha256 text CHECK (
    evidence_binding_sha256 IS NULL OR evidence_binding_sha256 ~ '^[a-f0-9]{64}$'),
  authorization_request_sha256 text CHECK (
    authorization_request_sha256 IS NULL
    OR authorization_request_sha256 ~ '^[a-f0-9]{64}$'),
  authorization_binding_sha256 text CHECK (
    authorization_binding_sha256 IS NULL
    OR authorization_binding_sha256 ~ '^[a-f0-9]{64}$'),
  activation_authorization_receipt_sha256 text CHECK (
    activation_authorization_receipt_sha256 IS NULL
    OR activation_authorization_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  proof_id text CHECK (proof_id IS NULL OR char_length(proof_id) BETWEEN 1 AND 200),
  request_id text CHECK (request_id IS NULL OR char_length(request_id) BETWEEN 1 AND 200),
  event_id text CHECK (event_id IS NULL OR char_length(event_id) BETWEEN 1 AND 200),
  idempotency_key text CHECK (
    idempotency_key IS NULL OR char_length(idempotency_key) BETWEEN 1 AND 200),
  request_fingerprint text CHECK (
    request_fingerprint IS NULL OR request_fingerprint ~ '^[a-f0-9]{64}$'),
  activation_replay_identity jsonb CHECK (
    activation_replay_identity IS NULL
    OR jsonb_typeof(activation_replay_identity)='object'),
  proof_issued_at timestamptz CHECK (
    proof_issued_at IS NULL OR proof_issued_at=date_trunc('milliseconds',proof_issued_at)),
  proof_expires_at timestamptz CHECK (
    proof_expires_at IS NULL OR proof_expires_at=date_trunc('milliseconds',proof_expires_at)),
  authorization_response_text text CHECK (
    authorization_response_text IS NULL OR authorization_response_text::jsonb IS NOT NULL),
  lifecycle_registration_consumption jsonb CHECK (
    lifecycle_registration_consumption IS NULL
    OR jsonb_typeof(lifecycle_registration_consumption)='object'),
  state text NOT NULL CHECK (state IN ('issued','evidence_attached','authorized','consumed')),
  issued_at timestamptz NOT NULL CHECK (issued_at=date_trunc('milliseconds',issued_at)),
  valid_until timestamptz NOT NULL CHECK (valid_until=date_trunc('milliseconds',valid_until)),
  attached_at timestamptz CHECK (attached_at=date_trunc('milliseconds',attached_at)),
  authorized_at timestamptz CHECK (authorized_at=date_trunc('milliseconds',authorized_at)),
  consumed_at timestamptz CHECK (consumed_at=date_trunc('milliseconds',consumed_at)),
  PRIMARY KEY (tenant_id,activation_reference),
  UNIQUE (tenant_id,installation_id),
  UNIQUE (tenant_id,issue_request_id),
  UNIQUE (tenant_id,registration_event_id),
  UNIQUE (tenant_id,challenge_nonce_sha256),
  FOREIGN KEY (tenant_id,release_artifact_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_artifacts
      (tenant_id,release_artifact_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id,release_artifact_id)
    REFERENCES lawos_email_dms.outlook_desktop_activation_issue_authorities
      (tenant_id,release_artifact_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id,approval_audit_event_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_trust_audit_events
      (tenant_id,event_id) ON DELETE RESTRICT,
  CHECK (device_public_key_spki_sha256=device_key_fingerprint),
  CHECK (valid_until>issued_at),
  CHECK ((state='issued' AND attached_at IS NULL AND authorized_at IS NULL
          AND consumed_at IS NULL AND activation_replay_identity IS NULL
          AND lifecycle_registration_consumption IS NULL)
      OR (state='evidence_attached' AND attached_at IS NOT NULL
          AND authorized_at IS NULL AND consumed_at IS NULL
          AND activation_replay_identity IS NOT NULL
          AND lifecycle_registration_consumption IS NULL)
      OR (state='authorized' AND attached_at IS NOT NULL
          AND authorized_at IS NOT NULL AND consumed_at IS NULL
          AND activation_replay_identity IS NOT NULL
          AND lifecycle_registration_consumption IS NULL)
      OR (state='consumed' AND attached_at IS NOT NULL
          AND authorized_at IS NOT NULL AND consumed_at IS NOT NULL
          AND activation_replay_identity IS NOT NULL
          AND lifecycle_registration_consumption IS NOT NULL)),
  CHECK ((authorized_at IS NULL AND proof_issued_at IS NULL
          AND proof_expires_at IS NULL)
      OR (authorized_at IS NOT NULL AND proof_issued_at IS NOT NULL
          AND proof_expires_at IS NOT NULL
          AND proof_expires_at>proof_issued_at))
);

CREATE TABLE lawos_email_dms.outlook_desktop_activation_operator_packet_evidence (
  tenant_id text NOT NULL,
  activation_reference text NOT NULL
    CHECK (activation_reference ~ '^oda_[A-Za-z0-9_-]{24}$'),
  installation_id text NOT NULL
    CHECK (installation_id ~ '^odi_[A-Za-z0-9_-]{20,128}$'),
  request_id text NOT NULL
    CHECK (request_id ~ '^oar_[A-Za-z0-9_-]{20,128}$'),
  core_request_sha256 text NOT NULL
    CHECK (core_request_sha256 ~ '^[a-f0-9]{64}$'),
  owner_operator_packet_sha256 text NOT NULL
    CHECK (owner_operator_packet_sha256 ~ '^[a-f0-9]{64}$'),
  operator_receipt_sha256 text NOT NULL
    CHECK (operator_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  operator_signature_sha256 text NOT NULL
    CHECK (operator_signature_sha256 ~ '^[a-f0-9]{64}$'),
  local_measurement_evidence_sha256 text NOT NULL
    CHECK (local_measurement_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  issued_challenge_sha256 text NOT NULL
    CHECK (issued_challenge_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_receipt_sha256 text NOT NULL
    CHECK (evidence_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  persisted_at timestamptz NOT NULL
    CHECK (persisted_at=date_trunc('milliseconds',persisted_at)),
  PRIMARY KEY (tenant_id,activation_reference),
  UNIQUE (tenant_id,owner_operator_packet_sha256),
  UNIQUE (tenant_id,evidence_receipt_sha256),
  FOREIGN KEY (tenant_id,activation_reference)
    REFERENCES lawos_email_dms.outlook_desktop_activation_challenges
      (tenant_id,activation_reference) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id,installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_activation_challenges
      (tenant_id,installation_id) ON DELETE RESTRICT
);

CREATE TRIGGER outlook_desktop_activation_operator_packet_evidence_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE TABLE lawos_email_dms.outlook_desktop_activation_authorizations (
  tenant_id text NOT NULL,
  activation_authorization_id text NOT NULL
    CHECK (char_length(activation_authorization_id) BETWEEN 1 AND 200),
  installation_id text NOT NULL CHECK (installation_id ~ '^odi_[A-Za-z0-9_-]{20,128}$'),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  device_key_fingerprint text NOT NULL CHECK (device_key_fingerprint ~ '^[a-f0-9]{64}$'),
  device_public_key_spki_sha256 text NOT NULL
    CHECK (device_public_key_spki_sha256 ~ '^[a-f0-9]{64}$'),
  device_proof_request_sha256 text NOT NULL CHECK (device_proof_request_sha256 ~ '^[a-f0-9]{64}$'),
  server_nonce_sha256 text NOT NULL CHECK (server_nonce_sha256 ~ '^[a-f0-9]{64}$'),
  device_signature_sha256 text NOT NULL CHECK (device_signature_sha256 ~ '^[a-f0-9]{64}$'),
  release_artifact_id text NOT NULL,
  release_ticket_bytes_sha256 text NOT NULL CHECK (release_ticket_bytes_sha256 ~ '^[a-f0-9]{64}$'),
  release_ticket_owner_signature_sha256 text NOT NULL
    CHECK (release_ticket_owner_signature_sha256 ~ '^[a-f0-9]{64}$'),
  approval_audit_event_id text NOT NULL,
  approval_audit_event_binding_sha256 text NOT NULL
    CHECK (approval_audit_event_binding_sha256 ~ '^[a-f0-9]{64}$'),
  release_authority_sha256 text NOT NULL CHECK (release_authority_sha256 ~ '^[a-f0-9]{64}$'),
  activation_receipt_sha256 text NOT NULL
    CHECK (activation_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  activation_authorization_receipt_sha256 text NOT NULL
    CHECK (activation_authorization_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  local_measurement_evidence_sha256 text NOT NULL
    CHECK (local_measurement_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  issued_challenge_sha256 text NOT NULL
    CHECK (issued_challenge_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_binding_sha256 text NOT NULL
    CHECK (evidence_binding_sha256 ~ '^[a-f0-9]{64}$'),
  owner_operator_packet_sha256 text NOT NULL
    CHECK (owner_operator_packet_sha256 ~ '^[a-f0-9]{64}$'),
  evidence_receipt_sha256 text NOT NULL
    CHECK (evidence_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  device_proof_transcript_sha256 text NOT NULL
    CHECK (device_proof_transcript_sha256 ~ '^[a-f0-9]{64}$'),
  proof_id text NOT NULL CHECK (char_length(proof_id) BETWEEN 1 AND 200),
  request_id text NOT NULL CHECK (char_length(request_id) BETWEEN 1 AND 200),
  event_id text NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 200),
  idempotency_key text NOT NULL
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  proof_issued_at timestamptz NOT NULL
    CHECK (proof_issued_at=date_trunc('milliseconds',proof_issued_at)),
  proof_expires_at timestamptz NOT NULL
    CHECK (proof_expires_at=date_trunc('milliseconds',proof_expires_at)),
  authorization_binding_sha256 text NOT NULL CHECK (authorization_binding_sha256 ~ '^[a-f0-9]{64}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text NOT NULL CHECK (response_text::jsonb IS NOT NULL),
  authorized_at timestamptz NOT NULL CHECK (authorized_at=date_trunc('milliseconds',authorized_at)),
  valid_from timestamptz NOT NULL CHECK (valid_from=date_trunc('milliseconds',valid_from)),
  valid_until timestamptz NOT NULL CHECK (valid_until=date_trunc('milliseconds',valid_until)),
  consumed_at timestamptz CHECK (consumed_at=date_trunc('milliseconds',consumed_at)),
  consumed_installation_id text,
  PRIMARY KEY (tenant_id, activation_authorization_id),
  UNIQUE (tenant_id, device_proof_request_sha256),
  UNIQUE (tenant_id, installation_id),
  UNIQUE (tenant_id, proof_id),
  FOREIGN KEY (tenant_id,activation_authorization_id)
    REFERENCES lawos_email_dms.outlook_desktop_activation_challenges
      (tenant_id,activation_reference) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id,installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_activation_challenges
      (tenant_id,installation_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, release_artifact_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_artifacts
      (tenant_id, release_artifact_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, approval_audit_event_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_trust_audit_events
      (tenant_id, event_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, consumed_installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_installations
      (tenant_id, installation_id) ON DELETE RESTRICT,
  CHECK (valid_until>valid_from AND authorized_at<=valid_from
         AND proof_expires_at>proof_issued_at AND valid_until=proof_expires_at),
  CHECK (device_public_key_spki_sha256=device_key_fingerprint),
  CHECK ((consumed_at IS NULL)=(consumed_installation_id IS NULL))
);

CREATE TABLE lawos_email_dms.outlook_desktop_lifecycle_challenges (
  tenant_id text NOT NULL,
  lifecycle_challenge_id text NOT NULL
    CHECK (lifecycle_challenge_id ~ '^olc_[a-f0-9]{32}$'),
  operation text NOT NULL CHECK (operation IN ('heartbeat','retire')),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  installation_id text NOT NULL CHECK (installation_id ~ '^odi_[A-Za-z0-9_-]{20,128}$'),
  device_key_fingerprint text NOT NULL CHECK (device_key_fingerprint ~ '^[a-f0-9]{64}$'),
  expected_state_version bigint NOT NULL CHECK (expected_state_version>=1),
  request_id text NOT NULL CHECK (char_length(request_id) BETWEEN 1 AND 200),
  event_id text NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 200),
  idempotency_key text NOT NULL CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  retire_intent_id text CHECK (
    retire_intent_id IS NULL OR retire_intent_id ~ '^ori_[a-f0-9]{32}$'),
  release_artifact_id text NOT NULL,
  release_authority_sha256 text NOT NULL CHECK (release_authority_sha256 ~ '^[a-f0-9]{64}$'),
  challenge_nonce_base64url text NOT NULL
    CHECK (challenge_nonce_base64url ~ '^[A-Za-z0-9_-]{43}$'),
  challenge_nonce_sha256 text NOT NULL CHECK (challenge_nonce_sha256 ~ '^[a-f0-9]{64}$'),
  issued_challenge jsonb NOT NULL CHECK (jsonb_typeof(issued_challenge)='object'),
  issued_challenge_base64 text NOT NULL
    CHECK (char_length(issued_challenge_base64) BETWEEN 4 AND 87384),
  issued_challenge_sha256 text NOT NULL CHECK (issued_challenge_sha256 ~ '^[a-f0-9]{64}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text NOT NULL CHECK (response_text::jsonb IS NOT NULL),
  issued_at timestamptz NOT NULL CHECK (issued_at=date_trunc('milliseconds',issued_at)),
  valid_until timestamptz NOT NULL CHECK (valid_until=date_trunc('milliseconds',valid_until)),
  consumed_at timestamptz CHECK (consumed_at=date_trunc('milliseconds',consumed_at)),
  lifecycle_authorization_id text,
  PRIMARY KEY (tenant_id,lifecycle_challenge_id),
  UNIQUE (tenant_id,request_id),
  UNIQUE (tenant_id,event_id),
  UNIQUE (tenant_id,user_id,idempotency_key),
  UNIQUE (tenant_id,challenge_nonce_sha256),
  FOREIGN KEY (tenant_id,installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_installations
      (tenant_id,installation_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id,release_artifact_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_artifacts
      (tenant_id,release_artifact_id) ON DELETE RESTRICT,
  CHECK ((operation='heartbeat' AND retire_intent_id IS NULL)
      OR (operation='retire' AND retire_intent_id IS NOT NULL)),
  CHECK (valid_until>issued_at),
  CHECK ((consumed_at IS NULL)=(lifecycle_authorization_id IS NULL))
);

CREATE TABLE lawos_email_dms.outlook_desktop_lifecycle_authorizations (
  tenant_id text NOT NULL,
  lifecycle_authorization_id text NOT NULL
    CHECK (char_length(lifecycle_authorization_id) BETWEEN 1 AND 200),
  operation text NOT NULL CHECK (operation IN ('register','heartbeat','retire')),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  installation_id text NOT NULL,
  device_key_fingerprint text NOT NULL CHECK (device_key_fingerprint ~ '^[a-f0-9]{64}$'),
  device_public_key_spki_sha256 text NOT NULL
    CHECK (device_public_key_spki_sha256 ~ '^[a-f0-9]{64}$'),
  expected_state_version bigint NOT NULL CHECK (expected_state_version>=1),
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[a-f0-9]{64}$'),
  proof_transcript_sha256 text NOT NULL CHECK (proof_transcript_sha256 ~ '^[a-f0-9]{64}$'),
  nonce_hash text NOT NULL CHECK (nonce_hash ~ '^[a-f0-9]{64}$'),
  device_signature_sha256 text NOT NULL CHECK (device_signature_sha256 ~ '^[a-f0-9]{64}$'),
  proof_receipt_sha256 text NOT NULL CHECK (proof_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  issued_challenge_sha256 text NOT NULL
    CHECK (issued_challenge_sha256 ~ '^[a-f0-9]{64}$'),
  activation_authorization_id text,
  release_authority_sha256 text CHECK (
    release_authority_sha256 IS NULL OR release_authority_sha256 ~ '^[a-f0-9]{64}$'),
  lifecycle_challenge_id text,
  request_id text,
  event_id text,
  idempotency_key text,
  retire_intent_id text,
  proof_issued_at timestamptz NOT NULL CHECK (proof_issued_at=date_trunc('milliseconds',proof_issued_at)),
  proof_expires_at timestamptz NOT NULL CHECK (proof_expires_at=date_trunc('milliseconds',proof_expires_at)),
  authorized_at timestamptz NOT NULL CHECK (authorized_at=date_trunc('milliseconds',authorized_at)),
  authorization_binding_sha256 text NOT NULL
    CHECK (authorization_binding_sha256 ~ '^[a-f0-9]{64}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text NOT NULL CHECK (response_text::jsonb IS NOT NULL),
  consumed_at timestamptz CHECK (consumed_at=date_trunc('milliseconds',consumed_at)),
  resulting_state_version bigint CHECK (resulting_state_version IS NULL OR resulting_state_version>=1),
  PRIMARY KEY (tenant_id,lifecycle_authorization_id),
  UNIQUE (tenant_id,request_fingerprint),
  FOREIGN KEY (tenant_id,lifecycle_challenge_id)
    REFERENCES lawos_email_dms.outlook_desktop_lifecycle_challenges
      (tenant_id,lifecycle_challenge_id) ON DELETE RESTRICT,
  CHECK (device_public_key_spki_sha256=device_key_fingerprint),
  CHECK (proof_expires_at>proof_issued_at),
  CHECK ((consumed_at IS NULL)=(resulting_state_version IS NULL)),
  CHECK ((operation='register' AND activation_authorization_id IS NOT NULL
          AND release_authority_sha256 IS NOT NULL
          AND lifecycle_challenge_id IS NULL
          AND request_id ~ '^oar_[A-Za-z0-9_-]{20,128}$'
          AND event_id ~ '^oae_[a-f0-9]{32}$'
          AND idempotency_key=request_id
          AND retire_intent_id IS NULL)
      OR (operation='heartbeat' AND activation_authorization_id IS NULL
          AND release_authority_sha256 IS NULL
          AND lifecycle_challenge_id IS NOT NULL AND request_id IS NOT NULL
          AND event_id IS NOT NULL AND idempotency_key IS NOT NULL
          AND retire_intent_id IS NULL)
      OR (operation='retire' AND activation_authorization_id IS NULL
          AND release_authority_sha256 IS NULL
          AND lifecycle_challenge_id IS NOT NULL AND request_id IS NOT NULL
          AND event_id IS NOT NULL AND idempotency_key IS NOT NULL
          AND retire_intent_id IS NOT NULL))
);

CREATE TABLE lawos_email_dms.outlook_desktop_installation_release_bindings (
  tenant_id text NOT NULL,
  installation_id text NOT NULL,
  activation_authorization_id text NOT NULL,
  release_artifact_id text NOT NULL,
  release_ticket_id text NOT NULL,
  release_ticket_sha256 text NOT NULL CHECK (release_ticket_sha256 ~ '^[a-f0-9]{64}$'),
  release_ticket_signature_sha256 text NOT NULL CHECK (release_ticket_signature_sha256 ~ '^[a-f0-9]{64}$'),
  platform text NOT NULL CHECK (platform='darwin'),
  channel text NOT NULL CHECK (channel='formal'),
  app_version text NOT NULL CHECK (app_version ~ '^\d+\.\d+\.\d+([-+][0-9A-Za-z.-]+)?$'),
  app_id text NOT NULL CHECK (app_id='com.amic.matter.desktop'),
  arch text NOT NULL CHECK (arch IN ('arm64','x64')),
  source_sha text NOT NULL CHECK (source_sha ~ '^[a-f0-9]{40}$'),
  source_tree text NOT NULL CHECK (source_tree ~ '^[a-f0-9]{40}$'),
  embedded_build_manifest_sha256 text NOT NULL CHECK (embedded_build_manifest_sha256 ~ '^[a-f0-9]{64}$'),
  measured_inner_artifact_sha256 text NOT NULL CHECK (measured_inner_artifact_sha256 ~ '^[a-f0-9]{64}$'),
  measured_inner_artifact_bytes bigint NOT NULL CHECK (measured_inner_artifact_bytes BETWEEN 1 AND 536870912),
  registered_final_artifact_sha256 text NOT NULL CHECK (registered_final_artifact_sha256 ~ '^[a-f0-9]{64}$'),
  registered_final_artifact_bytes bigint NOT NULL CHECK (registered_final_artifact_bytes BETWEEN 1 AND 8589934592),
  approval_sha256 text NOT NULL CHECK (approval_sha256 ~ '^[a-f0-9]{64}$'),
  approval_audit_event_id text NOT NULL,
  approval_audit_event_binding_sha256 text NOT NULL CHECK (approval_audit_event_binding_sha256 ~ '^[a-f0-9]{64}$'),
  macos_technical_evidence_sha256 text NOT NULL CHECK (macos_technical_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  trust_registry_sha256 text NOT NULL CHECK (trust_registry_sha256 ~ '^[a-f0-9]{64}$'),
  trust_registry_serial bigint NOT NULL CHECK (trust_registry_serial>=1),
  release_valid_until timestamptz NOT NULL,
  device_proof_request_sha256 text NOT NULL CHECK (device_proof_request_sha256 ~ '^[a-f0-9]{64}$'),
  device_public_key_spki_sha256 text NOT NULL
    CHECK (device_public_key_spki_sha256 ~ '^[a-f0-9]{64}$'),
  server_nonce_sha256 text NOT NULL CHECK (server_nonce_sha256 ~ '^[a-f0-9]{64}$'),
  device_signature_sha256 text NOT NULL CHECK (device_signature_sha256 ~ '^[a-f0-9]{64}$'),
  activation_receipt_sha256 text NOT NULL CHECK (activation_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  local_measurement_evidence_sha256 text NOT NULL CHECK (local_measurement_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  installation_release_binding_sha256 text NOT NULL CHECK (installation_release_binding_sha256 ~ '^[a-f0-9]{64}$'),
  authenticated_at timestamptz NOT NULL CHECK (authenticated_at=date_trunc('milliseconds',authenticated_at)),
  PRIMARY KEY (tenant_id, installation_id),
  UNIQUE (tenant_id, activation_authorization_id),
  FOREIGN KEY (tenant_id, installation_id)
    REFERENCES lawos_email_dms.outlook_desktop_installations
      (tenant_id, installation_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, activation_authorization_id)
    REFERENCES lawos_email_dms.outlook_desktop_activation_authorizations
      (tenant_id, activation_authorization_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, release_artifact_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_artifacts
      (tenant_id, release_artifact_id) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id, approval_audit_event_id)
    REFERENCES lawos_email_dms.outlook_desktop_release_trust_audit_events
      (tenant_id, event_id) ON DELETE RESTRICT
);
CREATE INDEX outlook_desktop_installation_release_artifact_idx
  ON lawos_email_dms.outlook_desktop_installation_release_bindings
    (tenant_id, release_artifact_id, installation_id);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_canary_principals (
  tenant_id text PRIMARY KEY,
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  initial_roster_binding_sha256 text NOT NULL
    CHECK (initial_roster_binding_sha256 ~ '^[a-f0-9]{64}$'),
  principal_binding_sha256 text NOT NULL CHECK (principal_binding_sha256 ~ '^[a-f0-9]{64}$'),
  established_at timestamptz NOT NULL CHECK (established_at=date_trunc('milliseconds',established_at)),
  UNIQUE (tenant_id,user_id,entra_subject_id)
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_rosters (
  tenant_id text NOT NULL,
  roster_version text NOT NULL CHECK (char_length(roster_version) BETWEEN 1 AND 200),
  rollout_stage text NOT NULL CHECK (rollout_stage IN ('jwsuh_canary','expanded')),
  expansion_authorization_id text,
  roster_binding_sha256 text NOT NULL CHECK (roster_binding_sha256 ~ '^[a-f0-9]{64}$'),
  owner_approval_sha256 text NOT NULL CHECK (owner_approval_sha256 ~ '^[a-f0-9]{64}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text NOT NULL CHECK (response_text::jsonb IS NOT NULL),
  approved_at timestamptz NOT NULL CHECK (approved_at=date_trunc('milliseconds',approved_at)),
  valid_from timestamptz NOT NULL CHECK (valid_from=date_trunc('milliseconds',valid_from)),
  valid_until timestamptz NOT NULL CHECK (valid_until=date_trunc('milliseconds',valid_until)),
  PRIMARY KEY (tenant_id,roster_version),
  UNIQUE (tenant_id,roster_version,roster_binding_sha256),
  CHECK (approved_at<=valid_from AND valid_until>valid_from),
  CHECK ((rollout_stage='jwsuh_canary' AND expansion_authorization_id IS NULL)
      OR (rollout_stage='expanded' AND expansion_authorization_id IS NOT NULL))
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_roster_members (
  tenant_id text NOT NULL,
  roster_version text NOT NULL,
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  member_binding_sha256 text NOT NULL CHECK (member_binding_sha256 ~ '^[a-f0-9]{64}$'),
  PRIMARY KEY (tenant_id,roster_version,user_id),
  UNIQUE (tenant_id,roster_version,entra_subject_id),
  UNIQUE (tenant_id,roster_version,user_id,entra_subject_id),
  FOREIGN KEY (tenant_id,roster_version)
    REFERENCES lawos_email_dms.outlook_desktop_assignment_rosters
      (tenant_id,roster_version) ON DELETE RESTRICT
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_expansion_authorizations (
  tenant_id text NOT NULL,
  expansion_authorization_id text NOT NULL
    CHECK (char_length(expansion_authorization_id) BETWEEN 1 AND 200),
  canary_roster_version text NOT NULL,
  canary_success_evidence_sha256 text NOT NULL
    CHECK (canary_success_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  expanded_roster_version text NOT NULL,
  expanded_roster_binding_sha256 text NOT NULL
    CHECK (expanded_roster_binding_sha256 ~ '^[a-f0-9]{64}$'),
  owner_approval_sha256 text NOT NULL CHECK (owner_approval_sha256 ~ '^[a-f0-9]{64}$'),
  authorization_binding_sha256 text NOT NULL
    CHECK (authorization_binding_sha256 ~ '^[a-f0-9]{64}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text NOT NULL CHECK (response_text::jsonb IS NOT NULL),
  authorized_at timestamptz NOT NULL CHECK (authorized_at=date_trunc('milliseconds',authorized_at)),
  valid_until timestamptz NOT NULL CHECK (valid_until=date_trunc('milliseconds',valid_until)),
  consumed_at timestamptz CHECK (consumed_at=date_trunc('milliseconds',consumed_at)),
  PRIMARY KEY (tenant_id,expansion_authorization_id),
  UNIQUE (tenant_id,expanded_roster_version),
  FOREIGN KEY (tenant_id,canary_roster_version)
    REFERENCES lawos_email_dms.outlook_desktop_assignment_rosters
      (tenant_id,roster_version) ON DELETE RESTRICT,
  CHECK (valid_until>authorized_at)
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_policy_approvals (
  tenant_id text NOT NULL,
  approval_id text NOT NULL CHECK (char_length(approval_id) BETWEEN 1 AND 200),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  rollout_stage text NOT NULL CHECK (rollout_stage IN ('jwsuh_canary','expanded')),
  maximum_entitled boolean NOT NULL,
  rollout_authorized boolean NOT NULL,
  account_active boolean NOT NULL,
  release_allowed boolean NOT NULL,
  policy_revision bigint NOT NULL CHECK (policy_revision>=1),
  roster_version text NOT NULL CHECK (char_length(roster_version) BETWEEN 1 AND 200),
  roster_binding_sha256 text NOT NULL CHECK (roster_binding_sha256 ~ '^[a-f0-9]{64}$'),
  owner_approval_sha256 text NOT NULL CHECK (owner_approval_sha256 ~ '^[a-f0-9]{64}$'),
  policy_binding_sha256 text NOT NULL CHECK (policy_binding_sha256 ~ '^[a-f0-9]{64}$'),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text CHECK (response_text IS NULL OR response_text::jsonb IS NOT NULL),
  approved_at timestamptz NOT NULL CHECK (approved_at=date_trunc('milliseconds',approved_at)),
  valid_from timestamptz NOT NULL CHECK (valid_from=date_trunc('milliseconds',valid_from)),
  valid_until timestamptz NOT NULL CHECK (valid_until=date_trunc('milliseconds',valid_until)),
  PRIMARY KEY (tenant_id, approval_id),
  UNIQUE (tenant_id, user_id, policy_revision),
  UNIQUE (tenant_id, entra_subject_id, policy_revision),
  FOREIGN KEY (tenant_id,roster_version,user_id,entra_subject_id)
    REFERENCES lawos_email_dms.outlook_desktop_assignment_roster_members
      (tenant_id,roster_version,user_id,entra_subject_id) ON DELETE RESTRICT,
  CHECK (approved_at<=valid_from AND valid_until>valid_from)
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_policies (
  tenant_id text NOT NULL,
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  approval_id text NOT NULL,
  rollout_stage text NOT NULL CHECK (rollout_stage IN ('jwsuh_canary','expanded')),
  maximum_entitled boolean NOT NULL,
  rollout_authorized boolean NOT NULL,
  account_active boolean NOT NULL,
  release_allowed boolean NOT NULL,
  policy_revision bigint NOT NULL CHECK (policy_revision>=1),
  roster_version text NOT NULL CHECK (char_length(roster_version) BETWEEN 1 AND 200),
  roster_binding_sha256 text NOT NULL CHECK (roster_binding_sha256 ~ '^[a-f0-9]{64}$'),
  owner_approval_sha256 text NOT NULL CHECK (owner_approval_sha256 ~ '^[a-f0-9]{64}$'),
  policy_binding_sha256 text NOT NULL CHECK (policy_binding_sha256 ~ '^[a-f0-9]{64}$'),
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, user_id),
  UNIQUE (tenant_id, entra_subject_id),
  FOREIGN KEY (tenant_id, approval_id)
    REFERENCES lawos_email_dms.outlook_desktop_assignment_policy_approvals
      (tenant_id, approval_id) ON DELETE RESTRICT,
  CHECK (valid_until>valid_from)
);
CREATE UNIQUE INDEX outlook_desktop_assignment_one_authorized_canary_idx
  ON lawos_email_dms.outlook_desktop_assignment_policies (tenant_id)
  WHERE rollout_stage='jwsuh_canary' AND rollout_authorized;

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_states (
  tenant_id text NOT NULL,
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  rollout_stage text CHECK (rollout_stage IS NULL OR rollout_stage IN ('jwsuh_canary','expanded')),
  policy_revision bigint NOT NULL CHECK (policy_revision>=0),
  policy_binding_sha256 text NOT NULL CHECK (policy_binding_sha256 ~ '^[a-f0-9]{64}$'),
  active_trusted_install_count integer NOT NULL CHECK (active_trusted_install_count>=0),
  trust_authority text NOT NULL,
  trust_authority_revision bigint NOT NULL CHECK (trust_authority_revision>=1),
  trust_authority_binding_sha256 text NOT NULL CHECK (trust_authority_binding_sha256 ~ '^[a-f0-9]{64}$'),
  desired_assigned boolean NOT NULL,
  denial_reasons jsonb NOT NULL CHECK (jsonb_typeof(denial_reasons)='array'),
  aggregate_sha256 text NOT NULL CHECK (aggregate_sha256 ~ '^[a-f0-9]{64}$'),
  state_revision bigint NOT NULL CHECK (state_revision>=1),
  provider_generation bigint NOT NULL CHECK (provider_generation>=0),
  provider_intent_sha256 text NOT NULL CHECK (provider_intent_sha256 ~ '^[a-f0-9]{64}$'),
  evaluated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, user_id),
  UNIQUE (tenant_id, entra_subject_id),
  CHECK (NOT desired_assigned OR (active_trusted_install_count>0 AND policy_revision>0))
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_audit_events (
  tenant_id text NOT NULL,
  event_id text NOT NULL CHECK (char_length(event_id) BETWEEN 1 AND 200),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  event_type text NOT NULL CHECK (event_type IN (
    'aggregate_changed','desired_changed','outbox_leased',
    'outbox_dispatch_started','outbox_completed','outbox_retry',
    'outbox_ambiguous','outbox_dead_letter','outbox_superseded',
    'outbox_reconciled','outbox_lease_extended','outbox_escalated'
  )),
  state_revision bigint CHECK (state_revision IS NULL OR state_revision>=1),
  provider_generation bigint NOT NULL CHECK (provider_generation>=0),
  provider_intent_sha256 text NOT NULL CHECK (provider_intent_sha256 ~ '^[a-f0-9]{64}$'),
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details)='object'),
  occurred_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, event_id)
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_outbox (
  tenant_id text NOT NULL,
  outbox_id text NOT NULL CHECK (char_length(outbox_id) BETWEEN 1 AND 200),
  operation_id text NOT NULL CHECK (operation_id=outbox_id),
  user_id text NOT NULL CHECK (char_length(user_id) BETWEEN 1 AND 200),
  entra_subject_id text NOT NULL CHECK (char_length(entra_subject_id) BETWEEN 1 AND 200),
  provider_generation bigint NOT NULL CHECK (provider_generation>=1),
  desired_assigned boolean NOT NULL,
  action text NOT NULL CHECK ((desired_assigned AND action='add') OR (NOT desired_assigned AND action='remove')),
  provider_intent_sha256 text NOT NULL CHECK (provider_intent_sha256 ~ '^[a-f0-9]{64}$'),
  payload jsonb NOT NULL CHECK (
    jsonb_typeof(payload)='object'
    AND payload ?& ARRAY['schema_version','operation_id','tenant_id','user_id',
      'entra_subject_id','provider_generation','desired_assigned','action','provider_intent_sha256']
    AND payload-ARRAY['schema_version','operation_id','tenant_id','user_id',
      'entra_subject_id','provider_generation','desired_assigned','action','provider_intent_sha256']='{}'::jsonb
    AND payload->>'schema_version'='lawos.outlook-desktop-assignment.v1'
    AND payload->>'operation_id'=operation_id AND payload->>'tenant_id'=tenant_id
    AND payload->>'user_id'=user_id AND payload->>'entra_subject_id'=entra_subject_id
    AND (payload->>'provider_generation')::bigint=provider_generation
    AND (payload->>'desired_assigned')::boolean=desired_assigned
    AND payload->>'action'=action AND payload->>'provider_intent_sha256'=provider_intent_sha256
  ),
  status text NOT NULL CHECK (status IN (
    'pending','leased','retry','ambiguous','completed','superseded','dead_letter'
  )),
  remote_commit_state text NOT NULL CHECK (remote_commit_state IN (
    'not_sent','unknown','confirmed','reconciled'
  )),
  available_at timestamptz NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count>=0),
  retry_epoch integer NOT NULL DEFAULT 0 CHECK (retry_epoch>=0),
  retry_epoch_attempt_count integer NOT NULL DEFAULT 0
    CHECK (retry_epoch_attempt_count>=0),
  CONSTRAINT outlook_desktop_assignment_retry_epoch_check CHECK (
    attempt_count>=retry_epoch+retry_epoch_attempt_count
  ),
  escalation_count integer NOT NULL DEFAULT 0 CHECK (escalation_count>=0),
  last_escalated_at timestamptz,
  lease_owner text,
  lease_token text,
  lease_expires_at timestamptz,
  last_error_code text,
  result_code text,
  causal_event_id text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id, outbox_id),
  UNIQUE (tenant_id, user_id, entra_subject_id, provider_generation),
  UNIQUE (tenant_id, causal_event_id),
  FOREIGN KEY (tenant_id, causal_event_id)
    REFERENCES lawos_email_dms.outlook_desktop_assignment_audit_events
      (tenant_id, event_id) ON DELETE RESTRICT,
  CHECK (
    (status='leased' AND lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)
    OR (status<>'leased' AND lease_owner IS NULL AND lease_token IS NULL AND lease_expires_at IS NULL)
  )
);

CREATE TABLE lawos_email_dms.outlook_desktop_assignment_outbox_receipts (
  tenant_id text NOT NULL,
  receipt_id text NOT NULL,
  outbox_id text NOT NULL,
  operation_id text NOT NULL,
  user_id text NOT NULL,
  entra_subject_id text NOT NULL,
  provider_generation bigint NOT NULL CHECK (provider_generation>=1),
  provider_intent_sha256 text NOT NULL CHECK (provider_intent_sha256 ~ '^[a-f0-9]{64}$'),
  observed_assigned boolean NOT NULL,
  result_code text NOT NULL CHECK (char_length(result_code) BETWEEN 1 AND 200),
  worker_id text NOT NULL CHECK (char_length(worker_id) BETWEEN 1 AND 200),
  lease_token text NOT NULL CHECK (char_length(lease_token) BETWEEN 1 AND 200),
  request_terminal boolean NOT NULL CHECK (request_terminal),
  propagation_stabilized boolean NOT NULL CHECK (propagation_stabilized),
  readback_receipt_sha256 text NOT NULL CHECK (readback_receipt_sha256 ~ '^[a-f0-9]{64}$'),
  outcome text NOT NULL CHECK (outcome IN ('completed','reconciled')),
  completion_binding_sha256 text NOT NULL CHECK (completion_binding_sha256 ~ '^[a-f0-9]{64}$'),
  response_text text NOT NULL CHECK (response_text::jsonb IS NOT NULL),
  completed_at timestamptz NOT NULL CHECK (completed_at=date_trunc('milliseconds',completed_at)),
  PRIMARY KEY (tenant_id, receipt_id),
  UNIQUE (tenant_id, outbox_id),
  FOREIGN KEY (tenant_id, outbox_id)
    REFERENCES lawos_email_dms.outlook_desktop_assignment_outbox
      (tenant_id, outbox_id) ON DELETE RESTRICT,
  CHECK (receipt_id=outbox_id AND operation_id=outbox_id)
);

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_policy_approval()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,lawos_email_dms
AS $$
DECLARE expected_binding text;
DECLARE expected_request_text text;
DECLARE expected_request_sha text;
BEGIN
  expected_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-assignment-policy-approval.v1', NEW.tenant_id,
    NEW.approval_id, NEW.user_id, NEW.entra_subject_id, NEW.rollout_stage,
    NEW.maximum_entitled::text, NEW.rollout_authorized::text,
    NEW.account_active::text, NEW.release_allowed::text,
    NEW.policy_revision::text, NEW.roster_version, NEW.roster_binding_sha256,
    NEW.owner_approval_sha256,
    ((extract(epoch FROM NEW.approved_at)*1000)::bigint)::text,
    ((extract(epoch FROM NEW.valid_from)*1000)::bigint)::text,
    ((extract(epoch FROM NEW.valid_until)*1000)::bigint)::text
  ]);
  IF NEW.policy_binding_sha256<>expected_binding THEN
    RAISE EXCEPTION 'outlook desktop policy approval binding mismatch';
  END IF;
  expected_request_text := jsonb_build_object(
    'approval_id',NEW.approval_id,'user_id',NEW.user_id,
    'entra_subject_id',NEW.entra_subject_id,'rollout_stage',NEW.rollout_stage,
    'maximum_entitled',NEW.maximum_entitled,
    'rollout_authorized',NEW.rollout_authorized,
    'account_active',NEW.account_active,'release_allowed',NEW.release_allowed,
    'policy_revision',NEW.policy_revision,'roster_version',NEW.roster_version,
    'roster_binding_sha256',NEW.roster_binding_sha256,
    'owner_approval_sha256',NEW.owner_approval_sha256,
    'policy_binding_sha256',NEW.policy_binding_sha256,
    'approved_at',to_char(NEW.approved_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_from',to_char(NEW.valid_from AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(NEW.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )::text;
  expected_request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-assignment-policy-request.v1',NEW.tenant_id,
    expected_request_text
  ]);
  IF NEW.request_sha256 IS DISTINCT FROM expected_request_sha THEN
    RAISE EXCEPTION 'outlook desktop policy approval request binding mismatch';
  END IF;
  IF TG_OP='UPDATE' AND (
    OLD.response_text IS NOT NULL OR NEW.response_text IS NULL
    OR (to_jsonb(NEW)-'response_text') IS DISTINCT FROM
       (to_jsonb(OLD)-'response_text')
  ) THEN
    RAISE EXCEPTION 'outlook desktop policy approval is immutable';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER outlook_desktop_policy_approval_binding
  BEFORE INSERT OR UPDATE
  ON lawos_email_dms.outlook_desktop_assignment_policy_approvals
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.enforce_outlook_desktop_policy_approval();
CREATE TRIGGER outlook_desktop_policy_approval_immutable
  BEFORE DELETE
  ON lawos_email_dms.outlook_desktop_assignment_policy_approvals
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_policy()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,lawos_email_dms
AS $$
DECLARE approval lawos_email_dms.outlook_desktop_assignment_policy_approvals%ROWTYPE;
BEGIN
  SELECT * INTO approval
    FROM lawos_email_dms.outlook_desktop_assignment_policy_approvals
   WHERE tenant_id=NEW.tenant_id AND approval_id=NEW.approval_id;
  IF NOT FOUND OR ROW(
       NEW.user_id,NEW.entra_subject_id,NEW.rollout_stage,
       NEW.maximum_entitled,NEW.rollout_authorized,NEW.account_active,
       NEW.release_allowed,NEW.policy_revision,NEW.roster_version,
       NEW.roster_binding_sha256,NEW.owner_approval_sha256,
       NEW.policy_binding_sha256,NEW.valid_from,NEW.valid_until,NEW.updated_at
     ) IS DISTINCT FROM ROW(
       approval.user_id,approval.entra_subject_id,approval.rollout_stage,
       approval.maximum_entitled,approval.rollout_authorized,
       approval.account_active,approval.release_allowed,
       approval.policy_revision,approval.roster_version,
       approval.roster_binding_sha256,approval.owner_approval_sha256,
       approval.policy_binding_sha256,approval.valid_from,approval.valid_until,
       approval.approved_at
     ) THEN
    RAISE EXCEPTION 'outlook desktop policy must bind exact immutable approval';
  END IF;
  IF TG_OP='UPDATE' AND (
    NEW.user_id<>OLD.user_id OR NEW.entra_subject_id<>OLD.entra_subject_id
    OR NEW.policy_revision<=OLD.policy_revision
  ) THEN
    RAISE EXCEPTION 'outlook desktop policy revision must advance immutably';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER outlook_desktop_policy_binding
  BEFORE INSERT OR UPDATE ON lawos_email_dms.outlook_desktop_assignment_policies
  FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.enforce_outlook_desktop_policy();
CREATE TRIGGER outlook_desktop_policy_no_delete
  BEFORE DELETE ON lawos_email_dms.outlook_desktop_assignment_policies
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_activation_challenge()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,lawos_email_dms
AS $$
DECLARE challenge_bytes bytea;
DECLARE nonce_bytes bytea;
DECLARE spki_bytes bytea;
DECLARE release_ticket_bytes bytea;
DECLARE release_signature_bytes bytea;
DECLARE operator_receipt_bytes bytea;
DECLARE operator_signature_bytes bytea;
DECLARE expected_issue_request_sha text;
DECLARE expected_issue_response jsonb;
DECLARE expected_issue_public_response jsonb;
DECLARE expected_issue_public_response_text text;
DECLARE issue_authority record;
DECLARE expected_evidence_binding text;
DECLARE expected_attachment_request_sha text;
DECLARE expected_attachment_response jsonb;
DECLARE expected_authorization_request_sha text;
DECLARE authorization_row lawos_email_dms.outlook_desktop_activation_authorizations%ROWTYPE;
DECLARE packet_evidence_row
  lawos_email_dms.outlook_desktop_activation_operator_packet_evidence%ROWTYPE;
DECLARE attach_fields constant text[] := ARRAY[
  'attachment_request_id','attachment_request_sha256','attachment_response_text',
  'operator_receipt_base64','operator_receipt_sha256',
  'operator_signature_base64','operator_signature_sha256',
  'activation_replay_identity','state','attached_at'
];
DECLARE authorize_fields constant text[] := ARRAY[
  'authorization_request_sha256','authorization_binding_sha256',
  'activation_authorization_receipt_sha256','authorization_response_text',
  'device_command_sha256','device_proof_transcript_sha256',
  'device_signature_sha256','evidence_binding_sha256','proof_id',
  'request_id','event_id','idempotency_key','request_fingerprint',
  'proof_issued_at','proof_expires_at','state','authorized_at'
];
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'outlook desktop activation challenge is immutable';
  END IF;
  IF jsonb_typeof(NEW.issued_challenge)<>'object'
     OR NOT NEW.issued_challenge ?& ARRAY[
       'activation_binding_sha256','activation_id','activation_mode',
       'approved_release','authenticated_principal','candidate_device',
       'challenge_nonce_base64url','challenge_nonce_sha256','expires_at',
       'hardware_key_attested','issued_at','local_measurement_evidence_sha256',
       'mdm_attested','pilot_policy','remote_app_attested','schema_version'
     ]
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(NEW.issued_challenge) AS key
        WHERE key<>ALL(ARRAY[
          'activation_binding_sha256','activation_id','activation_mode',
          'approved_release','authenticated_principal','candidate_device',
          'challenge_nonce_base64url','challenge_nonce_sha256','expires_at',
          'hardware_key_attested','issued_at','local_measurement_evidence_sha256',
          'mdm_attested','pilot_policy','remote_app_attested','schema_version'
        ]))
     OR NEW.issued_challenge->>'schema_version'<>
        'lawos.outlook-desktop-activation-challenge.v1'
     OR NEW.issued_challenge->>'activation_mode'<>'operator_controlled_macos_v1'
     OR NEW.issued_challenge->'hardware_key_attested'<>'false'::jsonb
     OR NEW.issued_challenge->'mdm_attested'<>'false'::jsonb
     OR NEW.issued_challenge->'remote_app_attested'<>'false'::jsonb
     OR NEW.issued_challenge->>'activation_binding_sha256' !~ '^[a-f0-9]{64}$'
     OR NEW.issued_challenge->>'local_measurement_evidence_sha256'
        !~ '^[a-f0-9]{64}$'
     OR jsonb_typeof(NEW.issued_challenge->'authenticated_principal')<>'object'
     OR NOT (NEW.issued_challenge->'authenticated_principal') ?& ARRAY[
       'entra_subject','entra_tenant_id','lawos_tenant_id','lawos_user_id']
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(
         NEW.issued_challenge->'authenticated_principal') AS key
        WHERE key<>ALL(ARRAY[
          'entra_subject','entra_tenant_id','lawos_tenant_id','lawos_user_id']))
     OR jsonb_typeof(NEW.issued_challenge->'candidate_device')<>'object'
     OR NOT (NEW.issued_challenge->'candidate_device') ?& ARRAY[
       'continuity_key_fingerprint_sha256','continuity_public_key_spki']
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(
         NEW.issued_challenge->'candidate_device') AS key
        WHERE key<>ALL(ARRAY[
          'continuity_key_fingerprint_sha256','continuity_public_key_spki']))
     OR jsonb_typeof(NEW.issued_challenge->'approved_release')<>'object'
     OR jsonb_typeof(NEW.issued_challenge->'pilot_policy')<>'object'
     OR NEW.issued_challenge#>>'{pilot_policy,pilot_id}'<>'jwsuh_canary'
     OR NEW.issued_challenge#>>'{approved_release,platform}'<>'darwin'
     OR NEW.issued_challenge#>>'{approved_release,channel}'<>'formal'
     OR NEW.issued_challenge#>>'{approved_release,app_id}'<>
        'com.amic.matter.desktop'
     OR NEW.issued_challenge#>'{approved_release,valid}'<>'true'::jsonb
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       NEW.issued_challenge->>'issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       NEW.issued_challenge->>'expires_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       NEW.issued_challenge#>>'{approved_release,valid_until}')
     OR NEW.issued_challenge->>'activation_id'<>NEW.activation_reference
     OR NEW.issued_challenge#>>'{authenticated_principal,lawos_tenant_id}'<>
        NEW.tenant_id
     OR NEW.issued_challenge#>>'{authenticated_principal,lawos_user_id}'<>
        NEW.user_id
     OR NEW.issued_challenge#>>'{authenticated_principal,entra_subject}'<>
        NEW.entra_subject_id
     OR NEW.issued_challenge#>>'{candidate_device,continuity_key_fingerprint_sha256}'<>
        NEW.device_key_fingerprint
     OR NEW.issued_challenge#>>'{approved_release,release_artifact_id}'<>
        NEW.release_artifact_id
     OR NEW.issued_challenge#>>'{approved_release,release_ticket_sha256}'<>
        NEW.release_ticket_bytes_sha256
     OR NEW.issued_challenge#>>'{approved_release,release_ticket_signature_sha256}'<>
        NEW.release_ticket_owner_signature_sha256
     OR NEW.issued_challenge->>'challenge_nonce_base64url'<>
        NEW.challenge_nonce_base64url
     OR NEW.issued_challenge->>'challenge_nonce_sha256'<>
        NEW.challenge_nonce_sha256
     OR NEW.issued_challenge->>'local_measurement_evidence_sha256'<>
        NEW.local_measurement_evidence_sha256
     OR (NEW.issued_challenge->>'issued_at')::timestamptz<>NEW.issued_at
     OR (NEW.issued_challenge->>'expires_at')::timestamptz<>NEW.valid_until
     OR (NEW.issued_challenge#>>'{approved_release,valid_until}')::timestamptz<
        NEW.valid_until THEN
    RAISE EXCEPTION 'outlook desktop activation challenge binding invalid';
  END IF;
  challenge_bytes := decode(NEW.issued_challenge_base64,'base64');
  nonce_bytes := decode(
    translate(NEW.challenge_nonce_base64url,'-_','+/')||'=','base64');
  spki_bytes := decode(
    NEW.issued_challenge#>>'{candidate_device,continuity_public_key_spki}',
    'base64');
  release_ticket_bytes := decode(NEW.release_ticket_base64,'base64');
  release_signature_bytes := decode(NEW.release_ticket_signature_base64,'base64');
  IF octet_length(challenge_bytes) NOT BETWEEN 1 AND 65536
     OR replace(encode(challenge_bytes,'base64'),E'\n','')<>
        NEW.issued_challenge_base64
     OR get_byte(challenge_bytes,octet_length(challenge_bytes)-1)<>10
     OR convert_from(challenge_bytes,'UTF8')<>
        lawos_email_dms.outlook_desktop_canonical_json_text(
          NEW.issued_challenge)||E'\n'
     OR convert_from(challenge_bytes,'UTF8')::jsonb IS DISTINCT FROM
        NEW.issued_challenge
     OR encode(pg_catalog.sha256(challenge_bytes),'hex')<>
        NEW.issued_challenge_sha256
     OR octet_length(nonce_bytes)<>32
     OR rtrim(translate(encode(nonce_bytes,'base64'),'+/','-_'),'=')<>
        NEW.challenge_nonce_base64url
     OR encode(pg_catalog.sha256(nonce_bytes),'hex')<>NEW.challenge_nonce_sha256
     OR octet_length(spki_bytes)<>44
     OR encode(spki_bytes,'base64')<>
        NEW.issued_challenge#>>'{candidate_device,continuity_public_key_spki}'
     OR encode(pg_catalog.sha256(spki_bytes),'hex')<>NEW.device_key_fingerprint
     OR octet_length(release_ticket_bytes) NOT BETWEEN 1 AND 65536
     OR replace(encode(release_ticket_bytes,'base64'),E'\n','')<>
        NEW.release_ticket_base64
     OR encode(pg_catalog.sha256(release_ticket_bytes),'hex')<>
        NEW.release_ticket_bytes_sha256
     OR octet_length(release_signature_bytes)<>64
     OR replace(encode(release_signature_bytes,'base64'),E'\n','')<>
        NEW.release_ticket_signature_base64
     OR encode(pg_catalog.sha256(release_signature_bytes),'hex')<>
        NEW.release_ticket_owner_signature_sha256 THEN
    RAISE EXCEPTION 'outlook desktop activation challenge bytes invalid';
  END IF;
  expected_issue_request_sha :=
    lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.outlook-desktop-activation-challenge-request.v1',NEW.tenant_id,
      jsonb_build_object(
        'issued_challenge',NEW.issued_challenge,
        'issued_challenge_base64',NEW.issued_challenge_base64,
        'issued_challenge_sha256',NEW.issued_challenge_sha256,
        'release_ticket_base64',NEW.release_ticket_base64,
        'issue_request_id',NEW.issue_request_id,
        'release_ticket_signature_base64',NEW.release_ticket_signature_base64
      )::text
    ]);
  expected_issue_response := jsonb_build_object(
    'outcome','issued','tenant_id',NEW.tenant_id,
    'activation_reference',NEW.activation_reference,
    'installation_id',NEW.installation_id,
    'issue_request_id',NEW.issue_request_id,
    'registration_event_id',NEW.registration_event_id,
    'release_artifact_id',NEW.release_artifact_id,
    'release_authority_sha256',NEW.release_authority_sha256,
    'challenge_nonce_sha256',NEW.challenge_nonce_sha256,
    'issued_challenge',NEW.issued_challenge,
    'issued_challenge_base64',NEW.issued_challenge_base64,
    'issued_challenge_sha256',NEW.issued_challenge_sha256,
    'issued_at',to_char(NEW.issued_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(NEW.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  SELECT authority_binding_sha256,valid_until
    INTO issue_authority
    FROM lawos_email_dms.outlook_desktop_activation_issue_authorities
   WHERE tenant_id=NEW.tenant_id
     AND release_artifact_id=NEW.release_artifact_id;
  expected_issue_public_response := jsonb_build_object(
    'activation_reference',NEW.activation_reference,
    'installation_id',NEW.installation_id,
    'issue_request_id',NEW.issue_request_id,
    'issued_challenge',NEW.issued_challenge,
    'issued_challenge_sha256',NEW.issued_challenge_sha256,
    'registration_event_id',NEW.registration_event_id,
    'release_authority',jsonb_build_object(
      'authority_binding_sha256',issue_authority.authority_binding_sha256,
      'release_artifact_id',NEW.release_artifact_id,
      'release_authority_sha256',NEW.release_authority_sha256,
      'release_ticket_bytes_sha256',NEW.release_ticket_bytes_sha256,
      'release_ticket_owner_signature_sha256',
        NEW.release_ticket_owner_signature_sha256,
      'valid_until',to_char(issue_authority.valid_until AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ),
    'schema_version','lawos.outlook-desktop-activation-authority-result.v1'
  );
  expected_issue_public_response_text :=
    lawos_email_dms.outlook_desktop_canonical_json_text(
      expected_issue_public_response)||E'\n';
  IF NEW.issue_request_sha256 IS DISTINCT FROM expected_issue_request_sha
     OR NEW.issue_response_text::jsonb IS DISTINCT FROM expected_issue_response
     OR issue_authority.authority_binding_sha256 IS NULL
     OR NEW.issued_challenge#>>'{approved_release,valid_until}'<>
        to_char(issue_authority.valid_until AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
     OR NEW.issue_public_response_base64<>
        replace(encode(convert_to(expected_issue_public_response_text,'UTF8'),
          'base64'),E'\n','') THEN
    RAISE EXCEPTION 'outlook desktop activation issue receipt binding invalid';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.state<>'issued' OR num_nonnulls(
      NEW.attachment_request_id,NEW.attachment_request_sha256,
      NEW.attachment_response_text,NEW.operator_receipt_base64,
      NEW.operator_receipt_sha256,NEW.operator_signature_base64,
      NEW.operator_signature_sha256,
      NEW.device_command_sha256,NEW.device_proof_transcript_sha256,
      NEW.device_signature_sha256,NEW.evidence_binding_sha256,
      NEW.authorization_request_sha256,NEW.authorization_binding_sha256,
      NEW.activation_authorization_receipt_sha256,NEW.authorization_response_text,
      NEW.proof_id,NEW.request_id,NEW.event_id,NEW.idempotency_key,
      NEW.request_fingerprint,NEW.activation_replay_identity,
      NEW.proof_issued_at,NEW.proof_expires_at,
      NEW.lifecycle_registration_consumption,
      NEW.attached_at,NEW.authorized_at,NEW.consumed_at
    )<>0 THEN
      RAISE EXCEPTION 'outlook desktop activation issue state invalid';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.state='issued' AND NEW.state='evidence_attached' THEN
    IF (to_jsonb(NEW)-attach_fields) IS DISTINCT FROM
       (to_jsonb(OLD)-attach_fields)
       OR num_nulls(
         NEW.attachment_request_id,NEW.attachment_request_sha256,
         NEW.attachment_response_text,NEW.operator_receipt_base64,
         NEW.operator_receipt_sha256,NEW.operator_signature_base64,
         NEW.operator_signature_sha256,
         NEW.activation_replay_identity,NEW.attached_at
       )<>0
       OR NEW.attachment_request_id<>NEW.issue_request_id THEN
      RAISE EXCEPTION 'outlook desktop activation evidence transition invalid';
    END IF;
    operator_receipt_bytes := decode(NEW.operator_receipt_base64,'base64');
    operator_signature_bytes := decode(NEW.operator_signature_base64,'base64');
    IF octet_length(operator_receipt_bytes) NOT BETWEEN 1 AND 65536
       OR replace(encode(operator_receipt_bytes,'base64'),E'\n','')<>
          NEW.operator_receipt_base64
       OR encode(pg_catalog.sha256(operator_receipt_bytes),'hex')<>
          NEW.operator_receipt_sha256
       OR octet_length(operator_signature_bytes)<>64
       OR replace(encode(operator_signature_bytes,'base64'),E'\n','')<>
          NEW.operator_signature_base64
       OR encode(pg_catalog.sha256(operator_signature_bytes),'hex')<>
          NEW.operator_signature_sha256
       OR jsonb_typeof(NEW.activation_replay_identity)<>'object'
       OR NOT NEW.activation_replay_identity ?& ARRAY[
         'activation_binding_sha256','activation_id',
         'challenge_nonce_sha256','replay_identity_sha256']
       OR EXISTS (
         SELECT 1 FROM jsonb_object_keys(NEW.activation_replay_identity) AS key
          WHERE key<>ALL(ARRAY[
            'activation_binding_sha256','activation_id',
            'challenge_nonce_sha256','replay_identity_sha256']))
       OR NEW.activation_replay_identity->>'activation_binding_sha256' !~
          '^[a-f0-9]{64}$'
       OR NEW.activation_replay_identity->>'activation_id'<>
          NEW.activation_reference
       OR NEW.activation_replay_identity->>'challenge_nonce_sha256'<>
          NEW.challenge_nonce_sha256
       OR NEW.activation_replay_identity->>'replay_identity_sha256' !~
          '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'outlook desktop activation evidence bytes invalid';
    END IF;
    expected_attachment_request_sha :=
      lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
        'lawos.outlook-desktop-activation-evidence-request.v1',NEW.tenant_id,
        jsonb_build_object(
          'activation_reference',NEW.activation_reference,
          'activation_replay_identity',NEW.activation_replay_identity,
          'installation_id',NEW.installation_id,
          'issued_challenge_sha256',NEW.issued_challenge_sha256,
          'local_measurement_evidence_sha256',
            NEW.local_measurement_evidence_sha256,
          'operator_receipt_base64',NEW.operator_receipt_base64,
          'operator_receipt_sha256',NEW.operator_receipt_sha256,
          'operator_signature_base64',NEW.operator_signature_base64,
          'operator_signature_sha256',NEW.operator_signature_sha256,
          'request_id',NEW.attachment_request_id
        )::text
      ]);
    expected_attachment_response := jsonb_build_object(
      'status','evidence_attached','tenant_id',NEW.tenant_id,
      'activation_reference',NEW.activation_reference,
      'installation_id',NEW.installation_id,
      'issued_challenge_sha256',NEW.issued_challenge_sha256,
      'activation_receipt_sha256',NEW.operator_receipt_sha256,
      'local_measurement_evidence_sha256',
        NEW.local_measurement_evidence_sha256,
      'attached_at',to_char(NEW.attached_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'valid_until',to_char(NEW.valid_until AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
    SELECT * INTO packet_evidence_row
      FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
     WHERE tenant_id=NEW.tenant_id
       AND activation_reference=NEW.activation_reference;
    IF NEW.attachment_request_sha256<>expected_attachment_request_sha
       OR NEW.attachment_response_text::jsonb IS DISTINCT FROM
          expected_attachment_response
       OR NOT FOUND
       OR packet_evidence_row.installation_id<>NEW.installation_id
       OR packet_evidence_row.request_id<>NEW.attachment_request_id
       OR packet_evidence_row.core_request_sha256<>
          expected_attachment_request_sha
       OR packet_evidence_row.operator_receipt_sha256<>
          NEW.operator_receipt_sha256
       OR packet_evidence_row.operator_signature_sha256<>
          NEW.operator_signature_sha256
       OR packet_evidence_row.local_measurement_evidence_sha256<>
          NEW.local_measurement_evidence_sha256
       OR packet_evidence_row.issued_challenge_sha256<>
          NEW.issued_challenge_sha256
       OR packet_evidence_row.persisted_at<>NEW.attached_at
       OR packet_evidence_row.evidence_receipt_sha256<>
          lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
            'lawos.outlook-desktop-activation-operator-packet-evidence-receipt.v1',
            NEW.tenant_id,NEW.activation_reference,NEW.installation_id,
            NEW.attachment_request_id,expected_attachment_request_sha,
            (NEW.issued_challenge->'authenticated_principal')::text,
            NEW.local_measurement_evidence_sha256,
            NEW.operator_receipt_sha256,NEW.operator_signature_sha256,
            packet_evidence_row.owner_operator_packet_sha256,
            NEW.issued_challenge_sha256,
            ((extract(epoch FROM NEW.attached_at)*1000)::bigint)::text
          ]) THEN
      RAISE EXCEPTION 'outlook desktop activation evidence receipt binding invalid';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.state='evidence_attached' AND NEW.state='authorized' THEN
    IF (to_jsonb(NEW)-authorize_fields) IS DISTINCT FROM
       (to_jsonb(OLD)-authorize_fields)
       OR num_nulls(
         NEW.authorization_request_sha256,NEW.authorization_binding_sha256,
         NEW.activation_authorization_receipt_sha256,
         NEW.authorization_response_text,NEW.device_command_sha256,
         NEW.device_proof_transcript_sha256,NEW.device_signature_sha256,
         NEW.evidence_binding_sha256,
         NEW.proof_id,NEW.request_id,NEW.event_id,NEW.idempotency_key,
         NEW.request_fingerprint,NEW.proof_issued_at,NEW.proof_expires_at,
         NEW.authorized_at
       )<>0
       OR NEW.request_id<>NEW.issue_request_id
       OR NEW.idempotency_key<>NEW.issue_request_id
       OR NEW.event_id<>NEW.registration_event_id THEN
      RAISE EXCEPTION 'outlook desktop activation authorization transition invalid';
    END IF;
    expected_evidence_binding :=
      lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
        'lawos.outlook-desktop-activation-evidence-binding.v1',NEW.tenant_id,
        NEW.activation_reference,NEW.installation_id,
        NEW.issued_challenge_sha256,NEW.operator_receipt_sha256,
        NEW.operator_signature_sha256,NEW.local_measurement_evidence_sha256,
        NEW.device_command_sha256,NEW.device_proof_transcript_sha256,
        NEW.device_signature_sha256,NEW.release_authority_sha256
      ]);
    IF NEW.evidence_binding_sha256<>expected_evidence_binding THEN
      RAISE EXCEPTION 'outlook desktop activation authorization evidence invalid';
    END IF;
    SELECT * INTO packet_evidence_row
      FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
     WHERE tenant_id=NEW.tenant_id
       AND activation_reference=NEW.activation_reference;
    IF NOT FOUND
       OR packet_evidence_row.installation_id<>NEW.installation_id
       OR packet_evidence_row.request_id<>NEW.issue_request_id
       OR packet_evidence_row.operator_receipt_sha256<>
          NEW.operator_receipt_sha256
       OR packet_evidence_row.operator_signature_sha256<>
          NEW.operator_signature_sha256
       OR packet_evidence_row.local_measurement_evidence_sha256<>
          NEW.local_measurement_evidence_sha256
       OR packet_evidence_row.issued_challenge_sha256<>
          NEW.issued_challenge_sha256
       OR packet_evidence_row.persisted_at<>NEW.attached_at THEN
      RAISE EXCEPTION 'outlook desktop activation authorization evidence invalid';
    END IF;
    expected_authorization_request_sha :=
      lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
        'lawos.outlook-desktop-activation-authorization-request.v2',
        NEW.tenant_id,jsonb_build_object(
          'activation_reference',NEW.activation_reference,
          'challenge_nonce_sha256',NEW.challenge_nonce_sha256,
          'device_command_sha256',NEW.device_command_sha256,
          'device_key_fingerprint',NEW.device_key_fingerprint,
          'device_proof_transcript_sha256',NEW.device_proof_transcript_sha256,
          'device_public_key_spki_sha256',NEW.device_public_key_spki_sha256,
          'device_signature_sha256',NEW.device_signature_sha256,
          'entra_subject_id',NEW.entra_subject_id,'event_id',NEW.event_id,
          'evidence_binding_sha256',NEW.evidence_binding_sha256,
          'idempotency_key',NEW.idempotency_key,
          'installation_id',NEW.installation_id,
          'issued_challenge_sha256',NEW.issued_challenge_sha256,
          'proof_expires_at',to_char(NEW.proof_expires_at AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'proof_id',NEW.proof_id,'request_fingerprint',NEW.request_fingerprint,
          'proof_issued_at',to_char(NEW.proof_issued_at AT TIME ZONE 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'request_id',NEW.request_id,
          'user_id',NEW.user_id
        )::text
      ]);
    SELECT * INTO authorization_row
      FROM lawos_email_dms.outlook_desktop_activation_authorizations
     WHERE tenant_id=NEW.tenant_id
       AND activation_authorization_id=NEW.activation_reference;
    IF NOT FOUND
       OR authorization_row.installation_id<>NEW.installation_id
       OR authorization_row.authorization_binding_sha256<>
          NEW.authorization_binding_sha256
       OR authorization_row.activation_receipt_sha256<>
          NEW.operator_receipt_sha256
       OR authorization_row.activation_authorization_receipt_sha256<>
          NEW.activation_authorization_receipt_sha256
       OR authorization_row.owner_operator_packet_sha256<>
          packet_evidence_row.owner_operator_packet_sha256
       OR authorization_row.evidence_receipt_sha256<>
          packet_evidence_row.evidence_receipt_sha256
       OR authorization_row.response_text<>NEW.authorization_response_text
       OR NEW.authorization_request_sha256<>expected_authorization_request_sha THEN
      RAISE EXCEPTION 'outlook desktop activation authorization receipt binding invalid';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.state='authorized' AND NEW.state='consumed' THEN
    IF (to_jsonb(NEW)-ARRAY[
         'state','consumed_at','lifecycle_registration_consumption'])
       IS DISTINCT FROM
       (to_jsonb(OLD)-ARRAY[
         'state','consumed_at','lifecycle_registration_consumption'])
       OR NEW.consumed_at IS NULL
       OR NEW.lifecycle_registration_consumption IS NULL
       OR NEW.lifecycle_registration_consumption IS DISTINCT FROM jsonb_build_object(
         'activation_reference',NEW.activation_reference,
         'installation_id',NEW.installation_id,
         'lifecycle_authorization_id',
           NEW.lifecycle_registration_consumption->>'lifecycle_authorization_id',
         'resulting_state_version',
           (NEW.lifecycle_registration_consumption->>'resulting_state_version')::bigint,
         'consumed_at',to_char(NEW.consumed_at AT TIME ZONE 'UTC',
           'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
       )
       OR NOT EXISTS (
         SELECT 1 FROM lawos_email_dms.outlook_desktop_activation_authorizations AS auth
         JOIN lawos_email_dms.outlook_desktop_lifecycle_authorizations AS lifecycle
           ON lifecycle.tenant_id=auth.tenant_id
          AND lifecycle.activation_authorization_id=auth.activation_authorization_id
          WHERE auth.tenant_id=NEW.tenant_id
            AND auth.activation_authorization_id=NEW.activation_reference
            AND auth.consumed_at=NEW.consumed_at
            AND auth.consumed_installation_id=NEW.installation_id
            AND lifecycle.lifecycle_authorization_id=
              NEW.lifecycle_registration_consumption->>'lifecycle_authorization_id'
            AND lifecycle.resulting_state_version=
              (NEW.lifecycle_registration_consumption->>'resulting_state_version')::bigint
       ) THEN
      RAISE EXCEPTION 'outlook desktop activation consumption transition invalid';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'outlook desktop activation challenge is immutable';
END
$$;

CREATE TRIGGER outlook_desktop_activation_challenge_binding
  BEFORE INSERT OR UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_activation_challenges
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.enforce_outlook_desktop_activation_challenge();

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_activation_authorization()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,lawos_email_dms
AS $$
DECLARE expected_binding text;
DECLARE expected_receipt text;
DECLARE expected_request text;
DECLARE reservation lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE packet_evidence_row
  lawos_email_dms.outlook_desktop_activation_operator_packet_evidence%ROWTYPE;
BEGIN
  expected_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-authorization.v2', NEW.tenant_id,
    NEW.activation_authorization_id,NEW.installation_id,
    NEW.user_id,NEW.entra_subject_id,
    NEW.device_key_fingerprint,NEW.device_public_key_spki_sha256,
    NEW.device_proof_request_sha256,NEW.device_proof_transcript_sha256,
    NEW.server_nonce_sha256,NEW.device_signature_sha256,
    NEW.issued_challenge_sha256,NEW.evidence_binding_sha256,
    NEW.activation_receipt_sha256,NEW.owner_operator_packet_sha256,
    NEW.evidence_receipt_sha256,
    NEW.proof_id,NEW.request_id,NEW.event_id,NEW.idempotency_key,
    NEW.request_fingerprint,
    NEW.release_artifact_id,NEW.release_ticket_bytes_sha256,
    NEW.release_ticket_owner_signature_sha256,NEW.approval_audit_event_id,
    NEW.approval_audit_event_binding_sha256,NEW.release_authority_sha256,
    NEW.local_measurement_evidence_sha256,
    ((extract(epoch FROM NEW.proof_issued_at)*1000)::bigint)::text,
    ((extract(epoch FROM NEW.proof_expires_at)*1000)::bigint)::text,
    ((extract(epoch FROM NEW.authorized_at)*1000)::bigint)::text,
    ((extract(epoch FROM NEW.valid_from)*1000)::bigint)::text,
    ((extract(epoch FROM NEW.valid_until)*1000)::bigint)::text
  ]);
  expected_receipt := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-authorization-receipt.v2',NEW.tenant_id,
    NEW.activation_authorization_id,NEW.installation_id,NEW.user_id,
    NEW.entra_subject_id,NEW.device_key_fingerprint,
    NEW.issued_challenge_sha256,NEW.evidence_binding_sha256,
    NEW.owner_operator_packet_sha256,NEW.evidence_receipt_sha256,
    NEW.proof_id,NEW.request_id,NEW.event_id,NEW.idempotency_key,
    NEW.request_fingerprint,NEW.release_authority_sha256,
    ((extract(epoch FROM NEW.authorized_at)*1000)::bigint)::text,
    ((extract(epoch FROM NEW.valid_until)*1000)::bigint)::text
  ]);
  expected_request := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-authorization-request.v2',NEW.tenant_id,
    jsonb_build_object(
      'activation_reference',NEW.activation_authorization_id,
      'challenge_nonce_sha256',NEW.server_nonce_sha256,
      'device_command_sha256',NEW.device_proof_request_sha256,
      'device_key_fingerprint',NEW.device_key_fingerprint,
      'device_proof_transcript_sha256',NEW.device_proof_transcript_sha256,
      'device_public_key_spki_sha256',NEW.device_public_key_spki_sha256,
      'device_signature_sha256',NEW.device_signature_sha256,
      'entra_subject_id',NEW.entra_subject_id,'event_id',NEW.event_id,
      'evidence_binding_sha256',NEW.evidence_binding_sha256,
      'idempotency_key',NEW.idempotency_key,'installation_id',NEW.installation_id,
      'issued_challenge_sha256',NEW.issued_challenge_sha256,
      'proof_expires_at',to_char(NEW.proof_expires_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'proof_id',NEW.proof_id,'request_fingerprint',NEW.request_fingerprint,
      'proof_issued_at',to_char(NEW.proof_issued_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'request_id',NEW.request_id,'user_id',NEW.user_id
    )::text
  ]);
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=NEW.tenant_id
     AND activation_reference=NEW.activation_authorization_id;
  SELECT * INTO packet_evidence_row
    FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
   WHERE tenant_id=NEW.tenant_id
     AND activation_reference=NEW.activation_authorization_id;
  IF NEW.authorization_binding_sha256<>expected_binding
     OR NEW.activation_authorization_receipt_sha256<>expected_receipt
     OR NEW.activation_receipt_sha256<>reservation.operator_receipt_sha256
     OR packet_evidence_row.activation_reference IS NULL
     OR NEW.owner_operator_packet_sha256<>
        packet_evidence_row.owner_operator_packet_sha256
     OR NEW.evidence_receipt_sha256<>
        packet_evidence_row.evidence_receipt_sha256
     OR packet_evidence_row.installation_id<>NEW.installation_id
     OR packet_evidence_row.request_id<>NEW.request_id
     OR packet_evidence_row.operator_receipt_sha256<>
        NEW.activation_receipt_sha256
     OR packet_evidence_row.local_measurement_evidence_sha256<>
        NEW.local_measurement_evidence_sha256
     OR packet_evidence_row.issued_challenge_sha256<>
        NEW.issued_challenge_sha256
     OR NEW.request_sha256<>expected_request
     OR NEW.response_text::jsonb IS DISTINCT FROM jsonb_build_object(
       'outcome','authorized','tenant_id',NEW.tenant_id,
       'activation_reference',NEW.activation_authorization_id,
       'installation_id',NEW.installation_id,
       'authorization_binding_sha256',NEW.authorization_binding_sha256,
       'activation_receipt_sha256',NEW.activation_receipt_sha256,
       'activation_authorization_receipt_sha256',
         NEW.activation_authorization_receipt_sha256,
       'release_authority_sha256',NEW.release_authority_sha256,
       'release_artifact_id',NEW.release_artifact_id,
       'authorized_at',to_char(NEW.authorized_at AT TIME ZONE 'UTC',
         'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
       'valid_until',to_char(NEW.valid_until AT TIME ZONE 'UTC',
         'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
     OR NOT FOUND
     OR (TG_OP='INSERT' AND reservation.state<>'evidence_attached')
     OR (TG_OP='UPDATE' AND reservation.state<>'authorized')
     OR ROW(reservation.installation_id,reservation.user_id,
       reservation.entra_subject_id,reservation.device_key_fingerprint,
       reservation.device_public_key_spki_sha256,
       reservation.challenge_nonce_sha256,reservation.release_artifact_id,
       reservation.release_ticket_bytes_sha256,
       reservation.release_ticket_owner_signature_sha256,
       reservation.release_authority_sha256,
       reservation.local_measurement_evidence_sha256,
       reservation.issued_challenge_sha256)
       IS DISTINCT FROM ROW(NEW.installation_id,NEW.user_id,
       NEW.entra_subject_id,NEW.device_key_fingerprint,
       NEW.device_public_key_spki_sha256,NEW.server_nonce_sha256,
       NEW.release_artifact_id,NEW.release_ticket_bytes_sha256,
       NEW.release_ticket_owner_signature_sha256,NEW.release_authority_sha256,
       NEW.local_measurement_evidence_sha256,NEW.issued_challenge_sha256) THEN
    RAISE EXCEPTION 'outlook desktop activation authorization binding mismatch';
  END IF;
  IF TG_OP='UPDATE' AND (
    OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
    OR NEW.consumed_installation_id IS NULL
    OR (to_jsonb(NEW)-'consumed_at'-'consumed_installation_id')
       IS DISTINCT FROM
       (to_jsonb(OLD)-'consumed_at'-'consumed_installation_id')
  ) THEN
    RAISE EXCEPTION 'outlook desktop activation authorization is single-use';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER outlook_desktop_activation_authorization_binding
  BEFORE INSERT OR UPDATE
  ON lawos_email_dms.outlook_desktop_activation_authorizations
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.enforce_outlook_desktop_activation_authorization();
CREATE TRIGGER outlook_desktop_activation_authorization_no_delete
  BEFORE DELETE ON lawos_email_dms.outlook_desktop_activation_authorizations
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_lifecycle_challenge()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog,lawos_email_dms
AS $$
DECLARE challenge_bytes bytea;
DECLARE nonce_bytes bytea;
DECLARE expected_challenge jsonb;
DECLARE expected_response jsonb;
BEGIN
  IF TG_OP='DELETE' THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge is immutable';
  END IF;
  expected_challenge := jsonb_build_object(
    'schema_version','lawos.outlook-desktop-lifecycle-challenge.v1',
    'tenant_id',NEW.tenant_id,'user_id',NEW.user_id,
    'entra_subject_id',NEW.entra_subject_id,
    'installation_id',NEW.installation_id,
    'device_key_fingerprint',NEW.device_key_fingerprint,
    'operation',NEW.operation,'expected_state_version',NEW.expected_state_version,
    'request_id',NEW.request_id,'event_id',NEW.event_id,
    'idempotency_key',NEW.idempotency_key,
    'lifecycle_challenge_id',NEW.lifecycle_challenge_id,
    'challenge_nonce_base64url',NEW.challenge_nonce_base64url,
    'challenge_nonce_sha256',NEW.challenge_nonce_sha256,
    'retire_intent_id',NEW.retire_intent_id,
    'release_authority_sha256',NEW.release_authority_sha256,
    'issued_at',to_char(NEW.issued_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(NEW.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  challenge_bytes := decode(NEW.issued_challenge_base64,'base64');
  nonce_bytes := decode(
    translate(NEW.challenge_nonce_base64url,'-_','+/')||'=','base64');
  expected_response := expected_challenge || jsonb_build_object(
    'outcome','issued','issued_challenge',expected_challenge,
    'issued_challenge_base64',NEW.issued_challenge_base64,
    'issued_challenge_sha256',NEW.issued_challenge_sha256
  );
  IF NEW.issued_challenge IS DISTINCT FROM expected_challenge
     OR octet_length(challenge_bytes) NOT BETWEEN 1 AND 65536
     OR replace(encode(challenge_bytes,'base64'),E'\n','')<>
        NEW.issued_challenge_base64
     OR get_byte(challenge_bytes,octet_length(challenge_bytes)-1)<>10
     OR convert_from(challenge_bytes,'UTF8')::jsonb IS DISTINCT FROM
        expected_challenge
     OR encode(pg_catalog.sha256(challenge_bytes),'hex')<>
        NEW.issued_challenge_sha256
     OR octet_length(nonce_bytes)<>32
     OR rtrim(translate(encode(nonce_bytes,'base64'),'+/','-_'),'=')<>
        NEW.challenge_nonce_base64url
     OR encode(pg_catalog.sha256(nonce_bytes),'hex')<>NEW.challenge_nonce_sha256
     OR NEW.request_sha256 IS DISTINCT FROM
        lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
          'lawos.outlook-desktop-lifecycle-challenge-request.v1',NEW.tenant_id,
          jsonb_build_object(
            'device_key_fingerprint',NEW.device_key_fingerprint,
            'entra_subject_id',NEW.entra_subject_id,'event_id',NEW.event_id,
            'expected_state_version',NEW.expected_state_version,
            'idempotency_key',NEW.idempotency_key,
            'installation_id',NEW.installation_id,'operation',NEW.operation,
            'request_id',NEW.request_id,'user_id',NEW.user_id
          )::text
        ])
     OR NEW.response_text::jsonb IS DISTINCT FROM expected_response THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge binding invalid';
  END IF;
  IF TG_OP='INSERT' THEN
    IF NEW.consumed_at IS NOT NULL OR NEW.lifecycle_authorization_id IS NOT NULL THEN
      RAISE EXCEPTION 'outlook desktop lifecycle challenge issue state invalid';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
     OR NEW.lifecycle_authorization_id IS NULL
     OR (to_jsonb(NEW)-ARRAY['consumed_at','lifecycle_authorization_id'])
        IS DISTINCT FROM
        (to_jsonb(OLD)-ARRAY['consumed_at','lifecycle_authorization_id'])
     OR NOT EXISTS (
       SELECT 1
         FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations AS auth
        WHERE auth.tenant_id=NEW.tenant_id
          AND auth.lifecycle_authorization_id=NEW.lifecycle_authorization_id
          AND auth.lifecycle_challenge_id=NEW.lifecycle_challenge_id
          AND auth.issued_challenge_sha256=NEW.issued_challenge_sha256
     ) THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge consumption invalid';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER outlook_desktop_lifecycle_challenge_binding
  BEFORE INSERT OR UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_lifecycle_challenges
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.enforce_outlook_desktop_lifecycle_challenge();

CREATE OR REPLACE FUNCTION
lawos_email_dms.publish_outlook_desktop_activation_issue_authority(
  bound_tenant_id text,
  bound_publication jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing lawos_email_dms.outlook_desktop_activation_issue_authorities%ROWTYPE;
DECLARE release record;
DECLARE owner_principal_id_value text;
DECLARE release_artifact_id_value text;
DECLARE request_id_value text;
DECLARE request_sha text;
DECLARE release_authority_sha text;
DECLARE authority_binding_sha text;
DECLARE release_ticket_sha text;
DECLARE release_ticket_signature_sha text;
DECLARE now_at timestamptz;
DECLARE valid_until_value timestamptz;
DECLARE response_text_value text;
DECLARE required_keys constant text[] := ARRAY[
  'macos_code_directory_sha256','macos_designated_requirement_sha256',
  'pilot_policy','release_artifact_id','release_ticket_base64',
  'release_ticket_signature_base64','request_id'
];
DECLARE policy_keys constant text[] := ARRAY[
  'owner_principal_id','pilot_id','policy_revision','roster_sha256'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_publication)<>'object'
     OR NOT bound_publication ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_publication) AS key
                 WHERE key<>ALL(required_keys))
     OR jsonb_typeof(bound_publication->'pilot_policy')<>'object'
     OR NOT (bound_publication->'pilot_policy') ?& policy_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(
          bound_publication->'pilot_policy') AS key WHERE key<>ALL(policy_keys))
     OR bound_publication->>'release_artifact_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_publication->>'request_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_publication#>>'{pilot_policy,owner_principal_id}'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_publication#>>'{pilot_policy,pilot_id}'<>'jwsuh_canary'
     OR jsonb_typeof(bound_publication#>'{pilot_policy,policy_revision}')<>
        'string'
     OR bound_publication#>>'{pilot_policy,policy_revision}'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_publication#>>'{pilot_policy,roster_sha256}' !~ '^[a-f0-9]{64}$'
     OR bound_publication->>'macos_code_directory_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_publication->>'macos_designated_requirement_sha256'
        !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority publication shape invalid';
  END IF;
  release_artifact_id_value := bound_publication->>'release_artifact_id';
  request_id_value := bound_publication->>'request_id';
  owner_principal_id_value :=
    bound_publication#>>'{pilot_policy,owner_principal_id}';
  BEGIN
    release_ticket_sha := encode(pg_catalog.sha256(decode(
      bound_publication->>'release_ticket_base64','base64')),'hex');
    release_ticket_signature_sha := encode(pg_catalog.sha256(decode(
      bound_publication->>'release_ticket_signature_base64','base64')),'hex');
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority ticket invalid';
  END;
  IF octet_length(decode(bound_publication->>'release_ticket_base64','base64'))
       NOT BETWEEN 1 AND 65536
     OR replace(encode(decode(bound_publication->>'release_ticket_base64',
          'base64'),'base64'),E'\n','')<>
        bound_publication->>'release_ticket_base64'
     OR octet_length(decode(
          bound_publication->>'release_ticket_signature_base64','base64'))<>64
     OR replace(encode(decode(
          bound_publication->>'release_ticket_signature_base64','base64'),
          'base64'),E'\n','')<>
        bound_publication->>'release_ticket_signature_base64' THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority ticket invalid';
  END IF;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-issue-authority-publication-request.v1',
    bound_tenant_id,bound_publication::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-issue-authority-request'||
    chr(31)||request_id_value,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    release_artifact_id_value,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||owner_principal_id_value||chr(31)||
    owner_principal_id_value,0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_activation_issue_authorities AS stored
   WHERE stored.tenant_id=bound_tenant_id
     AND (stored.release_artifact_id=release_artifact_id_value
          OR stored.request_id=request_id_value)
   ORDER BY stored.release_artifact_id
   LIMIT 1;
  IF FOUND THEN
    IF existing.release_artifact_id<>release_artifact_id_value
       OR existing.request_id<>request_id_value
       OR existing.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop activation issue authority replay conflict'
        USING ERRCODE='LAC01';
    END IF;
    RETURN existing.response_text::jsonb;
  END IF;
  SELECT artifact.*,
         audit.event_id AS approval_audit_event_id,
         audit.event_binding_sha256 AS approval_audit_event_binding_sha256,
         policy.user_id AS policy_user_id,
         policy.entra_subject_id AS policy_entra_subject_id,
         policy.rollout_stage AS policy_rollout_stage,
         policy.maximum_entitled AS policy_maximum_entitled,
         policy.rollout_authorized AS policy_rollout_authorized,
         policy.account_active AS policy_account_active,
         policy.release_allowed AS policy_release_allowed,
         policy.policy_revision AS policy_revision,
         policy.roster_binding_sha256 AS roster_binding_sha256,
         policy.policy_binding_sha256 AS policy_binding_sha256,
         policy.valid_from AS policy_valid_from,
         policy.valid_until AS policy_valid_until,
         roster.valid_from AS roster_valid_from,
         roster.valid_until AS roster_valid_until
    INTO release
    FROM lawos_email_dms.outlook_desktop_release_artifacts AS artifact
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
      ON audit.tenant_id=artifact.tenant_id
     AND audit.release_artifact_id=artifact.release_artifact_id
     AND audit.event_type='approved'
    JOIN lawos_email_dms.outlook_desktop_assignment_policies AS policy
      ON policy.tenant_id=artifact.tenant_id
     AND policy.user_id=owner_principal_id_value
    JOIN lawos_email_dms.outlook_desktop_assignment_rosters AS roster
      ON roster.tenant_id=policy.tenant_id
     AND roster.roster_version=policy.roster_version
     AND roster.roster_binding_sha256=policy.roster_binding_sha256
    JOIN lawos_email_dms.outlook_desktop_assignment_roster_members AS member
      ON member.tenant_id=policy.tenant_id
     AND member.roster_version=policy.roster_version
     AND member.user_id=policy.user_id
     AND member.entra_subject_id=policy.entra_subject_id
   WHERE artifact.tenant_id=bound_tenant_id
     AND artifact.release_artifact_id=release_artifact_id_value
   FOR UPDATE OF artifact,policy,roster,member;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR release.revoked_at IS NOT NULL
     OR release.platform<>'darwin' OR release.channel<>'formal'
     OR release.valid_from>now_at OR release.valid_until<=now_at
     OR release.policy_valid_from>now_at OR release.policy_valid_until<=now_at
     OR release.roster_valid_from>now_at OR release.roster_valid_until<=now_at
     OR release.policy_rollout_stage<>'jwsuh_canary'
     OR NOT release.policy_maximum_entitled
     OR NOT release.policy_rollout_authorized
     OR NOT release.policy_account_active OR NOT release.policy_release_allowed
     OR release.policy_user_id<>owner_principal_id_value
     OR release_ticket_sha<>release.embedded_release_ticket_sha256
     OR release_ticket_signature_sha<>
        release.embedded_release_ticket_signature_sha256
     OR bound_publication#>>'{pilot_policy,roster_sha256}'<>
        release.roster_binding_sha256 THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority is not current';
  END IF;
  release_authority_sha :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,release_artifact_id_value);
  valid_until_value := LEAST(
    release.valid_until,release.policy_valid_until,release.roster_valid_until);
  authority_binding_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-issue-authority.v1',bound_tenant_id,
    release_artifact_id_value,release_authority_sha,release_ticket_sha,
    release_ticket_signature_sha,
    bound_publication->>'macos_code_directory_sha256',
    bound_publication->>'macos_designated_requirement_sha256',
    owner_principal_id_value,'jwsuh_canary',
    bound_publication#>>'{pilot_policy,policy_revision}',
    release.roster_binding_sha256,release.policy_binding_sha256,
    release.approval_audit_event_binding_sha256,
    ((extract(epoch FROM now_at)*1000)::bigint)::text,
    ((extract(epoch FROM valid_until_value)*1000)::bigint)::text
  ]);
  response_text_value := jsonb_build_object(
    'authority_binding_sha256',authority_binding_sha,
    'outcome','published','published_at',to_char(now_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'release_artifact_id',release_artifact_id_value,
    'release_authority_sha256',release_authority_sha,
    'request_id',request_id_value,'tenant_id',bound_tenant_id,
    'valid_until',to_char(valid_until_value AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )::text;
  INSERT INTO lawos_email_dms.outlook_desktop_activation_issue_authorities(
    tenant_id,release_artifact_id,request_id,request_sha256,pilot_policy,
    macos_code_directory_sha256,macos_designated_requirement_sha256,
    release_ticket_base64,release_ticket_signature_base64,
    release_ticket_bytes_sha256,release_ticket_owner_signature_sha256,
    approval_audit_event_id,approval_audit_event_binding_sha256,
    policy_binding_sha256,release_authority_sha256,authority_binding_sha256,
    response_text,published_at,valid_until
  ) VALUES (
    bound_tenant_id,release_artifact_id_value,request_id_value,request_sha,
    bound_publication->'pilot_policy',
    bound_publication->>'macos_code_directory_sha256',
    bound_publication->>'macos_designated_requirement_sha256',
    bound_publication->>'release_ticket_base64',
    bound_publication->>'release_ticket_signature_base64',release_ticket_sha,
    release_ticket_signature_sha,release.approval_audit_event_id,
    release.approval_audit_event_binding_sha256,release.policy_binding_sha256,
    release_authority_sha,authority_binding_sha,response_text_value,now_at,
    valid_until_value
  );
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION
lawos_email_dms.load_current_outlook_desktop_activation_issue_authority(
  bound_tenant_id text,
  bound_request jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE reservation lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE authority record;
DECLARE principal jsonb;
DECLARE device jsonb;
DECLARE issue_request_id_value text;
DECLARE expected_fingerprint text;
DECLARE expected_release_authority text;
DECLARE now_at timestamptz;
DECLARE approved_release jsonb;
DECLARE required_keys constant text[] := ARRAY[
  'authenticated_principal','candidate_device','issue_request_id',
  'request_fingerprint_sha256'
];
DECLARE principal_keys constant text[] := ARRAY[
  'entra_subject','entra_tenant_id','lawos_tenant_id','lawos_user_id'
];
DECLARE device_keys constant text[] := ARRAY[
  'continuity_key_fingerprint_sha256','continuity_public_key_spki'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_request)<>'object'
     OR NOT bound_request ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_request) AS key
                 WHERE key<>ALL(required_keys))
     OR jsonb_typeof(bound_request->'authenticated_principal')<>'object'
     OR NOT (bound_request->'authenticated_principal') ?& principal_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(
          bound_request->'authenticated_principal') AS key
          WHERE key<>ALL(principal_keys))
     OR jsonb_typeof(bound_request->'candidate_device')<>'object'
     OR NOT (bound_request->'candidate_device') ?& device_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(
          bound_request->'candidate_device') AS key WHERE key<>ALL(device_keys))
     OR bound_request->>'issue_request_id' !~ '^oar_[A-Za-z0-9_-]{20,128}$'
     OR bound_request->>'request_fingerprint_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_request#>>'{authenticated_principal,lawos_tenant_id}'<>
        bound_tenant_id
     OR bound_request#>>'{authenticated_principal,lawos_user_id}'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_request#>>'{authenticated_principal,entra_subject}'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_request#>>'{authenticated_principal,entra_tenant_id}'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_request#>>'{candidate_device,continuity_key_fingerprint_sha256}'
        !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority load shape invalid';
  END IF;
  principal := bound_request->'authenticated_principal';
  device := bound_request->'candidate_device';
  issue_request_id_value := bound_request->>'issue_request_id';
  BEGIN
    IF octet_length(decode(device->>'continuity_public_key_spki','base64'))<>44
       OR replace(encode(decode(device->>'continuity_public_key_spki','base64'),
            'base64'),E'\n','')<>device->>'continuity_public_key_spki'
       OR encode(pg_catalog.sha256(decode(
            device->>'continuity_public_key_spki','base64')),'hex')<>
          device->>'continuity_key_fingerprint_sha256' THEN
      RAISE EXCEPTION 'outlook desktop activation issue authority device invalid';
    END IF;
  EXCEPTION WHEN invalid_parameter_value OR data_exception THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority device invalid';
  END;
  expected_fingerprint := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-issue-authority-load-request.v1',
    bound_tenant_id,principal->>'lawos_user_id',principal->>'entra_subject',
    principal->>'entra_tenant_id',
    device->>'continuity_key_fingerprint_sha256',
    device->>'continuity_public_key_spki',issue_request_id_value
  ]);
  IF expected_fingerprint<>bound_request->>'request_fingerprint_sha256' THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority replay conflict'
      USING ERRCODE='LAC01';
  END IF;
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=bound_tenant_id AND issue_request_id=issue_request_id_value;
  IF FOUND THEN
    IF reservation.user_id<>principal->>'lawos_user_id'
       OR reservation.entra_subject_id<>principal->>'entra_subject'
       OR reservation.issued_challenge#>>
            '{authenticated_principal,entra_tenant_id}'<>
          principal->>'entra_tenant_id'
       OR reservation.device_key_fingerprint<>
          device->>'continuity_key_fingerprint_sha256'
       OR reservation.issued_challenge#>>
            '{candidate_device,continuity_public_key_spki}'<>
          device->>'continuity_public_key_spki' THEN
      RAISE EXCEPTION 'outlook desktop activation issue authority replay conflict'
        USING ERRCODE='LAC01';
    END IF;
    RETURN jsonb_build_object(
      'outcome','replay','request_fingerprint_sha256',expected_fingerprint,
      'response_base64',reservation.issue_public_response_base64
    );
  END IF;
  SELECT published.*,
         artifact.release_ticket_id,artifact.platform,artifact.channel,
         artifact.app_version,artifact.app_id,artifact.arch,artifact.source_sha,
         artifact.source_tree,artifact.embedded_build_manifest_sha256,
         artifact.embedded_inner_artifact_sha256,
         artifact.embedded_inner_artifact_bytes,artifact.final_artifact_sha256,
         artifact.final_artifact_bytes,artifact.approval_sha256,
         artifact.trust_registry_sha256,artifact.trust_registry_serial,
         artifact.macos_team_id,artifact.macos_technical_evidence_sha256,
         artifact.valid_from AS release_valid_from,
         artifact.valid_until AS release_valid_until,artifact.revoked_at,
         audit.event_binding_sha256 AS current_audit_binding_sha256,
         policy.policy_binding_sha256 AS current_policy_binding_sha256,
         policy.rollout_stage AS policy_rollout_stage,
         policy.maximum_entitled AS policy_maximum_entitled,
         policy.rollout_authorized AS policy_rollout_authorized,
         policy.account_active AS policy_account_active,
         policy.release_allowed AS policy_release_allowed,
         policy.policy_revision AS policy_revision,
         policy.roster_binding_sha256 AS roster_binding_sha256,
         policy.valid_from AS policy_valid_from,
         policy.valid_until AS policy_valid_until,
         roster.valid_from AS roster_valid_from,
         roster.valid_until AS roster_valid_until
    INTO authority
    FROM lawos_email_dms.outlook_desktop_activation_issue_authorities AS published
    JOIN lawos_email_dms.outlook_desktop_release_artifacts AS artifact
      ON artifact.tenant_id=published.tenant_id
     AND artifact.release_artifact_id=published.release_artifact_id
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
      ON audit.tenant_id=published.tenant_id
     AND audit.event_id=published.approval_audit_event_id
     AND audit.event_type='approved'
    JOIN lawos_email_dms.outlook_desktop_assignment_policies AS policy
      ON policy.tenant_id=published.tenant_id
     AND policy.user_id=principal->>'lawos_user_id'
     AND policy.entra_subject_id=principal->>'entra_subject'
    JOIN lawos_email_dms.outlook_desktop_assignment_rosters AS roster
      ON roster.tenant_id=policy.tenant_id
     AND roster.roster_version=policy.roster_version
     AND roster.roster_binding_sha256=policy.roster_binding_sha256
    JOIN lawos_email_dms.outlook_desktop_assignment_roster_members AS member
      ON member.tenant_id=policy.tenant_id
     AND member.roster_version=policy.roster_version
     AND member.user_id=policy.user_id
     AND member.entra_subject_id=policy.entra_subject_id
   WHERE published.tenant_id=bound_tenant_id;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR authority.revoked_at IS NOT NULL
     OR authority.release_valid_from>now_at OR authority.release_valid_until<=now_at
     OR authority.policy_valid_from>now_at OR authority.policy_valid_until<=now_at
     OR authority.roster_valid_from>now_at OR authority.roster_valid_until<=now_at
     OR authority.valid_until<=now_at
     OR authority.current_audit_binding_sha256<>
        authority.approval_audit_event_binding_sha256
     OR authority.current_policy_binding_sha256<>authority.policy_binding_sha256
     OR authority.policy_rollout_stage NOT IN ('jwsuh_canary','expanded')
     OR NOT authority.policy_maximum_entitled
     OR NOT authority.policy_rollout_authorized
     OR NOT authority.policy_account_active
     OR NOT authority.policy_release_allowed THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority is unavailable';
  END IF;
  expected_release_authority :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,authority.release_artifact_id);
  IF expected_release_authority<>authority.release_authority_sha256 THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority is unavailable';
  END IF;
  approved_release := jsonb_build_object(
    'app_id',authority.app_id,'app_version',authority.app_version,
    'approval_sha256',authority.approval_sha256,'arch',authority.arch,
    'channel',authority.channel,
    'embedded_build_manifest_sha256',authority.embedded_build_manifest_sha256,
    'macos_code_directory_sha256',authority.macos_code_directory_sha256,
    'macos_designated_requirement_sha256',
      authority.macos_designated_requirement_sha256,
    'macos_team_id',authority.macos_team_id,
    'macos_technical_evidence_sha256',authority.macos_technical_evidence_sha256,
    'measured_inner_artifact_bytes',authority.embedded_inner_artifact_bytes,
    'measured_inner_artifact_sha256',authority.embedded_inner_artifact_sha256,
    'platform',authority.platform,
    'registered_final_artifact_bytes',authority.final_artifact_bytes,
    'registered_final_artifact_sha256',authority.final_artifact_sha256,
    'release_artifact_id',authority.release_artifact_id,
    'release_ticket_id',authority.release_ticket_id,
    'release_ticket_sha256',authority.release_ticket_bytes_sha256,
    'release_ticket_signature_sha256',
      authority.release_ticket_owner_signature_sha256,
    'source_sha',authority.source_sha,'source_tree',authority.source_tree,
    'tenant_id',bound_tenant_id,
    'trust_registry_serial',authority.trust_registry_serial,
    'trust_registry_sha256',authority.trust_registry_sha256,
    'valid',true,'valid_until',to_char(authority.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  RETURN jsonb_build_object(
    'approved_release',approved_release,
    'authority_binding_sha256',authority.authority_binding_sha256,
    'outcome','ready','pilot_policy',authority.pilot_policy,
    'release_artifact_id',authority.release_artifact_id,
    'release_authority_sha256',authority.release_authority_sha256,
    'release_ticket_base64',authority.release_ticket_base64,
    'release_ticket_bytes_sha256',authority.release_ticket_bytes_sha256,
    'release_ticket_owner_signature_sha256',
      authority.release_ticket_owner_signature_sha256,
    'release_ticket_signature_base64',authority.release_ticket_signature_base64,
    'request_fingerprint_sha256',expected_fingerprint,
    'schema_version','lawos.outlook-desktop-activation-issue-authority.v1',
    'tenant_id',bound_tenant_id,
    'valid_until',to_char(authority.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.issue_outlook_desktop_activation_challenge(
  bound_tenant_id text,
  bound_issue jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE release record;
DECLARE challenge jsonb;
DECLARE activation_reference_value text;
DECLARE user_id_value text;
DECLARE entra_subject_id_value text;
DECLARE device_fingerprint text;
DECLARE release_artifact_id_value text;
DECLARE issue_request_id_value text;
DECLARE issued_at_value timestamptz;
DECLARE valid_until_value timestamptz;
DECLARE now_at timestamptz;
DECLARE authority_sha text;
DECLARE installation_id_value text;
DECLARE registration_event_id_value text;
DECLARE request_sha text;
DECLARE response_text_value text;
DECLARE public_response jsonb;
DECLARE public_response_text_value text;
DECLARE public_response_base64_value text;
DECLARE inserted boolean;
DECLARE expected_approved_release jsonb;
DECLARE required_keys constant text[] := ARRAY[
  'issued_challenge','issued_challenge_base64','issued_challenge_sha256',
  'issue_request_id','release_ticket_base64','release_ticket_signature_base64'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_issue)<>'object'
     OR NOT bound_issue ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_issue) AS key
                 WHERE key<>ALL(required_keys))
     OR jsonb_typeof(bound_issue->'issued_challenge')<>'object'
     OR bound_issue->>'issue_request_id' !~ '^oar_[A-Za-z0-9_-]{20,128}$'
     OR bound_issue->>'issued_challenge_sha256' !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'outlook desktop activation challenge issue shape invalid';
  END IF;
  challenge := bound_issue->'issued_challenge';
  activation_reference_value := challenge->>'activation_id';
  user_id_value := challenge#>>'{authenticated_principal,lawos_user_id}';
  entra_subject_id_value := challenge#>>'{authenticated_principal,entra_subject}';
  device_fingerprint :=
    challenge#>>'{candidate_device,continuity_key_fingerprint_sha256}';
  release_artifact_id_value := challenge#>>'{approved_release,release_artifact_id}';
  issue_request_id_value := bound_issue->>'issue_request_id';
  IF activation_reference_value !~ '^oda_[A-Za-z0-9_-]{24}$'
     OR user_id_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR entra_subject_id_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR device_fingerprint !~ '^[a-f0-9]{64}$'
     OR release_artifact_id_value !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR challenge#>>'{authenticated_principal,lawos_tenant_id}'<>
        bound_tenant_id
     OR challenge->>'challenge_nonce_sha256' !~ '^[a-f0-9]{64}$'
     OR challenge->>'local_measurement_evidence_sha256' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       challenge->>'issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       challenge->>'expires_at') THEN
    RAISE EXCEPTION 'outlook desktop activation challenge issue binding invalid';
  END IF;
  issued_at_value := (challenge->>'issued_at')::timestamptz;
  valid_until_value := (challenge->>'expires_at')::timestamptz;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-challenge-request.v1',bound_tenant_id,
    bound_issue::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-challenge-request'||chr(31)||
    issue_request_id_value,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-reference'||chr(31)||
    activation_reference_value,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-nonce'||chr(31)||
    (challenge->>'challenge_nonce_sha256'),0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_activation_challenges AS stored
   WHERE stored.tenant_id=bound_tenant_id
     AND (stored.activation_reference=activation_reference_value
          OR stored.issue_request_id=issue_request_id_value
          OR stored.challenge_nonce_sha256=challenge->>'challenge_nonce_sha256')
   ORDER BY stored.activation_reference
   LIMIT 1;
  IF FOUND THEN
    IF existing.activation_reference<>activation_reference_value
       OR existing.issue_request_id<>issue_request_id_value
       OR existing.issue_request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop activation challenge replay conflict'
        USING ERRCODE='LAC01';
    END IF;
    RETURN existing.issue_response_text::jsonb;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    release_artifact_id_value,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||user_id_value||chr(31)||entra_subject_id_value,0));
  SELECT artifact.*,
         audit.event_id AS approval_audit_event_id,
         audit.event_binding_sha256 AS approval_audit_event_binding_sha256,
         published.pilot_policy AS issue_pilot_policy,
         published.macos_code_directory_sha256 AS issue_code_directory_sha256,
         published.macos_designated_requirement_sha256 AS
           issue_designated_requirement_sha256,
         published.release_ticket_base64 AS issue_release_ticket_base64,
         published.release_ticket_signature_base64 AS
           issue_release_ticket_signature_base64,
         published.release_ticket_bytes_sha256 AS
           issue_release_ticket_bytes_sha256,
         published.release_ticket_owner_signature_sha256 AS
           issue_release_ticket_signature_sha256,
         published.release_authority_sha256 AS issue_release_authority_sha256,
         published.authority_binding_sha256 AS issue_authority_binding_sha256,
         published.valid_until AS issue_authority_valid_until,
         policy.rollout_stage AS target_policy_rollout_stage,
         policy.maximum_entitled AS target_policy_maximum_entitled,
         policy.rollout_authorized AS target_policy_rollout_authorized,
         policy.account_active AS target_policy_account_active,
         policy.release_allowed AS target_policy_release_allowed,
         policy.valid_from AS target_policy_valid_from,
         policy.valid_until AS target_policy_valid_until,
         roster.valid_from AS target_roster_valid_from,
         roster.valid_until AS target_roster_valid_until
    INTO release
    FROM lawos_email_dms.outlook_desktop_release_artifacts AS artifact
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
      ON audit.tenant_id=artifact.tenant_id
     AND audit.release_artifact_id=artifact.release_artifact_id
     AND audit.event_type='approved'
    JOIN lawos_email_dms.outlook_desktop_activation_issue_authorities AS published
      ON published.tenant_id=artifact.tenant_id
     AND published.release_artifact_id=artifact.release_artifact_id
    JOIN lawos_email_dms.outlook_desktop_assignment_policies AS policy
      ON policy.tenant_id=artifact.tenant_id
     AND policy.user_id=user_id_value
     AND policy.entra_subject_id=entra_subject_id_value
    JOIN lawos_email_dms.outlook_desktop_assignment_rosters AS roster
      ON roster.tenant_id=policy.tenant_id
     AND roster.roster_version=policy.roster_version
     AND roster.roster_binding_sha256=policy.roster_binding_sha256
    JOIN lawos_email_dms.outlook_desktop_assignment_roster_members AS member
      ON member.tenant_id=policy.tenant_id
     AND member.roster_version=policy.roster_version
     AND member.user_id=policy.user_id
     AND member.entra_subject_id=policy.entra_subject_id
   WHERE artifact.tenant_id=bound_tenant_id
     AND artifact.release_artifact_id=release_artifact_id_value
   FOR UPDATE OF artifact,published,policy,roster,member;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR release.revoked_at IS NOT NULL
     OR release.valid_from>now_at OR release.valid_until<=now_at
     OR release.target_policy_valid_from>now_at
     OR release.target_policy_valid_until<=now_at
     OR release.target_roster_valid_from>now_at
     OR release.target_roster_valid_until<=now_at
     OR release.target_policy_rollout_stage NOT IN ('jwsuh_canary','expanded')
     OR NOT release.target_policy_maximum_entitled
     OR NOT release.target_policy_rollout_authorized
     OR NOT release.target_policy_account_active
     OR NOT release.target_policy_release_allowed
     OR issued_at_value>now_at OR valid_until_value<=now_at
     OR valid_until_value<=issued_at_value
     OR valid_until_value>issued_at_value+interval '30 minutes'
     OR valid_until_value>release.valid_until
     OR valid_until_value>release.issue_authority_valid_until
     OR challenge#>>'{approved_release,tenant_id}'<>bound_tenant_id
     OR challenge#>>'{approved_release,release_ticket_sha256}'<>
        release.embedded_release_ticket_sha256
     OR challenge#>>'{approved_release,release_ticket_signature_sha256}'<>
        release.embedded_release_ticket_signature_sha256
     OR challenge#>>'{approved_release,app_version}'<>release.app_version
     OR challenge#>>'{approved_release,source_sha}'<>release.source_sha
     OR challenge#>>'{approved_release,source_tree}'<>release.source_tree
     OR challenge#>>'{approved_release,approval_sha256}'<>release.approval_sha256
     OR challenge#>>'{approved_release,embedded_build_manifest_sha256}'<>
        release.embedded_build_manifest_sha256
     OR challenge#>>'{approved_release,measured_inner_artifact_sha256}'<>
        release.embedded_inner_artifact_sha256
     OR (challenge#>>'{approved_release,measured_inner_artifact_bytes}')::bigint<>
        release.embedded_inner_artifact_bytes
     OR challenge#>>'{approved_release,registered_final_artifact_sha256}'<>
        release.final_artifact_sha256
     OR (challenge#>>'{approved_release,registered_final_artifact_bytes}')::bigint<>
        release.final_artifact_bytes
     OR challenge#>>'{approved_release,trust_registry_sha256}'<>
        release.trust_registry_sha256
     OR (challenge#>>'{approved_release,trust_registry_serial}')::bigint<>
        release.trust_registry_serial
     OR encode(pg_catalog.sha256(decode(
          bound_issue->>'release_ticket_base64','base64')),'hex')<>
        release.embedded_release_ticket_sha256
     OR encode(pg_catalog.sha256(decode(
          bound_issue->>'release_ticket_signature_base64','base64')),'hex')<>
        release.embedded_release_ticket_signature_sha256
     OR octet_length(decode(
          bound_issue->>'release_ticket_signature_base64','base64'))<>64
     OR encode(pg_catalog.sha256(decode(
          bound_issue->>'issued_challenge_base64','base64')),'hex')<>
        bound_issue->>'issued_challenge_sha256'
     OR convert_from(decode(
          bound_issue->>'issued_challenge_base64','base64'),'UTF8')::jsonb
        IS DISTINCT FROM challenge THEN
    RAISE EXCEPTION 'outlook desktop activation challenge authority invalid';
  END IF;
  authority_sha :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,release.release_artifact_id);
  expected_approved_release := jsonb_build_object(
    'app_id',release.app_id,'app_version',release.app_version,
    'approval_sha256',release.approval_sha256,'arch',release.arch,
    'channel',release.channel,
    'embedded_build_manifest_sha256',release.embedded_build_manifest_sha256,
    'macos_code_directory_sha256',release.issue_code_directory_sha256,
    'macos_designated_requirement_sha256',
      release.issue_designated_requirement_sha256,
    'macos_team_id',release.macos_team_id,
    'macos_technical_evidence_sha256',release.macos_technical_evidence_sha256,
    'measured_inner_artifact_bytes',release.embedded_inner_artifact_bytes,
    'measured_inner_artifact_sha256',release.embedded_inner_artifact_sha256,
    'platform',release.platform,
    'registered_final_artifact_bytes',release.final_artifact_bytes,
    'registered_final_artifact_sha256',release.final_artifact_sha256,
    'release_artifact_id',release.release_artifact_id,
    'release_ticket_id',release.release_ticket_id,
    'release_ticket_sha256',release.embedded_release_ticket_sha256,
    'release_ticket_signature_sha256',
      release.embedded_release_ticket_signature_sha256,
    'source_sha',release.source_sha,'source_tree',release.source_tree,
    'tenant_id',bound_tenant_id,
    'trust_registry_serial',release.trust_registry_serial,
    'trust_registry_sha256',release.trust_registry_sha256,
    'valid',true,'valid_until',to_char(
      release.issue_authority_valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  IF challenge->'approved_release' IS DISTINCT FROM expected_approved_release
     OR challenge->'pilot_policy' IS DISTINCT FROM release.issue_pilot_policy
     OR bound_issue->>'release_ticket_base64'<>
        release.issue_release_ticket_base64
     OR bound_issue->>'release_ticket_signature_base64'<>
        release.issue_release_ticket_signature_base64
     OR release.issue_release_ticket_bytes_sha256<>
        release.embedded_release_ticket_sha256
     OR release.issue_release_ticket_signature_sha256<>
        release.embedded_release_ticket_signature_sha256
     OR release.issue_release_authority_sha256<>authority_sha THEN
    RAISE EXCEPTION 'outlook desktop activation issue authority binding invalid';
  END IF;
  installation_id_value := 'odi_'||replace(pg_catalog.gen_random_uuid()::text,'-','');
  registration_event_id_value :=
    'oae_'||replace(pg_catalog.gen_random_uuid()::text,'-','');
  response_text_value := jsonb_build_object(
    'outcome','issued','tenant_id',bound_tenant_id,
    'activation_reference',activation_reference_value,
    'installation_id',installation_id_value,
    'issue_request_id',issue_request_id_value,
    'registration_event_id',registration_event_id_value,
    'release_artifact_id',release.release_artifact_id,
    'release_authority_sha256',authority_sha,
    'challenge_nonce_sha256',challenge->>'challenge_nonce_sha256',
    'issued_challenge',challenge,
    'issued_challenge_base64',bound_issue->>'issued_challenge_base64',
    'issued_challenge_sha256',bound_issue->>'issued_challenge_sha256',
    'issued_at',to_char(issued_at_value AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(valid_until_value AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )::text;
  public_response := jsonb_build_object(
    'activation_reference',activation_reference_value,
    'installation_id',installation_id_value,
    'issue_request_id',issue_request_id_value,
    'issued_challenge',challenge,
    'issued_challenge_sha256',bound_issue->>'issued_challenge_sha256',
    'registration_event_id',registration_event_id_value,
    'release_authority',jsonb_build_object(
      'authority_binding_sha256',release.issue_authority_binding_sha256,
      'release_artifact_id',release.release_artifact_id,
      'release_authority_sha256',authority_sha,
      'release_ticket_bytes_sha256',release.embedded_release_ticket_sha256,
      'release_ticket_owner_signature_sha256',
        release.embedded_release_ticket_signature_sha256,
      'valid_until',to_char(
        release.issue_authority_valid_until AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    ),
    'schema_version','lawos.outlook-desktop-activation-authority-result.v1'
  );
  public_response_text_value :=
    lawos_email_dms.outlook_desktop_canonical_json_text(public_response)||E'\n';
  public_response_base64_value := replace(encode(
    convert_to(public_response_text_value,'UTF8'),'base64'),E'\n','');
  INSERT INTO lawos_email_dms.outlook_desktop_activation_challenges(
    tenant_id,activation_reference,installation_id,issue_request_id,
    registration_event_id,
    user_id,entra_subject_id,device_key_fingerprint,
    device_public_key_spki_sha256,release_artifact_id,approval_audit_event_id,
    approval_audit_event_binding_sha256,release_authority_sha256,
    release_ticket_base64,release_ticket_signature_base64,
    release_ticket_bytes_sha256,release_ticket_owner_signature_sha256,
    challenge_nonce_base64url,challenge_nonce_sha256,
    local_measurement_evidence_sha256,issued_challenge,
    issued_challenge_base64,issued_challenge_sha256,issue_request_sha256,
    issue_response_text,issue_public_response_base64,state,issued_at,valid_until
  ) VALUES (
    bound_tenant_id,activation_reference_value,installation_id_value,
    issue_request_id_value,registration_event_id_value,
    user_id_value,entra_subject_id_value,
    device_fingerprint,device_fingerprint,release.release_artifact_id,
    release.approval_audit_event_id,release.approval_audit_event_binding_sha256,
    authority_sha,bound_issue->>'release_ticket_base64',
    bound_issue->>'release_ticket_signature_base64',
    release.embedded_release_ticket_sha256,
    release.embedded_release_ticket_signature_sha256,
    challenge->>'challenge_nonce_base64url',challenge->>'challenge_nonce_sha256',
    challenge->>'local_measurement_evidence_sha256',
    challenge,bound_issue->>'issued_challenge_base64',
    bound_issue->>'issued_challenge_sha256',request_sha,response_text_value,
    public_response_base64_value,'issued',issued_at_value,valid_until_value
  ) ON CONFLICT DO NOTHING RETURNING true INTO inserted;
  IF inserted IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop activation challenge snapshot stale'
      USING ERRCODE='40001';
  END IF;
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.attach_outlook_desktop_activation_evidence(
  bound_tenant_id text,
  bound_evidence jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE reservation lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE packet_evidence_row
  lawos_email_dms.outlook_desktop_activation_operator_packet_evidence%ROWTYPE;
DECLARE release lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
DECLARE core_request jsonb;
DECLARE packet_evidence jsonb;
DECLARE request_sha text;
DECLARE response_text_value text;
DECLARE evidence_receipt_sha text;
DECLARE now_at timestamptz;
DECLARE envelope_keys constant text[] := ARRAY[
  'core_request','operator_packet_evidence'
];
DECLARE request_keys constant text[] := ARRAY[
  'activation_reference','activation_replay_identity',
  'installation_id','issued_challenge_sha256',
  'local_measurement_evidence_sha256',
  'operator_receipt_base64','operator_receipt_sha256',
  'operator_signature_base64','operator_signature_sha256','request_id'
];
DECLARE packet_keys constant text[] := ARRAY[
  'activation_reference','authenticated_principal',
  'local_measurement_evidence_sha256','operator_receipt_base64',
  'operator_receipt_signature_base64','owner_operator_packet_sha256',
  'request_id'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_evidence)<>'object'
     OR NOT bound_evidence ?& envelope_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_evidence) AS key
                 WHERE key<>ALL(envelope_keys)) THEN
    RAISE EXCEPTION 'outlook desktop activation evidence shape invalid';
  END IF;
  core_request := bound_evidence->'core_request';
  packet_evidence := bound_evidence->'operator_packet_evidence';
  IF jsonb_typeof(core_request)<>'object'
     OR NOT core_request ?& request_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(core_request) AS key
                 WHERE key<>ALL(request_keys))
     OR jsonb_typeof(packet_evidence)<>'object'
     OR NOT packet_evidence ?& packet_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(packet_evidence) AS key
                 WHERE key<>ALL(packet_keys))
     OR core_request->>'activation_reference' !~ '^oda_[A-Za-z0-9_-]{24}$'
     OR core_request->>'installation_id' !~ '^odi_[A-Za-z0-9_-]{20,128}$'
     OR core_request->>'request_id' !~ '^oar_[A-Za-z0-9_-]{20,128}$'
     OR jsonb_typeof(core_request->'activation_replay_identity')<>'object'
     OR jsonb_typeof(packet_evidence->'authenticated_principal')<>'object'
     OR NOT (packet_evidence->'authenticated_principal') ?& ARRAY[
       'entra_subject','entra_tenant_id','lawos_tenant_id','lawos_user_id']
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(
         packet_evidence->'authenticated_principal') AS key
        WHERE key<>ALL(ARRAY[
          'entra_subject','entra_tenant_id','lawos_tenant_id','lawos_user_id']))
     OR packet_evidence->>'activation_reference'<>
        core_request->>'activation_reference'
     OR packet_evidence->>'request_id'<>core_request->>'request_id'
     OR packet_evidence->>'local_measurement_evidence_sha256'<>
        core_request->>'local_measurement_evidence_sha256'
     OR packet_evidence->>'operator_receipt_base64'<>
        core_request->>'operator_receipt_base64'
     OR packet_evidence->>'operator_receipt_signature_base64'<>
        core_request->>'operator_signature_base64'
     OR packet_evidence->>'owner_operator_packet_sha256'
        !~ '^[a-f0-9]{64}$'
     OR EXISTS (
       SELECT 1 FROM (VALUES
         ('issued_challenge_sha256'),('operator_receipt_sha256'),
         ('operator_signature_sha256'),('local_measurement_evidence_sha256')
       ) AS digest(field_name)
       WHERE core_request->>digest.field_name !~ '^[a-f0-9]{64}$'
     ) THEN
    RAISE EXCEPTION 'outlook desktop activation evidence shape invalid';
  END IF;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-evidence-request.v1',bound_tenant_id,
    core_request::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-evidence-request'||chr(31)||
    (core_request->>'request_id'),0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-reference'||chr(31)||
    (core_request->>'activation_reference'),0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-owner-operator-packet'||
    chr(31)||(packet_evidence->>'owner_operator_packet_sha256'),0));
  SELECT * INTO packet_evidence_row
    FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
   WHERE tenant_id=bound_tenant_id
     AND owner_operator_packet_sha256=
       packet_evidence->>'owner_operator_packet_sha256';
  IF FOUND AND packet_evidence_row.activation_reference<>
     core_request->>'activation_reference' THEN
    RAISE EXCEPTION 'outlook desktop activation evidence replay conflict'
      USING ERRCODE='LAC01';
  END IF;
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=core_request->>'activation_reference';
  IF FOUND AND reservation.attachment_request_sha256 IS NOT NULL THEN
    SELECT * INTO packet_evidence_row
      FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
     WHERE tenant_id=bound_tenant_id
       AND activation_reference=reservation.activation_reference;
    IF NOT FOUND
       OR reservation.issue_request_id<>core_request->>'request_id'
       OR reservation.attachment_request_id<>core_request->>'request_id'
       OR reservation.attachment_request_sha256<>request_sha
       OR packet_evidence_row.installation_id<>reservation.installation_id
       OR packet_evidence_row.request_id<>core_request->>'request_id'
       OR packet_evidence_row.core_request_sha256<>request_sha
       OR packet_evidence_row.owner_operator_packet_sha256<>
          packet_evidence->>'owner_operator_packet_sha256'
       OR packet_evidence_row.operator_receipt_sha256<>
          core_request->>'operator_receipt_sha256'
       OR packet_evidence_row.operator_signature_sha256<>
          core_request->>'operator_signature_sha256'
       OR packet_evidence_row.local_measurement_evidence_sha256<>
          core_request->>'local_measurement_evidence_sha256'
       OR packet_evidence_row.issued_challenge_sha256<>
          core_request->>'issued_challenge_sha256'
       OR packet_evidence_row.persisted_at<>reservation.attached_at
       OR packet_evidence->'authenticated_principal' IS DISTINCT FROM
          reservation.issued_challenge->'authenticated_principal' THEN
      RAISE EXCEPTION 'outlook desktop activation evidence replay conflict'
        USING ERRCODE='LAC01';
    END IF;
    RETURN jsonb_build_object(
      'core_result',reservation.attachment_response_text::jsonb,
      'owner_operator_packet_sha256',
        packet_evidence_row.owner_operator_packet_sha256,
      'evidence_receipt_sha256',packet_evidence_row.evidence_receipt_sha256
    );
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop activation reference mismatch'
      USING ERRCODE='LAC02';
  END IF;
  IF reservation.issue_request_id<>core_request->>'request_id' THEN
    RAISE EXCEPTION 'outlook desktop activation evidence replay conflict'
      USING ERRCODE='LAC01';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    reservation.release_artifact_id,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||reservation.user_id||chr(31)||
    reservation.entra_subject_id,0));
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=core_request->>'activation_reference'
   FOR UPDATE;
  IF reservation.attachment_request_sha256 IS NOT NULL THEN
    SELECT * INTO packet_evidence_row
      FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
     WHERE tenant_id=bound_tenant_id
       AND activation_reference=reservation.activation_reference;
    IF NOT FOUND
       OR reservation.issue_request_id<>core_request->>'request_id'
       OR reservation.attachment_request_id<>core_request->>'request_id'
       OR reservation.attachment_request_sha256<>request_sha
       OR packet_evidence_row.installation_id<>reservation.installation_id
       OR packet_evidence_row.request_id<>core_request->>'request_id'
       OR packet_evidence_row.core_request_sha256<>request_sha
       OR packet_evidence_row.owner_operator_packet_sha256<>
          packet_evidence->>'owner_operator_packet_sha256'
       OR packet_evidence_row.operator_receipt_sha256<>
          core_request->>'operator_receipt_sha256'
       OR packet_evidence_row.operator_signature_sha256<>
          core_request->>'operator_signature_sha256'
       OR packet_evidence_row.local_measurement_evidence_sha256<>
          core_request->>'local_measurement_evidence_sha256'
       OR packet_evidence_row.issued_challenge_sha256<>
          core_request->>'issued_challenge_sha256'
       OR packet_evidence_row.persisted_at<>reservation.attached_at
       OR packet_evidence->'authenticated_principal' IS DISTINCT FROM
          reservation.issued_challenge->'authenticated_principal' THEN
      RAISE EXCEPTION 'outlook desktop activation evidence replay conflict'
        USING ERRCODE='LAC01';
    END IF;
    RETURN jsonb_build_object(
      'core_result',reservation.attachment_response_text::jsonb,
      'owner_operator_packet_sha256',
        packet_evidence_row.owner_operator_packet_sha256,
      'evidence_receipt_sha256',packet_evidence_row.evidence_receipt_sha256
    );
  END IF;
  IF reservation.issue_request_id<>core_request->>'request_id' THEN
    RAISE EXCEPTION 'outlook desktop activation evidence replay conflict'
      USING ERRCODE='LAC01';
  END IF;
  SELECT * INTO packet_evidence_row
    FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=reservation.activation_reference;
  IF FOUND THEN
    RAISE EXCEPTION 'outlook desktop activation evidence replay conflict'
      USING ERRCODE='LAC01';
  END IF;
  SELECT * INTO release
    FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=reservation.release_artifact_id
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF reservation.state<>'issued' OR reservation.valid_until<=now_at
     OR release.tenant_id IS NULL OR release.revoked_at IS NOT NULL
     OR release.valid_from>now_at OR release.valid_until<=now_at
     OR ROW(reservation.installation_id,reservation.issued_challenge_sha256)
        IS DISTINCT FROM ROW(core_request->>'installation_id',
          core_request->>'issued_challenge_sha256')
     OR reservation.local_measurement_evidence_sha256<>
        core_request->>'local_measurement_evidence_sha256'
     OR packet_evidence->'authenticated_principal' IS DISTINCT FROM
        reservation.issued_challenge->'authenticated_principal'
     OR reservation.release_authority_sha256<>
        lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
          bound_tenant_id,reservation.release_artifact_id)
     OR octet_length(decode(core_request->>'operator_receipt_base64','base64'))
        NOT BETWEEN 1 AND 65536
     OR replace(encode(decode(
          core_request->>'operator_receipt_base64','base64'),'base64'),E'\n','')<>
        core_request->>'operator_receipt_base64'
     OR encode(pg_catalog.sha256(decode(
          core_request->>'operator_receipt_base64','base64')),'hex')<>
        core_request->>'operator_receipt_sha256'
     OR octet_length(decode(
          core_request->>'operator_signature_base64','base64'))<>64
     OR replace(encode(decode(
          core_request->>'operator_signature_base64','base64'),'base64'),E'\n','')<>
        core_request->>'operator_signature_base64'
     OR encode(pg_catalog.sha256(decode(
          core_request->>'operator_signature_base64','base64')),'hex')<>
        core_request->>'operator_signature_sha256' THEN
    RAISE EXCEPTION 'outlook desktop activation evidence authority invalid';
  END IF;
  response_text_value := jsonb_build_object(
    'status','evidence_attached','tenant_id',bound_tenant_id,
    'activation_reference',reservation.activation_reference,
    'installation_id',reservation.installation_id,
    'issued_challenge_sha256',reservation.issued_challenge_sha256,
    'activation_receipt_sha256',core_request->>'operator_receipt_sha256',
    'local_measurement_evidence_sha256',
      core_request->>'local_measurement_evidence_sha256',
    'attached_at',to_char(now_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(reservation.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )::text;
  evidence_receipt_sha :=
    lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.outlook-desktop-activation-operator-packet-evidence-receipt.v1',
      bound_tenant_id,reservation.activation_reference,
      reservation.installation_id,core_request->>'request_id',request_sha,
      (reservation.issued_challenge->'authenticated_principal')::text,
      core_request->>'local_measurement_evidence_sha256',
      core_request->>'operator_receipt_sha256',
      core_request->>'operator_signature_sha256',
      packet_evidence->>'owner_operator_packet_sha256',
      reservation.issued_challenge_sha256,
      ((extract(epoch FROM now_at)*1000)::bigint)::text
    ]);
  INSERT INTO lawos_email_dms.outlook_desktop_activation_operator_packet_evidence(
    tenant_id,activation_reference,installation_id,request_id,
    core_request_sha256,owner_operator_packet_sha256,
    operator_receipt_sha256,operator_signature_sha256,
    local_measurement_evidence_sha256,issued_challenge_sha256,
    evidence_receipt_sha256,persisted_at
  ) VALUES (
    bound_tenant_id,reservation.activation_reference,reservation.installation_id,
    core_request->>'request_id',request_sha,
    packet_evidence->>'owner_operator_packet_sha256',
    core_request->>'operator_receipt_sha256',
    core_request->>'operator_signature_sha256',
    core_request->>'local_measurement_evidence_sha256',
    reservation.issued_challenge_sha256,evidence_receipt_sha,now_at
  );
  UPDATE lawos_email_dms.outlook_desktop_activation_challenges
     SET attachment_request_id=core_request->>'request_id',
         attachment_request_sha256=request_sha,
         attachment_response_text=response_text_value,
         operator_receipt_base64=core_request->>'operator_receipt_base64',
         operator_receipt_sha256=core_request->>'operator_receipt_sha256',
         operator_signature_base64=core_request->>'operator_signature_base64',
         operator_signature_sha256=core_request->>'operator_signature_sha256',
         activation_replay_identity=core_request->'activation_replay_identity',
         state='evidence_attached',attached_at=now_at
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=reservation.activation_reference;
  RETURN jsonb_build_object(
    'core_result',response_text_value::jsonb,
    'owner_operator_packet_sha256',
      packet_evidence->>'owner_operator_packet_sha256',
    'evidence_receipt_sha256',evidence_receipt_sha
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.load_outlook_desktop_activation_reservation(
  bound_tenant_id text,
  bound_activation_reference text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE reservation lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE packet_evidence_row
  lawos_email_dms.outlook_desktop_activation_operator_packet_evidence%ROWTYPE;
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_activation_reference !~ '^oda_[A-Za-z0-9_-]{24}$' THEN
    RAISE EXCEPTION 'outlook desktop activation reference mismatch'
      USING ERRCODE='LAC02';
  END IF;
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=bound_activation_reference;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop activation reference mismatch'
      USING ERRCODE='LAC02';
  END IF;
  SELECT * INTO packet_evidence_row
    FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=bound_activation_reference;
  RETURN jsonb_build_object(
    'schema_version','lawos.outlook-desktop-activation-reservation.v1',
    'state',reservation.state,'tenant_id',reservation.tenant_id,
    'user_id',reservation.user_id,
    'entra_subject_id',reservation.entra_subject_id,
    'activation_reference',reservation.activation_reference,
    'installation_id',reservation.installation_id,
    'issue_request_id',reservation.issue_request_id,
    'registration_event_id',reservation.registration_event_id,
    'device_key_fingerprint',reservation.device_key_fingerprint,
    'device_public_key_spki_sha256',reservation.device_public_key_spki_sha256,
    'release_artifact_id',reservation.release_artifact_id,
    'release_authority_sha256',reservation.release_authority_sha256,
    'release_ticket_base64',reservation.release_ticket_base64,
    'release_ticket_signature_base64',reservation.release_ticket_signature_base64,
    'release_ticket_bytes_sha256',reservation.release_ticket_bytes_sha256,
    'release_ticket_owner_signature_sha256',
      reservation.release_ticket_owner_signature_sha256,
    'challenge_nonce_base64url',reservation.challenge_nonce_base64url,
    'challenge_nonce_sha256',reservation.challenge_nonce_sha256,
    'issued_challenge',reservation.issued_challenge,
    'issued_challenge_base64',reservation.issued_challenge_base64,
    'issued_challenge_sha256',reservation.issued_challenge_sha256,
    'operator_receipt_base64',reservation.operator_receipt_base64,
    'operator_receipt_sha256',reservation.operator_receipt_sha256,
    'operator_signature_base64',reservation.operator_signature_base64,
    'operator_signature_sha256',reservation.operator_signature_sha256,
    'owner_operator_packet_sha256',
      packet_evidence_row.owner_operator_packet_sha256,
    'evidence_receipt_sha256',packet_evidence_row.evidence_receipt_sha256,
    'local_measurement_evidence_sha256',
      reservation.local_measurement_evidence_sha256,
    'device_command_sha256',reservation.device_command_sha256,
    'device_proof_transcript_sha256',
      reservation.device_proof_transcript_sha256,
    'device_signature_sha256',reservation.device_signature_sha256,
    'evidence_binding_sha256',reservation.evidence_binding_sha256,
    'activation_receipt_sha256',reservation.operator_receipt_sha256,
    'activation_authorization_receipt_sha256',
      reservation.activation_authorization_receipt_sha256,
    'activation_replay_identity',reservation.activation_replay_identity,
    'issue_request_sha256',reservation.issue_request_sha256,
    'attachment_request_sha256',reservation.attachment_request_sha256,
    'authorization_request_sha256',reservation.authorization_request_sha256,
    'authorization_binding_sha256',reservation.authorization_binding_sha256,
    'issue_public_response_base64',reservation.issue_public_response_base64,
    'issue_response_text',reservation.issue_response_text,
    'attachment_response_text',reservation.attachment_response_text,
    'authorization_response_text',reservation.authorization_response_text
  ) || jsonb_build_object(
    'proof_id',reservation.proof_id,'request_id',reservation.request_id,
    'event_id',reservation.event_id,
    'idempotency_key',reservation.idempotency_key,
    'request_fingerprint',reservation.request_fingerprint,
    'proof_issued_at',CASE WHEN reservation.proof_issued_at IS NULL THEN NULL
      ELSE to_char(reservation.proof_issued_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
    'proof_expires_at',CASE WHEN reservation.proof_expires_at IS NULL THEN NULL
      ELSE to_char(reservation.proof_expires_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
    'issued_at',to_char(reservation.issued_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(reservation.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'attached_at',CASE WHEN reservation.attached_at IS NULL THEN NULL
      ELSE to_char(reservation.attached_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
    'authorized_at',CASE WHEN reservation.authorized_at IS NULL THEN NULL
      ELSE to_char(reservation.authorized_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
    'consumed_at',CASE WHEN reservation.consumed_at IS NULL THEN NULL
      ELSE to_char(reservation.consumed_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END,
    'lifecycle_registration_consumption',
      reservation.lifecycle_registration_consumption
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.read_outlook_desktop_activation_proof_seed(
  bound_tenant_id text,
  bound_request jsonb
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE reservation lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE now_at timestamptz;
DECLARE required_keys constant text[] := ARRAY[
  'activation_reference','entra_subject_id','user_id'
];
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_request)<>'object'
     OR NOT bound_request ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_request) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_request->>'activation_reference' !~ '^oda_[A-Za-z0-9_-]{24}$'
     OR bound_request->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_request->>'entra_subject_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$' THEN
    RAISE EXCEPTION 'outlook desktop activation reference mismatch'
      USING ERRCODE='LAC02';
  END IF;
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=bound_request->>'activation_reference';
  IF NOT FOUND OR ROW(reservation.user_id,reservation.entra_subject_id)
     IS DISTINCT FROM ROW(bound_request->>'user_id',
       bound_request->>'entra_subject_id') THEN
    RAISE EXCEPTION 'outlook desktop activation reference mismatch'
      USING ERRCODE='LAC02';
  END IF;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF reservation.valid_until<=now_at
     AND reservation.state NOT IN ('authorized','consumed') THEN
    RAISE EXCEPTION 'outlook desktop activation reference expired'
      USING ERRCODE='LAC03';
  END IF;
  IF reservation.state='issued' THEN
    RETURN jsonb_build_object(
      'status','pending','activation_reference',reservation.activation_reference,
      'installation_id',reservation.installation_id,
      'valid_until',to_char(reservation.valid_until AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );
  END IF;
  RETURN jsonb_build_object(
    'status','ready','activation_reference',reservation.activation_reference,
    'installation_id',reservation.installation_id,
    'event_id',reservation.registration_event_id,
    'activation_receipt_sha256',reservation.operator_receipt_sha256,
    'local_measurement_evidence_sha256',
      reservation.local_measurement_evidence_sha256,
    'release_authority_sha256',reservation.release_authority_sha256,
    'issued_challenge_sha256',reservation.issued_challenge_sha256,
    'valid_until',to_char(reservation.valid_until AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.issue_outlook_desktop_lifecycle_challenge(
  bound_tenant_id text,
  bound_issue jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing lawos_email_dms.outlook_desktop_lifecycle_challenges%ROWTYPE;
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE binding lawos_email_dms.outlook_desktop_installation_release_bindings%ROWTYPE;
DECLARE release lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
DECLARE release_artifact_id_value text;
DECLARE release_authority_sha text;
DECLARE lifecycle_challenge_id_value text;
DECLARE retire_intent_id_value text;
DECLARE nonce_bytes bytea;
DECLARE nonce_base64url text;
DECLARE nonce_sha text;
DECLARE now_at timestamptz;
DECLARE valid_until_value timestamptz;
DECLARE challenge_lifetime_milliseconds integer := 300000;
DECLARE request_sha text;
DECLARE issued_challenge jsonb;
DECLARE challenge_bytes bytea;
DECLARE challenge_base64 text;
DECLARE challenge_sha text;
DECLARE response_text_value text;
DECLARE inserted boolean;
DECLARE expected_version bigint;
DECLARE required_keys constant text[] := ARRAY[
  'device_key_fingerprint','entra_subject_id','event_id',
  'expected_state_version','idempotency_key','installation_id','operation',
  'request_id','user_id'
];
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_issue)<>'object'
     OR NOT bound_issue ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_issue) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_issue->>'operation' NOT IN ('heartbeat','retire')
     OR bound_issue->>'installation_id' !~ '^odi_[A-Za-z0-9_-]{20,128}$'
     OR bound_issue->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_issue->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_issue->>'device_key_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_issue->>'request_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_issue->>'event_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_issue->>'idempotency_key' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR jsonb_typeof(bound_issue->'expected_state_version')<>'number'
     OR bound_issue->>'expected_state_version' !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge issue shape invalid';
  END IF;
  expected_version := (bound_issue->>'expected_state_version')::bigint;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-lifecycle-challenge-request.v1',bound_tenant_id,
    bound_issue::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-lifecycle-challenge-request'||chr(31)||
    (bound_issue->>'request_id'),0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-lifecycle-challenge-idempotency'||chr(31)||
    (bound_issue->>'user_id')||chr(31)||(bound_issue->>'idempotency_key'),0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_lifecycle_challenges AS stored
   WHERE stored.tenant_id=bound_tenant_id
     AND (stored.request_id=bound_issue->>'request_id'
          OR stored.event_id=bound_issue->>'event_id'
          OR (stored.user_id=bound_issue->>'user_id'
              AND stored.idempotency_key=bound_issue->>'idempotency_key'))
   ORDER BY stored.lifecycle_challenge_id
   LIMIT 1;
  IF FOUND THEN
    IF existing.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop lifecycle challenge replay conflict'
        USING ERRCODE='LCH01';
    END IF;
    RETURN existing.response_text::jsonb;
  END IF;
  SELECT release_binding.release_artifact_id INTO release_artifact_id_value
    FROM lawos_email_dms.outlook_desktop_installation_release_bindings
      AS release_binding
   WHERE release_binding.tenant_id=bound_tenant_id
     AND release_binding.installation_id=bound_issue->>'installation_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge release untrusted'
      USING ERRCODE='LOU01';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    release_artifact_id_value,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||(bound_issue->>'user_id')||chr(31)||
    (bound_issue->>'entra_subject_id'),0));
  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id
     AND installation_id=bound_issue->>'installation_id'
   FOR UPDATE;
  SELECT * INTO binding
    FROM lawos_email_dms.outlook_desktop_installation_release_bindings
   WHERE tenant_id=bound_tenant_id
     AND installation_id=bound_issue->>'installation_id'
   FOR UPDATE;
  SELECT * INTO release
    FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=release_artifact_id_value
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF current_setting('lawos.environment',true)='synthetic-test'
     AND current_setting(
       'lawos.test.outlook_lifecycle_challenge_milliseconds',true)
       ~ '^[1-9][0-9]{3,5}$' THEN
    challenge_lifetime_milliseconds := current_setting(
      'lawos.test.outlook_lifecycle_challenge_milliseconds',true)::integer;
    IF challenge_lifetime_milliseconds NOT BETWEEN 1000 AND 300000 THEN
      RAISE EXCEPTION 'outlook desktop lifecycle challenge test window invalid';
    END IF;
  END IF;
  IF release.revoked_at IS NOT NULL
     AND bound_issue->>'operation'<>'retire' THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge release untrusted'
      USING ERRCODE='LOU01';
  END IF;
  IF installation.tenant_id IS NULL OR binding.tenant_id IS NULL
     OR release.tenant_id IS NULL OR installation.retired_at IS NOT NULL
     OR installation.state_version<>expected_version
     OR ROW(installation.user_id,installation.entra_subject_id,
       installation.device_key_fingerprint) IS DISTINCT FROM ROW(
       bound_issue->>'user_id',bound_issue->>'entra_subject_id',
       bound_issue->>'device_key_fingerprint')
     OR release.valid_from>now_at
     OR release.valid_until<=now_at
     OR binding.release_artifact_id<>release.release_artifact_id
     OR binding.release_valid_until<>release.valid_until
     OR binding.release_ticket_sha256<>release.embedded_release_ticket_sha256
     OR binding.release_ticket_signature_sha256<>
        release.embedded_release_ticket_signature_sha256 THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge authority invalid';
  END IF;
  release_authority_sha :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,release.release_artifact_id);
  IF NOT EXISTS (
    SELECT 1
      FROM lawos_email_dms.outlook_desktop_activation_authorizations AS auth
     WHERE auth.tenant_id=bound_tenant_id
       AND auth.activation_authorization_id=binding.activation_authorization_id
       AND auth.consumed_installation_id=installation.installation_id
       AND auth.release_authority_sha256=release_authority_sha
  ) THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge release untrusted'
      USING ERRCODE='LOU01';
  END IF;
  valid_until_value := LEAST(
    now_at+challenge_lifetime_milliseconds*interval '1 millisecond',
    release.valid_until);
  IF valid_until_value<=now_at THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge window invalid';
  END IF;
  lifecycle_challenge_id_value :=
    'olc_'||replace(pg_catalog.gen_random_uuid()::text,'-','');
  retire_intent_id_value := CASE WHEN bound_issue->>'operation'='retire'
    THEN 'ori_'||replace(pg_catalog.gen_random_uuid()::text,'-','') ELSE NULL END;
  nonce_bytes := decode(
    replace(pg_catalog.gen_random_uuid()::text,'-','')||
    replace(pg_catalog.gen_random_uuid()::text,'-',''),'hex');
  nonce_base64url := rtrim(
    translate(encode(nonce_bytes,'base64'),'+/','-_'),'=');
  nonce_sha := encode(pg_catalog.sha256(nonce_bytes),'hex');
  issued_challenge := jsonb_build_object(
    'schema_version','lawos.outlook-desktop-lifecycle-challenge.v1',
    'tenant_id',bound_tenant_id,'user_id',installation.user_id,
    'entra_subject_id',installation.entra_subject_id,
    'installation_id',installation.installation_id,
    'device_key_fingerprint',installation.device_key_fingerprint,
    'operation',bound_issue->>'operation',
    'expected_state_version',expected_version,
    'request_id',bound_issue->>'request_id','event_id',bound_issue->>'event_id',
    'idempotency_key',bound_issue->>'idempotency_key',
    'lifecycle_challenge_id',lifecycle_challenge_id_value,
    'challenge_nonce_base64url',nonce_base64url,
    'challenge_nonce_sha256',nonce_sha,
    'retire_intent_id',retire_intent_id_value,
    'release_authority_sha256',release_authority_sha,
    'issued_at',to_char(now_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(valid_until_value AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
  challenge_bytes := pg_catalog.convert_to(issued_challenge::text||E'\n','UTF8');
  challenge_base64 := replace(encode(challenge_bytes,'base64'),E'\n','');
  challenge_sha := encode(pg_catalog.sha256(challenge_bytes),'hex');
  response_text_value := (issued_challenge || jsonb_build_object(
    'outcome','issued','issued_challenge',issued_challenge,
    'issued_challenge_base64',challenge_base64,
    'issued_challenge_sha256',challenge_sha
  ))::text;
  INSERT INTO lawos_email_dms.outlook_desktop_lifecycle_challenges(
    tenant_id,lifecycle_challenge_id,operation,user_id,entra_subject_id,
    installation_id,device_key_fingerprint,expected_state_version,
    request_id,event_id,idempotency_key,retire_intent_id,release_artifact_id,
    release_authority_sha256,challenge_nonce_base64url,challenge_nonce_sha256,
    issued_challenge,issued_challenge_base64,issued_challenge_sha256,
    request_sha256,response_text,issued_at,valid_until
  ) VALUES (
    bound_tenant_id,lifecycle_challenge_id_value,bound_issue->>'operation',
    installation.user_id,installation.entra_subject_id,
    installation.installation_id,installation.device_key_fingerprint,
    expected_version,bound_issue->>'request_id',bound_issue->>'event_id',
    bound_issue->>'idempotency_key',retire_intent_id_value,
    release.release_artifact_id,release_authority_sha,nonce_base64url,nonce_sha,
    issued_challenge,challenge_base64,challenge_sha,request_sha,
    response_text_value,now_at,valid_until_value
  ) ON CONFLICT DO NOTHING RETURNING true INTO inserted;
  IF inserted IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge snapshot stale'
      USING ERRCODE='40001';
  END IF;
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_lifecycle_authorization()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog
AS $$
BEGIN
  IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND (
       OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
       OR NEW.resulting_state_version IS NULL
       OR (to_jsonb(NEW)-'consumed_at'-'resulting_state_version')
          IS DISTINCT FROM
          (to_jsonb(OLD)-'consumed_at'-'resulting_state_version')
     )) THEN
    RAISE EXCEPTION 'outlook desktop lifecycle authorization is immutable';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER outlook_desktop_lifecycle_authorization_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_lifecycle_authorizations
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.enforce_outlook_desktop_lifecycle_authorization();

CREATE OR REPLACE FUNCTION lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt(
  bound_tenant_id text,
  bound_authorization jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing lawos_email_dms.outlook_desktop_lifecycle_authorizations%ROWTYPE;
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE activation lawos_email_dms.outlook_desktop_activation_authorizations%ROWTYPE;
DECLARE reservation lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE challenge lawos_email_dms.outlook_desktop_lifecycle_challenges%ROWTYPE;
DECLARE release lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
DECLARE now_at timestamptz;
DECLARE issued_at_value timestamptz;
DECLARE expires_at_value timestamptz;
DECLARE expected_version bigint;
DECLARE expected_binding text;
DECLARE spki_sha text;
DECLARE activation_id text;
DECLARE release_authority_sha text;
DECLARE release_artifact_id_value text;
DECLARE request_sha text;
DECLARE response_text_value text;
DECLARE claim_created boolean;
DECLARE required_keys constant text[] := ARRAY[
  'activation_authorization_id','device_key_fingerprint',
  'device_public_key_spki_sha256','device_signature_sha256',
  'entra_subject_id','event_id','expected_state_version','idempotency_key',
  'installation_id','issued_challenge_sha256','lifecycle_authorization_id',
  'lifecycle_challenge_id','nonce_hash','operation','proof_expires_at',
  'proof_issued_at','proof_receipt_sha256','proof_transcript_sha256',
  'release_authority_sha256','request_fingerprint','request_id',
  'retire_intent_id','user_id'
];
BEGIN
  IF session_user<>'lawos_outlook_lifecycle_verifier' THEN
    RAISE EXCEPTION 'outlook desktop lifecycle verifier required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_authorization)<>'object'
     OR NOT bound_authorization ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_authorization) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_authorization->>'lifecycle_authorization_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'operation' NOT IN ('register','heartbeat','retire')
     OR bound_authorization->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'installation_id' !~ '^odi_[A-Za-z0-9_-]{20,128}$'
     OR bound_authorization->>'device_key_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'device_public_key_spki_sha256'
        !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'device_public_key_spki_sha256'<>
        bound_authorization->>'device_key_fingerprint'
     OR jsonb_typeof(bound_authorization->'expected_state_version')<>'number'
     OR bound_authorization->>'expected_state_version' !~ '^[1-9][0-9]*$'
     OR bound_authorization->>'request_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'proof_transcript_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'nonce_hash' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'device_signature_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'proof_receipt_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'issued_challenge_sha256' !~ '^[a-f0-9]{64}$'
     OR (
       bound_authorization->>'operation'='register' AND (
         jsonb_typeof(bound_authorization->'activation_authorization_id')<>'string'
         OR bound_authorization->>'activation_authorization_id'
            !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
         OR jsonb_typeof(bound_authorization->'release_authority_sha256')<>'string'
         OR bound_authorization->>'release_authority_sha256' !~ '^[a-f0-9]{64}$'
         OR jsonb_typeof(bound_authorization->'lifecycle_challenge_id')<>'null'
         OR bound_authorization->>'request_id'
            !~ '^oar_[A-Za-z0-9_-]{20,128}$'
         OR bound_authorization->>'event_id' !~ '^oae_[a-f0-9]{32}$'
         OR bound_authorization->>'idempotency_key'
            !~ '^oar_[A-Za-z0-9_-]{20,128}$'
         OR bound_authorization->>'request_id'<>
            bound_authorization->>'idempotency_key'
         OR jsonb_typeof(bound_authorization->'retire_intent_id')<>'null'
       )
     )
     OR (
       bound_authorization->>'operation'<>'register' AND (
         jsonb_typeof(bound_authorization->'activation_authorization_id')<>'null'
         OR jsonb_typeof(bound_authorization->'release_authority_sha256')<>'null'
         OR bound_authorization->>'lifecycle_challenge_id'
            !~ '^olc_[a-f0-9]{32}$'
         OR bound_authorization->>'request_id'
            !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
         OR bound_authorization->>'event_id'
            !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
         OR bound_authorization->>'idempotency_key'
            !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
         OR (bound_authorization->>'operation'='heartbeat'
             AND jsonb_typeof(bound_authorization->'retire_intent_id')<>'null')
         OR (bound_authorization->>'operation'='retire'
             AND bound_authorization->>'retire_intent_id'
                 !~ '^ori_[a-f0-9]{32}$')
       )
     )
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_authorization->>'proof_issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_authorization->>'proof_expires_at') THEN
    RAISE EXCEPTION 'outlook desktop lifecycle authorization shape invalid';
  END IF;
  expected_version := (bound_authorization->>'expected_state_version')::bigint;
  activation_id := bound_authorization->>'activation_authorization_id';
  release_authority_sha := bound_authorization->>'release_authority_sha256';
  issued_at_value := (bound_authorization->>'proof_issued_at')::timestamptz;
  expires_at_value := (bound_authorization->>'proof_expires_at')::timestamptz;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-lifecycle-authorization-request.v1',bound_tenant_id,
    bound_authorization::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-lifecycle-authorization-request'||
    chr(31)||(bound_authorization->>'lifecycle_authorization_id'),0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         bound_authorization->>'lifecycle_authorization_id';
  IF FOUND THEN
    IF existing.request_sha256 IS DISTINCT FROM request_sha THEN
      RAISE EXCEPTION 'outlook desktop lifecycle authorization replay conflict'
        USING ERRCODE='LLC01';
    END IF;
    RETURN existing.response_text::jsonb;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-lifecycle-authorization-fingerprint'||
    chr(31)||(bound_authorization->>'request_fingerprint'),0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
   WHERE tenant_id=bound_tenant_id
     AND request_fingerprint=bound_authorization->>'request_fingerprint';
  IF FOUND THEN
    RAISE EXCEPTION 'outlook desktop lifecycle authorization replay conflict'
      USING ERRCODE='LLC01';
  END IF;
  IF bound_authorization->>'operation'='register' THEN
    SELECT activation_preflight.release_artifact_id INTO release_artifact_id_value
      FROM lawos_email_dms.outlook_desktop_activation_authorizations
        AS activation_preflight
     WHERE activation_preflight.tenant_id=bound_tenant_id
       AND activation_preflight.activation_authorization_id=activation_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'outlook desktop registration receipt activation mismatch';
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(
      bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
      release_artifact_id_value,0));
  ELSE
    SELECT * INTO challenge
      FROM lawos_email_dms.outlook_desktop_lifecycle_challenges
     WHERE tenant_id=bound_tenant_id
       AND lifecycle_challenge_id=
           bound_authorization->>'lifecycle_challenge_id';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'outlook desktop lifecycle challenge mismatch';
    END IF;
    release_artifact_id_value := challenge.release_artifact_id;
    PERFORM pg_advisory_xact_lock(hashtextextended(
      bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
      release_artifact_id_value,0));
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||(bound_authorization->>'user_id')||chr(31)||
    (bound_authorization->>'entra_subject_id'),0));
  SELECT * INTO release
    FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=release_artifact_id_value
   FOR UPDATE;
  IF bound_authorization->>'operation'='register' THEN
    IF expected_version<>1 THEN
      RAISE EXCEPTION 'outlook desktop registration receipt version invalid';
    END IF;
    SELECT * INTO activation
      FROM lawos_email_dms.outlook_desktop_activation_authorizations
     WHERE tenant_id=bound_tenant_id
       AND activation_authorization_id=activation_id
     FOR UPDATE;
    SELECT * INTO reservation
      FROM lawos_email_dms.outlook_desktop_activation_challenges
     WHERE tenant_id=bound_tenant_id
       AND activation_reference=activation_id
     FOR UPDATE;
    IF activation.tenant_id IS NULL OR reservation.tenant_id IS NULL
       OR release.tenant_id IS NULL
       OR activation.release_artifact_id<>release_artifact_id_value
       OR activation.consumed_at IS NOT NULL
       OR reservation.state<>'authorized'
       OR ROW(activation.user_id,activation.entra_subject_id,
         activation.device_key_fingerprint,
         activation.device_public_key_spki_sha256,
         activation.release_authority_sha256,
         activation.request_fingerprint,
         activation.device_proof_transcript_sha256,
         activation.server_nonce_sha256,
         activation.device_signature_sha256,
         activation.issued_challenge_sha256,
         activation.proof_id,activation.request_id,activation.event_id,
         activation.idempotency_key,activation.proof_issued_at,
         activation.proof_expires_at,activation.installation_id)
       IS DISTINCT FROM ROW(bound_authorization->>'user_id',
         bound_authorization->>'entra_subject_id',
         bound_authorization->>'device_key_fingerprint',
         bound_authorization->>'device_public_key_spki_sha256',
         release_authority_sha,bound_authorization->>'request_fingerprint',
         bound_authorization->>'proof_transcript_sha256',
         bound_authorization->>'nonce_hash',
         bound_authorization->>'device_signature_sha256',
         bound_authorization->>'issued_challenge_sha256',
         bound_authorization->>'lifecycle_authorization_id',
         bound_authorization->>'request_id',bound_authorization->>'event_id',
         bound_authorization->>'idempotency_key',
         issued_at_value,expires_at_value,
         bound_authorization->>'installation_id')
       OR ROW(reservation.installation_id,reservation.user_id,
         reservation.entra_subject_id,reservation.device_key_fingerprint,
         reservation.issued_challenge_sha256,
         reservation.challenge_nonce_sha256,
         reservation.authorization_binding_sha256,
         reservation.activation_authorization_receipt_sha256,
         reservation.issue_request_id,reservation.registration_event_id)
       IS DISTINCT FROM ROW(activation.installation_id,activation.user_id,
         activation.entra_subject_id,activation.device_key_fingerprint,
         activation.issued_challenge_sha256,activation.server_nonce_sha256,
         activation.authorization_binding_sha256,
         activation.activation_authorization_receipt_sha256,
         bound_authorization->>'request_id',bound_authorization->>'event_id') THEN
      RAISE EXCEPTION 'outlook desktop registration receipt activation mismatch';
    END IF;
    spki_sha := bound_authorization->>'device_public_key_spki_sha256';
  ELSE
    SELECT * INTO installation
      FROM lawos_email_dms.outlook_desktop_installations
     WHERE tenant_id=bound_tenant_id
       AND installation_id=bound_authorization->>'installation_id'
     FOR UPDATE;
    SELECT * INTO challenge
      FROM lawos_email_dms.outlook_desktop_lifecycle_challenges
     WHERE tenant_id=bound_tenant_id
       AND lifecycle_challenge_id=
           bound_authorization->>'lifecycle_challenge_id'
     FOR UPDATE;
    IF installation.tenant_id IS NULL OR challenge.tenant_id IS NULL
       OR release.tenant_id IS NULL OR installation.retired_at IS NOT NULL
       OR installation.state_version<>expected_version
       OR challenge.consumed_at IS NOT NULL
       OR ROW(installation.user_id,installation.entra_subject_id,
         installation.device_key_fingerprint,
         challenge.operation,challenge.user_id,challenge.entra_subject_id,
         challenge.installation_id,challenge.device_key_fingerprint,
         challenge.expected_state_version,challenge.request_id,
         challenge.event_id,challenge.idempotency_key,
         challenge.retire_intent_id,challenge.challenge_nonce_sha256,
         challenge.issued_challenge_sha256)
       IS DISTINCT FROM ROW(
         bound_authorization->>'user_id',bound_authorization->>'entra_subject_id',
         bound_authorization->>'device_key_fingerprint',
         bound_authorization->>'operation',bound_authorization->>'user_id',
         bound_authorization->>'entra_subject_id',
         bound_authorization->>'installation_id',
         bound_authorization->>'device_key_fingerprint',expected_version,
         bound_authorization->>'request_id',bound_authorization->>'event_id',
         bound_authorization->>'idempotency_key',
         bound_authorization->>'retire_intent_id',
         bound_authorization->>'nonce_hash',
         bound_authorization->>'issued_challenge_sha256') THEN
      RAISE EXCEPTION 'outlook desktop lifecycle receipt installation mismatch';
    END IF;
    spki_sha := encode(pg_catalog.sha256(
      decode(installation.device_public_key,'base64')),'hex');
    IF spki_sha<>installation.device_key_fingerprint
       OR spki_sha<>bound_authorization->>'device_public_key_spki_sha256' THEN
      RAISE EXCEPTION 'outlook desktop lifecycle receipt public key mismatch';
    END IF;
  END IF;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=now_at OR issued_at_value>now_at+interval '30 seconds'
     OR expires_at_value<=issued_at_value
     OR expires_at_value>issued_at_value+interval '5 minutes' THEN
    RAISE EXCEPTION 'outlook desktop lifecycle authorization window invalid';
  END IF;
  IF release.revoked_at IS NOT NULL
     AND bound_authorization->>'operation'<>'retire' THEN
    RAISE EXCEPTION 'outlook desktop lifecycle release authority invalid'
      USING ERRCODE='LOU01';
  END IF;
  IF release.valid_from>now_at
     OR release.valid_until<=now_at
     OR lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
          bound_tenant_id,release_artifact_id_value) IS DISTINCT FROM
        (CASE WHEN bound_authorization->>'operation'='register'
          THEN release_authority_sha ELSE challenge.release_authority_sha256 END) THEN
    RAISE EXCEPTION 'outlook desktop lifecycle release authority invalid';
  END IF;
  IF bound_authorization->>'operation'='register' AND (
       activation.valid_from>now_at OR activation.valid_until<=now_at) THEN
    RAISE EXCEPTION 'outlook desktop registration receipt activation mismatch';
  END IF;
  IF bound_authorization->>'operation'<>'register' AND (
       challenge.valid_until<=now_at
       OR issued_at_value<>challenge.issued_at
       OR expires_at_value<>challenge.valid_until) THEN
    RAISE EXCEPTION 'outlook desktop lifecycle challenge expired or changed';
  END IF;
  IF bound_authorization->>'operation'='heartbeat' AND EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation.installation_id
       AND operation='retire' AND consumed_at IS NULL
       AND proof_expires_at>now_at
  ) THEN
    RAISE EXCEPTION 'outlook desktop heartbeat fenced by retirement';
  END IF;
  expected_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-lifecycle-verifier-receipt.v1',bound_tenant_id,
    bound_authorization->>'lifecycle_authorization_id',
    bound_authorization->>'operation',bound_authorization->>'user_id',
    bound_authorization->>'entra_subject_id',
    bound_authorization->>'installation_id',
    bound_authorization->>'device_key_fingerprint',spki_sha,
    expected_version::text,
    bound_authorization->>'request_fingerprint',
    bound_authorization->>'proof_transcript_sha256',
    bound_authorization->>'nonce_hash',
    bound_authorization->>'device_signature_sha256',
    bound_authorization->>'proof_receipt_sha256',
    COALESCE(activation_id,''),COALESCE(release_authority_sha,''),
    COALESCE(bound_authorization->>'lifecycle_challenge_id',''),
    bound_authorization->>'issued_challenge_sha256',
    COALESCE(bound_authorization->>'request_id',''),
    COALESCE(bound_authorization->>'event_id',''),
    COALESCE(bound_authorization->>'idempotency_key',''),
    COALESCE(bound_authorization->>'retire_intent_id',''),
    ((extract(epoch FROM issued_at_value)*1000)::bigint)::text,
    ((extract(epoch FROM expires_at_value)*1000)::bigint)::text,
    ((extract(epoch FROM now_at)*1000)::bigint)::text
  ]);
  response_text_value := jsonb_build_object(
    'outcome','authorized','tenant_id',bound_tenant_id,
    'lifecycle_authorization_id',
      bound_authorization->>'lifecycle_authorization_id',
    'authorization_binding_sha256',expected_binding,
    'authorized_at',to_char(now_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(expires_at_value AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )::text;
  INSERT INTO lawos_email_dms.outlook_desktop_lifecycle_authorizations(
    tenant_id,lifecycle_authorization_id,operation,user_id,entra_subject_id,
    installation_id,device_key_fingerprint,device_public_key_spki_sha256,
    expected_state_version,request_fingerprint,proof_transcript_sha256,
    nonce_hash,device_signature_sha256,proof_receipt_sha256,
    issued_challenge_sha256,activation_authorization_id,
    release_authority_sha256,lifecycle_challenge_id,request_id,event_id,
    idempotency_key,retire_intent_id,
    proof_issued_at,proof_expires_at,authorized_at,authorization_binding_sha256,
    request_sha256,response_text
  ) VALUES (
    bound_tenant_id,bound_authorization->>'lifecycle_authorization_id',
    bound_authorization->>'operation',bound_authorization->>'user_id',
    bound_authorization->>'entra_subject_id',
    bound_authorization->>'installation_id',
    bound_authorization->>'device_key_fingerprint',spki_sha,expected_version,
    bound_authorization->>'request_fingerprint',
    bound_authorization->>'proof_transcript_sha256',
    bound_authorization->>'nonce_hash',
    bound_authorization->>'device_signature_sha256',
    bound_authorization->>'proof_receipt_sha256',
    bound_authorization->>'issued_challenge_sha256',activation_id,
    release_authority_sha,bound_authorization->>'lifecycle_challenge_id',
    bound_authorization->>'request_id',bound_authorization->>'event_id',
    bound_authorization->>'idempotency_key',
    bound_authorization->>'retire_intent_id',issued_at_value,
    expires_at_value,now_at,expected_binding,request_sha,response_text_value
  ) ON CONFLICT (tenant_id,lifecycle_authorization_id) DO NOTHING
  RETURNING true INTO claim_created;
  IF claim_created IS DISTINCT FROM true THEN
    SELECT * INTO existing
      FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
     WHERE tenant_id=bound_tenant_id
       AND lifecycle_authorization_id=
           bound_authorization->>'lifecycle_authorization_id'
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'outlook desktop lifecycle authorization snapshot stale'
        USING ERRCODE='40001';
    END IF;
    IF existing.request_sha256 IS DISTINCT FROM request_sha THEN
      RAISE EXCEPTION 'outlook desktop lifecycle authorization replay conflict'
        USING ERRCODE='LLC01';
    END IF;
    RETURN existing.response_text::jsonb;
  END IF;
  IF bound_authorization->>'operation'<>'register' THEN
    UPDATE lawos_email_dms.outlook_desktop_lifecycle_challenges
       SET consumed_at=now_at,
           lifecycle_authorization_id=
             bound_authorization->>'lifecycle_authorization_id'
     WHERE tenant_id=bound_tenant_id
       AND lifecycle_challenge_id=
           bound_authorization->>'lifecycle_challenge_id'
       AND consumed_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'outlook desktop lifecycle challenge snapshot stale'
        USING ERRCODE='40001';
    END IF;
  END IF;
  RETURN response_text_value::jsonb;
END
$$;

CREATE TRIGGER outlook_desktop_installation_release_binding_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_installation_release_bindings
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();
CREATE TRIGGER outlook_desktop_assignment_audit_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_assignment_audit_events
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();
CREATE TRIGGER outlook_desktop_assignment_receipt_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_assignment_outbox_receipts
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE TRIGGER outlook_desktop_assignment_roster_immutable
  BEFORE UPDATE OR DELETE ON lawos_email_dms.outlook_desktop_assignment_rosters
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();
CREATE TRIGGER outlook_desktop_assignment_canary_principal_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_assignment_canary_principals
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();
CREATE TRIGGER outlook_desktop_assignment_roster_member_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_assignment_roster_members
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.reject_outlook_desktop_immutable_mutation();

CREATE OR REPLACE FUNCTION lawos_email_dms.enforce_outlook_desktop_expansion_authorization()
RETURNS trigger LANGUAGE plpgsql
SET search_path=pg_catalog
AS $$
BEGIN
  IF TG_OP='DELETE' OR (TG_OP='UPDATE' AND (
       OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
       OR (to_jsonb(NEW)-'consumed_at') IS DISTINCT FROM
          (to_jsonb(OLD)-'consumed_at')
     )) THEN
    RAISE EXCEPTION 'outlook desktop expansion authorization is immutable';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER outlook_desktop_assignment_expansion_authorization_immutable
  BEFORE UPDATE OR DELETE
  ON lawos_email_dms.outlook_desktop_assignment_expansion_authorizations
  FOR EACH ROW EXECUTE FUNCTION
    lawos_email_dms.enforce_outlook_desktop_expansion_authorization();

CREATE OR REPLACE FUNCTION lawos_email_dms.authorize_outlook_desktop_assignment_expansion(
  bound_tenant_id text,
  bound_authorization jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing lawos_email_dms.outlook_desktop_assignment_expansion_authorizations%ROWTYPE;
DECLARE canary lawos_email_dms.outlook_desktop_assignment_canary_principals%ROWTYPE;
DECLARE canary_roster lawos_email_dms.outlook_desktop_assignment_rosters%ROWTYPE;
DECLARE now_at timestamptz;
DECLARE valid_until_at timestamptz;
DECLARE expected_binding text;
DECLARE request_sha text;
DECLARE response_text_value text;
DECLARE required_keys constant text[] := ARRAY[
  'expansion_authorization_id','canary_roster_version',
  'canary_success_evidence_sha256','expanded_roster_version',
  'expanded_roster_binding_sha256','owner_approval_sha256','valid_until'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_authorization)<>'object'
     OR NOT bound_authorization ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_authorization) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_authorization->>'expansion_authorization_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'canary_roster_version'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'expanded_roster_version'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'canary_success_evidence_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'expanded_roster_binding_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'owner_approval_sha256' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_authorization->>'valid_until') THEN
    RAISE EXCEPTION 'outlook desktop expansion authorization shape invalid';
  END IF;
  valid_until_at := (bound_authorization->>'valid_until')::timestamptz;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-assignment-expansion-request.v1',
    bound_tenant_id,bound_authorization::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-expansion-request'||chr(31)||
    (bound_authorization->>'expansion_authorization_id'),0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_assignment_expansion_authorizations
   WHERE tenant_id=bound_tenant_id
     AND expansion_authorization_id=
         bound_authorization->>'expansion_authorization_id';
  IF FOUND THEN
    IF existing.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop expansion authorization replay conflict';
    END IF;
    RETURN existing.response_text::jsonb;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-roster',0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-expansion',0));
  SELECT * INTO canary
    FROM lawos_email_dms.outlook_desktop_assignment_canary_principals
   WHERE tenant_id=bound_tenant_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop expansion requires current established canary';
  END IF;
  SELECT * INTO canary_roster
    FROM lawos_email_dms.outlook_desktop_assignment_rosters
   WHERE tenant_id=bound_tenant_id
     AND roster_version=bound_authorization->>'canary_roster_version'
     AND rollout_stage='jwsuh_canary'
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop expansion requires current established canary';
  END IF;
  PERFORM 1
    FROM lawos_email_dms.outlook_desktop_assignment_roster_members
   WHERE tenant_id=bound_tenant_id
     AND roster_version=canary_roster.roster_version
     AND user_id=canary.user_id
     AND entra_subject_id=canary.entra_subject_id
   FOR KEY SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop expansion requires current established canary';
  END IF;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF valid_until_at<=now_at OR valid_until_at>now_at+interval '5 minutes' THEN
    RAISE EXCEPTION 'outlook desktop expansion authorization window invalid';
  END IF;
  IF canary_roster.valid_from>now_at OR canary_roster.valid_until<=now_at THEN
    RAISE EXCEPTION 'outlook desktop expansion requires current established canary';
  END IF;
  expected_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-assignment-expansion-authorization.v1',
    bound_tenant_id,bound_authorization->>'expansion_authorization_id',
    bound_authorization->>'canary_roster_version',
    bound_authorization->>'canary_success_evidence_sha256',
    bound_authorization->>'expanded_roster_version',
    bound_authorization->>'expanded_roster_binding_sha256',
    bound_authorization->>'owner_approval_sha256',
    ((extract(epoch FROM now_at)*1000)::bigint)::text,
    ((extract(epoch FROM valid_until_at)*1000)::bigint)::text
  ]);
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_expansion_authorizations(
    tenant_id,expansion_authorization_id,canary_roster_version,
    canary_success_evidence_sha256,expanded_roster_version,
    expanded_roster_binding_sha256,owner_approval_sha256,
    authorization_binding_sha256,request_sha256,response_text,
    authorized_at,valid_until
  ) VALUES (
    bound_tenant_id,bound_authorization->>'expansion_authorization_id',
    bound_authorization->>'canary_roster_version',
    bound_authorization->>'canary_success_evidence_sha256',
    bound_authorization->>'expanded_roster_version',
    bound_authorization->>'expanded_roster_binding_sha256',
    bound_authorization->>'owner_approval_sha256',expected_binding,request_sha,
    jsonb_build_object(
      'outcome','authorized','tenant_id',bound_tenant_id,
      'expansion_authorization_id',
        bound_authorization->>'expansion_authorization_id',
      'authorization_binding_sha256',expected_binding,
      'authorized_at',now_at,'valid_until',valid_until_at
    )::text,now_at,valid_until_at
  );
  SELECT response_text INTO STRICT response_text_value
    FROM lawos_email_dms.outlook_desktop_assignment_expansion_authorizations
   WHERE tenant_id=bound_tenant_id
     AND expansion_authorization_id=
         bound_authorization->>'expansion_authorization_id';
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.register_outlook_desktop_installation(
  bound_tenant_id text,
  bound_registration jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE lifecycle_authorization lawos_email_dms.outlook_desktop_lifecycle_authorizations%ROWTYPE;
DECLARE activation_authorization lawos_email_dms.outlook_desktop_activation_authorizations%ROWTYPE;
DECLARE receipt record;
DECLARE binding_result jsonb;
DECLARE projection jsonb;
DECLARE response_body jsonb;
DECLARE now_at timestamptz;
DECLARE issued_at_value timestamptz;
DECLARE expires_at_value timestamptz;
DECLARE release_artifact_id text;
DECLARE idempotency_created boolean := false;
DECLARE required_keys constant text[] := ARRAY[
  'installation_id','user_id','entra_subject_id','device_public_key',
  'device_key_fingerprint','platform','app_version','source_sha',
  'activation_authorization_id','lifecycle_authorization_id',
  'device_command_sha256','issued_challenge_sha256',
  'proof_transcript_sha256','request_id','event_id','idempotency_key',
  'request_fingerprint','nonce_hash','device_signature_sha256',
  'issued_at','expires_at'
];
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_registration)<>'object'
     OR NOT bound_registration ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_registration) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_registration->>'installation_id' !~ '^odi_[A-Za-z0-9_-]{20,128}$'
     OR bound_registration->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_registration->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR char_length(bound_registration->>'device_public_key') NOT BETWEEN 40 AND 512
     OR bound_registration->>'device_key_fingerprint' !~ '^[a-f0-9]{64}$'
     OR octet_length(decode(bound_registration->>'device_public_key','base64'))<>44
     OR encode(decode(bound_registration->>'device_public_key','base64'),'base64')<>
        bound_registration->>'device_public_key'
     OR encode(substring(decode(bound_registration->>'device_public_key','base64')
                  FROM 1 FOR 12),'hex')<>'302a300506032b6570032100'
     OR encode(pg_catalog.sha256(
          decode(bound_registration->>'device_public_key','base64')),'hex')<>
        bound_registration->>'device_key_fingerprint'
     OR bound_registration->>'platform'<>'darwin'
     OR bound_registration->>'app_version'
        !~ '^[0-9]+[.][0-9]+[.][0-9]+([-+][0-9A-Za-z.-]+)?$'
     OR bound_registration->>'source_sha' !~ '^[a-f0-9]{40}$'
     OR bound_registration->>'activation_authorization_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_registration->>'lifecycle_authorization_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_registration->>'proof_transcript_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_registration->>'device_command_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_registration->>'issued_challenge_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_registration->>'request_id' !~ '^oar_[A-Za-z0-9_-]{20,128}$'
     OR bound_registration->>'event_id' !~ '^oae_[a-f0-9]{32}$'
     OR bound_registration->>'idempotency_key' !~ '^oar_[A-Za-z0-9_-]{20,128}$'
     OR bound_registration->>'request_id'<>
        bound_registration->>'idempotency_key'
     OR bound_registration->>'request_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_registration->>'nonce_hash' !~ '^[a-f0-9]{64}$'
     OR bound_registration->>'device_signature_sha256' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_registration->>'issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_registration->>'expires_at') THEN
    RAISE EXCEPTION 'outlook desktop registration shape invalid';
  END IF;
  issued_at_value := (bound_registration->>'issued_at')::timestamptz;
  expires_at_value := (bound_registration->>'expires_at')::timestamptz;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-installation-register-request'||chr(31)||
    (bound_registration->>'user_id')||chr(31)||
    (bound_registration->>'idempotency_key'),0));
  SELECT operation,request_fingerprint,response_status,response INTO receipt
    FROM lawos_email_dms.outlook_desktop_installation_idempotency
   WHERE tenant_id=bound_tenant_id
     AND user_id=bound_registration->>'user_id'
     AND idempotency_key=bound_registration->>'idempotency_key';
  IF FOUND THEN
    IF receipt.operation<>'register'
       OR receipt.request_fingerprint<>
          bound_registration->>'request_fingerprint' THEN
      RAISE EXCEPTION 'outlook desktop registration idempotency conflict';
    END IF;
    RETURN jsonb_build_object(
      'response_status',receipt.response_status,'body',receipt.response
    );
  END IF;
  SELECT activation.release_artifact_id INTO release_artifact_id
    FROM lawos_email_dms.outlook_desktop_activation_authorizations AS activation
   WHERE activation.tenant_id=bound_tenant_id
     AND activation.activation_authorization_id=
         bound_registration->>'activation_authorization_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop registration verifier receipt invalid';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    release_artifact_id,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||(bound_registration->>'user_id')||chr(31)||
    (bound_registration->>'entra_subject_id'),0));
  SELECT * INTO lifecycle_authorization
    FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         bound_registration->>'lifecycle_authorization_id'
   FOR UPDATE;
  SELECT * INTO activation_authorization
    FROM lawos_email_dms.outlook_desktop_activation_authorizations
   WHERE tenant_id=bound_tenant_id
     AND activation_authorization_id=
         bound_registration->>'activation_authorization_id'
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=now_at OR issued_at_value>now_at+interval '30 seconds'
     OR expires_at_value<=issued_at_value
     OR expires_at_value>issued_at_value+interval '5 minutes' THEN
    RAISE EXCEPTION 'outlook desktop registration proof window invalid';
  END IF;
  IF lifecycle_authorization.tenant_id IS NULL
     OR activation_authorization.tenant_id IS NULL
     OR activation_authorization.release_artifact_id<>release_artifact_id
     OR lifecycle_authorization.consumed_at IS NOT NULL
     OR lifecycle_authorization.operation<>'register'
     OR lifecycle_authorization.proof_expires_at<=now_at
     OR lifecycle_authorization.activation_authorization_id<>
        activation_authorization.activation_authorization_id
     OR lifecycle_authorization.release_authority_sha256<>
        activation_authorization.release_authority_sha256
     OR ROW(activation_authorization.installation_id,
       activation_authorization.proof_id,activation_authorization.request_id,
       activation_authorization.event_id,activation_authorization.idempotency_key,
       activation_authorization.request_fingerprint,
       activation_authorization.device_proof_request_sha256,
       activation_authorization.device_proof_transcript_sha256,
       activation_authorization.server_nonce_sha256,
       activation_authorization.device_signature_sha256,
       activation_authorization.issued_challenge_sha256,
       activation_authorization.proof_issued_at,
       activation_authorization.proof_expires_at)
       IS DISTINCT FROM ROW(bound_registration->>'installation_id',
       bound_registration->>'lifecycle_authorization_id',
       bound_registration->>'request_id',bound_registration->>'event_id',
       bound_registration->>'idempotency_key',
       bound_registration->>'request_fingerprint',
       bound_registration->>'device_command_sha256',
       bound_registration->>'proof_transcript_sha256',
       bound_registration->>'nonce_hash',
       bound_registration->>'device_signature_sha256',
       bound_registration->>'issued_challenge_sha256',
       issued_at_value,expires_at_value)
     OR ROW(lifecycle_authorization.user_id,
       lifecycle_authorization.entra_subject_id,
       lifecycle_authorization.installation_id,
       lifecycle_authorization.device_key_fingerprint,
       lifecycle_authorization.device_public_key_spki_sha256,
       lifecycle_authorization.expected_state_version,
       lifecycle_authorization.request_fingerprint,
       lifecycle_authorization.proof_transcript_sha256,
       lifecycle_authorization.nonce_hash,
       lifecycle_authorization.device_signature_sha256,
       lifecycle_authorization.issued_challenge_sha256,
       lifecycle_authorization.request_id,lifecycle_authorization.event_id,
       lifecycle_authorization.idempotency_key,
       lifecycle_authorization.proof_issued_at,
       lifecycle_authorization.proof_expires_at)
       IS DISTINCT FROM ROW(bound_registration->>'user_id',
       bound_registration->>'entra_subject_id',
       bound_registration->>'installation_id',
       bound_registration->>'device_key_fingerprint',
       bound_registration->>'device_key_fingerprint',1::bigint,
       bound_registration->>'request_fingerprint',
       bound_registration->>'proof_transcript_sha256',
       bound_registration->>'nonce_hash',
       bound_registration->>'device_signature_sha256',
       bound_registration->>'issued_challenge_sha256',
       bound_registration->>'request_id',bound_registration->>'event_id',
       bound_registration->>'idempotency_key',issued_at_value,
       expires_at_value) THEN
    RAISE EXCEPTION 'outlook desktop registration verifier receipt invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_installations
     WHERE tenant_id=bound_tenant_id
       AND (installation_id=bound_registration->>'installation_id'
            OR device_key_fingerprint=
               bound_registration->>'device_key_fingerprint')
  ) THEN
    RAISE EXCEPTION 'outlook desktop registration installation conflict';
  END IF;
  INSERT INTO lawos_email_dms.outlook_desktop_installations(
    tenant_id,installation_id,user_id,entra_subject_id,device_public_key,
    device_key_fingerprint,platform,app_version,source_sha,registered_at,
    last_seen_at,lease_expires_at,state_version
  ) VALUES (
    bound_tenant_id,bound_registration->>'installation_id',
    bound_registration->>'user_id',bound_registration->>'entra_subject_id',
    bound_registration->>'device_public_key',
    bound_registration->>'device_key_fingerprint',
    bound_registration->>'platform',bound_registration->>'app_version',
    bound_registration->>'source_sha',now_at,now_at,
    now_at+interval '7 days',1
  ) ON CONFLICT DO NOTHING RETURNING * INTO installation;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop registration claim snapshot stale'
      USING ERRCODE='40001';
  END IF;
  UPDATE lawos_email_dms.outlook_desktop_lifecycle_authorizations
     SET consumed_at=now_at,resulting_state_version=installation.state_version
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         lifecycle_authorization.lifecycle_authorization_id;
  binding_result := lawos_email_dms.consume_outlook_desktop_activation_authorization_at(
    bound_tenant_id,jsonb_build_object(
      'activation_authorization_id',
        bound_registration->>'activation_authorization_id',
      'lifecycle_authorization_id',
        bound_registration->>'lifecycle_authorization_id',
      'installation_id',installation.installation_id,
      'user_id',installation.user_id,
      'entra_subject_id',installation.entra_subject_id,
      'device_key_fingerprint',installation.device_key_fingerprint,
      'device_public_key_spki_sha256',installation.device_key_fingerprint,
      'device_proof_request_sha256',
        bound_registration->>'device_command_sha256',
      'server_nonce_sha256',bound_registration->>'nonce_hash',
      'device_signature_sha256',
        bound_registration->>'device_signature_sha256'
    ),now_at
  );
  projection := lawos_email_dms.project_outlook_desktop_assignment_at(
    bound_tenant_id,installation.user_id,installation.entra_subject_id,
    'register',now_at
  );
  response_body := jsonb_build_object(
    'outcome','registered','installation',jsonb_build_object(
      'installation_id',installation.installation_id,'status','active',
      'state_version',installation.state_version,
      'lease_expires_at',installation.lease_expires_at,'retired_at',NULL
    )
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_nonces(
    tenant_id,installation_id,nonce_hash,request_fingerprint,idempotency_key,
    issued_at,expires_at,consumed_at
  ) VALUES (
    bound_tenant_id,installation.installation_id,
    bound_registration->>'nonce_hash',bound_registration->>'request_fingerprint',
    bound_registration->>'idempotency_key',issued_at_value,expires_at_value,now_at
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_idempotency(
    tenant_id,user_id,installation_id,idempotency_key,operation,
    request_fingerprint,response_status,response,created_at
  ) VALUES (
    bound_tenant_id,installation.user_id,installation.installation_id,
    bound_registration->>'idempotency_key','register',
    bound_registration->>'request_fingerprint',201,response_body,now_at
  ) ON CONFLICT (tenant_id,user_id,idempotency_key) DO NOTHING
  RETURNING true INTO idempotency_created;
  IF idempotency_created IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop registration receipt snapshot stale'
      USING ERRCODE='40001';
  END IF;
  INSERT INTO lawos_email_dms.outlook_desktop_installation_audit_events(
    tenant_id,event_id,installation_id,user_id,entra_subject_id,event_type,
    request_id,idempotency_key,state_version,details,occurred_at
  ) VALUES (
    bound_tenant_id,bound_registration->>'event_id',installation.installation_id,
    installation.user_id,installation.entra_subject_id,'registered',
    bound_registration->>'request_id',bound_registration->>'idempotency_key',
    installation.state_version,jsonb_build_object(
      'outcome','registered','installation_status','active',
      'release_artifact_id',binding_result->>'release_artifact_id',
      'installation_release_binding_sha256',
        binding_result->>'installation_release_binding_sha256',
      'device_signature_sha256',
        bound_registration->>'device_signature_sha256',
      'assignment_aggregate_sha256',projection->'state'->>'aggregate_sha256'
    ),now_at
  );
  RETURN jsonb_build_object('response_status',201,'body',response_body);
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.heartbeat_outlook_desktop_installation(
  bound_tenant_id text,
  bound_heartbeat jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE lifecycle_authorization lawos_email_dms.outlook_desktop_lifecycle_authorizations%ROWTYPE;
DECLARE receipt record;
DECLARE projection jsonb;
DECLARE response_body jsonb;
DECLARE transition text;
DECLARE now_at timestamptz;
DECLARE issued_at_value timestamptz;
DECLARE expires_at_value timestamptz;
DECLARE expected_version bigint;
DECLARE bound_release_artifact_id text;
DECLARE idempotency_created boolean := false;
DECLARE required_keys constant text[] := ARRAY[
  'installation_id','user_id','entra_subject_id','device_key_fingerprint',
  'expected_state_version','issued_challenge_sha256',
  'lifecycle_authorization_id','lifecycle_challenge_id',
  'proof_transcript_sha256',
  'request_id','event_id','idempotency_key',
  'request_fingerprint','nonce_hash','device_signature_sha256',
  'issued_at','expires_at'
];
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_heartbeat)<>'object'
     OR NOT bound_heartbeat ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_heartbeat) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_heartbeat->>'installation_id' !~ '^odi_[A-Za-z0-9_-]{20,128}$'
     OR bound_heartbeat->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_heartbeat->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_heartbeat->>'device_key_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_heartbeat->>'lifecycle_authorization_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_heartbeat->>'lifecycle_challenge_id' !~ '^olc_[a-f0-9]{32}$'
     OR bound_heartbeat->>'issued_challenge_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_heartbeat->>'proof_transcript_sha256' !~ '^[a-f0-9]{64}$'
     OR jsonb_typeof(bound_heartbeat->'expected_state_version')<>'number'
     OR bound_heartbeat->>'expected_state_version' !~ '^[1-9][0-9]*$'
     OR bound_heartbeat->>'request_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_heartbeat->>'event_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_heartbeat->>'idempotency_key' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_heartbeat->>'request_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_heartbeat->>'nonce_hash' !~ '^[a-f0-9]{64}$'
     OR bound_heartbeat->>'device_signature_sha256' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_heartbeat->>'issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_heartbeat->>'expires_at') THEN
    RAISE EXCEPTION 'outlook desktop heartbeat shape invalid';
  END IF;
  expected_version := (bound_heartbeat->>'expected_state_version')::bigint;
  issued_at_value := (bound_heartbeat->>'issued_at')::timestamptz;
  expires_at_value := (bound_heartbeat->>'expires_at')::timestamptz;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-installation-heartbeat-request'||chr(31)||
    (bound_heartbeat->>'user_id')||chr(31)||
    (bound_heartbeat->>'idempotency_key'),0));
  SELECT operation,request_fingerprint,response_status,response INTO receipt
    FROM lawos_email_dms.outlook_desktop_installation_idempotency
   WHERE tenant_id=bound_tenant_id
     AND user_id=bound_heartbeat->>'user_id'
     AND idempotency_key=bound_heartbeat->>'idempotency_key';
  IF FOUND THEN
    IF receipt.operation<>'heartbeat'
       OR receipt.request_fingerprint<>bound_heartbeat->>'request_fingerprint' THEN
      RAISE EXCEPTION 'outlook desktop heartbeat idempotency conflict';
    END IF;
    RETURN jsonb_build_object(
      'response_status',receipt.response_status,'body',receipt.response
    );
  END IF;
  SELECT binding.release_artifact_id INTO bound_release_artifact_id
    FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
   WHERE binding.tenant_id=bound_tenant_id
     AND binding.installation_id=bound_heartbeat->>'installation_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop heartbeat release untrusted'
      USING ERRCODE='LOU01';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    bound_release_artifact_id,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||(bound_heartbeat->>'user_id')||chr(31)||
    (bound_heartbeat->>'entra_subject_id'),0));
  SELECT * INTO lifecycle_authorization
    FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         bound_heartbeat->>'lifecycle_authorization_id'
   FOR UPDATE;
  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id
     AND installation_id=bound_heartbeat->>'installation_id'
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=now_at OR issued_at_value>now_at+interval '30 seconds'
     OR expires_at_value<=issued_at_value
     OR expires_at_value>issued_at_value+interval '5 minutes' THEN
    RAISE EXCEPTION 'outlook desktop heartbeat proof window invalid';
  END IF;
  IF lifecycle_authorization.tenant_id IS NULL
     OR lifecycle_authorization.consumed_at IS NOT NULL
     OR lifecycle_authorization.operation<>'heartbeat'
     OR lifecycle_authorization.proof_expires_at<=now_at
     OR ROW(lifecycle_authorization.user_id,
       lifecycle_authorization.entra_subject_id,
       lifecycle_authorization.installation_id,
       lifecycle_authorization.device_key_fingerprint,
       lifecycle_authorization.device_public_key_spki_sha256,
       lifecycle_authorization.expected_state_version,
       lifecycle_authorization.request_fingerprint,
       lifecycle_authorization.proof_transcript_sha256,
       lifecycle_authorization.nonce_hash,
       lifecycle_authorization.device_signature_sha256,
       lifecycle_authorization.issued_challenge_sha256,
       lifecycle_authorization.lifecycle_challenge_id,
       lifecycle_authorization.request_id,lifecycle_authorization.event_id,
       lifecycle_authorization.idempotency_key,
       lifecycle_authorization.proof_issued_at,
       lifecycle_authorization.proof_expires_at)
       IS DISTINCT FROM ROW(bound_heartbeat->>'user_id',
       bound_heartbeat->>'entra_subject_id',
       bound_heartbeat->>'installation_id',
       bound_heartbeat->>'device_key_fingerprint',
       bound_heartbeat->>'device_key_fingerprint',expected_version,
       bound_heartbeat->>'request_fingerprint',
       bound_heartbeat->>'proof_transcript_sha256',bound_heartbeat->>'nonce_hash',
       bound_heartbeat->>'device_signature_sha256',
       bound_heartbeat->>'issued_challenge_sha256',
       bound_heartbeat->>'lifecycle_challenge_id',
       bound_heartbeat->>'request_id',bound_heartbeat->>'event_id',
       bound_heartbeat->>'idempotency_key',issued_at_value,
       expires_at_value) THEN
    RAISE EXCEPTION 'outlook desktop heartbeat authorization invalid';
  END IF;
  IF installation.tenant_id IS NULL
     OR ROW(installation.user_id,installation.entra_subject_id,
       installation.device_key_fingerprint)
     IS DISTINCT FROM ROW(bound_heartbeat->>'user_id',
       bound_heartbeat->>'entra_subject_id',
       bound_heartbeat->>'device_key_fingerprint') THEN
    RAISE EXCEPTION 'outlook desktop heartbeat installation mismatch';
  END IF;
  IF installation.retired_at IS NOT NULL
     OR installation.state_version<>expected_version THEN
    RAISE EXCEPTION 'outlook desktop heartbeat state version conflict';
  END IF;
  IF EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation.installation_id
       AND operation='retire' AND consumed_at IS NULL
       AND proof_expires_at>now_at
  ) THEN
    RAISE EXCEPTION 'outlook desktop heartbeat fenced by retirement';
  END IF;
  IF EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_installation_nonces
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation.installation_id
       AND nonce_hash=bound_heartbeat->>'nonce_hash'
  ) THEN
    RAISE EXCEPTION 'outlook desktop heartbeat nonce replay';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
      JOIN lawos_email_dms.outlook_desktop_activation_authorizations AS activation
        ON activation.tenant_id=binding.tenant_id
       AND activation.activation_authorization_id=binding.activation_authorization_id
       AND activation.consumed_installation_id=installation.installation_id
      JOIN lawos_email_dms.outlook_desktop_release_artifacts AS artifact
        ON artifact.tenant_id=binding.tenant_id
       AND artifact.release_artifact_id=binding.release_artifact_id
      JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
        ON audit.tenant_id=artifact.tenant_id
       AND audit.event_id=binding.approval_audit_event_id
       AND audit.event_type='approved'
     WHERE binding.tenant_id=bound_tenant_id
       AND binding.installation_id=installation.installation_id
       AND binding.release_artifact_id=bound_release_artifact_id
       AND artifact.revoked_at IS NULL
       AND artifact.valid_from<=now_at AND artifact.valid_until>now_at
       AND binding.release_valid_until=artifact.valid_until
       AND binding.release_ticket_sha256=artifact.embedded_release_ticket_sha256
       AND binding.release_ticket_signature_sha256=
           artifact.embedded_release_ticket_signature_sha256
       AND binding.approval_audit_event_binding_sha256=audit.event_binding_sha256
       AND activation.release_authority_sha256 IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'outlook desktop heartbeat release untrusted'
      USING ERRCODE='LOU01';
  END IF;
  transition := CASE WHEN installation.lease_expires_at<=now_at
    THEN 'resumed' ELSE 'heartbeat' END;
  UPDATE lawos_email_dms.outlook_desktop_installations
     SET last_seen_at=now_at,
         lease_expires_at=GREATEST(lease_expires_at,now_at+interval '7 days'),
         state_version=state_version+1
   WHERE tenant_id=bound_tenant_id
     AND installation_id=installation.installation_id
     AND state_version=expected_version
  RETURNING * INTO installation;
  UPDATE lawos_email_dms.outlook_desktop_lifecycle_authorizations
     SET consumed_at=now_at,resulting_state_version=installation.state_version
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         lifecycle_authorization.lifecycle_authorization_id;
  projection := lawos_email_dms.project_outlook_desktop_assignment_at(
    bound_tenant_id,installation.user_id,installation.entra_subject_id,
    'heartbeat',now_at
  );
  response_body := jsonb_build_object(
    'outcome',transition,'installation',jsonb_build_object(
      'installation_id',installation.installation_id,'status','active',
      'state_version',installation.state_version,
      'lease_expires_at',installation.lease_expires_at,'retired_at',NULL
    )
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_nonces(
    tenant_id,installation_id,nonce_hash,request_fingerprint,idempotency_key,
    issued_at,expires_at,consumed_at
  ) VALUES (
    bound_tenant_id,installation.installation_id,bound_heartbeat->>'nonce_hash',
    bound_heartbeat->>'request_fingerprint',bound_heartbeat->>'idempotency_key',
    issued_at_value,expires_at_value,now_at
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_idempotency(
    tenant_id,user_id,installation_id,idempotency_key,operation,
    request_fingerprint,response_status,response,created_at
  ) VALUES (
    bound_tenant_id,installation.user_id,installation.installation_id,
    bound_heartbeat->>'idempotency_key','heartbeat',
    bound_heartbeat->>'request_fingerprint',200,response_body,now_at
  ) ON CONFLICT (tenant_id,user_id,idempotency_key) DO NOTHING
  RETURNING true INTO idempotency_created;
  IF idempotency_created IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop heartbeat receipt snapshot stale'
      USING ERRCODE='40001';
  END IF;
  INSERT INTO lawos_email_dms.outlook_desktop_installation_audit_events(
    tenant_id,event_id,installation_id,user_id,entra_subject_id,event_type,
    request_id,idempotency_key,state_version,details,occurred_at
  ) VALUES (
    bound_tenant_id,bound_heartbeat->>'event_id',installation.installation_id,
    installation.user_id,installation.entra_subject_id,transition,
    bound_heartbeat->>'request_id',bound_heartbeat->>'idempotency_key',
    installation.state_version,jsonb_build_object(
      'outcome',transition,'installation_status','active',
      'device_signature_sha256',bound_heartbeat->>'device_signature_sha256',
      'assignment_aggregate_sha256',projection->'state'->>'aggregate_sha256'
    ),now_at
  );
  RETURN jsonb_build_object('response_status',200,'body',response_body);
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.retire_outlook_desktop_installation(
  bound_tenant_id text,
  bound_retirement jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE lifecycle_authorization lawos_email_dms.outlook_desktop_lifecycle_authorizations%ROWTYPE;
DECLARE receipt record;
DECLARE projection jsonb;
DECLARE response_body jsonb;
DECLARE now_at timestamptz;
DECLARE issued_at_value timestamptz;
DECLARE expires_at_value timestamptz;
DECLARE expected_version bigint;
DECLARE idempotency_created boolean := false;
DECLARE required_keys constant text[] := ARRAY[
  'installation_id','user_id','entra_subject_id','device_key_fingerprint',
  'expected_state_version','issued_challenge_sha256',
  'lifecycle_authorization_id','lifecycle_challenge_id',
  'retire_intent_id','retire_reason',
  'proof_transcript_sha256',
  'request_id','event_id',
  'idempotency_key','request_fingerprint','nonce_hash',
  'device_signature_sha256','issued_at','expires_at'
];
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_retirement)<>'object'
     OR NOT bound_retirement ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_retirement) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_retirement->>'installation_id' !~ '^odi_[A-Za-z0-9_-]{20,128}$'
     OR bound_retirement->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_retirement->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_retirement->>'device_key_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_retirement->>'lifecycle_authorization_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_retirement->>'lifecycle_challenge_id' !~ '^olc_[a-f0-9]{32}$'
     OR bound_retirement->>'retire_intent_id' !~ '^ori_[a-f0-9]{32}$'
     OR bound_retirement->>'issued_challenge_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_retirement->>'proof_transcript_sha256' !~ '^[a-f0-9]{64}$'
     OR jsonb_typeof(bound_retirement->'expected_state_version')<>'number'
     OR bound_retirement->>'expected_state_version' !~ '^[1-9][0-9]*$'
     OR bound_retirement->>'retire_reason' NOT IN (
       'device_disconnect','windows_uninstall','account_removed','installation_replaced')
     OR bound_retirement->>'request_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_retirement->>'event_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_retirement->>'idempotency_key' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_retirement->>'request_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_retirement->>'nonce_hash' !~ '^[a-f0-9]{64}$'
     OR bound_retirement->>'device_signature_sha256' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_retirement->>'issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_retirement->>'expires_at') THEN
    RAISE EXCEPTION 'outlook desktop retirement shape invalid';
  END IF;
  expected_version := (bound_retirement->>'expected_state_version')::bigint;
  issued_at_value := (bound_retirement->>'issued_at')::timestamptz;
  expires_at_value := (bound_retirement->>'expires_at')::timestamptz;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-installation-retire-request'||chr(31)||
    (bound_retirement->>'user_id')||chr(31)||
    (bound_retirement->>'idempotency_key'),0));
  SELECT operation,request_fingerprint,response_status,response INTO receipt
    FROM lawos_email_dms.outlook_desktop_installation_idempotency
   WHERE tenant_id=bound_tenant_id
     AND user_id=bound_retirement->>'user_id'
     AND idempotency_key=bound_retirement->>'idempotency_key';
  IF FOUND THEN
    IF receipt.operation<>'retire'
       OR receipt.request_fingerprint<>
          bound_retirement->>'request_fingerprint' THEN
      RAISE EXCEPTION 'outlook desktop retirement idempotency conflict';
    END IF;
    RETURN jsonb_build_object(
      'response_status',receipt.response_status,'body',receipt.response
    );
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||(bound_retirement->>'user_id')||chr(31)||
    (bound_retirement->>'entra_subject_id'),0));
  SELECT * INTO lifecycle_authorization
    FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         bound_retirement->>'lifecycle_authorization_id'
   FOR UPDATE;
  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id
     AND installation_id=bound_retirement->>'installation_id'
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF expires_at_value<=now_at OR issued_at_value>now_at+interval '30 seconds'
     OR expires_at_value<=issued_at_value
     OR expires_at_value>issued_at_value+interval '5 minutes' THEN
    RAISE EXCEPTION 'outlook desktop retirement proof window invalid';
  END IF;
  IF lifecycle_authorization.tenant_id IS NULL
     OR lifecycle_authorization.consumed_at IS NOT NULL
     OR lifecycle_authorization.operation<>'retire'
     OR lifecycle_authorization.proof_expires_at<=now_at
     OR ROW(lifecycle_authorization.user_id,
       lifecycle_authorization.entra_subject_id,
       lifecycle_authorization.installation_id,
       lifecycle_authorization.device_key_fingerprint,
       lifecycle_authorization.device_public_key_spki_sha256,
       lifecycle_authorization.expected_state_version,
       lifecycle_authorization.request_fingerprint,
       lifecycle_authorization.proof_transcript_sha256,
       lifecycle_authorization.nonce_hash,
       lifecycle_authorization.device_signature_sha256,
       lifecycle_authorization.issued_challenge_sha256,
       lifecycle_authorization.lifecycle_challenge_id,
       lifecycle_authorization.request_id,lifecycle_authorization.event_id,
       lifecycle_authorization.idempotency_key,
       lifecycle_authorization.retire_intent_id,
       lifecycle_authorization.proof_issued_at,
       lifecycle_authorization.proof_expires_at)
       IS DISTINCT FROM ROW(bound_retirement->>'user_id',
       bound_retirement->>'entra_subject_id',
       bound_retirement->>'installation_id',
       bound_retirement->>'device_key_fingerprint',
       bound_retirement->>'device_key_fingerprint',expected_version,
       bound_retirement->>'request_fingerprint',
       bound_retirement->>'proof_transcript_sha256',
       bound_retirement->>'nonce_hash',
       bound_retirement->>'device_signature_sha256',
       bound_retirement->>'issued_challenge_sha256',
       bound_retirement->>'lifecycle_challenge_id',
       bound_retirement->>'request_id',bound_retirement->>'event_id',
       bound_retirement->>'idempotency_key',
       bound_retirement->>'retire_intent_id',issued_at_value,
       expires_at_value) THEN
    RAISE EXCEPTION 'outlook desktop retirement authorization invalid';
  END IF;
  IF installation.tenant_id IS NULL
     OR ROW(installation.user_id,installation.entra_subject_id,
       installation.device_key_fingerprint)
     IS DISTINCT FROM ROW(bound_retirement->>'user_id',
       bound_retirement->>'entra_subject_id',
       bound_retirement->>'device_key_fingerprint') THEN
    RAISE EXCEPTION 'outlook desktop retirement installation mismatch';
  END IF;
  IF installation.retired_at IS NOT NULL
     OR installation.state_version<expected_version THEN
    RAISE EXCEPTION 'outlook desktop retirement state version conflict';
  END IF;
  IF EXISTS (
    SELECT 1
      FROM generate_series(
        expected_version+1,installation.state_version
      ) AS expected_heartbeat(state_version)
     WHERE (
       SELECT count(*)
         FROM lawos_email_dms.outlook_desktop_installation_audit_events AS audit
        WHERE audit.tenant_id=bound_tenant_id
          AND audit.installation_id=installation.installation_id
          AND audit.user_id=installation.user_id
          AND audit.entra_subject_id=installation.entra_subject_id
          AND audit.state_version=expected_heartbeat.state_version
          AND audit.event_type IN ('heartbeat','resumed')
          AND audit.occurred_at>=lifecycle_authorization.proof_issued_at
     )<>1
  ) THEN
    RAISE EXCEPTION 'outlook desktop retirement cannot override state drift';
  END IF;
  IF EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_installation_nonces
     WHERE tenant_id=bound_tenant_id
       AND installation_id=installation.installation_id
       AND nonce_hash=bound_retirement->>'nonce_hash'
  ) THEN
    RAISE EXCEPTION 'outlook desktop retirement nonce replay';
  END IF;
  UPDATE lawos_email_dms.outlook_desktop_installations
     SET retired_at=now_at,retire_reason=bound_retirement->>'retire_reason',
         state_version=state_version+1
   WHERE tenant_id=bound_tenant_id
     AND installation_id=installation.installation_id
     AND state_version=installation.state_version
  RETURNING * INTO installation;
  UPDATE lawos_email_dms.outlook_desktop_lifecycle_authorizations
     SET consumed_at=now_at,resulting_state_version=installation.state_version
   WHERE tenant_id=bound_tenant_id
     AND lifecycle_authorization_id=
         lifecycle_authorization.lifecycle_authorization_id;
  projection := lawos_email_dms.project_outlook_desktop_assignment_at(
    bound_tenant_id,installation.user_id,installation.entra_subject_id,
    'retire',now_at
  );
  response_body := jsonb_build_object(
    'outcome','retired','installation',jsonb_build_object(
      'installation_id',installation.installation_id,'status','retired',
      'state_version',installation.state_version,
      'lease_expires_at',installation.lease_expires_at,
      'retired_at',installation.retired_at
    )
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_nonces(
    tenant_id,installation_id,nonce_hash,request_fingerprint,idempotency_key,
    issued_at,expires_at,consumed_at
  ) VALUES (
    bound_tenant_id,installation.installation_id,
    bound_retirement->>'nonce_hash',bound_retirement->>'request_fingerprint',
    bound_retirement->>'idempotency_key',issued_at_value,expires_at_value,now_at
  );
  INSERT INTO lawos_email_dms.outlook_desktop_installation_idempotency(
    tenant_id,user_id,installation_id,idempotency_key,operation,
    request_fingerprint,response_status,response,created_at
  ) VALUES (
    bound_tenant_id,installation.user_id,installation.installation_id,
    bound_retirement->>'idempotency_key','retire',
    bound_retirement->>'request_fingerprint',200,response_body,now_at
  ) ON CONFLICT (tenant_id,user_id,idempotency_key) DO NOTHING
  RETURNING true INTO idempotency_created;
  IF idempotency_created IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop retirement receipt snapshot stale'
      USING ERRCODE='40001';
  END IF;
  INSERT INTO lawos_email_dms.outlook_desktop_installation_audit_events(
    tenant_id,event_id,installation_id,user_id,entra_subject_id,event_type,
    request_id,idempotency_key,state_version,details,occurred_at
  ) VALUES (
    bound_tenant_id,bound_retirement->>'event_id',installation.installation_id,
    installation.user_id,installation.entra_subject_id,'retired',
    bound_retirement->>'request_id',bound_retirement->>'idempotency_key',
    installation.state_version,jsonb_build_object(
      'outcome','retired','installation_status','retired',
      'retire_reason',bound_retirement->>'retire_reason',
      'device_signature_sha256',bound_retirement->>'device_signature_sha256',
      'assignment_aggregate_sha256',projection->'state'->>'aggregate_sha256'
    ),now_at
  );
  RETURN jsonb_build_object('response_status',200,'body',response_body);
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.import_outlook_desktop_assignment_roster(
  bound_tenant_id text,
  bound_roster jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing lawos_email_dms.outlook_desktop_assignment_rosters%ROWTYPE;
DECLARE member jsonb;
DECLARE member_binding text;
DECLARE member_bindings text[] := ARRAY[]::text[];
DECLARE expected_binding text;
DECLARE canary lawos_email_dms.outlook_desktop_assignment_canary_principals%ROWTYPE;
DECLARE canary_member jsonb;
DECLARE canary_binding text;
DECLARE expansion_authorization lawos_email_dms.outlook_desktop_assignment_expansion_authorizations%ROWTYPE;
DECLARE now_at timestamptz;
DECLARE request_sha text;
DECLARE response_text_value text;
DECLARE canary_created boolean := false;
DECLARE roster_created boolean := false;
DECLARE required_keys constant text[] := ARRAY[
  'roster_version','rollout_stage','roster_binding_sha256',
  'owner_approval_sha256','expansion_authorization_id','approved_at',
  'valid_from','valid_until','members'
];
DECLARE member_keys constant text[] := ARRAY[
  'user_id','entra_subject_id','member_binding_sha256'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_roster)<>'object' OR NOT bound_roster ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_roster) AS key
                 WHERE key<>ALL(required_keys))
     OR jsonb_typeof(bound_roster->'members')<>'array'
     OR jsonb_array_length(bound_roster->'members') NOT BETWEEN 1 AND 10
     OR bound_roster->>'rollout_stage' NOT IN ('jwsuh_canary','expanded')
     OR (bound_roster->>'rollout_stage'='jwsuh_canary'
         AND jsonb_array_length(bound_roster->'members')<>1)
     OR (bound_roster->>'rollout_stage'='jwsuh_canary'
         AND bound_roster->'expansion_authorization_id'<>'null'::jsonb)
     OR (bound_roster->>'rollout_stage'='expanded' AND (
         jsonb_typeof(bound_roster->'expansion_authorization_id')<>'string'
         OR bound_roster->>'expansion_authorization_id'
            !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'))
     OR bound_roster->>'roster_version' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_roster->>'roster_binding_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_roster->>'owner_approval_sha256' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_roster->>'approved_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_roster->>'valid_from')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_roster->>'valid_until') THEN
    RAISE EXCEPTION 'outlook desktop assignment roster shape invalid';
  END IF;
  FOR member IN SELECT value FROM jsonb_array_elements(bound_roster->'members') LOOP
    IF jsonb_typeof(member)<>'object' OR NOT member ?& member_keys
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(member) AS key
                   WHERE key<>ALL(member_keys))
       OR member->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
       OR member->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
       OR member->>'member_binding_sha256' !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'outlook desktop assignment roster member invalid';
    END IF;
    member_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.outlook-desktop-assignment-roster-member.v1',bound_tenant_id,
      bound_roster->>'roster_version',member->>'user_id',
      member->>'entra_subject_id'
    ]);
    IF member_binding<>member->>'member_binding_sha256' THEN
      RAISE EXCEPTION 'outlook desktop assignment roster member binding mismatch';
    END IF;
    member_bindings := array_append(member_bindings,member_binding);
  END LOOP;
  SELECT array_agg(value ORDER BY value) INTO member_bindings
    FROM unnest(member_bindings) AS values(value);
  expected_binding := lawos_email_dms.outlook_desktop_binding_sha256(
    ARRAY['lawos.outlook-desktop-assignment-roster.v1',bound_tenant_id,
      bound_roster->>'roster_version',bound_roster->>'rollout_stage',
      COALESCE(bound_roster->>'expansion_authorization_id','none'),
      bound_roster->>'owner_approval_sha256',bound_roster->>'approved_at',
      bound_roster->>'valid_from',bound_roster->>'valid_until']||member_bindings
  );
  IF expected_binding<>bound_roster->>'roster_binding_sha256' THEN
    RAISE EXCEPTION 'outlook desktop assignment roster binding mismatch';
  END IF;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-assignment-roster-request.v1',
    bound_tenant_id,bound_roster::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-roster-request'||chr(31)||
    (bound_roster->>'roster_version'),0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_assignment_rosters
   WHERE tenant_id=bound_tenant_id
     AND roster_version=bound_roster->>'roster_version';
  IF FOUND THEN
    IF existing.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop assignment roster replay conflict';
    END IF;
    RETURN existing.response_text::jsonb;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-roster',0));
  IF bound_roster->>'rollout_stage'='expanded' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      bound_tenant_id||chr(31)||'outlook-assignment-expansion',0));
  END IF;
  IF bound_roster->>'rollout_stage'='jwsuh_canary' THEN
    canary_member := bound_roster->'members'->0;
    canary_binding := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.outlook-desktop-initial-canary-principal.v1',bound_tenant_id,
      canary_member->>'user_id',canary_member->>'entra_subject_id',
      'jwsuh_canary'
    ]);
    SELECT * INTO canary
      FROM lawos_email_dms.outlook_desktop_assignment_canary_principals
     WHERE tenant_id=bound_tenant_id
     FOR UPDATE;
    IF FOUND AND ROW(canary.user_id,canary.entra_subject_id,
         canary.principal_binding_sha256)
       IS DISTINCT FROM ROW(canary_member->>'user_id',
         canary_member->>'entra_subject_id',canary_binding) THEN
      RAISE EXCEPTION 'outlook desktop initial canary principal is immutable';
    ELSIF NOT FOUND THEN
      INSERT INTO lawos_email_dms.outlook_desktop_assignment_canary_principals(
        tenant_id,user_id,entra_subject_id,initial_roster_binding_sha256,
        principal_binding_sha256,established_at
      ) VALUES (
        bound_tenant_id,canary_member->>'user_id',
        canary_member->>'entra_subject_id',expected_binding,canary_binding,
        (bound_roster->>'approved_at')::timestamptz
      ) ON CONFLICT (tenant_id) DO NOTHING
      RETURNING true INTO canary_created;
      IF canary_created IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'outlook desktop canary receipt snapshot stale'
          USING ERRCODE='40001';
      END IF;
    END IF;
  END IF;
  IF bound_roster->>'rollout_stage'='expanded' THEN
    SELECT * INTO canary
      FROM lawos_email_dms.outlook_desktop_assignment_canary_principals
     WHERE tenant_id=bound_tenant_id
     FOR UPDATE;
    IF NOT FOUND OR NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(bound_roster->'members') AS item(value)
       WHERE value->>'user_id'=canary.user_id
         AND value->>'entra_subject_id'=canary.entra_subject_id
    ) THEN
      RAISE EXCEPTION 'outlook desktop expanded roster must retain initial canary';
    END IF;
    SELECT * INTO expansion_authorization
      FROM lawos_email_dms.outlook_desktop_assignment_expansion_authorizations
     WHERE tenant_id=bound_tenant_id
       AND expansion_authorization_id=
           bound_roster->>'expansion_authorization_id'
     FOR UPDATE;
    now_at := date_trunc('milliseconds',clock_timestamp());
    IF NOT FOUND OR expansion_authorization.consumed_at IS NOT NULL
       OR expansion_authorization.valid_until<=now_at
       OR expansion_authorization.expanded_roster_version<>
          bound_roster->>'roster_version'
       OR expansion_authorization.expanded_roster_binding_sha256<>
          bound_roster->>'roster_binding_sha256'
       OR expansion_authorization.owner_approval_sha256<>
          bound_roster->>'owner_approval_sha256' THEN
      RAISE EXCEPTION 'outlook desktop expanded roster authority invalid';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_assignment_rosters
     WHERE tenant_id=bound_tenant_id
       AND rollout_stage='expanded'
       AND bound_roster->>'rollout_stage'='jwsuh_canary'
  ) THEN
    RAISE EXCEPTION 'outlook desktop canary roster cannot follow expansion';
  END IF;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_rosters(
    tenant_id,roster_version,rollout_stage,expansion_authorization_id,
    roster_binding_sha256,request_sha256,response_text,
    owner_approval_sha256,approved_at,valid_from,valid_until
  ) VALUES (
    bound_tenant_id,bound_roster->>'roster_version',
    bound_roster->>'rollout_stage',bound_roster->>'expansion_authorization_id',
    expected_binding,request_sha,jsonb_build_object(
      'outcome','imported','tenant_id',bound_tenant_id,
      'roster_version',bound_roster->>'roster_version',
      'roster_binding_sha256',expected_binding,
      'member_count',jsonb_array_length(bound_roster->'members')
    )::text,
    bound_roster->>'owner_approval_sha256',
    (bound_roster->>'approved_at')::timestamptz,
    (bound_roster->>'valid_from')::timestamptz,
    (bound_roster->>'valid_until')::timestamptz
  ) ON CONFLICT (tenant_id,roster_version) DO NOTHING
  RETURNING true INTO roster_created;
  IF roster_created IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop roster receipt snapshot stale'
      USING ERRCODE='40001';
  END IF;
  FOR member IN SELECT value FROM jsonb_array_elements(bound_roster->'members') LOOP
    INSERT INTO lawos_email_dms.outlook_desktop_assignment_roster_members(
      tenant_id,roster_version,user_id,entra_subject_id,member_binding_sha256
    ) VALUES (
      bound_tenant_id,bound_roster->>'roster_version',member->>'user_id',
      member->>'entra_subject_id',member->>'member_binding_sha256'
    );
  END LOOP;
  IF bound_roster->>'rollout_stage'='expanded' THEN
    UPDATE lawos_email_dms.outlook_desktop_assignment_expansion_authorizations
       SET consumed_at=now_at
     WHERE tenant_id=bound_tenant_id
       AND expansion_authorization_id=
           bound_roster->>'expansion_authorization_id';
  END IF;
  SELECT response_text INTO STRICT response_text_value
    FROM lawos_email_dms.outlook_desktop_assignment_rosters
   WHERE tenant_id=bound_tenant_id
     AND roster_version=bound_roster->>'roster_version';
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.approve_outlook_desktop_assignment_policy(
  bound_tenant_id text,
  bound_approval jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing_approval lawos_email_dms.outlook_desktop_assignment_policy_approvals%ROWTYPE;
DECLARE current_policy lawos_email_dms.outlook_desktop_assignment_policies%ROWTYPE;
DECLARE roster lawos_email_dms.outlook_desktop_assignment_rosters%ROWTYPE;
DECLARE approval_row lawos_email_dms.outlook_desktop_assignment_policy_approvals%ROWTYPE;
DECLARE projected jsonb;
DECLARE now_at timestamptz;
DECLARE expected_policy_binding text;
DECLARE request_text_value text;
DECLARE request_sha text;
DECLARE response_text_value text;
DECLARE required_keys constant text[] := ARRAY[
  'approval_id','user_id','entra_subject_id','rollout_stage',
  'maximum_entitled','rollout_authorized','account_active','release_allowed',
  'policy_revision','roster_version','roster_binding_sha256',
  'owner_approval_sha256','policy_binding_sha256','approved_at',
  'valid_from','valid_until'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_approval)<>'object'
     OR NOT bound_approval ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_approval) AS key
                 WHERE key<>ALL(required_keys))
     OR jsonb_typeof(bound_approval->'maximum_entitled')<>'boolean'
     OR jsonb_typeof(bound_approval->'rollout_authorized')<>'boolean'
     OR jsonb_typeof(bound_approval->'account_active')<>'boolean'
     OR jsonb_typeof(bound_approval->'release_allowed')<>'boolean'
     OR jsonb_typeof(bound_approval->'policy_revision')<>'number'
     OR bound_approval->>'policy_revision' !~ '^[1-9][0-9]*$'
     OR bound_approval->>'rollout_stage' NOT IN ('jwsuh_canary','expanded')
     OR bound_approval->>'approval_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_approval->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_approval->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_approval->>'roster_version' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_approval->>'roster_binding_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_approval->>'owner_approval_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_approval->>'policy_binding_sha256' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_approval->>'approved_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_approval->>'valid_from')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(bound_approval->>'valid_until') THEN
    RAISE EXCEPTION 'outlook desktop policy approval shape invalid';
  END IF;
  request_text_value := bound_approval::text;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-assignment-policy-request.v1',bound_tenant_id,
    request_text_value
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-policy-request'||chr(31)||
    (bound_approval->>'approval_id'),0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-policy',0));
  SELECT * INTO existing_approval
    FROM lawos_email_dms.outlook_desktop_assignment_policy_approvals
   WHERE tenant_id=bound_tenant_id
     AND approval_id=bound_approval->>'approval_id';
  IF FOUND THEN
    IF existing_approval.request_sha256 IS DISTINCT FROM request_sha THEN
      RAISE EXCEPTION 'outlook desktop policy approval replay conflict'
        USING ERRCODE='LPC01';
    END IF;
    IF existing_approval.response_text IS NULL THEN
      RAISE EXCEPTION 'outlook desktop policy approval receipt incomplete'
        USING ERRCODE='40001';
    END IF;
    RETURN existing_approval.response_text::jsonb;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||(bound_approval->>'user_id')||chr(31)||
    (bound_approval->>'entra_subject_id'),0));
  expected_policy_binding := lawos_email_dms.outlook_desktop_binding_sha256(
    ARRAY[
      'lawos.outlook-desktop-assignment-policy-approval.v1',bound_tenant_id,
      bound_approval->>'approval_id',bound_approval->>'user_id',
      bound_approval->>'entra_subject_id',bound_approval->>'rollout_stage',
      bound_approval->>'maximum_entitled',
      bound_approval->>'rollout_authorized',bound_approval->>'account_active',
      bound_approval->>'release_allowed',bound_approval->>'policy_revision',
      bound_approval->>'roster_version',
      bound_approval->>'roster_binding_sha256',
      bound_approval->>'owner_approval_sha256',
      ((extract(epoch FROM (bound_approval->>'approved_at')::timestamptz)
        *1000)::bigint)::text,
      ((extract(epoch FROM (bound_approval->>'valid_from')::timestamptz)
        *1000)::bigint)::text,
      ((extract(epoch FROM (bound_approval->>'valid_until')::timestamptz)
        *1000)::bigint)::text
    ]);
  IF bound_approval->>'policy_binding_sha256'<>expected_policy_binding THEN
    RAISE EXCEPTION 'outlook desktop policy approval binding mismatch';
  END IF;
  SELECT * INTO current_policy
    FROM lawos_email_dms.outlook_desktop_assignment_policies
   WHERE tenant_id=bound_tenant_id
     AND user_id=bound_approval->>'user_id'
   FOR UPDATE;
  SELECT roster_row.* INTO roster
    FROM lawos_email_dms.outlook_desktop_assignment_rosters AS roster_row
    JOIN lawos_email_dms.outlook_desktop_assignment_roster_members AS member
      ON member.tenant_id=roster_row.tenant_id
     AND member.roster_version=roster_row.roster_version
   WHERE roster_row.tenant_id=bound_tenant_id
     AND roster_row.roster_version=bound_approval->>'roster_version'
     AND roster_row.rollout_stage=bound_approval->>'rollout_stage'
     AND roster_row.roster_binding_sha256=bound_approval->>'roster_binding_sha256'
     AND roster_row.owner_approval_sha256=bound_approval->>'owner_approval_sha256'
     AND member.user_id=bound_approval->>'user_id'
     AND member.entra_subject_id=bound_approval->>'entra_subject_id'
   FOR SHARE OF roster_row;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR roster.valid_from>(bound_approval->>'valid_from')::timestamptz
     OR roster.valid_until<(bound_approval->>'valid_until')::timestamptz
     OR (bound_approval->>'approved_at')::timestamptz>now_at
     OR (bound_approval->>'valid_until')::timestamptz<=now_at THEN
    RAISE EXCEPTION 'outlook desktop policy principal is not in approved roster';
  END IF;
  IF current_policy.tenant_id IS NOT NULL AND (
       current_policy.entra_subject_id<>bound_approval->>'entra_subject_id'
       OR (bound_approval->>'policy_revision')::bigint<=current_policy.policy_revision
     ) THEN
    RAISE EXCEPTION 'outlook desktop policy identity or revision conflict';
  END IF;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_policy_approvals(
    tenant_id,approval_id,user_id,entra_subject_id,rollout_stage,
    maximum_entitled,rollout_authorized,account_active,release_allowed,
    policy_revision,roster_version,roster_binding_sha256,owner_approval_sha256,
    policy_binding_sha256,request_sha256,response_text,
    approved_at,valid_from,valid_until
  ) VALUES (
    bound_tenant_id,bound_approval->>'approval_id',bound_approval->>'user_id',
    bound_approval->>'entra_subject_id',bound_approval->>'rollout_stage',
    (bound_approval->>'maximum_entitled')::boolean,
    (bound_approval->>'rollout_authorized')::boolean,
    (bound_approval->>'account_active')::boolean,
    (bound_approval->>'release_allowed')::boolean,
    (bound_approval->>'policy_revision')::bigint,
    bound_approval->>'roster_version',bound_approval->>'roster_binding_sha256',
    bound_approval->>'owner_approval_sha256',expected_policy_binding,
    request_sha,NULL,
    (bound_approval->>'approved_at')::timestamptz,
    (bound_approval->>'valid_from')::timestamptz,
    (bound_approval->>'valid_until')::timestamptz
  ) RETURNING * INTO approval_row;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_policies(
    tenant_id,user_id,entra_subject_id,approval_id,rollout_stage,
    maximum_entitled,rollout_authorized,account_active,release_allowed,
    policy_revision,roster_version,roster_binding_sha256,owner_approval_sha256,
    policy_binding_sha256,valid_from,valid_until,updated_at
  ) VALUES (
    approval_row.tenant_id,approval_row.user_id,approval_row.entra_subject_id,
    approval_row.approval_id,approval_row.rollout_stage,
    approval_row.maximum_entitled,approval_row.rollout_authorized,
    approval_row.account_active,approval_row.release_allowed,
    approval_row.policy_revision,approval_row.roster_version,
    approval_row.roster_binding_sha256,approval_row.owner_approval_sha256,
    approval_row.policy_binding_sha256,approval_row.valid_from,
    approval_row.valid_until,approval_row.approved_at
  ) ON CONFLICT (tenant_id,user_id) DO UPDATE SET
    approval_id=EXCLUDED.approval_id,rollout_stage=EXCLUDED.rollout_stage,
    maximum_entitled=EXCLUDED.maximum_entitled,
    rollout_authorized=EXCLUDED.rollout_authorized,
    account_active=EXCLUDED.account_active,release_allowed=EXCLUDED.release_allowed,
    policy_revision=EXCLUDED.policy_revision,roster_version=EXCLUDED.roster_version,
    roster_binding_sha256=EXCLUDED.roster_binding_sha256,
    owner_approval_sha256=EXCLUDED.owner_approval_sha256,
    policy_binding_sha256=EXCLUDED.policy_binding_sha256,
    valid_from=EXCLUDED.valid_from,valid_until=EXCLUDED.valid_until,
    updated_at=EXCLUDED.updated_at;
  projected := lawos_email_dms.project_outlook_desktop_assignment_at(
    bound_tenant_id,approval_row.user_id,approval_row.entra_subject_id,
    'policy_changed',now_at
  );
  response_text_value := jsonb_build_object(
    'outcome','approved','tenant_id',bound_tenant_id,
    'approval_id',approval_row.approval_id,'user_id',approval_row.user_id,
    'entra_subject_id',approval_row.entra_subject_id,
    'policy_revision',approval_row.policy_revision,
    'policy_binding_sha256',approval_row.policy_binding_sha256,
    'projection',projected
  )::text;
  UPDATE lawos_email_dms.outlook_desktop_assignment_policy_approvals
     SET response_text=response_text_value
   WHERE tenant_id=bound_tenant_id AND approval_id=approval_row.approval_id
     AND request_sha256=request_sha AND response_text IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop policy approval response finalization failed';
  END IF;
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.revoke_outlook_desktop_assignment_policy(
  bound_tenant_id text,
  bound_approval jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(bound_approval)<>'object'
     OR bound_approval->'maximum_entitled'<>'false'::jsonb
     OR bound_approval->'rollout_authorized'<>'false'::jsonb
     OR bound_approval->'account_active'<>'false'::jsonb
     OR bound_approval->'release_allowed'<>'false'::jsonb THEN
    RAISE EXCEPTION 'outlook desktop policy revocation approval invalid';
  END IF;
  RETURN lawos_email_dms.approve_outlook_desktop_assignment_policy(
    bound_tenant_id,bound_approval
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.authorize_outlook_desktop_activation(
  bound_tenant_id text,
  bound_authorization jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE existing lawos_email_dms.outlook_desktop_activation_authorizations%ROWTYPE;
DECLARE reservation lawos_email_dms.outlook_desktop_activation_challenges%ROWTYPE;
DECLARE packet_evidence_row
  lawos_email_dms.outlook_desktop_activation_operator_packet_evidence%ROWTYPE;
DECLARE release record;
DECLARE now_at timestamptz;
DECLARE proof_issued_at_value timestamptz;
DECLARE proof_expires_at_value timestamptz;
DECLARE authority_sha text;
DECLARE authorization_sha text;
DECLARE activation_authorization_receipt_sha text;
DECLARE evidence_binding_expected text;
DECLARE request_sha text;
DECLARE response_text_value text;
DECLARE authorization_created boolean := false;
DECLARE required_keys constant text[] := ARRAY[
  'activation_reference','challenge_nonce_sha256','device_command_sha256',
  'device_key_fingerprint','device_proof_transcript_sha256',
  'device_public_key_spki_sha256','device_signature_sha256',
  'entra_subject_id','event_id',
  'evidence_binding_sha256','idempotency_key','installation_id',
  'issued_challenge_sha256','proof_expires_at','proof_id','proof_issued_at',
  'request_fingerprint','request_id','user_id'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_authorization)<>'object'
     OR NOT bound_authorization ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_authorization) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_authorization->>'activation_reference'
        !~ '^oda_[A-Za-z0-9_-]{24}$'
     OR bound_authorization->>'installation_id'
        !~ '^odi_[A-Za-z0-9_-]{20,128}$'
     OR bound_authorization->>'user_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'entra_subject_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'proof_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_authorization->>'request_id' !~ '^oar_[A-Za-z0-9_-]{20,128}$'
     OR bound_authorization->>'event_id' !~ '^oae_[a-f0-9]{32}$'
     OR bound_authorization->>'idempotency_key'
        !~ '^oar_[A-Za-z0-9_-]{20,128}$'
     OR bound_authorization->>'request_id'<>
        bound_authorization->>'idempotency_key'
     OR bound_authorization->>'device_key_fingerprint' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'device_public_key_spki_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'device_public_key_spki_sha256'<>
        bound_authorization->>'device_key_fingerprint'
     OR bound_authorization->>'device_command_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'device_proof_transcript_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'challenge_nonce_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'device_signature_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'issued_challenge_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'evidence_binding_sha256' !~ '^[a-f0-9]{64}$'
     OR bound_authorization->>'request_fingerprint' !~ '^[a-f0-9]{64}$'
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_authorization->>'proof_issued_at')
     OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
       bound_authorization->>'proof_expires_at') THEN
    RAISE EXCEPTION 'outlook desktop activation authorization shape invalid';
  END IF;
  proof_issued_at_value :=
    (bound_authorization->>'proof_issued_at')::timestamptz;
  proof_expires_at_value :=
    (bound_authorization->>'proof_expires_at')::timestamptz;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-authorization-request.v2',
    bound_tenant_id,bound_authorization::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-activation-authorization-request'||
    chr(31)||(bound_authorization->>'activation_reference'),0));
  SELECT * INTO existing
    FROM lawos_email_dms.outlook_desktop_activation_authorizations
   WHERE tenant_id=bound_tenant_id
     AND activation_authorization_id=bound_authorization->>'activation_reference';
  IF FOUND THEN
    IF existing.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop activation authorization replay conflict'
        USING ERRCODE='LAC01';
    END IF;
    RETURN existing.response_text::jsonb;
  END IF;
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=bound_authorization->>'activation_reference';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop activation reference mismatch'
      USING ERRCODE='LAC02';
  END IF;
  IF reservation.issue_request_id<>bound_authorization->>'request_id'
     OR reservation.registration_event_id<>bound_authorization->>'event_id' THEN
    RAISE EXCEPTION 'outlook desktop activation authorization replay conflict'
      USING ERRCODE='LAC01';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    reservation.release_artifact_id,0));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||reservation.user_id||chr(31)||
    reservation.entra_subject_id,0));
  SELECT artifact.*,
         audit.event_id AS approval_audit_event_id,
         audit.event_binding_sha256 AS approval_audit_event_binding_sha256
    INTO release
    FROM lawos_email_dms.outlook_desktop_release_artifacts AS artifact
    JOIN lawos_email_dms.outlook_desktop_release_trust_audit_events AS audit
      ON audit.tenant_id=artifact.tenant_id
     AND audit.release_artifact_id=artifact.release_artifact_id
     AND audit.event_type='approved'
   WHERE artifact.tenant_id=bound_tenant_id
     AND artifact.release_artifact_id=reservation.release_artifact_id
   FOR UPDATE OF artifact;
  SELECT * INTO reservation
    FROM lawos_email_dms.outlook_desktop_activation_challenges
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=bound_authorization->>'activation_reference'
   FOR UPDATE;
  IF reservation.issue_request_id<>bound_authorization->>'request_id'
     OR reservation.registration_event_id<>bound_authorization->>'event_id' THEN
    RAISE EXCEPTION 'outlook desktop activation authorization replay conflict'
      USING ERRCODE='LAC01';
  END IF;
  SELECT * INTO packet_evidence_row
    FROM lawos_email_dms.outlook_desktop_activation_operator_packet_evidence
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=reservation.activation_reference;
  IF NOT FOUND
     OR packet_evidence_row.installation_id<>reservation.installation_id
     OR packet_evidence_row.request_id<>reservation.issue_request_id
     OR packet_evidence_row.core_request_sha256<>
        reservation.attachment_request_sha256
     OR packet_evidence_row.operator_receipt_sha256<>
        reservation.operator_receipt_sha256
     OR packet_evidence_row.operator_signature_sha256<>
        reservation.operator_signature_sha256
     OR packet_evidence_row.local_measurement_evidence_sha256<>
        reservation.local_measurement_evidence_sha256
     OR packet_evidence_row.issued_challenge_sha256<>
        reservation.issued_challenge_sha256
     OR packet_evidence_row.persisted_at<>reservation.attached_at THEN
    RAISE EXCEPTION 'outlook desktop activation evidence authority invalid';
  END IF;
  IF reservation.authorization_request_sha256 IS NOT NULL THEN
    IF reservation.authorization_request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop activation authorization replay conflict'
        USING ERRCODE='LAC01';
    END IF;
    RETURN reservation.authorization_response_text::jsonb;
  END IF;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF release.tenant_id IS NULL OR reservation.tenant_id IS NULL
     OR release.revoked_at IS NOT NULL
     OR release.valid_from>now_at OR release.valid_until<=now_at
     OR proof_expires_at_value<=now_at
     OR proof_issued_at_value>now_at+interval '30 seconds'
     OR proof_expires_at_value<=proof_issued_at_value
     OR proof_expires_at_value>proof_issued_at_value+interval '5 minutes'
     OR proof_expires_at_value>release.valid_until
     OR proof_expires_at_value>reservation.valid_until
     OR reservation.state<>'evidence_attached'
     OR ROW(reservation.installation_id,reservation.user_id,
       reservation.entra_subject_id,reservation.device_key_fingerprint,
       reservation.device_public_key_spki_sha256,
       reservation.challenge_nonce_sha256,reservation.issued_challenge_sha256)
       IS DISTINCT FROM ROW(bound_authorization->>'installation_id',
       bound_authorization->>'user_id',bound_authorization->>'entra_subject_id',
       bound_authorization->>'device_key_fingerprint',
       bound_authorization->>'device_public_key_spki_sha256',
       bound_authorization->>'challenge_nonce_sha256',
       bound_authorization->>'issued_challenge_sha256')
     OR release.embedded_release_ticket_sha256<>
        reservation.release_ticket_bytes_sha256
     OR release.embedded_release_ticket_signature_sha256<>
        reservation.release_ticket_owner_signature_sha256 THEN
    RAISE EXCEPTION 'outlook desktop activation release authority invalid';
  END IF;
  authority_sha :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,release.release_artifact_id);
  IF reservation.release_authority_sha256<>authority_sha THEN
    RAISE EXCEPTION 'outlook desktop activation release authority invalid';
  END IF;
  evidence_binding_expected :=
    lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.outlook-desktop-activation-evidence-binding.v1',bound_tenant_id,
      reservation.activation_reference,reservation.installation_id,
      reservation.issued_challenge_sha256,reservation.operator_receipt_sha256,
      reservation.operator_signature_sha256,
      reservation.local_measurement_evidence_sha256,
      bound_authorization->>'device_command_sha256',
      bound_authorization->>'device_proof_transcript_sha256',
      bound_authorization->>'device_signature_sha256',authority_sha
    ]);
  IF bound_authorization->>'evidence_binding_sha256'<>
     evidence_binding_expected THEN
    RAISE EXCEPTION 'outlook desktop activation evidence binding invalid';
  END IF;
  authorization_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-activation-authorization.v2',bound_tenant_id,
    reservation.activation_reference,reservation.installation_id,
    bound_authorization->>'user_id',bound_authorization->>'entra_subject_id',
    bound_authorization->>'device_key_fingerprint',
    bound_authorization->>'device_public_key_spki_sha256',
    bound_authorization->>'device_command_sha256',
    bound_authorization->>'device_proof_transcript_sha256',
    bound_authorization->>'challenge_nonce_sha256',
    bound_authorization->>'device_signature_sha256',
    reservation.issued_challenge_sha256,evidence_binding_expected,
    reservation.operator_receipt_sha256,
    packet_evidence_row.owner_operator_packet_sha256,
    packet_evidence_row.evidence_receipt_sha256,
    bound_authorization->>'proof_id',bound_authorization->>'request_id',
    bound_authorization->>'event_id',bound_authorization->>'idempotency_key',
    bound_authorization->>'request_fingerprint',
    release.release_artifact_id,reservation.release_ticket_bytes_sha256,
    reservation.release_ticket_owner_signature_sha256,
    release.approval_audit_event_id,release.approval_audit_event_binding_sha256,
    authority_sha,reservation.local_measurement_evidence_sha256,
    ((extract(epoch FROM proof_issued_at_value)*1000)::bigint)::text,
    ((extract(epoch FROM proof_expires_at_value)*1000)::bigint)::text,
    ((extract(epoch FROM now_at)*1000)::bigint)::text,
    ((extract(epoch FROM now_at)*1000)::bigint)::text,
    ((extract(epoch FROM proof_expires_at_value)*1000)::bigint)::text
  ]);
  activation_authorization_receipt_sha :=
    lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
      'lawos.outlook-desktop-activation-authorization-receipt.v2',
      bound_tenant_id,reservation.activation_reference,
      reservation.installation_id,reservation.user_id,
      reservation.entra_subject_id,reservation.device_key_fingerprint,
      reservation.issued_challenge_sha256,evidence_binding_expected,
      packet_evidence_row.owner_operator_packet_sha256,
      packet_evidence_row.evidence_receipt_sha256,
      bound_authorization->>'proof_id',bound_authorization->>'request_id',
      bound_authorization->>'event_id',bound_authorization->>'idempotency_key',
      bound_authorization->>'request_fingerprint',authority_sha,
      ((extract(epoch FROM now_at)*1000)::bigint)::text,
      ((extract(epoch FROM proof_expires_at_value)*1000)::bigint)::text
    ]);
  response_text_value := jsonb_build_object(
    'outcome','authorized','tenant_id',bound_tenant_id,
    'activation_reference',reservation.activation_reference,
    'installation_id',reservation.installation_id,
    'authorization_binding_sha256',authorization_sha,
    'activation_receipt_sha256',reservation.operator_receipt_sha256,
    'activation_authorization_receipt_sha256',
      activation_authorization_receipt_sha,
    'release_authority_sha256',authority_sha,
    'release_artifact_id',release.release_artifact_id,
    'authorized_at',to_char(now_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'valid_until',to_char(proof_expires_at_value AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )::text;
  INSERT INTO lawos_email_dms.outlook_desktop_activation_authorizations(
    tenant_id,activation_authorization_id,installation_id,user_id,entra_subject_id,
    device_key_fingerprint,device_public_key_spki_sha256,
    device_proof_request_sha256,device_proof_transcript_sha256,
    server_nonce_sha256,device_signature_sha256,
    release_artifact_id,release_ticket_bytes_sha256,
    release_ticket_owner_signature_sha256,approval_audit_event_id,
    approval_audit_event_binding_sha256,release_authority_sha256,
    activation_receipt_sha256,activation_authorization_receipt_sha256,
    local_measurement_evidence_sha256,
    issued_challenge_sha256,evidence_binding_sha256,
    owner_operator_packet_sha256,evidence_receipt_sha256,
    proof_id,request_id,event_id,idempotency_key,request_fingerprint,
    proof_issued_at,proof_expires_at,
    authorization_binding_sha256,request_sha256,response_text,
    authorized_at,valid_from,valid_until
  ) VALUES (
    bound_tenant_id,reservation.activation_reference,reservation.installation_id,
    bound_authorization->>'user_id',bound_authorization->>'entra_subject_id',
    bound_authorization->>'device_key_fingerprint',
    bound_authorization->>'device_public_key_spki_sha256',
    bound_authorization->>'device_command_sha256',
    bound_authorization->>'device_proof_transcript_sha256',
    bound_authorization->>'challenge_nonce_sha256',
    bound_authorization->>'device_signature_sha256',release.release_artifact_id,
    reservation.release_ticket_bytes_sha256,
    reservation.release_ticket_owner_signature_sha256,
    release.approval_audit_event_id,release.approval_audit_event_binding_sha256,
    authority_sha,reservation.operator_receipt_sha256,
    activation_authorization_receipt_sha,
    reservation.local_measurement_evidence_sha256,
    reservation.issued_challenge_sha256,evidence_binding_expected,
    packet_evidence_row.owner_operator_packet_sha256,
    packet_evidence_row.evidence_receipt_sha256,
    bound_authorization->>'proof_id',bound_authorization->>'request_id',
    bound_authorization->>'event_id',bound_authorization->>'idempotency_key',
    bound_authorization->>'request_fingerprint',
    proof_issued_at_value,proof_expires_at_value,
    authorization_sha,request_sha,response_text_value,
    now_at,now_at,proof_expires_at_value
  ) ON CONFLICT DO NOTHING
  RETURNING true INTO authorization_created;
  IF authorization_created IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop activation receipt snapshot stale'
      USING ERRCODE='40001';
  END IF;
  SELECT response_text INTO STRICT response_text_value
    FROM lawos_email_dms.outlook_desktop_activation_authorizations
   WHERE tenant_id=bound_tenant_id
     AND activation_authorization_id=reservation.activation_reference;
  UPDATE lawos_email_dms.outlook_desktop_activation_challenges
     SET authorization_request_sha256=request_sha,
         authorization_binding_sha256=authorization_sha,
         activation_authorization_receipt_sha256=
           activation_authorization_receipt_sha,
         authorization_response_text=response_text_value,
         device_command_sha256=bound_authorization->>'device_command_sha256',
         device_proof_transcript_sha256=
           bound_authorization->>'device_proof_transcript_sha256',
         device_signature_sha256=bound_authorization->>'device_signature_sha256',
         evidence_binding_sha256=evidence_binding_expected,
         proof_id=bound_authorization->>'proof_id',
         request_id=bound_authorization->>'request_id',
         event_id=bound_authorization->>'event_id',
         idempotency_key=bound_authorization->>'idempotency_key',
         request_fingerprint=bound_authorization->>'request_fingerprint',
         proof_issued_at=proof_issued_at_value,
         proof_expires_at=proof_expires_at_value,
         state='authorized',authorized_at=now_at
   WHERE tenant_id=bound_tenant_id
     AND activation_reference=reservation.activation_reference;
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.claim_outlook_desktop_assignment_jobs(
  bound_tenant_id text,
  bound_worker_id text,
  bound_limit integer,
  bound_lease_milliseconds integer,
  bound_max_attempts integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE now_at timestamptz;
DECLARE stale record;
DECLARE exhausted record;
DECLARE leased_jobs jsonb;
BEGIN
  IF session_user<>'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'outlook desktop assignment worker required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_worker_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_limit NOT BETWEEN 1 AND 100
     OR bound_lease_milliseconds NOT BETWEEN 1000 AND 300000
     OR bound_max_attempts NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'outlook desktop assignment claim input invalid';
  END IF;
  PERFORM job.outbox_id
    FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
   WHERE job.tenant_id=bound_tenant_id
     AND job.status IN ('pending','retry','ambiguous','leased','dead_letter')
   ORDER BY job.user_id,job.entra_subject_id,
            job.provider_generation,job.outbox_id
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  FOR stale IN
    UPDATE lawos_email_dms.outlook_desktop_assignment_outbox AS job
       SET status='superseded',lease_owner=NULL,lease_token=NULL,
           lease_expires_at=NULL,last_error_code='STALE_PROVIDER_INTENT',
           updated_at=now_at
      FROM lawos_email_dms.outlook_desktop_assignment_states AS state
     WHERE job.tenant_id=bound_tenant_id
       AND state.tenant_id=job.tenant_id AND state.user_id=job.user_id
       AND state.entra_subject_id=job.entra_subject_id
       AND job.remote_commit_state='not_sent'
       AND (job.status IN ('pending','retry','ambiguous')
            OR (job.status='leased' AND job.lease_expires_at<=now_at))
       AND (job.provider_generation<>state.provider_generation
            OR job.provider_intent_sha256<>state.provider_intent_sha256)
    RETURNING job.*
  LOOP
    INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
      tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
      provider_generation,provider_intent_sha256,details,occurred_at
    ) VALUES (
      stale.tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,
      stale.user_id,stale.entra_subject_id,'outbox_superseded',NULL,
      stale.provider_generation,stale.provider_intent_sha256,
      jsonb_build_object('reason','stale_not_sent'),now_at
    );
  END LOOP;
  FOR exhausted IN
    UPDATE lawos_email_dms.outlook_desktop_assignment_outbox AS job
       SET status='dead_letter',lease_owner=NULL,lease_token=NULL,
           lease_expires_at=NULL,last_error_code='MAX_ATTEMPTS',
           updated_at=now_at
     WHERE job.tenant_id=bound_tenant_id
       AND job.remote_commit_state='not_sent'
       AND job.retry_epoch_attempt_count>=bound_max_attempts
       AND job.available_at<=now_at
       AND (job.status IN ('pending','retry','ambiguous')
            OR (job.status='leased' AND job.lease_expires_at<=now_at))
    RETURNING job.*
  LOOP
    INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
      tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
      provider_generation,provider_intent_sha256,details,occurred_at
    ) VALUES (
      exhausted.tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,
      exhausted.user_id,exhausted.entra_subject_id,'outbox_dead_letter',NULL,
      exhausted.provider_generation,exhausted.provider_intent_sha256,
      jsonb_build_object('reason','max_attempts'),now_at
    );
  END LOOP;
  WITH candidates AS (
    SELECT job.ctid
      FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
      LEFT JOIN lawos_email_dms.outlook_desktop_assignment_states AS state
        ON state.tenant_id=job.tenant_id AND state.user_id=job.user_id
       AND state.entra_subject_id=job.entra_subject_id
     WHERE job.tenant_id=bound_tenant_id AND job.available_at<=now_at
       AND ((job.status IN ('pending','retry','ambiguous')
             OR (job.status='leased' AND job.lease_expires_at<=now_at))
            OR (job.status='dead_letter'
                AND job.remote_commit_state='unknown'))
       AND (job.remote_commit_state='unknown'
            OR job.retry_epoch_attempt_count<bound_max_attempts)
       AND (job.remote_commit_state='unknown'
            OR (state.provider_generation=job.provider_generation
                AND state.provider_intent_sha256=job.provider_intent_sha256))
       AND NOT EXISTS (
         SELECT 1
           FROM lawos_email_dms.outlook_desktop_assignment_outbox AS barrier
          WHERE barrier.tenant_id=job.tenant_id
            AND barrier.user_id=job.user_id
            AND barrier.entra_subject_id=job.entra_subject_id
            AND barrier.provider_generation<job.provider_generation
            AND barrier.remote_commit_state='unknown'
            AND barrier.status NOT IN ('completed','superseded')
       )
       AND NOT EXISTS (
         SELECT 1
           FROM lawos_email_dms.outlook_desktop_assignment_outbox AS earlier
          WHERE earlier.tenant_id=job.tenant_id
            AND earlier.user_id=job.user_id
            AND earlier.entra_subject_id=job.entra_subject_id
            AND earlier.outbox_id<>job.outbox_id
            AND earlier.provider_generation<job.provider_generation
            AND (earlier.status IN ('pending','retry','ambiguous')
                 OR (earlier.status='leased' AND earlier.lease_expires_at<=now_at)
                 OR (earlier.status='dead_letter'
                     AND earlier.remote_commit_state='unknown'))
       )
       AND NOT EXISTS (
         SELECT 1
           FROM lawos_email_dms.outlook_desktop_assignment_outbox AS active_lease
          WHERE active_lease.tenant_id=job.tenant_id
            AND active_lease.user_id=job.user_id
            AND active_lease.entra_subject_id=job.entra_subject_id
            AND active_lease.outbox_id<>job.outbox_id
            AND active_lease.status='leased'
            AND active_lease.lease_expires_at>now_at
       )
     ORDER BY job.provider_generation,job.available_at,job.created_at,job.outbox_id
     FOR UPDATE OF job SKIP LOCKED LIMIT bound_limit
  ), leased AS (
    UPDATE lawos_email_dms.outlook_desktop_assignment_outbox AS job
       SET status='leased',lease_owner=bound_worker_id,
           lease_token=pg_catalog.gen_random_uuid()::text,
           lease_expires_at=now_at+
             make_interval(secs=>bound_lease_milliseconds::double precision/1000),
           attempt_count=job.attempt_count+1,
           retry_epoch_attempt_count=job.retry_epoch_attempt_count+1,
           updated_at=now_at
      FROM candidates WHERE job.ctid=candidates.ctid
    RETURNING job.*
  ), audited AS (
    INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
      tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
      provider_generation,provider_intent_sha256,details,occurred_at
    ) SELECT tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,user_id,
        entra_subject_id,'outbox_leased',NULL,provider_generation,
        provider_intent_sha256,jsonb_build_object('attempt_count',attempt_count),
        now_at FROM leased RETURNING event_id
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(leased)||jsonb_build_object(
      'dispatch_mode',CASE WHEN remote_commit_state='unknown'
        THEN 'readback_only' ELSE 'mutate_then_readback' END
    ) ORDER BY provider_generation,outbox_id),'[]'::jsonb)
    INTO leased_jobs FROM leased;
  RETURN leased_jobs;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.begin_outlook_desktop_assignment_dispatch(
  bound_tenant_id text,
  bound_outbox_id text,
  bound_worker_id text,
  bound_lease_token text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE job lawos_email_dms.outlook_desktop_assignment_outbox%ROWTYPE;
DECLARE state lawos_email_dms.outlook_desktop_assignment_states%ROWTYPE;
DECLARE now_at timestamptz;
BEGIN
  IF session_user<>'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'outlook desktop assignment worker required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  SELECT * INTO job FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id AND outbox_id=bound_outbox_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||job.user_id||chr(31)||job.entra_subject_id,0));
  SELECT * INTO job FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id AND outbox_id=bound_outbox_id FOR UPDATE;
  SELECT * INTO state FROM lawos_email_dms.outlook_desktop_assignment_states
   WHERE tenant_id=job.tenant_id AND user_id=job.user_id
     AND entra_subject_id=job.entra_subject_id
   FOR UPDATE;
  now_at := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR job.status<>'leased' OR job.lease_owner<>bound_worker_id
     OR job.lease_token<>bound_lease_token OR job.lease_expires_at<=now_at THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  IF job.remote_commit_state='not_sent' AND (
       state.provider_generation<>job.provider_generation
       OR state.provider_intent_sha256<>job.provider_intent_sha256
     ) THEN
    UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
       SET status='superseded',lease_owner=NULL,lease_token=NULL,
           lease_expires_at=NULL,last_error_code='STALE_PROVIDER_INTENT',
           updated_at=now_at
     WHERE tenant_id=job.tenant_id AND outbox_id=job.outbox_id;
    RETURN jsonb_build_object(
      'outcome','superseded','provider_call_allowed',false
    );
  END IF;
  IF job.remote_commit_state='not_sent' AND EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_assignment_outbox AS barrier
     WHERE barrier.tenant_id=job.tenant_id AND barrier.user_id=job.user_id
       AND barrier.entra_subject_id=job.entra_subject_id
       AND barrier.provider_generation<job.provider_generation
       AND barrier.remote_commit_state='unknown'
       AND barrier.status NOT IN ('completed','superseded')
  ) THEN
    RAISE EXCEPTION 'outlook desktop assignment principal mutation fenced';
  END IF;
  IF job.remote_commit_state='unknown' THEN
    RETURN jsonb_build_object(
      'outcome','dispatch_ready','dispatch_mode','readback_only',
      'provider_call_allowed',false,'payload',job.payload
    );
  END IF;
  UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
     SET remote_commit_state='unknown',updated_at=now_at
   WHERE tenant_id=job.tenant_id AND outbox_id=job.outbox_id;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
    tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
    provider_generation,provider_intent_sha256,details,occurred_at
  ) VALUES (
    job.tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,job.user_id,
    job.entra_subject_id,'outbox_dispatch_started',NULL,
    job.provider_generation,job.provider_intent_sha256,'{}'::jsonb,now_at
  );
  RETURN jsonb_build_object(
    'outcome','dispatch_ready','dispatch_mode','mutate_then_readback',
    'provider_call_allowed',true,'payload',job.payload
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.complete_outlook_desktop_assignment_job(
  bound_tenant_id text,
  bound_completion jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE job lawos_email_dms.outlook_desktop_assignment_outbox%ROWTYPE;
DECLARE receipt lawos_email_dms.outlook_desktop_assignment_outbox_receipts%ROWTYPE;
DECLARE current_intent boolean;
DECLARE outcome_value text;
DECLARE completed_at_value timestamptz;
DECLARE completion_sha text;
DECLARE readback jsonb;
DECLARE response_value jsonb;
DECLARE response_text_value text;
DECLARE receipt_created boolean := false;
DECLARE required_keys constant text[] := ARRAY[
  'outbox_id','worker_id','lease_token','observed_assigned','result_code','readback'
];
DECLARE readback_keys constant text[] := ARRAY[
  'schema_version','request_terminal','propagation_stabilized','receipt_sha256'
];
BEGIN
  IF session_user<>'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'outlook desktop assignment worker required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF jsonb_typeof(bound_completion)<>'object'
     OR NOT bound_completion ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_completion) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_completion->>'outbox_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_completion->>'worker_id' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_completion->>'lease_token' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR jsonb_typeof(bound_completion->'observed_assigned')<>'boolean'
     OR bound_completion->>'result_code' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR jsonb_typeof(bound_completion->'readback')<>'object' THEN
    RAISE EXCEPTION 'outlook desktop assignment completion shape invalid';
  END IF;
  readback := bound_completion->'readback';
  IF NOT readback ?& readback_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(readback) AS key
                 WHERE key<>ALL(readback_keys))
     OR readback->>'schema_version'<>
        'lawos.outlook-assignment-authoritative-readback.v1'
     OR readback->'request_terminal'<>'true'::jsonb
     OR readback->'propagation_stabilized'<>'true'::jsonb
     OR readback->>'receipt_sha256' !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'outlook desktop assignment readback proof invalid';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-assignment-completion-request'||chr(31)||
    (bound_completion->>'outbox_id'),0));
  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_assignment_outbox_receipts
   WHERE tenant_id=bound_tenant_id
     AND outbox_id=bound_completion->>'outbox_id';
  IF FOUND THEN
    IF ROW(receipt.worker_id,receipt.lease_token,
       receipt.observed_assigned,receipt.result_code,receipt.request_terminal,
       receipt.propagation_stabilized,receipt.readback_receipt_sha256)
       IS DISTINCT FROM ROW(bound_completion->>'worker_id',
       bound_completion->>'lease_token',
       (bound_completion->>'observed_assigned')::boolean,
       bound_completion->>'result_code',true,true,
       readback->>'receipt_sha256') THEN
      RAISE EXCEPTION 'outlook desktop assignment completion replay mismatch';
    END IF;
    RETURN receipt.response_text::jsonb;
  END IF;
  SELECT * INTO job FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id
     AND outbox_id=bound_completion->>'outbox_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||job.user_id||chr(31)||job.entra_subject_id,0));
  SELECT * INTO job FROM lawos_email_dms.outlook_desktop_assignment_outbox
   WHERE tenant_id=bound_tenant_id
     AND outbox_id=bound_completion->>'outbox_id' FOR UPDATE;
  completed_at_value := date_trunc('milliseconds',clock_timestamp());
  IF NOT FOUND OR job.status<>'leased'
     OR job.lease_owner<>bound_completion->>'worker_id'
     OR job.lease_token<>bound_completion->>'lease_token'
     OR job.lease_expires_at<=completed_at_value THEN
    RAISE EXCEPTION 'outlook desktop assignment lease lost';
  END IF;
  IF job.remote_commit_state<>'unknown' THEN
    RAISE EXCEPTION 'outlook desktop assignment dispatch not started';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM lawos_email_dms.outlook_desktop_assignment_states AS state
     WHERE state.tenant_id=job.tenant_id AND state.user_id=job.user_id
       AND state.entra_subject_id=job.entra_subject_id
       AND state.provider_generation=job.provider_generation
       AND state.provider_intent_sha256=job.provider_intent_sha256
  ) INTO current_intent;
  IF (bound_completion->>'observed_assigned')::boolean=job.desired_assigned THEN
    outcome_value := 'completed';
    UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
       SET status='completed',remote_commit_state='confirmed',
           lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,
           result_code=bound_completion->>'result_code',last_error_code=NULL,
           updated_at=completed_at_value
     WHERE tenant_id=job.tenant_id AND outbox_id=job.outbox_id
    RETURNING * INTO job;
  ELSIF NOT current_intent THEN
    outcome_value := 'reconciled';
    UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
       SET status='superseded',remote_commit_state='reconciled',
           lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,
           result_code=bound_completion->>'result_code',last_error_code=NULL,
           updated_at=completed_at_value
     WHERE tenant_id=job.tenant_id AND outbox_id=job.outbox_id
    RETURNING * INTO job;
  ELSE
    RAISE EXCEPTION 'outlook desktop assignment provider readback mismatch';
  END IF;
  completion_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-assignment.completion.v2',job.tenant_id,job.outbox_id,
    job.operation_id,job.user_id,job.entra_subject_id,
    job.provider_generation::text,job.provider_intent_sha256,
    (bound_completion->>'observed_assigned'),bound_completion->>'result_code',
    bound_completion->>'worker_id',bound_completion->>'lease_token',
    'true','true',readback->>'receipt_sha256',outcome_value,
    ((extract(epoch FROM completed_at_value)*1000)::bigint)::text
  ]);
  response_value := jsonb_build_object('outcome',outcome_value,'job',to_jsonb(job));
  response_text_value := response_value::text;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_outbox_receipts(
    tenant_id,receipt_id,outbox_id,operation_id,user_id,entra_subject_id,
    provider_generation,provider_intent_sha256,observed_assigned,result_code,
    worker_id,lease_token,request_terminal,propagation_stabilized,
    readback_receipt_sha256,outcome,completion_binding_sha256,response_text,
    completed_at
  ) VALUES (
    job.tenant_id,job.outbox_id,job.outbox_id,job.operation_id,job.user_id,
    job.entra_subject_id,job.provider_generation,job.provider_intent_sha256,
    (bound_completion->>'observed_assigned')::boolean,
    bound_completion->>'result_code',bound_completion->>'worker_id',
    bound_completion->>'lease_token',true,true,readback->>'receipt_sha256',
    outcome_value,completion_sha,response_text_value,completed_at_value
  ) ON CONFLICT (tenant_id,outbox_id) DO NOTHING
  RETURNING true INTO receipt_created;
  IF receipt_created IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'outlook desktop completion receipt snapshot stale'
      USING ERRCODE='40001';
  END IF;
  INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
    tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
    provider_generation,provider_intent_sha256,details,occurred_at
  ) VALUES (
    job.tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,job.user_id,
    job.entra_subject_id,
    CASE WHEN outcome_value='completed' THEN 'outbox_completed'
         ELSE 'outbox_reconciled' END,NULL,job.provider_generation,
    job.provider_intent_sha256,jsonb_build_object(
      'result_code',bound_completion->>'result_code',
      'readback_receipt_sha256',readback->>'receipt_sha256'
    ),completed_at_value
  );
  RETURN response_text_value::jsonb;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.recover_outlook_desktop_assignment_removals(
  bound_tenant_id text,
  bound_limit integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE now_at timestamptz;
DECLARE recovered record;
DECLARE recovered_jobs jsonb := '[]'::jsonb;
BEGIN
  IF session_user<>'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'outlook desktop assignment worker required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'outlook desktop removal recovery limit invalid';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
      principal.tenant_id||chr(31)||principal.user_id||chr(31)||
      principal.entra_subject_id,0))
    FROM (
      SELECT DISTINCT job.tenant_id,job.user_id,job.entra_subject_id
        FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
       WHERE job.tenant_id=bound_tenant_id AND job.action='remove'
         AND job.status='dead_letter' AND job.remote_commit_state='not_sent'
       ORDER BY job.tenant_id,job.user_id,job.entra_subject_id
    ) AS principal;
  PERFORM job.outbox_id
    FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
    JOIN lawos_email_dms.outlook_desktop_assignment_states AS state
      ON state.tenant_id=job.tenant_id AND state.user_id=job.user_id
     AND state.entra_subject_id=job.entra_subject_id
     AND state.provider_generation=job.provider_generation
     AND state.provider_intent_sha256=job.provider_intent_sha256
   WHERE job.tenant_id=bound_tenant_id AND job.action='remove'
     AND NOT state.desired_assigned AND job.status='dead_letter'
     AND job.remote_commit_state='not_sent'
   ORDER BY job.provider_generation,job.created_at,job.outbox_id
   FOR UPDATE OF job;
  now_at := date_trunc('milliseconds',clock_timestamp());
  FOR recovered IN
    WITH candidates AS (
      SELECT job.ctid
        FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
        JOIN lawos_email_dms.outlook_desktop_assignment_states AS state
          ON state.tenant_id=job.tenant_id AND state.user_id=job.user_id
         AND state.entra_subject_id=job.entra_subject_id
         AND state.provider_generation=job.provider_generation
         AND state.provider_intent_sha256=job.provider_intent_sha256
       WHERE job.tenant_id=bound_tenant_id
         AND job.action='remove' AND NOT state.desired_assigned
         AND job.status='dead_letter'
         AND job.remote_commit_state='not_sent'
         AND job.available_at<=now_at
       ORDER BY job.provider_generation,job.created_at,job.outbox_id
       FOR UPDATE OF job SKIP LOCKED LIMIT bound_limit
    )
    UPDATE lawos_email_dms.outlook_desktop_assignment_outbox AS job
       SET status='retry',available_at=now_at,
           last_error_code='MANDATORY_REMOVE_RECOVERY',
           retry_epoch=job.retry_epoch+1,retry_epoch_attempt_count=0,
           escalation_count=job.escalation_count+1,last_escalated_at=now_at,
           updated_at=now_at
      FROM candidates WHERE job.ctid=candidates.ctid
    RETURNING job.*
  LOOP
    INSERT INTO lawos_email_dms.outlook_desktop_assignment_audit_events(
      tenant_id,event_id,user_id,entra_subject_id,event_type,state_revision,
      provider_generation,provider_intent_sha256,details,occurred_at
    ) VALUES (
      recovered.tenant_id,'assignment_event_'||pg_catalog.gen_random_uuid()::text,
      recovered.user_id,recovered.entra_subject_id,'outbox_escalated',NULL,
      recovered.provider_generation,recovered.provider_intent_sha256,
      jsonb_build_object(
        'reason','mandatory_remove_recovery',
        'prior_dead_letter_observable',true,
        'escalation_count',recovered.escalation_count
      ),now_at
    );
    recovered_jobs := recovered_jobs||jsonb_build_array(to_jsonb(recovered));
  END LOOP;
  RETURN recovered_jobs;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.replay_outlook_desktop_release_import(
  bound_tenant_id text,
  bound_request_id text,
  bound_artifact jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE receipt lawos_email_dms.outlook_desktop_release_import_receipts%ROWTYPE;
DECLARE request_sha text;
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-release-import-request.v1',bound_tenant_id,
    bound_request_id,bound_artifact::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release-import-request'||chr(31)||
    bound_request_id,0));
  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_release_import_receipts
   WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF receipt.request_sha256<>request_sha THEN
    RAISE EXCEPTION 'outlook desktop release import replay conflict';
  END IF;
  RETURN receipt.response_text;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.import_outlook_desktop_release_artifact(
  bound_tenant_id text,
  bound_request_id text,
  bound_artifact jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE artifact lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
DECLARE receipt lawos_email_dms.outlook_desktop_release_import_receipts%ROWTYPE;
DECLARE now_at timestamptz;
DECLARE request_sha text;
DECLARE audit_binding text;
DECLARE authority_sha text;
DECLARE response_text_value text;
DECLARE claim_created boolean := false;
DECLARE time_key text;
DECLARE required_keys constant text[] := ARRAY[
  'app_id','app_version','approval_audit_event_id','approval_sha256','arch',
  'channel','embedded_build_manifest_sha256','embedded_inner_artifact_bytes',
  'embedded_inner_artifact_sha256','embedded_release_ticket_sha256',
  'embedded_release_ticket_signature_sha256','final_artifact_bytes',
  'final_artifact_sha256','macos_certificate_sha256',
  'macos_certificate_valid_from','macos_certificate_valid_until',
  'macos_evidence_expires_at','macos_evidence_observed_at',
  'macos_gatekeeper_status','macos_notarized','macos_signature_valid',
  'macos_stapled','macos_team_id','macos_technical_evidence_sha256',
  'platform','release_artifact_id','release_ticket_id','release_ticket_key_id',
  'signature_algorithm','source_sha','source_tree','ticket_expires_at',
  'ticket_issued_at','trust_registry_serial','trust_registry_sha256',
  'valid_from','valid_until','windows_authenticode_status'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_request_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR jsonb_typeof(bound_artifact)<>'object'
     OR NOT bound_artifact ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_artifact) AS key
                 WHERE key<>ALL(required_keys)) THEN
    RAISE EXCEPTION 'outlook desktop release import shape invalid';
  END IF;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-release-import-request.v1',bound_tenant_id,
    bound_request_id,bound_artifact::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release-import-request'||chr(31)||
    bound_request_id,0));
  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_release_import_receipts
   WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id;
  IF FOUND THEN
    IF receipt.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop release import replay conflict';
    END IF;
    RETURN receipt.response_text;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    (bound_artifact->>'release_artifact_id'),0));
  now_at := date_trunc('milliseconds',clock_timestamp());
  INSERT INTO lawos_email_dms.outlook_desktop_release_import_receipts(
    tenant_id,request_id,request_sha256,response_text,created_at
  ) VALUES (
    bound_tenant_id,bound_request_id,request_sha,NULL,now_at
  ) ON CONFLICT (tenant_id,request_id) DO NOTHING
  RETURNING true INTO claim_created;
  IF NOT claim_created THEN
    SELECT * INTO receipt
      FROM lawos_email_dms.outlook_desktop_release_import_receipts
     WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'outlook desktop release import claim snapshot stale'
        USING ERRCODE='40001';
    END IF;
    IF receipt.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop release import replay conflict';
    END IF;
    IF receipt.response_text IS NULL THEN
      RAISE EXCEPTION 'outlook desktop release import claim incomplete';
    END IF;
    RETURN receipt.response_text;
  END IF;
  IF bound_artifact->>'platform'<>'darwin'
     OR bound_artifact->>'channel'<>'formal'
     OR bound_artifact->>'app_id'<>'com.amic.matter.desktop'
     OR bound_artifact->>'arch' NOT IN ('arm64','x64')
     OR bound_artifact->>'signature_algorithm'<>'Ed25519'
     OR bound_artifact->'macos_signature_valid'<>'true'::jsonb
     OR bound_artifact->'macos_notarized'<>'true'::jsonb
     OR bound_artifact->'macos_stapled'<>'true'::jsonb
     OR bound_artifact->>'macos_gatekeeper_status'<>'accepted'
     OR bound_artifact->>'windows_authenticode_status'<>'not_applicable'
     OR jsonb_typeof(bound_artifact->'embedded_inner_artifact_bytes')<>'number'
     OR bound_artifact->>'embedded_inner_artifact_bytes' !~ '^[1-9][0-9]*$'
     OR jsonb_typeof(bound_artifact->'final_artifact_bytes')<>'number'
     OR bound_artifact->>'final_artifact_bytes' !~ '^[1-9][0-9]*$'
     OR jsonb_typeof(bound_artifact->'trust_registry_serial')<>'number'
     OR bound_artifact->>'trust_registry_serial' !~ '^[1-9][0-9]*$' THEN
    RAISE EXCEPTION 'outlook desktop release import trust invalid';
  END IF;
  FOREACH time_key IN ARRAY ARRAY[
    'macos_certificate_valid_from','macos_certificate_valid_until',
    'macos_evidence_expires_at','macos_evidence_observed_at',
    'ticket_expires_at','ticket_issued_at','valid_from','valid_until'
  ] LOOP
    IF jsonb_typeof(bound_artifact->time_key)<>'string'
       OR NOT lawos_email_dms.outlook_desktop_exact_millisecond_utc(
         bound_artifact->>time_key) THEN
      RAISE EXCEPTION 'outlook desktop release import timestamp invalid';
    END IF;
  END LOOP;
  IF now_at<(bound_artifact->>'ticket_issued_at')::timestamptz
     OR now_at>(bound_artifact->>'valid_from')::timestamptz
     OR now_at<(bound_artifact->>'macos_certificate_valid_from')::timestamptz
     OR now_at>=(bound_artifact->>'macos_certificate_valid_until')::timestamptz
     OR now_at<(bound_artifact->>'macos_evidence_observed_at')::timestamptz THEN
    RAISE EXCEPTION 'outlook desktop release import chronology invalid';
  END IF;
  SELECT * INTO artifact FROM jsonb_populate_record(
    NULL::lawos_email_dms.outlook_desktop_release_artifacts,
    bound_artifact||jsonb_build_object(
      'tenant_id',bound_tenant_id,'approved_at',now_at,
      'revoked_at',NULL,'revocation_reason',NULL
    )
  );
  INSERT INTO lawos_email_dms.outlook_desktop_release_artifacts
  SELECT artifact.*;
  audit_binding := lawos_email_dms.outlook_desktop_release_audit_binding_sha256(
    bound_tenant_id,bound_artifact->>'approval_audit_event_id',
    artifact.release_artifact_id,'approved',
    artifact.embedded_release_ticket_sha256,artifact.final_artifact_sha256,
    artifact.approval_sha256,now_at
  );
  INSERT INTO lawos_email_dms.outlook_desktop_release_trust_audit_events(
    tenant_id,event_id,release_artifact_id,event_type,release_ticket_sha256,
    final_artifact_sha256,approval_sha256,event_binding_sha256,occurred_at
  ) VALUES (
    bound_tenant_id,bound_artifact->>'approval_audit_event_id',
    artifact.release_artifact_id,'approved',
    artifact.embedded_release_ticket_sha256,artifact.final_artifact_sha256,
    artifact.approval_sha256,audit_binding,now_at
  );
  authority_sha :=
    lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(
      bound_tenant_id,artifact.release_artifact_id);
  response_text_value := jsonb_build_object(
    'authority','postgres-outlook-desktop-release-artifact-importer',
    'outcome','imported','tenant_id',bound_tenant_id,
    'release_artifact_id',artifact.release_artifact_id,
    'release_ticket_sha256',artifact.embedded_release_ticket_sha256,
    'final_artifact_sha256',artifact.final_artifact_sha256,
    'final_artifact_bytes',artifact.final_artifact_bytes,
    'approval_sha256',artifact.approval_sha256,
    'approval_audit_event_id',bound_artifact->>'approval_audit_event_id',
    'approval_audit_event_binding_sha256',audit_binding,
    'release_authority_sha256',authority_sha,'approved_at',now_at,
    'valid_until',artifact.valid_until,'revoked',false,
    'production_ready_claim',false
  )::text;
  UPDATE lawos_email_dms.outlook_desktop_release_import_receipts
     SET response_text=response_text_value
   WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id
     AND request_sha256=request_sha AND response_text IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop release import claim completion failed';
  END IF;
  RETURN response_text_value;
END
$$;



CREATE OR REPLACE FUNCTION lawos_email_dms.replay_outlook_desktop_release_revocation(
  bound_tenant_id text,
  bound_request_id text,
  bound_revocation jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE receipt lawos_email_dms.outlook_desktop_release_revocation_receipts%ROWTYPE;
DECLARE request_sha text;
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-release-revocation-request.v1',bound_tenant_id,
    bound_request_id,bound_revocation::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release-revocation-request'||chr(31)||
    bound_request_id,0));
  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_release_revocation_receipts
   WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF receipt.request_sha256<>request_sha THEN
    RAISE EXCEPTION 'outlook desktop release revocation replay conflict';
  END IF;
  RETURN receipt.response_text;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.revoke_outlook_desktop_release(
  bound_tenant_id text,
  bound_request_id text,
  bound_revocation jsonb
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE artifact lawos_email_dms.outlook_desktop_release_artifacts%ROWTYPE;
DECLARE receipt lawos_email_dms.outlook_desktop_release_revocation_receipts%ROWTYPE;
DECLARE principal record;
DECLARE now_at timestamptz;
DECLARE request_sha text;
DECLARE audit_binding text;
DECLARE revocation_authority_sha text;
DECLARE response_text_value text;
DECLARE projected_count integer := 0;
DECLARE claim_created boolean := false;
DECLARE required_keys constant text[] := ARRAY[
  'release_artifact_id','revocation_event_id','revocation_reason'
];
BEGIN
  IF session_user<>'lawos_outlook_control_operator' THEN
    RAISE EXCEPTION 'outlook desktop control operator required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  IF bound_request_id !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR jsonb_typeof(bound_revocation)<>'object'
     OR NOT bound_revocation ?& required_keys
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(bound_revocation) AS key
                 WHERE key<>ALL(required_keys))
     OR bound_revocation->>'release_artifact_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_revocation->>'revocation_event_id'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$'
     OR bound_revocation->>'revocation_reason'
        !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$' THEN
    RAISE EXCEPTION 'outlook desktop release revocation shape invalid';
  END IF;
  request_sha := lawos_email_dms.outlook_desktop_binding_sha256(ARRAY[
    'lawos.outlook-desktop-release-revocation-request.v1',bound_tenant_id,
    bound_request_id,bound_revocation::text
  ]);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release-revocation-request'||chr(31)||
    bound_request_id,0));
  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_release_revocation_receipts
   WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id;
  IF FOUND THEN
    IF receipt.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop release revocation replay conflict';
    END IF;
    RETURN receipt.response_text;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||'outlook-release'||chr(31)||
    (bound_revocation->>'release_artifact_id'),0));
  SELECT * INTO receipt
    FROM lawos_email_dms.outlook_desktop_release_revocation_receipts
   WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id;
  IF FOUND THEN
    IF receipt.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop release revocation replay conflict';
    END IF;
    RETURN receipt.response_text;
  END IF;
  SELECT * INTO artifact
    FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=bound_revocation->>'release_artifact_id';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop release revocation artifact absent';
  END IF;
  FOR principal IN
    SELECT DISTINCT installation.user_id,installation.entra_subject_id
      FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
      JOIN lawos_email_dms.outlook_desktop_installations AS installation
        ON installation.tenant_id=binding.tenant_id
       AND installation.installation_id=binding.installation_id
     WHERE binding.tenant_id=bound_tenant_id
       AND binding.release_artifact_id=artifact.release_artifact_id
     ORDER BY installation.user_id,installation.entra_subject_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(
      bound_tenant_id||chr(31)||principal.user_id||chr(31)||
      principal.entra_subject_id,0));
  END LOOP;
  SELECT * INTO artifact
    FROM lawos_email_dms.outlook_desktop_release_artifacts
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=bound_revocation->>'release_artifact_id'
   FOR UPDATE;
  IF artifact.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'outlook desktop release revocation receipt missing';
  END IF;
  now_at := date_trunc('milliseconds',clock_timestamp());
  INSERT INTO lawos_email_dms.outlook_desktop_release_revocation_receipts(
    tenant_id,request_id,request_sha256,response_text,created_at
  ) VALUES (
    bound_tenant_id,bound_request_id,request_sha,NULL,now_at
  ) ON CONFLICT (tenant_id,request_id) DO NOTHING
  RETURNING true INTO claim_created;
  IF claim_created IS DISTINCT FROM true THEN
    SELECT * INTO receipt
      FROM lawos_email_dms.outlook_desktop_release_revocation_receipts
     WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id
     FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'outlook desktop release revocation claim snapshot stale'
        USING ERRCODE='40001';
    END IF;
    IF receipt.request_sha256<>request_sha THEN
      RAISE EXCEPTION 'outlook desktop release revocation replay conflict';
    END IF;
    IF receipt.response_text IS NULL THEN
      RAISE EXCEPTION 'outlook desktop release revocation claim incomplete';
    END IF;
    RETURN receipt.response_text;
  END IF;
  UPDATE lawos_email_dms.outlook_desktop_release_artifacts
     SET revoked_at=now_at,
         revocation_reason=bound_revocation->>'revocation_reason'
   WHERE tenant_id=bound_tenant_id
     AND release_artifact_id=artifact.release_artifact_id;
  audit_binding := lawos_email_dms.outlook_desktop_release_audit_binding_sha256(
    bound_tenant_id,bound_revocation->>'revocation_event_id',
    artifact.release_artifact_id,'revoked',
    artifact.embedded_release_ticket_sha256,artifact.final_artifact_sha256,
    artifact.approval_sha256,now_at
  );
  INSERT INTO lawos_email_dms.outlook_desktop_release_trust_audit_events(
    tenant_id,event_id,release_artifact_id,event_type,release_ticket_sha256,
    final_artifact_sha256,approval_sha256,event_binding_sha256,occurred_at
  ) VALUES (
    bound_tenant_id,bound_revocation->>'revocation_event_id',
    artifact.release_artifact_id,'revoked',
    artifact.embedded_release_ticket_sha256,artifact.final_artifact_sha256,
    artifact.approval_sha256,audit_binding,now_at
  );
  FOR principal IN
    SELECT DISTINCT installation.user_id,installation.entra_subject_id
      FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS binding
      JOIN lawos_email_dms.outlook_desktop_installations AS installation
        ON installation.tenant_id=binding.tenant_id
       AND installation.installation_id=binding.installation_id
     WHERE binding.tenant_id=bound_tenant_id
       AND binding.release_artifact_id=artifact.release_artifact_id
     ORDER BY installation.user_id,installation.entra_subject_id
  LOOP
    PERFORM lawos_email_dms.project_outlook_desktop_assignment_at(
      bound_tenant_id,principal.user_id,principal.entra_subject_id,
      'release_revoked',now_at
    );
    projected_count := projected_count+1;
  END LOOP;
  revocation_authority_sha :=
    lawos_email_dms.outlook_desktop_release_revocation_authority_sha256(
      bound_tenant_id,artifact.release_artifact_id);
  response_text_value := jsonb_build_object(
    'outcome','revoked','tenant_id',bound_tenant_id,
    'release_artifact_id',artifact.release_artifact_id,
    'revocation_event_id',bound_revocation->>'revocation_event_id',
    'revoked_at',now_at,'projected_principal_count',projected_count,
    'revocation_authority_sha256',revocation_authority_sha,
    'production_ready_claim',false
  )::text;
  UPDATE lawos_email_dms.outlook_desktop_release_revocation_receipts
     SET response_text=response_text_value
   WHERE tenant_id=bound_tenant_id AND request_id=bound_request_id
     AND request_sha256=request_sha AND response_text IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'outlook desktop release revocation claim completion failed';
  END IF;
  RETURN response_text_value;
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.read_outlook_desktop_installation(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text,
  bound_installation_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE now_at timestamptz;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  now_at := date_trunc('milliseconds',clock_timestamp());
  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id AND user_id=bound_user_id
     AND entra_subject_id=bound_entra_subject_id
     AND installation_id=bound_installation_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'installation_id',installation.installation_id,
    'status',CASE WHEN installation.retired_at IS NOT NULL THEN 'retired'
                  WHEN installation.lease_expires_at<=now_at THEN 'expired'
                  ELSE 'active' END,
    'platform',installation.platform,'app_version',installation.app_version,
    'source_sha',installation.source_sha,
    'registered_at',installation.registered_at,
    'last_seen_at',installation.last_seen_at,
    'lease_expires_at',installation.lease_expires_at,
    'retired_at',installation.retired_at,
    'retire_reason',installation.retire_reason,
    'state_version',installation.state_version
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.read_current_outlook_desktop_installation(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE installation lawos_email_dms.outlook_desktop_installations%ROWTYPE;
DECLARE now_at timestamptz;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  now_at := date_trunc('milliseconds',clock_timestamp());
  SELECT * INTO installation
    FROM lawos_email_dms.outlook_desktop_installations
   WHERE tenant_id=bound_tenant_id AND user_id=bound_user_id
     AND entra_subject_id=bound_entra_subject_id
   ORDER BY CASE WHEN retired_at IS NULL AND lease_expires_at>now_at THEN 0
                 WHEN retired_at IS NULL THEN 1 ELSE 2 END,
            last_seen_at DESC,registered_at DESC,installation_id DESC
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'installation_id',installation.installation_id,
    'status',CASE WHEN installation.retired_at IS NOT NULL THEN 'retired'
                  WHEN installation.lease_expires_at<=now_at THEN 'expired'
                  ELSE 'active' END,
    'platform',installation.platform,'app_version',installation.app_version,
    'source_sha',installation.source_sha,
    'registered_at',installation.registered_at,
    'last_seen_at',installation.last_seen_at,
    'lease_expires_at',installation.lease_expires_at,
    'retired_at',installation.retired_at,
    'retire_reason',installation.retire_reason,
    'state_version',installation.state_version
  );
END
$$;

CREATE OR REPLACE FUNCTION lawos_email_dms.read_outlook_desktop_assignment_state(
  bound_tenant_id text,
  bound_user_id text,
  bound_entra_subject_id text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,lawos_email_dms,lawos_security
AS $$
DECLARE projection jsonb;
DECLARE now_at timestamptz;
BEGIN
  IF session_user<>'lawos_app' THEN
    RAISE EXCEPTION 'outlook desktop application role required' USING ERRCODE='42501';
  END IF;
  PERFORM lawos_email_dms.outlook_desktop_assert_tenant(bound_tenant_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(
    bound_tenant_id||chr(31)||bound_user_id||chr(31)||
    bound_entra_subject_id,0));
  now_at := date_trunc('milliseconds',clock_timestamp());
  projection := lawos_email_dms.project_outlook_desktop_assignment_at(
    bound_tenant_id,bound_user_id,bound_entra_subject_id,
    'authoritative_read',now_at
  );
  RETURN projection->'state';
END
$$;

GRANT lawos_outlook_authority_owner TO lawos_admin
  WITH SET TRUE, INHERIT FALSE, ADMIN FALSE
  GRANTED BY lawos_admin;

GRANT USAGE,CREATE ON SCHEMA lawos_email_dms,lawos_meta
  TO lawos_outlook_authority_owner;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_auth_members AS membership
     WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
       AND membership.member='lawos_admin'::regrole
       AND membership.grantor='lawos_admin'::regrole
       AND NOT membership.admin_option AND NOT membership.inherit_option
       AND membership.set_option
  ) OR NOT has_schema_privilege(
    'lawos_outlook_authority_owner','lawos_email_dms','USAGE,CREATE'
  ) OR NOT has_schema_privilege(
    'lawos_outlook_authority_owner','lawos_meta','USAGE,CREATE'
  ) THEN
    RAISE EXCEPTION 'outlook authority temporary transfer capability missing';
  END IF;
END
$$;

CREATE TEMP TABLE outlook_authority_approved_email_dms_functions (
  signature text PRIMARY KEY,
  expected_owner text NOT NULL,
  allowed_role text
) ON COMMIT DROP;

INSERT INTO outlook_authority_approved_email_dms_functions
  (signature,expected_owner,allowed_role)
VALUES
  ('lawos_email_dms.reject_email_filing_placement_mutation()','lawos_admin',NULL),
  ('lawos_email_dms.reject_email_filing_correction_audit_mutation()','lawos_admin',NULL),
  ('lawos_email_dms.reject_graph_sync_immutable_mutation()','lawos_admin',NULL),
  ('lawos_email_dms.reject_outlook_desktop_immutable_mutation()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.outlook_desktop_release_audit_binding_sha256(text,text,text,text,text,text,text,timestamp with time zone)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_release_audit_binding()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_release_revocation()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.project_outlook_desktop_assignment_at(text,text,text,text,timestamp with time zone)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.outlook_desktop_binding_sha256(text[])','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.outlook_desktop_canonical_json_text(jsonb)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.outlook_desktop_assert_tenant(text)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.outlook_desktop_exact_millisecond_utc(text)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(text,text)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.outlook_desktop_release_revocation_authority_sha256(text,text)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.consume_outlook_desktop_activation_authorization_at(text,jsonb,timestamp with time zone)','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_policy_approval()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_policy()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_activation_challenge()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_activation_authorization()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_lifecycle_challenge()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_lifecycle_authorization()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.enforce_outlook_desktop_expansion_authorization()','lawos_outlook_authority_owner',NULL),
  ('lawos_email_dms.register_outlook_desktop_installation(text,jsonb)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.heartbeat_outlook_desktop_installation(text,jsonb)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.retire_outlook_desktop_installation(text,jsonb)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.read_outlook_desktop_installation(text,text,text,text)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.read_current_outlook_desktop_installation(text,text,text)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.read_outlook_desktop_activation_proof_seed(text,jsonb)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.issue_outlook_desktop_lifecycle_challenge(text,jsonb)','lawos_outlook_authority_owner','lawos_app'),
  ('lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.replay_outlook_desktop_release_revocation(text,text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.revoke_outlook_desktop_release(text,text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.authorize_outlook_desktop_assignment_expansion(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.import_outlook_desktop_assignment_roster(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.approve_outlook_desktop_assignment_policy(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.revoke_outlook_desktop_assignment_policy(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.publish_outlook_desktop_activation_issue_authority(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.load_current_outlook_desktop_activation_issue_authority(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.issue_outlook_desktop_activation_challenge(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.attach_outlook_desktop_activation_evidence(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.load_outlook_desktop_activation_reservation(text,text)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.authorize_outlook_desktop_activation(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_control_operator'),
  ('lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_lifecycle_verifier'),
  ('lawos_email_dms.sweep_outlook_desktop_assignments(text,integer)','lawos_outlook_authority_owner','lawos_outlook_assignment_worker'),
  ('lawos_email_dms.claim_outlook_desktop_assignment_jobs(text,text,integer,integer,integer)','lawos_outlook_authority_owner','lawos_outlook_assignment_worker'),
  ('lawos_email_dms.begin_outlook_desktop_assignment_dispatch(text,text,text,text)','lawos_outlook_authority_owner','lawos_outlook_assignment_worker'),
  ('lawos_email_dms.complete_outlook_desktop_assignment_job(text,jsonb)','lawos_outlook_authority_owner','lawos_outlook_assignment_worker'),
  ('lawos_email_dms.fail_outlook_desktop_assignment_job(text,jsonb,integer,integer)','lawos_outlook_authority_owner','lawos_outlook_assignment_worker'),
  ('lawos_email_dms.extend_outlook_desktop_assignment_lease(text,text,text,text,integer)','lawos_outlook_authority_owner','lawos_outlook_assignment_worker'),
  ('lawos_email_dms.recover_outlook_desktop_assignment_removals(text,integer)','lawos_outlook_authority_owner','lawos_outlook_assignment_worker');

DO $$
DECLARE procedure_row record;
DECLARE grantee_name text;
BEGIN
  FOR procedure_row IN
    SELECT procedure.oid,procedure.oid::regprocedure::text AS signature,
           owner.rolname AS owner_name,approved.expected_owner
      FROM pg_proc AS procedure
      JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
      JOIN pg_roles AS owner ON owner.oid=procedure.proowner
      LEFT JOIN pg_temp.outlook_authority_approved_email_dms_functions AS approved
        ON approved.signature=procedure.oid::regprocedure::text
     WHERE namespace.nspname='lawos_email_dms'
  LOOP
    IF procedure_row.expected_owner IS NULL THEN
      RAISE EXCEPTION 'email-DMS function is not approved: %',
        procedure_row.signature;
    ELSIF procedure_row.owner_name<>'lawos_admin' THEN
      RAISE EXCEPTION 'approved email-DMS function has foreign owner: %',
        procedure_row.signature;
    END IF;
  END LOOP;
  FOR procedure_row IN
    SELECT to_regprocedure(approved.signature) AS procedure_oid
      FROM pg_temp.outlook_authority_approved_email_dms_functions AS approved
     WHERE approved.expected_owner='lawos_admin'
  LOOP
    IF procedure_row.procedure_oid IS NULL THEN
      RAISE EXCEPTION 'approved legacy email-DMS function is absent';
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC CASCADE',
                   procedure_row.procedure_oid);
    FOR grantee_name IN
      SELECT DISTINCT role.rolname
        FROM pg_proc AS procedure
        CROSS JOIN LATERAL aclexplode(COALESCE(
          procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
        JOIN pg_roles AS role ON role.oid=privilege.grantee
       WHERE procedure.oid=procedure_row.procedure_oid
         AND privilege.grantee<>procedure.proowner
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I CASCADE',
                     procedure_row.procedure_oid,grantee_name);
    END LOOP;
  END LOOP;
END
$$;

DO $$
DECLARE table_name text;
DECLARE grantee_name text;
DECLARE grantee_clause text;
DECLARE policy_name text;
DECLARE trigger_name text;
DECLARE expected_triggers text[];
DECLARE column_privilege record;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'outlook_desktop_installations','outlook_desktop_installation_nonces',
    'outlook_desktop_installation_idempotency',
    'outlook_desktop_installation_audit_events',
    'outlook_desktop_release_artifacts',
    'outlook_desktop_release_trust_audit_events',
    'outlook_desktop_release_import_receipts',
    'outlook_desktop_release_revocation_receipts',
    'outlook_desktop_activation_issue_authorities',
    'outlook_desktop_activation_challenges',
    'outlook_desktop_activation_operator_packet_evidence',
    'outlook_desktop_activation_authorizations',
    'outlook_desktop_lifecycle_challenges',
    'outlook_desktop_lifecycle_authorizations',
    'outlook_desktop_installation_release_bindings',
    'outlook_desktop_assignment_canary_principals',
    'outlook_desktop_assignment_rosters',
    'outlook_desktop_assignment_roster_members',
    'outlook_desktop_assignment_expansion_authorizations',
    'outlook_desktop_assignment_policy_approvals',
    'outlook_desktop_assignment_policies',
    'outlook_desktop_assignment_states',
    'outlook_desktop_assignment_audit_events',
    'outlook_desktop_assignment_outbox',
    'outlook_desktop_assignment_outbox_receipts'
  ] LOOP
    FOR column_privilege IN
      SELECT DISTINCT attribute.attname,privilege.grantee,
             role.rolname AS grantee_name
        FROM pg_attribute AS attribute
        CROSS JOIN LATERAL aclexplode(attribute.attacl) AS privilege
        LEFT JOIN pg_roles AS role ON role.oid=privilege.grantee
       WHERE attribute.attrelid=
             format('lawos_email_dms.%I',table_name)::regclass
         AND attribute.attnum>0 AND NOT attribute.attisdropped
    LOOP
      grantee_clause := CASE WHEN column_privilege.grantee=0
        THEN 'PUBLIC' ELSE format('%I',column_privilege.grantee_name) END;
      EXECUTE format(
        'REVOKE ALL (%I) ON TABLE lawos_email_dms.%I FROM %s CASCADE',
        column_privilege.attname,table_name,grantee_clause);
    END LOOP;
    EXECUTE format(
      'REVOKE ALL ON TABLE lawos_email_dms.%I FROM PUBLIC',
      table_name);
    FOR grantee_name IN
      SELECT DISTINCT role.rolname
        FROM pg_class AS relation
        CROSS JOIN LATERAL aclexplode(COALESCE(
          relation.relacl,acldefault('r',relation.relowner))) AS privilege
        JOIN pg_roles AS role ON role.oid=privilege.grantee
       WHERE relation.oid=format('lawos_email_dms.%I',table_name)::regclass
         AND privilege.grantee<>relation.relowner
    LOOP
      EXECUTE format(
        'REVOKE ALL ON TABLE lawos_email_dms.%I FROM %I CASCADE',
        table_name,grantee_name);
    END LOOP;
    EXECUTE format(
      'ALTER TABLE lawos_email_dms.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format(
      'ALTER TABLE lawos_email_dms.%I FORCE ROW LEVEL SECURITY',table_name);
    FOR policy_name IN
      SELECT policy.polname
        FROM pg_policy AS policy
       WHERE policy.polrelid=format('lawos_email_dms.%I',table_name)::regclass
    LOOP
      EXECUTE format(
        'DROP POLICY %I ON lawos_email_dms.%I',policy_name,table_name);
    END LOOP;
    expected_triggers := CASE table_name
      WHEN 'outlook_desktop_installation_nonces' THEN
        ARRAY['outlook_desktop_nonces_immutable']
      WHEN 'outlook_desktop_installation_idempotency' THEN
        ARRAY['outlook_desktop_idempotency_immutable']
      WHEN 'outlook_desktop_installation_audit_events' THEN
        ARRAY['outlook_desktop_audit_immutable']
      WHEN 'outlook_desktop_release_artifacts' THEN
        ARRAY['outlook_desktop_release_revocation_only']
      WHEN 'outlook_desktop_release_trust_audit_events' THEN ARRAY[
        'outlook_desktop_release_audit_binding',
        'outlook_desktop_release_audit_immutable']
      WHEN 'outlook_desktop_release_import_receipts' THEN
        ARRAY['outlook_desktop_release_import_receipt_immutable']
      WHEN 'outlook_desktop_release_revocation_receipts' THEN
        ARRAY['outlook_desktop_release_revocation_receipt_immutable']
      WHEN 'outlook_desktop_activation_issue_authorities' THEN
        ARRAY['outlook_desktop_activation_issue_authority_immutable']
      WHEN 'outlook_desktop_activation_challenges' THEN
        ARRAY['outlook_desktop_activation_challenge_binding']
      WHEN 'outlook_desktop_activation_operator_packet_evidence' THEN
        ARRAY['outlook_desktop_activation_operator_packet_evidence_immutable']
      WHEN 'outlook_desktop_activation_authorizations' THEN ARRAY[
        'outlook_desktop_activation_authorization_binding',
        'outlook_desktop_activation_authorization_no_delete']
      WHEN 'outlook_desktop_lifecycle_authorizations' THEN
        ARRAY['outlook_desktop_lifecycle_authorization_immutable']
      WHEN 'outlook_desktop_lifecycle_challenges' THEN
        ARRAY['outlook_desktop_lifecycle_challenge_binding']
      WHEN 'outlook_desktop_installation_release_bindings' THEN
        ARRAY['outlook_desktop_installation_release_binding_immutable']
      WHEN 'outlook_desktop_assignment_canary_principals' THEN
        ARRAY['outlook_desktop_assignment_canary_principal_immutable']
      WHEN 'outlook_desktop_assignment_rosters' THEN
        ARRAY['outlook_desktop_assignment_roster_immutable']
      WHEN 'outlook_desktop_assignment_roster_members' THEN
        ARRAY['outlook_desktop_assignment_roster_member_immutable']
      WHEN 'outlook_desktop_assignment_expansion_authorizations' THEN
        ARRAY['outlook_desktop_assignment_expansion_authorization_immutable']
      WHEN 'outlook_desktop_assignment_policy_approvals' THEN ARRAY[
        'outlook_desktop_policy_approval_binding',
        'outlook_desktop_policy_approval_immutable']
      WHEN 'outlook_desktop_assignment_policies' THEN ARRAY[
        'outlook_desktop_policy_binding','outlook_desktop_policy_no_delete']
      WHEN 'outlook_desktop_assignment_audit_events' THEN
        ARRAY['outlook_desktop_assignment_audit_immutable']
      WHEN 'outlook_desktop_assignment_outbox_receipts' THEN
        ARRAY['outlook_desktop_assignment_receipt_immutable']
      ELSE ARRAY[]::text[]
    END;
    FOR trigger_name IN
      SELECT trigger.tgname
        FROM pg_trigger AS trigger
       WHERE trigger.tgrelid=
             format('lawos_email_dms.%I',table_name)::regclass
         AND NOT trigger.tgisinternal
         AND NOT trigger.tgname::text=ANY(expected_triggers)
    LOOP
      EXECUTE format(
        'DROP TRIGGER %I ON lawos_email_dms.%I',trigger_name,table_name);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON lawos_email_dms.%I USING (tenant_id=lawos_security.current_tenant_id()) WITH CHECK (tenant_id=lawos_security.current_tenant_id())',
      table_name);
    EXECUTE format(
      'ALTER TABLE lawos_email_dms.%I OWNER TO lawos_outlook_authority_owner',
      table_name);
  END LOOP;
END
$$;

DO $$
DECLARE grantee_name text;
BEGIN
  REVOKE ALL ON TABLE lawos_meta.outlook_authority_bootstrap_receipts
    FROM PUBLIC;
  FOR grantee_name IN
    SELECT DISTINCT role.rolname
      FROM pg_class AS relation
      CROSS JOIN LATERAL aclexplode(COALESCE(
        relation.relacl,acldefault('r',relation.relowner))) AS privilege
      JOIN pg_roles AS role ON role.oid=privilege.grantee
     WHERE relation.oid=
       'lawos_meta.outlook_authority_bootstrap_receipts'::regclass
       AND role.rolname<>'lawos_admin'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON TABLE lawos_meta.outlook_authority_bootstrap_receipts FROM %I CASCADE',
      grantee_name);
  END LOOP;
  ALTER TABLE lawos_meta.outlook_authority_bootstrap_receipts
    OWNER TO lawos_outlook_authority_owner;
END
$$;

DO $$
DECLARE function_signature text;
DECLARE resolved regprocedure;
DECLARE grantee_name text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'lawos_email_dms.reject_outlook_desktop_immutable_mutation()',
    'lawos_email_dms.outlook_desktop_release_audit_binding_sha256(text,text,text,text,text,text,text,timestamp with time zone)',
    'lawos_email_dms.enforce_outlook_desktop_release_audit_binding()',
    'lawos_email_dms.enforce_outlook_desktop_release_revocation()',
    'lawos_email_dms.fail_outlook_desktop_assignment_job(text,jsonb,integer,integer)',
    'lawos_email_dms.extend_outlook_desktop_assignment_lease(text,text,text,text,integer)',
    'lawos_email_dms.project_outlook_desktop_assignment_at(text,text,text,text,timestamp with time zone)',
    'lawos_email_dms.sweep_outlook_desktop_assignments(text,integer)',
    'lawos_email_dms.outlook_desktop_binding_sha256(text[])',
    'lawos_email_dms.outlook_desktop_canonical_json_text(jsonb)',
    'lawos_email_dms.outlook_desktop_assert_tenant(text)',
    'lawos_email_dms.outlook_desktop_exact_millisecond_utc(text)',
    'lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(text,text)',
    'lawos_email_dms.outlook_desktop_release_revocation_authority_sha256(text,text)',
    'lawos_email_dms.consume_outlook_desktop_activation_authorization_at(text,jsonb,timestamp with time zone)',
    'lawos_email_dms.enforce_outlook_desktop_policy_approval()',
    'lawos_email_dms.enforce_outlook_desktop_policy()',
    'lawos_email_dms.enforce_outlook_desktop_activation_challenge()',
    'lawos_email_dms.enforce_outlook_desktop_activation_authorization()',
    'lawos_email_dms.enforce_outlook_desktop_lifecycle_challenge()',
    'lawos_email_dms.enforce_outlook_desktop_lifecycle_authorization()',
    'lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt(text,jsonb)',
    'lawos_email_dms.enforce_outlook_desktop_expansion_authorization()',
    'lawos_email_dms.authorize_outlook_desktop_assignment_expansion(text,jsonb)',
    'lawos_email_dms.register_outlook_desktop_installation(text,jsonb)',
    'lawos_email_dms.heartbeat_outlook_desktop_installation(text,jsonb)',
    'lawos_email_dms.retire_outlook_desktop_installation(text,jsonb)',
    'lawos_email_dms.import_outlook_desktop_assignment_roster(text,jsonb)',
    'lawos_email_dms.approve_outlook_desktop_assignment_policy(text,jsonb)',
    'lawos_email_dms.revoke_outlook_desktop_assignment_policy(text,jsonb)',
    'lawos_email_dms.publish_outlook_desktop_activation_issue_authority(text,jsonb)',
    'lawos_email_dms.load_current_outlook_desktop_activation_issue_authority(text,jsonb)',
    'lawos_email_dms.issue_outlook_desktop_activation_challenge(text,jsonb)',
    'lawos_email_dms.attach_outlook_desktop_activation_evidence(text,jsonb)',
    'lawos_email_dms.load_outlook_desktop_activation_reservation(text,text)',
    'lawos_email_dms.authorize_outlook_desktop_activation(text,jsonb)',
    'lawos_email_dms.claim_outlook_desktop_assignment_jobs(text,text,integer,integer,integer)',
    'lawos_email_dms.begin_outlook_desktop_assignment_dispatch(text,text,text,text)',
    'lawos_email_dms.complete_outlook_desktop_assignment_job(text,jsonb)',
    'lawos_email_dms.recover_outlook_desktop_assignment_removals(text,integer)',
    'lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb)',
    'lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb)',
    'lawos_email_dms.replay_outlook_desktop_release_revocation(text,text,jsonb)',
    'lawos_email_dms.revoke_outlook_desktop_release(text,text,jsonb)',
    'lawos_email_dms.read_outlook_desktop_installation(text,text,text,text)',
    'lawos_email_dms.read_current_outlook_desktop_installation(text,text,text)',
    'lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text)',
    'lawos_email_dms.read_outlook_desktop_activation_proof_seed(text,jsonb)',
    'lawos_email_dms.issue_outlook_desktop_lifecycle_challenge(text,jsonb)'
  ] LOOP
    resolved := to_regprocedure(function_signature);
    IF resolved IS NULL THEN
      RAISE EXCEPTION 'outlook authority function missing: %',function_signature;
    END IF;
    EXECUTE format(
      'REVOKE ALL ON FUNCTION %s FROM PUBLIC',
      resolved);
    FOR grantee_name IN
      SELECT DISTINCT role.rolname
        FROM pg_proc AS procedure
        CROSS JOIN LATERAL aclexplode(COALESCE(
          procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
        JOIN pg_roles AS role ON role.oid=privilege.grantee
       WHERE procedure.oid=resolved
         AND privilege.grantee<>procedure.proowner
    LOOP
      EXECUTE format(
        'REVOKE ALL ON FUNCTION %s FROM %I CASCADE',resolved,grantee_name);
    END LOOP;
    EXECUTE format('ALTER FUNCTION %s OWNER TO lawos_outlook_authority_owner',
                   resolved);
  END LOOP;
END
$$;

DO $$
DECLARE grantee_name text;
DECLARE default_acl record;
DECLARE object_kind text;
DECLARE grantee_clause text;
BEGIN
  REVOKE ALL ON SCHEMA lawos_email_dms FROM PUBLIC;
  FOR grantee_name IN
    SELECT DISTINCT role.rolname
      FROM pg_namespace AS namespace
      CROSS JOIN LATERAL aclexplode(COALESCE(
        namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
      JOIN pg_roles AS role ON role.oid=privilege.grantee
     WHERE namespace.nspname='lawos_email_dms'
       AND privilege.grantee<>namespace.nspowner
  LOOP
    EXECUTE format(
      'REVOKE ALL ON SCHEMA lawos_email_dms FROM %I CASCADE',grantee_name);
  END LOOP;
  REVOKE CREATE ON SCHEMA lawos_meta FROM PUBLIC;
  REVOKE GRANT OPTION FOR USAGE ON SCHEMA lawos_meta FROM PUBLIC CASCADE;
  FOR grantee_name IN
    SELECT DISTINCT role.rolname
      FROM pg_namespace AS namespace
      CROSS JOIN LATERAL aclexplode(COALESCE(
        namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
      JOIN pg_roles AS role ON role.oid=privilege.grantee
     WHERE namespace.nspname='lawos_meta'
       AND privilege.grantee<>namespace.nspowner
  LOOP
    EXECUTE format(
      'REVOKE CREATE ON SCHEMA lawos_meta FROM %I CASCADE',grantee_name);
    EXECUTE format(
      'REVOKE GRANT OPTION FOR USAGE ON SCHEMA lawos_meta FROM %I CASCADE',
      grantee_name);
  END LOOP;
  FOR default_acl IN
    SELECT owner.rolname AS owner_name,
           COALESCE(grantee.rolname,'PUBLIC') AS grantee_name,
           defaults.defaclobjtype,namespace.nspname AS schema_name
      FROM pg_default_acl AS defaults
      JOIN pg_namespace AS namespace
        ON namespace.oid=defaults.defaclnamespace
      JOIN pg_roles AS owner ON owner.oid=defaults.defaclrole
      CROSS JOIN LATERAL aclexplode(defaults.defaclacl) AS privilege
      LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
     WHERE namespace.nspname='lawos_email_dms'
       AND privilege.grantee<>defaults.defaclrole
  LOOP
    object_kind := CASE default_acl.defaclobjtype
      WHEN 'r' THEN 'TABLES'
      WHEN 'S' THEN 'SEQUENCES'
      WHEN 'f' THEN 'FUNCTIONS'
      WHEN 'T' THEN 'TYPES'
      ELSE NULL
    END;
    IF object_kind IS NULL THEN
      RAISE EXCEPTION 'unsupported outlook schema default ACL object type: %',
        default_acl.defaclobjtype;
    END IF;
    grantee_clause := CASE WHEN default_acl.grantee_name='PUBLIC'
      THEN 'PUBLIC' ELSE format('%I',default_acl.grantee_name) END;
    EXECUTE format(
      'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON %s FROM %s',
      default_acl.owner_name,default_acl.schema_name,object_kind,grantee_clause);
  END LOOP;
END
$$;

GRANT USAGE ON SCHEMA lawos_email_dms TO
  lawos_app,lawos_outlook_authority_owner,lawos_outlook_control_operator,
  lawos_outlook_assignment_worker,lawos_outlook_lifecycle_verifier;

GRANT USAGE ON SCHEMA lawos_meta TO
  lawos_app,lawos_outlook_authority_owner;

SET LOCAL ROLE lawos_outlook_authority_owner;

GRANT SELECT ON TABLE lawos_meta.outlook_authority_bootstrap_receipts
TO lawos_admin;

GRANT SELECT ON TABLE
  lawos_email_dms.outlook_desktop_release_artifacts,
  lawos_email_dms.outlook_desktop_release_trust_audit_events
TO lawos_app;

GRANT EXECUTE ON FUNCTION
  lawos_email_dms.register_outlook_desktop_installation(text,jsonb),
  lawos_email_dms.heartbeat_outlook_desktop_installation(text,jsonb),
  lawos_email_dms.retire_outlook_desktop_installation(text,jsonb),
  lawos_email_dms.read_outlook_desktop_installation(text,text,text,text),
  lawos_email_dms.read_current_outlook_desktop_installation(text,text,text),
  lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text),
  lawos_email_dms.read_outlook_desktop_activation_proof_seed(text,jsonb),
  lawos_email_dms.issue_outlook_desktop_lifecycle_challenge(text,jsonb)
TO lawos_app;

GRANT EXECUTE ON FUNCTION
  lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb),
  lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb),
  lawos_email_dms.replay_outlook_desktop_release_revocation(text,text,jsonb),
  lawos_email_dms.revoke_outlook_desktop_release(text,text,jsonb),
  lawos_email_dms.authorize_outlook_desktop_assignment_expansion(text,jsonb),
  lawos_email_dms.import_outlook_desktop_assignment_roster(text,jsonb),
  lawos_email_dms.approve_outlook_desktop_assignment_policy(text,jsonb),
  lawos_email_dms.revoke_outlook_desktop_assignment_policy(text,jsonb),
  lawos_email_dms.publish_outlook_desktop_activation_issue_authority(text,jsonb),
  lawos_email_dms.load_current_outlook_desktop_activation_issue_authority(text,jsonb),
  lawos_email_dms.issue_outlook_desktop_activation_challenge(text,jsonb),
  lawos_email_dms.attach_outlook_desktop_activation_evidence(text,jsonb),
  lawos_email_dms.load_outlook_desktop_activation_reservation(text,text),
  lawos_email_dms.authorize_outlook_desktop_activation(text,jsonb)
TO lawos_outlook_control_operator;

GRANT EXECUTE ON FUNCTION
  lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt(text,jsonb)
TO lawos_outlook_lifecycle_verifier;

GRANT EXECUTE ON FUNCTION
  lawos_email_dms.sweep_outlook_desktop_assignments(text,integer),
  lawos_email_dms.claim_outlook_desktop_assignment_jobs(text,text,integer,integer,integer),
  lawos_email_dms.begin_outlook_desktop_assignment_dispatch(text,text,text,text),
  lawos_email_dms.complete_outlook_desktop_assignment_job(text,jsonb),
  lawos_email_dms.fail_outlook_desktop_assignment_job(text,jsonb,integer,integer),
  lawos_email_dms.extend_outlook_desktop_assignment_lease(text,text,text,text,integer),
  lawos_email_dms.recover_outlook_desktop_assignment_removals(text,integer)
TO lawos_outlook_assignment_worker;

RESET ROLE;

REVOKE CREATE ON SCHEMA lawos_email_dms,lawos_meta
  FROM lawos_outlook_authority_owner;

REVOKE lawos_outlook_authority_owner FROM lawos_admin
  GRANTED BY lawos_admin;

DO $$
DECLARE owner_oid oid;
BEGIN
  SELECT oid INTO owner_oid FROM pg_roles
   WHERE rolname='lawos_outlook_authority_owner';
  IF EXISTS (
    SELECT 1 FROM pg_class AS relation
     JOIN pg_namespace AS namespace ON namespace.oid=relation.relnamespace
    WHERE namespace.nspname='lawos_email_dms'
      AND relation.relname LIKE 'outlook_desktop_%'
      AND relation.relkind IN ('r','p')
      AND (relation.relowner<>owner_oid OR NOT relation.relrowsecurity
           OR NOT relation.relforcerowsecurity)
  ) OR EXISTS (
    SELECT 1
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid=relation.relnamespace
      LEFT JOIN pg_policy AS policy ON policy.polrelid=relation.oid
     WHERE namespace.nspname='lawos_email_dms'
       AND relation.relname LIKE 'outlook_desktop_%'
       AND relation.relkind IN ('r','p')
     GROUP BY relation.oid
    HAVING count(policy.oid)<>1
       OR bool_or(
         policy.polname<>'tenant_isolation'
         OR NOT policy.polpermissive
         OR policy.polcmd<>'*'
         OR policy.polroles<>ARRAY[0]::oid[]
         OR pg_get_expr(policy.polqual,policy.polrelid)<>
            '(tenant_id = lawos_security.current_tenant_id())'
         OR pg_get_expr(policy.polwithcheck,policy.polrelid)<>
            '(tenant_id = lawos_security.current_tenant_id())'
       )
  ) OR EXISTS (
    SELECT 1
      FROM pg_attribute AS attribute
      JOIN pg_class AS relation ON relation.oid=attribute.attrelid
      JOIN pg_namespace AS namespace ON namespace.oid=relation.relnamespace
     WHERE namespace.nspname='lawos_email_dms'
       AND relation.relname LIKE 'outlook_desktop_%'
       AND relation.relkind IN ('r','p')
       AND attribute.attnum>0 AND NOT attribute.attisdropped
       AND attribute.attacl IS NOT NULL
       AND cardinality(attribute.attacl)>0
  ) OR EXISTS (
    WITH expected(table_name,trigger_name,function_signature,trigger_type) AS (
      VALUES
      ('outlook_desktop_installation_nonces','outlook_desktop_nonces_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_installation_idempotency','outlook_desktop_idempotency_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_installation_audit_events','outlook_desktop_audit_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_release_artifacts','outlook_desktop_release_revocation_only','lawos_email_dms.enforce_outlook_desktop_release_revocation()',27),
      ('outlook_desktop_release_trust_audit_events','outlook_desktop_release_audit_binding','lawos_email_dms.enforce_outlook_desktop_release_audit_binding()',7),
      ('outlook_desktop_release_trust_audit_events','outlook_desktop_release_audit_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_release_import_receipts','outlook_desktop_release_import_receipt_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_release_revocation_receipts','outlook_desktop_release_revocation_receipt_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_activation_issue_authorities','outlook_desktop_activation_issue_authority_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_activation_challenges','outlook_desktop_activation_challenge_binding','lawos_email_dms.enforce_outlook_desktop_activation_challenge()',31),
      ('outlook_desktop_activation_operator_packet_evidence','outlook_desktop_activation_operator_packet_evidence_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_activation_authorizations','outlook_desktop_activation_authorization_binding','lawos_email_dms.enforce_outlook_desktop_activation_authorization()',23),
      ('outlook_desktop_activation_authorizations','outlook_desktop_activation_authorization_no_delete','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',11),
      ('outlook_desktop_lifecycle_challenges','outlook_desktop_lifecycle_challenge_binding','lawos_email_dms.enforce_outlook_desktop_lifecycle_challenge()',31),
      ('outlook_desktop_lifecycle_authorizations','outlook_desktop_lifecycle_authorization_immutable','lawos_email_dms.enforce_outlook_desktop_lifecycle_authorization()',27),
      ('outlook_desktop_installation_release_bindings','outlook_desktop_installation_release_binding_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_assignment_canary_principals','outlook_desktop_assignment_canary_principal_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_assignment_rosters','outlook_desktop_assignment_roster_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_assignment_roster_members','outlook_desktop_assignment_roster_member_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_assignment_expansion_authorizations','outlook_desktop_assignment_expansion_authorization_immutable','lawos_email_dms.enforce_outlook_desktop_expansion_authorization()',27),
      ('outlook_desktop_assignment_policy_approvals','outlook_desktop_policy_approval_binding','lawos_email_dms.enforce_outlook_desktop_policy_approval()',23),
      ('outlook_desktop_assignment_policy_approvals','outlook_desktop_policy_approval_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',11),
      ('outlook_desktop_assignment_policies','outlook_desktop_policy_binding','lawos_email_dms.enforce_outlook_desktop_policy()',23),
      ('outlook_desktop_assignment_policies','outlook_desktop_policy_no_delete','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',11),
      ('outlook_desktop_assignment_audit_events','outlook_desktop_assignment_audit_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27),
      ('outlook_desktop_assignment_outbox_receipts','outlook_desktop_assignment_receipt_immutable','lawos_email_dms.reject_outlook_desktop_immutable_mutation()',27)
    ), protected_tables(table_name) AS (VALUES
      ('outlook_desktop_installations'),
      ('outlook_desktop_installation_nonces'),
      ('outlook_desktop_installation_idempotency'),
      ('outlook_desktop_installation_audit_events'),
      ('outlook_desktop_release_artifacts'),
      ('outlook_desktop_release_trust_audit_events'),
      ('outlook_desktop_release_import_receipts'),
      ('outlook_desktop_release_revocation_receipts'),
      ('outlook_desktop_activation_issue_authorities'),
      ('outlook_desktop_activation_challenges'),
      ('outlook_desktop_activation_operator_packet_evidence'),
      ('outlook_desktop_activation_authorizations'),
      ('outlook_desktop_lifecycle_challenges'),
      ('outlook_desktop_lifecycle_authorizations'),
      ('outlook_desktop_installation_release_bindings'),
      ('outlook_desktop_assignment_canary_principals'),
      ('outlook_desktop_assignment_rosters'),
      ('outlook_desktop_assignment_roster_members'),
      ('outlook_desktop_assignment_expansion_authorizations'),
      ('outlook_desktop_assignment_policy_approvals'),
      ('outlook_desktop_assignment_policies'),
      ('outlook_desktop_assignment_states'),
      ('outlook_desktop_assignment_audit_events'),
      ('outlook_desktop_assignment_outbox'),
      ('outlook_desktop_assignment_outbox_receipts')
    ), actual AS (
      SELECT relation.relname::text AS table_name,trigger.tgname::text AS trigger_name,
             trigger.tgfoid,trigger.tgtype::integer AS trigger_type,
             trigger.tgenabled,trigger.tgconstraint,trigger.tgdeferrable,
             trigger.tginitdeferred
        FROM protected_tables
        JOIN pg_class AS relation ON relation.oid=
          format('lawos_email_dms.%I',protected_tables.table_name)::regclass
        JOIN pg_trigger AS trigger ON trigger.tgrelid=relation.oid
       WHERE NOT trigger.tgisinternal
    )
    SELECT 1 FROM expected
      FULL JOIN actual USING (table_name,trigger_name)
     WHERE expected.table_name IS NULL OR actual.table_name IS NULL
        OR actual.tgfoid<>to_regprocedure(expected.function_signature)
        OR actual.trigger_type<>expected.trigger_type
        OR actual.tgenabled<>'O' OR actual.tgconstraint<>0
        OR actual.tgdeferrable OR actual.tginitdeferred
  ) OR EXISTS (
    SELECT 1 FROM pg_proc AS procedure
     JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
    WHERE namespace.nspname='lawos_email_dms'
      AND (procedure.proname LIKE '%outlook_desktop%'
           OR procedure.proname LIKE '%outlook_assignment%')
      AND procedure.proowner<>owner_oid
  ) OR EXISTS (
    SELECT 1
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid=relation.relnamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(
        relation.relacl,acldefault('r',relation.relowner))) AS privilege
      LEFT JOIN pg_roles AS role ON role.oid=privilege.grantee
     WHERE namespace.nspname='lawos_email_dms'
       AND relation.relname LIKE 'outlook_desktop_%'
       AND relation.relkind IN ('r','p')
       AND privilege.grantee<>owner_oid
       AND NOT (
         role.rolname='lawos_app' AND privilege.privilege_type='SELECT'
         AND NOT privilege.is_grantable
         AND relation.relname IN (
           'outlook_desktop_release_artifacts',
           'outlook_desktop_release_trust_audit_events'
         )
       )
  ) OR EXISTS (
    SELECT 1
      FROM pg_proc AS procedure
      JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
      CROSS JOIN LATERAL aclexplode(COALESCE(
        procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
      LEFT JOIN pg_roles AS role ON role.oid=privilege.grantee
     WHERE namespace.nspname='lawos_email_dms'
       AND (procedure.proname LIKE '%outlook_desktop%'
            OR procedure.proname LIKE '%outlook_assignment%')
       AND privilege.grantee<>owner_oid
       AND COALESCE(role.rolname,'PUBLIC') NOT IN (
         'lawos_app','lawos_outlook_control_operator',
         'lawos_outlook_assignment_worker',
         'lawos_outlook_lifecycle_verifier'
       )
  ) THEN
    RAISE EXCEPTION 'outlook authority ownership or RLS verification failed';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    WITH expected(signature,allowed_role) AS (VALUES
      ('lawos_email_dms.reject_outlook_desktop_immutable_mutation()',NULL),
      ('lawos_email_dms.outlook_desktop_release_audit_binding_sha256(text,text,text,text,text,text,text,timestamp with time zone)',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_release_audit_binding()',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_release_revocation()',NULL),
      ('lawos_email_dms.project_outlook_desktop_assignment_at(text,text,text,text,timestamp with time zone)',NULL),
      ('lawos_email_dms.outlook_desktop_binding_sha256(text[])',NULL),
      ('lawos_email_dms.outlook_desktop_canonical_json_text(jsonb)',NULL),
      ('lawos_email_dms.outlook_desktop_assert_tenant(text)',NULL),
      ('lawos_email_dms.outlook_desktop_exact_millisecond_utc(text)',NULL),
      ('lawos_email_dms.outlook_desktop_release_artifact_authority_sha256(text,text)',NULL),
      ('lawos_email_dms.outlook_desktop_release_revocation_authority_sha256(text,text)',NULL),
      ('lawos_email_dms.consume_outlook_desktop_activation_authorization_at(text,jsonb,timestamp with time zone)',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_policy_approval()',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_policy()',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_activation_challenge()',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_activation_authorization()',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_lifecycle_challenge()',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_lifecycle_authorization()',NULL),
      ('lawos_email_dms.enforce_outlook_desktop_expansion_authorization()',NULL),
      ('lawos_email_dms.register_outlook_desktop_installation(text,jsonb)','lawos_app'),
      ('lawos_email_dms.heartbeat_outlook_desktop_installation(text,jsonb)','lawos_app'),
      ('lawos_email_dms.retire_outlook_desktop_installation(text,jsonb)','lawos_app'),
      ('lawos_email_dms.read_outlook_desktop_installation(text,text,text,text)','lawos_app'),
      ('lawos_email_dms.read_current_outlook_desktop_installation(text,text,text)','lawos_app'),
      ('lawos_email_dms.read_outlook_desktop_assignment_state(text,text,text)','lawos_app'),
      ('lawos_email_dms.read_outlook_desktop_activation_proof_seed(text,jsonb)','lawos_app'),
      ('lawos_email_dms.issue_outlook_desktop_lifecycle_challenge(text,jsonb)','lawos_app'),
      ('lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.import_outlook_desktop_release_artifact(text,text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.replay_outlook_desktop_release_revocation(text,text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.revoke_outlook_desktop_release(text,text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.authorize_outlook_desktop_assignment_expansion(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.import_outlook_desktop_assignment_roster(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.approve_outlook_desktop_assignment_policy(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.revoke_outlook_desktop_assignment_policy(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.publish_outlook_desktop_activation_issue_authority(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.load_current_outlook_desktop_activation_issue_authority(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.issue_outlook_desktop_activation_challenge(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.attach_outlook_desktop_activation_evidence(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.load_outlook_desktop_activation_reservation(text,text)','lawos_outlook_control_operator'),
      ('lawos_email_dms.authorize_outlook_desktop_activation(text,jsonb)','lawos_outlook_control_operator'),
      ('lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt(text,jsonb)','lawos_outlook_lifecycle_verifier'),
      ('lawos_email_dms.sweep_outlook_desktop_assignments(text,integer)','lawos_outlook_assignment_worker'),
      ('lawos_email_dms.claim_outlook_desktop_assignment_jobs(text,text,integer,integer,integer)','lawos_outlook_assignment_worker'),
      ('lawos_email_dms.begin_outlook_desktop_assignment_dispatch(text,text,text,text)','lawos_outlook_assignment_worker'),
      ('lawos_email_dms.complete_outlook_desktop_assignment_job(text,jsonb)','lawos_outlook_assignment_worker'),
      ('lawos_email_dms.fail_outlook_desktop_assignment_job(text,jsonb,integer,integer)','lawos_outlook_assignment_worker'),
      ('lawos_email_dms.extend_outlook_desktop_assignment_lease(text,text,text,text,integer)','lawos_outlook_assignment_worker'),
      ('lawos_email_dms.recover_outlook_desktop_assignment_removals(text,integer)','lawos_outlook_assignment_worker')
    )
    SELECT 1 FROM expected
     WHERE to_regprocedure(signature) IS NULL
        OR (SELECT owner.rolname FROM pg_proc AS procedure
             JOIN pg_roles AS owner ON owner.oid=procedure.proowner
            WHERE procedure.oid=to_regprocedure(signature))<>
           'lawos_outlook_authority_owner'
        OR EXISTS (
          SELECT 1 FROM pg_proc AS procedure
          CROSS JOIN LATERAL aclexplode(COALESCE(
            procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
          LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
          WHERE procedure.oid=to_regprocedure(signature)
            AND privilege.grantee<>procedure.proowner
            AND NOT (allowed_role IS NOT NULL
                     AND grantee.rolname=allowed_role
                     AND privilege.privilege_type='EXECUTE'
                     AND NOT privilege.is_grantable)
        )
        OR (allowed_role IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM pg_proc AS procedure
          CROSS JOIN LATERAL aclexplode(COALESCE(
            procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
          JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
          WHERE procedure.oid=to_regprocedure(signature)
            AND grantee.rolname=allowed_role
            AND privilege.privilege_type='EXECUTE'
            AND NOT privilege.is_grantable))
  ) OR EXISTS (
    SELECT 1 FROM pg_default_acl AS defaults
    JOIN pg_namespace AS namespace ON namespace.oid=defaults.defaclnamespace
    CROSS JOIN LATERAL aclexplode(defaults.defaclacl) AS privilege
    WHERE namespace.nspname='lawos_email_dms'
      AND privilege.grantee<>defaults.defaclrole
  ) THEN
    RAISE EXCEPTION 'outlook authority exact function or default ACL matrix failed';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM pg_temp.outlook_authority_approved_email_dms_functions AS approved
      LEFT JOIN pg_proc AS procedure
        ON procedure.oid=to_regprocedure(approved.signature)
      LEFT JOIN pg_roles AS owner ON owner.oid=procedure.proowner
     WHERE procedure.oid IS NULL OR owner.rolname<>approved.expected_owner
  ) OR EXISTS (
    SELECT 1
      FROM pg_proc AS procedure
      JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
      LEFT JOIN pg_temp.outlook_authority_approved_email_dms_functions AS approved
        ON approved.signature=procedure.oid::regprocedure::text
     WHERE namespace.nspname='lawos_email_dms' AND approved.signature IS NULL
  ) OR EXISTS (
    SELECT 1
      FROM pg_temp.outlook_authority_approved_email_dms_functions AS approved
      JOIN pg_proc AS procedure
        ON procedure.oid=to_regprocedure(approved.signature)
      CROSS JOIN LATERAL aclexplode(COALESCE(
        procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
      LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
     WHERE privilege.grantee<>procedure.proowner
       AND NOT (approved.allowed_role IS NOT NULL
                AND grantee.rolname=approved.allowed_role
                AND privilege.privilege_type='EXECUTE'
                AND NOT privilege.is_grantable)
  ) OR EXISTS (
    SELECT 1
      FROM pg_temp.outlook_authority_approved_email_dms_functions AS approved
      JOIN pg_proc AS procedure
        ON procedure.oid=to_regprocedure(approved.signature)
     WHERE approved.allowed_role IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
           FROM aclexplode(COALESCE(
             procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
           JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
          WHERE grantee.rolname=approved.allowed_role
            AND privilege.privilege_type='EXECUTE'
            AND NOT privilege.is_grantable)
  ) THEN
    RAISE EXCEPTION 'email-DMS function inventory or ACL verification failed';
  END IF;
END
$$;

SELECT pg_temp.verify_outlook_authority_final();
DROP FUNCTION pg_temp.verify_outlook_authority_final();
