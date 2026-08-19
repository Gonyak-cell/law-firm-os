import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPostgresOutlookDesktopOperationalControlPorts,
  createPostgresOutlookDesktopOperationalControlPorts,
  createPostgresOutlookDesktopOperationalRuntime,
} from "../src/outlook-desktop-operational-runtime.js";
import {
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
  OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
} from "../src/outlook-desktop-lifecycle-verifier.js";

const TENANT_ID = "tenant-outlook-operational-a";
const ENTRA_TENANT_ID = "11111111-2222-4333-8444-555555555555";
const PRINCIPAL = Object.freeze({
  tenant_id: TENANT_ID,
  user_id: "user-outlook-operational-a",
  entra_subject_id: "subject-outlook-operational-a",
});

test("default factory eagerly binds the exact 007 authority and write-capable assignment projector", async () => {
  const projection = Object.freeze({
    tenant_id: TENANT_ID,
    user_id: PRINCIPAL.user_id,
    entra_subject_id: PRINCIPAL.entra_subject_id,
    desired_assigned: true,
  });
  const queries = [];
  let releases = 0;
  const client = {
    async query(sql, parameters = []) {
      queries.push({ sql, parameters });
      if (sql === "SELECT lawos_security.current_tenant_id() AS tenant_id") {
        return { rows: [{ tenant_id: TENANT_ID }] };
      }
      if (sql.includes("read_outlook_desktop_assignment_state")) {
        return { rows: [{ value: projection }] };
      }
      return { rows: [] };
    },
    release() { releases += 1; },
  };
  const pool = {
    [Symbol.for("lawos.postgres.tenant-context-secret")]: Buffer.alloc(32, 7),
    async connect() { return client; },
  };
  const roster = Object.freeze({ roster_version: "roster-operational-a" });

  const runtime = createPostgresOutlookDesktopOperationalRuntime({
    pool,
    tenant_id: TENANT_ID,
    entitlement_roster: roster,
  });

  assert.equal(runtime.entitlement_roster, roster);
  assert.equal(
    runtime.installation_service.authority,
    "postgres-outlook-desktop-installation-authority",
  );
  assert.equal("installation_service_factory" in runtime, false);
  assert.deepEqual(
    await runtime.installation_service.projectAssignmentState({
      principal: PRINCIPAL,
    }),
    projection,
  );
  const begin = queries.find(({ sql }) => sql.startsWith("BEGIN "))?.sql;
  assert.match(begin, /SERIALIZABLE/u);
  assert.doesNotMatch(begin, /READ ONLY/u);
  assert.deepEqual(
    queries.find(({ sql }) => sql.includes(
      "read_outlook_desktop_assignment_state",
    )),
    {
      sql: "SELECT lawos_email_dms.read_outlook_desktop_assignment_state($1,$2,$3) AS value",
      parameters: [
        TENANT_ID,
        PRINCIPAL.user_id,
        PRINCIPAL.entra_subject_id,
      ],
    },
  );
  assert.equal(releases, 1);
});

test("default factory fails closed before work when PostgreSQL authority is unbound", () => {
  assert.throws(
    () => createPostgresOutlookDesktopOperationalRuntime({
      pool: {},
      tenant_id: TENANT_ID,
      entitlement_roster: Object.freeze({}),
    }),
    /PostgreSQL pool is required/u,
  );
});

test("control-port composition rejects every aliased pool before database work", () => {
  let connectCalls = 0;
  const pool = { connect() { connectCalls += 1; } };
  const distinct = { connect() { connectCalls += 1; } };

  for (const options of [
    { app_pool: pool, control_pool: pool, verifier_pool: distinct },
    { app_pool: pool, control_pool: distinct, verifier_pool: pool },
    { app_pool: distinct, control_pool: pool, verifier_pool: pool },
  ]) {
    assert.throws(
      () => createPostgresOutlookDesktopOperationalControlPorts({
        ...options,
        tenant_id: TENANT_ID,
      }),
      /distinct PostgreSQL pools/u,
    );
  }
  assert.equal(connectCalls, 0);
});

