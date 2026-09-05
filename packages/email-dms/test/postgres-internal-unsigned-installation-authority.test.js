import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS } from "../src/internal-unsigned-installation-authority-catalog.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  authorityDigest,
  createOutlookAssignmentAuthorityFixture,
  roleDatabaseNow,
  roleJsonCall,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { roleQuery } from "./support/postgres-outlook-desktop-positive-role-fixture.js";

const TABLES = [
  "internal_unsigned_release_authorizations",
  "internal_unsigned_release_revocations",
  "internal_unsigned_installation_bindings",
];
const FUNCTIONS = [
  ["authorize_internal_unsigned_release(text,jsonb)", "control"],
  ["revoke_internal_unsigned_release(text,jsonb)", "control"],
  ["apply_internal_unsigned_installation(text,jsonb)", "app"],
  ["read_current_internal_unsigned_installation(text,text,text)", "app"],
  ["read_internal_unsigned_installation_proof_key(text,text,text,text)", "app"],
];
const INSTALLATION_KEYS = [
  "installation_id", "tenant_id", "app_id", "platform", "architecture",
  "release_id", "release_sequence", "version", "source_sha", "source_tree",
  "installer_sha256", "installer_bytes", "installer_version_id",
  "bootstrap_marker_sha256", "installed_receipt_sha256", "state_version",
  "lease_expires_at", "installation_release_binding_sha256",
  "release_authority_sha256", "status", "retired_at", "release_trusted",
  "authority_snapshot_at",
];

function device() {
  const publicKey = generateKeyPairSync("ed25519").publicKey
    .export({ type: "spki", format: "der" });
  return {
    publicKey: publicKey.toString("base64"),
    fingerprint: createHash("sha256").update(publicKey).digest("hex"),
  };
}

function postgresCode(expected) {
  return (error) => error?.postgres_code === expected || error?.code === expected;
}

async function fixture(t, suffix) {
  let authority;
  try {
    authority = await createOutlookAssignmentAuthorityFixture(t, {
      tenantId: `tenant-internal-installation-${suffix}`,
    });
  } catch (error) {
    t.diagnostic(JSON.stringify({ code: error.code, position: error.position,
      internalPosition: error.internalPosition, where: error.where }));
    throw error;
  }
  assert.ok(authority, "an actual temporary PostgreSQL fixture is required");
  return authority;
}

function sealGrant(value) {
  const { release_authority_sha256: ignored, ...grant } = value;
  return { ...grant, release_authority_sha256: hashDomainValue(grant) };
}

async function grantFor(authority, pair, suffix, overrides = {}) {
  const now = Date.parse(await roleDatabaseNow(authority.appPool, authority.tenantId));
  return sealGrant({
    tenant_id: authority.tenantId,
    authorization_id: `internal-authorization-${suffix}`,
    ...authority.principal,
    device_key_fingerprint: pair.fingerprint,
    installed_receipt_sha256: authorityDigest(`installed-receipt-${suffix}`),
    app_id: "com.amic.matter.desktop.internal",
    platform: "win32",
    architecture: "x64",
    channel: "internal-unsigned",
    release_id: `internal-release-${suffix}`,
    release_sequence: 32,
    version: "0.1.32",
    source_sha: "a".repeat(40),
    source_tree: "b".repeat(40),
    installer_sha256: authorityDigest(`installer-${suffix}`),
    installer_bytes: 109711906,
    installer_version_id: `immutable-installer-version-${suffix}`,
    bootstrap_marker_sha256: authorityDigest(`bootstrap-${suffix}`),
    owner_approval_sha256: authorityDigest(`owner-approval-${suffix}`),
    valid_from: new Date(now - 1000).toISOString(),
    valid_until: new Date(now + 3600000).toISOString(),
    ...overrides,
  });
}

function authorize(authority, grant, pool = authority.controlPool) {
  return roleJsonCall(pool, authority.tenantId,
    "authorize_internal_unsigned_release", grant);
}

