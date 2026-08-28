import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPostgresOutlookDesktopOperationalControlPorts,
  createOutlookDesktopTrustedCurrentCompatibilityService,
  createPostgresOutlookDesktopOperationalControlPorts,
  createPostgresOutlookDesktopOperationalRuntime,
} from "../src/outlook-desktop-operational-runtime.js";
import {
  parseOutlookDesktopAutoconnectRoster,
} from "../src/outlook-desktop-entitlement.js";
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

function exactRoster() {
  return parseOutlookDesktopAutoconnectRoster({
    schema_version: "lawos.outlook-desktop-autoconnect-roster.v1",
    roster_version: "roster-operational-exact-ten",
    entries: Array.from({ length: 10 }, (_, index) => ({
      tenant_id: TENANT_ID,
      user_id: index === 0
        ? PRINCIPAL.user_id
        : `user-outlook-operational-${index}`,
      entra_subject_id: index === 0
        ? PRINCIPAL.entra_subject_id
        : `subject-outlook-operational-${index}`,
      enabled: true,
    })),
  });
}

function authorityService(readTrustedCurrent) {
  const noop = async () => null;
  return Object.freeze({
    authority: "postgres-outlook-desktop-installation-authority",
    register: noop,
    heartbeat: noop,
    retire: noop,
    read: noop,
    readTrustedCurrent,
    projectAssignmentState: noop,
  });
}

test("trusted-current compatibility prefers 007 and narrowly falls back to the exact-ten internal canary", async () => {
  const internalCanary = Object.freeze({
    installation_id: "odi_operational_canary_000001",
    status: "active",
    state_version: 2,
    lease_expires_at: "2099-01-08T00:00:00.000Z",
    retired_at: null,
    release_trusted: true,
    authority_snapshot_at: "2099-01-01T00:00:00.000Z",
  });
  let fallbackCalls = 0;
  const legacy = Object.freeze({
    async readApprovedInternalCurrent(input, { authorize }) {
      fallbackCalls += 1;
      assert.equal(await authorize({
        operation: "read",
        principal: input.principal,
        installation_id: "CURRENT",
      }), true);
      return internalCanary;
    },
  });
  const compatibility =
    createOutlookDesktopTrustedCurrentCompatibilityService({
      authority_service: authorityService(async () => null),
      legacy_installation_service: legacy,
      entitlement_roster: exactRoster(),
    });
  assert.equal(
    await compatibility.readTrustedCurrent({ principal: PRINCIPAL }),
    internalCanary,
  );
  assert.equal(fallbackCalls, 1);

  const strict = Object.freeze({ ...internalCanary, state_version: 9 });
  const strictFirst = createOutlookDesktopTrustedCurrentCompatibilityService({
    authority_service: authorityService(async () => strict),
    legacy_installation_service: legacy,
    entitlement_roster: exactRoster(),
  });
  assert.equal(
    await strictFirst.readTrustedCurrent({ principal: PRINCIPAL }),
    strict,
  );
  assert.equal(fallbackCalls, 1);

  const strictFailure = Object.assign(new Error("strict authority unavailable"), {
    safe_error_code: "OUTLOOK_DESKTOP_INSTALLATION_RUNTIME_UNAVAILABLE",
  });
  const failClosed = createOutlookDesktopTrustedCurrentCompatibilityService({
    authority_service: authorityService(async () => { throw strictFailure; }),
    legacy_installation_service: Object.freeze({
      async readApprovedInternalCurrent() { return null; },
    }),
    entitlement_roster: exactRoster(),
  });
  await assert.rejects(
    failClosed.readTrustedCurrent({ principal: PRINCIPAL }),
    (error) => error === strictFailure,
  );
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
  assert.deepEqual(
    ["register", "heartbeat", "retire"].map(
      (method) => typeof runtime.legacy_installation_service[method],
    ),
    ["function", "function", "function"],
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