test("composed lifecycle port sends the exact verifier event through Task16 before Core", async () => {
  let connectCalls = 0;
  const pool = () => ({
    connect() {
      connectCalls += 1;
      throw new Error("database work must not occur for an invalid proof");
    },
  });
  const ports = createPostgresOutlookDesktopOperationalControlPorts({
    app_pool: pool(),
    control_pool: pool(),
    tenant_id: TENANT_ID,
    verifier_pool: pool(),
  });

  await assert.rejects(
    ports.outlookDesktopLifecycleControlPort.verifyLifecycleTransition({
      schema_version: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_EVENT_SCHEMA,
      action: OUTLOOK_DESKTOP_LIFECYCLE_VERIFIER_ACTION,
      mode: "mint",
      raw_request_body_base64: "e30=",
      authenticated_principal: {
        tenant_id: TENANT_ID,
        user_id: PRINCIPAL.user_id,
        entra_subject_id: PRINCIPAL.entra_subject_id,
      },
      activation_reference: "oda_0123456789abcdefghij",
      proof: {},
      proof_signature_base64:
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    }),
    (error) => {
      assert.equal(error.code, "OUTLOOK_LIFECYCLE_PROOF_SCHEMA_INVALID");
      assert.doesNotMatch(error.message, /lifecycle verification input/u);
      return true;
    },
  );
  assert.equal(connectCalls, 0);
});

test("only the exact API-composed branded port pair enables activation", () => {
  const appPool = { connect() {} };
  const ports = createPostgresOutlookDesktopOperationalControlPorts({
    app_pool: appPool,
    control_pool: { connect() {} },
    verifier_pool: { connect() {} },
    tenant_id: TENANT_ID,
  });
  assert.equal(
    assertPostgresOutlookDesktopOperationalControlPorts(ports),
    ports,
  );

  const runtime = createPostgresOutlookDesktopOperationalRuntime({
    pool: appPool,
    tenant_id: TENANT_ID,
    entra_tenant_id: ENTRA_TENANT_ID,
    entitlement_roster: Object.freeze({}),
    outlookDesktopActivationControlPort:
      ports.outlookDesktopActivationControlPort,
    outlookDesktopLifecycleControlPort:
      ports.outlookDesktopLifecycleControlPort,
  });
  assert.equal(runtime.activation_enabled, true);
  assert.equal(runtime.entra_tenant_id, ENTRA_TENANT_ID);
  assert.equal(
    runtime.activation_service.authority,
    "outlook-desktop-activation-registration-authority",
  );

  assert.throws(
    () => createPostgresOutlookDesktopOperationalRuntime({
      pool: appPool,
      tenant_id: TENANT_ID,
      entra_tenant_id: ENTRA_TENANT_ID,
      entitlement_roster: Object.freeze({}),
      outlookDesktopActivationControlPort:
        ports.outlookDesktopActivationControlPort,
      outlookDesktopLifecycleControlPort: Object.freeze({}),
    }),
    /API-composed Outlook desktop control ports are required/u,
  );

  for (const mismatch of [
    { pool: { connect() {} }, tenant_id: TENANT_ID },
    { pool: appPool, tenant_id: "tenant-outlook-operational-b" },
  ]) {
    assert.throws(
      () => createPostgresOutlookDesktopOperationalRuntime({
        ...mismatch,
        entra_tenant_id: ENTRA_TENANT_ID,
        entitlement_roster: Object.freeze({}),
        outlookDesktopActivationControlPort:
          ports.outlookDesktopActivationControlPort,
        outlookDesktopLifecycleControlPort:
          ports.outlookDesktopLifecycleControlPort,
      }),
      /API-composed Outlook desktop control ports are required/u,
    );
  }
});