function transition(authority, grant, pair, suffix, {
  operation = "register",
  installationId = "NEW",
  stateVersion = 1,
} = {}) {
  return {
    operation,
    principal: { ...authority.principal },
    request_id: `request-internal-${suffix}`,
    installation_id: installationId,
    body: operation === "register" ? {
      release_authorization_id: grant.authorization_id,
      device_public_key: pair.publicKey,
      installed_receipt_sha256: grant.installed_receipt_sha256,
    } : {
      expected_state_version: stateVersion,
      ...(operation === "retire" ? { retire_reason: "windows_uninstall" } : {}),
    },
    verified: {
      idempotency_key: `idempotency-internal-${suffix}`,
      nonce_hash: authorityDigest(`nonce-${suffix}`),
      request_fingerprint: authorityDigest(`request-${suffix}`),
      issued_at: new Date(Date.now() - 1000).toISOString(),
      expires_at: new Date(Date.now() + 120000).toISOString(),
      device_key_fingerprint: pair.fingerprint,
    },
  };
}

function apply(authority, request) {
  return roleJsonCall(authority.appPool, authority.tenantId,
    "apply_internal_unsigned_installation", request);
}

function readCurrent(authority, principal = authority.principal, tenantId = authority.tenantId) {
  return roleQuery(authority.appPool, authority.tenantId,
    "SELECT lawos_email_dms.read_current_internal_unsigned_installation($1,$2,$3) AS value",
    [tenantId, principal.user_id, principal.entra_subject_id], true);
}

function readKey(authority, installationId, principal = authority.principal) {
  return roleQuery(authority.appPool, authority.tenantId,
    "SELECT lawos_email_dms.read_internal_unsigned_installation_proof_key($1,$2,$3,$4) AS value",
    [authority.tenantId, principal.user_id, principal.entra_subject_id, installationId], true);
}

function revoke(authority, grant, suffix) {
  return roleJsonCall(authority.controlPool, authority.tenantId,
    "revoke_internal_unsigned_release", {
      authorization_id: grant.authorization_id,
      expected_release_authority_sha256: grant.release_authority_sha256,
      revocation_id: `internal-revocation-${suffix}`,
      reason: "release_withdrawn",
      owner_approval_sha256: authorityDigest(`revoke-owner-${suffix}`),
    });
}

async function rows(authority) {
  const result = {};
  for (const table of [...TABLES,
    "outlook_desktop_installations", "outlook_desktop_installation_nonces",
    "outlook_desktop_installation_idempotency", "outlook_desktop_installation_audit_events",
  ]) {
    result[table] = (await authority.observerPool.query(
      `SELECT COALESCE(jsonb_agg(to_jsonb(row) ORDER BY to_jsonb(row)::text),'[]'::jsonb) AS value
         FROM lawos_email_dms.${table} AS row WHERE tenant_id=$1`,
      [authority.tenantId],
    )).rows[0].value;
  }
  return result;
}

