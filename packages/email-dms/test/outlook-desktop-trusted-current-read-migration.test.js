import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  createPostgresOutlookDesktopInstallationAuthorityService,
} from "../src/postgres-outlook-desktop-installation-authority-service.js";
import {
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG,
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256,
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS,
  OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
} from "../src/outlook-desktop-trusted-current-read-authority-catalog.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  authorizeAndRegister,
  createOutlookAssignmentAuthorityFixture,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  roleQuery,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

const MIGRATION_ID = "008_outlook_desktop_trusted_current_read";
const FUNCTION_SIGNATURE =
  "lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)";
const FUNCTION_SQL =
  "SELECT lawos_email_dms.read_trusted_current_outlook_desktop_installation($1,$2,$3) AS value";

function trustedRead(authority, pool = authority.appPool, tenantId = authority.tenantId) {
  return roleQuery(pool, authority.tenantId, FUNCTION_SQL, [
    tenantId,
    authority.principal.user_id,
    authority.principal.entra_subject_id,
  ], true);
}

function canonicalSql(value) {
  return String(value).replace(/\s+/gu, " ").trim();
}

async function authorityRows(authority) {
  return (await authority.observerPool.query(
    `SELECT pg_catalog.jsonb_build_object(
       'installations',COALESCE((SELECT pg_catalog.jsonb_agg(to_jsonb(row)
         ORDER BY tenant_id,installation_id)
         FROM lawos_email_dms.outlook_desktop_installations AS row),'[]'::jsonb),
       'bindings',COALESCE((SELECT pg_catalog.jsonb_agg(to_jsonb(row)
         ORDER BY tenant_id,installation_id)
         FROM lawos_email_dms.outlook_desktop_installation_release_bindings AS row),'[]'::jsonb),
       'activations',COALESCE((SELECT pg_catalog.jsonb_agg(to_jsonb(row)
         ORDER BY tenant_id,activation_authorization_id)
         FROM lawos_email_dms.outlook_desktop_activation_authorizations AS row),'[]'::jsonb),
       'artifacts',COALESCE((SELECT pg_catalog.jsonb_agg(to_jsonb(row)
         ORDER BY tenant_id,release_artifact_id)
         FROM lawos_email_dms.outlook_desktop_release_artifacts AS row),'[]'::jsonb),
       'audit',COALESCE((SELECT pg_catalog.jsonb_agg(to_jsonb(row)
         ORDER BY tenant_id,event_id)
         FROM lawos_email_dms.outlook_desktop_release_trust_audit_events AS row),'[]'::jsonb)
     )::text AS value`,
  )).rows[0].value;
}

