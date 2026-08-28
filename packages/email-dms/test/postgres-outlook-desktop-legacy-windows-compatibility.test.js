import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  signOutlookDesktopLifecycleRequest,
} from "../src/outlook-desktop-installation-proof.js";
import {
  createPostgresOutlookDesktopLegacyWindowsCompatibilityService,
} from "../src/postgres-outlook-desktop-installation-service.js";
import {
  createOutlookAssignmentAuthorityFixture,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";

const PACKAGE = Object.freeze({
  app_version: "0.1.29",
  platform: "win32",
  source_sha: "4df77e1848b52ea455f20b41b9b1c64961bfa1cf",
});
const FUNCTION_SIGNATURES = Object.freeze([
  "lawos_email_dms.read_legacy_windows_outlook_desktop_proof_key(text,text,text,text)",
  "lawos_email_dms.apply_legacy_windows_outlook_desktop_lifecycle(text,jsonb)",
]);

function keyPair() {
  const pair = generateKeyPairSync("ed25519");
  return {
    ...pair,
    publicKeySpki: pair.publicKey
      .export({ type: "spki", format: "der" })
      .toString("base64"),
  };
}

function proofWindow() {
  return {
    issued_at: new Date(Date.now() - 5_000).toISOString(),
    expires_at: new Date(Date.now() + 120_000).toISOString(),
  };
}

function command(principal, request, pair) {
  return Object.freeze({
    principal: Object.freeze(principal),
    request_id: `request-${request.idempotency_key}`,
    request: Object.freeze(request),
    signature: signOutlookDesktopLifecycleRequest(request, pair.privateKey),
  });
}

function registerRequest(pair) {
  return {
    method: "POST",
    path: "/api/desktop/installations",
    body: {
      ...PACKAGE,
      device_public_key: pair.publicKeySpki,
    },
    installation_id: "NEW",
    idempotency_key: "idem_windows_compat_register_0001",
    nonce: Buffer.alloc(24, 1).toString("base64url"),
    ...proofWindow(),
  };
}

function heartbeatRequest(installationId, stateVersion) {
  return {
    method: "POST",
    path: `/api/desktop/installations/${installationId}/heartbeat`,
    body: { expected_state_version: stateVersion },
    installation_id: installationId,
    idempotency_key: "idem_windows_compat_heartbeat_0002",
    nonce: Buffer.alloc(24, 2).toString("base64url"),
    ...proofWindow(),
  };
}

function retireRequest(installationId, stateVersion) {
  return {
    method: "POST",
    path: `/api/desktop/installations/${installationId}/retire`,
    body: {
      expected_state_version: stateVersion,
      retire_reason: "device_disconnect",
    },
    installation_id: installationId,
    idempotency_key: "idem_windows_compat_retire_0003",
    nonce: Buffer.alloc(24, 3).toString("base64url"),
    ...proofWindow(),
  };
}

test("009 exposes only bounded Windows 0.1.29 lifecycle functions and preserves raw-table closure", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-windows-compatibility-a",
  });
  if (!authority) return;
  const principal = Object.freeze({
    tenant_id: authority.tenantId,
    ...authority.principal,
  });
  const service =
    createPostgresOutlookDesktopLegacyWindowsCompatibilityService({
      pool: authority.appPool,
      tenant_id: authority.tenantId,
    });
  const authorize = async () => true;
  const pair = keyPair();
  const registrationCommand = command(
    principal,
    registerRequest(pair),
    pair,
  );
  const registered = await service.register(registrationCommand, { authorize });
  assert.equal(registered.response_status, 201);
  assert.equal(registered.body.outcome, "registered");
  assert.equal(registered.body.installation.status, "active");
  assert.equal(registered.body.installation.state_version, 1);
  assert.deepEqual(
    await service.register(registrationCommand, { authorize }),
    registered,
  );

  const installationId = registered.body.installation.installation_id;
  const heartbeatCommand = command(
    principal,
    heartbeatRequest(installationId, 1),
    pair,
  );
  const heartbeat = await service.heartbeat(heartbeatCommand, { authorize });
  assert.equal(heartbeat.body.outcome, "heartbeat");
  assert.equal(heartbeat.body.installation.state_version, 2);

  const retirement = await service.retire(command(
    principal,
    retireRequest(installationId, 2),
    pair,
  ), { authorize });
  assert.equal(retirement.body.outcome, "retired");
  assert.equal(retirement.body.installation.status, "retired");
  assert.equal(retirement.body.installation.state_version, 3);

  const catalog = await authority.observerPool.query(
    `SELECT procedure.oid::regprocedure::text AS signature,
            owner.rolname AS owner,procedure.prosecdef,
            procedure.proconfig,
            has_function_privilege('lawos_app',procedure.oid,'EXECUTE')
              AS app_execute,
            EXISTS (
              SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
                procedure.proacl,pg_catalog.acldefault('f',procedure.proowner)
              )) AS privilege
               WHERE privilege.grantee=0
                 AND privilege.privilege_type='EXECUTE'
            ) AS public_execute
       FROM pg_proc AS procedure
       JOIN pg_namespace AS namespace ON namespace.oid=procedure.pronamespace
       JOIN pg_roles AS owner ON owner.oid=procedure.proowner
      WHERE procedure.oid=ANY($1::regprocedure[])
      ORDER BY signature`,
    [FUNCTION_SIGNATURES],
  );
  assert.equal(catalog.rowCount, 2);
  assert.equal(catalog.rows.every((row) => (
    row.owner === "lawos_outlook_authority_owner"
      && row.prosecdef === true
      && row.app_execute === true
      && row.public_execute === false
      && JSON.stringify(row.proconfig) === JSON.stringify([
        "search_path=pg_catalog, lawos_email_dms, lawos_security",
      ])
  )), true);

  for (const table of [
    "outlook_desktop_installations",
    "outlook_desktop_installation_nonces",
    "outlook_desktop_installation_idempotency",
    "outlook_desktop_installation_audit_events",
  ]) {
    const privileges = (await authority.observerPool.query(
      `SELECT has_table_privilege('lawos_app',$1,'SELECT') AS select,
              has_table_privilege('lawos_app',$1,'INSERT') AS insert,
              has_table_privilege('lawos_app',$1,'UPDATE') AS update,
              has_table_privilege('lawos_app',$1,'DELETE') AS delete`,
      [`lawos_email_dms.${table}`],
    )).rows[0];
    assert.deepEqual(privileges, {
      select: false,
      insert: false,
      update: false,
      delete: false,
    });
  }

  await assert.rejects(withPostgresTransaction(
    authority.appPool,
    { tenant_id: authority.tenantId, readOnly: true },
    (client) => client.query(
      "SELECT count(*) FROM lawos_email_dms.outlook_desktop_installations",
    ),
  ), (error) => error?.safe_error_code === "POSTGRES_ACCESS_DENIED");

  const counts = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::integer
          FROM lawos_email_dms.outlook_desktop_installations
         WHERE tenant_id=$1) AS installations,
       (SELECT count(*)::integer
          FROM lawos_email_dms.outlook_desktop_installation_nonces
         WHERE tenant_id=$1) AS nonces,
       (SELECT count(*)::integer
          FROM lawos_email_dms.outlook_desktop_installation_idempotency
         WHERE tenant_id=$1) AS idempotency,
       (SELECT count(*)::integer
          FROM lawos_email_dms.outlook_desktop_installation_audit_events
         WHERE tenant_id=$1) AS audit_events`,
    [authority.tenantId],
  )).rows[0];
  assert.deepEqual(counts, {
    installations: 1,
    nonces: 3,
    idempotency: 3,
    audit_events: 3,
  });
});