test("internal unsigned PostgreSQL authority registers, reads, renews, and retires with durable replay", async (t) => {
  const authority = await fixture(t, "lifecycle");
  const pair = device();
  const grant = await grantFor(authority, pair, "lifecycle");
  const authorized = await authorize(authority, grant);
  assert.equal(authorized.authorization_id, grant.authorization_id);
  assert.equal(authorized.release_authority_sha256, grant.release_authority_sha256);
  assert.deepEqual(await authorize(authority, grant), authorized);
  assert.equal(await readCurrent(authority), null);

  const request = transition(authority, grant, pair, "register");
  const registered = await apply(authority, request);
  assert.equal(registered.response_status, 201);
  assert.equal(registered.body.outcome, "registered");
  const installationId = registered.body.installation.installation_id;
  assert.match(installationId, /^odi_[A-Za-z0-9_-]{20,128}$/u);
  assert.equal(registered.body.installation.state_version, 1);
  const afterRegister = await rows(authority);
  assert.deepEqual(await apply(authority, request), registered);
  assert.deepEqual(await rows(authority), afterRegister);

  const current = await readCurrent(authority);
  assert.deepEqual(Object.keys(current).sort(), ["expires_at", "installation"]);
  assert.deepEqual(Object.keys(current.installation).sort(), [...INSTALLATION_KEYS].sort());
  assert.equal(current.installation.installation_id, installationId);
  assert.equal(current.installation.state_version, 1);
  assert.equal(current.installation.release_authority_sha256, grant.release_authority_sha256);
  assert.equal(current.installation.source_sha, grant.source_sha);
  assert.equal(current.installation.source_tree, grant.source_tree);
  assert.equal(current.installation.release_trusted, true);
  for (const key of ["tenant_id", "app_id", "platform", "architecture",
    "release_id", "release_sequence", "version", "installer_sha256",
    "installer_bytes", "installer_version_id", "bootstrap_marker_sha256",
    "installed_receipt_sha256"]) {
    assert.equal(current.installation[key], grant[key], key);
  }
  assert.ok(Date.parse(current.expires_at) > Date.now());
  assert.deepEqual(await readKey(authority, installationId), {
    device_public_key: pair.publicKey,
    device_key_fingerprint: pair.fingerprint,
  });

  const heartbeat = transition(authority, grant, pair, "heartbeat", {
    operation: "heartbeat", installationId,
  });
  const renewed = await apply(authority, heartbeat);
  assert.equal(renewed.body.installation.state_version, 2);
  assert.deepEqual(await apply(authority, heartbeat), renewed);
  const retirement = transition(authority, grant, pair, "retirement", {
    operation: "retire", installationId, stateVersion: 2,
  });
  const retired = await apply(authority, retirement);
  assert.equal(retired.body.outcome, "retired");
  assert.equal(retired.body.installation.status, "retired");
  assert.equal(retired.body.installation.state_version, 3);
  assert.deepEqual(await apply(authority, retirement), retired);
  await assert.rejects(readCurrent(authority), postgresCode("LIU06"));
  const finalRows = await rows(authority);
  assert.equal(finalRows.internal_unsigned_release_authorizations.length, 1);
  assert.equal(finalRows.internal_unsigned_installation_bindings.length, 1);
  for (const table of ["outlook_desktop_installation_nonces",
    "outlook_desktop_installation_idempotency", "outlook_desktop_installation_audit_events"]) {
    assert.equal(finalRows[table].length, 3, table);
  }
});