async function addUntrustedInstallation(authority, status) {
  const installationId = `odi_newer_untrusted_${status}_000001`;
  await authority.observerPool.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installations(
       tenant_id,installation_id,user_id,entra_subject_id,device_public_key,
       device_key_fingerprint,platform,app_version,source_sha,registered_at,
       last_seen_at,lease_expires_at,retired_at,retire_reason,state_version)
     SELECT $1,$2,$3,$4,repeat('A',64),$5,$6,$7,$8,
       CASE WHEN $9='expired' THEN now_at-interval '2 days' ELSE now_at+interval '1 second' END,
       CASE WHEN $9='expired' THEN now_at-interval '2 days' ELSE now_at+interval '1 second' END,
       CASE WHEN $9='expired' THEN now_at-interval '1 day' ELSE now_at+interval '7 days' END,
       CASE WHEN $9='retired' THEN now_at+interval '2 seconds' ELSE NULL END,
       CASE WHEN $9='retired' THEN 'installation_replaced' ELSE NULL END,1
     FROM (SELECT date_trunc('milliseconds',clock_timestamp()) AS now_at) AS clock`,
    [authority.tenantId, installationId, authority.principal.user_id,
      authority.principal.entra_subject_id,
      createHash("sha256").update(installationId).digest("hex"),
      authority.release.platform, authority.release.app_version,
      authority.release.source_sha, status],
  );
  return installationId;
}

async function removeSyntheticInstallation(authority, installationId) {
  await authority.observerPool.query(
    `DELETE FROM lawos_email_dms.outlook_desktop_installations
      WHERE tenant_id=$1 AND installation_id=$2`,
    [authority.tenantId, installationId],
  );
}

test("008 registers one additive trusted-current SECURITY DEFINER read", () => {
  const migration = listEmailDmsPostgresMigrations()
    .find(({ id }) => id === MIGRATION_ID);

  assert.ok(migration, `${MIGRATION_ID} must be registered`);
  assert.equal(migration.file_name,
    "./008_outlook_desktop_trusted_current_read.sql");
  assert.match(migration.checksum, /^[a-f0-9]{64}$/u);
  assert.match(migration.sql,
    /CREATE FUNCTION lawos_email_dms[.]read_trusted_current_outlook_desktop_installation\s*\(/u);
  assert.match(migration.sql,
    /LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER/u);
  assert.equal(
    migration.sql.match(/clock_timestamp\s*\(\s*\)/gu)?.length,
    1,
  );
  assert.doesNotMatch(migration.sql, /CREATE\s+TABLE|ALTER\s+TABLE|\b(?:INSERT|UPDATE|DELETE)\b/iu);
  assert.doesNotMatch(migration.sql,
    /\bFOR\s+(?:UPDATE|NO\s+KEY\s+UPDATE|SHARE|KEY\s+SHARE)\b|pg_advisory/iu);
  assert.doesNotMatch(migration.sql,
    /GRANT\s+SELECT[\s\S]*outlook_desktop_installation_release_bindings/iu);
  assert.match(migration.sql,
    /IF trusted_count<>1 THEN\s+RETURN NULL;/u);
  assert.match(FUNCTION_SIGNATURE,
    /^lawos_email_dms[.]read_trusted_current_outlook_desktop_installation/u);
  assert.equal(
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG
      .source_migration_checksum,
    migration.checksum,
  );
  assert.equal(
    hashDomainValue(
      OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS,
    ),
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
  );
  assert.equal(
    hashDomainValue(OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG),
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256,
  );

  const assignment = listEmailDmsPostgresMigrations()
    .find(({ id }) => id === "007_outlook_desktop_assignment");
  const ordering = /ORDER BY CASE\s+WHEN retired_at IS NULL AND lease_expires_at>now_at THEN 0\s+WHEN retired_at IS NULL THEN 1\s+ELSE 2\s+END,\s+last_seen_at DESC,registered_at DESC,installation_id DESC\s+LIMIT 1;/u;
  assert.equal(canonicalSql(migration.sql.match(ordering)?.[0]),
    canonicalSql(assignment.sql.match(ordering)?.[0]));
});

test("008 PostgreSQL catalog exposes only lawos_app EXECUTE and preserves raw-table closure", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-trusted-current-catalog-a",
  });
  if (!authority) return;
  const catalog = (await authority.observerPool.query(
    `SELECT owner.rolname AS owner,language.lanname AS language,
            procedure.prokind,procedure.provolatile,procedure.proparallel,
            procedure.proleakproof,procedure.prosecdef,procedure.proconfig,
            pg_catalog.pg_get_functiondef(procedure.oid) AS definition,
            EXISTS (
              SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
                procedure.proacl,pg_catalog.acldefault('f',procedure.proowner)
              )) AS privilege
               WHERE privilege.grantee=0
                 AND privilege.privilege_type='EXECUTE'
            ) AS public_execute,
            has_function_privilege('lawos_app',$1,'EXECUTE') AS app_execute,
            has_table_privilege('lawos_app',$2,'SELECT') AS raw_table_select,
            has_any_column_privilege('lawos_app',$2,'SELECT') AS raw_column_select,
            has_schema_privilege('lawos_outlook_authority_owner',
              'lawos_email_dms','CREATE') AS owner_schema_create,
            EXISTS (SELECT 1 FROM pg_auth_members AS membership
              WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
                AND membership.member='lawos_admin'::regrole
                AND membership.grantor='lawos_admin'::regrole) AS self_grant
       FROM pg_proc AS procedure
       JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
       JOIN pg_roles AS owner ON owner.oid=procedure.proowner
       JOIN pg_language AS language ON language.oid=procedure.prolang
      WHERE procedure.oid=to_regprocedure($1)`,
    [FUNCTION_SIGNATURE,
      "lawos_email_dms.outlook_desktop_installation_release_bindings"],
  )).rows[0];
  assert.deepEqual({
    owner: catalog.owner,
    language: catalog.language,
    kind: catalog.prokind,
    volatility: catalog.provolatile,
    parallel: catalog.proparallel,
    leakproof: catalog.proleakproof,
    security_definer: catalog.prosecdef,
    search_path: catalog.proconfig,
    public_execute: catalog.public_execute,
    app_execute: catalog.app_execute,
    raw_table_select: catalog.raw_table_select,
    raw_column_select: catalog.raw_column_select,
    owner_schema_create: catalog.owner_schema_create,
    self_grant: catalog.self_grant,
  }, {
    owner: "lawos_outlook_authority_owner",
    language: "plpgsql",
    kind: "f",
    volatility: "v",
    parallel: "u",
    leakproof: false,
    security_definer: true,
    search_path: ["search_path=pg_catalog, lawos_email_dms, lawos_security"],
    public_execute: false,
    app_execute: true,
    raw_table_select: false,
    raw_column_select: false,
    owner_schema_create: false,
    self_grant: false,
  });
  t.diagnostic(`pg_get_functiondef_sha256=${
    createHash("sha256").update(catalog.definition).digest("hex")}`);
  assert.equal(
    createHash("sha256").update(catalog.definition).digest("hex"),
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS[0]
      .pg_get_functiondef_sha256,
  );

  const acl = (await authority.observerPool.query(
    `SELECT COALESCE(grantee.rolname,'PUBLIC') AS grantee,
            privilege.privilege_type,privilege.is_grantable
       FROM pg_proc AS procedure
       CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(
         procedure.proacl,pg_catalog.acldefault('f',procedure.proowner)
       )) AS privilege
       LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
      WHERE procedure.oid=to_regprocedure($1)
        AND privilege.grantee<>procedure.proowner
      ORDER BY grantee,privilege.privilege_type`,
    [FUNCTION_SIGNATURE],
  )).rows;
  assert.deepEqual(acl, [{
    grantee: "lawos_app",
    privilege_type: "EXECUTE",
    is_grantable: false,
  }]);

  await assert.rejects(roleQuery(
    authority.appPool,
    authority.tenantId,
    `SELECT count(*) AS value
       FROM lawos_email_dms.outlook_desktop_installation_release_bindings`,
    [], true,
  ), (error) => error?.postgres_code === "42501");
  for (const pool of [authority.controlPool, authority.workerPool,
    authority.verifierPool]) {
    await assert.rejects(trustedRead(authority, pool),
      (error) => error?.postgres_code === "42501");
  }
  await assert.rejects(trustedRead(authority, authority.appPool,
    "tenant-trusted-current-foreign"),
    (error) => error?.postgres_code === "42501");
});

test("trusted-current read returns the exact live binding and never falls back", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-trusted-current-runtime-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "81" });
  const registered = await authorizeAndRegister(authority, "trusted81");
  const before = await authorityRows(authority);
  const service = createPostgresOutlookDesktopInstallationAuthorityService({
    pool: authority.appPool,
    tenant_id: authority.tenantId,
  });
  const result = await service.readTrustedCurrent({
    principal: { tenant_id: authority.tenantId, ...authority.principal },
  });
  assert.deepEqual(Object.keys(result), [
    "installation_id", "status", "state_version", "lease_expires_at",
    "retired_at", "release_trusted", "authority_snapshot_at",
  ]);
  assert.equal(result.installation_id, registered.registration.installation_id);
  assert.equal(result.status, "active");
  assert.equal(result.state_version, 1);
  assert.equal(result.retired_at, null);
  assert.equal(result.release_trusted, true);
  assert.equal(new Date(result.lease_expires_at).toISOString(),
    result.lease_expires_at);
  assert.equal(new Date(result.authority_snapshot_at).toISOString(),
    result.authority_snapshot_at);
  assert.ok(Date.parse(result.lease_expires_at) >
    Date.parse(result.authority_snapshot_at));
  assert.equal(await authorityRows(authority), before);

  for (const status of ["expired", "retired"]) {
    const installationId = await addUntrustedInstallation(authority, status);
    assert.equal((await trustedRead(authority)).installation_id,
      registered.registration.installation_id);
    await removeSyntheticInstallation(authority, installationId);
  }
  const activeUntrusted = await addUntrustedInstallation(authority, "active");
  assert.equal(await trustedRead(authority), null,
    "a newer untrusted current installation must not fall back");
  await removeSyntheticInstallation(authority, activeUntrusted);
  assert.equal((await trustedRead(authority)).installation_id,
    registered.registration.installation_id);

  const revocation = {
    release_artifact_id: authority.release.release_artifact_id,
    revocation_event_id: "trusted-current-release-revoked-81",
    revocation_reason: "operator_rejected",
  };
  await roleQuery(
    authority.controlPool,
    authority.tenantId,
    "SELECT lawos_email_dms.revoke_outlook_desktop_release($1,$2,$3::jsonb) AS value",
    [authority.tenantId, "trusted-current-release-revoke-81",
      JSON.stringify(revocation)],
  );
  assert.equal(await trustedRead(authority), null);
});