test("internal unsigned authority rejects tenant, principal, device, receipt, and request conflicts without writes", async (t) => {
  const authority = await fixture(t, "boundaries");
  const pair = device();
  const grant = await grantFor(authority, pair, "boundaries");
  await authorize(authority, grant);
  const authorizedRows = await rows(authority);
  for (const [altered, expectedCode] of [
    [{ ...grant, release_authority_sha256: authorityDigest("wrong-authority") }, "LIU08"],
    [sealGrant({ ...grant, tenant_id: "tenant-other" }), "LIU07"],
    [sealGrant({ ...grant, installer_bytes: 0 }), "LIU08"],
    [sealGrant({ ...grant, installer_bytes: 2147483649 }), "LIU08"],
    [sealGrant({ ...grant, installer_version_id: "version with spaces" }), "LIU08"],
    [sealGrant({ ...grant, platform: "darwin" }), "LIU08"],
    [sealGrant({ ...grant, version: "0.1.33" }), "LIU01"],
    [sealGrant({ ...grant, extra: "unexpected" }), "LIU07"],
  ]) {
    await assert.rejects(authorize(authority, altered), postgresCode(expectedCode));
    assert.deepEqual(await rows(authority), authorizedRows);
  }
  const request = transition(authority, grant, pair, "binding-register");
  for (const [altered, expectedCode] of [
    [{ ...request, principal: { ...request.principal, user_id: "other-user" } }, "LIU03"],
    [{ ...request, principal: { ...request.principal, entra_subject_id: "other-subject" } }, "LIU03"],
    [{ ...request, body: { ...request.body, installed_receipt_sha256: authorityDigest("wrong-receipt") } }, "LIU03"],
    [{ ...request, body: { ...request.body, device_public_key: device().publicKey } }, "LIU08"],
    [{ ...request, verified: { ...request.verified, device_key_fingerprint: authorityDigest("wrong-device") } }, "LIU08"],
    [{ ...request, verified: { ...request.verified, expires_at: new Date(Date.now() - 1).toISOString() } }, "LIU07"],
    [{ ...request, body: { ...request.body, release_trusted: true } }, "LIU08"],
  ]) {
    await assert.rejects(apply(authority, altered), postgresCode(expectedCode));
    assert.deepEqual(await rows(authority), authorizedRows);
  }
  const registered = await apply(authority, request);
  const installationId = registered.body.installation.installation_id;
  const initialRows = await rows(authority);
  for (const options of [
    { isolationLevel: "serializable", readOnly: false },
    { isolationLevel: "read committed", readOnly: true },
  ]) {
    await assert.rejects(withPostgresTransaction(authority.appPool,
      { tenant_id: authority.tenantId, ...options },
      (client) => client.query(
        "SELECT lawos_email_dms.read_current_internal_unsigned_installation($1,$2,$3)",
        [authority.tenantId, authority.principal.user_id, authority.principal.entra_subject_id],
      )), postgresCode("LIU07"));
  }
  await assert.rejects(readCurrent(authority, authority.principal, "tenant-other"));
  assert.equal(await readCurrent(authority, { ...authority.principal, user_id: "other-user" }), null);
  await assert.rejects(readKey(authority, installationId, { ...authority.principal,
    entra_subject_id: "other-subject" }), postgresCode("LIU03"));
  const heartbeat = transition(authority, grant, pair, "binding-heartbeat", {
    operation: "heartbeat", installationId,
  });
  for (const [altered, expectedCode] of [
    [{ ...request, verified: { ...request.verified, request_fingerprint: authorityDigest("changed-replay") } }, "LIU01"],
    [{ ...heartbeat, body: { expected_state_version: 2 } }, "LIU04"],
    [{ ...heartbeat, principal: { ...heartbeat.principal, user_id: "other-user" } }, "LIU03"],
    [{ ...heartbeat, verified: { ...heartbeat.verified, nonce_hash: request.verified.nonce_hash } }, "LIU02"],
  ]) {
    await assert.rejects(apply(authority, altered), postgresCode(expectedCode));
    assert.deepEqual(await rows(authority), initialRows);
  }
  const concurrent = await Promise.allSettled([
    apply(authority, heartbeat),
    apply(authority, transition(authority, grant, pair, "competing-heartbeat", {
      operation: "heartbeat", installationId,
    })),
  ]);
  assert.equal(concurrent.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(concurrent.filter(({ status }) => status === "rejected").length, 1);
  assert.equal((await readCurrent(authority)).installation.state_version, 2);
});

test("internal unsigned current selection does not fall back behind an untrusted newer installation", async (t) => {
  const authority = await fixture(t, "selection");
  const pair = device();
  const grant = await grantFor(authority, pair, "selection");
  await authorize(authority, grant);
  const registered = await apply(authority, transition(authority, grant, pair, "selection-register"));
  const installationId = registered.body.installation.installation_id;
  assert.equal((await readCurrent(authority)).installation.installation_id, installationId);
  const newerId = "odi_untrusted_newer_internal_0000001";
  const newerDevice = device();
  await authority.observerPool.query(
    `INSERT INTO lawos_email_dms.outlook_desktop_installations(
       tenant_id,installation_id,user_id,entra_subject_id,device_public_key,
       device_key_fingerprint,platform,app_version,source_sha,registered_at,
       last_seen_at,lease_expires_at,retired_at,retire_reason,state_version)
     SELECT $1,$2,$3,$4,$5,$6,'win32','0.1.32',$7,now_at,now_at,
       now_at+interval '1 hour',NULL,NULL,1
     FROM (SELECT date_trunc('milliseconds',clock_timestamp())+interval '1 second' AS now_at) AS clock`,
    [authority.tenantId, newerId, authority.principal.user_id,
      authority.principal.entra_subject_id, newerDevice.publicKey,
      newerDevice.fingerprint, grant.source_sha],
  );
  const beforeRead = await rows(authority);
  assert.equal(await readCurrent(authority), null);
  assert.deepEqual(await rows(authority), beforeRead);
  await authority.observerPool.query(
    "DELETE FROM lawos_email_dms.outlook_desktop_installations WHERE tenant_id=$1 AND installation_id=$2",
    [authority.tenantId, newerId],
  );
  assert.equal((await readCurrent(authority)).installation.installation_id, installationId);

  await authority.observerPool.query(
    `UPDATE lawos_email_dms.outlook_desktop_installations
       SET registered_at=clock_timestamp()-interval '3 days',
           last_seen_at=clock_timestamp()-interval '2 days',
           lease_expires_at=clock_timestamp()-interval '1 day'
     WHERE tenant_id=$1 AND installation_id=$2`,
    [authority.tenantId, installationId],
  );
  await assert.rejects(readCurrent(authority), postgresCode("LIU08"));
});

test("internal unsigned expired or revoked grants cannot renew trust, but owners can retire their installation", async (t) => {
  const authority = await fixture(t, "withdrawn");
  const revokedDevice = device();
  const revokedGrant = await grantFor(authority, revokedDevice, "revoked");
  await authorize(authority, revokedGrant);
  const registered = await apply(authority,
    transition(authority, revokedGrant, revokedDevice, "revoked-register"));
  const revokedId = registered.body.installation.installation_id;
  const revoked = await revoke(authority, revokedGrant, "withdrawn");
  assert.equal(revoked.authorization_id, revokedGrant.authorization_id);
  assert.deepEqual(await revoke(authority, revokedGrant, "withdrawn"), revoked);
  await assert.rejects(readCurrent(authority), postgresCode("LIU06"));
  const beforeDenied = await rows(authority);
  for (const request of [
    transition(authority, revokedGrant, revokedDevice, "revoked-register-again"),
    transition(authority, revokedGrant, revokedDevice, "revoked-heartbeat", {
      operation: "heartbeat", installationId: revokedId,
    }),
  ]) {
    await assert.rejects(apply(authority, request), postgresCode("LIU06"));
    assert.deepEqual(await rows(authority), beforeDenied);
  }
  assert.equal((await readKey(authority, revokedId)).device_key_fingerprint, revokedDevice.fingerprint);
  assert.equal((await apply(authority,
    transition(authority, revokedGrant, revokedDevice, "revoked-retire", {
      operation: "retire", installationId: revokedId,
    }))).body.installation.status, "retired");

  const expiredDevice = device();
  const now = Date.parse(await roleDatabaseNow(authority.appPool, authority.tenantId));
  const expiredGrant = await grantFor(authority, expiredDevice, "expired", {
    valid_until: new Date(now + 2000).toISOString(),
  });
  await authorize(authority, expiredGrant);
  const expiring = await apply(authority,
    transition(authority, expiredGrant, expiredDevice, "expiring-register"));
  const expiredId = expiring.body.installation.installation_id;
  assert.equal((await readCurrent(authority)).installation.installation_id, expiredId);
  await authority.observerPool.query(
    "SELECT pg_sleep(GREATEST(0,extract(epoch FROM $1::timestamptz-clock_timestamp()))+0.01)",
    [expiredGrant.valid_until],
  );
  await assert.rejects(readCurrent(authority), postgresCode("LIU08"));
  const beforeExpired = await rows(authority);
  await assert.rejects(apply(authority,
    transition(authority, expiredGrant, expiredDevice, "expired-heartbeat", {
      operation: "heartbeat", installationId: expiredId,
    })), postgresCode("LIU08"));
  assert.deepEqual(await rows(authority), beforeExpired);
  assert.equal((await readKey(authority, expiredId)).device_key_fingerprint, expiredDevice.fingerprint);
  assert.equal((await apply(authority,
    transition(authority, expiredGrant, expiredDevice, "expired-retire", {
      operation: "retire", installationId: expiredId,
    }))).body.installation.status, "retired");
});

test("internal unsigned authority grants only bounded functions and keeps authority records immutable", async (t) => {
  const authority = await fixture(t, "roles");
  const legacySql = listEmailDmsPostgresMigrations()
    .find(({ id }) => id === "009_outlook_desktop_legacy_windows_compatibility").sql;
  for (const [name, args, volatility] of [
    ["read_legacy_windows_outlook_desktop_proof_key", "text,text,text,text", "s"],
    ["apply_legacy_windows_outlook_desktop_lifecycle", "text,jsonb", "v"],
  ]) {
    const originalBody = legacySql.match(new RegExp(
      `CREATE FUNCTION lawos_email_dms[.]${name}\\([\\s\\S]*?\\nAS \\$\\$\\n([\\s\\S]*?)\\n\\$\\$;`, "u",
    ))?.[1];
    assert.ok(originalBody, `009 must contain ${name}`);
    const legacy = (await authority.observerPool.query(
      `SELECT prosrc,provolatile,proparallel,prosecdef,
         has_function_privilege('lawos_app',oid,'EXECUTE') AS app_execute
       FROM pg_proc WHERE oid=to_regprocedure($1)`,
      [`lawos_email_dms.${name}(${args})`],
    )).rows[0];
    assert.ok(legacy, `009 function must survive the 010 upgrade: ${name}`);
    assert.equal(hashDomainValue(legacy.prosrc.trim()), hashDomainValue(originalBody.trim()),
      `009 function body must remain unchanged: ${name}`);
    assert.deepEqual({ ...legacy, prosrc: undefined }, {
      prosrc: undefined, provolatile: volatility, proparallel: "u", prosecdef: true, app_execute: true,
    });
  }
  for (const [signature, expectedRole] of FUNCTIONS) {
    const catalog = (await authority.observerPool.query(
      `SELECT owner.rolname AS owner,procedure.prosecdef,procedure.proconfig,
         pg_get_functiondef(procedure.oid) AS definition,
         has_function_privilege('lawos_app',procedure.oid,'EXECUTE') AS app_execute,
         has_function_privilege('lawos_outlook_control_operator',procedure.oid,'EXECUTE') AS control_execute,
         EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(procedure.proacl,
           pg_catalog.acldefault('f',procedure.proowner))) AS privilege
           WHERE privilege.grantee=0 AND privilege.privilege_type='EXECUTE') AS public_execute
       FROM pg_proc AS procedure JOIN pg_roles AS owner ON owner.oid=procedure.proowner
       WHERE procedure.oid=to_regprocedure($1)`,
      [`lawos_email_dms.${signature}`],
    )).rows[0];
    const { definition, ...privileges } = catalog;
    const pinned = INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS
      .find((entry) => entry.signature === `lawos_email_dms.${signature}`);
    assert.ok(pinned, `the source catalog must pin ${signature}`);
    assert.equal(createHash("sha256").update(definition).digest("hex"),
      pinned.pg_get_functiondef_sha256, `actual PostgreSQL function must match ${signature}`);
    assert.deepEqual(privileges, {
      owner: "lawos_outlook_authority_owner", prosecdef: true,
      proconfig: ["search_path=pg_catalog, lawos_email_dms, lawos_security"],
      app_execute: expectedRole === "app", control_execute: expectedRole === "control",
      public_execute: false,
    }, signature);
  }
  for (const table of TABLES) {
    for (const role of ["lawos_app", "lawos_outlook_control_operator",
      "lawos_outlook_lifecycle_verifier", "lawos_outlook_assignment_worker"]) {
      const privileges = (await authority.observerPool.query(
        `SELECT has_table_privilege($1,$2,'SELECT') AS select,
          has_table_privilege($1,$2,'INSERT') AS insert,
          has_table_privilege($1,$2,'UPDATE') AS update,
          has_table_privilege($1,$2,'DELETE') AS delete`,
        [role, `lawos_email_dms.${table}`],
      )).rows[0];
      assert.deepEqual(privileges, { select: false, insert: false, update: false, delete: false }, `${role}: ${table}`);
    }
    await assert.rejects(roleQuery(authority.appPool, authority.tenantId,
      `SELECT count(*) AS value FROM lawos_email_dms.${table}`, [], true));
  }
  const pair = device();
  const grant = await grantFor(authority, pair, "roles");
  await assert.rejects(authorize(authority, grant, authority.appPool));
  await authorize(authority, grant);
  await apply(authority, transition(authority, grant, pair, "roles-register"));
  await revoke(authority, grant, "roles");
  const unchangedRows = await rows(authority);
  for (const table of TABLES) {
    await assert.rejects(authority.observerPool.query(
      `UPDATE lawos_email_dms.${table} SET tenant_id=tenant_id WHERE tenant_id=$1`,
      [authority.tenantId],
    ));
    await assert.rejects(authority.observerPool.query(
      `DELETE FROM lawos_email_dms.${table} WHERE tenant_id=$1`, [authority.tenantId],
    ));
  }
  await assert.rejects(authority.observerPool.query(
    `TRUNCATE TABLE ${TABLES.map((table) => `lawos_email_dms.${table}`).join(",")}`,
  ), (error) => error?.code === "P0001" && /immutable/u.test(error.message));
  assert.deepEqual(await rows(authority), unchangedRows);
});
